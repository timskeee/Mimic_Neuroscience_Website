#!/usr/bin/env python3
"""
Split a CSV containing times and one-or-more voltage traces into per-trace JSON previews.

Handles two formats:
- Column-oriented: header row like `time,wt,e999k` and subsequent rows are samples.
- Row-oriented: three (or more) rows where each row starts with a label then numeric values, e.g.
  `time,0,0.001,0.002,...`\n`WT,-65,-64,-30,...`\n`e999k,-65,-65,-65,...`

Writes JSON files to `public/data/<basename>_<label>.json` with structure:
  { "metadata": {"name": label, ...}, "times": [...], "voltages": [...] }

Usage: python3 scripts/split_csv_to_json.py path/to/file.csv
"""
import csv
import json
import sys
from pathlib import Path


def is_number(s):
    try:
        float(s)
        return True
    except Exception:
        return False


def main():
    if len(sys.argv) < 2:
        print('Usage: split_csv_to_json.py path/to/file.csv')
        sys.exit(2)
    p = Path(sys.argv[1])
    if not p.exists():
        print('File not found:', p)
        sys.exit(1)
    rows = list(csv.reader(p.open()))
    if not rows:
        print('CSV empty')
        sys.exit(1)

    # Trim empty rows
    rows = [r for r in rows if any(cell.strip() for cell in r)]
    if not rows:
        print('CSV has no non-empty rows')
        sys.exit(1)

    out_dir = p.parent
    base = p.stem

    # Detect row-oriented: first cell of first row is non-numeric and there are >=2 rows
    first_cells = [r[0].strip() if r else '' for r in rows[:3]]
    row_oriented = False
    if len(rows) >= 2 and not is_number(first_cells[0]):
        # check that the rest of row0 (columns 1:) are numeric
        rest = rows[0][1:]
        if rest and all(is_number(x) for x in rest):
            # likely row-oriented (labels at start of each row)
            row_oriented = True

    if row_oriented:
        # rows: first row is times (with a label in column0), subsequent rows are series
        times = [float(x) for x in rows[0][1:]]
        for r in rows[1:]:
            label = r[0].strip() or 'series'
            values = [float(x) for x in r[1:]]
            out = {'metadata': {'name': label}, 'times': times, 'voltages': values}
            fname = out_dir / f"{base}_{label.replace(' ','_')}.json"
            fname.write_text(json.dumps(out))
            print('Wrote', fname)
        return

    # Otherwise assume column-oriented with optional header
    header = [c.strip().lower() for c in rows[0]]
    has_header = any(h for h in header if h and not is_number(h))
    if has_header:
        data_rows = rows[1:]
    else:
        # no header: treat first column as time, and other columns as series
        data_rows = rows
        header = [f'col{i}' for i in range(len(rows[0]))]

    # transpose
    cols = list(zip(*data_rows))
    # locate time column
    time_idx = None
    for name in ('time', 't', 'ms'):
        if name in header:
            time_idx = header.index(name)
            break
    if time_idx is None:
        # fallback: assume first column is time
        time_idx = 0

    times = [float(x) for x in cols[time_idx]]

    for i, col in enumerate(cols):
        if i == time_idx:
            continue
        label = header[i] if i < len(header) else f'col{i}'
        # skip non-numeric columns
        try:
            vals = [float(x) for x in col]
        except Exception:
            print('Skipping non-numeric column', label)
            continue
        out = {'metadata': {'name': label}, 'times': times, 'voltages': vals}
        fname = out_dir / f"{base}_{label.replace(' ','_')}.json"
        fname.write_text(json.dumps(out))
        print('Wrote', fname)


if __name__ == '__main__':
    main()
