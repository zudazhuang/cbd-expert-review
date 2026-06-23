from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "cases"
OUT = ROOT / "assets" / "cases_mobile"
LABELS = ["方案A", "方案B", "方案C", "方案D", "方案E"]


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        Path(r"C:\Windows\Fonts\msyhbd.ttc") if bold else Path(r"C:\Windows\Fonts\msyh.ttc"),
        Path(r"C:\Windows\Fonts\simhei.ttf"),
        Path(r"C:\Windows\Fonts\arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def draw_center(draw: ImageDraw.ImageDraw, xyxy: tuple[int, int, int, int], text: str, fnt: ImageFont.ImageFont) -> None:
    left, top, right, bottom = xyxy
    bbox = draw.textbbox((0, 0), text, font=fnt)
    x = left + (right - left - (bbox[2] - bbox[0])) / 2
    y = top + (bottom - top - (bbox[3] - bbox[1])) / 2 - 2
    draw.text((x, y), text, fill="#172033", font=fnt)


def mobile_image(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGB")
    width, height = image.size
    first_col = int(width * 0.091)
    header_h = 92 if width > 3000 else 90
    row_top = header_h
    row_h = height - row_top
    col_w = (width - first_col) / 5

    target_w = 1080
    margin = 22
    gutter = 14
    row_gap = 20
    label_h = 52
    panel_w = int((target_w - margin * 2 - gutter * 2) / 3)
    panels: list[Image.Image] = []

    for idx, label in enumerate(LABELS):
        left = int(first_col + idx * col_w)
        right = int(first_col + (idx + 1) * col_w)
        crop = image.crop((left, row_top, right, row_top + row_h))
        crop_h = int(panel_w * crop.height / crop.width)
        crop = crop.resize((panel_w, crop_h), Image.Resampling.LANCZOS)
        panel = Image.new("RGB", (panel_w, label_h + crop_h + 2), "white")
        draw = ImageDraw.Draw(panel)
        draw.rectangle((0, 0, panel_w - 1, label_h), fill="#E8EEF5", outline="#D9DEE7", width=2)
        draw_center(draw, (0, 0, panel_w, label_h), label, font(28, True))
        panel.paste(crop, (0, label_h))
        draw.rectangle((0, label_h, panel_w - 1, label_h + crop_h), outline="#D9DEE7", width=2)
        panels.append(panel)

    first_row = panels[:3]
    second_row = panels[3:]
    row_h = max(panel.height for panel in panels)
    out_h = margin + row_h + row_gap + row_h + margin
    out = Image.new("RGB", (target_w, out_h), "white")
    y = margin
    for idx, panel in enumerate(first_row):
        out.paste(panel, (margin + idx * (panel_w + gutter), y))
    y = margin + row_h + row_gap
    second_row_w = len(second_row) * panel_w + (len(second_row) - 1) * gutter
    x0 = int((target_w - second_row_w) / 2)
    for idx, panel in enumerate(second_row):
        out.paste(panel, (x0 + idx * (panel_w + gutter), y))
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for path in sorted(SRC.glob("group*_*.jpg")):
        out = mobile_image(path)
        out.save(OUT / path.name, quality=88, optimize=True)
        print(OUT / path.name)


if __name__ == "__main__":
    main()
