"""
HTTPS Local Server for Live Classifier
Tao chung chi SSL tu ky va phuc vu tren HTTPS port 8443
Dung: python https_server.py
Mo tren dien thoai: https://192.168.x.x:8443 (chap nhan canh bao chung chi)
"""
import ssl
import http.server
import os
import socket
import subprocess
import sys

PORT = 8443
CERT_FILE = "cert.pem"
KEY_FILE = "key.pem"

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except:
        return "127.0.0.1"
    finally:
        s.close()

def generate_cert():
    """Tao chung chi SSL tu ky bang openssl (neu co) hoac cryptography"""
    if os.path.exists(CERT_FILE) and os.path.exists(KEY_FILE):
        print("✅ Dung chung chi SSL da co san.")
        return True
    
    # Thu dung openssl
    try:
        result = subprocess.run([
            "openssl", "req", "-x509", "-newkey", "rsa:2048",
            "-keyout", KEY_FILE, "-out", CERT_FILE,
            "-days", "365", "-nodes",
            "-subj", f"/CN={get_local_ip()}"
        ], capture_output=True, text=True, timeout=15)
        if result.returncode == 0:
            print("✅ Da tao chung chi SSL bang openssl.")
            return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    
    # Thu dung Python cryptography
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        import datetime, ipaddress
        
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        local_ip = get_local_ip()
        
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COMMON_NAME, local_ip),
        ])
        cert = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(issuer)
            .public_key(key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(datetime.datetime.utcnow())
            .not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365))
            .add_extension(
                x509.SubjectAlternativeName([
                    x509.IPAddress(ipaddress.IPv4Address(local_ip)),
                    x509.DNSName("localhost"),
                ]),
                critical=False,
            )
            .sign(key, hashes.SHA256())
        )
        
        with open(KEY_FILE, "wb") as f:
            f.write(key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.TraditionalOpenSSL,
                serialization.NoEncryption(),
            ))
        with open(CERT_FILE, "wb") as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))
        
        print("✅ Da tao chung chi SSL bang cryptography.")
        return True
    except ImportError:
        pass
    
    print("❌ Khong the tao chung chi SSL.")
    print("   Cai dat bang: pip install cryptography")
    print("   Hoac cai openssl va them vao PATH")
    return False

def main():
    serve_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(serve_dir)
    
    if not generate_cert():
        sys.exit(1)
    
    local_ip = get_local_ip()
    
    handler = http.server.SimpleHTTPRequestHandler
    
    # Tat log spam
    class QuietHandler(handler):
        def log_message(self, format, *args):
            if args[1] not in ('200', '304'):  # Chi log loi
                super().log_message(format, *args)
    
    httpd = http.server.HTTPServer(("0.0.0.0", PORT), QuietHandler)
    
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(CERT_FILE, KEY_FILE)
    httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
    
    print("=" * 55)
    print("  HTTPS Server dang chay!")
    print("=" * 55)
    print(f"  May tinh (localhost): https://localhost:{PORT}")
    print(f"  Dien thoai (Wi-Fi):   https://{local_ip}:{PORT}")
    print("=" * 55)
    print("  LUU Y: Trinh duyet se bao 'Khong an toan'")
    print("  -> Nhan 'Advanced' -> 'Proceed' de tiep tuc")
    print("  (Day la chung chi tu ky, KHONG phai ma doc)")
    print("=" * 55)
    print("  Nhan Ctrl+C de dung server")
    print()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nDa dung server.")

if __name__ == "__main__":
    main()
