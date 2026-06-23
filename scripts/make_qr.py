from __future__ import annotations

import argparse
import importlib.util
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / ".vendor"


def import_qrcode():
    try:
        import qrcode

        return qrcode
    except ModuleNotFoundError:
        package_init = VENDOR / "qrcode" / "__init__.py"
        if not package_init.exists():
            raise
        spec = importlib.util.spec_from_file_location(
            "qrcode",
            package_init,
            submodule_search_locations=[str(VENDOR / "qrcode")],
        )
        if spec is None or spec.loader is None:
            raise ModuleNotFoundError("Cannot load qrcode from .vendor")
        module = importlib.util.module_from_spec(spec)
        sys.modules["qrcode"] = module
        spec.loader.exec_module(module)
        return module


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a QR code for the expert review form.")
    parser.add_argument("--url", default=(ROOT / "site-url.txt").read_text(encoding="utf-8").strip())
    parser.add_argument("--output", default=str(ROOT / "assets" / "review_form_qr.png"))
    args = parser.parse_args()

    try:
        qrcode = import_qrcode()
    except ModuleNotFoundError as exc:
        raise SystemExit(
            "Missing dependency: qrcode. Install with: python -m pip install qrcode --target "
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
