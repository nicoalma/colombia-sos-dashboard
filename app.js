/* Colombia SOS — agregador de iniciativas
   Carga data/initiatives.json y renderiza filtros + tarjetas. Sin dependencias. */

const CATEGORY_LABELS = {
  sos: "SOS y rescate",
  salud: "Salud",
  donaciones: "Donaciones",
  albergue: "Albergue",
  suministros: "Suministros",
  legal: "Legal y seguros",
  mascotas: "Animales",
  reconstruccion: "Reconstrucción",
  informacion: "Información",
};

const VERIFICATION_LABELS = {
  verificada: "Verificada",
  por_verificar: "Por verificar",
  desactualizada: "Desactualizada",
};

const AUDIENCE_LABELS = {
  afectado: "afectados",
  donante: "donantes",
  voluntario: "voluntarios",
  organizacion: "organizaciones",
};

const state = { audience: "todos", category: "todas", zone: "todas", query: "" };
let DATA = null;

init();

async function init() {
  try {
    const res = await fetch("data/initiatives.json");
    DATA = await res.json();
  } catch (err) {
    document.getElementById("cards").innerHTML =
      "<p class='empty'>No se pudieron cargar los datos. Sirve el sitio con <code>python3 -m http.server</code> y recarga.</p>";
    return;
  }
  renderMeta();
  renderStats();
  populateSelect("category-select", categoriesIn(DATA.initiatives), (c) => CATEGORY_LABELS[c] || c);
  populateSelect("zone-select", zonesIn(DATA.initiatives), (z) => z);
  bindFilters();
  const focusId = restoreFromURL();
  renderCards();
  if (focusId) focusCard(focusId);
}

/* ---------- URL state: filtros compartibles y deep-links por iniciativa ---------- */

function restoreFromURL() {
  const p = new URLSearchParams(location.search);
  const quien = p.get("quien");
  if (quien && document.querySelector(`[data-audience="${CSS.escape(quien)}"]`)) {
    state.audience = quien;
    document.querySelectorAll("#audience-chips .chip").forEach((c) =>
      c.classList.toggle("is-active", c.dataset.audience === quien));
  }
  const cat = p.get("cat");
  if (cat && [...document.getElementById("category-select").options].some((o) => o.value === cat)) {
    state.category = cat;
    document.getElementById("category-select").value = cat;
  }
  const zona = p.get("zona");
  if (zona && [...document.getElementById("zone-select").options].some((o) => o.value === zona)) {
    state.zone = zona;
    document.getElementById("zone-select").value = zona;
  }
  const q = p.get("q");
  if (q) {
    state.query = q.toLowerCase();
    document.getElementById("search-input").value = q;
  }
  return p.get("i");
}

function syncURL() {
  const p = new URLSearchParams();
  if (state.audience !== "todos") p.set("quien", state.audience);
  if (state.category !== "todas") p.set("cat", state.category);
  if (state.zone !== "todas") p.set("zona", state.zone);
  if (state.query) p.set("q", state.query);
  const qs = p.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

function focusCard(id) {
  const el = document.getElementById(`iniciativa-${id}`);
  if (!el) return;
  el.classList.add("card--focus");
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}

function categoriesIn(items) {
  return [...new Set(items.map((i) => i.category))].sort((a, b) =>
    (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b, "es")
  );
}

function zonesIn(items) {
  return [...new Set(items.flatMap((i) => i.zones))].sort((a, b) => a.localeCompare(b, "es"));
}

function populateSelect(id, values, labelFn) {
  const select = document.getElementById(id);
  for (const value of values) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = labelFn(value);
    select.appendChild(opt);
  }
}

function bindFilters() {
  document.querySelectorAll("#audience-chips .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#audience-chips .chip").forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      state.audience = chip.dataset.audience;
      renderCards();
    });
  });
  document.getElementById("category-select").addEventListener("change", (e) => {
    state.category = e.target.value;
    renderCards();
  });
  document.getElementById("zone-select").addEventListener("change", (e) => {
    state.zone = e.target.value;
    renderCards();
  });
  document.getElementById("search-input").addEventListener("input", (e) => {
    state.query = e.target.value.trim().toLowerCase();
    renderCards();
  });
}

function matches(item) {
  if (state.audience !== "todos" && !item.audiences.includes(state.audience)) return false;
  if (state.category !== "todas" && item.category !== state.category) return false;
  if (state.zone !== "todas" && !item.zones.includes(state.zone)) return false;
  if (state.query) {
    const haystack = [
      item.title, item.summary, item.organizer.name,
      ...(item.tags || []), ...(item.needs || []), ...(item.offers || []),
      ...item.zones, CATEGORY_LABELS[item.category] || item.category,
    ].join(" ").toLowerCase();
    if (!haystack.includes(state.query)) return false;
  }
  return true;
}

function renderMeta() {
  document.getElementById("meta-updated").textContent =
    `${DATA.event.name} · Actualizado ${formatDate(DATA.updatedAt)}`;
}

function renderStats() {
  const items = DATA.initiatives;
  const active = items.filter((i) => i.status === "activa");
  document.getElementById("stat-total").textContent = active.length;
  document.getElementById("stat-verified").textContent =
    items.filter((i) => i.verification.state === "verificada").length;
  document.getElementById("stat-zones").textContent = zonesIn(items).length;
}

function renderCards() {
  const container = document.getElementById("cards");
  const results = DATA.initiatives
    .filter(matches)
    .sort((a, b) => verificationRank(a) - verificationRank(b));

  document.getElementById("results-count").textContent =
    `${results.length} ${results.length === 1 ? "iniciativa" : "iniciativas"}`;
  document.getElementById("empty-state").hidden = results.length > 0;
  container.replaceChildren(...results.map(cardEl));
  syncURL();
}

function verificationRank(item) {
  return { verificada: 0, por_verificar: 1, desactualizada: 2 }[item.verification.state] ?? 3;
}

function cardEl(item) {
  const card = el("article", "card");
  card.id = `iniciativa-${item.id}`;

  const main = el("div", "card__main");
  const title = el("h2", "card__title", item.title);
  const summary = el("p", "card__summary", item.summary);
  const tags = el("div", "tagrow");
  tags.appendChild(el("span", "tag tag--cat", CATEGORY_LABELS[item.category] || item.category));
  for (const aud of item.audiences) tags.appendChild(el("span", "tag", `Para ${AUDIENCE_LABELS[aud] || aud}`));
  main.append(title, summary, tags);

  const meta = el("div", "card__meta");
  meta.appendChild(metaLine("Organiza", `${item.organizer.name}`));
  meta.appendChild(metaLine("Zonas", item.zones.join(" · ")));
  if (item.needs?.length) meta.appendChild(metaLine("Necesitan", item.needs.join(", ")));
  if (item.offers?.length) meta.appendChild(metaLine("Ofrecen", item.offers.join(", ")));

  const side = el("div", "card__side");
  const status = el("span", `status status--${item.verification.state}`);
  status.append(
    document.createTextNode(VERIFICATION_LABELS[item.verification.state] || item.verification.state),
    el("span", "status__date", ` · ${formatDate(item.verification.lastCheckedAt)}`)
  );
  const links = el("div", "links");
  for (const link of item.links) {
    const a = el("a", "link-btn", `${link.label} →`);
    a.href = link.url;
    if (link.url.startsWith("http")) { a.target = "_blank"; a.rel = "noopener"; }
    links.appendChild(a);
  }
  side.append(status, links, shareRow(item));

  card.append(main, meta, side);
  return card;
}

function shareRow(item) {
  const row = el("div", "share");
  const shareUrl = `${location.origin}${location.pathname}?i=${encodeURIComponent(item.id)}`;

  const wa = el("a", "share__btn", "WhatsApp ↗");
  wa.href = `https://wa.me/?text=${encodeURIComponent(`${item.title} · Colombia SOS\n${shareUrl}`)}`;
  wa.target = "_blank";
  wa.rel = "noopener";
  wa.setAttribute("aria-label", `Compartir ${item.title} por WhatsApp`);

  const copy = el("button", "share__btn", "Copiar enlace");
  copy.type = "button";
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      copy.textContent = "✓ Copiado";
    } catch {
      prompt("Copia el enlace:", shareUrl);
    }
    setTimeout(() => (copy.textContent = "Copiar enlace"), 2000);
  });

  row.append(wa, copy);
  return row;
}

function metaLine(label, value) {
  const p = el("p");
  const strong = el("strong", null, `${label}: `);
  p.append(strong, document.createTextNode(value));
  return p;
}

function el(tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}
