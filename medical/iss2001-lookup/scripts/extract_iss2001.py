#!/usr/bin/env python3
"""
Extract tabular data from the Manual Tarifario ISS 2001 PDF.

Produces a CSV with columns: codigo, descripcion, uvr, valor, capitulo, ref

Two main sections:
  - Pages 2-93:  UVR section (surgical procedures, value in relative units)
  - Pages 95-187: VALOR section (lab/imaging/clinical, value in pesos)

Special pages:
  - Pages 201-204: Appendix (REF + CODIGO + DESCRIPCION, no value column)
  - Various pages skipped (regulatory text without data rows)

Usage:
    python extract_iss2001.py [path/to/pdf]

If no path given, defaults to ../data/MANUAL-ISS-2001.pdf
"""

import csv
import re
import sys
from pathlib import Path

import pdfplumber


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Pages are 1-indexed throughout this script.
UVR_PAGES = range(2, 94)          # 2..93 inclusive
VALOR_PAGES = range(95, 188)      # 95..187 inclusive
APPENDIX_PAGES = range(201, 205)  # 201..204 inclusive (no value column)

SKIP_PAGES = {
    1,    # Legal preamble
    94,   # Transition articles
    122, 136, 144, 146, 147, 152, 156, 157,  # Regulatory paragraphs
}
# Pages 188-207 are legal articles EXCEPT the appendix 201-204
SKIP_PAGES.update(range(188, 201))
SKIP_PAGES.update(range(205, 208))

# Header lines that appear at the top of every page — skip them.
HEADER_PATTERN = re.compile(
    r'^(ACUERDO No\.|POR EL CUAL SE APRUEBA|SOCIAL "EPS-ISS"|'
    r'\( ?\d+ de \w+ ?\)|'
    r'REF\.\s+CODIGO\s+DESCRIPCION\s+(UVR|VALOR)|'
    r'REF\.\s+CODIGO\s+DESCRIPCION$|'
    r'-{20,})'
)

# Main data-line regex.
# Groups: 1=ref, 2=PB (optional), 3=codigo, 4=descripcion+value tail
DATA_LINE_RE = re.compile(
    r'^(M?\d{5,7})\s+'         # REF: 5-7 digits, optional M prefix
    r'(PB\s+)?'                # optional PB marker
    r'([A-Z]?\d{4,5}[A-Z0-9]?)\s+'  # CODIGO: optional letter prefix, 4-6 chars
    r'(.+)$'                   # rest: description (+ optional trailing value)
)

# Conjuntos line: REF then C-prefixed code, then description + value
CONJUNTO_LINE_RE = re.compile(
    r'^(\d{5,7})\s+'
    r'(C\d{5})\s+'
    r'(.+)$'
)

# Component PB line inside Conjuntos (no REF, starts with PB)
CONJUNTO_PB_RE = re.compile(
    r'^PB\s+(\d{5,6})\s+(.+)$'
)

# Bare component line inside Conjuntos: just CODIGO + DESCRIPCION, no REF, no PB, no value.
# These appear when the PDF drops the PB prefix on some component lines.
BARE_COMPONENT_RE = re.compile(
    r'^(\d{6})\s+([A-ZÁÉÍÓÚÑÜ].{10,})$'
)

# REF-less data line: CODIGO + DESCRIPCION + VALUE (no REF prefix).
# Rare — happens when the REF field is missing from the PDF.
REFLESS_DATA_RE = re.compile(
    r'^([A-Z]?\d{5,6}[A-Z0-9]?)\s+'  # CODIGO
    r'([A-ZÁÉÍÓÚÑÜ].+)$'              # DESCRIPCION + trailing value
)

# INCLUYE / APLICA note lines — not data rows
NOTE_RE = re.compile(r'^(INCLUYE|APLICA)\s*:', re.IGNORECASE)

# ARTICULO markers — define the current chapter
ARTICULO_RE = re.compile(r'^ARTICULO\s+(\d+)')

# Sub-section headers: all-caps lines without digits that look like section names
# (e.g. CRANEO, TUMORES, MALFORMACIONES CONGENITAS)
SUBSECTION_RE = re.compile(r'^[A-ZÁÉÍÓÚÑÜ, .\-/()]+$')

# Trailing value: integer (UVR) or dot-separated pesos (VALOR)
# Must be at end of string after whitespace.
TRAILING_VALUE_RE = re.compile(r'\s+([\d.]+)$')

# Pure integer (for UVR)
INTEGER_RE = re.compile(r'^\d+$')

# Peso amount with dot-thousands (for VALOR): e.g. 32.680 or 1.438.690
PESO_RE = re.compile(r'^\d{1,3}(\.\d{3})+$')


def is_header_line(line: str) -> bool:
    """Return True if the line is a page header/decoration to skip."""
    return bool(HEADER_PATTERN.match(line))


def is_note_line(line: str) -> bool:
    """Return True if the line is an INCLUYE/APLICA annotation."""
    return bool(NOTE_RE.match(line))


def is_subsection_header(line: str) -> bool:
    """Return True if the line is a sub-section header in ALL CAPS."""
    stripped = line.strip()
    if len(stripped) < 3 or len(stripped) > 120:
        return False
    # Must be all letters/spaces/punctuation, no digits
    if re.search(r'\d', stripped):
        return False
    # Must be mostly uppercase letters
    alpha_chars = [c for c in stripped if c.isalpha()]
    if not alpha_chars:
        return False
    upper_ratio = sum(1 for c in alpha_chars if c.isupper()) / len(alpha_chars)
    return upper_ratio > 0.85


def parse_value_from_tail(tail: str, section: str):
    """
    Try to extract a numeric value from the end of the description+value string.
    Returns (description, value_str) or (description, None) if no value found.
    """
    stripped = tail.strip()

    # Edge case: the tail IS the value (no description text at all).
    # This happens when the description is entirely on the next line.
    if section == 'uvr' and (INTEGER_RE.match(stripped) or PESO_RE.match(stripped)):
        return '', stripped
    if section == 'valor' and (PESO_RE.match(stripped) or INTEGER_RE.match(stripped)):
        return '', stripped

    m = TRAILING_VALUE_RE.search(tail)
    if not m:
        return tail.strip(), None

    candidate = m.group(1)
    desc = tail[:m.start()].strip()

    if section == 'uvr':
        # UVR values are plain integers or dot-separated thousands (e.g., 1.200)
        if INTEGER_RE.match(candidate) or PESO_RE.match(candidate):
            return desc, candidate
    elif section == 'valor':
        # VALOR values are dot-separated pesos OR plain integers for small amounts
        if PESO_RE.match(candidate) or INTEGER_RE.match(candidate):
            return desc, candidate
    elif section == 'appendix':
        # Appendix has no value column
        return tail.strip(), None

    # If the candidate didn't match expected format, it's part of the description
    # (e.g., a parenthetical reference like "(1)" at end)
    return tail.strip(), None


def determine_section(page_num: int) -> str:
    """Determine which section a page belongs to."""
    if page_num in UVR_PAGES:
        return 'uvr'
    elif page_num in VALOR_PAGES:
        return 'valor'
    elif page_num in APPENDIX_PAGES:
        return 'appendix'
    return 'unknown'


def extract_pdf(pdf_path: str) -> list[dict]:
    """Extract all procedure rows from the ISS 2001 PDF."""
    rows = []
    current_capitulo = ''
    in_conjuntos = False  # Track whether we're inside the Conjuntos section
    warnings = []

    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        print(f"PDF has {total_pages} pages", file=sys.stderr)

        for page_idx, page in enumerate(pdf.pages):
            page_num = page_idx + 1  # 1-indexed

            if page_num in SKIP_PAGES:
                continue

            section = determine_section(page_num)
            if section == 'unknown':
                continue

            text = page.extract_text()
            if not text:
                warnings.append(f"Page {page_num}: no text extracted")
                continue

            lines = text.split('\n')
            pending_row = None  # Row awaiting possible continuation lines

            for line_idx, raw_line in enumerate(lines):
                line = raw_line.strip()
                if not line:
                    continue

                # Skip page headers
                if is_header_line(line):
                    continue

                # Track ARTICULO markers for chapter context
                art_m = ARTICULO_RE.match(line)
                if art_m:
                    # Flush pending row before chapter change
                    if pending_row:
                        rows.append(pending_row)
                        pending_row = None
                    # Extract the full ARTICULO line as chapter name
                    current_capitulo = f"ARTICULO {art_m.group(1)}"
                    continue

                # Skip INCLUYE/APLICA note lines
                if is_note_line(line):
                    # Flush pending row — notes follow the procedure they annotate
                    if pending_row:
                        rows.append(pending_row)
                        pending_row = None
                    continue

                # Skip sub-section headers (e.g. CRANEO, TUMORES), but NOT when
                # we have a pending row — all-caps continuation text (like
                # "POR NEFELOMETRÍA") would be misclassified as headers.
                if is_subsection_header(line) and not pending_row:
                    continue

                # Skip PARAGRAFO lines (regulatory text mixed into data pages)
                if line.startswith('PARAGRAFO') or line.startswith('Procedimientos'):
                    if pending_row:
                        rows.append(pending_row)
                        pending_row = None
                    continue

                # Skip lines that are clearly prose (regulatory paragraphs)
                # These start with lowercase or common legal phrases
                if (line[0].islower()
                        or line.startswith('Que ')
                        or line.startswith('Aprobar ')
                        or line.startswith('En los ')
                        or line.startswith('Para ')
                        or line.startswith('CAPITULO ')
                        or line.startswith('Servicios ')
                        or line.startswith('Nota:')
                        or line.startswith('NOTA:')
                        or line.startswith('Los ')
                        or line.startswith('Se ')
                        or line.startswith('El ')
                        or line.startswith('La ')
                        or line.startswith('Las ')
                        or line.startswith('Si ')
                        or line.startswith('Cuando ')
                        or line.startswith('Sobre ')):
                    if pending_row:
                        rows.append(pending_row)
                        pending_row = None
                    continue

                # Try Conjuntos PB component line (no REF, starts with PB)
                if section == 'valor':
                    pb_m = CONJUNTO_PB_RE.match(line)
                    if pb_m:
                        # Flush pending row — PB components are separate entries
                        if pending_row:
                            rows.append(pending_row)
                            pending_row = None
                        # PB component lines within Conjuntos — skip them
                        # They describe components of the Conjunto, not standalone procedures
                        continue

                # Bare component lines in Conjuntos: codigo + description, no PB prefix,
                # no REF, no value. Skip them like PB components.
                if section == 'valor' and in_conjuntos:
                    bare_m = BARE_COMPONENT_RE.match(line)
                    if bare_m:
                        # Verify it doesn't have a trailing value (which would make
                        # it a real data line, not a component)
                        _, maybe_val = parse_value_from_tail(line, section)
                        if maybe_val is None:
                            if pending_row:
                                rows.append(pending_row)
                                pending_row = None
                            continue

                # Try Conjunto line FIRST (before generic data line, since
                # DATA_LINE_RE also matches C-prefixed codes as CODIGO).
                conjunto_m = CONJUNTO_LINE_RE.match(line)
                data_m = DATA_LINE_RE.match(line) if not conjunto_m else None

                if conjunto_m:
                    # We're now in the Conjuntos section
                    in_conjuntos = True
                    # Flush pending row
                    if pending_row:
                        rows.append(pending_row)
                        pending_row = None

                    ref = conjunto_m.group(1)
                    codigo = conjunto_m.group(2)
                    tail = conjunto_m.group(3)

                    desc, value = parse_value_from_tail(tail, section)

                    row = {
                        'codigo': codigo,
                        'descripcion': desc,
                        'uvr': '',
                        'valor': value if value else '',
                        'capitulo': current_capitulo,
                        'ref': ref,
                    }
                    if value is None or not desc:
                        pending_row = row
                    else:
                        rows.append(row)

                elif data_m:
                    # Flush any pending row
                    if pending_row:
                        rows.append(pending_row)
                        pending_row = None

                    ref = data_m.group(1)
                    codigo = data_m.group(3)
                    tail = data_m.group(4)

                    desc, value = parse_value_from_tail(tail, section)

                    row = {
                        'codigo': codigo,
                        'descripcion': desc,
                        'uvr': value if section == 'uvr' else '',
                        'valor': value if section == 'valor' else '',
                        'capitulo': current_capitulo,
                        'ref': ref,
                    }
                    # If no value found, or description is empty (value on same
                    # line as CODIGO but description on next line), mark as pending
                    # so continuation lines get appended.
                    if section == 'appendix':
                        row['uvr'] = ''
                        row['valor'] = ''
                        if not desc:
                            pending_row = row
                        else:
                            rows.append(row)
                    elif value is None or not desc:
                        if value is None:
                            row['uvr'] = ''
                            row['valor'] = ''
                        pending_row = row
                    else:
                        rows.append(row)

                else:
                    # Try REF-less data line (rare: CODIGO + DESC + VALUE, no REF)
                    refless_m = REFLESS_DATA_RE.match(line)
                    if refless_m and not in_conjuntos:
                        _, maybe_val = parse_value_from_tail(
                            refless_m.group(2), section
                        )
                        if maybe_val is not None:
                            if pending_row:
                                rows.append(pending_row)
                                pending_row = None
                            codigo = refless_m.group(1)
                            desc, value = parse_value_from_tail(
                                refless_m.group(2), section
                            )
                            row = {
                                'codigo': codigo,
                                'descripcion': desc,
                                'uvr': value if section == 'uvr' else '',
                                'valor': value if section == 'valor' else '',
                                'capitulo': current_capitulo,
                                'ref': '',
                            }
                            rows.append(row)
                            continue

                    # Not a data line. Could be:
                    # 1. Continuation of a multi-line description
                    # 2. A line we don't recognize

                    if pending_row:
                        # Check if pending row already has its value
                        has_value = (pending_row['uvr'] or pending_row['valor'])
                        if has_value:
                            # Value already captured (empty-desc case or value on
                            # first line). Just append continuation text.
                            pending_row['descripcion'] += ' ' + line.strip()
                            # Stay pending in case more continuation lines follow
                        else:
                            # Try to see if this continuation line ends with a value
                            desc_addition, value = parse_value_from_tail(
                                line, section
                            )
                            pending_row['descripcion'] += ' ' + desc_addition
                            if value:
                                if section == 'uvr':
                                    pending_row['uvr'] = value
                                elif section == 'valor':
                                    pending_row['valor'] = value
                                rows.append(pending_row)
                                pending_row = None
                            # else: still pending, more continuation lines may follow
                    else:
                        # Orphan line — could be a continuation that wrapped from
                        # a line where the value was already captured. Common pattern:
                        # "01105 PB 020103 CORRECCION DE ... POR 380\nCRANIECTOMIA MULTIPLE"
                        # In this case the value (380) was on the first line, and
                        # "CRANIECTOMIA MULTIPLE" is continuation text.
                        # Append to the last row's description if it looks like text.
                        if rows and not line.startswith(('*', 'a)', 'b)', 'c)', 'd)')):
                            # Verify it looks like continuation text (not a standalone thing)
                            if (len(line) < 120
                                    and not ARTICULO_RE.match(line)
                                    and not line[0].isdigit()):
                                rows[-1]['descripcion'] += ' ' + line.strip()
                            else:
                                warnings.append(
                                    f"Page {page_num}, line {line_idx}: "
                                    f"unparseable: {line[:80]}"
                                )
                        else:
                            # Truly unrecognized
                            if (len(line) > 5
                                    and not line.startswith('*')
                                    and not line.startswith('a)')
                                    and not line.startswith('b)')):
                                warnings.append(
                                    f"Page {page_num}, line {line_idx}: "
                                    f"unparseable: {line[:80]}"
                                )

            # Flush any pending row at end of page
            if pending_row:
                rows.append(pending_row)
                pending_row = None

    # Print warnings
    if warnings:
        print(f"\n--- {len(warnings)} warnings ---", file=sys.stderr)
        for w in warnings[:50]:
            print(f"  WARN: {w}", file=sys.stderr)
        if len(warnings) > 50:
            print(f"  ... and {len(warnings) - 50} more", file=sys.stderr)

    return rows


def clean_description(desc: str) -> str:
    """Normalize whitespace in descriptions."""
    desc = re.sub(r'\s+', ' ', desc).strip()
    desc = desc.rstrip(',')
    return desc


def clean_value(val: str) -> str:
    """Remove dot-thousands separators from numeric values (e.g. '1.200' → '1200')."""
    if not val:
        return val
    if PESO_RE.match(val):
        return val.replace('.', '')
    return val


def write_csv(rows: list[dict], output_path: str):
    """Write extracted rows to CSV."""
    fieldnames = ['codigo', 'descripcion', 'uvr', 'valor', 'capitulo', 'ref']
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        for row in rows:
            row['descripcion'] = clean_description(row['descripcion'])
            row['uvr'] = clean_value(row['uvr'])
            row['valor'] = clean_value(row['valor'])
            writer.writerow(row)


def print_stats(rows: list[dict]):
    """Print extraction statistics."""
    total = len(rows)
    uvr_rows = [r for r in rows if r['uvr']]
    valor_rows = [r for r in rows if r['valor']]
    appendix_rows = [r for r in rows if not r['uvr'] and not r['valor']]
    unique_codes = len(set(r['codigo'] for r in rows))
    unique_capitulos = sorted(set(r['capitulo'] for r in rows if r['capitulo']))

    print(f"\n{'='*60}", file=sys.stderr)
    print(f"ISS 2001 Extraction Complete", file=sys.stderr)
    print(f"{'='*60}", file=sys.stderr)
    print(f"Total rows extracted:     {total:>6,}", file=sys.stderr)
    print(f"  UVR section rows:       {len(uvr_rows):>6,}", file=sys.stderr)
    print(f"  VALOR section rows:     {len(valor_rows):>6,}", file=sys.stderr)
    print(f"  Appendix rows (no val): {len(appendix_rows):>6,}", file=sys.stderr)
    print(f"Unique codes (codigo):    {unique_codes:>6,}", file=sys.stderr)
    print(f"Chapters (capitulos):     {len(unique_capitulos):>6}", file=sys.stderr)
    print(f"{'='*60}", file=sys.stderr)


def main():
    script_dir = Path(__file__).resolve().parent
    default_pdf = script_dir.parent / 'data' / 'MANUAL-ISS-2001.pdf'
    default_csv = script_dir.parent / 'data' / 'ISS_2001.csv'

    pdf_path = sys.argv[1] if len(sys.argv) > 1 else str(default_pdf)

    if not Path(pdf_path).exists():
        print(f"ERROR: PDF not found at {pdf_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Extracting from: {pdf_path}", file=sys.stderr)

    rows = extract_pdf(pdf_path)
    write_csv(rows, str(default_csv))

    print(f"CSV written to:  {default_csv}", file=sys.stderr)
    print_stats(rows)


if __name__ == '__main__':
    main()
