#!/usr/bin/env python3
"""Generate a sample Zarr dataset and a downsampled JSON preview for frontend prototyping.
Usage:
  python scripts/generate_sample_zarr.py

Creates:
  - data/sample_sim.zarr/ (Zarr group with times and traces)
  - public/data/sim1.json (downsampled preview used by the frontend)
"""
import numpy as np
import zarr
import numcodecs
from pathlib import Path
import json

OUT_ZARR = Path('data') / 'sample_sim.zarr'
OUT_JSON = Path('public') / 'data' / 'sim1.json'
OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
OUT_ZARR.parent.mkdir(parents=True, exist_ok=True)

# Simulation parameters
duration = 1.0  # seconds
dt = 0.0005     # 0.5 ms step
n = int(duration / dt)
times = np.linspace(0, duration, n, endpoint=False)

# Create a simple spiking waveform: baseline -65 mV, spikes to +30 mV
baseline = -65.0
voltages = np.full(n, baseline, dtype='float32')

# Insert a few stereotyped spikes
def make_spike(t0, width_ms=2.0, amp=95.0):
    width = int((width_ms / 1000.0) / dt)
    start = int(t0 / dt)
    if start + width >= n:
        return
    # simple half-sine spike shape
    t = np.linspace(0, np.pi, width)
    spike = amp * np.sin(t)
    voltages[start:start+width] = baseline + spike

spike_times = [0.08, 0.18, 0.345, 0.52, 0.73, 0.86]
for t0 in spike_times:
    make_spike(t0)

# Save to Zarr (single channel)
compressor = numcodecs.Blosc(cname='zstd', clevel=3, shuffle=1)
root = zarr.open_group(str(OUT_ZARR), mode='w')
root.create_dataset('times', data=times, compressor=compressor)
# traces shape: [n_channels, n_samples] -> here 1 channel
root.create_dataset('traces', data=voltages.reshape(1, -1), compressor=compressor, chunks=(1, 4096))
# metadata
root.attrs['params'] = json.dumps({'duration': duration, 'dt': dt})
root.attrs['provenance'] = json.dumps({'generated_by': 'generate_sample_zarr.py'})

# Also export a downsampled preview JSON for frontend usage (e.g., ~2000 points)
# We'll pick every k-th sample to reduce size for the demo
max_points = 2000
k = max(1, n // max_points)
preview_times = times[::k].tolist()
preview_volts = voltages[::k].tolist()
with open(OUT_JSON, 'w') as f:
    json.dump({'times': preview_times, 'voltages': preview_volts}, f)

print('Wrote Zarr to', OUT_ZARR)
print('Wrote preview JSON to', OUT_JSON)
