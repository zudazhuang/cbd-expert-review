from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config.js"


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/set_cloudbase_backend.py <cloudbase_http_function_url>")
    url = sys.argv[1].strip()
    if not url.startswith("https://"):
        raise SystemExit("Expected an HTTPS CloudBase HTTP access URL.")
    text = CONFIG.read_text(encoding="utf-8")
    text = re.sub(r'type:\s*"[^"]*"', 'type: "cloudbase_http"', text, count=1)
    text = re.sub(r'submitUrl:\s*"[^"]*"', f'submitUrl: "{url}"', text)
    text = re.sub(r'listUrl:\s*"[^"]*"', f'listUrl: "{url}"', text)
    CONFIG.write_text(text, encoding="utf-8")
    print(f"Updated {CONFIG}")


if __name__ == "__main__":
    main()
