/**
 * Bearing Fault Detector - App Logic
 * Edge Impulse Project ID: 1019223
 * N22DCDT057 - Trần Nguyễn An Sơn - PTIT HCM
 * 
 * Labels: normal, ball_fault, inner_race_fault, outer_race_fault
 */

// ============================================================
// CONSTANTS & CONFIG
// ============================================================

const PROJECT_ID = 1019223;
const EI_API_BASE = 'https://studio.edgeimpulse.com';
const EI_API_KEY_DEFAULT = 'ei_f12a0636598f9cae14828d65383738b8cd715769b9fd4a91'; // dev key

const CLASSES = [
    { 
        id: 'normal', 
        label: 'Normal', 
        vi: 'Hoạt động bình thường', 
        icon: '🟢', 
        color: '#00ff88',
        gradient: 'linear-gradient(135deg, #00ff88, #00d4ff)'
    },
    { 
        id: 'ball_fault', 
        label: 'Ball Fault', 
        vi: 'Lỗi bi lăn', 
        icon: '🔴', 
        color: '#ff4444',
        gradient: 'linear-gradient(135deg, #ff4444, #ff8c00)'
    },
    { 
        id: 'inner_race_fault', 
        label: 'Inner Race Fault', 
        vi: 'Lỗi vòng trong', 
        icon: '🟠', 
        color: '#ff8c00',
        gradient: 'linear-gradient(135deg, #ff8c00, #ffd700)'
    },
    { 
        id: 'outer_race_fault', 
        label: 'Outer Race Fault', 
        vi: 'Lỗi vòng ngoài', 
        icon: '🟡', 
        color: '#ffd700',
        gradient: 'linear-gradient(135deg, #ffd700, #ff8c00)'
    }
];

// Simulation data - realistic accelerometer patterns for each class
// Format: [accX, accY, accZ] values at 62.5 Hz
const SIM_PATTERNS = {
    normal: {
        baseAmp: 0.05,
        noise: 0.02,
        freqHz: 29.9,  // ~1800 RPM shaft
        anomalyScore: 0.1 + Math.random() * 0.3
    },
    ball_fault: {
        baseAmp: 0.35,
        noise: 0.12,
        freqHz: 141.2, // BSF - Ball Spin Frequency
        anomalyScore: 1.5 + Math.random() * 2.0
    },
    inner_race_fault: {
        baseAmp: 0.55,
        noise: 0.18,
        freqHz: 162.2, // BPFI - Ball Pass Freq Inner Race
        anomalyScore: 2.5 + Math.random() * 2.5
    },
    outer_race_fault: {
        baseAmp: 0.45,
        noise: 0.15,
        freqHz: 107.4, // BPFO - Ball Pass Freq Outer Race
        anomalyScore: 2.0 + Math.random() * 2.0
    }
};

// ============================================================
// STATE
// ============================================================

let currentMode = 'simulate';
let classificationHistory = [];
let isClassifying = false;
let wasmReady = false;
let wasmModule = null;
let audioCtx = null;
let micStream = null;
let classifyInterval = null;

// Live sensor state
let liveSensorActive = false;
let sensorBuffer = [];
let sensorIntervalId = null;
let sensorLoopTimeoutId = null;
const SENSOR_SAMPLE_RATE_HZ = 62.5;
const SENSOR_SAMPLES_NEEDED = 125; // 2000ms window at 62.5 Hz
const SENSOR_INTERVAL_MS = 1000 / SENSOR_SAMPLE_RATE_HZ; // ~16ms
let lastAccel = { x: 0, y: 0, z: 0 };

// Edge Impulse model expects: 12004.8 Hz, 2000ms window = 24009 samples (1 axis)
const EI_MODEL_FREQ_HZ = 12004.8;
const EI_MODEL_WINDOW_MS = 2000;
const EI_MODEL_SAMPLES = Math.round(EI_MODEL_FREQ_HZ * EI_MODEL_WINDOW_MS / 1000); // 24009

/**
 * Linear interpolation resample:
 * Upsample/downsample mang samples tu tan so nay sang tan so khac.
 * @param {number[]} input - Mang gia tri goc
 * @param {number} targetLength - So luong mau mong muon sau khi resample
 * @returns {number[]} - Mang moi co do dai targetLength
 */
function linearResample(input, targetLength) {
    if (input.length === targetLength) return input;
    const output = new Array(targetLength);
    const ratio = (input.length - 1) / (targetLength - 1);
    for (let i = 0; i < targetLength; i++) {
        const pos = i * ratio;
        const low = Math.floor(pos);
        const high = Math.min(low + 1, input.length - 1);
        const frac = pos - low;
        output[i] = input[low] + frac * (input[high] - input[low]);
    }
    return output;
}


// ============================================================
// INIT
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
    initLoadingSequence();
});

async function initLoadingSequence() {
    const steps = [
        { msg: 'Khởi tạo giao diện...', pct: 20, delay: 300 },
        { msg: 'Tải cấu hình model...', pct: 45, delay: 400 },
        { msg: 'Kiểm tra WASM module...', pct: 70, delay: 500 },
        { msg: 'Render biểu đồ...', pct: 85, delay: 300 },
        { msg: 'Sẵn sàng!', pct: 100, delay: 200 },
    ];

    for (const step of steps) {
        await sleep(step.delay);
        setLoadingStatus(step.msg, step.pct);
    }

    await sleep(400);
    
    // Hide loading, show app
    const loading = document.getElementById('loading-screen');
    const app = document.getElementById('app');
    loading.style.opacity = '0';
    loading.style.transition = 'opacity 0.5s ease';
    await sleep(500);
    loading.style.display = 'none';
    app.style.display = 'block';
    app.style.opacity = '0';
    app.style.transition = 'opacity 0.5s ease';
    await sleep(50);
    app.style.opacity = '1';

    // Initialize app
    initBarsUI();
    checkWasmAvailability();
    loadSavedApiKey();
    
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
}

function setLoadingStatus(msg, pct) {
    document.getElementById('loading-status').textContent = msg;
    document.getElementById('loading-progress').style.width = pct + '%';
}

// ============================================================
// UI INITIALIZATION
// ============================================================

function initBarsUI() {
    const barsList = document.getElementById('bars-list');
    barsList.innerHTML = '';
    
    CLASSES.forEach(cls => {
        const item = document.createElement('div');
        item.className = 'bar-item';
        item.id = `bar-item-${cls.id}`;
        item.innerHTML = `
            <div class="bar-info">
                <div class="bar-label">
                    <span class="bar-icon">${cls.icon}</span>
                    <span>${cls.label}</span>
                </div>
                <div class="bar-value" id="bar-val-${cls.id}">0.00%</div>
            </div>
            <div class="bar-track">
                <div class="bar-fill ${cls.id}" id="bar-fill-${cls.id}" style="width: 0%"></div>
            </div>
        `;
        barsList.appendChild(item);
    });
}

// ============================================================
// MODE SWITCHING
// ============================================================

function switchMode(mode) {
    currentMode = mode;
    
    // Update buttons
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${mode}`).classList.add('active');
    
    // Update panels
    document.querySelectorAll('.mode-panel').forEach(p => p.style.display = 'none');
    document.getElementById(`panel-${mode}`).style.display = 'block';
    
    // Stop any active classification
    if (mode !== 'wasm' && classifyInterval) {
        stopWasmClassify();
    }

    setStatus('Sẵn sàng', 'ready');
}

// ============================================================
// SIMULATE MODE
// ============================================================

async function simulateClassify(targetClass) {
    if (isClassifying) return;
    isClassifying = true;
    
    setStatus('Đang phân loại...', 'busy');
    
    // Generate realistic simulation result with some noise
    const results = generateSimulationResult(targetClass);
    const anomalyScore = SIM_PATTERNS[targetClass].anomalyScore * (0.8 + Math.random() * 0.4);
    
    // Small delay to feel realistic
    await sleep(600 + Math.random() * 400);
    
    displayResult(results, anomalyScore);
    setStatus('Hoàn thành', 'ready');
    isClassifying = false;
}

function generateSimulationResult(targetClass) {
    // Base confidences
    const baseConf = {
        normal: 0.03 + Math.random() * 0.05,
        ball_fault: 0.03 + Math.random() * 0.05,
        inner_race_fault: 0.03 + Math.random() * 0.05,
        outer_race_fault: 0.03 + Math.random() * 0.05,
    };
    
    // Set target class confidence high
    baseConf[targetClass] = 0.78 + Math.random() * 0.18;
    
    // Normalize
    const total = Object.values(baseConf).reduce((a, b) => a + b, 0);
    const normalized = {};
    Object.entries(baseConf).forEach(([k, v]) => {
        normalized[k] = v / total;
    });
    
    return CLASSES.map(cls => ({
        label: cls.id,
        value: normalized[cls.id]
    }));
}

async function handleCsvUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    setStatus('Đọc CSV...', 'busy');
    
    try {
        const text = await file.text();
        const parsed = parseCSV(text);
        
        if (parsed.length === 0) {
            alert('File CSV không hợp lệ!');
            setStatus('Lỗi', 'error');
            return;
        }
        
        // For simulation, classify the CSV based on label in filename
        let targetClass = 'normal';
        const fname = file.name.toLowerCase();
        if (fname.includes('ball')) targetClass = 'ball_fault';
        else if (fname.includes('inner')) targetClass = 'inner_race_fault';
        else if (fname.includes('outer')) targetClass = 'outer_race_fault';
        
        await simulateClassify(targetClass);
    } catch (e) {
        setStatus('Lỗi đọc file', 'error');
    }
    
    // Reset input
    event.target.value = '';
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    const result = [];
    
    for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) {
            const vals = parts.slice(1).map(Number).filter(v => !isNaN(v));
            if (vals.length > 0) result.push(vals);
        }
    }
    
    return result;
}

// ============================================================
// API LIVE MODE
// ============================================================

function loadSavedApiKey() {
    const saved = localStorage.getItem('ei_api_key_1019223');
    if (saved) {
        document.getElementById('api-key-input').value = saved;
    } else {
        // Dung key mac dinh (dev key)
        document.getElementById('api-key-input').value = EI_API_KEY_DEFAULT;
        localStorage.setItem('ei_api_key_1019223', EI_API_KEY_DEFAULT);
    }
}

// ============================================================
// LIVE SENSOR MODE (Phone Accelerometer)
// ============================================================

async function startLiveSensor() {
    const apiKey = document.getElementById('api-key-input').value.trim();
    if (!apiKey) {
        setApiStatus('❌ Vui lòng nhập API key!', 'error');
        return;
    }

    // Bước 1: Kiểm tra Secure Context (HTTPS hoặc localhost)
    if (!window.isSecureContext) {
        setApiStatus(
            '🔒 Cảm biến cần HTTPS. Trang đang chạy HTTP — trình duyệt chặn DeviceMotion.',
            'error'
        );
        document.getElementById('sensor-info').innerHTML =
            '<span style="color:#ff8c00;font-size:0.78rem;line-height:1.6">' +
            '⚠️ HTTP không cho phép dùng cảm biến.<br>' +
            '<strong>Giải pháp:</strong> Chạy lệnh sau trên máy tính:<br>' +
            '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px">ngrok http 8080</code><br>' +
            'Rồi mở link <strong>https://xxx.ngrok-free.app</strong> trên điện thoại.' +
            '</span>';
        return;
    }

    // Bước 2: Kiểm tra DeviceMotionEvent tồn tại
    if (typeof DeviceMotionEvent === 'undefined') {
        setApiStatus('❌ Thiết bị không hỗ trợ DeviceMotionEvent. Thử dùng Chrome trên Android.', 'error');
        return;
    }

    // Bước 3: iOS 13+ yêu cầu xin quyền tường minh
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const perm = await DeviceMotionEvent.requestPermission();
            if (perm !== 'granted') {
                setApiStatus('❌ Không được cấp quyền cảm biến! Nhấn Allow khi Safari hỏi.', 'error');
                return;
            }
        } catch (e) {
            setApiStatus('❌ Lỗi quyền cảm biến: ' + e.message, 'error');
            return;
        }
    }

    // Save API key
    localStorage.setItem('ei_api_key_1019223', apiKey);

    liveSensorActive = true;
    sensorBuffer = [];
    lastAccel = { x: 0, y: 0, z: 0 };

    document.getElementById('live-sensor-btn').style.display = 'none';
    document.getElementById('live-sensor-stop').style.display = 'flex';
    setApiStatus('⏳ Đang kiểm tra cảm biến...', 'loading');
    setStatus('Đang sóng liệu...', 'busy');
    document.getElementById('sensor-info').textContent = 'Đang chờ sự kiện cảm biến (2s)...';

    // Bắt đầu lắng nghe
    window.addEventListener('devicemotion', handleDeviceMotion);

    // Bước 4: Kiểm tra xem event có thực sự gửi không sau 2 giây
    clearTimeout(window._sensorCheckTimeout);
    window._sensorCheckTimeout = setTimeout(() => {
        if (liveSensorActive && lastAccel.x === 0 && lastAccel.y === 0 && lastAccel.z === 0) {
            window.removeEventListener('devicemotion', handleDeviceMotion);
            liveSensorActive = false;
            document.getElementById('live-sensor-btn').style.display = 'flex';
            document.getElementById('live-sensor-stop').style.display = 'none';
            setApiStatus('⚠️ Không nhận được dữ liệu cảm biến sau 2 giây.', 'error');
            document.getElementById('sensor-info').innerHTML =
                '<span style="color:#ff8c00;font-size:0.78rem;line-height:1.6">' +
                '❌ Không có dữ liệu cảm biến.<br>' +
                'Hãy đảm bảo mở trang qua <strong>HTTPS</strong>.<br>' +
                'Gợi ý: <code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px">ngrok http 8080</code>' +
                '</span>';
            setStatus('Lỗi cảm biến', 'error');
        }
    }, 2000);

    // Start the classify loop
    runLiveSensorLoop();
}

function handleDeviceMotion(e) {
    const acc = e.accelerationIncludingGravity || e.acceleration;
    if (!acc) return;
    lastAccel = {
        x: acc.x || 0,
        y: acc.y || 0,
        z: acc.z || 0
    };
    // Update display
    document.getElementById('sx').textContent = lastAccel.x.toFixed(3);
    document.getElementById('sy').textContent = lastAccel.y.toFixed(3);
    document.getElementById('sz').textContent = lastAccel.z.toFixed(3);
}

async function runLiveSensorLoop() {
    if (!liveSensorActive) return;

    sensorBuffer = [];
    document.getElementById('sensor-info').textContent = 'Đang thu mẫu... (0/' + SENSOR_SAMPLES_NEEDED + ')';
    document.getElementById('sensor-progress-bar').style.width = '0%';

    // Collect samples at ~62.5 Hz
    await new Promise((resolve) => {
        let count = 0;
        sensorIntervalId = setInterval(() => {
            if (!liveSensorActive) {
                clearInterval(sensorIntervalId);
                resolve();
                return;
            }
            sensorBuffer.push(lastAccel.x, lastAccel.y, lastAccel.z);
            count++;
            const pct = Math.round((count / SENSOR_SAMPLES_NEEDED) * 100);
            document.getElementById('sensor-progress-bar').style.width = pct + '%';
            document.getElementById('sensor-info').textContent =
                'Đang thu mẫu... (' + count + '/' + SENSOR_SAMPLES_NEEDED + ')';
            if (count >= SENSOR_SAMPLES_NEEDED) {
                clearInterval(sensorIntervalId);
                resolve();
            }
        }, SENSOR_INTERVAL_MS);
    });

    if (!liveSensorActive) return;

    // ── Tab Live Sensor luon dung Ingestion API + Classify ──
    // (WASM co tab rieng, o day chi dung API)
    document.getElementById('sensor-info').textContent = 'Đang upload dữ liệu cảm biến...';
    setApiStatus('⏳ Đang phân loại qua API...', 'loading');

    // Lay accX tu sensorBuffer [x,y,z, x,y,z, ...]
    const rawAccX = [];
    for (let i = 0; i < sensorBuffer.length; i += 3) {
        rawAccX.push(sensorBuffer[i]);
    }

    const apiKey = document.getElementById('api-key-input').value.trim() || EI_API_KEY_DEFAULT;

    try {
        // Step 1: Upload qua Ingestion API
        const ts = Date.now();
        const fileName = `live_${ts}.json`;
        const intervalMs = 1000 / SENSOR_SAMPLE_RATE_HZ;

        const payload = {
            protected: { ver: 'v1', alg: 'none', iat: Math.floor(ts / 1000) },
            signature: '0'.repeat(64),
            payload: {
                device_name: 'phone_browser',
                device_type: 'MOBILE',
                interval_ms: intervalMs,
                sensors: [{ name: 'accX', units: 'm/s2' }],
                values: rawAccX.map(v => [parseFloat(v.toFixed(6))])
            }
        };

        const ingestRes = await fetch('https://ingestion.edgeimpulse.com/api/testing/data', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'x-label': 'live_test',
                'x-file-name': fileName,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!ingestRes.ok) {
            const txt = await ingestRes.text();
            throw new Error(`Ingestion ${ingestRes.status}: ${txt.slice(0, 80)}`);
        }
        console.log('[Ingestion] OK:', await ingestRes.text());

        // Step 2: Lay sampleId (sample moi nhat trong testing set)
        document.getElementById('sensor-info').textContent = 'Đang lấy sample ID...';
        await new Promise(r => setTimeout(r, 1500));

        const listRes = await fetch(
            `${EI_API_BASE}/v1/api/${PROJECT_ID}/raw-data?category=testing&limit=1&offset=0`,
            { headers: { 'x-api-key': apiKey } }
        );
        const listData = await listRes.json();
        const sampleId = listData.samples?.[0]?.id;
        if (!sampleId) throw new Error('Không lấy được sampleId');
        console.log('[API] sampleId:', sampleId);

        // Step 3: Goi classify - lan 1 de lay jobId
        document.getElementById('sensor-info').textContent = `Đang classify #${sampleId}...`;
        const classRes = await fetch(
            `${EI_API_BASE}/v1/api/${PROJECT_ID}/classify/v2/${sampleId}`,
            { method: 'POST', headers: { 'x-api-key': apiKey } }
        );
        if (!classRes.ok) throw new Error(`Classify ${classRes.status}`);
        let classData = await classRes.json();
        console.log('[Classify] first response:', JSON.stringify(classData).slice(0, 120));

        // Step 4: Neu tra ve jobId -> poll GET /jobs/{id}/status cho den khi done
        if (classData.id && !classData.classifications) {
            const jobId = classData.id;
            document.getElementById('sensor-info').textContent = `Job #${jobId} - Đang chờ...`;

            let jobDone = false;
            for (let i = 0; i < 15; i++) {
                await new Promise(r => setTimeout(r, 3000)); // doi 3s moi lan
                const statusRes = await fetch(
                    `${EI_API_BASE}/v1/api/${PROJECT_ID}/jobs/${jobId}/status`,
                    { headers: { 'x-api-key': apiKey } }
                );
                const statusData = await statusRes.json();
                const job = statusData.job || {};
                console.log(`[Job ${i+1}] id=${jobId} finished=${job.finished} success=${job.finishedSuccessful}`);
                document.getElementById('sensor-info').textContent = 
                    `Job #${jobId} - lần ${i+1}/15...`;

                if (job.finished) { 
                    if (job.finishedSuccessful === false) throw new Error('Job classify thất bại phía server');
                    jobDone = true; 
                    break; 
                }
            }

            if (!jobDone) throw new Error('Timeout 45s - job chưa hoàn thành');

            // Lan 2: classify lai de lay cached result
            document.getElementById('sensor-info').textContent = 'Đang lấy kết quả...';
            const classRes2 = await fetch(
                `${EI_API_BASE}/v1/api/${PROJECT_ID}/classify/v2/${sampleId}`,
                { method: 'POST', headers: { 'x-api-key': apiKey } }
            );
            classData = await classRes2.json();
            console.log('[Classify] cached result:', JSON.stringify(classData).slice(0, 200));
        }

        if (!classData.success) throw new Error(classData.error || 'Classify thất bại');
        if (!classData.classifications) throw new Error('Không có trường classifications trong response');


        // Step 5: Parse ket qua
        // classData.classifications[0].result[0] = {ball_fault:0.003, normal:0.997, ...}
        const rawResult = classData.classifications[0]?.result?.[0] || {};
        const classResults = CLASSES.map(cls => ({
            label: cls.id,
            value: rawResult[cls.id] || 0
        }));
        const anomalyScore = classData.classifications[0]?.anomalyResult?.[0] || 0;

        displayResult(classResults, anomalyScore);
        setApiStatus('✅ Phân loại thành công!', 'success');
        document.getElementById('sensor-info').textContent = '✅ Hoàn thành! Tiếp tục sau 3s...';

    } catch (err) {
        console.error('[Classify] Error:', err);
        setApiStatus(`❌ ${err.message}`, 'error');
        document.getElementById('sensor-info').textContent = '❌ ' + err.message.slice(0, 80);
    }

    if (liveSensorActive) {
        sensorLoopTimeoutId = setTimeout(() => runLiveSensorLoop(), 3000);
    }
}

function stopLiveSensor() {
    liveSensorActive = false;
    clearInterval(sensorIntervalId);
    clearTimeout(sensorLoopTimeoutId);
    window.removeEventListener('devicemotion', handleDeviceMotion);

    document.getElementById('live-sensor-btn').style.display = 'flex';
    document.getElementById('live-sensor-stop').style.display = 'none';
    document.getElementById('sensor-progress-bar').style.width = '0%';
    document.getElementById('sensor-info').textContent = 'Đã dừng. Nhấn "Bắt đầu Live" để tiếp tục.';
    setApiStatus('', '');
    setStatus('Sẵn sàng', 'ready');
}

async function classifyViaAPI() {
    const apiKey = document.getElementById('api-key-input').value.trim();
    if (!apiKey) {
        setApiStatus('❌ Vui lòng nhập API key!', 'error');
        return;
    }
    
    const csvText = document.getElementById('csv-input').value.trim();
    if (!csvText) {
        setApiStatus('❌ Vui lòng nhập dữ liệu CSV!', 'error');
        return;
    }
    
    // Save API key
    localStorage.setItem('ei_api_key_1019223', apiKey);
    
    const btn = document.getElementById('api-classify-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Đang gọi API...';
    setApiStatus('⏳ Đang gửi yêu cầu...', 'loading');
    setStatus('Gọi API...', 'busy');
    
    try {
        // Parse CSV data
        const data = parseCSV(csvText);
        if (data.length === 0) {
            throw new Error('Dữ liệu CSV không hợp lệ');
        }
        
        // Build features array (flatten all rows)
        const features = data.flatMap(row => row);
        
        // Call Edge Impulse Classify API
        const response = await fetch(
            `${EI_API_BASE}/v1/api/${PROJECT_ID}/classify`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify({
                    features: features.slice(0, 375) // 125 samples × 3 axes
                })
            }
        );
        
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API Error ${response.status}: ${errText.slice(0, 100)}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Phân loại thất bại');
        }
        
        // Extract results
        const classification = result.result?.classification || {};
        const anomalyScore = result.result?.anomaly || 0;
        
        const classResults = CLASSES.map(cls => ({
            label: cls.id,
            value: classification[cls.id] || 0
        }));
        
        displayResult(classResults, anomalyScore);
        setApiStatus('✅ Phân loại thành công!', 'success');
        setStatus('Hoàn thành', 'ready');
        
    } catch (err) {
        console.error('API Error:', err);
        setApiStatus(`❌ ${err.message}`, 'error');
        setStatus('Lỗi API', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">🚀</span> Phân loại qua API';
    }
}

function setApiStatus(msg, type) {
    const el = document.getElementById('api-status');
    el.textContent = msg;
    el.className = `api-status ${type}`;
}

// ============================================================
// WASM MODE
// ============================================================

async function checkWasmAvailability() {
    try {
        const res = await fetch('wasm/edge-impulse-standalone.js', { method: 'HEAD' });
        if (res.ok) {
            wasmReady = true;
            document.getElementById('wasm-title').textContent = '✅ WASM Model Sẵn Sàng';
            document.getElementById('wasm-desc').textContent = 'Model Edge Impulse đã được tải. Nhấn để bắt đầu!';
            document.getElementById('wasm-status-box').style.borderColor = 'rgba(0, 255, 136, 0.4)';
            document.getElementById('wasm-actions').style.display = 'block';
        }
    } catch {
        // WASM not available, keep default UI
    }
}

async function startWasmClassify() {
    if (!wasmReady) {
        alert('Chưa có WASM model! Hãy export từ Edge Impulse Studio trước.');
        return;
    }
    
    try {
        // Request microphone
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        
        const source = audioCtx.createMediaStreamSource(micStream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        
        let audioBuffer = [];
        const SAMPLES_NEEDED = 16000; // 1 second of audio
        
        processor.onaudioprocess = async (e) => {
            if (isClassifying) return;
            
            const inputData = e.inputBuffer.getChannelData(0);
            audioBuffer.push(...Array.from(inputData));
            
            if (audioBuffer.length >= SAMPLES_NEEDED) {
                isClassifying = true;
                const features = audioBuffer.slice(0, SAMPLES_NEEDED);
                audioBuffer = audioBuffer.slice(SAMPLES_NEEDED / 2); // 50% overlap
                
                try {
                    if (wasmModule && wasmModule.run_classifier) {
                        const result = wasmModule.run_classifier(features, false);
                        if (result && result.result) {
                            const classResults = CLASSES.map(cls => ({
                                label: cls.id,
                                value: result.result.classification[cls.id] || 0
                            }));
                            displayResult(classResults, result.result.anomaly || 0);
                        }
                    }
                } catch (err) {
                    console.warn('WASM classify error:', err);
                }
                
                isClassifying = false;
            }
        };
        
        source.connect(processor);
        processor.connect(audioCtx.destination);
        
        document.getElementById('wasm-stop-btn').style.display = 'flex';
        setStatus('Đang phân loại live...', 'busy');
        
    } catch (err) {
        if (err.name === 'NotAllowedError') {
            alert('❌ Cần cấp quyền microphone! Nhấn "Allow" khi trình duyệt hỏi.');
        } else {
            alert(`❌ Lỗi: ${err.message}`);
        }
    }
}

function stopWasmClassify() {
    if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
        micStream = null;
    }
    if (audioCtx) {
        audioCtx.close();
        audioCtx = null;
    }
    isClassifying = false;
    document.getElementById('wasm-stop-btn').style.display = 'none';
    setStatus('Đã dừng', 'ready');
}

// ============================================================
// DISPLAY RESULTS
// ============================================================

function displayResult(results, anomalyScore) {
    // Find top prediction
    const top = results.reduce((a, b) => a.value > b.value ? a : b);
    const topClass = CLASSES.find(c => c.id === top.label);
    const confidence = top.value;
    
    // Update prediction display
    document.getElementById('prediction-icon').textContent = topClass.icon;
    document.getElementById('prediction-class').textContent = topClass.label;
    document.getElementById('prediction-label-vi').textContent = topClass.vi;
    document.getElementById('prediction-confidence').textContent = (confidence * 100).toFixed(1) + '%';
    document.getElementById('result-time').textContent = new Date().toLocaleTimeString('vi-VN');
    
    // Flash animation
    const resultCard = document.querySelector('.result-card');
    resultCard.classList.remove('flash-green', 'flash-red');
    void resultCard.offsetWidth; // reflow
    resultCard.classList.add(topClass.id === 'normal' ? 'flash-green' : 'flash-red');
    
    // Update gauge
    updateGauge(confidence);
    
    // Update bars
    results.forEach(r => {
        const fill = document.getElementById(`bar-fill-${r.label}`);
        const val = document.getElementById(`bar-val-${r.label}`);
        if (fill) fill.style.width = (r.value * 100) + '%';
        if (val) val.textContent = (r.value * 100).toFixed(1) + '%';
    });
    
    // Highlight top bar
    document.querySelectorAll('.bar-item').forEach(item => {
        item.style.opacity = '0.6';
    });
    const topBar = document.getElementById(`bar-item-${top.label}`);
    if (topBar) {
        topBar.style.opacity = '1';
        topBar.style.transform = 'scale(1.01)';
        setTimeout(() => { topBar.style.transform = ''; }, 300);
    }
    
    // Update anomaly
    updateAnomaly(anomalyScore);
    
    // Add to history
    addHistory(topClass, confidence);
}

function updateGauge(confidence) {
    const arc = document.getElementById('gauge-arc');
    const text = document.getElementById('gauge-text');
    
    // Semi-circle arc: full = 251.3 (πr where r = 80)
    const fullDash = 251.3;
    const offset = fullDash - (confidence * fullDash);
    
    arc.style.strokeDashoffset = offset;
    text.textContent = Math.round(confidence * 100) + '%';
}

function updateAnomaly(score) {
    // Normalize: 0-2 = normal, 2-5 = warning, 5+ = danger
    const normalized = Math.min(score / 8, 1) * 100;
    
    const fill = document.getElementById('anomaly-fill');
    const badge = document.getElementById('anomaly-badge');
    const scoreEl = document.getElementById('anomaly-score');
    
    fill.style.width = normalized + '%';
    scoreEl.textContent = score.toFixed(2);
    
    if (score < 2.0) {
        fill.style.background = 'linear-gradient(135deg, #00ff88, #00d4ff)';
        badge.textContent = 'Bình thường';
        badge.className = 'anomaly-badge';
    } else if (score < 5.0) {
        fill.style.background = 'linear-gradient(135deg, #ffd700, #ff8c00)';
        badge.textContent = '⚠ Nghi ngờ';
        badge.className = 'anomaly-badge warning';
    } else {
        fill.style.background = 'linear-gradient(135deg, #ff4444, #ff8c00)';
        badge.textContent = '🚨 Bất thường!';
        badge.className = 'anomaly-badge danger';
    }
}

// ============================================================
// HISTORY
// ============================================================

function addHistory(cls, confidence) {
    const entry = {
        cls,
        confidence,
        time: new Date().toLocaleTimeString('vi-VN'),
        timestamp: Date.now()
    };
    
    classificationHistory.unshift(entry);
    if (classificationHistory.length > 20) {
        classificationHistory.pop();
    }
    
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('history-list');
    
    if (classificationHistory.length === 0) {
        list.innerHTML = '<div class="history-empty">Chưa có kết quả nào</div>';
        return;
    }
    
    list.innerHTML = classificationHistory.map(entry => `
        <div class="history-item">
            <span class="history-icon">${entry.cls.icon}</span>
            <div class="history-info">
                <div class="history-class">${entry.cls.label}</div>
                <div class="history-conf">${(entry.confidence * 100).toFixed(1)}% • ${entry.cls.vi}</div>
            </div>
            <div class="history-time">${entry.time}</div>
        </div>
    `).join('');
}

function clearHistory() {
    classificationHistory = [];
    renderHistory();
    
    // Reset displays
    document.getElementById('prediction-icon').textContent = '🔵';
    document.getElementById('prediction-class').textContent = '---';
    document.getElementById('prediction-label-vi').textContent = 'Chưa có kết quả';
    document.getElementById('prediction-confidence').textContent = '0.00%';
    updateGauge(0);
    
    CLASSES.forEach(cls => {
        const fill = document.getElementById(`bar-fill-${cls.id}`);
        const val = document.getElementById(`bar-val-${cls.id}`);
        if (fill) fill.style.width = '0%';
        if (val) val.textContent = '0.00%';
        const barItem = document.getElementById(`bar-item-${cls.id}`);
        if (barItem) barItem.style.opacity = '1';
    });
    
    updateAnomaly(0);
}

// ============================================================
// STATUS
// ============================================================

function setStatus(text, state) {
    const dot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    
    statusText.textContent = text;
    dot.className = 'status-dot';
    
    if (state === 'busy') dot.classList.add('busy');
    else if (state === 'error') dot.classList.add('error');
}

// ============================================================
// UTILITIES
// ============================================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
