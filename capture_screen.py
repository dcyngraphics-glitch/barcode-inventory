#!/usr/bin/env python3
"""capture_screen.py — navigate to a URL, PDF-print via CDP, render to PNG.

Usage: python3 capture_screen.py <url> <output.png> [wait_ms]
Pre-imported helpers: goto_url, cdp, js, wait_for_load (sync).
"""
import base64
import sys
import time

from PIL import Image  # noqa: F401  (available)

URL = sys.argv[1]
OUT = sys.argv[2]
WAIT_MS = float(sys.argv[3]) if len(sys.argv) > 3 else 2500.0

goto_url(URL)
wait_for_load(15)
time.sleep(WAIT_MS / 1000.0)
print("TITLE:", repr(js("document.title"))[:120])

res = cdp(
    "Page.printToPDF",
    landscape=False,
    printBackground=True,
    _response_timeout=20000,
)
if not res or not isinstance(res.get("data"), str):
    print("FAIL: no printToPDF data", repr(res)[:300])
    sys.exit(1)

pdf_b64 = res["data"]
pdf_bytes = base64.b64decode(pdf_b64)
open("/tmp/_shot.pdf", "wb").write(pdf_bytes)

import fitz  # pymupdf

doc = fitz.open(stream=pdf_bytes, filetype="pdf")
page = doc[0]
pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
png_bytes = pix.tobytes("png")
with open(OUT, "wb") as f:
    f.write(png_bytes)
doc.close()
print(f"OK {OUT} {len(png_bytes)} bytes {pix.width}x{pix.height}")
