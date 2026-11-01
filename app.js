const UI = {
  en: {
    contacts: "Contacts", interview: "New interview", results: "Results",
    shared: "Saved for your team", loading: "Connecting…",
    signIn: "Sign in", signOut: "Sign out", signInIntro: "Only the project team can open this app.",
    email: "Email", password: "Password",
    badLogin: "That email or password is wrong. Check them and try again.",
    notTeam: "This account isn't on the project team. Ask the project owner to add your email.",
    unreachable: "The saved data can't be reached right now. What you see may be out of date.",
    intro: "We are final-year students working on a cybersecurity startup project for Algerian companies. We are here to learn from your experience, not to sell anything. Your answers will stay anonymous, and you can skip any question.",
    say: "Say this first", who: "Who are you interviewing?",
    tip: "Ask each question first, then show the choices if the person hesitates. If an answer is interesting, ask “Why?”",
    legalNote: "Legal answers must be checked against the official texts.",
    many: "several answers possible", closing: "Closing questions",
    notes: "Interview notes", notesHint: "Write reasons and examples. Don't write names, so answers stay anonymous.",
    answered: "answered", save: "Save interview", saving: "Saving…", saved: "Interview saved", clear: "Clear answers",
    needAnswer: "Answer at least one question before saving.",
    otherText: "Write the answer here",
    saveFailed: "This didn't save. Check your connection and try again. Your answers are still here.",
    interviews: "Interviews: ", contactsTitle: "Who to contact",
    contactsIntro: "Suggestions from public sources. Check each one is still active before contacting them, and add your own contacts.",
    allTypes: "All types", allStatus: "All statuses", none: "Nothing matches these filters.",
    emptyContacts: "No contacts yet. Add the first one with the form below.",
    start: "Start interview", remove: "Delete", confirm: "Confirm delete", addTitle: "Add a contact",
    name: "Name of the organization or person", why: "Why contact them?", add: "Add contact", added: "Contact added",
    needName: "Enter a name first.", source: "Source",
    resultsTitle: "What people said", emptyResults: "No interviews saved for this type yet. Results appear here after the first one.",
    of: "of", otherAnswers: "Written answers", savedList: "Saved interviews", exportCsv: "Download CSV",
    exported: "CSV downloaded",
    small: "With few interviews, report counts such as “4 of 6” instead of percentages.",
    status: { todo: "To contact", contacted: "Contacted", scheduled: "Scheduled", done: "Interviewed", declined: "Declined" }
  },
  fr: {
    contacts: "Contacts", interview: "Nouvel entretien", results: "Résultats",
    shared: "Enregistré pour l'équipe", loading: "Connexion…",
    signIn: "Se connecter", signOut: "Se déconnecter", signInIntro: "Seule l'équipe du projet peut ouvrir cette application.",
    email: "E-mail", password: "Mot de passe",
    badLogin: "L'e-mail ou le mot de passe est incorrect. Vérifiez-les et réessayez.",
    notTeam: "Ce compte ne fait pas partie de l'équipe du projet. Demandez au responsable du projet d'ajouter votre e-mail.",
    unreachable: "Les données enregistrées sont inaccessibles pour le moment. L'affichage n'est peut-être pas à jour.",
    intro: "Nous sommes des étudiants en fin d'études et nous travaillons sur un projet de startup en cybersécurité pour les entreprises algériennes. Nous sommes là pour apprendre de votre expérience, pas pour vendre quoi que ce soit. Vos réponses resteront anonymes et vous pouvez ne pas répondre à une question.",
    say: "À dire d'abord", who: "Qui interrogez-vous ?",
    tip: "Posez d'abord la question, puis montrez les choix si la personne hésite. Si une réponse est intéressante, demandez « Pourquoi ? »",
    legalNote: "Les réponses juridiques doivent être vérifiées dans les textes officiels.",
    many: "plusieurs réponses possibles", closing: "Questions finales",
    notes: "Notes de l'entretien", notesHint: "Notez les raisons et les exemples. N'écrivez aucun nom, pour garder les réponses anonymes.",
    answered: "répondues", save: "Enregistrer l'entretien", saving: "Enregistrement…", saved: "Entretien enregistré", clear: "Effacer les réponses",
    needAnswer: "Répondez à au moins une question avant d'enregistrer.",
    otherText: "Écrivez la réponse ici",
    saveFailed: "L'enregistrement a échoué. Vérifiez votre connexion et réessayez. Vos réponses sont conservées.",
    interviews: "Entretiens : ", contactsTitle: "Qui contacter",
    contactsIntro: "Suggestions issues de sources publiques. Vérifiez que chacune est toujours active avant de la contacter, et ajoutez vos propres contacts.",
    allTypes: "Tous les types", allStatus: "Tous les statuts", none: "Aucun résultat avec ces filtres.",
    emptyContacts: "Aucun contact pour l'instant. Ajoutez le premier avec le formulaire ci-dessous.",
    start: "Commencer l'entretien", remove: "Supprimer", confirm: "Confirmer", addTitle: "Ajouter un contact",
    name: "Nom de l'organisme ou de la personne", why: "Pourquoi le contacter ?", add: "Ajouter", added: "Contact ajouté",
    needName: "Saisissez d'abord un nom.", source: "Source",
    resultsTitle: "Ce que les personnes ont répondu", emptyResults: "Aucun entretien enregistré pour ce type. Les résultats apparaîtront ici après le premier.",
    of: "sur", otherAnswers: "Réponses écrites", savedList: "Entretiens enregistrés", exportCsv: "Télécharger le CSV",
    exported: "CSV téléchargé",
    small: "Avec peu d'entretiens, indiquez des nombres comme « 4 sur 6 » plutôt que des pourcentages.",
    status: { todo: "À contacter", contacted: "Contacté", scheduled: "Prévu", done: "Interrogé", declined: "Refusé" }
  }
};
const STATUSES = ["todo", "contacted", "scheduled", "done", "declined"];
const PROFILES = SECTIONS.filter(s => s.id !== "Z");
const CLOSING = SECTIONS.find(s => s.id === "Z");

const app = {
  lang: "fr", tab: "contacts", section: "A", resultSection: "A",
  mode: "loading", stale: false, responses: [], contacts: [],
  filterType: "", filterStatus: "", drafts: {}, armed: null,
  userId: null, channel: null, loginEmail: "", loginError: ""
};
let sb = null;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function t(k) { return UI[app.lang][k]; }
function L(o) { return o[app.lang]; }
function readLocal(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function sectionOf(id) { return SECTIONS.find(s => s.id === id); }
function draft(section) {
  return app.drafts[section] || (app.drafts[section] = { answers: {}, notes: "" });
}
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg; el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 3200);
}

function renderChrome() {
  document.documentElement.lang = app.lang;
  const signedIn = app.mode === "shared";
  document.getElementById("tabs").hidden = !signedIn;
  const signout = document.getElementById("signout");
  signout.hidden = !signedIn;
  signout.textContent = t("signOut");
  const sync = document.getElementById("sync");
  sync.hidden = !signedIn;
  sync.dataset.mode = app.mode;
  sync.textContent = t("shared");
  for (const l of ["fr", "en"]) document.getElementById("lang-" + l).setAttribute("aria-pressed", String(app.lang === l));
  for (const k of ["contacts", "interview", "results"]) {
    const b = document.getElementById("tab-" + k);
    b.textContent = t(k) + (k === "results" ? " (" + app.responses.length + ")" : "");
    b.setAttribute("aria-selected", String(app.tab === k));
  }
}
function banner() {
  return app.stale ? `<p class="warn">${esc(t("unreachable"))}</p>` : "";
}
function loginHtml() {
  return `<form class="card login" id="login">
      <h2>${esc(t("signIn"))}</h2>
      <p class="muted small">${esc(t("signInIntro"))}</p>
      ${app.loginError ? `<p class="warn">${esc(app.loginError)}</p>` : ""}
      <label for="login-email">${esc(t("email"))}</label>
      <input type="text" inputmode="email" id="login-email" autocomplete="username" required value="${esc(app.loginEmail)}">
      <label for="login-password">${esc(t("password"))}</label>
      <input type="password" id="login-password" autocomplete="current-password" required>
      <button class="btn primary" id="login-submit" type="submit">${esc(t("signIn"))}</button>
    </form>`;
}
function render() {
  renderChrome();
  const view = document.getElementById("view");
  if (app.mode === "loading") { view.innerHTML = `<p class="muted">${esc(t("loading"))}</p>`; return; }
  if (app.mode === "signedout") { view.innerHTML = loginHtml(); return; }
  if (app.tab === "contacts") view.innerHTML = banner() + contactsHtml();
  if (app.tab === "interview") { view.innerHTML = banner() + interviewHtml(); updateProgress(); }
  if (app.tab === "results") view.innerHTML = banner() + resultsHtml();
}

function typeOptions(selected, withAll) {
  const all = withAll ? `<option value="">${esc(t("allTypes"))}</option>` : "";
  return all + PROFILES.map(s => `<option value="${s.id}"${s.id === selected ? " selected" : ""}>${esc(L(s.title))}</option>`).join("");
}
function contactsHtml() {
  const list = [...app.contacts]
    .sort((a, b) => a.sort_order - b.sort_order || String(a.name).localeCompare(String(b.name)))
    .filter(c => (!app.filterType || c.section === app.filterType) && (!app.filterStatus || c.status === app.filterStatus));
  const statusFilter = `<option value="">${esc(t("allStatus"))}</option>` + STATUSES.map(s =>
    `<option value="${s}"${s === app.filterStatus ? " selected" : ""}>${esc(t("status")[s])}</option>`).join("");
  const cards = list.map(c => {
    const sec = sectionOf(c.section);
    const opts = STATUSES.map(s => `<option value="${s}"${s === (c.status || "todo") ? " selected" : ""}>${esc(t("status")[s])}</option>`).join("");
    const why = (app.lang === "fr" ? c.why_fr : c.why_en) || c.why_en || c.why_fr || "";
    return `<article class="card">
      <div class="type">${sec ? esc(L(sec.title)) : ""}</div>
      <div class="title">${esc(c.name)}</div>
      ${why ? `<p class="small muted">${esc(why)}</p>` : ""}
      ${c.link ? `<p class="small"><a href="${esc(c.link)}" target="_blank" rel="noopener">${esc(t("source"))}</a></p>` : ""}
      <div class="row">
        <select class="status" id="status-${esc(c.id)}" data-status="${esc(c.id)}" aria-label="${esc(c.name)}">${opts}</select>
        ${sec ? `<button class="btn" type="button" data-start="${c.section}">${esc(t("start"))}</button>` : ""}
        <button class="btn${app.armed === c.id ? " danger" : ""}" type="button" data-delc="${esc(c.id)}">${esc(t(app.armed === c.id ? "confirm" : "remove"))}</button>
      </div>
    </article>`;
  }).join("");
  const empty = app.contacts.length ? t("none") : t("emptyContacts");
  return `<div class="stack"><h2>${esc(t("contactsTitle"))}</h2><p class="muted">${esc(t("contactsIntro"))}</p></div>
    <div class="filters">
      <select id="filter-type" aria-label="${esc(t("allTypes"))}">${typeOptions(app.filterType, true)}</select>
      <select id="filter-status" aria-label="${esc(t("allStatus"))}">${statusFilter}</select>
    </div>
    <div class="stack">${cards || `<p class="muted">${esc(empty)}</p>`}</div>
    <form class="addc block" id="addc"><h3 class="full">${esc(t("addTitle"))}</h3>
      <input type="text" id="c-name" placeholder="${esc(t("name"))}" aria-label="${esc(t("name"))}">
      <select id="c-type" aria-label="${esc(t("allTypes"))}">${typeOptions("A", false)}</select>
      <input class="full" type="text" id="c-why" placeholder="${esc(t("why"))}" aria-label="${esc(t("why"))}">
      <div class="full"><button class="btn" type="submit">${esc(t("add"))}</button></div>
    </form>`;
}

function questionHtml(q, sec) {
  const a = draft(sec).answers[q.id] || { choices: [], other: "" };
  const type = q.many ? "checkbox" : "radio";
  const opts = q.options.map((o, i) => {
    const on = a.choices.includes(o.en);
    return `<label class="opt"><input type="${type}" id="${q.id}-${i}" name="${q.id}" value="${esc(o.en)}" data-text="${o.text ? 1 : 0}"${on ? " checked" : ""}>${esc(L(o))}</label>`;
  }).join("");
  const showText = q.options.some(o => o.text && a.choices.includes(o.en));
  const writeIn = q.options.some(o => o.text) ? `<input class="othertext" type="text" id="${q.id}-text" data-other="${q.id}" placeholder="${esc(t("otherText"))}" aria-label="${esc(t("otherText"))}" value="${esc(a.other)}"${showText ? "" : " hidden"}>` : "";
  const open = q.options.length ? "" : `<textarea id="${q.id}-open" data-open="${q.id}" aria-label="${esc(L(q))}">${esc(a.other)}</textarea>`;
  return `<fieldset class="q" data-q="${q.id}"><legend><span class="num">${q.id}</span>${esc(L(q))}${q.many ? ` <em>(${esc(t("many"))})</em>` : ""}</legend>
    <div class="opts">${opts}</div>${writeIn}${open}</fieldset>`;
}
function interviewHtml() {
  const sec = sectionOf(app.section);
  const counts = id => app.responses.filter(r => r.section === id).length;
  const picks = PROFILES.map(s => `<button class="profile" type="button" data-pick="${s.id}" aria-pressed="${s.id === app.section}">
    <span class="tag">${s.id}</span><span>${esc(L(s.title))}</span><span class="n">${counts(s.id)}</span></button>`).join("");
  const d = draft(app.section);
  return `<div class="stack"><h2>${esc(t("who"))}</h2><div class="profiles">${picks}</div></div>
    <div class="note"><strong>${esc(t("say"))}.</strong> ${esc(t("intro"))}</div>
    <p class="muted small">${esc(t("tip"))}${app.section === "F" ? " " + esc(t("legalNote")) : ""}</p>
    <form id="iform" class="stack">
      <h2>${esc(L(sec.title))}</h2>
      ${sec.questions.map(q => questionHtml(q, app.section)).join("")}
      <h2 style="margin-top:12px">${esc(t("closing"))}</h2>
      ${CLOSING.questions.map(q => questionHtml(q, app.section)).join("")}
      <div class="block"><label for="i-notes"><strong>${esc(t("notes"))}</strong></label>
        <p class="muted small">${esc(t("notesHint"))}</p>
        <textarea id="i-notes" data-notes="1">${esc(d.notes)}</textarea></div>
      <div class="savebar row">
        <button class="btn primary" id="i-save" type="submit">${esc(t("save"))}</button>
        <button class="btn" id="i-clear" type="button">${esc(t("clear"))}</button>
        <span class="progress" id="i-progress"></span>
      </div>
    </form>`;
}
function answeredCount(section) {
  return Object.values(draft(section).answers).filter(a => a.choices.length || a.other).length;
}
function updateProgress() {
  const el = document.getElementById("i-progress");
  if (!el) return;
  const total = sectionOf(app.section).questions.length + CLOSING.questions.length;
  el.textContent = answeredCount(app.section) + " / " + total + " " + t("answered");
}
function saveDrafts() { writeLocal("miniSocDrafts", app.drafts); }

function barsHtml(q, rs) {
  const given = rs.map(r => r.answers?.[q.id]).filter(a => a && (a.choices?.length || a.other));
  const n = given.length;
  const rows = q.options.map(o => {
    const c = given.filter(a => (a.choices || []).includes(o.en)).length;
    const w = n ? Math.round(c / n * 100) : 0;
    return `<div class="barrow"><span>${esc(L(o))}</span><span class="count">${c} ${esc(t("of"))} ${n}</span>
      <div class="track"><div class="fill" style="width:${w}%"></div></div></div>`;
  }).join("");
  const texts = given.map(a => a.other).filter(Boolean);
  const list = texts.length ? `<div><p class="small"><strong>${esc(t("otherAnswers"))}</strong></p><ul class="quotes">${texts.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "";
  return `<div class="block"><h3>${esc(L(q))}</h3><div class="bars">${rows}</div>${list}</div>`;
}
function resultsHtml() {
  const sec = sectionOf(app.resultSection);
  const rs = app.responses.filter(r => r.section === app.resultSection);
  const fmt = new Intl.DateTimeFormat(app.lang, { dateStyle: "medium" });
  const list = [...rs].sort((a, b) => String(b.date).localeCompare(String(a.date))).map(r => `<div class="card">
      <div class="row"><strong>${esc(fmt.format(new Date(r.date)))}</strong><span class="spacer"></span>
      <button class="btn${app.armed === r.id ? " danger" : ""}" type="button" data-delr="${esc(r.id)}">${esc(t(app.armed === r.id ? "confirm" : "remove"))}</button></div>
      ${r.notes ? `<p class="small muted">${esc(r.notes)}</p>` : ""}</div>`).join("");
  const body = rs.length
    ? `<p class="note">${esc(t("small"))}</p>${[...sec.questions, ...CLOSING.questions].map(q => barsHtml(q, rs)).join("")}
       <div class="block"><h3>${esc(t("savedList"))}</h3>${list}</div>`
    : `<p class="muted">${esc(t("emptyResults"))}</p>`;
  return `<div class="stack"><h2>${esc(t("resultsTitle"))}</h2>
      <div class="filters"><select id="result-type" aria-label="${esc(t("allTypes"))}">${typeOptions(app.resultSection, false)}</select>
      ${app.responses.length ? `<button class="btn" id="export" type="button">${esc(t("exportCsv"))}</button>` : ""}</div>
      <p class="muted small">${esc(t("interviews"))}${rs.length}</p></div>${body}`;
}
function csvCell(v) { return '"' + String(v ?? "").replace(/"/g, '""') + '"'; }
function buildCsv() {
  const rows = [["interview", "date", "type", "question_id", "question", "choices", "written_answer"]];
  for (const r of app.responses) {
    const sec = sectionOf(r.section);
    if (!sec) continue;
    for (const q of [...sec.questions, ...CLOSING.questions]) {
      const a = r.answers?.[q.id];
      if (a) rows.push([r.id, r.date, r.section, q.id, q.en, (a.choices || []).join("; "), a.other || ""]);
    }
    if (r.notes) rows.push([r.id, r.date, r.section, "notes", "Interview notes", "", r.notes]);
  }
  return "﻿" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}

// Supabase returns errors instead of throwing them, so writes go through this check.
const TABLES = { responses: "interviews", contacts: "contacts" };
async function checked(query) {
  const { error } = await query;
  if (error) throw error;
  await loadAll();
}
function insertRow(col, body) { return checked(sb.from(TABLES[col]).insert(body)); }
function patchRow(col, id, body) { return checked(sb.from(TABLES[col]).update(body).eq("id", id)); }
function dropRow(col, id) { return checked(sb.from(TABLES[col]).delete().eq("id", id)); }
function writeFailed() { toast(t("saveFailed")); }
function downloadCsv() {
  const url = URL.createObjectURL(new Blob([buildCsv()], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = "mini-soc-interviews.csv";
  link.click();
  URL.revokeObjectURL(url);
  toast(t("exported"));
}

document.addEventListener("click", async e => {
  const el = e.target;
  const btn = el.closest?.("button");
  if (el.matches?.('fieldset.q input[type="radio"], fieldset.q input[type="checkbox"]')) {
    const q = el.name, d = draft(app.section);
    const a = d.answers[q] || (d.answers[q] = { choices: [], other: "" });
    if (el.type === "radio") {
      if (a.choices.includes(el.value)) { el.checked = false; a.choices = []; }
      else a.choices = [el.value];
    } else {
      a.choices = a.choices.filter(v => v !== el.value);
      if (el.checked) a.choices.push(el.value);
    }
    const box = document.getElementById(q + "-text");
    if (box) {
      const on = [...document.querySelectorAll(`input[name="${q}"][data-text="1"]`)].some(i => i.checked);
      box.hidden = !on;
      if (!on) { a.other = ""; box.value = ""; } else if (el.dataset.text === "1" && el.checked) box.focus();
    }
    saveDrafts(); updateProgress();
    return;
  }
  if (!btn) return;
  if (btn.id === "lang-fr" || btn.id === "lang-en") {
    app.lang = btn.id.slice(-2); writeLocal("miniSocLang", app.lang); render(); return;
  }
  if (btn.id.startsWith("tab-")) { setTab(btn.id.slice(4)); return; }
  if (btn.dataset.pick) { app.section = btn.dataset.pick; render(); return; }
  if (btn.dataset.start) { app.section = btn.dataset.start; setTab("interview"); window.scrollTo(0, 0); return; }
  if (btn.id === "i-clear") { delete app.drafts[app.section]; saveDrafts(); render(); return; }
  if (btn.id === "export") { downloadCsv(); return; }
  if (btn.id === "signout") { await sb.auth.signOut(); return; }
  for (const [attr, col] of [["delc", "contacts"], ["delr", "responses"]]) {
    const id = btn.dataset[attr];
    if (!id) continue;
    if (app.armed !== id) { app.armed = id; render(); return; }
    app.armed = null;
    try { await dropRow(col, id); } catch { writeFailed(); }
    render();
    return;
  }
});
document.addEventListener("input", e => {
  const el = e.target, d = draft(app.section);
  if (el.dataset.notes) d.notes = el.value;
  const q = el.dataset.other || el.dataset.open;
  if (q) (d.answers[q] || (d.answers[q] = { choices: [], other: "" })).other = el.value;
  if (el.dataset.notes || q) { saveDrafts(); updateProgress(); }
});
document.addEventListener("change", async e => {
  const el = e.target;
  if (el.id === "filter-type") { app.filterType = el.value; render(); }
  if (el.id === "filter-status") { app.filterStatus = el.value; render(); }
  if (el.id === "result-type") { app.resultSection = el.value; render(); }
  if (el.dataset.status) {
    try { await patchRow("contacts", el.dataset.status, { status: el.value }); } catch { writeFailed(); render(); }
  }
});
document.addEventListener("submit", async e => {
  e.preventDefault();
  if (e.target.id === "login") {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const btn = document.getElementById("login-submit");
    btn.disabled = true;
    app.loginEmail = email; app.loginError = "";
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { app.loginError = t("badLogin"); render(); }
  }
  if (e.target.id === "addc") {
    const name = document.getElementById("c-name").value.trim();
    if (!name) { toast(t("needName")); return; }
    const key = app.lang === "fr" ? "why_fr" : "why_en";
    const body = { name, section: document.getElementById("c-type").value, [key]: document.getElementById("c-why").value.trim() };
    try { await insertRow("contacts", body); toast(t("added")); render(); } catch { writeFailed(); }
  }
  if (e.target.id === "iform") {
    if (!answeredCount(app.section)) { toast(t("needAnswer")); return; }
    const d = draft(app.section), btn = document.getElementById("i-save");
    btn.disabled = true; btn.textContent = t("saving");
    const answers = Object.fromEntries(Object.entries(d.answers).filter(([, a]) => a.choices.length || a.other));
    const body = { section: app.section, lang: app.lang, answers, notes: d.notes.trim() };
    try {
      await insertRow("responses", body);
      delete app.drafts[app.section]; saveDrafts();
      toast(t("saved")); render(); window.scrollTo(0, 0);
    } catch {
      writeFailed();
      btn.disabled = false; btn.textContent = t("save");
    }
  }
});
function setTab(tab) {
  app.tab = tab; app.armed = null;
  try { history.replaceState(null, "", "#" + tab); } catch {}
  render();
}

async function loadAll() {
  const [interviews, contacts] = await Promise.all([
    sb.from("interviews").select("*").order("created_at").limit(1000),
    sb.from("contacts").select("*").limit(1000)
  ]);
  app.stale = Boolean(interviews.error || contacts.error);
  if (!app.stale) {
    app.responses = interviews.data.map(r => ({ ...r, date: r.created_at }));
    app.contacts = contacts.data;
  }
  // Don't rebuild the form while someone is answering.
  if (app.tab === "interview") renderChrome(); else render();
}
async function enter(userId) {
  app.userId = userId;
  const { data: allowed, error } = await sb.rpc("is_team_member");
  if (!error && !allowed) {
    app.loginError = t("notTeam");
    await sb.auth.signOut();
    return;
  }
  app.mode = "shared";
  render();
  await loadAll();
  if (!app.channel) {
    app.channel = sb.channel("team-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "interviews" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, loadAll)
      .subscribe();
  }
}
function leave() {
  if (app.channel) sb.removeChannel(app.channel);
  app.channel = null; app.userId = null;
  app.responses = []; app.contacts = []; app.stale = false;
  app.drafts = {}; saveDrafts();
  app.mode = "signedout"; render();
}
function connect() {
  sb = window.supabase.createClient(CONFIG.url, CONFIG.key);
  // Supabase calls can't run inside this callback, so they start right after it.
  sb.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
      if (!session) leave();
      else if (session.user.id !== app.userId) enter(session.user.id);
    }, 0);
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && app.userId) loadAll();
  });
}

app.lang = readLocal("miniSocLang", "fr");
app.drafts = readLocal("miniSocDrafts", {});
if (["contacts", "interview", "results"].includes(location.hash.slice(1))) app.tab = location.hash.slice(1);
render();
try {
  connect();
} catch {
  app.mode = "signedout"; app.loginError = t("unreachable"); render();
}
