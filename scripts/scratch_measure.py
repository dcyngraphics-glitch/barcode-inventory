from PIL import Image
import numpy as np

BASE = r"C:\Users\bryan\AppData\Local\hermes\cache\images"
APPS = {
 "scanner_shop": "computer_use_f73b4763a4e04108bd7a75ba95982f6c.png",
 "inventory":    "computer_use_ee3fd5c0e52e4a1fa71749b606fce0e1.png",
 "settings":     "computer_use_4f15e20116964a8a841e36d5657c7b74.png",
 "till_sell":    "computer_use_fc0e5148061b423c946687e05c4435ef.png",
}
X0, X1 = 885, 1212          # app preview column
APP_TOP, APP_BOT = 65, 651  # app viewport inside the capture

def load(fn):
    return np.asarray(Image.open(f"{BASE}\\{fn}").convert("RGB").crop((X0, 0, X1, 670))).astype(np.int16)

def bbox_of(img, target, tol, y0, y1, x0=0, x1=None):
    x1 = x1 or img.shape[1]
    reg = img[y0:y1, x0:x1]
    d = np.abs(reg - np.array(target)).sum(axis=2)
    m = d < tol
    if not m.any():
        return None
    ys, xs = np.where(m)
    return (x0 + xs.min(), y0 + ys.min(), x0 + xs.max(), y0 + ys.max(), int(m.sum()))

ACCENT = (4, 120, 87)        # --color-accent #047857
CARD   = (30, 41, 59)        # --color-card dark #1e293b
MUTED  = (51, 65, 85)        # --color-muted dark #334155

print("### app viewport (capture):", APP_TOP, "-", APP_BOT, "=> height", APP_BOT-APP_TOP, "px")

# ---- Settings: green toggle track (ON) ----
s = load(APPS["settings"])
b = bbox_of(s, ACCENT, 60, 260, 340, 200, 327)
print("\nSettings toggle track (accent #047857) bbox x0,y0,x1,y1,npix:", b)
if b:
    print("  => toggle track rendered height =", b[3]-b[1]+1, "px, width =", b[2]-b[0]+1, "px")

# ---- Scanner: active mode-bar segment (Shop) ----
sc = load(APPS["scanner_shop"])
b = bbox_of(sc, ACCENT, 60, 60, 122, 0, 327)
print("\nScanner mode-bar active segment (accent) bbox:", b)
if b:
    print("  => mode segment rendered height =", b[3]-b[1]+1, "px, width =", b[2]-b[0]+1, "px")

# ---- Scanner: green Scan Barcode FAB ----
b = bbox_of(sc, (5, 150, 105), 90, 520, 590, 0, 327)
print("\nScanner FAB (accent green) bbox:", b)
if b:
    print("  => FAB rendered height =", b[3]-b[1]+1, "px, width =", b[2]-b[0]+1, "px")

# ---- Inventory: Scan Now button ----
inv = load(APPS["inventory"])
b = bbox_of(inv, (5, 150, 105), 90, 480, 545, 0, 327)
print("\nInventory 'Scan Now' button bbox:", b)
if b:
    print("  => button rendered height =", b[3]-b[1]+1, "px, width =", b[2]-b[0]+1, "px")

# ---- Bottom nav strip: measure the card-coloured band ----
for name, img in (("scanner_shop", sc), ("inventory", inv), ("till_sell", load(APPS["till_sell"]))):
    reg = img[560:660]
    d = np.abs(reg - np.array(CARD)).sum(axis=2)
    rows = (d < 40).sum(axis=1)
    ys = np.where(rows > img.shape[1] * 0.5)[0]
    if len(ys):
        print(f"\n{name}: bottom-nav (card #1e293b) rows y={560+ys.min()}..{560+ys.max()} "
              f"=> height {ys.max()-ys.min()+1}px")

# ---- Till: Paid button band ----
t = load(APPS["till_sell"])
reg = t[520:600]
lum = reg.mean(axis=2)
print("\nTill footer row luminance (y: mean lum):")
for i in range(0, 80, 4):
    print(f"   y={520+i}: {lum[i].mean():6.1f}")
