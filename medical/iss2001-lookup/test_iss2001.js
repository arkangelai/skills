#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const TOOL  = path.join(__dirname, 'iss2001-lookup.js');
const CASES = path.join(__dirname, 'test_cases.json');

const GREEN  = '\x1b[92m';
const RED    = '\x1b[91m';
const YELLOW = '\x1b[93m';
const CYAN   = '\x1b[96m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

let passed = 0;
let failed = 0;

function stripAccents(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function run(...args) {
  try {
    const stdout = execSync(
      `node ${TOOL} ${args.map(a => JSON.stringify(String(a))).join(' ')}`,
      { encoding: 'utf-8', timeout: 10000 }
    );
    return JSON.parse(stdout);
  } catch (e) {
    try { return JSON.parse(e.stdout || ''); }
    catch { return { error: `Parse error: ${(e.stdout || '').slice(0, 200)}` }; }
  }
}

function section(title) {
  console.log(`\n${BOLD}${CYAN}${'─'.repeat(65)}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${CYAN}${'─'.repeat(65)}${RESET}`);
}

function ok(label, detail) {
  passed++;
  console.log(`  ${GREEN}✓${RESET} ${label}`);
  if (detail) console.log(`    ${YELLOW}${String(detail).slice(0, 90)}${RESET}`);
}

function fail(label, reason) {
  failed++;
  console.log(`  ${RED}✗${RESET} ${label}`);
  if (reason) console.log(`    ${RED}${String(reason).slice(0, 120)}${RESET}`);
}

// ── 1. VALIDATE — códigos válidos ──────────────────────────────────────

function testValidateValidos(data) {
  section('VALIDATE — códigos válidos');
  const groups = [
    ['validos_uvr',       data.validos_uvr       || []],
    ['validos_valor',     data.validos_valor      || []],
    ['validos_apendice',  data.validos_apendice   || []],
    ['validos_prefijados', data.validos_prefijados || []],
  ];
  for (const [group, cases] of groups) {
    for (const c of cases) {
      const r = run('validate', c.codigo);
      const label = `[${group}] ${c.codigo} (tipo=${c.tipo})`;
      if (r.status !== 'valid') {
        fail(label, `status=${r.status}`);
        continue;
      }
      if (r.tipo !== c.tipo) {
        fail(label, `tipo: esperado=${c.tipo} actual=${r.tipo}`);
        continue;
      }
      if (c.descripcion_contiene) {
        const desc = stripAccents((r.descripcion || '').toUpperCase());
        if (!desc.includes(stripAccents(c.descripcion_contiene.toUpperCase()))) {
          fail(label, `descripcion no contiene '${c.descripcion_contiene}'`);
          continue;
        }
      }
      ok(label, r.descripcion);
    }
  }
}

// ── 2. VALIDATE — códigos inválidos ────────────────────────────────────

function testValidateInvalidos(invalidos) {
  section('VALIDATE — códigos inválidos');
  for (const codigo of invalidos) {
    const r = run('validate', codigo);
    const label = `${codigo}`;
    if (r.status === 'invalid') {
      const sug = (r.sugerencias || []).length;
      ok(label, `invalid — ${sug} sugerencia(s)`);
    } else {
      fail(label, `esperado status=invalid, obtenido=${r.status}`);
    }
  }
}

// ── 3. LOOKUP — registro completo ──────────────────────────────────────

function testLookup(casos) {
  section('LOOKUP — registro completo');
  for (const c of casos) {
    const r = run('lookup', c.codigo);
    const e = c.esperado;
    const errors = [];

    if (r.error) { fail(c.codigo, r.error); continue; }

    if (e.descripcion && stripAccents(r.descripcion || '') !== stripAccents(e.descripcion))
      errors.push(`desc: '${(r.descripcion||'').slice(0,40)}' ≠ esperado`);
    if (e.uvr !== undefined && r.uvr !== e.uvr)
      errors.push(`uvr: ${r.uvr} ≠ ${e.uvr}`);
    if (e.valor !== undefined && r.valor !== e.valor)
      errors.push(`valor: ${r.valor} ≠ ${e.valor}`);
    if (e.capitulo && r.capitulo !== e.capitulo)
      errors.push(`capitulo: ${r.capitulo} ≠ ${e.capitulo}`);
    if (e.tipo && r.tipo !== e.tipo)
      errors.push(`tipo: ${r.tipo} ≠ ${e.tipo}`);

    if (errors.length) {
      fail(c.codigo, errors.join(' | '));
    } else {
      ok(c.codigo, `${r.tipo} | ${(r.descripcion||'').slice(0,50)}`);
    }
  }
}

// ── 4. SEARCH — búsqueda por término clínico ──────────────────────────

function testSearch(casos) {
  section('SEARCH — búsqueda por término clínico');
  for (const c of casos) {
    const r = run('search', ...c.terminos);
    const total = r.total || 0;
    const label = `search "${c.terminos.join(' ')}"`;

    if (c.min_resultados !== undefined && total < c.min_resultados) {
      fail(label, `min=${c.min_resultados} pero total=${total}`);
      continue;
    }
    if (c.max_resultados !== undefined && total > c.max_resultados) {
      fail(label, `max=${c.max_resultados} pero total=${total}`);
      continue;
    }
    if (c.debe_contener_codigo) {
      const codes = (r.resultados || []).map(x => x.codigo);
      if (!codes.includes(c.debe_contener_codigo)) {
        fail(label, `debe contener ${c.debe_contener_codigo} — no está en top ${codes.length}`);
        continue;
      }
    }
    const first = ((r.resultados || [])[0] || {}).descripcion || '';
    ok(label, `${total} resultados — ${first.slice(0, 50)}`);
  }
}

// ── 5. SECCION — exploración por prefijo ───────────────────────────────

function testSeccion(casos) {
  section('SECCION — exploración por prefijo');
  for (const c of casos) {
    const r = run('seccion', c.prefijo);
    const total = r.total || 0;
    const label = `seccion "${c.prefijo}"`;

    if (total < c.min_codigos) {
      fail(label, `min=${c.min_codigos} pero total=${total}`);
      continue;
    }
    if (c.max_codigos !== undefined && total > c.max_codigos) {
      fail(label, `max=${c.max_codigos} pero total=${total}`);
      continue;
    }
    ok(label, `${total} códigos`);
  }
}

// ── 6. TARIFA — cálculo de tarifa en pesos ─────────────────────────────

function testTarifa(data) {
  section('TARIFA — cálculo UVR');
  for (const c of (data.casos_uvr || [])) {
    const r = run('tarifa', c.codigo, String(c.valor_uvr));
    const label = `tarifa ${c.codigo} × ${c.valor_uvr}`;

    if (r.error) { fail(label, r.error); continue; }
    const errors = [];
    if (r.uvr !== c.uvr_esperado) errors.push(`uvr: ${r.uvr} ≠ ${c.uvr_esperado}`);
    if (r.tarifa_pesos !== c.tarifa_esperada) errors.push(`tarifa: ${r.tarifa_pesos} ≠ ${c.tarifa_esperada}`);

    if (errors.length) fail(label, errors.join(' | '));
    else ok(label, `$${r.tarifa_pesos.toLocaleString('es-CO')}`);
  }

  section('TARIFA — código VALOR (tarifa directa en pesos)');
  for (const c of (data.casos_valor_directo || [])) {
    const r = run('tarifa', c.codigo, '29000');
    const label = `tarifa ${c.codigo} (tipo VALOR)`;
    if (r.valor === c.valor_esperado && r.nota) {
      ok(label, `$${r.valor} — con nota explicativa`);
    } else if (r.valor !== c.valor_esperado) {
      fail(label, `valor: ${r.valor} ≠ ${c.valor_esperado}`);
    } else {
      fail(label, 'falta nota explicativa para código VALOR');
    }
  }

  section('TARIFA — casos de error');
  for (const c of (data.casos_error || [])) {
    const args = [c.codigo];
    if (c.valor_uvr !== undefined) args.push(String(c.valor_uvr));
    else args.push('29000');
    const r = run('tarifa', ...args);
    const label = `tarifa error: ${c.tipo_error}`;
    if (r.error) {
      ok(label, r.error.slice(0, 80));
    } else {
      fail(label, 'se esperaba error pero no lo hubo');
    }
  }
}

// ── 7. NORMALIZACIÓN — formatos de entrada ─────────────────────────────

function testNormalizacion(casos) {
  section('NORMALIZACIÓN — formatos de entrada');
  for (const c of casos) {
    const r = run('validate', c.input);
    const label = `'${c.input}' → '${c.esperado}'`;
    if (r.codigo === c.esperado) {
      ok(label, r.status);
    } else {
      fail(label, `obtenido: '${r.codigo}'`);
    }
  }
}

// ── 8. EDGE CASES ──────────────────────────────────────────────────────

function testEdgeCases(data) {
  section('EDGE CASES');

  // Comma in description
  const c1 = run('lookup', data.coma_en_descripcion.codigo);
  if (c1.descripcion && c1.descripcion.includes(',')) {
    ok('Coma en descripción', c1.descripcion.slice(0, 60));
  } else {
    fail('Coma en descripción', `sin coma: '${(c1.descripcion||'').slice(0,60)}'`);
  }

  // Primer código
  const c2 = run('validate', data.primer_codigo.codigo);
  if (c2.status === 'valid') ok('Primer código del CSV', c2.descripcion);
  else fail('Primer código del CSV', 'no encontrado');

  // Valor máximo UVR
  const c3 = run('lookup', data.valor_maximo_uvr.codigo);
  if (c3.uvr === data.valor_maximo_uvr.uvr_esperado) {
    ok(`UVR máximo: ${c3.uvr}`, c3.descripcion);
  } else {
    fail(`UVR máximo`, `esperado=${data.valor_maximo_uvr.uvr_esperado} actual=${c3.uvr}`);
  }

  // Valor máximo pesos
  const c4 = run('lookup', data.valor_maximo_pesos.codigo);
  if (c4.valor === data.valor_maximo_pesos.valor_esperado) {
    ok(`Valor máximo pesos: $${c4.valor.toLocaleString('es-CO')}`, c4.descripcion);
  } else {
    fail(`Valor máximo pesos`, `esperado=${data.valor_maximo_pesos.valor_esperado} actual=${c4.valor}`);
  }

  // No args → usage
  const c5 = run();
  if (c5.comandos) ok('Sin argumentos → usage JSON');
  else fail('Sin argumentos → usage JSON', 'no retornó comandos');

  // Comando desconocido → error
  const c6 = run('noexiste');
  if (c6.error) ok('Comando desconocido → error', c6.error);
  else fail('Comando desconocido → error', 'sin error');

  // validate sin código → error
  const c7 = run('validate');
  if (c7.error) ok('validate sin código → error', c7.error);
  else fail('validate sin código → error', 'sin error');

  // tarifa sin valor_uvr → error
  const c8 = run('tarifa', '020101');
  if (c8.error) ok('tarifa sin valor_uvr → error', c8.error);
  else fail('tarifa sin valor_uvr → error', 'sin error');
}

// ── MAIN ───────────────────────────────────────────────────────────────

if (!fs.existsSync(CASES)) {
  console.error(`${RED}No se encontró ${CASES}${RESET}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(CASES, 'utf-8'));
const meta = data._meta || {};

console.log(`\n${BOLD}ISS 2001 Lookup — Test Suite${RESET}`);
console.log(`Fuente:   ${meta.fuente || '?'}`);
console.log(`Códigos:  ${meta.total_codigos_unicos || '?'} únicos / ${meta.total_filas || '?'} filas`);

testValidateValidos(data.validate || {});
testValidateInvalidos((data.validate || {}).invalidos || []);
testLookup((data.lookup || {}).casos || []);
testSearch((data.search || {}).casos || []);
testSeccion((data.seccion || {}).casos || []);
testTarifa(data.tarifa || {});
testNormalizacion((data.normalizacion || {}).casos || []);
testEdgeCases(data.edge_cases || {});

const total = passed + failed;
console.log(`\n${BOLD}${'═'.repeat(65)}${RESET}`);
if (failed === 0) {
  console.log(`${BOLD}${GREEN}  ✓ ${passed}/${total} tests pasaron${RESET}`);
} else {
  console.log(`${BOLD}${RED}  ✗ ${failed}/${total} tests fallaron${RESET}`);
  console.log(`${BOLD}${GREEN}  ✓ ${passed}/${total} tests pasaron${RESET}`);
}
console.log(`${'═'.repeat(65)}\n`);

process.exit(failed === 0 ? 0 : 1);
