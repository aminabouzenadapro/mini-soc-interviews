const TARGETS = { A: 5, B: 3, C: 2, D: 2, E: 2, F: 1, G: 1 };
const STATUSES = ["todo", "contacted", "scheduled", "done", "declined"];
const H_STATUSES = ["untested", "supported", "mixed", "rejected"];
const VIEWS = ["overview", "people", "interview", "results", "questions"];
const ICONS = {
  overview: "M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z",
  people: "M16 11a4 4 0 1 0-8 0M4 20c1-4 4-6 8-6s7 2 8 6",
  interview: "M5 5h14v11H9l-4 4zM9 9h6M9 12h4",
  results: "M5 20V10M12 20V4M19 20v-7",
  questions: "M4 7h10M4 12h16M4 17h7M17 15l3 3-3 3"
};
const PROFILES = SECTIONS.filter(s => s.id !== "Z").map(s => ({ id: s.id, title: s.title }));

const app = {
  uiLang: "en", qLang: "fr", view: "overview", mode: "loading",
  section: "A", resultSection: "A", editSection: "A",
  responses: [], contacts: [], questions: [], hypotheses: [],
  needsUpdate: false, stale: false, armed: null,
  peopleStatus: "", peopleType: "", peopleSearch: "",
  filterQ: "", filterOpt: "", startContact: null,
  drafts: {}, userId: null, channel: null, loginEmail: "", loginError: ""
};
let sb = null;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function t(k) { return UI[app.uiLang][k]; }
function L(o, lang = app.uiLang) { return o[lang] || o.en || o.fr || ""; }
function readLocal(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg; el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 3200);
}
function today() { return new Date().toISOString().slice(0, 10); }
function profile(id) { return PROFILES.find(p => p.id === id); }
function builtInQuestions() {
  return SECTIONS.flatMap(s => s.questions.map((q, i) => ({ ...q, section: s.id, position: i + 1, archived: false })));
}
function questionsOf(section, withHidden = false) {
  return app.questions
    .filter(q => q.section === section && (withHidden || !q.archived))
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}
function interviewsOf(section) { return app.responses.filter(r => r.section === section); }
function answerOf(r, id) {
  const a = r.answers?.[id];
  return a && (a.choices?.length || a.other) ? a : null;
}
function draft(section) {
  return app.drafts[section] || (app.drafts[section] = { answers: {}, notes: "", quote: "", need: null });
}
function saveDrafts() { writeLocal("miniSocDrafts", app.drafts); }

// ---------- Page frame ----------
function renderChrome() {
  document.documentElement.lang = app.uiLang;
  const signedIn = app.mode === "shared";
  const nav = document.getElementById("nav");
  nav.hidden = !signedIn;
  document.querySelector(".shell").classList.toggle("signed-in", signedIn);
  nav.innerHTML = VIEWS.map(v => `<button type="button" data-action="go" data-view="${v}" ${app.view === v || (app.view === "report" && v === "results") ? 'aria-current="page"' : ""}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[v]}"/></svg><span>${esc(t("nav")[v])}</span></button>`).join("");
  const out = document.getElementById("signout");
  out.hidden = !signedIn; out.textContent = t("signOut");
  for (const l of ["en", "fr"]) document.getElementById("lang-" + l).setAttribute("aria-pressed", String(app.uiLang === l));
}
function banner() {
  return (app.stale ? `<p class="alert">${esc(t("unreachable"))}</p>` : "")
    + (app.needsUpdate ? `<p class="alert">${esc(t("needsUpdate"))}</p>` : "");
}
function render() {
  renderChrome();
  const view = document.getElementById("view");
  if (app.mode === "loading") { view.innerHTML = `<p class="muted">${esc(t("loading"))}</p>`; return; }
  if (app.mode === "signedout") { view.innerHTML = loginHtml(); return; }
  const html = { overview: overviewHtml, people: peopleHtml, interview: interviewHtml, results: resultsHtml, questions: questionsHtml, report: reportHtml }[app.view]();
  view.innerHTML = banner() + html;
  if (app.view === "interview") updateProgress();
}
function pageHead(title, intro, extra = "") {
  return `<div class="page-head"><div><h1>${esc(title)}</h1><p class="muted">${esc(intro)}</p></div>${extra}</div>`;
}
function loginHtml() {
  return `<form class="panel login" id="login">
      <h1>${esc(t("signIn"))}</h1>
      <p class="muted">${esc(t("signInIntro"))}</p>
      ${app.loginError ? `<p class="alert">${esc(app.loginError)}</p>` : ""}
      <label class="field"><span>${esc(t("email"))}</span>
        <input type="text" inputmode="email" id="login-email" autocomplete="username" required value="${esc(app.loginEmail)}"></label>
      <label class="field"><span>${esc(t("password"))}</span>
        <input type="password" id="login-password" autocomplete="current-password" required></label>
      <button class="btn primary" id="login-submit" type="submit">${esc(t("signIn"))}</button>
    </form>`;
}

// ---------- Research signals ----------
function countIn(section, id, accepted) {
  const given = interviewsOf(section).map(r => answerOf(r, id)).filter(Boolean);
  return { n: given.length, c: given.filter(a => (a.choices || []).some(x => accepted.includes(x))).length };
}
function topChoice(section, id) {
  const counts = {};
  for (const r of interviewsOf(section)) for (const c of answerOf(r, id)?.choices || []) counts[c] = (counts[c] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  const q = app.questions.find(x => x.id === id);
  const opt = q?.options.find(o => o.en === top[0]);
  return { label: opt ? L(opt) : top[0], c: top[1], n: interviewsOf(section).filter(r => answerOf(r, id)).length };
}
function signalCard(label, value, sub, n) {
  return `<div class="signal"><div class="signal-value">${esc(value)}</div><div class="signal-label">${esc(label)}</div>
    ${sub ? `<div class="muted small">${esc(sub)}</div>` : ""}
    ${n > 0 && n < 3 ? `<div class="tag warm">${esc(t("early"))}</div>` : ""}</div>`;
}
function ratioCard(label, r) {
  return signalCard(label, r.n ? `${r.c} ${t("of")} ${r.n}` : "–", r.n ? "" : t("noAnswers"), r.n);
}
function topCard(label, top) {
  return signalCard(label, top ? top.label : "–", top ? `${top.c} ${t("of")} ${top.n}` : t("noAnswers"), top ? top.n : 0);
}
function signalsHtml() {
  const scores = app.responses.map(r => r.need_score).filter(Boolean);
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "–";
  const payers = countIn("A", "A10", ["Less than 20,000 DA", "20,000–50,000 DA", "50,000–100,000 DA", "More than 100,000 DA"]);
  return ratioCard(t("interest"), countIn("A", "A8", ["Very interested", "Somewhat interested"]))
    + ratioCard(t("payers"), payers)
    + topCard(t("topPrice"), topChoice("A", "A10"))
    + topCard(t("topWorry"), topChoice("A", "A9"))
    + ratioCard(t("logs"), countIn("B", "B7", ["Yes", "Only if hosted in Algeria", "Only with strict conditions"]))
    + signalCard(t("needScore"), scores.length ? `${avg} / 5` : "–", scores.length ? "" : t("noAnswers"), scores.length);
}
function nextSteps() {
  const steps = [];
  const due = app.contacts.filter(c => c.next_date && c.next_date <= today() && !["done", "declined"].includes(c.status)).length;
  const scheduled = app.contacts.filter(c => c.status === "scheduled").length;
  const toReach = app.contacts.filter(c => c.status === "todo").length;
  if (due) steps.push(t("stepFollow")(due));
  if (scheduled) steps.push(t("stepScheduled")(scheduled));
  const gap = PROFILES.map(p => ({ p, gap: TARGETS[p.id] - interviewsOf(p.id).length })).sort((a, b) => b.gap - a.gap)[0];
  if (gap.gap > 0) steps.push(t("stepGap")(L(gap.p.title)));
  if (toReach) steps.push(t("stepReach")(toReach));
  if (app.responses.length) steps.push(t("stepTest"));
  return steps;
}

// ---------- Overview ----------
function assumptionsHtml(printing = false) {
  const items = [...app.hypotheses].sort((a, b) => a.position - b.position).map(h => {
    const status = t("hStatus")[h.status] || h.status;
    if (printing) return `<li><strong>${esc(h.statement)}</strong> <em>(${esc(status)})</em>${h.evidence ? `<br>${esc(h.evidence)}` : ""}</li>`;
    return `<button class="assumption" type="button" data-action="editAssumption" data-id="${esc(h.id)}">
      <span class="pill h-${esc(h.status)}">${esc(status)}</span><span class="assumption-text">${esc(h.statement)}</span>
      ${h.evidence ? `<span class="muted small">${esc(h.evidence)}</span>` : ""}</button>`;
  }).join("");
  return printing ? `<ul>${items}</ul>` : `<div class="stack-sm">${items}</div>`;
}
function overviewHtml() {
  const goal = Object.values(TARGETS).reduce((a, b) => a + b, 0);
  const done = app.responses.length;
  const toReach = app.contacts.filter(c => c.status === "todo").length;
  const due = app.contacts.filter(c => c.next_date && c.next_date <= today() && !["done", "declined"].includes(c.status)).length;
  const rows = PROFILES.map(p => {
    const n = interviewsOf(p.id).length, target = TARGETS[p.id];
    return `<div class="progress-row"><div class="progress-name">${esc(L(p.title))}</div>
      <div class="meter"><div style="width:${Math.min(100, n / target * 100)}%"></div></div>
      <div class="mono small">${n}/${target}</div>
      <button class="btn small" type="button" data-action="startInterview" data-section="${p.id}">${esc(t("start"))}</button></div>`;
  }).join("");
  const steps = nextSteps().map(s => `<li>${esc(s)}</li>`).join("");
  return pageHead(t("overviewTitle"), t("overviewIntro"))
    + `<div class="kpis">
        <div class="kpi"><strong>${done}<span>/${goal}</span></strong><span>${esc(t("done"))}</span></div>
        <div class="kpi"><strong>${toReach}</strong><span>${esc(t("contactsToReach"))}</span></div>
        <div class="kpi"><strong>${due}</strong><span>${esc(t("followUps"))}</span></div>
      </div>
      <div class="two">
        <section class="panel"><h2>${esc(t("nextSteps"))}</h2><ol class="steps">${steps}</ol></section>
        <section class="panel"><h2>${esc(t("byType"))}</h2><div class="stack-sm">${rows}</div></section>
      </div>
      <section class="panel"><h2>${esc(t("signals"))}</h2><p class="muted small">${esc(t("signalsIntro"))}</p>
        <div class="signals">${signalsHtml()}</div></section>
      <section class="panel"><div class="panel-head"><div><h2>${esc(t("assumptions"))}</h2><p class="muted small">${esc(t("assumptionsIntro"))}</p></div>
        <button class="btn" type="button" data-action="editAssumption" data-id="">${esc(t("addAssumption"))}</button></div>
        ${assumptionsHtml()}</section>`;
}

// ---------- People to contact ----------
function peopleHtml() {
  const search = app.peopleSearch.toLowerCase();
  const inType = app.contacts.filter(c => !app.peopleType || c.section === app.peopleType);
  const list = inType
    .filter(c => (!app.peopleStatus || c.status === app.peopleStatus) && (!search || `${c.name} ${c.person || ""}`.toLowerCase().includes(search)))
    .sort((a, b) => a.sort_order - b.sort_order || String(a.name).localeCompare(String(b.name)));
  const chip = (value, label) => {
    const n = value ? inType.filter(c => c.status === value).length : inType.length;
    return `<button type="button" class="chip" data-action="peopleStatus" data-status="${value}" aria-pressed="${app.peopleStatus === value}">${esc(label)} <span>${n}</span></button>`;
  };
  const cards = list.map(c => {
    const why = (app.uiLang === "fr" ? c.why_fr : c.why_en) || c.why_en || c.why_fr || "";
    const due = c.next_date && c.next_date <= today() && !["done", "declined"].includes(c.status);
    return `<article class="person">
      <div class="person-top"><span class="pill s-${esc(c.status)}">${esc(t("status")[c.status])}</span>
        ${due ? `<span class="pill warmth">${esc(t("due"))}</span>` : ""}</div>
      <h3>${esc(c.name)}</h3>
      <p class="kind">${esc(L(profile(c.section)?.title || {}))}</p>
      ${c.person ? `<p class="small"><strong>${esc(c.person)}</strong>${c.reach ? ` · ${esc(c.reach)}` : ""}</p>` : ""}
      ${why ? `<p class="muted small">${esc(why)}</p>` : ""}
      <div class="person-actions">
        <button class="btn primary small" type="button" data-action="message" data-id="${esc(c.id)}">${esc(t("message"))}</button>
        <button class="btn small" type="button" data-action="interviewContact" data-id="${esc(c.id)}">${esc(t("interviewBtn"))}</button>
        <button class="btn quiet small" type="button" data-action="editContact" data-id="${esc(c.id)}">${esc(t("details"))}</button>
      </div></article>`;
  }).join("");
  const how = t("how").map(s => `<li>${esc(s)}</li>`).join("");
  return pageHead(t("peopleTitle"), t("peopleIntro"), `<button class="btn primary" type="button" data-action="editContact" data-id="">${esc(t("addContact"))}</button>`)
    + `<ol class="how">${how}</ol>
      <div class="toolbar">
        <select id="people-type" aria-label="${esc(t("type"))}">${typeOptions(app.peopleType, t("allTypes"))}</select>
        <input type="search" id="people-search" placeholder="${esc(t("search"))}" aria-label="${esc(t("search"))}" value="${esc(app.peopleSearch)}">
      </div>
      <div class="chips">${chip("", t("all"))}${STATUSES.map(s => chip(s, t("status")[s])).join("")}</div>
      <div class="people" id="people-list">${cards || `<p class="muted">${esc(app.contacts.length ? t("none") : t("empty"))}</p>`}</div>`;
}
function typeOptions(selected, allLabel) {
  const all = allLabel ? `<option value="">${esc(allLabel)}</option>` : "";
  return all + PROFILES.map(s => `<option value="${s.id}"${s.id === selected ? " selected" : ""}>${esc(L(s.title))}</option>`).join("");
}
function contactDialog(id) {
  const c = app.contacts.find(x => x.id === id) || { section: app.peopleType || "A", status: "todo" };
  const why = (app.uiLang === "fr" ? c.why_fr : c.why_en) || c.why_en || c.why_fr || "";
  const statusOpts = STATUSES.map(s => `<option value="${s}"${s === c.status ? " selected" : ""}>${esc(t("status")[s])}</option>`).join("");
  openDialog(`<form id="contact-form" data-id="${esc(id)}">
    <h2>${esc(c.name || t("addContact"))}</h2>
    <label class="field"><span>${esc(t("name"))}</span><input type="text" id="c-name" value="${esc(c.name)}"></label>
    <div class="grid2">
      <label class="field"><span>${esc(t("type"))}</span><select id="c-type">${typeOptions(c.section)}</select></label>
      <label class="field"><span>${esc(t("statusLabel"))}</span><select id="c-status">${statusOpts}</select></label>
    </div>
    <div class="grid2">
      <label class="field"><span>${esc(t("person"))}</span><input type="text" id="c-person" value="${esc(c.person)}"></label>
      <label class="field"><span>${esc(t("reach"))}</span><input type="text" id="c-reach" value="${esc(c.reach)}"></label>
    </div>
    <label class="field"><span>${esc(t("nextDate"))}</span><input type="date" id="c-date" value="${esc(c.next_date)}"></label>
    <label class="field"><span>${esc(t("why"))}</span><textarea id="c-why" rows="2">${esc(why)}</textarea></label>
    <label class="field"><span>${esc(t("notesLabel"))}</span><textarea id="c-notes" rows="3">${esc(c.notes)}</textarea></label>
    ${c.link ? `<p class="small"><a href="${esc(c.link)}" target="_blank" rel="noopener">${esc(t("source"))}</a></p>` : ""}
    <div class="dialog-actions">
      <button class="btn primary" type="submit">${esc(t("save"))}</button>
      <button class="btn" type="button" data-action="closeDialog">${esc(t("cancel"))}</button>
      ${id ? `<button class="btn danger-quiet" type="button" data-action="deleteContact" data-id="${esc(id)}">${esc(t(app.armed === id ? "confirm" : "remove"))}</button>` : ""}
    </div></form>`);
}
function messageDialog(id) {
  const c = app.contacts.find(x => x.id === id);
  const text = UI[app.qLang][["A", "B", "C"].includes(c.section) ? "msgBuyer" : "msgExpert"];
  openDialog(`<h2>${esc(t("messageTitle"))}</h2>
    <p class="muted small">${esc(c.name)}. ${esc(t("messageHint"))}</p>
    <div class="seg" role="group"><button type="button" data-action="messageLang" data-lang="fr" data-id="${esc(id)}" aria-pressed="${app.qLang === "fr"}">FR</button>
      <button type="button" data-action="messageLang" data-lang="en" data-id="${esc(id)}" aria-pressed="${app.qLang === "en"}">EN</button></div>
    <textarea id="msg-text" rows="11">${esc(text)}</textarea>
    <div class="dialog-actions">
      <button class="btn primary" type="button" data-action="copyMessage" data-id="${esc(c.status === "todo" ? id : "")}">${esc(t(c.status === "todo" ? "copyMarked" : "copy"))}</button>
      <button class="btn" type="button" data-action="closeDialog">${esc(t("close"))}</button>
    </div>`);
}
function assumptionDialog(id) {
  const h = app.hypotheses.find(x => x.id === id) || { status: "untested" };
  const opts = H_STATUSES.map(s => `<option value="${s}"${s === h.status ? " selected" : ""}>${esc(t("hStatus")[s])}</option>`).join("");
  openDialog(`<form id="assumption-form" data-id="${esc(id)}">
    <h2>${esc(t(id ? "assumptions" : "addAssumption"))}</h2>
    <label class="field"><span>${esc(t("assumptionText"))}</span><textarea id="h-text" rows="2" required>${esc(h.statement)}</textarea></label>
    <label class="field"><span>${esc(t("statusLabel"))}</span><select id="h-status">${opts}</select></label>
    <label class="field"><span>${esc(t("evidence"))}</span><textarea id="h-evidence" rows="3">${esc(h.evidence)}</textarea></label>
    <div class="dialog-actions">
      <button class="btn primary" type="submit">${esc(t("save"))}</button>
      <button class="btn" type="button" data-action="closeDialog">${esc(t("cancel"))}</button>
      ${id ? `<button class="btn danger-quiet" type="button" data-action="deleteAssumption" data-id="${esc(id)}">${esc(t(app.armed === id ? "confirm" : "remove"))}</button>` : ""}
    </div></form>`);
}

// ---------- Interview ----------
function questionHtml(q, section, number) {
  const a = draft(section).answers[q.id] || { choices: [], other: "" };
  const type = q.many ? "checkbox" : "radio";
  const opts = q.options.map((o, i) => `<label class="opt"><input type="${type}" id="${q.id}-${i}" name="${q.id}" value="${esc(o.en)}" data-text="${o.text ? 1 : 0}"${a.choices.includes(o.en) ? " checked" : ""}>${esc(L(o, app.qLang))}</label>`).join("");
  const showText = q.options.some(o => o.text && a.choices.includes(o.en));
  const writeIn = q.options.some(o => o.text) ? `<input class="othertext" type="text" id="${q.id}-text" data-other="${q.id}" placeholder="${esc(t("otherText"))}" aria-label="${esc(t("otherText"))}" value="${esc(a.other)}"${showText ? "" : " hidden"}>` : "";
  const open = q.options.length ? "" : `<textarea id="${q.id}-open" data-open="${q.id}" rows="3" aria-label="${esc(L(q, app.qLang))}">${esc(a.other)}</textarea>`;
  return `<fieldset class="q" data-q="${q.id}"><legend><span class="num">${number}</span><span>${esc(L(q, app.qLang))}${q.many ? ` <em>(${esc(UI[app.qLang].many)})</em>` : ""}</span></legend>
    <div class="opts">${opts}</div>${writeIn}${open}</fieldset>`;
}
function allQuestions(section) { return [...questionsOf(section), ...questionsOf("Z")]; }
function interviewHtml() {
  const d = draft(app.section);
  const pick = PROFILES.map(s => `<button class="chip" type="button" data-action="pickSection" data-section="${s.id}" aria-pressed="${s.id === app.section}">${esc(L(s.title))} <span>${interviewsOf(s.id).length}</span></button>`).join("");
  const main = questionsOf(app.section);
  const closing = questionsOf("Z");
  const needs = [1, 2, 3, 4, 5].map(n => `<label class="opt score"><input type="radio" name="need" value="${n}" data-need="1"${d.need === n ? " checked" : ""}>${n}</label>`).join("");
  const person = app.startContact ? app.contacts.find(c => c.id === app.startContact) : null;
  return `<div class="page-head"><div><h1>${esc(t("interviewTitle"))}</h1></div>
      <div class="lang-pick"><span class="muted small">${esc(t("questionsIn"))}</span>
        <div class="seg" role="group"><button type="button" data-action="qLang" data-lang="fr" aria-pressed="${app.qLang === "fr"}">FR</button>
        <button type="button" data-action="qLang" data-lang="en" aria-pressed="${app.qLang === "en"}">EN</button></div></div></div>
    ${person ? `<p class="callout">${esc(t("withContact")(person.name))} <button class="link" type="button" data-action="clearContact">${esc(t("notThem"))}</button></p>` : ""}
    <div><h2 class="label">${esc(t("who"))}</h2><div class="chips">${pick}</div></div>
    <div class="callout"><strong>${esc(UI[app.qLang].say)}</strong><p>${esc(UI[app.qLang].intro)}</p></div>
    <p class="muted small">${esc(t("tip"))}${app.section === "F" ? " " + esc(t("legalNote")) : ""}</p>
    <form id="iform" class="panel form-panel">
      <h2>${esc(L(profile(app.section).title, app.qLang))}</h2>
      ${main.map((q, i) => questionHtml(q, app.section, i + 1)).join("")}
      <h2>${esc(UI[app.qLang].closing)}</h2>
      ${closing.map((q, i) => questionHtml(q, app.section, main.length + i + 1)).join("")}
      <h2>${esc(t("wrapTitle"))}</h2>
      <fieldset class="q"><legend><span>${esc(t("needLabel"))}</span></legend>
        <p class="muted small">${esc(t("needHint"))}</p><div class="opts">${needs}</div></fieldset>
      <label class="field"><span>${esc(t("quote"))}</span><small class="muted">${esc(t("quoteHint"))}</small>
        <textarea id="i-quote" rows="2" data-quote="1">${esc(d.quote)}</textarea></label>
      <label class="field"><span>${esc(t("notes"))}</span><small class="muted">${esc(t("notesHint"))}</small>
        <textarea id="i-notes" rows="4" data-notes="1">${esc(d.notes)}</textarea></label>
      <div class="savebar">
        <button class="btn primary" id="i-save" type="submit">${esc(t("saveInterview"))}</button>
        <button class="btn quiet" type="button" data-action="clearDraft">${esc(t("clear"))}</button>
        <span class="mono small muted" id="i-progress"></span>
      </div>
    </form>`;
}
function answeredCount(section) {
  return Object.values(draft(section).answers).filter(a => a.choices.length || a.other).length;
}
function updateProgress() {
  const el = document.getElementById("i-progress");
  if (el) el.textContent = `${answeredCount(app.section)} / ${allQuestions(app.section).length} ${t("answered")}`;
}

// ---------- Results ----------
function filteredInterviews() {
  const rs = interviewsOf(app.resultSection);
  if (!app.filterQ || !app.filterOpt) return rs;
  return rs.filter(r => (answerOf(r, app.filterQ)?.choices || []).includes(app.filterOpt));
}
function barsHtml(q, rs) {
  const given = rs.map(r => answerOf(r, q.id)).filter(Boolean);
  const n = given.length;
  const labels = q.options.map(o => ({ key: o.en, label: L(o) }));
  for (const a of given) for (const c of a.choices || [])
    if (!labels.some(l => l.key === c)) labels.push({ key: c, label: `${c} (${t("oldOption")})` });
  const rows = labels
    .map(l => ({ ...l, c: given.filter(a => (a.choices || []).includes(l.key)).length }))
    .sort((a, b) => b.c - a.c)
    .map((l, i) => `<div class="bar${i === 0 && l.c ? " lead" : ""}"><span>${esc(l.label)}</span><span class="mono small">${l.c} ${esc(t("of"))} ${n}</span>
      <div class="meter"><div style="width:${n ? l.c / n * 100 : 0}%"></div></div></div>`).join("");
  const texts = given.map(a => a.other).filter(Boolean);
  const list = texts.length ? `<div><p class="small"><strong>${esc(t("writtenAnswers"))}</strong></p><ul class="quotes">${texts.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "";
  return `<section class="panel result"><h3>${esc(L(q))}</h3><div class="bars">${rows}</div>${list}</section>`;
}
function interviewDetail(r) {
  const fmt = new Intl.DateTimeFormat(app.uiLang, { dateStyle: "medium" });
  const lines = allQuestions(r.section).filter(q => answerOf(r, q.id)).map(q => {
    const a = answerOf(r, q.id);
    const labels = (a.choices || []).map(c => { const o = q.options.find(x => x.en === c); return o ? L(o) : c; });
    return `<dt>${esc(L(q))}</dt><dd>${esc([...labels, a.other].filter(Boolean).join(", "))}</dd>`;
  }).join("");
  return `<details class="saved"><summary><span>${esc(fmt.format(new Date(r.date)))}</span>${r.need_score ? `<span class="tag">${r.need_score}/5</span>` : ""}</summary>
    ${r.key_quote ? `<blockquote>${esc(r.key_quote)}</blockquote>` : ""}
    ${r.notes ? `<p class="small muted">${esc(r.notes)}</p>` : ""}
    <dl>${lines}</dl>
    <button class="btn danger-quiet small" type="button" data-action="deleteInterview" data-id="${esc(r.id)}">${esc(t(app.armed === r.id ? "confirm" : "remove"))}</button></details>`;
}
function resultsHtml() {
  const rs = filteredInterviews();
  const all = interviewsOf(app.resultSection);
  const qs = questionsOf(app.resultSection).filter(q => q.options.length);
  const fq = qs.find(q => q.id === app.filterQ);
  const qOpts = `<option value="">${esc(t("noFilter"))}</option>` + qs.map(q => `<option value="${q.id}"${q.id === app.filterQ ? " selected" : ""}>${esc(L(q))}</option>`).join("");
  const oOpts = fq ? `<option value="">${esc(t("anyAnswer"))}</option>` + fq.options.map(o => `<option value="${esc(o.en)}"${o.en === app.filterOpt ? " selected" : ""}>${esc(L(o))}</option>`).join("") : "";
  const quotes = rs.map(r => r.key_quote).filter(Boolean);
  const notes = rs.map(r => r.notes).filter(Boolean);
  const extra = `<div class="head-actions">
      <button class="btn" type="button" data-action="report">${esc(t("openReport"))}</button>
      ${app.responses.length ? `<button class="btn quiet" type="button" data-action="exportCsv">${esc(t("exportCsv"))}</button>` : ""}</div>`;
  const body = all.length ? `
      ${quotes.length ? `<section class="panel"><h2>${esc(t("quotes"))}</h2>${quotes.map(q => `<blockquote>${esc(q)}</blockquote>`).join("")}</section>` : ""}
      <div class="results-grid">${allQuestions(app.resultSection).map(q => barsHtml(q, rs)).join("")}</div>
      ${notes.length ? `<section class="panel"><h2>${esc(t("notesList"))}</h2><ul class="quotes">${notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul></section>` : ""}
      <section class="panel"><h2>${esc(t("savedList"))}</h2>${[...all].reverse().map(interviewDetail).join("")}</section>`
    : `<p class="muted">${esc(t("emptyResults"))}</p>`;
  return pageHead(t("resultsTitle"), t("resultsIntro"), extra)
    + `<div class="toolbar"><select id="result-type" aria-label="${esc(t("type"))}">${typeOptions(app.resultSection)}</select>
        <label class="inline"><span class="muted small">${esc(t("filter"))}</span><select id="filter-q">${qOpts}</select></label>
        ${fq ? `<select id="filter-opt" aria-label="${esc(t("anyAnswer"))}">${oOpts}</select>` : ""}
      </div>
      <p class="muted small">${esc(t("interviewsCount"))}${rs.length}</p>${body}`;
}
function reportHtml() {
  const date = new Intl.DateTimeFormat(app.uiLang, { dateStyle: "long" }).format(new Date());
  const counts = PROFILES.map(p => `<tr><td>${esc(L(p.title))}</td><td>${interviewsOf(p.id).length} / ${TARGETS[p.id]}</td></tr>`).join("");
  const sections = PROFILES.filter(p => interviewsOf(p.id).length).map(p => {
    const lines = allQuestions(p.id).filter(q => q.options.length).map(q => {
      const given = interviewsOf(p.id).map(r => answerOf(r, q.id)).filter(Boolean);
      if (!given.length) return "";
      const counted = {};
      for (const a of given) for (const c of a.choices || []) counted[c] = (counted[c] || 0) + 1;
      const top = Object.entries(counted).sort((a, b) => b[1] - a[1])[0];
      if (!top) return "";
      const opt = q.options.find(o => o.en === top[0]);
      return `<li>${esc(L(q))} <strong>${esc(opt ? L(opt) : top[0])}</strong> (${top[1]} ${esc(t("of"))} ${given.length})</li>`;
    }).join("");
    return `<h3>${esc(L(p.title))}</h3><ul>${lines}</ul>`;
  }).join("");
  const quotes = app.responses.map(r => r.key_quote).filter(Boolean).map(q => `<blockquote>${esc(q)}</blockquote>`).join("");
  return `<div class="page-head no-print"><button class="btn" type="button" data-action="go" data-view="results">${esc(t("back"))}</button>
      <button class="btn primary" type="button" data-action="print">${esc(t("print"))}</button></div>
    <article class="panel report">
      <h1>${esc(t("reportTitle"))}</h1>
      <p class="muted">Mini SOC as a Service · ${esc(t("reportDate"))} ${esc(date)}</p>
      <h2>${esc(t("reportCounts"))}</h2><table><tbody>${counts}</tbody></table>
      <h2>${esc(t("signals"))}</h2><div class="signals">${signalsHtml()}</div>
      <h2>${esc(t("assumptions"))}</h2>${assumptionsHtml(true)}
      <h2>${esc(t("reportTop"))}</h2>${sections || `<p>${esc(t("reportNoData"))}</p>`}
      ${quotes ? `<h2>${esc(t("quotes"))}</h2>${quotes}` : ""}
    </article>`;
}
function csvCell(v) { return '"' + String(v ?? "").replace(/"/g, '""') + '"'; }
function buildCsv() {
  const rows = [["interview", "date", "type", "question_id", "question", "choices", "written_answer"]];
  for (const r of app.responses) {
    for (const q of allQuestions(r.section)) {
      const a = answerOf(r, q.id);
      if (a) rows.push([r.id, r.date, r.section, q.id, q.en, (a.choices || []).join("; "), a.other || ""]);
    }
    if (r.need_score) rows.push([r.id, r.date, r.section, "need", "Strength of need (1-5)", r.need_score, ""]);
    if (r.key_quote) rows.push([r.id, r.date, r.section, "quote", "Most useful sentence", "", r.key_quote]);
    if (r.notes) rows.push([r.id, r.date, r.section, "notes", "Notes", "", r.notes]);
  }
  return "﻿" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}
function downloadCsv() {
  const url = URL.createObjectURL(new Blob([buildCsv()], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = "mini-soc-interviews.csv";
  link.click();
  URL.revokeObjectURL(url);
  toast(t("exported"));
}

// ---------- Question editor ----------
function questionsHtml() {
  const count = id => app.responses.filter(r => answerOf(r, id)).length;
  const tabs = [...PROFILES, { id: "Z", title: { en: "Closing questions", fr: "Questions finales" } }]
    .map(s => `<option value="${s.id}"${s.id === app.editSection ? " selected" : ""}>${esc(L(s.title))}</option>`).join("");
  const list = questionsOf(app.editSection, true);
  const rows = list.map((q, i) => `<article class="qrow${q.archived ? " off" : ""}">
      <div class="qrow-order">
        <button class="icon" type="button" aria-label="${esc(t("up"))}" data-action="moveQuestion" data-id="${q.id}" data-dir="-1" ${i === 0 ? "disabled" : ""}>↑</button>
        <button class="icon" type="button" aria-label="${esc(t("down"))}" data-action="moveQuestion" data-id="${q.id}" data-dir="1" ${i === list.length - 1 ? "disabled" : ""}>↓</button>
      </div>
      <div class="qrow-body">
        <p class="qrow-text">${esc(L(q))}</p>
        <p class="muted small">${q.options.length ? esc(q.options.map(o => L(o)).join(" · ")) : esc(t("openQuestion"))}</p>
        <p class="small"><span class="tag">${esc(t("answersCount")(count(q.id)))}</span>${q.archived ? ` <span class="tag warm">${esc(t("hidden"))}</span>` : ""}</p>
      </div>
      <div class="qrow-actions">
        <button class="btn small" type="button" data-action="editQuestion" data-id="${q.id}" ${app.needsUpdate ? "disabled" : ""}>${esc(t("edit"))}</button>
        <button class="btn quiet small" type="button" data-action="toggleQuestion" data-id="${q.id}" ${app.needsUpdate ? "disabled" : ""}>${esc(t(q.archived ? "show" : "hide"))}</button>
      </div></article>`).join("");
  return pageHead(t("questionsTitle"), t("questionsIntro"), `<button class="btn primary" type="button" data-action="editQuestion" data-id="" ${app.needsUpdate ? "disabled" : ""}>${esc(t("addQuestion"))}</button>`)
    + `<p class="callout">${esc(t("questionsWarn"))}</p>
      <div class="toolbar"><select id="edit-section" aria-label="${esc(t("type"))}">${tabs}</select></div>
      <div class="stack-sm">${rows}</div>`;
}
function choiceRow(o = {}) {
  return `<div class="choice">
    <input type="text" class="o-fr" placeholder="${esc(t("choiceFr"))}" aria-label="${esc(t("choiceFr"))}" value="${esc(o.fr)}">
    <input type="text" class="o-en" placeholder="${esc(t("choiceEn"))}" aria-label="${esc(t("choiceEn"))}" value="${esc(o.en)}">
    <label class="check small"><input type="checkbox" class="o-text"${o.text ? " checked" : ""}>${esc(t("allowText"))}</label>
    <button class="icon" type="button" aria-label="${esc(t("remove"))}" data-action="removeChoice">×</button></div>`;
}
function questionDialog(id) {
  const q = app.questions.find(x => x.id === id) || { options: [{}, {}], many: false };
  openDialog(`<form id="question-form" data-id="${esc(id)}">
    <h2>${esc(t(id ? "editQuestion" : "newQuestion"))}</h2>
    <label class="field"><span>${esc(t("questionFr"))}</span><textarea id="q-fr" rows="2">${esc(q.fr)}</textarea></label>
    <label class="field"><span>${esc(t("questionEn"))}</span><textarea id="q-en" rows="2">${esc(q.en)}</textarea></label>
    <label class="check"><input type="checkbox" id="q-many"${q.many ? " checked" : ""}>${esc(t("allowMany"))}</label>
    <h3>${esc(t("choices"))}</h3><p class="muted small">${esc(t("choicesHint"))}</p>
    <div id="q-choices" class="stack-sm">${q.options.map(choiceRow).join("")}</div>
    <button class="btn small" type="button" data-action="addChoice">${esc(t("addChoice"))}</button>
    <div class="dialog-actions">
      <button class="btn primary" type="submit">${esc(t("save"))}</button>
      <button class="btn" type="button" data-action="closeDialog">${esc(t("cancel"))}</button>
    </div></form>`);
}
function nextQuestionId(section) {
  const used = app.questions.filter(q => q.section === section).map(q => Number(q.id.slice(1)) || 0);
  return section + (Math.max(0, ...used) + 1);
}

// ---------- Dialog ----------
const dlg = document.getElementById("dlg");
function openDialog(html) {
  dlg.innerHTML = html;
  if (!dlg.open) dlg.showModal();
}
function closeDialog() { app.armed = null; if (dlg.open) dlg.close(); }

// ---------- Saving ----------
async function checked(query) {
  const { error } = await query;
  if (error) throw error;
  await loadAll();
}
const insertRow = (table, body) => checked(sb.from(table).insert(body));
const patchRow = (table, id, body) => checked(sb.from(table).update(body).eq("id", id));
const dropRow = (table, id) => checked(sb.from(table).delete().eq("id", id));
async function guarded(work) {
  try { await work(); return true; } catch { toast(t("saveFailed")); return false; }
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast(t("copied")); return true; }
  catch { toast(t("copyFailed")); return false; }
}

// ---------- Actions ----------
const ACTIONS = {
  uiLang(b) { app.uiLang = b.dataset.lang; writeLocal("miniSocUiLang", app.uiLang); render(); },
  qLang(b) { app.qLang = b.dataset.lang; writeLocal("miniSocQLang", app.qLang); render(); },
  signOut() { return sb.auth.signOut(); },
  go(b) { setView(b.dataset.view); },
  startInterview(b) { app.section = b.dataset.section; app.startContact = null; setView("interview"); },
  pickSection(b) { app.section = b.dataset.section; app.startContact = null; render(); },
  clearContact() { app.startContact = null; render(); },
  clearDraft() { delete app.drafts[app.section]; saveDrafts(); render(); },
  peopleStatus(b) { app.peopleStatus = b.dataset.status; render(); },
  interviewContact(b) {
    const c = app.contacts.find(x => x.id === b.dataset.id);
    app.section = c.section; app.startContact = c.id; setView("interview");
  },
  editContact(b) { contactDialog(b.dataset.id); },
  message(b) { messageDialog(b.dataset.id); },
  messageLang(b) { app.qLang = b.dataset.lang; messageDialog(b.dataset.id); },
  async copyMessage(b) {
    const ok = await copyText(document.getElementById("msg-text").value);
    if (ok && b.dataset.id) { await guarded(() => patchRow("contacts", b.dataset.id, { status: "contacted" })); closeDialog(); render(); }
  },
  closeDialog,
  async deleteContact(b) {
    const id = b.dataset.id;
    if (app.armed !== id) { app.armed = id; contactDialog(id); return; }
    if (await guarded(() => dropRow("contacts", id))) { closeDialog(); render(); }
  },
  editAssumption(b) { assumptionDialog(b.dataset.id); },
  async deleteAssumption(b) {
    const id = b.dataset.id;
    if (app.armed !== id) { app.armed = id; assumptionDialog(id); return; }
    if (await guarded(() => dropRow("hypotheses", id))) { closeDialog(); render(); }
  },
  async deleteInterview(b) {
    const id = b.dataset.id;
    if (app.armed !== id) { app.armed = id; render(); return; }
    app.armed = null;
    await guarded(() => dropRow("interviews", id));
    render();
  },
  report() { setView("report"); },
  print() { window.print(); },
  exportCsv: downloadCsv,
  editQuestion(b) { questionDialog(b.dataset.id); },
  addChoice() { document.getElementById("q-choices").insertAdjacentHTML("beforeend", choiceRow()); },
  removeChoice(b) { b.closest(".choice").remove(); },
  async toggleQuestion(b) {
    const q = app.questions.find(x => x.id === b.dataset.id);
    await guarded(() => patchRow("questions", q.id, { archived: !q.archived }));
    render();
  },
  async moveQuestion(b) {
    const list = questionsOf(app.editSection, true);
    const i = list.findIndex(q => q.id === b.dataset.id);
    const j = i + Number(b.dataset.dir);
    if (!list[j]) return;
    // Rewrites every position, because older rows can share the same number.
    const order = list.map(q => q.id);
    order[i] = list[j].id; order[j] = list[i].id;
    await guarded(async () => {
      const results = await Promise.all(order.map((id, n) => sb.from("questions").update({ position: n + 1 }).eq("id", id)));
      const failed = results.find(r => r.error);
      if (failed) throw failed.error;
      await loadAll();
    });
    render();
  }
};

document.addEventListener("click", async e => {
  const el = e.target;
  if (el.matches?.('fieldset.q input[name]:not([data-need])')) { pickAnswer(el); return; }
  if (el.matches?.("input[data-need]")) {
    const d = draft(app.section), n = Number(el.value);
    if (d.need === n) { el.checked = false; d.need = null; } else d.need = n;
    saveDrafts();
    return;
  }
  const trigger = el.closest?.("[data-action]");
  if (trigger) await ACTIONS[trigger.dataset.action](trigger);
});
function pickAnswer(el) {
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
}
document.addEventListener("input", e => {
  const el = e.target;
  if (el.id === "people-search") {
    app.peopleSearch = el.value;
    const pos = el.selectionStart;
    render();
    const box = document.getElementById("people-search");
    box.focus(); box.setSelectionRange(pos, pos);
    return;
  }
  const d = draft(app.section);
  if (el.dataset.notes) d.notes = el.value;
  if (el.dataset.quote) d.quote = el.value;
  const q = el.dataset.other || el.dataset.open;
  if (q) (d.answers[q] || (d.answers[q] = { choices: [], other: "" })).other = el.value;
  if (el.dataset.notes || el.dataset.quote || q) { saveDrafts(); updateProgress(); }
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.id === "people-type") { app.peopleType = el.value; render(); }
  if (el.id === "result-type") { app.resultSection = el.value; app.filterQ = ""; app.filterOpt = ""; render(); }
  if (el.id === "filter-q") { app.filterQ = el.value; app.filterOpt = ""; render(); }
  if (el.id === "filter-opt") { app.filterOpt = el.value; render(); }
  if (el.id === "edit-section") { app.editSection = el.value; render(); }
});
const value = id => document.getElementById(id).value.trim();
const FORMS = {
  async login() {
    const email = value("login-email"), password = document.getElementById("login-password").value;
    document.getElementById("login-submit").disabled = true;
    app.loginEmail = email; app.loginError = "";
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { app.loginError = t("badLogin"); render(); }
  },
  async "contact-form"(form) {
    const name = value("c-name");
    if (!name) { toast(t("needName")); return; }
    const body = { name, section: value("c-type"), status: value("c-status"), [app.uiLang === "fr" ? "why_fr" : "why_en"]: value("c-why") };
    if (!app.needsUpdate) Object.assign(body, { person: value("c-person"), reach: value("c-reach"), next_date: value("c-date") || null, notes: value("c-notes") });
    const id = form.dataset.id;
    if (await guarded(() => id ? patchRow("contacts", id, body) : insertRow("contacts", body))) { closeDialog(); toast(t("saved")); render(); }
  },
  async "assumption-form"(form) {
    const body = { statement: value("h-text"), status: value("h-status"), evidence: value("h-evidence") };
    const id = form.dataset.id;
    if (await guarded(() => id ? patchRow("hypotheses", id, body) : insertRow("hypotheses", { ...body, position: 100 + app.hypotheses.length }))) { closeDialog(); toast(t("saved")); render(); }
  },
  async "question-form"(form) {
    const fr = value("q-fr"), en = value("q-en");
    if (!fr && !en) { toast(t("needText")); return; }
    const options = [...document.querySelectorAll(".choice")].map(row => {
      const oFr = row.querySelector(".o-fr").value.trim(), oEn = row.querySelector(".o-en").value.trim();
      const o = { en: oEn || oFr, fr: oFr || oEn };
      if (row.querySelector(".o-text").checked) o.text = true;
      return o;
    }).filter(o => o.en);
    const body = { fr: fr || en, en: en || fr, many: document.getElementById("q-many").checked, options, updated_at: new Date().toISOString() };
    const id = form.dataset.id;
    const add = () => insertRow("questions", { ...body, id: nextQuestionId(app.editSection), section: app.editSection, position: questionsOf(app.editSection, true).length + 1 });
    if (await guarded(() => id ? patchRow("questions", id, body) : add())) { closeDialog(); toast(t("saved")); render(); }
  },
  async iform() {
    if (!answeredCount(app.section)) { toast(t("needAnswer")); return; }
    const d = draft(app.section), btn = document.getElementById("i-save");
    btn.disabled = true; btn.textContent = t("saving");
    const answers = Object.fromEntries(Object.entries(d.answers).filter(([, a]) => a.choices.length || a.other));
    const body = { section: app.section, lang: app.qLang, answers, notes: d.notes.trim() };
    if (!app.needsUpdate) Object.assign(body, { key_quote: d.quote.trim(), need_score: d.need });
    const ok = await guarded(async () => {
      await insertRow("interviews", body);
      if (app.startContact) await patchRow("contacts", app.startContact, { status: "done" });
    });
    if (!ok) { btn.disabled = false; btn.textContent = t("saveInterview"); return; }
    delete app.drafts[app.section]; saveDrafts();
    app.startContact = null;
    toast(t("interviewSaved")); render(); window.scrollTo(0, 0);
  }
};
document.addEventListener("submit", async e => {
  e.preventDefault();
  await FORMS[e.target.id]?.(e.target);
});
function setView(view) {
  app.view = view; app.armed = null;
  try { history.replaceState(null, "", "#" + view); } catch {}
  render();
  window.scrollTo(0, 0);
}

// ---------- Data and sign-in ----------
async function loadAll() {
  const [interviews, contacts, questions, hypotheses] = await Promise.all([
    sb.from("interviews").select("*").order("created_at").limit(2000),
    sb.from("contacts").select("*").limit(1000),
    sb.from("questions").select("*").limit(1000),
    sb.from("hypotheses").select("*").limit(200)
  ]);
  app.stale = Boolean(interviews.error || contacts.error);
  if (!app.stale) {
    app.responses = interviews.data.map(r => ({ ...r, date: r.created_at }));
    app.contacts = contacts.data;
  }
  // Until the database update runs, the built-in questions keep interviews working.
  app.needsUpdate = Boolean(questions.error);
  app.questions = questions.error || !questions.data.length ? builtInQuestions() : questions.data;
  app.hypotheses = hypotheses.error ? [] : hypotheses.data;
  // Don't rebuild a form while someone is typing in it.
  if (app.view === "interview" || dlg.open) renderChrome(); else render();
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
  await loadAll();
  render();
  if (!app.channel) {
    const onChange = () => loadAll();
    app.channel = ["interviews", "contacts", "questions", "hypotheses"]
      .reduce((ch, table) => ch.on("postgres_changes", { event: "*", schema: "public", table }, onChange), sb.channel("team-data"))
      .subscribe();
  }
}
function leave() {
  if (app.channel) sb.removeChannel(app.channel);
  app.channel = null; app.userId = null;
  app.responses = []; app.contacts = []; app.hypotheses = []; app.stale = false;
  app.drafts = {}; saveDrafts();
  closeDialog();
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

app.uiLang = readLocal("miniSocUiLang", "en");
app.qLang = readLocal("miniSocQLang", "fr");
app.drafts = readLocal("miniSocDrafts", {});
app.questions = builtInQuestions();
if ([...VIEWS].includes(location.hash.slice(1))) app.view = location.hash.slice(1);
render();
try {
  connect();
} catch {
  app.mode = "signedout"; app.loginError = t("unreachable"); render();
}
