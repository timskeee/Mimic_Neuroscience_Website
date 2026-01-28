#!/usr/bin/env python3
"""Convert a CSV timeseries (time, voltage) into:
 - a Zarr dataset at data/<basename>.zarr (if zarr available)
 - a downsampled JSON preview at public/data/<basename>.json

Usage:
  python scripts/convert_csv_to_zarr_and_json.py /path/to/input.csv --out-basename sim1

Notes:
 - The script will try to detect a time column (name contains 'time' or 't' or 'ms' or 's').
 - If no time column is found, it will assume samples are evenly spaced and use --dt to set step (seconds).
 - The JSON preview uses a min/max interleaved downsample strategy to preserve spikes.
"""
import sys
import os
import csv
import argparse
from pathlib import Path
import math
import json

try:
    import numpy as np
except Exception:
    print('numpy required. Install with: pip install numpy')
    raise

# optional
try:
    import zarr
    import numcodecs
    HAS_ZARR = True
except Exception:
    HAS_ZARR = False


def detect_columns(header):
    # return indices for time and voltage (None if not found)
    time_idx = None
    volt_idx = None
    for i, h in enumerate(header):
        hlow = h.strip().lower()
        if any(k in hlow for k in ('time', 't(s)', 't(s)', 't', 'ms', 's')) and time_idx is None:
            time_idx = i
        if any(k in hlow for k in ('voltage','v(mv)','v','vm','vm(mv)','membrane')) and volt_idx is None:
            volt_idx = i
    # fallback: if only two columns assume [time, voltage]
    if volt_idx is None and len(header) == 2:
        volt_idx = 1 if time_idx == 0 else 0
    if time_idx is None and volt_idx is None and len(header) >= 2:
        # assume first is time, second voltage
        time_idx = 0
        volt_idx = 1
    return time_idx, volt_idx


def read_csv(path, time_idx, volt_idx):
    times = []
    volts = []
    with open(path, 'r', newline='') as f:
        reader = csv.reader(f)
        for row in reader:
            if not row:
                continue
            try:
                t = float(row[time_idx]) if time_idx is not None else None
                v = float(row[volt_idx])
            except Exception:
                # skip rows that can't parse
                continue
            volts.append(v)
            if time_idx is not None:
                times.append(t)
    return np.array(times) if times else None, np.array(volts)


def minmax_downsample(arr, max_points=2000):
    # arr: 1D numpy array of voltages
    n = arr.shape[0]
    if n <= max_points:
        return arr
    # For each bucket of size k, compute min and max and interleave
    k = math.ceil(n / max_points)
    m = n // k
    trimmed = arr[:m*k]
    reshaped = trimmed.reshape(m, k)
    mins = reshaped.min(axis=1)
    maxs = reshaped.max(axis=1)
    inter = np.empty((m*2,), dtype=arr.dtype)
    inter[0::2] = mins
    inter[1::2] = maxs
    return inter


def write_zarr(out_zarr, times, volts):
    compressor = numcodecs.Blosc(cname='zstd', clevel=3, shuffle=1)
    root = zarr.open_group(str(out_zarr), mode='w')
    if times is not None:
        root.create_dataset('times', data=times, compressor=compressor)
    root.create_dataset('traces', data=volts.reshape(1, -1).astype('float32'), compressor=compressor, chunks=(1, 4096))
    root.attrs['provenance'] = json.dumps({'source':'converted_csv'})


def write_json_preview(out_json, times, volts, max_points=2000):
    # downsample times & volts consistently. If times missing, create ms from index
    n = volts.shape[0]
    if n <= max_points:
        times_out = (times*1000).tolist() if times is not None else list(range(n))
        volts_out = volts.tolist()
    else:
        k = math.ceil(n / max_points)
        idx = np.arange(0, n//k * k).reshape(-1, k)[:, 0]
        # use min/max interleaved for voltages to preserve spikes
        trimmed = volts[:(n//k)*k]
        resh = trimmed.reshape(-1, k)
        mins = resh.min(axis=1)
        maxs = resh.max(axis=1)
        volts_down = np.empty((mins.size*2,), dtype='float32')
        volts_down[0::2] = mins
        volts_down[1::2] = maxs
        if times is not None:
            times_trim = times[:(n//k)*k].reshape(-1, k)[:, 0]
            times_down = np.repeat(times_trim, 2)
            times_out = (times_down*1000).tolist()  # ms
        else:
            times_out = list(range(volts_down.size))
        volts_out = volts_down.tolist()
    obj = {'times_ms': times_out, 'voltages_mv': volts_out}
    with open(out_json, 'w') as f:
        json.dump(obj, f)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('csv', help='Path to input CSV')
    p.add_argument('--out-basename', help='Basename for outputs', default='sim1')
    p.add_argument('--dt', type=float, help='If CSV lacks time column, sample interval in seconds (e.g. 0.0005)')
    p.add_argument('--max-points', type=int, default=2000)
    args = p.parse_args()

    inp = Path(args.csv)
    if not inp.exists():
        print('Input CSV not found:', inp)
        return

    # read header
    with open(inp, 'r', newline='') as f:
        sn = csv.Sniffer()
        sample = f.read(4096)
        f.seek(0)
        dialect = sn.sniff(sample)
        reader = csv.reader(f, dialect)
        header = next(reader)

    time_idx, volt_idx = detect_columns(header)
    if volt_idx is None:
        # try reading without header
        with open(inp, 'r', newline='') as f:
            reader = csv.reader(f)
            rows = [r for r in reader if r]
            data = [[float(v) for v in r] for r in rows if all(c.replace('.','',1).replace('-','',1).isdigit() for c in r)]
            arr = np.array(data)
            if arr.ndim == 1:
                # single column
                times = None
                volts = arr.astype('float32')
            else:
                times = arr[:,0]
                volts = arr[:,1]
    else:
        times, volts = read_csv(inp, time_idx, volt_idx)

    if times is None:
        if args.dt is None:
            print('No time column detected; please re-run with --dt specifying sample interval in seconds (e.g. 0.0005)')
            return
        n = volts.shape[0]
        times = np.arange(n) * args.dt

    # ensure units: times in seconds, voltages in mV (assume already mV)
    out_dir_zarr = Path('data')
    out_dir_zarr.mkdir(parents=True, exist_ok=True)
    out_dir_json = Path('public') / 'data'
    out_dir_json.mkdir(parents=True, exist_ok=True)

    basename = args.out_basename
    out_zarr = out_dir_zarr / f'{basename}.zarr'
    out_json = out_dir_json / f'{basename}.json'

    if HAS_ZARR:
        write_zarr(out_zarr, times, volts)
        print('Wrote Zarr to', out_zarr)
    else:
        print('zarr not installed; skipping zarr write. Install zarr and numcodecs to enable.')

    write_json_preview(out_json, times, volts, max_points=args.max_points)
    print('Wrote preview JSON to', out_json)

if __name__ == '__main__':
    main()
