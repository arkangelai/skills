#!/usr/bin/env node
/**
 * ICD-10-CM FY2026 XML Lookup Tool — Node.js port
 *
 * Zero external dependencies. Requires Node 18+.
 * Drop-in equivalent of icd10-xml-lookup.py — same commands, same JSON output.
 *
 * Source:  CMS / NCHS
 * Release: FY2026 April 1, 2026 Update — public domain
 * Docs:    https://www.cms.gov/medicare/coding-billing/icd-10-codes
 *
 * Usage:
 *   node icd10-lookup.js validate    <code>
 *   node icd10-lookup.js lookup      <code>
 *   node icd10-lookup.js children    <prefix>
 *   node icd10-lookup.js search      <term...>
 *   node icd10-lookup.js combination <code_a> <code_b>
 *
 * All output is JSON to stdout. Add --no-cache to bypass the cache.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const TOOL_DIR    = __dirname;
const DATA_DIR    = path.join(TOOL_DIR, 'data', 'icd10cm');
const TABULAR_XML = path.join(DATA_DIR, 'Table and Index', 'icd10cm_tabular_2026.xml');
const ORDER_TXT   = path.join(DATA_DIR, 'Code Descriptions', 'icd10cm_order_2026.txt');
const CACHE_DIR   = path.join(TOOL_DIR, '.cache');
const ORDER_JSON  = path.join(CACHE_DIR, 'order_index.json');
const TABULAR_JSON = path.join(CACHE_DIR, 'tabular_index.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(code) {
  return code.toUpperCase().replace(/\./g, '').trim();
}

function out(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}

function die(msg) {
  out({ error: msg });
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Order index — built from fixed-width TXT file
// ---------------------------------------------------------------------------

function buildOrderIndex() {
  if (!fs.existsSync(ORDER_TXT)) die(`Order file not found: ${ORDER_TXT}`);

  const lines = fs.readFileSync(ORDER_TXT, 'utf-8').split('\n');
  const index = {};

  for (const line of lines) {
    if (line.length < 17) continue;
    const code     = line.slice(6, 13).trim();
    const billable = line[14] === '1';
    const short    = line.slice(16, 76).trim();
    const long_    = line.slice(77).trim();
    const title    = long_ || short;
    if (code) index[code] = { billable, title, short };
  }

  return index;
}

// ---------------------------------------------------------------------------
// Minimal XML tokenizer — no external dependencies
// Handles the specific structure of icd10cm_tabular_2026.xml
// ---------------------------------------------------------------------------

const ENTITIES = { amp: '&', lt: '<', gt: '>', apos: "'", quot: '"' };

function decodeEntities(str) {
  return str
    .replace(/&([a-zA-Z]+);/g, (_, name) => ENTITIES[name] || `&${name};`)
    .replace(/&#(\d+);/g,  (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/**
 * Tokenize XML into a flat array of {type, tag, text} objects.
 * Skips processing instructions, comments, DOCTYPE, CDATA.
 */
function tokenize(xml) {
  const tokens = [];
  let i = 0;
  const len = xml.length;

  while (i < len) {
    if (xml[i] !== '<') {
      // Text node
      const end = xml.indexOf('<', i);
      const raw = (end === -1 ? xml.slice(i) : xml.slice(i, end)).trim();
      if (raw) tokens.push({ type: 'text', text: decodeEntities(raw) });
      if (end === -1) break;
      i = end;
      continue;
    }

    // Tag starts here
    if (xml[i + 1] === '?') {
      // Processing instruction
      const end = xml.indexOf('?>', i);
      i = end === -1 ? len : end + 2;
    } else if (xml[i + 1] === '!' && xml[i + 2] === '-' && xml[i + 3] === '-') {
      // Comment
      const end = xml.indexOf('-->', i);
      i = end === -1 ? len : end + 3;
    } else if (xml[i + 1] === '!' && xml.slice(i + 2, i + 9) === '[CDATA[') {
      // CDATA
      const end = xml.indexOf(']]>', i);
      const raw = xml.slice(i + 9, end === -1 ? len : end).trim();
      if (raw) tokens.push({ type: 'text', text: raw });
      i = end === -1 ? len : end + 3;
    } else if (xml[i + 1] === '!') {
      // DOCTYPE or other declaration
      const end = xml.indexOf('>', i);
      i = end === -1 ? len : end + 1;
    } else if (xml[i + 1] === '/') {
      // Closing tag
      const end = xml.indexOf('>', i);
      const tag = xml.slice(i + 2, end === -1 ? len : end).trim().split(/\s/)[0];
      tokens.push({ type: 'close', tag });
      i = end === -1 ? len : end + 1;
    } else {
      // Opening (or self-closing) tag
      const end = xml.indexOf('>', i);
      const inner = end === -1 ? xml.slice(i + 1) : xml.slice(i + 1, end);
      const selfClose = inner.endsWith('/');
      const body = selfClose ? inner.slice(0, -1) : inner;
      const tag = body.trim().split(/[\s/]/)[0];
      tokens.push({ type: 'open', tag });
      if (selfClose) tokens.push({ type: 'close', tag });
      i = end === -1 ? len : end + 1;
    }
  }

  return tokens;
}

/**
 * Build a simple tree from a token stream.
 * Each node: { tag, children: [], text: '' }
 */
function buildTree(tokens) {
  const root = { tag: '__root__', children: [], text: '' };
  const stack = [root];

  for (const tok of tokens) {
    const top = stack[stack.length - 1];
    if (tok.type === 'open') {
      const node = { tag: tok.tag, children: [], text: '' };
      top.children.push(node);
      stack.push(node);
    } else if (tok.type === 'close') {
      if (stack.length > 1) stack.pop();
    } else if (tok.type === 'text') {
      top.text += (top.text ? ' ' : '') + tok.text;
    }
  }

  return root;
}

function childText(node, tag) {
  const child = node.children.find(c => c.tag === tag);
  return child ? child.text.trim() : '';
}

function collectNotes(node, tag) {
  const parent = node.children.find(c => c.tag === tag);
  if (!parent) return [];
  return parent.children
    .filter(c => c.tag === 'note' && c.text.trim())
    .map(c => c.text.trim());
}

// ---------------------------------------------------------------------------
// Tabular index — built from XML
// ---------------------------------------------------------------------------

function walkDiag(node, tabular, parent = null) {
  const name = childText(node, 'name');
  if (!name) return;
  const code = normalize(name);
  if (!code) return;

  tabular[code] = {
    code,
    desc:            childText(node, 'desc'),
    parent,
    useAdditional:   collectNotes(node, 'useAdditionalCode'),
    codeFirst:       collectNotes(node, 'codeFirst'),
    codeAlso:        collectNotes(node, 'codeAlso'),
    includes:        collectNotes(node, 'includes'),
    excludes1:       collectNotes(node, 'excludes1'),
    excludes2:       collectNotes(node, 'excludes2'),
  };

  for (const child of node.children.filter(c => c.tag === 'diag')) {
    walkDiag(child, tabular, code);
  }
}

function buildTabularIndex() {
  if (!fs.existsSync(TABULAR_XML)) die(`Tabular XML not found: ${TABULAR_XML}`);

  const xml     = fs.readFileSync(TABULAR_XML, 'utf-8');
  const tokens  = tokenize(xml);
  const root    = buildTree(tokens);
  const tabular = {};

  // root → ICD10CM.tabular → chapter → section → diag (recursive)
  const tabularRoot = root.children.find(c => c.tag === 'ICD10CM.tabular') || root;

  for (const chapter of tabularRoot.children.filter(c => c.tag === 'chapter')) {
    for (const section of chapter.children.filter(c => c.tag === 'section')) {
      for (const diag of section.children.filter(c => c.tag === 'diag')) {
        walkDiag(diag, tabular);
      }
    }
    // A few diags sit directly under chapter
    for (const diag of chapter.children.filter(c => c.tag === 'diag')) {
      walkDiag(diag, tabular);
    }
  }

  return tabular;
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

function loadCached(jsonPath, builder) {
  if (fs.existsSync(jsonPath)) {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  }
  const idx = builder();
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(idx));
  return idx;
}

// ---------------------------------------------------------------------------
// Commands — identical logic to Python version
// ---------------------------------------------------------------------------

function cmdValidate(code, order) {
  code = normalize(code);
  if (!code) return { error: 'Empty code' };

  if (code in order) {
    const entry = order[code];
    if (entry.billable) {
      return { code, status: 'valid', title: entry.title };
    }
    const children = Object.keys(order)
      .filter(c => c.startsWith(code) && c !== code && order[c].billable)
      .sort();
    return {
      code,
      status:     'parent_only',
      title:      entry.title,
      children:   children.slice(0, 15),
      suggestion: children[0] || null,
    };
  }

  const prefix3 = code.slice(0, 3);
  const children = Object.keys(order)
    .filter(c => c.startsWith(prefix3) && order[c].billable)
    .sort();
  return {
    code,
    status:     'invalid',
    parent:     prefix3 in order ? prefix3 : null,
    children:   children.slice(0, 15),
    suggestion: children[0] || null,
  };
}

function inheritedNotes(code, tabular, noteType) {
  const results = [];
  const seen    = new Set();
  let current   = code;

  while (current && !seen.has(current)) {
    seen.add(current);
    const rec = tabular[current];
    if (!rec) break;
    for (const note of rec[noteType] || []) {
      results.push({ from: current, note });
    }
    current = rec.parent;
  }
  return results;
}

function cmdLookup(code, tabular, order) {
  code = normalize(code);
  if (!code) return { error: 'Empty code' };

  const record = tabular[code];
  if (!record) {
    const entry = order[code];
    if (entry) {
      return { code, title: entry.title, billable: entry.billable,
               note: 'Found in order file only — not in tabular XML' };
    }
    return { error: `Code '${code}' not found in ICD-10-CM FY2026` };
  }

  const result = { ...record };

  if (order[code]) {
    result.billable = order[code].billable;
    result.title    = order[code].title;
  } else {
    result.billable = false;
    result.title    = record.desc || '';
  }

  for (const noteType of ['useAdditional', 'codeFirst', 'codeAlso']) {
    const inherited = inheritedNotes(code, tabular, noteType)
      .filter(item => item.from !== code);
    if (inherited.length) result[`${noteType}_inherited`] = inherited;
  }

  return result;
}

function cmdChildren(prefix, order, tabular) {
  prefix = normalize(prefix);
  if (!prefix) return { error: 'Empty prefix' };

  const billable = Object.keys(order)
    .filter(c => c.startsWith(prefix) && c !== prefix && order[c].billable)
    .sort()
    .map(c => ({ code: c, title: order[c].title }));

  let parentTitle = '';
  if (order[prefix])    parentTitle = order[prefix].title;
  else if (tabular[prefix]) parentTitle = tabular[prefix].desc || '';

  return { prefix, parent_title: parentTitle, count: billable.length, children: billable };
}

function cmdSearch(terms, order, maxResults = 20) {
  const query      = terms.join(' ');
  const queryLower = query.toLowerCase();
  const words      = queryLower.split(/\s+/);

  const scored = [];
  for (const [code, entry] of Object.entries(order)) {
    if (!entry.billable) continue;
    const titleLower = entry.title.toLowerCase();
    let score = words.reduce((s, w) => s + (titleLower.includes(w) ? 1 : 0), 0);
    if (score === 0) continue;
    if (titleLower.includes(queryLower)) score += 5;
    scored.push([score, code, entry.title]);
  }

  scored.sort((a, b) => b[0] - a[0] || a[1].localeCompare(b[1]));

  return {
    query,
    total:   scored.length,
    results: scored.slice(0, maxResults).map(([, c, t]) => ({ code: c, title: t })),
  };
}

function cmdCombination(codeA, codeB, tabular, order) {
  codeA = normalize(codeA);
  codeB = normalize(codeB);

  const findings = [];

  function checkNotes(srcCode, noteType, target) {
    const target3 = target.slice(0, 3).toUpperCase();
    for (const item of inheritedNotes(srcCode, tabular, noteType)) {
      const noteUpper = item.note.toUpperCase();
      if (noteUpper.includes(target3) || noteUpper.includes(target)) {
        findings.push({
          type:      noteType,
          at:        item.from,
          note:      item.note,
          inherited: item.from !== srcCode,
        });
      }
    }
  }

  checkNotes(codeA, 'useAdditional', codeB);
  checkNotes(codeB, 'useAdditional', codeA);
  checkNotes(codeA, 'codeFirst',     codeB);
  checkNotes(codeB, 'codeFirst',     codeA);
  checkNotes(codeA, 'codeAlso',      codeB);
  checkNotes(codeB, 'codeAlso',      codeA);

  if (codeB.startsWith(codeA) || codeA.startsWith(codeB)) {
    const moreSpecific = codeB.length >= codeA.length ? codeB : codeA;
    findings.push({
      type:       'subsumption',
      note:       `One code is a child of the other. Use only the more specific: ${moreSpecific}`,
      suggestion: moreSpecific,
    });
  }

  const titleA = order[codeA] ? order[codeA].title : (tabular[codeA] ? tabular[codeA].desc : '');
  const titleB = order[codeB] ? order[codeB].title : (tabular[codeB] ? tabular[codeB].desc : '');

  return { code_a: codeA, title_a: titleA, code_b: codeB, title_b: titleB,
           has_relation: findings.length > 0, findings };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const USAGE = {
  usage:   'node icd10-lookup.js <command> [args] [--no-cache]',
  source:  'CMS ICD-10-CM FY2026, April 1 2026 Update — public domain',
  commands: {
    'validate  <code>':              'Check if code is valid/billable.',
    'lookup    <code>':              'Full record with coding rules and inherited notes.',
    'children  <prefix>':           'All billable codes under a prefix.',
    'search    <term...>':          'Search billable codes by description keywords.',
    'combination <code_a> <code_b>': 'Check pairing relationships between two codes.',
  },
};

function main() {
  const rawArgs = process.argv.slice(2);
  const noCache = rawArgs.includes('--no-cache');
  const args    = rawArgs.filter(a => a !== '--no-cache');

  if (!args.length) { out(USAGE); process.exit(0); }

  const command = args[0].toLowerCase();

  // Load order index (always needed)
  const orderIdx = noCache
    ? buildOrderIndex()
    : loadCached(ORDER_JSON, buildOrderIndex);

  // Load tabular index only when needed
  const needsTabular = ['lookup', 'children', 'combination'].includes(command);
  const tabularIdx = needsTabular
    ? (noCache ? buildTabularIndex() : loadCached(TABULAR_JSON, buildTabularIndex))
    : {};

  switch (command) {
    case 'validate':
      if (args.length < 2) die('validate requires a code argument');
      out(cmdValidate(args[1], orderIdx));
      break;

    case 'lookup':
      if (args.length < 2) die('lookup requires a code argument');
      out(cmdLookup(args[1], tabularIdx, orderIdx));
      break;

    case 'children':
      if (args.length < 2) die('children requires a prefix argument');
      out(cmdChildren(args[1], orderIdx, tabularIdx));
      break;

    case 'search':
      if (args.length < 2) die('search requires at least one search term');
      out(cmdSearch(args.slice(1), orderIdx));
      break;

    case 'combination':
      if (args.length < 3) die('combination requires two code arguments');
      out(cmdCombination(args[1], args[2], tabularIdx, orderIdx));
      break;

    default:
      die(`Unknown command '${command}'. Run with no arguments to see usage.`);
  }
}

main();
