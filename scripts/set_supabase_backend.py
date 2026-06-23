from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config.js"


def js_string(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def replace_field(text: str, field: str, value: str) -> str:
    pattern = rf"{field}:\s*\"[^\"]*\""
    return re.sub(pattern, f'{field}: "{js_string(value)}"', text, count=1)


def main() -> None:
    if len(sys.argv) not in (3, 4):
        raise SystemExit(
            "Usage: python scripts/set_supabase_backend.py <supabase_url> <anon_key> [table_name]"
        )
    supabase_url = sys.argv[1].strip().rstrip("/")
    anon_key = sys.argv[2].strip()
    table_name = sys.argv[3].strip() if len(sys.argv) == 4 else "expert_review_submissions"
    if not supabase_url.startswith("https://") or ".supabase.co" not in supabase_url:
        raise SystemExit("Expected a Supabase project URL like https://xxxx.supabase.co")
    if not anon_key:
        raise SystemExit("Expected a non-empty Supabase anon key.")
    text = CONFIG.read_text(encoding="utf-8")
    text = re.sub(r'type:\s*"[^"]*"', 'type: "supabase"', text, count=1)
    text = replace_field(text, "supabaseUrl", supabase_url)
    text = replace_field(text, "supabaseAnonKey", anon_key)
    text = replace_field(text, "tableName", table_name)
    CONFIG.write_text(text, encoding="utf-8")
    print(f"Updated {CONFIG}")


if __name__ == "__main__":
    main()
