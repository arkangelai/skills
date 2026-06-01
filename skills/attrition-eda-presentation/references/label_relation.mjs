// Read-only: cruza cada variable de encuesta con prediction_label para el grupo
// objetivo. Muestra, por categoría, ACTIVO vs RETIRADO (predichos) y la tasa de
// retiro predicha. N pequeño => orientativo.
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
const norm = (s) => (s ?? "").normalize("NFD").replace(/\p{Mn}/gu, "").trim().replace(/[.\s]+$/, "").toUpperCase();
const readMeta = (m, k) => { if (!Array.isArray(m)) return null; const e = m.find((x) => x?.variable === k); return e?.value == null ? null : e.value; };
const isTest = (uid) => (uid ?? "").trim().toLowerCase().endsWith("@arkangel.ai");
// Solo predicciones exitosas: las filas de fallback (status=0, label="PENDIENTE")
// no tienen resultado del modelo y, contadas como "no retiro", subestiman la tasa.
const VALID = new Set(["ACTIVO", "RETIRADO"]);

// Grupo objetivo. Repo PÚBLICO: NO hardcodear nombres ni NITs reales de clientes.
// Configúralos por entorno (separados por coma) o edita estos placeholders en tu copia local:
//   GROUP_NAMES="EMPRESA UNO,EMPRESA DOS"  GROUP_NITS="123456789-0,987654321-0"
const GROUP_NAMES = new Set((process.env.GROUP_NAMES || "EMPRESA EJEMPLO").split(",").map((s) => norm(s)).filter(Boolean));
const GROUP_NITS = new Set((process.env.GROUP_NITS || "").split(",").map((s) => s.trim()).filter(Boolean));
// Match por NIT primero (autoritativo), luego por nombre normalizado.
const inGroup = (r) => {
  const nit = String(readMeta(r.prediction_metadata, "nit_empresa") ?? "").trim();
  if (nit && GROUP_NITS.has(nit)) return true;
  return GROUP_NAMES.has(norm(readMeta(r.prediction_metadata, "company_name")));
};

// Pagina hasta agotar la tabla (el proyecto puede superar las 5000 filas).
async function fetchAll(select) {
  const acc = []; const pageSize = 1000;
  for (let page = 0; ; page++) {
    const u = new URL(`${url}/rest/v1/predictions`);
    u.searchParams.set("select", select);
    u.searchParams.set("project_name", `eq.${project}`);
    u.searchParams.set("order", "created_at.asc");
    u.searchParams.set("limit", String(pageSize));
    u.searchParams.set("offset", String(page * pageSize));
    const resp = await fetch(u, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!resp.ok) { console.error("query failed", resp.status, await resp.text()); process.exit(1); }
    const batch = await resp.json();
    acc.push(...batch);
    if (batch.length < pageSize) break;
  }
  return acc;
}
const rows = await fetchAll("user_id,prediction_label,prediction_metadata");
const group = rows.filter((r) => inGroup(r) && !isTest(r.user_id) && VALID.has(r.prediction_label));

const total = group.length;
const totRet = group.filter((r) => r.prediction_label === "RETIRADO").length;
console.log(`Grupo N=${total} · RETIRADO predicho=${totRet} (${((totRet / total) * 100).toFixed(1)}%)\n`);

function crosstab(key, transform = (x) => String(x)) {
  const m = new Map();
  for (const r of group) {
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

// Perfil de los casos RETIRADO predichos
console.log("\n=== Perfil de los RETIRADO predichos ===");
for (const r of group.filter((x) => x.prediction_label === "RETIRADO")) {
  const g = (k) => readMeta(r.prediction_metadata, k);
  console.log(`  empresa=${g("company_name")} | arquetipo=${g("archetype")} | tipo=${g("tipo_examen")} | retention_pct=${g("retention_pct")} | ml_zone=${g("ml_zone")} | edad=${g("Edad_calculada")} | plan=${g("plan_5_futuro")} | endeud=${g("endeudamiento")}`);
}
