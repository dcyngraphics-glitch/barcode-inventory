from PIL import Image
import numpy as np
BASE = r"C:\Users\bryan\AppData\Local\hermes\cache\images"
X0, X1 = 885, 1212
s = np.asarray(Image.open(f"{BASE}\\computer_use_4f15e20116964a8a841e36d5657c7b74.png").convert("RGB").crop((X0,0,X1,670))).astype(np.int16)

TRACK = np.array([101,115,135])   # --color-border dark #657387
print("Per-column vertical extent of #657387-ish pixels (y 230..300):")
for x in range(230, 328, 4):
    col = s[230:300, x]
    d = np.abs(col - TRACK).sum(axis=1)
    ys = np.where(d < 60)[0]
    if len(ys):
        print(f"  x={x:3d}: y {230+ys.min():3d}..{230+ys.max():3d}  (h={ys.max()-ys.min()+1})")
    else:
        print(f"  x={x:3d}: -")

print("\nASCII map y240..300, x230..327  (# = track grey, . = card #1e293b, o = other)")
for y in range(240, 302, 2):
    line = ""
    for x in range(230, 328, 2):
        p = s[y, x]
        if np.abs(p - TRACK).sum() < 70:
            line += "#"
        elif np.abs(p - np.array([30,41,59])).sum() < 25:
            line += "."
        else:
            line += "o"
    print(f"  y={y:3d} {line}")
