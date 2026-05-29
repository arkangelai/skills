// Read-only: cruza cada variable de encuesta con prediction_label para el grupo
// BIOS (issue #82). Muestra, por categoría, ACTIVO vs RETIRADO (predichos) y la
// tasa de retiro predicha. N pequeño => orientativo.
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
    const i = line.indexOf("=");
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}
const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const project = env.COMFAMA_PROJECT_NAME || "comfama-employee-retention";
const BIOS = new Set(["CONTEGRAL", "ALIMENTOS FINCA", "SERVICIOS GRUPO BIOS", "COMERCIAL + BIOS"]);
const norm = (s) => (s ?? "").normalize("NFD").replace(/\p{Mn}/gu, "").trim().replace(/[.\s]+$/, "").toUpperCase();
const readMeta = (m, k) => { if (!Array.isArray(m)) return null; const e = m.find((x) => x?.variable === k); return e?.value == null ? null : e.value; };
const isTest = (uid) => (uid ?? "").trim().toLowerCase().endsWith("@arkangel.ai");

const u = new URL(`${url}/rest/v1/predictions`);
u.searchParams.set("select", "user_id,prediction_label,prediction_metadata");
u.searchParams.set("project_name", `eq.${project}`);
u.searchParams.set("limit", "5000");
const rows = await (await fetch(u, { headers: { apikey: key, Authorization: `Bearer ${key}` } })).json();
const bios = rows.filter((r) => BIOS.has(norm(readMeta(r.prediction_metadata, "company_name"))) && !isTest(r.user_id));

const total = bios.length;
const totRet = bios.filter((r) => r.prediction_label === "RETIRADO").length;
console.log(`BIOS N=${total} · RETIRADO predicho=${totRet} (${((totRet / total) * 100).toFixed(1)}%)\n`);

function crosstab(key, transform = (x) => String(x)) {
  const m = new Map();
  for (const r of bios) {
    let v = readMeta(r.prediction_metadata, key);
    v = v === null ? "(sin dato)" : transform(v);
    if (!m.has(v)) m.set(v, { total: 0, ret: 0 });
    const b = m.get(v); b.total++;
    if (r.prediction_label === "RETIRADO") b.ret++;
  }
  return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
}
function show(title, key, transform) {
  console.log(`\n${title}:`);
  for (const [cat, b] of crosstab(key, transform)) {
    const pctRet = ((b.ret / b.total) * 100).toFixed(0);
    console.log(`  ${String(b.total).padStart(2)} tot · ${b.ret} ret (${pctRet}%)  ${cat}`);
  }
}
show("Tipo de examen", "tipo_examen");
show("Arquetipo", "archetype");
show("Plan 5 años", "plan_5_futuro");
show("Endeudamiento", "endeudamiento");
show("Estudios futuros", "estudios_futuros");
show("Educación relevante", "educacion_relevante");
show("Inversiones 5 años", "inversiones_5_futuro");
show("Cansancio emocional", "cansancio_emocional");
show("Fatiga física", "fatiga_fisica");
show("Empresa", "company_name");

// Perfil de los 2 RETIRADO predichos
console.log("\n=== Perfil de los RETIRADO predichos ===");
for (const r of bios.filter((x) => x.prediction_label === "RETIRADO")) {
  const g = (k) => readMeta(r.prediction_metadata, k);
  console.log(`  empresa=${g("company_name")} | arquetipo=${g("archetype")} | tipo=${g("tipo_examen")} | retention_pct=${g("retention_pct")} | ml_zone=${g("ml_zone")} | edad=${g("Edad_calculada")} | plan=${g("plan_5_futuro")} | endeud=${g("endeudamiento")}`);
}
