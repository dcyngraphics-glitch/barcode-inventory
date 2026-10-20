from PIL import Image
import numpy as np

BASE = r"C:\Users\bryan\AppData\Local\hermes\cache\images"
SHOTS = {
 "scanner_shop": "computer_use_f73b4763a4e04108bd7a75ba95982f6c.png",
 "till_sell":    "computer_use_fc0e5148061b423c946687e05c4435ef.png",
}
CROP = (855, 0, 1278, 670)

for label, fn in SHOTS.items():
    im = Image.open(f"{BASE}\\{fn}").convert("RGB")
    print(f"\n===== {label}: full image {im.size} =====")
    a = np.asarray(im).astype(np.int16)
    H, W, _ = a.shape
    # column profile of the FULL image at a row inside the app content
    for y in (300, 450):
        row = a[y]
        # print column means in 10px buckets
        prof = []
        for x in range(0, W, 20):
            seg = row[x:x+20]
            prof.append((x, int(seg[:,0].mean()), int(seg[:,1].mean()), int(seg[:,2].mean())))
        print(f"  y={y} col profile (x, r,g,b):")
        print("   ", " ".join(f"{x}:{r},{g},{b}" for x, r, g, b in prof))
