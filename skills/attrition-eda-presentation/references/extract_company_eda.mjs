// Read-only: agregados completos para el entregable BIOS (paridad con ARQ).
// Imprime JSON con: arquetipo×label, perfil por arquetipo, variables numéricas
// (media/mediana/cuartiles/rango + split activo/retiro predicho + buckets) y
// correlaciones. N pequeño => orientativo.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
function loadEnv() {
  const env = {};
  for (let line of readFileSync(resolve(repoRoot, ".env.local"), "utf-8").split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("="); env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}
const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const project = env.COMFAMA_PROJECT_NAME || "comfama-employee-retention";
const BIOS = new Set(["CONTEGRAL", "ALIMENTOS FINCA", "SERVICIOS GRUPO BIOS", "COMERCIAL + BIOS"]);
// Solo predicciones exitosas: las filas de fallback (status=0, label="PENDIENTE")
// no tienen resultado del modelo y, si entraran, inflarían el denominador "activo".
const VALID = new Set(["ACTIVO", "RETIRADO"]);
const norm = (s) => (s ?? "").normalize("NFD").replace(/\p{Mn}/gu, "").trim().replace(/[.\s]+$/, "").toUpperCase();
const readMeta = (m, k) => { if (!Array.isArray(m)) return null; const e = m.find((x) => x?.variable === k); return e?.value == null ? null : e.value; };
const isTest = (uid) => (uid ?? "").trim().toLowerCase().endsWith("@arkangel.ai");
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const leadInt = (v) => { const m = String(v ?? "").match(/^\s*(\d+)/); return m ? Number(m[1]) : null; };

async function fetchAllPredictions() {
  const acc = [];
  const pageSize = 1000;
  for (let page = 0; ; page++) {
    const u = new URL(`${url}/rest/v1/predictions`);
    u.searchParams.set("select", "user_id,prediction_label,prediction_metadata");
    u.searchParams.set("project_name", `eq.${project}`);
    u.searchParams.set("order", "created_at.asc");
    u.searchParams.set("limit", String(pageSize));
    u.searchParams.set("offset", String(page * pageSize));
    const resp = await fetch(u, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!resp.ok) { console.error("query failed", resp.status, await resp.text()); process.exit(1); }
    const batch = await resp.json();
    acc.push(...batch);
    if (batch.length < pageSize) break; // ultima pagina
  }
  return acc;
}
const rows = (await fetchAllPredictions())
  .filter((r) => BIOS.has(norm(readMeta(r.prediction_metadata, "company_name"))) && !isTest(r.user_id) && VALID.has(r.prediction_label));

const CUTOFF = process.env.CUTOFF || new Date().toISOString().slice(0, 10); // fecha de reporte (default: hoy)
const ageFromDob = (dob) => { if (!dob) return null; const t = new Date(dob); if (isNaN(t)) return null; const now = new Date(CUTOFF); let a = now.getFullYear() - t.getFullYear(); if (now.getMonth() < t.getMonth() || (now.getMonth() === t.getMonth() && now.getDate() < t.getDate())) a--; return a >= 0 && a < 130 ? a : null; };
const get = (r, k) => readMeta(r.prediction_metadata, k);
const isRet = (r) => r.prediction_label === "RETIRADO";

// derive a numeric value per row for each variable
const VARS = {
  "Edad": (r) => num(get(r, "Edad_calculada")) ?? ageFromDob(get(r, "fecha_nacimiento")),
  "Experiencia (años)": (r) => num(get(r, "experiencia_anios")),
  "Antigüedad (meses)": (r) => num(get(r, "antiguedad_meses")) ?? (num(get(r, "Antiguedad_dias")) != null ? num(get(r, "Antiguedad_dias")) / 30 : null),
  "Distancia (km)": (r) => num(get(r, "distancia_km")) ?? num(get(r, "Distancia_al_lugar_de_trabajo")),
  "Salario ofrecido": (r) => num(get(r, "salario_ofrecido")),
  "Expectativa salarial": (r) => num(get(r, "expectativa_salarial")),
  "Retención predicha (%)": (r) => num(get(r, "retention_pct")),
};
function pctile(sorted, p) { if (!sorted.length) return null; const i = (sorted.length - 1) * p; const lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo); }
function stats(vals) { const s = vals.filter((v) => v != null).sort((a, b) => a - b); if (!s.length) return null; const sum = s.reduce((a, b) => a + b, 0); return { n: s.length, mean: sum / s.length, median: pctile(s, 0.5), q1: pctile(s, 0.25), q3: pctile(s, 0.75), min: s[0], max: s[s.length - 1] }; }

const out = {};
out.archetypeLabel = {};
for (const r of rows) { const a = get(r, "archetype") ?? "?"; (out.archetypeLabel[a] ??= { total: 0, ret: 0 }); out.archetypeLabel[a].total++; if (isRet(r)) out.archetypeLabel[a].ret++; }

out.archetypeProfile = {};
const profDims = { experiencia: (r) => num(get(r, "experiencia_anios")), edad: VARS["Edad"], distancia: VARS["Distancia (km)"], educacion: (r) => leadInt(get(r, "educacion_relevante")), endeudamiento: (r) => leadInt(get(r, "endeudamiento")), antiguedad_m: VARS["Antigüedad (meses)"] };
for (const r of rows) { const a = get(r, "archetype") ?? "?"; (out.archetypeProfile[a] ??= { n: 0, _acc: {} }); const p = out.archetypeProfile[a]; p.n++; for (const [d, fn] of Object.entries(profDims)) { const v = fn(r); if (v != null) { (p._acc[d] ??= []).push(v); } } }
for (const a of Object.keys(out.archetypeProfile)) { const p = out.archetypeProfile[a]; p.means = {}; for (const [d, arr] of Object.entries(p._acc)) p.means[d] = +(arr.reduce((x, y) => x + y, 0) / arr.length).toFixed(2); delete p._acc; }

const BUCKETS = {
  "Edad": [["18–24", 18, 24], ["25–34", 25, 34], ["35–44", 35, 44], ["45–54", 45, 54], ["55+", 55, 200]],
  "Experiencia (años)": [["0", 0, 0.99], ["1–2", 1, 2.99], ["3–5", 3, 5.99], ["6–10", 6, 10.99], ["10+", 11, 999]],
  "Antigüedad (meses)": [["Nuevo (0)", 0, 0.99], ["1–6", 1, 6], ["6–12", 6.01, 12], ["12–60", 12.01, 60], ["60+", 60.01, 9999]],
  "Distancia (km)": [["0–5", 0, 5], ["5–10", 5.01, 10], ["10–20", 10.01, 20], ["20–30", 20.01, 30], ["30+", 30.01, 999]],
  "Salario ofrecido": [["<1M", 0, 999999], ["1–1.5M", 1e6, 1.5e6], ["1.5–2M", 1.5e6 + 1, 2e6], ["2–3M", 2e6 + 1, 3e6], ["3M+", 3e6 + 1, 9e9]],
  "Expectativa salarial": [["<1M", 0, 999999], ["1–1.5M", 1e6, 1.5e6], ["1.5–2M", 1.5e6 + 1, 2e6], ["2–3M", 2e6 + 1, 3e6], ["3M+", 3e6 + 1, 9e9]],
  "Retención predicha (%)": [["70–79", 0, 79], ["80–84", 80, 84], ["85–89", 85, 89], ["90–94", 90, 94], ["95–100", 95, 100]],
};
out.numeric = {};
for (const [name, fn] of Object.entries(VARS)) {
  const all = rows.map(fn);
  const act = rows.filter((r) => !isRet(r)).map(fn);
  const ret = rows.filter(isRet).map(fn);
  const buckets = (BUCKETS[name] || []).map(([label, lo, hi]) => {
    const c = all.filter((v) => v != null && v >= lo && v <= hi).length;
    return { label, count: c, pct: +((c / all.filter((v) => v != null).length) * 100).toFixed(1) };
  });
  out.numeric[name] = { all: stats(all), activo: stats(act), retiro: stats(ret), buckets };
}

// correlaciones (Pearson) entre numéricas clave
const corrVars = ["Edad", "Experiencia (años)", "Antigüedad (meses)", "Distancia (km)", "Salario ofrecido", "Expectativa salarial"];
function pearson(xs, ys) { const pairs = xs.map((x, i) => [x, ys[i]]).filter(([a, b]) => a != null && b != null); const n = pairs.length; if (n < 3) return null; const mx = pairs.reduce((s, p) => s + p[0], 0) / n, my = pairs.reduce((s, p) => s + p[1], 0) / n; let num = 0, dx = 0, dy = 0; for (const [a, b] of pairs) { num += (a - mx) * (b - my); dx += (a - mx) ** 2; dy += (b - my) ** 2; } return dx && dy ? +(num / Math.sqrt(dx * dy)).toFixed(2) : null; }
out.correlations = [];
const colData = Object.fromEntries(corrVars.map((v) => [v, rows.map(VARS[v])]));
for (let i = 0; i < corrVars.length; i++) for (let j = i + 1; j < corrVars.length; j++) { const c = pearson(colData[corrVars[i]], colData[corrVars[j]]); if (c != null) out.correlations.push({ var1: corrVars[i], var2: corrVars[j], corr: c }); }

// Composición del grupo: activos vs. en riesgo (RETIRADO) predichos, por empresa.
// Incluye cada miembro del GROUP aunque tenga 0 filas (los aliases sin datos se
// reportan como 0, no se omiten) — requisito de la sección Composición.
out.composition = {};
for (const r of rows) {
  const name = String(get(r, "company_name") ?? "(sin empresa)");
  (out.composition[name] ??= { total: 0, retiro: 0, activo: 0 });
  const c = out.composition[name]; c.total++; if (isRet(r)) c.retiro++; else c.activo++;
}
for (const g of BIOS) if (!Object.keys(out.composition).some((n) => norm(n) === g)) out.composition[g] = { total: 0, retiro: 0, activo: 0 };

// Variables categóricas: distribución + tasa de retiro predicho por categoría.
const CATEGORICAL = ["tipo_examen", "archetype", "plan_5_futuro", "endeudamiento", "estudios_futuros", "educacion_relevante", "inversiones_5_futuro", "cansancio_emocional", "fatiga_fisica", "company_name"];
out.categorical = {};
for (const key of CATEGORICAL) {
  const m = new Map();
  for (const r of rows) {
    const raw = get(r, key);
    const v = raw === null || raw === undefined ? "(sin dato)" : String(raw);
    if (!m.has(v)) m.set(v, { total: 0, retiro: 0 });
    const b = m.get(v); b.total++; if (isRet(r)) b.retiro++;
  }
  out.categorical[key] = [...m.entries()].sort((a, b) => b[1].total - a[1].total)
    .map(([value, b]) => ({ value, total: b.total, retiro: b.retiro, retiroPct: +((b.retiro / b.total) * 100).toFixed(1) }));
}

// Perfil de los casos predichos RETIRADO (sin identificadores; alimenta la sección de riesgo).
out.retiredProfile = rows.filter(isRet).map((r) => ({
  empresa: get(r, "company_name"), arquetipo: get(r, "archetype"), tipo_examen: get(r, "tipo_examen"),
  retention_pct: get(r, "retention_pct"), ml_zone: get(r, "ml_zone"), edad: VARS["Edad"](r),
  distancia_km: VARS["Distancia (km)"](r), antiguedad_meses: VARS["Antigüedad (meses)"](r),
  plan_5_futuro: get(r, "plan_5_futuro"), endeudamiento: get(r, "endeudamiento"),
}));

console.log(JSON.stringify(out, null, 1));
