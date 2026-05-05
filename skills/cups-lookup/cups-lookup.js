#!/usr/bin/env node
/**
 * CUPS 2026 Lookup Tool
 *
 * Fuente: Resolución 2706 del 23 dic 2025 — Ministerio de Salud y Protección Social
 *         Vigente desde el 1 de enero de 2026. Datos de dominio público.
 *
 * Cero dependencias externas. Requiere Node 18+.
 *
 * Uso:
 *   node cups-lookup.js validate  <codigo>
 *   node cups-lookup.js lookup    <codigo>
 *   node cups-lookup.js search    <termino...>
 *   node cups-lookup.js seccion   <prefijo>
 *
 * Toda la salida es JSON a stdout.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const TOOL_DIR = __dirname;
const CSV_PATH = path.join(TOOL_DIR, 'data', 'CUPS_2026.csv');

// ---------------------------------------------------------------------------
// Normalización
// ---------------------------------------------------------------------------

/**
 * Normaliza un código CUPS a formato XX.X.X.XX
 * Acepta: "90.1.0.01", "010101" (6 dígitos compactos), "  87.0.0.01  "
 */
function normalize(code) {
  code = code.trim();
  // 6 dígitos compactos → XX.X.X.XX
  if (/^\d{6}$/.test(code)) {
    return `${code.slice(0, 2)}.${code[2]}.${code[3]}.${code.slice(4, 6)}`;
  }
  // Normalizar separadores (punto o espacio)
  const parts = code.split(/[.\s]+/);
  if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
    return `${parts[0].padStart(2,'0')}.${parts[1]}.${parts[2]}.${parts[3].padStart(2,'0')}`;
  }
  return code;
}

// ---------------------------------------------------------------------------
// Carga del índice
// ---------------------------------------------------------------------------

let _index = null;

function loadIndex() {
  if (_index) return _index;
  if (!fs.existsSync(CSV_PATH)) die(`Archivo de datos no encontrado: ${CSV_PATH}`);

  const lines = fs.readFileSync(CSV_PATH, 'utf-8').split('\n');
  const index = {};
  let isFirst = true;

  for (const line of lines) {
    if (isFirst) { isFirst = false; continue; } // saltar header
    const trimmed = line.trim();
    if (!trimmed) continue;

    // CSV: codigo,"descripcion" o codigo,descripcion
    const comma = trimmed.indexOf(',');
    if (comma === -1) continue;

    const codigo = trimmed.slice(0, comma).trim();
    let descripcion = trimmed.slice(comma + 1).trim();
    // Quitar comillas si las tiene
    if (descripcion.startsWith('"') && descripcion.endsWith('"')) {
      descripcion = descripcion.slice(1, -1).replace(/""/g, '"');
    }
    if (codigo) index[codigo] = descripcion;
  }

  _index = index;
  return index;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function out(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}

function die(msg) {
  out({ error: msg });
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Comandos
// ---------------------------------------------------------------------------

/**
 * validate <codigo>
 * Verifica si el código existe en CUPS 2026.
 * Si no existe, sugiere códigos cercanos por prefijo.
 */
function cmdValidate(raw, index) {
  const code = normalize(raw);
  if (!code) return { error: 'Código vacío' };

  if (code in index) {
    return { codigo: code, status: 'valid', descripcion: index[code] };
  }

  // Buscar sugerencias por prefijo progresivo
  const parts = code.split('.');
  let sugerencias = [];
  for (let len = 3; len >= 1; len--) {
    const prefix = parts.slice(0, len).join('.');
    if (!prefix) continue;
    const candidates = Object.keys(index)
      .filter(c => c.startsWith(prefix + '.') || c === prefix)
      .sort()
      .slice(0, 10);
    if (candidates.length) {
      sugerencias = candidates.map(c => ({ codigo: c, descripcion: index[c] }));
      break;
    }
  }

  return { codigo: code, status: 'invalid', sugerencias };
}

/**
 * lookup <codigo>
 * Registro completo: descripción, grupo y categoría.
 */
function cmdLookup(raw, index) {
  const code = normalize(raw);
  if (!code) return { error: 'Código vacío' };

  if (!(code in index)) {
    return { error: `Código '${code}' no encontrado en CUPS 2026` };
  }

  const parts    = code.split('.');
  const grupo    = parts[0] || '';
  const categoria = parts.slice(0, 3).join('.');

  return {
    codigo:      code,
    descripcion: index[code],
    grupo,
    categoria,
    fuente:      'CUPS 2026 — Resolución 2706 del 23 dic 2025',
  };
}

/**
 * search <termino...>
 * Busca códigos por palabras clave en la descripción.
 */
function cmdSearch(terms, index, maxResults = 20) {
  const query = terms.join(' ');
  const words = query.toUpperCase().split(/\s+/);

  const scored = [];
  for (const [code, desc] of Object.entries(index)) {
    const descUpper = desc.toUpperCase();
    let score = words.reduce((s, w) => s + (descUpper.includes(w) ? 1 : 0), 0);
    if (!score) continue;
    if (descUpper.includes(query.toUpperCase())) score += 5;
    scored.push([score, code, desc]);
  }

  scored.sort((a, b) => b[0] - a[0] || a[1].localeCompare(b[1]));

  return {
    consulta:   query,
    total:      scored.length,
    resultados: scored.slice(0, maxResults).map(([, c, d]) => ({ codigo: c, descripcion: d })),
  };
}

/**
 * seccion <prefijo>
 * Lista todos los códigos bajo un prefijo (grupo, subgrupo o categoría).
 */
function cmdSeccion(prefix, index) {
  prefix = prefix.trim().replace(/\.$/, '');
  if (!prefix) return { error: 'Prefijo vacío' };

  const matches = Object.keys(index)
    .filter(c => c.startsWith(prefix + '.') || c === prefix)
    .sort()
    .map(c => ({ codigo: c, descripcion: index[c] }));

  return { prefijo: prefix, total: matches.length, codigos: matches };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const USAGE = {
  uso:    'node cups-lookup.js <comando> [argumentos]',
  fuente: 'CUPS 2026 — Resolución 2706 del 23 dic 2025 (MinSalud Colombia)',
  comandos: {
    'validate <codigo>':    'Verifica si el código existe en CUPS 2026. Sugiere alternativas si no existe.',
    'lookup   <codigo>':    'Registro completo: descripción, grupo y categoría.',
    'search   <termino...>':'Busca códigos por palabras clave en la descripción.',
    'seccion  <prefijo>':   'Lista todos los códigos bajo un prefijo (ej: 01, 15.0, 90.3).',
  },
};

function main() {
  const args = process.argv.slice(2);
  if (!args.length) { out(USAGE); process.exit(0); }

  const command = args[0].toLowerCase();
  const index   = loadIndex();

  switch (command) {
    case 'validate':
      if (args.length < 2) die('validate requiere un código');
      out(cmdValidate(args[1], index));
      break;

    case 'lookup':
      if (args.length < 2) die('lookup requiere un código');
      out(cmdLookup(args[1], index));
      break;

    case 'search':
      if (args.length < 2) die('search requiere al menos un término');
      out(cmdSearch(args.slice(1), index));
      break;

    case 'seccion':
      if (args.length < 2) die('seccion requiere un prefijo');
      out(cmdSeccion(args[1], index));
      break;

    default:
      die(`Comando desconocido '${command}'. Ejecutar sin argumentos para ver el uso.`);
  }
}

main();
