from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUT = ASSETS / "cases"


SOURCES = [
    ("e2e", ASSETS / "fig5_2_e2e_cases01_04.png", ["01", "02", "03", "04"], 58, 150, 360),
    ("e2e", ASSETS / "fig5_2_e2e_cases05_08.png", ["05", "06", "07", "08"], 58, 150, 360),
    ("mcp", ASSETS / "fig5_3_mcp_cases01_04.png", ["01", "02", "03", "04"], 60, 150, 330),
    ("mcp", ASSETS / "fig5_3_mcp_cases05_08.png", ["05", "06", "07", "08"], 60, 150, 330),
]


def make_case_images() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for prefix, source, case_ids, header_top, header_bottom, row_height in SOURCES:
        image = Image.open(source).convert("RGB")
        width, height = image.size
        header = image.crop((0, header_top, width, header_bottom))
        for index, case_id in enumerate(case_ids):
            row_top = header_bottom + index * row_height
            row_bottom = min(header_bottom + (index + 1) * row_height, height)
            row = image.crop((0, row_top, width, row_bottom))
            out = Image.new("RGB", (width, header.height + row.height), "white")
            out.paste(header, (0, 0))
            out.paste(row, (0, header.height))
            out.save(OUT / f"{prefix}_{case_id}.jpg", quality=88, optimize=True)


if __name__ == "__main__":
    make_case_images()
