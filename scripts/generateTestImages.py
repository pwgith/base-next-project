"""Generate test floor plan images for the analyseFloorPlan feature."""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "test", "test-data")
os.makedirs(OUT, exist_ok=True)

# Try to use a decent font; fall back to default
try:
    font_large = ImageFont.truetype("arial.ttf", 28)
    font_med = ImageFont.truetype("arial.ttf", 20)
    font_sm = ImageFont.truetype("arial.ttf", 14)
    font_xs = ImageFont.truetype("arial.ttf", 11)
except OSError:
    font_large = ImageFont.load_default()
    font_med = font_large
    font_sm = font_large
    font_xs = font_large

WHITE = (255, 255, 255)
BG = (248, 250, 252)       # slate-50
WALL = (30, 41, 59)        # slate-800
FILL_LIVING = (219, 234, 254)  # blue-100
FILL_KITCHEN = (220, 252, 231)  # green-100
FILL_BED = (254, 226, 226)     # red-100
FILL_BATH = (243, 232, 255)    # purple-100
FILL_HALL = (254, 249, 195)    # yellow-100
FILL_WH = (226, 232, 240)      # slate-200
LABEL_COL = (30, 64, 175)      # blue-800
DIM_COL = (71, 85, 105)        # slate-600
TITLE_COL = (15, 23, 42)       # slate-900


def draw_room(draw, x, y, w, h, name, fill, font_n, font_d):
    """Draw a rectangular room with name and dimensions."""
    draw.rectangle([x, y, x + w, y + h], fill=fill, outline=WALL, width=3)
    # Room name centred
    bbox = draw.textbbox((0, 0), name, font=font_n)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((x + (w - tw) / 2, y + (h - th) / 2 - 10), name, fill=LABEL_COL, font=font_n)
    # Dimensions below name
    dim_text = f"{w // 10 / 10:.1f}m × {h // 10 / 10:.1f}m"
    bbox2 = draw.textbbox((0, 0), dim_text, font=font_d)
    dw = bbox2[2] - bbox2[0]
    draw.text((x + (w - dw) / 2, y + (h - th) / 2 + 14), dim_text, fill=DIM_COL, font=font_d)


def draw_wall_labels(draw, x, y, w, h, font):
    """Draw Wall A/B/C/D labels on top/right/bottom/left."""
    # Wall A – top
    draw.text((x + w / 2 - 20, y - 16), "Wall A", fill=LABEL_COL, font=font)
    # Wall B – right
    draw.text((x + w + 4, y + h / 2 - 6), "B", fill=LABEL_COL, font=font)
    # Wall C – bottom
    draw.text((x + w / 2 - 20, y + h + 3), "Wall C", fill=LABEL_COL, font=font)
    # Wall D – left
    draw.text((x - 14, y + h / 2 - 6), "D", fill=LABEL_COL, font=font)


# ──────────────────────────────────────────────────────
# 1. 3bed-house.png — 3 bedroom house floor plan
# ──────────────────────────────────────────────────────
img = Image.new("RGB", (800, 620), BG)
draw = ImageDraw.Draw(img)

# Title
draw.text((20, 12), "Floor Plan — 3 Bedroom House", fill=TITLE_COL, font=font_large)

ox, oy = 40, 60  # origin offset

# Living Room: 5.0m × 4.0m → 500px × 400px (scale 100px/m)
S = 80  # scale px per metre
lw, ll = int(5.0 * S), int(4.0 * S)  # 400 × 320
lx, ly = ox, oy
draw_room(draw, lx, ly, lw, ll, "Living Room", FILL_LIVING, font_med, font_sm)

# Kitchen: 3.5m × 3.0m
kw, kl = int(3.5 * S), int(3.0 * S)  # 280 × 240
kx, ky = lx + lw + 3, ly  # right of living room
draw_room(draw, kx, ky, kw, kl, "Kitchen", FILL_KITCHEN, font_med, font_sm)

# Bedroom 1: 4.0m × 3.5m
bw, bl = int(4.0 * S), int(3.5 * S)  # 320 × 280
bx, by = lx, ly + ll + 3
draw_room(draw, bx, by, bw, bl, "Bedroom 1", FILL_BED, font_med, font_sm)

# Hallway (decorative)
hw, hl = kw - 3, bl
hx, hy = kx, ky + kl + 3
draw_room(draw, hx, hy, hw + 3, hl, "Hallway", FILL_HALL, font_sm, font_xs)

# Bathroom (decorative, smaller)
btw, btl = int(2.0 * S), int(1.8 * S)
btx, bty = bx + bw + 3, by + bl - btl
draw_room(draw, btx, bty, btw, btl, "Bathroom", FILL_BATH, font_sm, font_xs)

# Outer border
pad = 20
draw.rectangle(
    [ox - pad, oy - pad, max(kx + kw, hx + hw + 3) + pad, max(by + bl, bty + btl) + pad],
    outline=WALL, width=2
)

# Scale note
draw.text((ox, max(by + bl, bty + btl) + pad + 8), "Scale: 1 grid unit = 1.0 m  |  Total floor area ≈ 44.5 m²", fill=DIM_COL, font=font_sm)

img.save(os.path.join(OUT, "3bed-house.png"))
print("✓ 3bed-house.png")

# ──────────────────────────────────────────────────────
# 2. warehouse.png — simple open warehouse plan
# ──────────────────────────────────────────────────────
img2 = Image.new("RGB", (800, 500), BG)
draw2 = ImageDraw.Draw(img2)

draw2.text((20, 12), "Floor Plan — Warehouse", fill=TITLE_COL, font=font_large)

# Single large space: 20m × 12m
ww, wl = int(20 * 30), int(12 * 30)  # 600 × 360
wx, wy = 100, 80
draw_room(draw2, wx, wy, ww, wl, "Main Floor", FILL_WH, font_large, font_med)
draw_wall_labels(draw2, wx, wy, ww, wl, font_sm)

# Loading dock
ldw, ldl = int(6 * 30), int(3 * 30)
draw_room(draw2, wx + ww - ldw, wy + wl, ldw, ldl, "Loading Dock", (254, 243, 199), font_sm, font_xs)

# Small office inside
ofw, ofl = int(4 * 30), int(3 * 30)
draw_room(draw2, wx, wy, ofw, ofl, "Office", (219, 234, 254), font_sm, font_xs)

draw2.text((100, 470), "Scale: 30px = 1.0 m  |  Ceiling height: 3.0 m (non-standard)", fill=DIM_COL, font=font_sm)

img2.save(os.path.join(OUT, "warehouse.png"))
print("✓ warehouse.png")

# ──────────────────────────────────────────────────────
# 3. blurry-photo.jpg — deliberately low-quality / noisy
# ──────────────────────────────────────────────────────
import random
img3 = Image.new("RGB", (640, 480), (180, 180, 180))
draw3 = ImageDraw.Draw(img3)

# Random noise blocks to simulate a blurry unrecognisable photo
random.seed(42)
for _ in range(600):
    rx, ry = random.randint(0, 620), random.randint(0, 460)
    rw, rh = random.randint(5, 40), random.randint(5, 40)
    col = tuple(random.randint(100, 220) for _ in range(3))
    draw3.rectangle([rx, ry, rx + rw, ry + rh], fill=col)

# Some vague lines that don't form rooms
for _ in range(20):
    x1, y1 = random.randint(0, 640), random.randint(0, 480)
    x2, y2 = random.randint(0, 640), random.randint(0, 480)
    draw3.line([x1, y1, x2, y2], fill=(60, 60, 60), width=2)

# Slight text to indicate it's a bad photo
draw3.text((20, 20), "Blurry photo — not a floor plan", fill=(80, 80, 80), font=font_sm)

img3.save(os.path.join(OUT, "blurry-photo.jpg"), quality=15)  # low JPEG quality
print("✓ blurry-photo.jpg")

# ──────────────────────────────────────────────────────
# 4. empty-page.png — blank page, no rooms
# ──────────────────────────────────────────────────────
img4 = Image.new("RGB", (800, 600), WHITE)
draw4 = ImageDraw.Draw(img4)
# Just a faint border and title to look like a scanned blank page
draw4.rectangle([30, 30, 770, 570], outline=(220, 220, 220), width=1)
draw4.text((320, 280), "[ blank page ]", fill=(200, 200, 200), font=font_med)

img4.save(os.path.join(OUT, "empty-page.png"))
print("✓ empty-page.png")

# ──────────────────────────────────────────────────────
# 5. floorplan.bmp — valid floor plan but unsupported format
# ──────────────────────────────────────────────────────
img5 = Image.new("RGB", (600, 400), BG)
draw5 = ImageDraw.Draw(img5)

draw5.text((20, 12), "Floor Plan — Studio Apartment", fill=TITLE_COL, font=font_large)
sw, sl = int(6 * 60), int(4 * 60)
sx, sy = 90, 70
draw_room(draw5, sx, sy, sw, sl, "Studio", FILL_LIVING, font_med, font_sm)

# Small bathroom
bsw, bsl = int(2 * 60), int(2 * 60)
draw_room(draw5, sx + sw - bsw, sy, bsw, bsl, "Bath", FILL_BATH, font_sm, font_xs)

draw5.text((90, 360), "Note: This file is BMP format (unsupported by the application)", fill=(180, 60, 60), font=font_sm)

img5.save(os.path.join(OUT, "floorplan.bmp"))
print("✓ floorplan.bmp")

print("\nAll test images created in:", os.path.abspath(OUT))
