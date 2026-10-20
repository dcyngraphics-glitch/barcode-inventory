from PIL import Image
import numpy as np

BASE = r"C:\Users\bryan\AppData\Local\hermes\cache\images"
SHOTS = {
 "scanner_shop": "computer_use_f73b4763a4e04108bd7a75ba95982f6c.png",
 "inventory":    "computer_use_ee3fd5c0e52e4a1fa71749b606fce0e1.png",
 "settings":     "computer_use_4f15e20116964a8a841e36d5657c7b74.png",
 "till_sell":    "computer_use_fc0e5148061b423c946687e05c4435ef.png",
}
# app preview column only (measured from the column profile)
X0, X1 = 885, 1212

def hexs(m):
    return "#%02X%02X%02X" % (int(m[0]), int(m[1]), int(m[2]))

for label, fn in SHOTS.items():
    im = Image.open(f"{BASE}\\{fn}").convert("RGB").crop((X0, 0, X1, 670))
    a = np.asarray(im).astype(np.int16)
    h, w, _ = a.shape
    rows = a.mean(axis=1)
    rowstd = a.std(axis=1).mean(axis=1)
    print(f"\n===== {label}  app column {w}x{h} =====")
    d = np.abs(np.diff(rows, axis=0)).sum(axis=1)
    bounds = [0]
    y = 0
    while y < h - 1:
        if d[y] > 18:
            run = y
            while run < h - 1 and d[run] > 18:
                run += 1
            bounds.append(run)
            y = run
        else:
            y += 1
    bounds.append(h - 1)
    bounds = sorted(set(bounds))
    prev = 0
    for i in range(len(bounds) - 1):
        y0, y1 = bounds[i], bounds[i + 1]
        if y1 - y0 < 6:
            continue
        m = rows[y0:y1].mean(axis=0)
        st = rowstd[y0:y1].mean()
        print(f"  y {y0:3d}-{y1:3d}  h={y1-y0:3d} ({100*(y1-y0)/h:4.1f}%)  "
              f"mean={hexs(m)}  rgb=({m[0]:5.1f},{m[1]:5.1f},{m[2]:5.1f})  hstd={st:5.1f}")
    # where does real content start (first near-black camera band or first non-chrome)?
    print(f"  -> total height {h}px")
