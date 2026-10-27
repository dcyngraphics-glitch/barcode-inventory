#!/usr/bin/env python3
"""capture_all_screens2.py — 6 correct-screenshots via root-relative URLs.

Screens (dev server 5176 serves app at root '/', basename '/'):
  login       :5178  (no bypass)
  scanner     :5176 /
  product     :5176 /product/4800361394093
  inventory   :5176 /inventory
  settings    :5176 /settings
  sell-till   :5176 /  (localStorage appMode=sell)
"""
import base64, os, sys, time
import fitz

PROJ = r"C:\Users\bryan\Documents\Hermes\Projects\barcode-inventory"
OUTDIR = os.path.join(PROJ, "docs", "screenshots")
os.makedirs(OUTDIR, exist_ok=True)

SCREENS = [
    ("login",   "http://localhost:5178/",       3000),
    ("scanner", "http://localhost:5176/",       3000),
    ("product", "http://localhost:5176/product/4800361394093", 3500),
    ("inventory","http://localhost:5176/inventory", 2500),
    ("settings","http://localhost:5176/settings", 2500),
    ("sell-till","http://localhost:5176/",     3500),
]

def capture(name, url, wait_ms, set_sell=False):
    goto_url(url)
    wait_for_load(15)
    time.sleep(wait_ms / 1000.0)
    title = js("document.title")
    print(f"[{name}] {title}")
    if set_sell:
        try:
            js("localStorage.setItem('appMode', 'sell')")
        except Exception:
            pass
        goto_url(url)
        wait_for_load(15)
        time.sleep(wait_ms / 1000.0)
    res = cdp("Page.printToPDF", landscape=False, printBackground=True, _response_timeout=20000)
    if not res or not isinstance(res.get("data"), str):
        print(f"  FAIL {name}: no printToPDF data {res!r}")
        return False
    pdf_bytes = base64.b64decode(res["data"])
    open(os.path.join(OUTDIR, f"_{name}.pdf"), "wb").write(pdf_bytes)
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page = doc[0]
    pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
    png_bytes = pix.tobytes("png")
    out = os.path.join(OUTDIR, name + ".png")
    open(out, "wb").write(png_bytes)
    doc.close()
    print(f"  OK {out} {len(png_bytes)} bytes {pix.width}x{pix.height}")
    return True

results = []
for name, url, wait in SCREENS:
    set_sell = (name == "sell-till")
    try:
        results.append((name, capture(name, url, wait, set_sell)))
    except Exception as e:
        results.append((name, (False, f"{type(e).__name__}: {e}")))

print("\nSUMMARY:")
for name, ok in results:
    s = "OK" if isinstance(ok, bool) and ok else "FAIL"
    d = ok if isinstance(ok, bool) else ok
    print(f"  {name}: {s} {d}")
