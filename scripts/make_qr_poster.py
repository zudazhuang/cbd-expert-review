from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
URL = (ROOT / "site-url.txt").read_text(encoding="utf-8").strip()
QR_PATH = ROOT / "assets" / "review_form_qr.png"
OUT_PATH = ROOT / "assets" / "review_form_qr_poster.png"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        Path(r"C:\Windows\Fonts\msyhbd.ttc") if bold else Path(r"C:\Windows\Fonts\msyh.ttc"),
        Path(r"C:\Windows\Fonts\simhei.ttf"),
        Path(r"C:\Windows\Fonts\arial.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def draw_center(draw: ImageDraw.ImageDraw, text: str, y: int, fnt: ImageFont.ImageFont, fill: str) -> int:
    bbox = draw.textbbox((0, 0), text, font=fnt)
    x = (1600 - (bbox[2] - bbox[0])) // 2
    draw.text((x, y), text, font=fnt, fill=fill)
    return y + (bbox[3] - bbox[1])


def main() -> None:
    canvas = Image.new("RGB", (1600, 2200), "white")
    draw = ImageDraw.Draw(canvas)

    draw.rectangle((0, 0, 1600, 2200), outline="#D9DEE7", width=8)
    y = 170
    y = draw_center(draw, "建筑生成方案专家排序评审", y, font(72, True), "#172033") + 34
    y = draw_center(draw, "扫码查看实验图片并完成排序投票", y, font(38), "#0B6B78") + 80

    qr = Image.open(QR_PATH).convert("RGB").resize((860, 860), Image.Resampling.NEAREST)
    qr_x = (1600 - qr.width) // 2
    canvas.paste(qr, (qr_x, y))
    y += qr.height + 64

    y = draw_center(draw, "评分规则：第1名=5分，第2名=4分，第3名=3分，第4名=2分，第5名=1分", y, font(34), "#172033") + 34
    y = draw_center(draw, "评价维度：功能适配 / 建构合规 / 形式表现", y, font(34), "#172033") + 58
    y = draw_center(draw, URL, y, font(30), "#5B667A") + 70

    note = "若无法打开，请联系研究者确认 GitHub Pages 是否已发布。"
    draw_center(draw, note, y, font(28), "#B45309")
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT_PATH, quality=95)
    print(OUT_PATH)


if __name__ == "__main__":
    main()
