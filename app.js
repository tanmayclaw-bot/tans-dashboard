const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (id) => document.getElementById(id);
const views = { login: $("login-view"), reset: $("reset-view"), dash: $("dash-view") };
let items = [];
let recoveryMode = false;

function show(name) {
  Object.values(views).forEach((v) => v.classList.add("hidden"));
  views[name].classList.remove("hidden");
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// --- auth ---
$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("login-error").textContent = "";
  const { error } = await sb.auth.signInWithPassword({
    email: $("login-email").value.trim(),
    password: $("login-password").value,
  });
  if (error) $("login-error").textContent = error.message;
});

$("reset-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("reset-error").textContent = "";
  const { error } = await sb.auth.updateUser({ password: $("reset-password").value });
  if (error) { $("reset-error").textContent = error.message; return; }
  recoveryMode = false;
  history.replaceState(null, "", location.pathname);
  show("dash");
  await loadItems();
});

$("logout-btn").addEventListener("click", async () => { await sb.auth.signOut(); });

sb.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") { recoveryMode = true; show("reset"); return; }
  if (recoveryMode) return;
  if (session) { show("dash"); loadItems(); } else { show("login"); }
});

// --- data ---
async function loadItems() {
  const { data, error } = await sb.from("dashboard_items").select("*").order("sort", { ascending: true });
  if (error) { console.error(error); return; }
  items = data || [];
  render();
}

function grouped(list) {
  const map = new Map();
  for (const it of list) {
    if (!map.has(it.section)) map.set(it.section, []);
    map.get(it.section).push(it);
  }
  return [...map.entries()];
}

function render() {
  const q = $("search").value.trim().toLowerCase();
  const list = q
    ? items.filter((it) => [it.title, it.note, it.section, it.badge, it.url].join(" ").toLowerCase().includes(q))
    : items;
  const host = $("sections");
  host.innerHTML = "";
  for (const [section, rows] of grouped(list)) {
    const sec = document.createElement("section");
    sec.className = "group";
    sec.innerHTML = `<h2>${esc(section)}</h2>`;
    for (const it of rows) {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="body">
          <a class="title" href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.title)}</a>${it.badge ? `<span class="badge">${esc(it.badge)}</span>` : ""}
          ${it.note ? `<div class="note">${esc(it.note)}</div>` : ""}
        </div>
        <div class="tools">
          <button data-act="up" title="Move up">&#8593;</button>
          <button data-act="down" title="Move down">&#8595;</button>
          <button data-act="edit" title="Edit">Edit</button>
        </div>`;
      card.querySelector('[data-act="edit"]').addEventListener("click", () => openEdit(it));
      card.querySelector('[data-act="up"]').addEventListener("click", () => move(it, -1));
      card.querySelector('[data-act="down"]').addEventListener("click", () => move(it, 1));
      sec.appendChild(card);
    }
    host.appendChild(sec);
  }
  $("empty-state").classList.toggle("hidden", list.length > 0);
  const dl = $("sections-list");
  dl.innerHTML = "";
  for (const [section] of grouped(items)) {
    const o = document.createElement("option");
    o.value = section;
    dl.appendChild(o);
  }
}

async function move(it, dir) {
  const same = items.filter((x) => x.section === it.section).sort((a, b) => a.sort - b.sort);
  const i = same.findIndex((x) => x.id === it.id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= same.length) return;
  const a = same[i], b = same[j];
  await sb.from("dashboard_items").update({ sort: b.sort, updated_at: new Date().toISOString() }).eq("id", a.id);
  await sb.from("dashboard_items").update({ sort: a.sort, updated_at: new Date().toISOString() }).eq("id", b.id);
  await loadItems();
}

// --- edit dialog ---
const dlg = $("edit-dialog");
function openEdit(it) {
  $("edit-title").textContent = it ? "Edit resource" : "Add resource";
  $("f-id").value = it?.id || "";
  $("f-section").value = it?.section || "";
  $("f-title").value = it?.title || "";
  $("f-url").value = it?.url || "";
  $("f-note").value = it?.note || "";
  $("f-badge").value = it?.badge || "";
  $("delete-btn").classList.toggle("hidden", !it);
  dlg.showModal();
}
$("add-btn").addEventListener("click", () => openEdit(null));
$("cancel-btn").addEventListener("click", () => dlg.close());
$("delete-btn").addEventListener("click", async () => {
  const id = $("f-id").value;
  if (!id || !confirm("Delete this resource?")) return;
  await sb.from("dashboard_items").delete().eq("id", id);
  dlg.close();
  await loadItems();
});
$("edit-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("f-id").value;
  const row = {
    section: $("f-section").value.trim(),
    title: $("f-title").value.trim(),
    url: $("f-url").value.trim(),
    note: $("f-note").value.trim(),
    badge: $("f-badge").value.trim(),
    updated_at: new Date().toISOString(),
  };
  if (id) {
    await sb.from("dashboard_items").update(row).eq("id", id);
  } else {
    const maxSort = items.reduce((m, x) => Math.max(m, x.sort || 0), 0);
    await sb.from("dashboard_items").insert({ ...row, sort: maxSort + 10 });
  }
  dlg.close();
  await loadItems();
});

$("search").addEventListener("input", render);
$("today-line").textContent = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
