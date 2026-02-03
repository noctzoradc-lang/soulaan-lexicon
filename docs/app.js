// docs/app.js
async function loadLexicon() {
  const res = await fetch("./lexicon.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load lexicon.json");
  return await res.json();
}

// Normalize IDs so we can sort + anchor consistently (works with 1, 1.1, "32a2", etc)
function idToSortKey(id) {
  const s = String(id).trim();

  // Pure number (including decimals)
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    // Make decimals sort after their base integer (1.1 after 1)
    // Use a tuple-like encoded string: "000001|000100"
    const [a, b] = s.split(".");
    const major = a.padStart(6, "0");
    const minor = (b || "0").padEnd(6, "0");
    return `${major}|${minor}|000000`;
  }

  // Patterns like "32a2", "6c", "3a"
  // Extract leading number + letter chunk + trailing number
  const m = s.match(/^(\d+)([a-zA-Z]+)?(\d+)?$/);
  if (m) {
    const major = m[1].padStart(6, "0");
    const letters = (m[2] || "").toLowerCase();
    const tailNum = (m[3] || "0").padStart(6, "0");
    // letters sort after the main integer but in alpha order
    return `${major}|999999|${letters.padEnd(6, " ")}|${tailNum}`;
  }

  // Fallback: shove unknown formats to the end, stable
  return `999999|999999|${s}`;
}

function makeAnchorId(entry) {
  // Always safe for URL fragments
  return `term-${encodeURIComponent(String(entry.id).trim())}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderEntry(entry) {
  const anchor = makeAnchorId(entry);

  const scopeHtml = Array.isArray(entry.scope) && entry.scope.length
    ? `<ul class="scope">${entry.scope.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
    : "";

  const notesHtml = Array.isArray(entry.notes) && entry.notes.length
    ? `<details class="notes"><summary>Notes</summary><ul>${entry.notes.map(n => `<li>${escapeHtml(n)}</li>`).join("")}</ul></details>`
    : "";

  const subHtml = Array.isArray(entry.subentries) && entry.subentries.length
    ? `<div class="subentries">
        <h4>Subentries</h4>
        ${entry.subentries.map(se => `
          <div class="subentry">
            <div class="subhead"><span class="badge">${escapeHtml(se.label || "")}</span> <strong>${escapeHtml(se.term || "")}</strong></div>
            <div class="subdef">${escapeHtml(se.definition || "")}</div>
          </div>
        `).join("")}
      </div>`
    : "";

  const crossHtml = Array.isArray(entry.crossRefs) && entry.crossRefs.length
    ? `<div class="crossrefs"><strong>Cross-refs:</strong> ${entry.crossRefs.map(x => escapeHtml(x)).join(", ")}</div>`
    : "";

  return `
    <article class="entry" id="${anchor}">
      <header class="entry-header">
        <div class="entry-id">${escapeHtml(entry.id)}</div>
        <div class="entry-title">
          <h3>${escapeHtml(entry.term || "")}</h3>
          ${entry.pos ? `<div class="pos">${escapeHtml(entry.pos)}</div>` : ""}
          ${entry.section ? `<div class="section">Section ${escapeHtml(entry.section)}</div>` : ""}
        </div>
      </header>

      <div class="definition">${escapeHtml(entry.definition || "")}</div>

      ${scopeHtml}
      ${notesHtml}
      ${subHtml}
      ${crossHtml}
    </article>
  `;
}

function buildTOC(data) {
  const toc = document.getElementById("toc");
  if (!toc) return;

  const sections = Array.isArray(data.sections) ? data.sections : [];
  const entries = Array.isArray(data.entries) ? data.entries : [];

  // group by section id
  const bySection = new Map();
  for (const e of entries) {
    const s = e.section || "—";
    if (!bySection.has(s)) bySection.set(s, []);
    bySection.get(s).push(e);
  }

  // sort entries within each section
  for (const [k, list] of bySection.entries()) {
    list.sort((a, b) => idToSortKey(a.id).localeCompare(idToSortKey(b.id)));
  }

  toc.innerHTML = sections.map(sec => {
    const list = bySection.get(sec.id) || [];
    const items = list.map(e => {
      const anchor = makeAnchorId(e);
      return `<li><a href="#${anchor}">${escapeHtml(e.id)} — ${escapeHtml(e.term)}</a></li>`;
    }).join("");

    return `
      <section class="toc-section">
        <h3>Section ${escapeHtml(sec.id)} — ${escapeHtml(sec.title)}</h3>
        ${sec.range ? `<div class="range">${escapeHtml(sec.range)}</div>` : ""}
        <ul>${items}</ul>
      </section>
    `;
  }).join("");
}

function renderAll(data) {
  const container = document.getElementById("entries");
  if (!container) return;

  const entries = (data.entries || []).slice().sort((a, b) =>
    idToSortKey(a.id).localeCompare(idToSortKey(b.id))
  );

  container.innerHTML = entries.map(renderEntry).join("");
}

function setupSearch(data) {
  const input = document.getElementById("search");
  const results = document.getElementById("searchResults");
  if (!input || !results) return;

  const entries = (data.entries || []).slice().sort((a, b) =>
    idToSortKey(a.id).localeCompare(idToSortKey(b.id))
  );

  function scoreMatch(q, e) {
    const term = (e.term || "").toLowerCase();
    const def = (e.definition || "").toLowerCase();
    const id = String(e.id).toLowerCase();

    let score = 0;
    if (id === q) score += 50;
    if (term === q) score += 40;
    if (term.includes(q)) score += 20;
    if (def.includes(q)) score += 5;
    return score;
  }

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      results.innerHTML = "";
      return;
    }

    const matches = entries
      .map(e => ({ e, s: scoreMatch(q, e) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 30);

    results.innerHTML = matches.map(({ e }) => {
      const anchor = makeAnchorId(e);
      return `<div class="result"><a href="#${anchor}">${escapeHtml(e.id)} — ${escapeHtml(e.term)}</a></div>`;
    }).join("");
  });
}

(async function main() {
  try {
    const data = await loadLexicon();

    // Header (optional)
    const title = document.getElementById("siteTitle");
    const sub = document.getElementById("siteSub");
    if (title && data?.meta?.title) title.textContent = data.meta.title;
    if (sub && data?.meta?.subtitle) sub.textContent = `${data.meta.subtitle} — v${data.meta.version}`;

    buildTOC(data);
    renderAll(data);
    setupSearch(data);

  } catch (err) {
    console.error(err);
    const container = document.getElementById("entries");
    if (container) container.innerHTML = `<p class="error">Error loading lexicon.json</p>`;
  }
})();
