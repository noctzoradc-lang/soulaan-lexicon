let DATA = null;

const el = (id) => document.getElementById(id);

const state = {
  view: "home",          // home | preface | rules | afterword | citation | term
  q: "",
  section: "",
  tag: "",
  az: "",
  termSlug: ""
};

function slugify(s){
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")            // strip apostrophes
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function setHashForView(){
  if(state.view === "term" && state.termSlug){
    location.hash = `#term/${state.termSlug}`;
    return;
  }
  location.hash = `#${state.view}`;
}

function parseHash(){
  const h = (location.hash || "#home").replace("#","");
  if(h.startsWith("term/")){
    state.view = "term";
    state.termSlug = h.split("/")[1] || "";
    return;
  }
  const allowed = new Set(["home","preface","rules","afterword","citation"]);
  state.view = allowed.has(h) ? h : "home";
  state.termSlug = "";
}

function setActiveNav(){
  document.querySelectorAll(".nav-btn").forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.view === state.view);
  });
}

function buildAZ(){
  const row = el("azRow");
  row.innerHTML = "";
  const letters = ["All"].concat(Array.from({length:26},(_,i)=>String.fromCharCode(65+i)));
  letters.forEach(ch=>{
    const b = document.createElement("button");
    b.className = "az-btn";
    b.textContent = ch;
    const val = (ch==="All") ? "" : ch;
    if(state.az === val) b.classList.add("active");
    b.addEventListener("click", ()=>{
      state.az = val;
      renderHome();
      buildAZ();
    });
    row.appendChild(b);
  });
}

function uniqueSorted(arr){
  return Array.from(new Set(arr)).sort((a,b)=>a.localeCompare(b));
}

function populateFilters(){
  const sections = uniqueSorted(DATA.entries.map(e=>e.section).filter(Boolean));
  const tags = uniqueSorted(DATA.entries.flatMap(e=>e.tags || []));

  const sectionSel = el("sectionSelect");
  sectionSel.innerHTML = `<option value="">All Sections</option>` +
    sections.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");

  const tagSel = el("tagSelect");
  tagSel.innerHTML = `<option value="">All Tags</option>` +
    tags.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");

  sectionSel.value = state.section;
  tagSel.value = state.tag;
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function entryCard(e, isDetail=false){
  const title = escapeHtml(e.term);
  const pos = e.partOfSpeech ? `<span class="badge">${escapeHtml(e.partOfSpeech)}</span>` : "";
  const meta = [
    e.number ? `<span class="pill">#${escapeHtml(e.number)}</span>` : "",
    e.section ? `<span class="pill">${escapeHtml(e.section)}</span>` : "",
    e.category ? `<span class="pill">${escapeHtml(e.category)}</span>` : "",
    ...(e.tags||[]).map(t=>`<span class="pill">#${escapeHtml(t)}</span>`)
  ].filter(Boolean).join("");

  const shortDef = e.shortDefinition ? `<div class="def">${escapeHtml(e.shortDefinition)}</div>` : "";
  const longDef = e.longDefinition ? `<div class="long">${escapeHtml(e.longDefinition).replaceAll("\n","<br/>")}</div>` : "";

  const slug = slugify(e.term);
  const link = isDetail ? "" : `<div class="meta"><a class="linklike" href="#term/${slug}">Open term →</a></div>`;

  return `
    <article class="entry">
      <div class="entry-title">
        <h2>${title}</h2>
        ${pos}
      </div>
      <div class="meta">${meta}</div>
      ${shortDef}
      ${longDef}
      ${link}
    </article>
  `;
}

function renderStaticPage(title, body){
  el("controls").style.display = "none";
  el("content").innerHTML = `
    <section class="card">
      <h1 style="margin:0 0 10px 0;">${escapeHtml(title)}</h1>
      <div class="long">${escapeHtml(body).replaceAll("\n","<br/>")}</div>
    </section>
  `;
}

function matchesFilters(e){
  const q = state.q.trim().toLowerCase();
  const hay = [
    e.term, e.shortDefinition, e.longDefinition,
    e.section, e.category, (e.tags||[]).join(" ")
  ].join(" ").toLowerCase();

  if(q && !hay.includes(q)) return false;
  if(state.section && e.section !== state.section) return false;
  if(state.tag && !(e.tags||[]).includes(state.tag)) return false;
  if(state.az){
    const first = (e.term || "").trim()[0]?.toUpperCase() || "";
    if(first !== state.az) return false;
  }
  return true;
}

function renderHome(){
  el("controls").style.display = "block";

  // ensure filter dropdowns show current state
  el("searchInput").value = state.q;
  el("sectionSelect").value = state.section;
  el("tagSelect").value = state.tag;

  const list = DATA.entries.filter(matchesFilters);

  const header = `
    <section class="card">
      <div class="subtle">
        ${list.length} matching entr${list.length===1?"y":"ies"} • Click a term for a shareable link.
      </div>
    </section>
  `;

  const cards = list
    .sort((a,b)=>a.term.localeCompare(b.term))
    .map(e=>entryCard(e,false))
    .join("");

  el("content").innerHTML = header + (cards || `
    <section class="card">
      <div>No matches. Try clearing filters.</div>
    </section>
  `);
}

function renderTermDetail(){
  el("controls").style.display = "none";
  const slug = state.termSlug;

  const e = DATA.entries.find(x=>slugify(x.term) === slug);
  if(!e){
    el("content").innerHTML = `
      <section class="card">
        <div class="backbar">
          <button class="btn2" id="backBtn">← Back to Lexicon</button>
          <span class="subtle">Term not found</span>
        </div>
      </section>
      <section class="card">
        <div>That term link doesn’t match an entry.</div>
      </section>
    `;
    el("backBtn").addEventListener("click", ()=>{
      state.view="home"; setHashForView(); route();
    });
    return;
  }

  el("content").innerHTML = `
    <section class="card detail-view">
      <div class="backbar">
        <button class="btn2" id="backBtn">← Back to Lexicon</button>
        <button class="btn2" id="copyBtn">Copy Link</button>
      </div>
      ${entryCard(e,true)}
      <div class="subtle" style="margin-top:10px;">
        Deep link: <span class="subtle">${location.href.split("#")[0]}#term/${slugify(e.term)}</span>
      </div>
    </section>
  `;

  el("backBtn").addEventListener("click", ()=>{
    state.view="home";
    setHashForView();
    route();
  });

  el("copyBtn").addEventListener("click", async ()=>{
    const url = `${location.href.split("#")[0]}#term/${slugify(e.term)}`;
    try{
      await navigator.clipboard.writeText(url);
      el("copyBtn").textContent = "Copied ✓";
      setTimeout(()=>el("copyBtn").textContent="Copy Link", 900);
    }catch{
      el("copyBtn").textContent = "Copy failed";
      setTimeout(()=>el("copyBtn").textContent="Copy Link", 900);
    }
  });
}

function route(){
  parseHash();
  setActiveNav();

  if(state.view === "home"){
    buildAZ();
    populateFilters();
    renderHome();
    return;
  }
  if(state.view === "term"){
    renderTermDetail();
    return;
  }
  if(state.view === "preface"){
    renderStaticPage("Preface", DATA.pages.preface);
    return;
  }
  if(state.view === "rules"){
    renderStaticPage("Rules of Interpretation", DATA.pages.rules);
    return;
  }
  if(state.view === "afterword"){
    renderStaticPage("Afterword", DATA.pages.afterword);
    return;
  }
  if(state.view === "citation"){
    renderStaticPage("Citation & Attribution", DATA.pages.citation);
    return;
  }

  state.view = "home";
  setHashForView();
  renderHome();
}

async function init(){
  el("year").textContent = new Date().getFullYear();

  // Nav buttons
  document.querySelectorAll(".nav-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      state.view = btn.dataset.view;
      state.termSlug = "";
      setHashForView();
      route();
    });
  });

  // Controls events
  el("searchInput").addEventListener("input", (e)=>{
    state.q = e.target.value;
    renderHome();
  });

  el("sectionSelect").addEventListener("change", (e)=>{
    state.section = e.target.value;
    renderHome();
  });

  el("tagSelect").addEventListener("change", (e)=>{
    state.tag = e.target.value;
    renderHome();
  });

  el("clearBtn").addEventListener("click", ()=>{
    state.q=""; state.section=""; state.tag=""; state.az="";
    el("searchInput").value="";
    el("sectionSelect").value="";
    el("tagSelect").value="";
    buildAZ();
    renderHome();
  });

  // Load data
  const res = await fetch("lexicon.json", { cache: "no-store" });
  DATA = await res.json();

  window.addEventListener("hashchange", route);
  route();
}

init();
// ===========================
// On-screen keyboard support
// ===========================
(function(){
  const toggle = document.getElementById("kbdToggle");
  const kbd = document.getElementById("kbd");

  // Change this selector if your search input has a different id:
  // e.g. document.querySelector('input[type="search"]')
  const searchInput =
    document.getElementById("search") ||
    document.querySelector('input[type="search"]') ||
    document.querySelector('input[placeholder*="Search"]');

  let target = searchInput;

  function openKbd(){
    if(!kbd) return;
    kbd.classList.add("open");
    kbd.setAttribute("aria-hidden","false");
    if(toggle) toggle.setAttribute("aria-expanded","true");
  }

  function closeKbd(){
    if(!kbd) return;
    kbd.classList.remove("open");
    kbd.setAttribute("aria-hidden","true");
    if(toggle) toggle.setAttribute("aria-expanded","false");
  }

  function insertText(el, text){
    if(!el) return;
    el.focus();

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;

    el.value = el.value.slice(0, start) + text + el.value.slice(end);

    const cursor = start + text.length;
    el.setSelectionRange(cursor, cursor);

    // Trigger your existing filtering logic
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function backspace(el){
    if(!el) return;
    el.focus();

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;

    if(start !== end){
      el.value = el.value.slice(0, start) + el.value.slice(end);
      el.setSelectionRange(start, start);
    } else if(start > 0) {
      el.value = el.value.slice(0, start - 1) + el.value.slice(end);
      el.setSelectionRange(start - 1, start - 1);
    }

    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Track last-focused input (so keyboard can type into it)
  document.addEventListener("focusin", (e) => {
    if(e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")){
      target = e.target;
    }
  });

  // Toggle button
  if(toggle){
    toggle.addEventListener("click", () => {
      if(kbd.classList.contains("open")) closeKbd();
      else openKbd();
    });
  }

  // Keyboard click handling
  if(kbd){
    kbd.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if(!btn) return;

      const action = btn.dataset.action;
      const key = btn.dataset.key;

      if(action === "close") return closeKbd();
      if(action === "backspace") return backspace(target);
      if(action === "space") return insertText(target, " ");
      if(action === "enter") return insertText(target, "\n");

      if(typeof key === "string") insertText(target, key);
    });
  }

  // Optional: open keyboard automatically when search is focused
  if(searchInput){
    searchInput.addEventListener("focus", () => openKbd());
  }
})();
