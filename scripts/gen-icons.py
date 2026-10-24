"""Generate PWA PNG icons from the favicon.svg design.

The manifest previously shipped only `favicon.svg`. Chrome's installability
criteria require a 192x192 AND a 512x512 raster (PNG/JPEG) icon, so an
SVG-only manifest means the app cannot be installed at all.

Renders at 8x and downscales with LANCZOS for crisp edges.
"""
import math
from PIL import Image, ImageDraw

BG = (0x1E, 0x29, 0x3B, 255)      # #1e293b
FG = (0xF8, 0xFA, 0xFC, 255)      # #f8fafc
ACCENT = (0x3B, 0x82, 0xF6, 255)  # #3b82f6

# Barcode bars, in the SVG's 100x100 viewBox units.
BARS = [(20, 4), (28, 2), (34, 6), (44, 2), (50, 4), (58, 2), (64, 6), (74, 2), (80, 4)]
BAR_TOP, BAR_HEIGHT, BAR_RADIUS = 30, 40, 1
# Dashed accent frame.
FRAME = (15, 20, 70, 60, 4)
STROKE, DASH, GAP = 2, 4, 2


def rounded_rect_points(x, y, w, h, r, steps=8):
    """Perimeter of a rounded rect as an ordered list of points (clockwise)."""
    pts = []
    arcs = [
        (x + w - r, y + r, -90, 0),
        (x + w - r, y + h - r, 0, 90),
        (x + r, y + h - r, 90, 180),
        (x + r, y + r, 180, 270),
    ]
    for cx, cy, a0, a1 in arcs:
        for i in range(steps + 1):
            a = math.radians(a0 + (a1 - a0) * i / steps)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def draw_icon(size, maskable=False):
    ss = 8
    S = size * ss
    # Maskable icons must keep their content inside the central ~80% safe zone.
    content_scale = 0.8 if maskable else 1.0
    cx = cy = S / 2

    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    u = S / 100.0 * content_scale  # viewBox unit, scaled
    off = (S - 100 * u) / 2        # centre the shrunk content

    def px(v):
        return off + v * u

    # Background: rounded square, full bleed (maskable wants no transparency).
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(16 * u), fill=BG)

    # Barcode bars.
    for bx, bw in BARS:
        d.rounded_rectangle(
            [px(bx), px(BAR_TOP), px(bx + bw) - 1, px(BAR_TOP + BAR_HEIGHT)],
            radius=max(1, int(BAR_RADIUS * u)),
            fill=FG,
        )

    # Dashed accent frame, walked along the rounded-rect perimeter.
    fx, fy, fw, fh, fr = FRAME
    perimeter = rounded_rect_points(px(fx), px(fy), fw * u, fh * u, fr * u)
    gap_len = GAP * u
    dash_len = DASH * u
    drawing = True
    budget = dash_len  # length left in the current dash/gap phase

    for i in range(len(perimeter) - 1):
        x0, y0 = perimeter[i]
        x1, y1 = perimeter[i + 1]
        seg_len = math.hypot(x1 - x0, y1 - y0)
        if seg_len == 0:
            continue
        ux, uy = (x1 - x0) / seg_len, (y1 - y0) / seg_len
        pos = 0.0
        while pos < seg_len:
            take = min(budget, seg_len - pos)
            if drawing and take > 0:
                d.line([x0 + ux * pos, y0 + uy * pos, x0 + ux * (pos + take), y0 + uy * (pos + take)],
                       fill=ACCENT, width=max(1, int(STROKE * u)))
            pos += take
            budget -= take
            if budget <= 0:
                drawing = not drawing
                budget = dash_len if drawing else gap_len

    return img.resize((size, size), Image.LANCZOS)


TARGETS = [
    ("icon-192.png", 192, False),
    ("icon-512.png", 512, False),
    ("icon-maskable-512.png", 512, True),
    ("apple-touch-icon.png", 180, False),
]

if __name__ == "__main__":
    import os

    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
    os.makedirs(out_dir, exist_ok=True)
    for name, size, maskable in TARGETS:
        path = os.path.join(out_dir, name)
        draw_icon(size, maskable).save(path, optimize=True)
        print(f"wrote {name} ({size}x{size}, maskable={maskable})")
