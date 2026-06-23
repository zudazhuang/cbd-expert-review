from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config.js"


def config_value(text: str, key: str) -> str:
    match = re.search(rf"{key}:\s*\"([^\"]*)\"", text)
    return match.group(1) if match else ""


def compact_key(item: dict) -> tuple[str, str]:
    background = item.get("b") or {}
    return ((background.get("v") or "").strip().lower(), item.get("r") or "")


def request_json(url: str, *, method: str = "GET", headers: dict | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read().decode("utf-8")
    return json.loads(raw) if raw else None


def main() -> None:
    text = CONFIG.read_text(encoding="utf-8")
    crud_base = config_value(text, "baseUrl").rstrip("/")
    supabase_url = config_value(text, "supabaseUrl").rstrip("/")
    anon_key = config_value(text, "supabaseAnonKey")
    table_name = config_value(text, "tableName") or "expert_review_submissions"
    if not crud_base:
        raise SystemExit("CrudCrud baseUrl is missing in config.js")
    if not supabase_url or not anon_key:
        raise SystemExit("Supabase is not configured in config.js")

    legacy = request_json(f"{crud_base}/submissions") or []
    api_url = f"{supabase_url}/rest/v1/{table_name}"
    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
        "Content-Type": "application/json",
    }
    existing = request_json(f"{api_url}?select=d,b,r,s,created_at", headers=headers) or []
    existing_keys = {compact_key(item) for item in existing}

    imported = 0
    skipped = 0
    for item in legacy:
        payload = {key: item.get(key) for key in ("d", "b", "r", "s") if key in item}
        if not payload.get("b") or not payload.get("r"):
            skipped += 1
            continue
        key = compact_key(payload)
        if key in existing_keys:
            skipped += 1
            continue
        try:
            request_json(f"{api_url}", method="POST", headers={**headers, "Prefer": "return=minimal"}, body=payload)
            existing_keys.add(key)
            imported += 1
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise SystemExit(f"Import failed for {payload.get('b', {}).get('v', '')}: {error.code} {detail}") from error

    print(f"Imported {imported} submissions; skipped {skipped}.")


if __name__ == "__main__":
    main()
