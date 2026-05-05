#!/usr/bin/env node
/**
 * Test runner para el CUPS 2026 lookup tool.
 *
 * Carga los casos de test_cases.json y ejecuta cada uno contra cups-lookup.js.
 *
 * Uso:
 *   node test_cups.js
 */

'use strict';

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const TOOL  = path.join(__dirname, '..', 'cups-lookup.js');
const CASES = path.join(__dirname, 'test_cases.json');

const GREEN  = '\x1b[92m';
const RED    = '\x1b[91m';
const YELLOW = '\x1b[93m';
const CYAN   = '\x1b[96m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

let passed = 0;
let failed = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(...args) {
  try {
    const stdout = execSync(`node ${TOOL} ${args.map(a => JSON.stringify(a)).join(' ')}`, {
      encoding: 'utf-8',
    });
    return JSON.parse(stdout);
  } catch (e) {
    const stdout = e.stdout || '';
    try { return JSON.parse(stdout); }
    catch { return { error: `No se pudo parsear la salida: ${stdout.slice(0, 200)}` }; }
  }
}

function section(title) {
  console.log(`\n${BOLD}${CYAN}${'─'.repeat(65)}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${BOLD}${CYAN}${'─'.repeat(65)}${RESET}`);
}

function ok(label, detail = '') {
  passed++;
  console.log(`  ${GREEN}✓ PASS${RESET}  ${label}`);
  if (detail) console.log(`         ${YELLOW}${detail.slice(0, 80)}${RESET}`);
}

function fail(label, reason = '') {
  failed++;
  console.log(`  ${RED}✗ FAIL${RESET}  ${label}`);
  if (reason) console.log(`         ${RED}${reason.slice(0, 100)}${RESET}`);
}

// ---------------------------------------------------------------------------
// Test groups
// ---------------------------------------------------------------------------

function testValidate(cases) {
  section('1. VALIDATE — códigos válidos (deben existir en CUPS 2026)');
  for (const c of cases.validos || []) {
    const r = run('validate', c.codigo);
    const label = `${c.codigo}  ${(c.descripcion_esperada || '').slice(0, 50)}`;
    if (r.status === 'valid') {
      ok(label, r.descripcion || '');
    } else {
      fail(label, `status=${r.status} | ${r.error || ''}`);
    }
  }

  section('2. VALIDATE — códigos inválidos (NO deben existir en CUPS 2026)');
  for (const c of cases.invalidos || []) {
    const r = run('validate', c.codigo);
    const label = `${c.codigo}  (${(c.razon || '').slice(0, 50)})`;
    if (r.status === 'invalid') {
      const sug = (r.sugerencias || []).slice(0, 3).map(s => s.codigo);
      ok(label, sug.length ? `Sugerencias: ${JSON.stringify(sug)}` : 'Sin sugerencias');
    } else {
      fail(label, `status=${r.status} — se esperaba 'invalid'`);
    }
  }
}

function testLookup(casos) {
  section('3. LOOKUP — campos del registro completo');
  for (const c of casos) {
    const r = run('lookup', c.codigo);
    const errors = [];
    for (const [field, expected] of Object.entries(c.campos_esperados || {})) {
      if (r[field] !== expected) {
        errors.push(`${field}: esperado=${JSON.stringify(expected)} actual=${JSON.stringify(r[field])}`);
      }
    }
    if (errors.length) {
      fail(c.codigo, errors.join(' | '));
    } else {
      ok(c.codigo, (r.descripcion || '').slice(0, 70));
    }
  }
}

function testSearch(casos) {
  section('4. SEARCH — búsqueda por término clínico');
  for (const c of casos) {
    const r = run('search', ...c.terminos);
    const label = `search ${c.terminos.join(' ')}`;
    const total = r.total || 0;
    const minR  = c.minimo_resultados || 1;
    const firstDesc = ((r.resultados || [])[0] || {}).descripcion || '';
    const contains  = c.primer_resultado_contiene || '';

    if (total < minR) {
      fail(label, `Se esperaban ≥${minR} resultados, se obtuvieron ${total}`);
    } else if (contains && !firstDesc.toUpperCase().includes(contains.toUpperCase())) {
      fail(label, `Primer resultado '${firstDesc.slice(0, 60)}' no contiene '${contains}'`);
    } else {
      ok(label, `${total} resultados — primero: ${firstDesc.slice(0, 60)}`);
    }
  }
}

function testSeccion(casos) {
  section('5. SECCION — exploración por prefijo');
  for (const c of casos) {
    const r = run('seccion', c.prefijo);
    const label = `seccion ${c.prefijo}  (${c.descripcion || ''})`;
    const total = r.total || 0;
    const minC  = c.minimo_codigos || 1;
    if (total < minC) {
      fail(label, `Se esperaban ≥${minC} códigos, se obtuvieron ${total}`);
    } else {
      ok(label, `${total} códigos`);
    }
  }
}

function testNormalizacion(casos) {
  section('6. NORMALIZACIÓN — distintos formatos de entrada');
  for (const c of casos) {
    const r = run('validate', c.entrada);
    const label = `entrada='${c.entrada}' → esperado='${c.normalizado}'`;
    if (r.codigo === c.normalizado) {
      ok(label, r.descripcion || r.status || '');
    } else {
      fail(label, `código devuelto: '${r.codigo}'`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (!fs.existsSync(CASES)) {
  console.error(`${RED}No se encontró ${CASES}${RESET}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(CASES, 'utf-8'));
const meta = data._meta || {};

console.log(`\n${BOLD}CUPS Lookup — Test Suite${RESET}`);
console.log(`Fuente:   ${meta.fuente || ''}`);
console.log(`Vigencia: ${meta.vigencia || ''}`);
console.log(`Códigos en catálogo: ${meta.total_codigos_en_catalogo || '?'}`);

testValidate(data.validate || {});
testLookup((data.lookup || {}).casos || []);
testSearch((data.search || {}).casos || []);
testSeccion((data.seccion || {}).casos || []);
testNormalizacion((data.normalizacion || {}).casos || []);

const total = passed + failed;
console.log(`\n${BOLD}${'─'.repeat(65)}${RESET}`);
console.log(`${BOLD}  Resultado: ${passed}/${total} tests pasaron${RESET}`);
if (failed === 0) {
  console.log(`  ${GREEN}${BOLD}Todos los tests pasaron ✓${RESET}`);
} else {
  console.log(`  ${RED}${BOLD}${failed} tests fallaron ✗${RESET}`);
}
console.log(`${'─'.repeat(65)}\n`);

process.exit(failed === 0 ? 0 : 1);
