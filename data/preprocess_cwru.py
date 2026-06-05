#!/usr/bin/env python3
"""Preprocess CWRU bearing data into Edge Impulse CSV samples.

This script:
- reads DE_time vibration channels from CWRU .mat files
- maps source files to project labels
- slices overlapping 2-second windows
- downsamples raw 48 kHz signals to 62.5 Hz (125 samples / 2000 ms)
- synthesizes Y/Z axes from the single-axis source
- writes one CSV per sample in Edge Impulse format
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path
from typing import Dict, Iterable, List

import numpy as np
import pandas as pd
from scipy.io import loadmat

RAW_SAMPLE_RATE = 48_000.0
TARGET_SAMPLE_RATE = 62.5
WINDOW_DURATION_SECONDS = 2.0
WINDOW_SAMPLES = int(TARGET_SAMPLE_RATE * WINDOW_DURATION_SECONDS)
RAW_WINDOW_SAMPLES = int(RAW_SAMPLE_RATE * WINDOW_DURATION_SECONDS)
TIMESTAMP_MS = np.arange(WINDOW_SAMPLES, dtype=np.int64) * int(round(1000 / TARGET_SAMPLE_RATE))
DEFAULT_DATASET_DIR = Path(r"C:\Users\ADMIN\.cache\kagglehub\datasets\brjapon\cwru-bearing-datasets\versions\1\raw")
DEFAULT_OUTPUT_DIR = Path("data/edge_impulse")
DEFAULT_TARGET_PER_CLASS = 300
RNG_SEED = 42

LABEL_TO_FILES: Dict[str, List[str]] = {
    "normal": ["Time_Normal_1_098.mat"],
    "bearing_fault": [
        "IR007_1_110.mat",
        "IR014_1_175.mat",
        "IR021_1_214.mat",
        "OR007_6_1_136.mat",
        "OR014_6_1_202.mat",
    ],
    "imbalance": ["B007_1_123.mat", "B014_1_190.mat", "B021_1_227.mat"],
    "overheating": ["OR021_6_1_239.mat"],
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert CWRU .mat files to Edge Impulse CSV windows.")
    parser.add_argument("--dataset-dir", type=Path, default=DEFAULT_DATASET_DIR, help="Directory containing raw CWRU .mat files.")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR, help="Output root for Edge Impulse CSV folders.")
    parser.add_argument("--target-per-class", type=int, default=DEFAULT_TARGET_PER_CLASS, help="Approximate number of CSV files to generate per class.")
    parser.add_argument("--noise-scale", type=float, default=0.01, help="Gaussian noise scale used to synthesize Y axis.")
    parser.add_argument("--clear-output", action="store_true", help="Delete existing CSV files under the output directory before generating new ones.")
    return parser.parse_args()


def find_de_key(mat_dict: Dict[str, np.ndarray]) -> str:
    for key in mat_dict:
        if key.endswith("_DE_time"):
            return key
    raise KeyError("Could not find a *_DE_time channel in MAT file")


def load_signal(mat_path: Path) -> np.ndarray:
    mat = loadmat(mat_path)
    key = find_de_key(mat)
    signal = np.asarray(mat[key], dtype=np.float64).reshape(-1)
    if signal.size < RAW_WINDOW_SAMPLES:
        raise ValueError(f"Signal in {mat_path.name} is shorter than one 2-second window")
    return signal


def build_start_indices(signal_length: int, requested_count: int) -> np.ndarray:
    max_start = signal_length - RAW_WINDOW_SAMPLES
    if max_start < 0:
        raise ValueError("Signal is too short for the requested window length")
    if requested_count <= 1 or max_start == 0:
        return np.array([0], dtype=np.int64)
    return np.linspace(0, max_start, num=requested_count, dtype=np.int64)


def downsample_window(window: np.ndarray) -> np.ndarray:
    src_index = np.linspace(0.0, len(window) - 1, num=len(window), dtype=np.float64)
    dst_index = np.linspace(0.0, len(window) - 1, num=WINDOW_SAMPLES, dtype=np.float64)
    return np.interp(dst_index, src_index, window).astype(np.float32)


def synthesize_axes(x_axis: np.ndarray, rng: np.random.Generator, noise_scale: float) -> pd.DataFrame:
    y_axis = x_axis * 0.1 + rng.normal(0.0, noise_scale, size=x_axis.shape).astype(np.float32)
    z_axis = x_axis * 0.05
    return pd.DataFrame(
        {
            "timestamp": TIMESTAMP_MS,
            "accX": x_axis,
            "accY": y_axis.astype(np.float32),
            "accZ": z_axis.astype(np.float32),
        }
    )


def prepare_output_dir(output_dir: Path, clear_output: bool) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for label in LABEL_TO_FILES:
        class_dir = output_dir / label
        class_dir.mkdir(parents=True, exist_ok=True)
        if clear_output:
            for csv_path in class_dir.glob("*.csv"):
                csv_path.unlink()


def allocate_counts(target_per_class: int) -> Dict[str, Dict[str, int]]:
    plan: Dict[str, Dict[str, int]] = {}
    for label, filenames in LABEL_TO_FILES.items():
        base = target_per_class // len(filenames)
        remainder = target_per_class % len(filenames)
        counts = {}
        for index, filename in enumerate(filenames):
            counts[filename] = base + (1 if index < remainder else 0)
        plan[label] = counts
    return plan


def generate_class_samples(
    label: str,
    filenames: Iterable[str],
    counts: Dict[str, int],
    dataset_dir: Path,
    output_dir: Path,
    noise_scale: float,
    rng: np.random.Generator,
) -> int:
    class_dir = output_dir / label
    sample_index = 1
    for filename in filenames:
        signal = load_signal(dataset_dir / filename)
        start_indices = build_start_indices(signal.size, counts[filename])
        for start in start_indices:
            raw_window = signal[start : start + RAW_WINDOW_SAMPLES]
            x_axis = downsample_window(raw_window)
            frame = synthesize_axes(x_axis, rng, noise_scale)
            csv_path = class_dir / f"{label}.{sample_index}.csv"
            frame.to_csv(csv_path, index=False)
            sample_index += 1
    return sample_index - 1


def main() -> None:
    args = parse_args()
    if not args.dataset_dir.exists():
        raise FileNotFoundError(f"Dataset directory not found: {args.dataset_dir}")

    prepare_output_dir(args.output_dir, args.clear_output)
    allocation = allocate_counts(args.target_per_class)
    rng = np.random.default_rng(RNG_SEED)

    print("CWRU -> Edge Impulse preprocessing")
    print(f"Dataset dir : {args.dataset_dir}")
    print(f"Output dir  : {args.output_dir}")
    print(f"Window      : {WINDOW_DURATION_SECONDS:.1f}s ({RAW_WINDOW_SAMPLES} raw samples -> {WINDOW_SAMPLES} rows)")
    print(f"Target rate : {TARGET_SAMPLE_RATE} Hz")
    print()

    totals: Dict[str, int] = {}
    for label, filenames in LABEL_TO_FILES.items():
        generated = generate_class_samples(
            label=label,
            filenames=filenames,
            counts=allocation[label],
            dataset_dir=args.dataset_dir,
            output_dir=args.output_dir,
            noise_scale=args.noise_scale,
            rng=rng,
        )
        totals[label] = generated
        print(f"{label:14s}: {generated:3d} samples -> {args.output_dir / label}")

    print()
    print(f"Total CSV files: {sum(totals.values())}")


if __name__ == "__main__":
    main()
