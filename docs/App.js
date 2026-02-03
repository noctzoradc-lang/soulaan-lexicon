let LEX = null;

const el = (id) => document.getElementById(id);

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(s) {
  return String(s || "").toLowerCase().trim();
}

function entryText(entry) {
  const parts = [
    entry.term,
    entry.pos,
    entry.definition,
    (entry.scope || []).join(" "),
    (entry.keywords || []).join(" ")
  ];
  if (entry.subentries?.length) {
    for (const sub of entry.subentries) {
      parts.push(sub.label, sub.term, sub.definition);
    }
  }
  return normalize(parts.join(" "));
}

function buildSectionOptions() {
  const select = el("sectionFilter");
  for (const s of LEX.sections) {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `Section ${s.id} — ${s.title}`;
    select.appendChild(opt);
  }
}

function renderMeta() {
  const m = LEX.meta;
  el("title").textContent = m.title || "Soulaan Lexicon";
  el("subtitle").textContent = `${m.subtitle || ""} • v${m.version || ""} • ${m.status || ""}`.trim();
  el("metaLine").textContent =
    `${m.governingAuthority || ""} • Steward: ${m.steward || ""} • ${m.year || ""}`;
}

function getEntryById(id) {
  return LEX.entries.find(e => e.id === id);
}

function renderEntry(entry) {
  const cross = (entry.crossRefs || [])
    .map(id => getEntryById(id))
    .filter(Boolean)
    .map(e => `${e.term} (§${e.id})`);

  const scopeHtml = (entry.scope?.length)
    ? `<div class="kv"><strong>Scope:</strong><ul>${entry.scope.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div>`
    : "";

  const subHtml = (entry.subentries?.length)
    ? `<div class="kv"><strong>Subentries:</strong><ul>${
        entry.subentries.map(s => `<li><strong>${escapeHtml(s.label)}.</strong> ${escapeHtml(s.term)} — ${escapeHtml(s.definition)}</li>`).join("")
      }</ul></div>`
    : "";

  const crossHtml = (cross.length)
    ? `<div class="kv"><strong>Cross-refs:</strong> <small>${escapeHtml(cross.join(" • "))}</small></div>`
    : "";

  return `
    <article class="card">
      <h2>
        §${entry.id}. ${escapeHtml(entry.term)}
        <span class="badge">${escapeHtml(entry.section)}${entry.pos ? " • " + escapeHtml(entry.pos) : ""}</span>
      </h2>
      <p>${escapeHtml(entry.definition || "")}</p>
      ${scopeHtml}
      ${subHtml}
      ${crossHtml}
    </article>
  `;
}

function applyFilters() {
  const q = normalize(el("search").value);
  const section = el("sectionFilter").value;

  let list = LEX.entries.slice();

  if (section !== "ALL") {
    list = list.filter(e => e.section === section);
  }
  if (q) {
    list = list.filter(e => entryText(e).includes(q));
  }

  el("stats").textContent = `${list.length} result(s)`;
  el("results").innerHTML = list.map(renderEntry).join("");
}

async function init() {
  const res = await fetch("./lexicon.json", { cache: "no-store" });
  LEX = await res.json();

  buildSectionOptions();
  renderMeta();
  applyFilters();

  el("search").addEventListener("input", applyFilters);
  el("sectionFilter").addEventListener("change", applyFilters);
}

init().catch(err => {
  console.error(err);
  el("subtitle").textContent = "Failed to load lexicon.json";
});
