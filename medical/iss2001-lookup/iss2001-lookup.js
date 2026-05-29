#!/usr/bin/env node
/**
 * ISS 2001 Lookup Tool
 *
 * Fuente: Manual Tarifario ISS 2001 — Acuerdo 256 de 2001,
 *         Instituto de Seguros Sociales. Datos de dominio público.
 *
 * Cero dependencias externas. Requiere Node 18+.
 *
 * Uso:
 *   node iss2001-lookup.js validate  <codigo>
 *   node iss2001-lookup.js lookup    <codigo>
 *   node iss2001-lookup.js search    <termino...>
 *   node iss2001-lookup.js seccion   <prefijo>
 *   node iss2001-lookup.js tarifa    <codigo> <valor_uvr>
 *
 * Toda la salida es JSON a stdout.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const TOOL_DIR  = __dirname;
const CSV_PATH  = path.join(TOOL_DIR, 'data', 'ISS_2001.csv');

// ---------------------------------------------------------------------------
// Normalización
// ---------------------------------------------------------------------------

/**
 * Normaliza un código ISS a formato canónico de 6 caracteres (mayúsculas).
 * Acepta: "190201", "19.02.01", "19-02-01", " 190201 ", "c40685"
 */
function normalize(code) {
  code = code.trim();
  code = code.replace(/[.\-]/g, '');
  code = code.toUpperCase();
  return code;
}

// ---------------------------------------------------------------------------
// Carga del índice
// ---------------------------------------------------------------------------

let _index = null;

function loadIndex() {
  if (_index) return _index;
  if (!fs.existsSync(CSV_PATH)) die(`Archivo de datos no encontrado: ${CSV_PATH}`);

  const raw   = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = raw.split('\n');
  const index = {};
  let isFirst = true;

  for (const line of lines) {
    if (isFirst) { isFirst = false; continue; } // saltar header
    const trimmed = line.trim();
    if (!trimmed) continue;

    const fields = parseCSVLine(trimmed);
    if (fields.length < 6) continue;

    const codigo      = fields[0].trim();
    const descripcion = fields[1].trim();
    const uvr         = fields[2].trim();
    const valor       = fields[3].trim();
    const capitulo    = fields[4].trim();
    const ref         = fields[5].trim();

    if (codigo && !(codigo in index)) {
      index[codigo] = { descripcion, uvr, valor, capitulo, ref };
    }
  }

  _index = index;
  return index;
}

/**
 * Parse a single CSV line, handling quoted fields with commas inside.
 */
function parseCSVLine(line) {
  const fields = [];
  let i = 0;

  while (i < line.length) {
    if (line[i] === '"') {
      // Quoted field
      i++; // skip opening quote
      let value = '';
      while (i < line.length) {
        if (line[i] === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            // Escaped quote
            value += '"';
            i += 2;
          } else {
            // End of quoted field
            i++; // skip closing quote
            break;
          }
        } else {
          value += line[i];
          i++;
        }
      }
      fields.push(value);
      // Skip comma after field
      if (i < line.length && line[i] === ',') i++;
    } else {
      // Unquoted field
      const comma = line.indexOf(',', i);
      if (comma === -1) {
        fields.push(line.slice(i));
        break;
      } else {
        fields.push(line.slice(i, comma));
        i = comma + 1;
      }
    }
  }

  return fields;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripAccents(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function out(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}

function die(msg) {
  out({ error: msg });
  process.exit(1);
}

/**
 * Determina el tipo de registro según los campos uvr/valor.
 */
function tipo(entry) {
  if (entry.uvr)   return 'UVR';
  if (entry.valor)  return 'VALOR';
  return 'APENDICE';
}

// ---------------------------------------------------------------------------
// Comandos
// ---------------------------------------------------------------------------

/**
 * validate <codigo>
 * Verifica si el código existe en el Manual ISS 2001.
 * Si no existe, sugiere códigos cercanos por prefijo progresivo (4, 3, 2 chars).
 */
function cmdValidate(raw, index) {
  const code = normalize(raw);
  if (!code) return { error: 'Código vacío' };

  if (code in index) {
    const entry = index[code];
    return {
      codigo:      code,
      status:      'valid',
      descripcion: entry.descripcion,
      tipo:        tipo(entry),
    };
  }

  // Buscar sugerencias por prefijo progresivo: 4 chars, 3, 2
  let sugerencias = [];
  for (let len = 4; len >= 2; len--) {
    const prefix = code.slice(0, len);
    if (!prefix) continue;
    const candidates = Object.keys(index)
      .filter(c => c.startsWith(prefix))
      .sort()
      .slice(0, 10);
    if (candidates.length) {
      sugerencias = candidates.map(c => ({
        codigo:      c,
        descripcion: index[c].descripcion,
      }));
      break;
    }
  }

  return { codigo: code, status: 'invalid', sugerencias };
}

/**
 * lookup <codigo>
 * Registro completo: descripción, UVR/valor, capítulo, ref y fuente.
 */
function cmdLookup(raw, index) {
  const code = normalize(raw);
  if (!code) return { error: 'Código vacío' };

  if (!(code in index)) {
    return { error: `Código '${code}' no encontrado en el Manual ISS 2001` };
  }

  const entry = index[code];

  return {
    codigo:      code,
    descripcion: entry.descripcion,
    uvr:         entry.uvr  ? Number(entry.uvr)  : null,
    valor:       entry.valor ? Number(entry.valor) : null,
    capitulo:    entry.capitulo,
    ref:         entry.ref,
    tipo:        tipo(entry),
    fuente:      'Manual Tarifario ISS 2001 — Acuerdo 256 de 2001, ISS',
  };
}

/**
 * search <termino...>
 * Busca códigos por palabras clave en la descripción.
 * Puntaje por densidad de keywords. Coincidencia exacta de frase +5.
 */
function cmdSearch(terms, index, maxResults = 20) {
  const query = terms.join(' ');
  const words = stripAccents(query.toUpperCase()).split(/\s+/);

  const scored = [];
  for (const [code, entry] of Object.entries(index)) {
    const descNorm = stripAccents(entry.descripcion.toUpperCase());
    let score = words.reduce((s, w) => s + (descNorm.includes(w) ? 1 : 0), 0);
    if (!score) continue;
    if (descNorm.includes(stripAccents(query.toUpperCase()))) score += 5;
    scored.push([score, code, entry]);
  }

  scored.sort((a, b) => b[0] - a[0] || a[1].localeCompare(b[1]));

  return {
    consulta:   query,
    total:      scored.length,
    resultados: scored.slice(0, maxResults).map(([, c, e]) => ({
      codigo:      c,
      descripcion: e.descripcion,
      uvr:         e.uvr  ? Number(e.uvr)  : null,
      valor:       e.valor ? Number(e.valor) : null,
      capitulo:    e.capitulo,
    })),
  };
}

/**
 * seccion <prefijo>
 * Lista todos los códigos cuyo codigo empieza con el prefijo dado.
 */
function cmdSeccion(prefix, index) {
  prefix = normalize(prefix);
  if (!prefix) return { error: 'Prefijo vacío' };

  const matches = Object.keys(index)
    .filter(c => c.startsWith(prefix))
    .sort()
    .map(c => ({
      codigo:      c,
      descripcion: index[c].descripcion,
      uvr:         index[c].uvr  ? Number(index[c].uvr)  : null,
      valor:       index[c].valor ? Number(index[c].valor) : null,
    }));

  return { prefijo: prefix, total: matches.length, codigos: matches };
}

/**
 * tarifa <codigo> <valor_uvr>
 * Calcula la tarifa en pesos: UVR x valor_uvr.
 * Si el código es tipo VALOR (ya en pesos), retorna el valor con nota.
 * Si el código es APENDICE, retorna error.
 */
function cmdTarifa(raw, valorUvrStr, index) {
  const code = normalize(raw);
  if (!code) return { error: 'Código vacío' };

  if (!(code in index)) {
    return { error: `Código '${code}' no encontrado en el Manual ISS 2001` };
  }

  const entry    = index[code];
  const tipoCode = tipo(entry);

  if (tipoCode === 'VALOR') {
    return {
      codigo:      code,
      descripcion: entry.descripcion,
      valor:       Number(entry.valor),
      capitulo:    entry.capitulo,
      nota:        'Este código ya tiene tarifa directa en pesos (sección VALOR). No requiere conversión UVR.',
    };
  }

  if (tipoCode === 'APENDICE') {
    return {
      error: `El código '${code}' es de tipo APENDICE (sin UVR ni valor en pesos). No se puede calcular tarifa.`,
    };
  }

  // UVR type — calculate
  const valorUvr = parseFloat(valorUvrStr);
  if (isNaN(valorUvr) || valorUvr <= 0) {
    return { error: 'El valor_uvr debe ser un número positivo.' };
  }

  const uvr         = Number(entry.uvr);
  const tarifaPesos = uvr * valorUvr;

  return {
    codigo:             code,
    descripcion:        entry.descripcion,
    uvr:                uvr,
    valor_uvr_unitario: valorUvr,
    tarifa_pesos:       tarifaPesos,
    capitulo:           entry.capitulo,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const USAGE = {
  uso:    'node iss2001-lookup.js <comando> [argumentos]',
  fuente: 'Manual Tarifario ISS 2001 — Acuerdo 256 de 2001, Instituto de Seguros Sociales',
  comandos: {
    'validate <codigo>':           'Verifica si el código existe en el Manual ISS 2001.',
    'lookup <codigo>':             'Registro completo: descripción, UVR/valor, capítulo y sección.',
    'search <termino...>':         'Busca códigos por palabras clave en la descripción.',
    'seccion <prefijo>':           'Lista todos los códigos bajo un prefijo.',
    'tarifa <codigo> <valor_uvr>': 'Calcula la tarifa en pesos: UVR × valor_uvr.',
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

    case 'tarifa':
      if (args.length < 3) die('tarifa requiere un código y un valor_uvr');
      out(cmdTarifa(args[1], args[2], index));
      break;

    default:
      die(`Comando desconocido '${command}'. Ejecutar sin argumentos para ver el uso.`);
  }
}

main();
