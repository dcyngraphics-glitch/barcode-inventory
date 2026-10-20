from PIL import Image
import numpy as np, sys

BASE = r"C:\Users\bryan\AppData\Local\hermes\cache\images"
SHOTS = {
 "scanner_shop": "computer_use_f73b4763a4e04108bd7a75ba95982f6c.png",
 "inventory":    "computer_use_ee3fd5c0e52e4a1fa71749b606fce0e1.png",
 "settings":     "computer_use_4f15e20116964a8a841e36d5657c7b74.png",
 "till_sell":    "computer_use_fc0e5148061b423c946687e05c4435ef.png",
}
CROP = (855, 0, 1278, 670)

def bands(img, label):
    a = np.asarray(img.convert("RGB")).astype(np.int16)
    h, w, _ = a.shape
    rows = a.mean(axis=1)                      # (h,3) mean colour per row
    # per-row "distinctness": how much the row varies horizontally
    rowstd = a.std(axis=1).mean(axis=1)
    print(f"\n===== {label}  crop {w}x{h} =====")
    # boundary detection: big change in mean colour between consecutive rows
    d = np.abs(np.diff(rows, axis=0)).sum(axis=1)
    bounds = [0]
    y = 0
    while y < h - 1:
        if d[y] > 28:                          # threshold on total RGB delta
            # coalesce adjacent
            run = y
            while run < h - 1 and d[run] > 28:
                run += 1
            bounds.append(run)
            y = run
        else:
            y += 1
    bounds.append(h - 1)
    bounds = sorted(set(bounds))
    print("  boundaries:", bounds)
    print("  bands (y0-y1  height  meanRGB  horiz-std):")
    for i in range(len(bounds) - 1):
        y0, y1 = bounds[i], bounds[i + 1]
        if y1 - y0 < 3:
            continue
        seg = rows[y0:y1]
        m = seg.mean(axis=0)
        st = rowstd[y0:y1].mean()
        print(f"    {y0:4d}-{y1:4d}  h={y1-y0:3d}  "
              f"rgb=({m[0]:5.1f},{m[1]:5.1f},{m[2]:5.1f})  std={st:5.1f}  "
              f"{100*(y1-y0)/h:5.1f}% of crop")

for label, fn in SHOTS.items():
    try:
        im = Image.open(f"{BASE}\\{fn}").crop(CROP)
        bands(im, label)
    except Exception as e:
        print(f"{label}: ERROR {e}")
