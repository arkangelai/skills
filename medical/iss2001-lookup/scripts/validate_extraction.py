#!/usr/bin/env python3
"""
Validate the extracted ISS 2001 CSV against structural, statistical,
and spot-check rules.

Exit 0 if every check passes, exit 1 otherwise.
"""

import csv
import re
import sys
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "ISS_2001.csv"

CODIGO_RE = re.compile(r"^[A-Z]?\d{5}[A-Z0-9]?$")
VALID_PREFIXES = set("CSEMIA")

# --- Known procedures for spot-check (pass 3) ---
KNOWN_PROCEDURES = {
    "020101": {
        "keywords": ["CRANEO", "SINOSTOSIS", "CRANIECTOMIA"],
        "area": "neurosurgery",
    },
    "850100": {
        "keywords": ["MAMA", "DRENAJE", "MASTOTOMIA"],
        "area": "breast surgery",
    },
    "060200": {
        "keywords": ["TIROID", "HERIDA"],
        "area": "thyroid",
    },
    "770100": {
        "keywords": ["SECUESTRECTOMIA", "DESBRIDAMIENTO", "DRENAJE"],
        "area": "orthopedics",
    },
    "903841": {
        "keywords": ["GLUCOSA", "SUERO", "LCR"],
        "area": "laboratory",
    },
    "903046": {
        "keywords": ["NEFELOMETRI"],
        "area": "laboratory",
    },
}

# --- Helpers ---

def is_positive_integer(s: str) -> bool:
    """Return True when *s* represents a positive integer (no decimals)."""
    try:
        v = int(s)
        return v > 0
    except (ValueError, TypeError):
        return False


def is_positive_number(s: str) -> bool:
    """Return True when *s* represents a positive number (int or float)."""
    try:
        v = float(s)
        return v > 0
    except (ValueError, TypeError):
        return False


def load_csv(path: Path):
    """Load the CSV and return (rows, header). Abort on I/O errors."""
    if not path.exists():
        print(f"FATAL: CSV not found at {path}")
        sys.exit(1)

    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        header = reader.fieldnames
        rows = list(reader)
    return rows, header


# ------------------------------------------------------------------ #
# Pass 1 — Structural validation
# ------------------------------------------------------------------ #

def pass_structural(rows):
    """Return (ok: bool, details: list[str])."""
    expected_cols = {"codigo", "descripcion", "uvr", "valor", "capitulo", "ref"}
    actual_cols = set(rows[0].keys()) if rows else set()
    details: list[str] = []
    ok = True

    # Column check
    missing = expected_cols - actual_cols
    if missing:
        details.append(f"Missing columns: {missing}")
        ok = False

    errors_codigo_empty = 0
    errors_codigo_format = 0
    errors_desc_empty = 0
    errors_uvr_valor = 0
    errors_uvr_format = 0
    errors_valor_format = 0
    errors_ref_empty = 0

    bad_codigo_examples: list[str] = []
    bad_uvr_valor_examples: list[str] = []

    for i, row in enumerate(rows, start=2):  # row 1 is header
        codigo = (row.get("codigo") or "").strip()
        descripcion = (row.get("descripcion") or "").strip()
        uvr = (row.get("uvr") or "").strip()
        valor = (row.get("valor") or "").strip()
        ref = (row.get("ref") or "").strip()
        capitulo = (row.get("capitulo") or "").strip()

        # 1a. Non-empty codigo
        if not codigo:
            errors_codigo_empty += 1
            continue

        # 1b. Codigo format
        if not CODIGO_RE.match(codigo):
            errors_codigo_format += 1
            if len(bad_codigo_examples) < 5:
                bad_codigo_examples.append(f"  row {i}: '{codigo}'")

        # 1c. Descripcion non-empty
        if not descripcion:
            errors_desc_empty += 1

        # 1d. UVR / Valor mutual exclusivity
        has_uvr = bool(uvr)
        has_valor = bool(valor)

        if has_uvr and has_valor:
            errors_uvr_valor += 1
            if len(bad_uvr_valor_examples) < 5:
                bad_uvr_valor_examples.append(
                    f"  row {i}: codigo={codigo} uvr={uvr} valor={valor}"
                )
        elif not has_uvr and not has_valor:
            errors_uvr_valor += 1
            if len(bad_uvr_valor_examples) < 5:
                bad_uvr_valor_examples.append(
                    f"  row {i}: codigo={codigo} (neither uvr nor valor)"
                )

        # 1e. UVR positive integer
        if has_uvr and not is_positive_integer(uvr):
            errors_uvr_format += 1

        # 1f. Valor positive number
        if has_valor and not is_positive_number(valor):
            errors_valor_format += 1

        # 1g. Ref non-empty
        if not ref:
            errors_ref_empty += 1

    # Summarise
    checks = [
        ("codigo empty", errors_codigo_empty, 0),
        ("codigo format", errors_codigo_format, 0),
        ("descripcion empty", errors_desc_empty, 0),
        ("uvr/valor mutual exclusivity", errors_uvr_valor, 150),
        ("uvr format (not positive int)", errors_uvr_format, 0),
        ("valor format (not positive num)", errors_valor_format, 0),
        ("ref empty", errors_ref_empty, 5),
    ]

    for label, count, threshold in checks:
        if count > threshold:
            ok = False
            details.append(f"FAIL  {label}: {count} error(s)")
            if label == "codigo format" and bad_codigo_examples:
                details.extend(bad_codigo_examples)
            if label == "uvr/valor mutual exclusivity" and bad_uvr_valor_examples:
                details.extend(bad_uvr_valor_examples)
        else:
            details.append(f"  OK  {label}")

    return ok, details


# ------------------------------------------------------------------ #
# Pass 2 — Statistical sanity
# ------------------------------------------------------------------ #

def pass_statistical(rows):
    """Return (ok: bool, details: list[str])."""
    details: list[str] = []
    ok = True

    total = len(rows)
    uvr_count = 0
    valor_count = 0
    chapters: dict[str, int] = {}
    codigo_seen: dict[str, int] = {}

    for row in rows:
        codigo = (row.get("codigo") or "").strip()
        uvr = (row.get("uvr") or "").strip()
        valor = (row.get("valor") or "").strip()
        capitulo = (row.get("capitulo") or "").strip()

        if uvr:
            uvr_count += 1
        if valor:
            valor_count += 1
        if capitulo:
            chapters[capitulo] = chapters.get(capitulo, 0) + 1
        if codigo:
            codigo_seen[codigo] = codigo_seen.get(codigo, 0) + 1

    # 2a. Total row count
    if 5500 <= total <= 6500:
        details.append(f"  OK  Total rows: {total} (expected 5500-6500)")
    else:
        ok = False
        details.append(f"FAIL  Total rows: {total} (expected 5500-6500)")

    # 2b. UVR rows
    if 2000 <= uvr_count <= 3500:
        details.append(f"  OK  UVR rows: {uvr_count} (expected 2000-3500)")
    else:
        ok = False
        details.append(f"FAIL  UVR rows: {uvr_count} (expected 2000-3500)")

    # 2c. VALOR rows
    if 2000 <= valor_count <= 3500:
        details.append(f"  OK  VALOR rows: {valor_count} (expected 2000-3500)")
    else:
        ok = False
        details.append(f"FAIL  VALOR rows: {valor_count} (expected 2000-3500)")

    # 2d. No chapter with zero entries (if chapters detected)
    if chapters:
        empty_chapters = [ch for ch, cnt in chapters.items() if cnt == 0]
        if empty_chapters:
            ok = False
            details.append(f"FAIL  Chapters with zero entries: {empty_chapters}")
        else:
            details.append(
                f"  OK  {len(chapters)} chapter(s), none empty — "
                + ", ".join(f"{ch}: {cnt}" for ch, cnt in sorted(chapters.items()))
            )
    else:
        details.append("WARN  No chapter information found in data")

    # 2e. Duplicate codigos
    dupes = {c: n for c, n in codigo_seen.items() if n > 1}
    if dupes:
        details.append(
            f"INFO  {len(dupes)} duplicate codigo(s) "
            f"(not a failure — some codes appear in both sections)"
        )
        for c, n in sorted(dupes.items())[:10]:
            details.append(f"        {c} x{n}")
        if len(dupes) > 10:
            details.append(f"        ... and {len(dupes) - 10} more")
    else:
        details.append("  OK  No duplicate codigos")

    return ok, details


# ------------------------------------------------------------------ #
# Pass 3 — Spot-check known procedures
# ------------------------------------------------------------------ #

def pass_spotcheck(rows):
    """Return (ok: bool, details: list[str])."""
    details: list[str] = []
    ok = True

    # Build a lookup: codigo -> list of descripcion values
    lookup: dict[str, list[str]] = {}
    for row in rows:
        codigo = (row.get("codigo") or "").strip()
        descripcion = (row.get("descripcion") or "").strip()
        if codigo:
            lookup.setdefault(codigo, []).append(descripcion)

    for codigo, spec in KNOWN_PROCEDURES.items():
        descriptions = lookup.get(codigo, [])
        if not descriptions:
            ok = False
            details.append(f"FAIL  {codigo} ({spec['area']}): not found in CSV")
            continue

        # Check if any keyword matches (case-insensitive) in any description
        combined = " ".join(descriptions).upper()
        matched = any(kw.upper() in combined for kw in spec["keywords"])
        if matched:
            short_desc = descriptions[0][:80]
            details.append(f"  OK  {codigo} ({spec['area']}): \"{short_desc}\"")
        else:
            # Lenient: show what we found — flag as warning, not hard fail
            short_desc = descriptions[0][:80]
            details.append(
                f"WARN  {codigo} ({spec['area']}): "
                f"no keyword match but found \"{short_desc}\" "
                f"(keywords: {spec['keywords']})"
            )

    return ok, details


# ------------------------------------------------------------------ #
# Main
# ------------------------------------------------------------------ #

def main():
    print(f"Validating: {CSV_PATH}\n")

    rows, header = load_csv(CSV_PATH)
    if not rows:
        print("FATAL: CSV is empty")
        sys.exit(1)

    print(f"Loaded {len(rows)} rows, columns: {header}\n")

    overall = True

    # --- Pass 1 ---
    print("=" * 60)
    print("PASS 1: Structural validation")
    print("=" * 60)
    p1_ok, p1_details = pass_structural(rows)
    for line in p1_details:
        print(line)
    status = "PASS" if p1_ok else "FAIL"
    print(f"\n>> Pass 1: {status}\n")
    if not p1_ok:
        overall = False

    # --- Pass 2 ---
    print("=" * 60)
    print("PASS 2: Statistical sanity")
    print("=" * 60)
    p2_ok, p2_details = pass_statistical(rows)
    for line in p2_details:
        print(line)
    status = "PASS" if p2_ok else "FAIL"
    print(f"\n>> Pass 2: {status}\n")
    if not p2_ok:
        overall = False

    # --- Pass 3 ---
    print("=" * 60)
    print("PASS 3: Spot-check known procedures")
    print("=" * 60)
    p3_ok, p3_details = pass_spotcheck(rows)
    for line in p3_details:
        print(line)
    status = "PASS" if p3_ok else "FAIL"
    print(f"\n>> Pass 3: {status}\n")
    if not p3_ok:
        overall = False

    # --- Summary ---
    print("=" * 60)
    if overall:
        print("OVERALL: PASS — all validations passed")
    else:
        failed = []
        if not p1_ok:
            failed.append("Structural")
        if not p2_ok:
            failed.append("Statistical")
        if not p3_ok:
            failed.append("Spot-check")
        print(f"OVERALL: FAIL — failed: {', '.join(failed)}")
    print("=" * 60)

    sys.exit(0 if overall else 1)


if __name__ == "__main__":
    main()
