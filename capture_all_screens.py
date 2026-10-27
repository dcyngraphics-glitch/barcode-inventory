#!/usr/bin/env python3
"""capture_all_screens.py — capture the 6 deliverable screens to docs/screenshots/.

Screens:
  login       dev :5178 (login bypass OFF)
  scanner     :5176 / (main app)
  product     :5176 /product/4800361394093
  inventory   :5176 /inventory
  settings    :5176 /settings
  sell-till   :5176 / (localStorage appMode=sell)

Each: goto_url -> wait -> CDP Page.printToPDF -> pymupdf render -> PNG -> docs/screenshots/<name>.png
"""
import base64
import os
import sys
import time

import fitz  # pymupdf (installed)

PROJ = r"C:\Users\bryan\Documents\Hermes\Projects\barcode-inventory"
OUTDIR = os.path.join(PROJ, "docs", "screenshots")
os.makedirs(OUTDIR, exist_ok=True)

SCREENS = [
    ("login",       "http://localhost:5178/",            3000),
    ("scanner",     "http://localhost:5176/barcode-inventory/",  3000),
    ("product",     "http://localhost:5176/barcode-inventory/product/4800361394093", 3500),
    ("inventory",   "http://localhost:5176/barcode-inventory/inventory", 2500),
    ("settings",    "http://localhost:5176/barcode-inventory/settings", 2500),
    ("sell-till",   "http://localhost:5176/barcode-inventory/", 3500),
]


def capture(name, url, wait_ms):
    goto_url(url)
    wait_for_load(15)
    time.sleep(wait_ms / 1000.0)
    title = js("document.title")
    print(f"[{name}] {title}")

    # set sell-mode localStorage before the app first renders (for sell-till)
    if name == "sell-till":
        try:
            js("localStorage.setItem('appMode', 'sell')")
        except Exception:
            pass
        goto_url(url)  # reload so the app sees the localStorage
        wait_for_load(15)
        time.sleep(wait_ms / 1000.0)

    res = cdp("Page.printToPDF", landscape=False, printBackground=True, _response_timeout=20000)
    if not res or not isinstance(res.get("data"), str):
        print(f"  FAIL: no printToPDF data {res!r}")
        return False
    pdf_bytes = base64.b64decode(res["data"])
    with open("/tmp/_"%name+".pdf", "wb") as f:
        f.write(pdf_bytes)

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page = doc[0]
    pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
    png_bytes = pix.tobytes("png")
    out = os.path.join(OUTDIR, name + ".png")
    with open(out, "wb") as f:
        f.write(png_bytes)
    doc.close()
    print(f"  OK {out} {len(png_bytes)} bytes {pix.width}x{pix.height}")
    return True


def main():
    results = []
    for name, url, wait in SCREENS:
        try:
            results.append((name, capture(name, url, wait)))
        except Exception as e:
            results.append((name, (False, f"{type(e).__name__}: {e}")))
    print("\nSUMMARY:")
    for name, ok in results:
        status = "OK" if (isinstance(ok, tuple) and ok[0]) else "FAIL"
        detail = ok if isinstance(ok, tuple) else ok
        print(f"  {name}: {status} {detail}")
    sys.exit(0 if all(isinstance(r, tuple) and r[0] for r in results) else 1)


if __name__ == "__main__":
    main()
