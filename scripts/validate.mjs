// Validates data/initiatives.json against the feed contract (zero dependencies).
// Exits 1 with a readable error list when invalid — CI gates on this.
import { readFileSync } from "node:fs";

const CATEGORIES = ["sos", "salud", "donaciones", "albergue", "suministros", "legal", "mascotas", "reconstruccion", "informacion"];
const AUDIENCES = ["afectado", "donante", "voluntario", "organizacion"];
const LINK_TYPES = ["web", "instagram", "tiktok", "whatsapp", "telefono", "formulario", "mapa"];
const ORG_TYPES = ["ciudadano", "colectivo", "ong", "gobierno", "empresa"];
const V_STATES = ["verificada", "por_verificar", "desactualizada"];
const STATUSES = ["activa", "pausada", "finalizada"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateFeed(data) {
  const errors = [];
  const err = (m) => errors.push(m);

  if (!data.event?.name) err("event.name requerido");
  if (!DATE_RE.test(data.updatedAt ?? "")) err("updatedAt debe ser YYYY-MM-DD");
  if (!Array.isArray(data.initiatives)) return ["initiatives debe ser un array"];

  const ids = new Set();
  for (const i of data.initiatives) {
    const at = `[${i.id ?? "sin id"}]`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(i.id ?? "")) err(`${at} id inválido`);
    if (ids.has(i.id)) err(`${at} id duplicado`);
    ids.add(i.id);
    if (!i.title) err(`${at} title requerido`);
    if (!i.summary) err(`${at} summary requerido`);
    if (!CATEGORIES.includes(i.category)) err(`${at} category inválida: ${i.category}`);
    if (!Array.isArray(i.audiences) || !i.audiences.length) err(`${at} audiences vacío`);
    else for (const a of i.audiences) if (!AUDIENCES.includes(a)) err(`${at} audience inválida: ${a}`);
    if (!Array.isArray(i.zones) || !i.zones.length) err(`${at} zones vacío`);
    if (!ORG_TYPES.includes(i.organizer?.type)) err(`${at} organizer.type inválido`);
    if (!i.organizer?.name) err(`${at} organizer.name requerido`);
    if (!Array.isArray(i.links)) err(`${at} links debe ser array`);
    else for (const l of i.links) {
      if (!LINK_TYPES.includes(l.type)) err(`${at} link.type inválido: ${l.type}`);
      if (typeof l.url !== "string" || !l.label) err(`${at} link sin url/label`);
    }
    if (!STATUSES.includes(i.status)) err(`${at} status inválido: ${i.status}`);
    if (!V_STATES.includes(i.verification?.state)) err(`${at} verification.state inválido`);
    if (!DATE_RE.test(i.verification?.lastCheckedAt ?? "")) err(`${at} verification.lastCheckedAt debe ser YYYY-MM-DD`);
  }
  return errors;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const path = process.argv[2] ?? "data/initiatives.json";
  const data = JSON.parse(readFileSync(path, "utf8"));
  const errors = validateFeed(data);
  if (errors.length) {
    console.error(`❌ ${errors.length} error(es) en ${path}:`);
    for (const e of errors) console.error("  -", e);
    process.exit(1);
  }
  console.log(`✅ ${path} válido — ${data.initiatives.length} iniciativas`);
}
