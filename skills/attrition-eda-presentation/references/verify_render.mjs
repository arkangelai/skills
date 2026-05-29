// Verifica que el HTML final RENDERICE de verdad (no solo que el texto este en el bundle).
// Pasa/ignora el LoginGate si existe, lista los h2 en orden, y reporta errores de consola.
// USO: node verify_render.mjs <ruta-al-html>
import puppeteer from "puppeteer";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const file = resolve(process.argv[2] || "dist/index.html");
const url = pathToFileURL(file).href;
const b = await puppeteer.launch({ headless: true });
const pg = await b.newPage();
const errs = [];
pg.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
pg.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

await pg.goto(url, { waitUntil: "load", timeout: 60000 });
await new Promise((r) => setTimeout(r, 3500)); // montar recharts

const t = await pg.evaluate(() => document.body.innerText);
const h2 = await pg.evaluate(() => Array.from(document.querySelectorAll("h2")).map((h) => h.textContent.trim()));
console.log("Puerta de acceso:", t.includes("Acceso restringido") ? "PRESENTE (quitar LoginGate)" : "no (ok)");
console.log("Orden de secciones (h2):");
h2.forEach((h, i) => console.log(`  ${i + 1}. ${h}`));
console.log("Errores de consola:", errs.length);
errs.slice(0, 10).forEach((e) => console.log("  " + e));
await b.close();
