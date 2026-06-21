"""
build_zip.py — Genera un ZIP limpio del proyecto, excluyendo venv y cache.
"""
import os
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "plantillas-de-bots-v1.zip"

# Patrones a excluir (case-insensitive, match en cualquier parte del path)
EXCLUDE_DIRS = {
    ".venv", "__pycache__", ".pytest_cache", ".git",
    "data/_tmp_test_security", "data/credentials", "data/bots",
}
EXCLUDE_FILES = {
    "activity.jsonl", ".env", "plantillas-de-bots-v1.zip",
}
EXCLUDE_EXTS = {".pyc", ".pyo"}

def should_exclude(path: Path) -> bool:
    parts = set(path.relative_to(ROOT).parts)
    for ex in EXCLUDE_DIRS:
        if ex in parts:
            return True
    if path.name in EXCLUDE_FILES:
        return True
    if path.suffix.lower() in EXCLUDE_EXTS:
        return True
    return False

def main():
    if OUT.exists():
        OUT.unlink()
    count = 0
    total_size = 0
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for path in sorted(ROOT.rglob("*")):
            if path == OUT:
                continue
            if not path.is_file():
                continue
            if should_exclude(path):
                continue
            arcname = path.relative_to(ROOT).as_posix()
            zf.write(path, arcname)
            count += 1
            total_size += path.stat().st_size
    zip_size = OUT.stat().st_size
    print(f"OK: {count} archivos, {total_size/1024:.1f} KB sin comprimir")
    print(f"ZIP: {OUT.name} = {zip_size/1024:.1f} KB")
    print(f"Reduccion: {(1 - zip_size/total_size)*100:.1f}%")

if __name__ == "__main__":
    main()
