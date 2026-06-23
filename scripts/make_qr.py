from __future__ import annotations

import argparse
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / ".vendor"
if VENDOR.exists():
    sys.path.insert(0, str(VENDOR))


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a QR code for the expert review form.")
    parser.add_argument("--url", default=(ROOT / "site-url.txt").read_text(encoding="utf-8").strip())
    parser.add_argument("--output", default=str(ROOT / "assets" / "review_form_qr.png"))
    args = parser.parse_args()

    try:
        import qrcode
    except ModuleNotFoundError as exc:
        raise SystemExit(
            "Missing dependency: qrcode. Install with: python -m pip install qrcode[pil] --target "
            + str(VENDOR)
        ) from exc

    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=3)
    qr.add_data(args.url)
    qr.make(fit=True)
    image = qr.make_image(fill_color="#111827", back_color="white")
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output)
    print(output)
    print(args.url)


if __name__ == "__main__":
    main()
