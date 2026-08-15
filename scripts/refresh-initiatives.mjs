// AI refresh: verifies each initiative with server-side web search and
// discovers new ones. Runs in CI on a schedule; output goes through a PR.
//
// Safety contract (enforced HERE, in code — not delegated to the model):
//   - Existing initiatives: only `status`, `verification` and `updatedAt` can
//     change. Titles, summaries and links are immutable to the AI, so a
//     prompt-injected web page can never rewrite a donation link.
//   - New initiatives: schema-validated, forced to verification.state
//     "por_verificar", capped per run, and reviewed by a human in the PR.
//   - Nothing is ever deleted.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { validateFeed } from "./validate.mjs";

const MAX_NEW_PER_RUN = 5;
const today = new Date().toISOString().slice(0, 10);

const feed = JSON.parse(readFileSync("data/initiatives.json", "utf8"));
const linkReport = existsSync("link-report.json")
  ? JSON.parse(readFileSync("link-report.json", "utf8"))
  : {};

const client = new Anthropic();

const prompt = `Eres el agente de verificación del dashboard "Colombia SOS", un agregador
ciudadano de iniciativas de ayuda tras el terremoto M7,4 del 10 de agosto de 2026 en Colombia
(epicentro San José del Palmar, Chocó).

Tu tarea tiene dos partes:

1. VERIFICAR cada iniciativa del feed. Busca en la web su estado actual: ¿sigue activa?,
   ¿la información sigue vigente?, ¿hay noticias recientes? Usa el reporte de links como
   evidencia adicional (un link caído repetidamente sugiere "desactualizada", pero un solo
   fallo puede ser transitorio — sé conservador).

2. DESCUBRIR hasta ${MAX_NEW_PER_RUN} iniciativas nuevas relevantes (ayuda, donaciones,
   voluntariado, recursos para afectados) que no estén ya en el feed, con fuente verificable.

Reglas estrictas:
- NUNCA inventes información. Cada cambio de estado y cada iniciativa nueva debe estar
  respaldada por una fuente que encontraste en la búsqueda.
- NUNCA incluyas números de cuenta bancaria: enlaza a la página oficial donde estén publicados.
- Estados de verification.state: "verificada" (confirmada en fuente oficial o múltiples medios),
  "por_verificar" (una sola fuente o sin confirmación reciente), "desactualizada" (evidencia
  de que ya no opera o la información cambió).
- status: "activa", "pausada" o "finalizada" — cambia solo con evidencia clara.
- Las iniciativas nuevas usan el mismo esquema que las existentes. category ∈ sos|salud|
  donaciones|albergue|suministros|legal|mascotas|reconstruccion|informacion; audiences ⊆
  afectado|donante|voluntario|organizacion; organizer.type ∈ ciudadano|colectivo|ong|gobierno|
  empresa; links[].type ∈ web|instagram|tiktok|whatsapp|telefono|formulario|mapa.

FEED ACTUAL:
${JSON.stringify(feed, null, 2)}

REPORTE DE LINKS (status HTTP de hoy):
${JSON.stringify(linkReport, null, 2)}

Responde ÚNICAMENTE con un bloque de código JSON con esta forma exacta:

\`\`\`json
{
  "updates": [
    {
      "id": "id-existente",
      "status": "activa",
      "verification": { "state": "verificada", "lastCheckedAt": "${today}", "checkedBy": "agente-ia", "source": "descripción breve de la fuente + URL" }
    }
  ],
  "nuevas": [ { ...registro completo con el esquema del feed... } ],
  "notas": ["Observaciones para el revisor humano: links que deberían actualizarse, dudas, etc."]
}
\`\`\`

Incluye en "updates" una entrada por CADA iniciativa existente (aunque solo cambie lastCheckedAt).`;

console.log("Consultando a Claude con búsqueda web…");
const stream = client.messages.stream({
  model: "claude-opus-5",
  max_tokens: 64000,
  tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 25 }],
  messages: [{ role: "user", content: prompt }],
});

let response = await stream.finalMessage();

// Server-tool loops can pause; resume until the turn actually finishes.
let resumes = 0;
while (response.stop_reason === "pause_turn" && resumes < 5) {
  resumes++;
  console.log(`Turno pausado por herramientas del servidor — reanudando (${resumes})…`);
  const cont = client.messages.stream({
    model: "claude-opus-5",
    max_tokens: 64000,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 25 }],
    messages: [
      { role: "user", content: prompt },
      { role: "assistant", content: response.content },
    ],
  });
  response = await cont.finalMessage();
}

if (response.stop_reason === "refusal") {
  console.error("La solicitud fue rechazada por los clasificadores de seguridad; sin cambios.");
  process.exit(0);
}

const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
const match = [...text.matchAll(/```json\s*([\s\S]*?)```/g)].pop();
if (!match) {
  console.error("No se encontró bloque JSON en la respuesta; sin cambios.");
  process.exit(0);
}

let result;
try {
  result = JSON.parse(match[1]);
} catch (e) {
  console.error("JSON inválido en la respuesta del modelo; sin cambios.", e.message);
  process.exit(0);
}

// ---- Conservative merge (the actual safety boundary) ----
const V_STATES = ["verificada", "por_verificar", "desactualizada"];
const STATUSES = ["activa", "pausada", "finalizada"];
const byId = new Map(feed.initiatives.map((i) => [i.id, i]));
const summaryLines = [];

for (const u of result.updates ?? []) {
  const target = byId.get(u.id);
  if (!target) continue;
  const before = `${target.status}/${target.verification.state}`;
  if (STATUSES.includes(u.status)) target.status = u.status;
  if (u.verification && V_STATES.includes(u.verification.state)) {
    target.verification = {
      state: u.verification.state,
      lastCheckedAt: today,
      checkedBy: "agente-ia",
      source: String(u.verification.source ?? target.verification.source).slice(0, 300),
    };
  }
  target.updatedAt = today;
  const after = `${target.status}/${target.verification.state}`;
  if (before !== after) summaryLines.push(`- **${u.id}**: ${before} → ${after}`);
}

let added = 0;
for (const n of (result.nuevas ?? []).slice(0, MAX_NEW_PER_RUN)) {
  if (!n?.id || byId.has(n.id)) continue;
  n.verification = {
    state: "por_verificar",
    lastCheckedAt: today,
    checkedBy: "agente-ia",
    source: String(n.verification?.source ?? "descubierta por búsqueda web").slice(0, 300),
  };
  n.status = STATUSES.includes(n.status) ? n.status : "activa";
  n.createdAt = today;
  n.updatedAt = today;
  const candidate = { ...feed, initiatives: [...feed.initiatives, n] };
  if (validateFeed(candidate).length === 0) {
    feed.initiatives.push(n);
    byId.set(n.id, n);
    added++;
    summaryLines.push(`- 🆕 **${n.id}**: ${n.title}`);
  } else {
    summaryLines.push(`- ⚠️ Descartada por esquema inválido: ${n.id ?? "?"}`);
  }
}

feed.updatedAt = today;

const errors = validateFeed(feed);
if (errors.length) {
  console.error("El feed resultante no valida; abortando sin escribir.", errors);
  process.exit(1);
}

writeFileSync("data/initiatives.json", JSON.stringify(feed, null, 2) + "\n");

const notas = (result.notas ?? []).map((n) => `- ${String(n).slice(0, 500)}`).join("\n");
writeFileSync(
  "refresh-summary.md",
  `## Actualización automática — ${today}

Verificadas ${feed.initiatives.length} iniciativas, ${added} nueva(s) propuesta(s).

### Cambios de estado
${summaryLines.length ? summaryLines.join("\n") : "- Sin cambios de estado (solo lastCheckedAt)."}

### Notas del agente para el revisor
${notas || "- Sin notas."}

> Regla del pipeline: la IA solo puede cambiar \`status\`/\`verification\` y proponer
> iniciativas nuevas como \`por_verificar\`. Links, títulos y resúmenes existentes son
> inmutables para ella — cámbialos manualmente si las notas lo sugieren.
`
);
console.log(`Listo: ${summaryLines.length} cambios, ${added} nuevas. Resumen en refresh-summary.md`);
