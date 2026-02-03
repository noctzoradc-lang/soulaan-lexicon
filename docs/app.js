// ====== CONFIG: JSON FILE NAME ======
// IMPORTANT: Change only this value if your json is named differently.
// Examples: "lexicon.json" or "soulaan_lexicon.json"
const JSON_FILE = "lexicon.json";

// ====== State ======
let TERMS = [];      // array of { id, title, section, pos, body, meta }
let FILTERED = [];   // search results
let ACTIVE_ID = null;

// ====== Helpers ======
const $ = (sel) => document.querySelector(sel);

function normalize(s){
  return (s ?? "")
    .toString()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function safeText(v){
  return (v ?? "").toString();
}

// Try to support multiple JSON shapes without you needing to rewrite it.
function coerceTerms(json){
  // If already an array, treat as terms list
  if (Array.isArray(json)) return json.map(coerceOne).filter(Boolean);

  // Common shapes: { terms: [...] } or { entries: [...] }
  const list = json?.terms || json?.entries || json?.items;
  if (Array.isArray(list)) return list.map(coerceOne).filter(Boolean);

  // If object keyed by id: { "1": {...}, "1.1": {...} }
  if (json && typeof json === "object") {
    const maybe = Object.entries(json).map(([id, obj]) => coerceOne({ id, ...obj }));
    const cleaned = maybe.filter(Boolean);
    if (cleaned.length) return cleaned;
  }

  return [];
}

function coerceOne(t){
  if (!t) return null;

  const id = safeText(t.id || t.key || t.termId || t.number);
  const title = safeText(t.title || t.term || t.name || t.heading);
  const section = safeText(t.section || t.group || t.category || "");
  const pos = Number(t.pos || t.order || t.index || 0);

  const meta = safeText(t.meta || t.partOfSpeech || t.type || "");
  const body = safeText(t.body || t.definition || t.text || t.content || "");

  if (!id && !title) return null;

  return { id: id || title, title: title || id, section, pos, meta, body };
}

function sortTerms(arr){
  return [...arr].sort((a,b)=>{
    // Try numeric-ish ordering first by id then by pos
    const A = a.pos || 0, B = b.pos || 0;
    if (A !== B) return A - B;
    return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" });
  });
}

// ====== Render TOC ======
function renderTOC(list){
  const toc = $("#toc");
  toc.innerHTML = "";

  // group by section label
  const groups = new Map();
  list.forEach(t => {
    const g = t.section || "Terms";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(t);
  });

  // keep insertion order but sort inside each group
  for (const [groupName, items] of groups.entries()){
    const h = document.createElement("div");
    h.className = "groupTitle";
    h.textContent = groupName;
    toc.appendChild(h);

    sortTerms(items).forEach(t => {
      const a = document.createElement("a");
      a.href = "#"+encodeURIComponent(t.id);
      a.dataset.id = t.id;
      a.textContent = `${t.id} — ${t.title}`;
      a.addEventListener("click", (e)=>{
        e.preventDefault();
        setActive(t.id);
      });
      toc.appendChild(a);
    });
  }
}

// ====== Render Definition ======
function renderTerm(term){
  const content = $("#content");
  if (!term){
    content.innerHTML = `
      <div class="emptyState">
        <h2>Not found.</h2>
        <p>Try a different spelling or search by ID (e.g., 6, 32a2).</p>
      </div>`;
    return;
  }

  content.innerHTML = `
    <h2 class="termTitle">${escapeHtml(term.id)} — ${escapeHtml(term.title)}</h2>
    <p class="termMeta">${escapeHtml(term.meta || term.section || "")}</p>
    <div class="termBody">${escapeHtml(term.body)}</div>
  `;
}

function escapeHtml(s){
  return (s ?? "")
    .toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

// ====== Active selection ======
function setActive(id){
  ACTIVE_ID = id;

  // highlight in toc
  document.querySelectorAll("#toc a").forEach(a=>{
    a.classList.toggle("active", a.dataset.id === id);
  });

  // render
  const term = TERMS.find(t => t.id === id) || FILTERED.find(t => t.id === id);
  renderTerm(term);

  // update url hash
  history.replaceState(null, "", "#"+encodeURIComponent(id));
}

// ====== Search ======
function doSearch(q){
  const query = normalize(q);
  if (!query){
    FILTERED = TERMS;
    renderTOC(FILTERED);
    // keep current term if any
    if (ACTIVE_ID) setActive(ACTIVE_ID);
    return;
  }

  FILTERED = TERMS.filter(t=>{
    const hay = normalize(`${t.id} ${t.title} ${t.section} ${t.meta} ${t.body}`);
    return hay.includes(query);
  });

  renderTOC(FILTERED);

  // if active isn't in filtered, show first result
  if (!FILTERED.some(t => t.id === ACTIVE_ID)){
    if (FILTERED[0]) setActive(FILTERED[0].id);
    else renderTerm(null);
  }
}

// ====== Keyboard ======
function buildKeyboard(){
  const keys = [
    "1","2","3","4","5","6","7","8","9","0",
    "q","w","e","r","t","y","u","i","o","p",
    "a","s","d","f","g","h","j","k","l","—",
    "z","x","c","v","b","n","m",".",",","/",
    "§","(",")","-"," : ".trim(),";","⌫","Clear","Space"
  ];

  const osk = $("#osk");
  osk.innerHTML = "";

  const input = $("#searchInput");

  function fireInput(){ input.dispatchEvent(new Event("input", { bubbles: true })); }

  keys.forEach(k=>{
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = k === "Space" ? "␠" : k;

    btn.addEventListener("click", ()=>{
      input.focus();
      if (k === "⌫"){
        input.value = input.value.slice(0, -1);
        fireInput();
        return;
      }
      if (k === "Clear"){
        input.value = "";
        fireInput();
        return;
      }
      if (k === "Space"){
        input.value += " ";
        fireInput();
        return;
      }
      input.value += k;
      fireInput();
    });

    osk.appendChild(btn);
  });
}

// ====== Init ======
async function init(){
  const input = $("#searchInput");
  const clearBtn = $("#clearBtn");

  buildKeyboard();

  input.addEventListener("input", (e)=> doSearch(e.target.value));
  clearBtn.addEventListener("click", ()=>{
    input.value = "";
    doSearch("");
    input.focus();
  });

  // Load JSON
  const res = await fetch(JSON_FILE, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not load ${JSON_FILE}`);
  const json = await res.json();

  TERMS = sortTerms(coerceTerms(json));
  FILTERED = TERMS;

  renderTOC(TERMS);

  // Hash open
  const hash = decodeURIComponent(location.hash.replace("#",""));
  if (hash && TERMS.some(t => t.id === hash)){
    setActive(hash);
  } else if (TERMS[0]){
    setActive(TERMS[0].id);
  }
}

init().catch(err=>{
  console.error(err);
  const content = $("#content");
  content.innerHTML = `
    <div class="emptyState">
      <h2>Site error.</h2>
      <p>Could not load the JSON. Check the JSON filename/path in <b>app.js</b>.</p>
      <p style="opacity:.7">${escapeHtml(err.message)}</p>
    </div>
  `;
});
