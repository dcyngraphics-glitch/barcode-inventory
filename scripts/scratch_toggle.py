from PIL import Image
import numpy as np
BASE = r"C:\Users\bryan\AppData\Local\hermes\cache\images"
X0, X1 = 885, 1212
s = np.asarray(Image.open(f"{BASE}\\computer_use_4f15e20116964a8a841e36d5657c7b74.png").convert("RGB").crop((X0,0,X1,670))).astype(np.int16)

# Settings toggle (OFF) track = --color-border dark #657387 = rgb(101,115,135)
for name, tgt, tol in [("border #657387", (101,115,135), 45), ("muted #334155", (51,65,85), 25)]:
    reg = s[250:350, 180:327]
    d = np.abs(reg - np.array(tgt)).sum(axis=2)
    m = d < tol
    if m.any():
        ys, xs = np.where(m)
        print(f"{name}: bbox x={180+xs.min()}..{180+xs.max()} y={250+ys.min()}..{250+ys.max()} "
              f"-> h={ys.max()-ys.min()+1}px w={xs.max()-xs.min()+1}px npix={int(m.sum())}")
    else:
        print(f"{name}: none")

# row profile of the toggle area: show mean colour per row for x 250..327
print("\nSettings right-column row profile (x250-327):")
for y in range(268, 332, 2):
    seg = s[y, 250:327]
    print(f"  y={y}: rgb=({seg[:,0].mean():5.1f},{seg[:,1].mean():5.1f},{seg[:,2].mean():5.1f})")

# scanner: app-bar title band — measure the bar height precisely
sc = np.asarray(Image.open(f"{BASE}\\computer_use_f73b4763a4e04108bd7a75ba95982f6c.png").convert("RGB").crop((X0,0,X1,670))).astype(np.int16)
print("\nScanner bars: row profile y60-200 (x0-327):")
for y in range(60, 200, 3):
    seg = sc[y]
    print(f"  y={y}: rgb=({seg[:,0].mean():5.1f},{seg[:,1].mean():5.1f},{seg[:,2].mean():5.1f})")
