/* Tan's Command Center - Board + Resources. Supabase auth + per-user RLS. */
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const niceDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const toMin = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + m; };
const fmt12 = (t) => { const [h, m] = String(t).split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; const hh = h % 12 || 12; return m ? `${hh}:${String(m).padStart(2,"0")} ${ap}` : `${hh} ${ap}`; };
const leftStr = (mins) => mins >= 60 ? `${Math.floor(mins/60)}h${mins%60 ? " " + (mins%60) + "m" : ""} left` : `${mins}m left`;

let items = [], tasks = [], events = [], habits = [], habitDays = [], focusLog = [], settings = {}, notesBody = "";
let mode = localStorage.getItem("cc.mode") || "board";
let chip = localStorage.getItem("cc.chip") || "today";
let taskFilter = "open";

/* ---------- auth ---------- */
async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  sb.auth.onAuthStateChange((ev, s) => {
    if (ev === "PASSWORD_RECOVERY") show("reset-view");
    else if (s) { show("dash-view"); loadAll(); }
    else show("login-view");
  });
  if (session) { show("dash-view"); loadAll(); } else show("login-view");
}
function show(id) {
  ["login-view", "reset-view", "dash-view"].forEach((v) => $(v).classList.toggle("hidden", v !== id));
}
$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault(); $("login-error").textContent = "";
  const { error } = await sb.auth.signInWithPassword({ email: $("login-email").value.trim(), password: $("login-password").value });
  if (error) $("login-error").textContent = error.message;
});
$("reset-form").addEventListener("submit", async (e) => {
  e.preventDefault(); $("reset-error").textContent = "";
  const { error } = await sb.auth.updateUser({ password: $("reset-password").value });
  if (error) $("reset-error").textContent = error.message;
});
$("logout-btn").addEventListener("click", () => sb.auth.signOut());

/* ---------- data ---------- */
async function loadAll() {
  $("today-line").textContent = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const [i, t, ev, h, hd, fl, st, nt] = await Promise.all([
    sb.from("dashboard_items").select("*").order("section").order("sort"),
    sb.from("planner_tasks").select("*").order("sort"),
    sb.from("planner_events").select("*").order("start_time"),
    sb.from("planner_habits").select("*").order("created_at"),
    sb.from("planner_habit_days").select("*"),
    sb.from("planner_focus_log").select("*").order("day", { ascending: false }).limit(20),
    sb.from("planner_settings").select("*"),
    sb.from("planner_notes").select("*").eq("id", 1),
  ]);
  items = i.data || []; tasks = t.data || []; events = ev.data || []; habits = h.data || [];
  habitDays = hd.data || []; focusLog = fl.data || [];
  (st.data || []).forEach((r) => (settings[r.key] = r.value));
  notesBody = nt.data && nt.data[0] ? nt.data[0].body : "";
  $("notes-area").value = notesBody;
  applyMode(); renderResources(); renderBoard();
}

/* ---------- mode + chips ---------- */
function applyMode() {
  localStorage.setItem("cc.mode", mode);
  $("mode-board").classList.toggle("on", mode === "board");
  $("mode-resources").classList.toggle("on", mode === "resources");
  $("board-view").classList.toggle("hidden", mode !== "board");
  $("board-chips").classList.toggle("hidden", mode !== "board");
  $("resources-view").classList.toggle("hidden", mode !== "resources");
  $("search").classList.toggle("hidden", mode !== "resources");
  if (mode === "board") applyChip();
}
$("mode-board").addEventListener("click", () => { mode = "board"; applyMode(); });
$("mode-resources").addEventListener("click", () => { mode = "resources"; applyMode(); });
document.querySelectorAll("#board-chips button").forEach((b) =>
  b.addEventListener("click", () => { chip = b.dataset.chip; applyChip(); }));
function applyChip() {
  localStorage.setItem("cc.chip", chip);
  document.querySelectorAll("#board-chips button").forEach((b) => b.classList.toggle("on", b.dataset.chip === chip));
  ["today", "tasks", "week", "habit", "projects", "notes"].forEach((c) =>
    $("chip-" + c).classList.toggle("hidden", c !== chip));
}

/* ---------- resources ---------- */
function renderResources() {
  const q = $("search").value.trim().toLowerCase();
  const box = $("sections"); box.innerHTML = "";
  const bySec = {};
  items.forEach((it) => {
    if (q && !(it.title + " " + (it.note || "") + " " + it.section).toLowerCase().includes(q)) return;
    (bySec[it.section] = bySec[it.section] || []).push(it);
  });
  const secs = Object.keys(bySec);
  $("empty-state").classList.toggle("hidden", secs.length > 0);
  secs.forEach((sec) => {
    const el = document.createElement("section"); el.className = "group";
    el.innerHTML = `<h2>${esc(sec)}</h2>`;
    bySec[sec].forEach((it, idx) => {
      const card = document.createElement("div"); card.className = "card";
      card.innerHTML = `<div class="body">
          <a class="title" href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.title)}</a>${it.badge ? `<span class="badge">${esc(it.badge)}</span>` : ""}
          ${it.note ? `<p class="note">${esc(it.note)}</p>` : ""}
        </div>
        <div class="tools">
          <button data-mv="up" ${idx === 0 ? "disabled" : ""} aria-label="Move up">↑</button>
          <button data-mv="down" ${idx === bySec[sec].length - 1 ? "disabled" : ""} aria-label="Move down">↓</button>
          <button data-edit="${it.id}">Edit</button>
        </div>`;
      card.querySelector('[data-mv="up"]').addEventListener("click", () => moveItem(it, bySec[sec], idx, -1));
      card.querySelector('[data-mv="down"]').addEventListener("click", () => moveItem(it, bySec[sec], idx, 1));
      card.querySelector("[data-edit]").addEventListener("click", () => openEdit(it, secs));
      el.appendChild(card);
    });
    box.appendChild(el);
  });
}
$("search").addEventListener("input", renderResources);
async function moveItem(it, list, idx, dir) {
  const other = list[idx + dir]; if (!other) return;
  const a = it.sort, b = other.sort;
  await sb.from("dashboard_items").update({ sort: b }).eq("id", it.id);
  await sb.from("dashboard_items").update({ sort: a }).eq("id", other.id);
  it.sort = b; other.sort = a;
  list[idx] = other; list[idx + dir] = it;
  renderResources();
}
$("add-btn").addEventListener("click", () => {
  if (mode === "resources") openEdit(null, Object.keys(items.reduce((m, x) => ((m[x.section] = 1), m), {})));
  else if (chip === "tasks") openTask(null);
  else if (chip === "habit") openHabit(null);
  else if (chip === "week" || chip === "today") openEvent(null);
  else if (mode === "board" && chip === "projects") { mode = "resources"; applyMode(); openEdit(null, []); }
});
function openEdit(it, secs) {
  $("edit-title").textContent = it ? "Edit resource" : "Add resource";
  $("f-id").value = it ? it.id : "";
  $("f-section").value = it ? it.section : "";
  $("f-title").value = it ? it.title : "";
  $("f-url").value = it ? it.url : "";
  $("f-note").value = it ? it.note || "" : "";
  $("f-badge").value = it ? it.badge || "" : "";
  $("delete-btn").classList.toggle("hidden", !it);
  $("sections-list").innerHTML = [...new Set([...secs, ...items.map((x) => x.section)])].map((s) => `<option value="${esc(s)}">`).join("");
  $("edit-dialog").showModal();
}
$("cancel-btn").addEventListener("click", () => $("edit-dialog").close());
$("edit-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("f-id").value;
  const row = { section: $("f-section").value.trim(), title: $("f-title").value.trim(), url: $("f-url").value.trim(), note: $("f-note").value.trim(), badge: $("f-badge").value.trim(), updated_at: new Date().toISOString() };
  if (id) await sb.from("dashboard_items").update(row).eq("id", id);
  else { row.sort = (Math.max(0, ...items.filter((x) => x.section === row.section).map((x) => x.sort || 0)) || 0) + 10; await sb.from("dashboard_items").insert(row); }
  $("edit-dialog").close(); loadAll();
});
$("delete-btn").addEventListener("click", async () => {
  const id = $("f-id").value; if (!id || !confirm("Delete this resource?")) return;
  await sb.from("dashboard_items").delete().eq("id", id);
  $("edit-dialog").close(); loadAll();
});

/* ---------- board: today ---------- */
function eventsFor(iso) {
  const d = new Date(iso + "T12:00:00"), wd = d.getDay();
  return events.filter((e) => e.date === iso || (!e.date && (e.days || []).includes(wd)));
}
function renderBoard() {
  renderToday(); renderTasks(); renderWeek(); renderHabit(); renderProjects();
}
function renderToday() {
  const el = $("chip-today"); const iso = todayISO();
  let html = "";
  const cd = settings.countdown;
  if (cd && cd.date) {
    const days = Math.ceil((new Date(cd.date + "T00:00:00") - new Date(iso + "T00:00:00")) / 86400000);
    html += `<div class="card countdown"><div><div class="days">${days}</div><div class="label">${esc(cd.label || "Countdown")}</div>
      <div class="sub">${niceDate(cd.date)} · ${days >= 0 ? (days === 0 ? "today" : "days to go") : "days ago"} · start time not confirmed yet</div></div></div>`;
  }
  const todaysEvents = eventsFor(iso).slice().sort((a, b) => toMin(a.start_time) - toMin(b.start_time));
  const dueToday = tasks.filter((t) => !t.done && t.due === iso);
  const nowD = new Date();
  const nowM = nowD.getHours() * 60 + nowD.getMinutes();
  const cur = todaysEvents.find((e) => toMin(e.start_time) <= nowM && nowM < toMin(e.end_time));
  const nxt = todaysEvents.find((e) => toMin(e.start_time) > nowM);
  if (cur) {
    const span = toMin(cur.end_time) - toMin(cur.start_time);
    const pct = Math.min(100, Math.round(((nowM - toMin(cur.start_time)) / span) * 100));
    html += `<div class="card now-card"><div class="body">
      <div class="now-tag">NOW</div>
      <div class="title-plain">${esc(cur.title)}</div>
      <div class="note">${fmt12(cur.start_time)} \u2013 ${fmt12(cur.end_time)} \u00b7 ${leftStr(toMin(cur.end_time) - nowM)}</div>
      <div class="progress"><div class="bar" style="width:${pct}%"></div></div>
      ${nxt ? `<div class="note then">Then ${fmt12(nxt.start_time)} \u00b7 ${esc(nxt.title)}</div>` : ""}
    </div></div>`;
  } else if (nxt) {
    html += `<div class="card now-card"><div class="body">
      <div class="now-tag">NEXT</div>
      <div class="title-plain">${esc(nxt.title)}</div>
      <div class="note">${fmt12(nxt.start_time)} \u2013 ${fmt12(nxt.end_time)} \u00b7 starts in ${leftStr(toMin(nxt.start_time) - nowM).replace(" left", "")}</div>
    </div></div>`;
  }
  html += `<div class="day-block"><h3>Today</h3>`;
  if (!todaysEvents.length && !dueToday.length) html += `<p class="muted small">Nothing scheduled. Add events from the Week tab or tasks from Tasks.</p>`;
  todaysEvents.forEach((e) => { html += `<div class="line-item"><span class="time">${fmt12(e.start_time)}–${fmt12(e.end_time)}</span><span class="what">${linkOrText(e)}</span></div>`; });
  dueToday.forEach((t) => { html += `<div class="line-item"><button class="check" data-done="${t.id}" aria-label="Mark done"></button><span class="what">${esc(t.title)} ${t.project ? `<span class="pill">${esc(t.project)}</span>` : ""}</span></div>`; });
  html += `</div>`;
  el.innerHTML = html;
  el.querySelectorAll("[data-done]").forEach((b) => b.addEventListener("click", () => toggleTask(b.dataset.done)));
}
function linkOrText(e) {
  return e.link ? `<a href="${esc(e.link)}" target="_blank" rel="noopener">${esc(e.title)}</a>` : esc(e.title);
}

/* ---------- board: tasks ---------- */
function renderTasks() {
  const el = $("chip-tasks");
  const iso = todayISO();
  const filters = [["open", "Open"], ["today", "Due today"], ["done", "Done"], ["all", "All"]];
  let html = `<div class="filters">${filters.map(([k, l]) => `<button data-f="${k}" class="${taskFilter === k ? "on" : ""}">${l}</button>`).join("")}</div>`;
  let list = tasks.filter((t) =>
    taskFilter === "all" ? true : taskFilter === "done" ? t.done : taskFilter === "today" ? !t.done && t.due === iso : !t.done);
  if (!list.length) html += `<p class="muted small">No tasks here. Use + Add.</p>`;
  list.forEach((t) => {
    const overdue = !t.done && t.due && t.due < iso;
    html += `<div class="line-item">
      <button class="check ${t.done ? "done" : ""}" data-done="${t.id}" aria-label="Toggle done"></button>
      <span class="what"><span class="${t.done ? "muted" : ""}" style="${t.done ? "text-decoration:line-through" : ""}">${esc(t.title)}</span>
        ${t.project ? `<span class="pill">${esc(t.project)}</span>` : ""}
        ${overdue ? `<span class="pill overdue">overdue · ${niceDate(t.due)}</span>` : t.due ? `<span class="pill">${niceDate(t.due)}</span>` : ""}
      </span>
      <span class="pill ${t.priority}">${t.priority}</span>
      <button class="ghost" data-edit-task="${t.id}" style="padding:4px 9px;margin:0;width:auto;font-size:13px">Edit</button>
    </div>`;
  });
  el.innerHTML = html;
  el.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => { taskFilter = b.dataset.f; renderTasks(); }));
  el.querySelectorAll("[data-done]").forEach((b) => b.addEventListener("click", () => toggleTask(b.dataset.done)));
  el.querySelectorAll("[data-edit-task]").forEach((b) => b.addEventListener("click", () => openTask(tasks.find((t) => t.id === b.dataset.editTask))));
}
async function toggleTask(id) {
  const t = tasks.find((x) => x.id === id); if (!t) return;
  t.done = !t.done;
  await sb.from("planner_tasks").update({ done: t.done, updated_at: new Date().toISOString() }).eq("id", id);
  renderTasks(); renderToday(); renderWeek();
}
function openTask(t) {
  $("task-title").textContent = t ? "Edit task" : "Add task";
  $("t-id").value = t ? t.id : "";
  $("t-title").value = t ? t.title : "";
  $("t-priority").value = t ? t.priority : "med";
  $("t-due").value = t && t.due ? t.due : "";
  $("t-project").value = t ? t.project || "" : "";
  $("t-link").value = t ? t.link || "" : "";
  $("t-delete").classList.toggle("hidden", !t);
  $("task-dialog").showModal();
}
$("t-cancel").addEventListener("click", () => $("task-dialog").close());
$("task-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("t-id").value;
  const row = { title: $("t-title").value.trim(), priority: $("t-priority").value, due: $("t-due").value || null, project: $("t-project").value.trim(), link: $("t-link").value.trim(), updated_at: new Date().toISOString() };
  if (id) await sb.from("planner_tasks").update(row).eq("id", id);
  else { row.sort = (Math.max(0, ...tasks.map((x) => x.sort || 0)) || 0) + 10; await sb.from("planner_tasks").insert(row); }
  $("task-dialog").close(); loadAll();
});
$("t-delete").addEventListener("click", async () => {
  const id = $("t-id").value; if (!id || !confirm("Delete this task?")) return;
  await sb.from("planner_tasks").delete().eq("id", id);
  $("task-dialog").close(); loadAll();
});

/* ---------- board: week ---------- */
function renderWeek() {
  const el = $("chip-week"); const iso = todayISO();
  let html = "";
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const diso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const evs = eventsFor(diso);
    const due = tasks.filter((t) => !t.done && t.due === diso);
    html += `<div class="day-block"><h3>${i === 0 ? "Today · " : ""}${niceDate(diso)}</h3>`;
    if (!evs.length && !due.length) html += `<p class="muted small">Free.</p>`;
    evs.forEach((e) => { html += `<div class="line-item"><span class="time">${fmt12(e.start_time)}–${fmt12(e.end_time)}</span><span class="what">${linkOrText(e)}</span><button class="ghost" data-edit-event="${e.id}" style="padding:4px 9px;margin:0;width:auto;font-size:13px">Edit</button></div>`; });
    due.forEach((t) => { html += `<div class="line-item"><span class="time">due</span><span class="what">${esc(t.title)}</span></div>`; });
    html += `</div>`;
  }
  el.innerHTML = html;
  el.querySelectorAll("[data-edit-event]").forEach((b) => b.addEventListener("click", () => openEvent(events.find((e) => e.id === b.dataset.editEvent))));
}
function openEvent(ev) {
  $("event-title").textContent = ev ? "Edit event" : "Add event";
  $("e-id").value = ev ? ev.id : "";
  $("e-title").value = ev ? ev.title : "";
  $("e-start").value = ev ? ev.start_time : "09:00";
  $("e-end").value = ev ? ev.end_time : "10:00";
  $("e-date").value = ev && ev.date ? ev.date : "";
  const days = ev && ev.days ? ev.days : [];
  document.querySelectorAll("#e-days input[type=checkbox]").forEach((c) => (c.checked = days.includes(Number(c.value))));
  $("e-delete").classList.toggle("hidden", !ev);
  $("event-dialog").showModal();
}
$("e-cancel").addEventListener("click", () => $("event-dialog").close());
$("event-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("e-id").value;
  const days = [...document.querySelectorAll("#e-days input:checked")].map((c) => Number(c.value));
  const row = { title: $("e-title").value.trim(), start_time: $("e-start").value, end_time: $("e-end").value, date: $("e-date").value || null, days: $("e-date").value ? null : days };
  if (id) await sb.from("planner_events").update(row).eq("id", id);
  else { row.sort = (Math.max(0, ...events.map((x) => x.sort || 0)) || 0) + 10; await sb.from("planner_events").insert(row); }
  $("event-dialog").close(); loadAll();
});
$("e-delete").addEventListener("click", async () => {
  const id = $("e-id").value; if (!id || !confirm("Delete this event?")) return;
  await sb.from("planner_events").delete().eq("id", id);
  $("event-dialog").close(); loadAll();
});

/* ---------- board: habit ---------- */
function streakOf(hid) {
  const set = new Set(habitDays.filter((d) => d.habit_id === hid).map((d) => d.day));
  let n = 0; const d = new Date();
  if (!set.has(todayISO())) d.setDate(d.getDate() - 1);
  for (;;) {
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (set.has(iso)) { n++; d.setDate(d.getDate() - 1); } else break;
  }
  return n;
}
function renderHabit() {
  const el = $("chip-habit"); const iso = todayISO();
  let html = `<h2>Daily habits</h2>`;
  if (!habits.length) html += `<p class="muted small">No habits yet. Use + Add.</p>`;
  habits.forEach((h) => {
    const done = habitDays.some((d) => d.habit_id === h.id && d.day === iso);
    const st = streakOf(h.id);
    html += `<div class="line-item">
      <button class="check ${done ? "done" : ""}" data-habit="${h.id}" aria-label="Toggle today"></button>
      <span class="what">${h.link ? `<a href="${esc(h.link)}" target="_blank" rel="noopener">${esc(h.title)}</a>` : esc(h.title)} ${h.minutes ? `<span class="pill">${h.minutes} min</span>` : ""}</span>
      <span class="streak">${st > 0 ? st + "d" : ""}</span>
      <button class="ghost" data-edit-habit="${h.id}" style="padding:4px 9px;margin:0;width:auto;font-size:13px">Edit</button>
    </div>`;
  });
  el.innerHTML = html;
  el.querySelectorAll("[data-habit]").forEach((b) => b.addEventListener("click", async () => {
    const hid = b.dataset.habit; const done = habitDays.some((d) => d.habit_id === hid && d.day === iso);
    if (done) await sb.from("planner_habit_days").delete().eq("habit_id", hid).eq("day", iso);
    else await sb.from("planner_habit_days").insert({ habit_id: hid, day: iso });
    const { data } = await sb.from("planner_habit_days").select("*");
    habitDays = data || []; renderHabit();
  }));
  el.querySelectorAll("[data-edit-habit]").forEach((b) => b.addEventListener("click", () => openHabit(habits.find((h) => h.id === b.dataset.editHabit))));
}
function openHabit(h) {
  $("habit-title").textContent = h ? "Edit habit" : "Add habit";
  $("h-id").value = h ? h.id : "";
  $("h-title").value = h ? h.title : "";
  $("h-minutes").value = h && h.minutes ? h.minutes : "";
  $("h-link").value = h ? h.link || "" : "";
  $("h-delete").classList.toggle("hidden", !h);
  $("habit-dialog").showModal();
}
$("h-cancel").addEventListener("click", () => $("habit-dialog").close());
$("habit-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("h-id").value;
  const row = { title: $("h-title").value.trim(), minutes: $("h-minutes").value ? Number($("h-minutes").value) : null, link: $("h-link").value.trim() };
  if (id) await sb.from("planner_habits").update(row).eq("id", id);
  else await sb.from("planner_habits").insert(row);
  $("habit-dialog").close(); loadAll();
});
$("h-delete").addEventListener("click", async () => {
  const id = $("h-id").value; if (!id || !confirm("Delete this habit and its history?")) return;
  await sb.from("planner_habits").delete().eq("id", id);
  $("habit-dialog").close(); loadAll();
});

/* ---------- board: projects ---------- */
function renderProjects() {
  const el = $("chip-projects");
  const projs = items.filter((i) => i.section === "Projects & sites");
  let html = `<h2>Projects</h2>`;
  if (!projs.length) html += `<p class="muted small">No projects in Resources yet.</p>`;
  projs.forEach((it) => {
    html += `<div class="card"><div class="body">
      <a class="title" href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.title)}</a>${it.badge ? `<span class="badge">${esc(it.badge)}</span>` : ""}
      ${it.note ? `<p class="note">${esc(it.note)}</p>` : ""}</div></div>`;
  });
  html += `<p class="muted small">Manage these in Resources mode.</p>`;
  el.innerHTML = html;
}

/* ---------- board: notes ---------- */
let notesTimer = null;
$("notes-area").addEventListener("input", () => {
  clearTimeout(notesTimer);
  $("notes-status").textContent = "saving...";
  notesTimer = setTimeout(async () => {
    await sb.from("planner_notes").upsert({ id: 1, body: $("notes-area").value, updated_at: new Date().toISOString() });
    $("notes-status").textContent = "saved";
  }, 800);
});

/* ---------- focus log ---------- */
$("focuslog-btn").addEventListener("click", () => {
  $("resources-main").classList.add("hidden");
  $("search").classList.add("hidden");
  $("focuslog-view").classList.remove("hidden");
  $("fl-id").value = "";
  $("fl-date").value = todayISO();
  renderFocusLog();
});
$("focuslog-back").addEventListener("click", () => {
  $("focuslog-view").classList.add("hidden");
  $("resources-main").classList.remove("hidden");
  if (mode === "resources") $("search").classList.remove("hidden");
});
$("focuslog-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const row = {
    day: $("fl-date").value, hours: $("fl-hours").value ? Number($("fl-hours").value) : null,
    work: $("fl-work").value.trim(), one_thing: $("fl-one").value.trim(),
  };
  const id = $("fl-id").value;
  if (id) await sb.from("planner_focus_log").update(row).eq("id", id);
  else await sb.from("planner_focus_log").insert(row);
  $("fl-id").value = ""; $("fl-work").value = ""; $("fl-one").value = ""; $("fl-hours").value = "";
  const { data } = await sb.from("planner_focus_log").select("*").order("day", { ascending: false }).limit(20);
  focusLog = data || []; renderFocusLog();
});
function renderFocusLog() {
  const el = $("focuslog-list");
  if (!focusLog.length) { el.innerHTML = `<p class="muted small">No entries yet.</p>`; return; }
  el.innerHTML = focusLog.map((f) => `<div class="fl-entry">
    <div class="meta">${niceDate(f.day)}${f.hours ? " · " + f.hours + "h" : ""}
      <button class="ghost fl-edit" data-fl-edit="${f.id}" style="padding:3px 9px;margin:0 0 0 8px;width:auto;font-size:12px">Edit</button>
      <button class="ghost fl-del" data-fl-del="${f.id}" style="padding:3px 9px;margin:0 0 0 4px;width:auto;font-size:12px">Delete</button>
    </div>
    <div>${esc(f.work)}</div>
    <div class="one">ONE: ${esc(f.one_thing)}</div>
  </div>`).join("");
  el.querySelectorAll("[data-fl-edit]").forEach((b) => b.addEventListener("click", () => {
    const f = focusLog.find((x) => x.id === b.dataset.flEdit); if (!f) return;
    $("fl-id").value = f.id; $("fl-date").value = f.day;
    $("fl-hours").value = f.hours ?? ""; $("fl-work").value = f.work; $("fl-one").value = f.one_thing;
    $("focuslog-form").scrollIntoView({ behavior: "smooth" });
  }));
  el.querySelectorAll("[data-fl-del]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Delete this focus log entry?")) return;
    await sb.from("planner_focus_log").delete().eq("id", b.dataset.flDel);
    focusLog = focusLog.filter((x) => x.id !== b.dataset.flDel);
    renderFocusLog();
  }));
}

boot();
