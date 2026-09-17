// ---- Backend connection -----------------------------------------------
// Change this if your backend runs somewhere else (e.g. after deploying it).
const API_BASE = "https://studyq-uutb.onrender.com/";

let token = localStorage.getItem("studyquest_token"); // only the login token lives in the browser
let state = {
  tasks: [], notes: [], xp: 0, level: { level: 1, within: 0, title: "Student Explorer" },
  streak: 1, focusSessions: 0, achievements: [],
  profile: { name: "Student", goal: "", theme: "dark", animations: true }
};

let currentPage = "dashboard";
let taskFilter = "all";
let timerSeconds = 25 * 60;
let timerRunning = false;
let timerInterval = null;
let timerMode = "focus";
const quotes = [
  "Small progress is still progress. Keep moving forward!",
  "Your future self will thank you for studying today.",
  "Focus on the next step, not the whole staircase.",
  "Consistency beats intensity. Show up again today.",
  "One page, one problem, one session at a time."
];

// ---- API helper ---------------------------------------------------------
async function api(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

function $(id) { return document.getElementById(id); }
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

// ---- Auth ---------------------------------------------------------------
function showAuthModal() { $("authModal").classList.remove("hidden"); }
function hideAuthModal() { $("authModal").classList.add("hidden"); }
function switchAuthTab(tab) {
  document.querySelectorAll("#authTabs .tab").forEach(t => t.classList.toggle("active", t.dataset.authTab === tab));
  $("loginForm").classList.toggle("hidden", tab !== "login");
  $("registerForm").classList.toggle("hidden", tab !== "register");
  $("authHeading").textContent = tab === "login" ? "Log In to StudyQuest" : "Create Your Account";
}

async function requireAuthThenEnter() {
  if (token) { await enterApp(); return; }
  switchAuthTab("login");
  showAuthModal();
}

async function enterApp() {
  hideAuthModal();
  $("landing").classList.add("hidden"); $("app").classList.remove("hidden");
  const hash = location.hash.replace("#", "");
  await showPage(document.getElementById(hash)?.classList.contains("page") ? hash : "dashboard");
}
function backHome() {
  $("app").classList.add("hidden"); $("landing").classList.remove("hidden"); window.scrollTo(0, 0);
}
function logout() {
  token = null; localStorage.removeItem("studyquest_token");
  backHome(); toast("Logged out.");
}

// ---- Page navigation & rendering ----------------------------------------
async function showPage(page) {
  currentPage = page;
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
  $(page).classList.add("active-page");
  document.querySelectorAll(".side-link[data-page]").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  const title = page[0].toUpperCase() + page.slice(1);
  $("pageTitle").textContent = title;
  if (location.hash !== "#" + page) history.replaceState(null, "", "#" + page);
  await renderAll();
  document.querySelector(".sidebar")?.classList.remove("open");
}

async function loadDashboard() {
  const res = await api("/user/dashboard");
  state.tasks = res.tasks; state.xp = res.xp; state.level = res.level;
  state.streak = res.streak; state.focusSessions = res.focusSessions;
  state.achievements = res.achievements; state.profile = { ...state.profile, ...res.profile };
}
async function loadNotes() {
  const res = await api("/notes");
  state.notes = res.notes;
}

function renderDashboard() {
  const total = state.tasks.length, done = state.tasks.filter(t => t.done).length;
  $("totalTasks").textContent = total; $("completedTasksText").textContent = `${done} completed`;
  $("focusSessions").textContent = state.focusSessions; $("focusCount").textContent = state.focusSessions;
  $("xpEarned").textContent = state.xp; $("streak").textContent = `${state.streak} day${state.streak === 1 ? "" : "s"}`;
  const li = state.tasks.slice(0, 4).map(t => `<div class="mission"><button class="check ${t.done ? "done" : ""}" onclick="toggleTask('${t._id}')">${t.done ? "✓" : ""}</button><div class="mission-info"><b>${escapeHtml(t.name)}</b><small>${escapeHtml(t.subject)}</small></div><span class="mission-xp">+${t.xp} XP</span></div>`).join("");
  $("missionList").innerHTML = li || `<p class="muted">No missions yet. Add your first task!</p>`;
  const l = state.level; $("levelNumber").textContent = l.level; $("levelTitle").textContent = l.title;
  $("levelXp").textContent = `${l.within} / 100 XP`; $("levelProgress").style.width = `${l.within}%`;
  $("motivation").textContent = quotes[new Date().getDate() % quotes.length];
  $("userNameLabel").textContent = state.profile.name;
  $("avatarLetter").textContent = (state.profile.name || "S")[0].toUpperCase();
}
function renderTasks() {
  const tasks = state.tasks.filter(t => taskFilter === "all" || (taskFilter === "completed" ? t.done : !t.done));
  $("allTasks").innerHTML = tasks.length ? tasks.map(t => `
    <div class="task-row ${t.done ? "completed" : ""}">
      <button class="check ${t.done ? "done" : ""}" onclick="toggleTask('${t._id}')">${t.done ? "✓" : ""}</button>
      <div class="task-content"><b>${escapeHtml(t.name)}</b><small>${escapeHtml(t.subject)} • +${t.xp} XP</small></div>
      <button class="delete-btn" title="Delete task" onclick="deleteTask('${t._id}')">🗑</button>
    </div>`).join("") : `<p class="muted">No tasks in this category.</p>`;
}
function renderProgress() {
  const total = state.tasks.length, done = state.tasks.filter(t => t.done).length, pending = total - done, l = state.level;
  $("progressTasks").textContent = `${done} / ${total}`; $("taskBar").style.width = total ? `${done / total * 100}%` : "0%";
  $("progressXp").textContent = l.xp; $("progressLevel").textContent = l.level;
  $("doneLegend").textContent = done; $("pendingLegend").textContent = pending;
  const donePct = total ? done / total * 100 : 0; $("donut").style.background = `conic-gradient(var(--green) 0 ${donePct}%,var(--gold) ${donePct}% 100%)`;
  // Weekly activity chart is illustrative demo data (the backend doesn't track per-day history yet)
  const vals = [35, 58, 42, 72, 50, 85, 62];
  $("weeklyBars").innerHTML = vals.map((v, i) => `<div class="bar-col"><div class="bar-stick" style="height:${v}%"></div><small>${["M", "T", "W", "T", "F", "S", "S"][i]}</small></div>`).join("");
}
function renderAchievements() {
  $("achievementGrid").innerHTML = state.achievements.map(a => `<article class="panel achievement ${a.unlocked ? "" : "locked"}"><div class="badge-icon">${a.icon}</div>${a.unlocked ? '<span class="check-badge">✓</span>' : ""}<h3>${a.title}</h3><p>${a.desc}</p><span class="reward">${a.reward}</span></article>`).join("");
}
function renderNotes() {
  $("notesGrid").innerHTML = state.notes.map(n => `<article class="panel note-card"><div class="note-top"><span class="tag">${escapeHtml(n.category)}</span><button class="delete-btn" onclick="deleteNote('${n._id}')">×</button></div><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.content)}</p><span class="note-date">${new Date(n.createdAt).toLocaleDateString()}</span></article>`).join("") || `<div class="panel"><p class="muted">No notes yet.</p></div>`;
}
function renderSettings() {
  $("profileName").value = state.profile.name; $("profileGoal").value = state.profile.goal;
  $("darkMode").checked = state.profile.theme !== "light"; $("animations").checked = state.profile.animations !== false;
}
async function renderAll() {
  try {
    await loadDashboard();
    await loadNotes();
  } catch (err) {
    if (String(err.message).toLowerCase().includes("log in") || String(err.message).toLowerCase().includes("token")) {
      logout(); return;
    }
    toast(err.message);
    return;
  }
  renderDashboard(); renderTasks(); renderProgress(); renderAchievements(); renderNotes(); renderSettings();
  applyTheme();
}

// ---- Tasks ----------------------------------------------------------------
async function toggleTask(id) {
  const t = state.tasks.find(x => x._id === id); if (!t) return;
  try {
    await api(`/tasks/${id}`, { method: "PATCH", body: { done: !t.done } });
    toast(!t.done ? `Mission complete! +${t.xp} XP 🎉` : "Mission moved back to pending.");
    await renderAll();
  } catch (err) { toast(err.message); }
}
async function deleteTask(id) {
  try { await api(`/tasks/${id}`, { method: "DELETE" }); await renderAll(); toast("Task deleted."); }
  catch (err) { toast(err.message); }
}
function addTask() { $("taskModal").classList.remove("hidden"); $("taskName").focus(); }
function addNote() { $("noteModal").classList.remove("hidden"); $("noteTitle").focus(); }
function closeModal(id) { $(id).classList.add("hidden"); }
async function deleteNote(id) {
  try { await api(`/notes/${id}`, { method: "DELETE" }); await loadNotes(); renderNotes(); toast("Note deleted."); }
  catch (err) { toast(err.message); }
}
window.toggleTask = toggleTask; window.deleteTask = deleteTask; window.deleteNote = deleteNote;

// ---- Focus timer ------------------------------------------------------
function updateTimerDisplay() {
  const m = String(Math.floor(timerSeconds / 60)).padStart(2, "0"), s = String(timerSeconds % 60).padStart(2, "0");
  $("timer").textContent = `${m}:${s}`; $("timerMode").textContent = timerMode === "focus" ? "Focus Time" : "Break Time";
  const max = timerMode === "focus" ? 25 * 60 : 5 * 60;
  $("timer").closest(".timer-ring").style.background = `conic-gradient(#6358f5 0 ${(1 - timerSeconds / max) * 100}%, #1b2b47 ${(1 - timerSeconds / max) * 100}% 100%)`;
  $("timerStart").textContent = timerRunning ? "❚❚ Pause" : "▶ Start";
}
async function timerTick() {
  if (timerSeconds <= 0) {
    if (timerMode === "focus") {
      try { await api("/user/focus-complete", { method: "POST" }); toast("Focus session complete! +25 XP 🎉"); await renderAll(); }
      catch (err) { toast(err.message); }
      timerMode = "break"; timerSeconds = 5 * 60;
    } else { toast("Break finished. Ready for another quest!"); timerMode = "focus"; timerSeconds = 25 * 60; }
    timerRunning = false; clearInterval(timerInterval); timerInterval = null;
  } else timerSeconds--;
  updateTimerDisplay();
}
function toggleTimer() {
  if (timerRunning) { timerRunning = false; clearInterval(timerInterval); timerInterval = null; }
  else { timerRunning = true; timerInterval = setInterval(timerTick, 1000); }
  updateTimerDisplay();
}
function resetTimer() { timerRunning = false; clearInterval(timerInterval); timerInterval = null; timerMode = "focus"; timerSeconds = 25 * 60; updateTimerDisplay(); }

// ---- Theme --------------------------------------------------------------
function applyTheme() {
  document.body.classList.toggle("light", state.profile.theme === "light");
  $("darkMode").checked = state.profile.theme !== "light";
  $("themeToggle").textContent = state.profile.theme === "light" ? "☀" : "☾";
  document.body.classList.toggle("no-animations", state.profile.animations === false);
}

// ---- Event wiring ---------------------------------------------------------
document.addEventListener("click", async e => {
  const pageBtn = e.target.closest("[data-page]"); if (pageBtn) { await showPage(pageBtn.dataset.page); return; }
  const authTabBtn = e.target.closest("[data-auth-tab]"); if (authTabBtn) { switchAuthTab(authTabBtn.dataset.authTab); return; }
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (action === "enter-app") await requireAuthThenEnter();
  if (action === "back-home") backHome();
  if (action === "logout") logout();
  if (action === "close-auth") hideAuthModal();
  if (action === "add-task") addTask();
  if (action === "close-task") closeModal("taskModal");
  if (action === "add-note") addNote();
  if (action === "close-note") closeModal("noteModal");
  if (action === "new-quote") { $("motivation").textContent = quotes[Math.floor(Math.random() * quotes.length)]; }
  if (action === "save-profile") {
    try {
      await api("/user/profile", { method: "PATCH", body: { name: $("profileName").value.trim() || "Student", goal: $("profileGoal").value.trim() } });
      await renderAll(); toast("Profile saved!");
    } catch (err) { toast(err.message); }
  }
});

document.querySelectorAll(".tab[data-filter]").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll(".tab[data-filter]").forEach(t => t.classList.remove("active")); tab.classList.add("active"); taskFilter = tab.dataset.filter; renderTasks();
}));

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    const res = await api("/auth/login", { method: "POST", body: { email: $("loginEmail").value.trim(), password: $("loginPassword").value } });
    token = res.token; localStorage.setItem("studyquest_token", token);
    e.target.reset(); await enterApp(); toast(`Welcome back, ${res.user.name}!`);
  } catch (err) { toast(err.message); }
});
$("registerForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    const res = await api("/auth/register", {
      method: "POST",
      body: { name: $("registerName").value.trim(), email: $("registerEmail").value.trim(), password: $("registerPassword").value }
    });
    token = res.token; localStorage.setItem("studyquest_token", token);
    e.target.reset(); await enterApp(); toast(`Welcome to StudyQuest, ${res.user.name}! 🚀`);
  } catch (err) { toast(err.message); }
});

$("taskForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await api("/tasks", { method: "POST", body: { name: $("taskName").value.trim(), subject: $("taskSubject").value, xp: Number($("taskXp").value) || 50 } });
    e.target.reset(); $("taskXp").value = 50; closeModal("taskModal"); await renderAll(); toast("New mission created! 🚀");
  } catch (err) { toast(err.message); }
});
$("noteForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await api("/notes", { method: "POST", body: { title: $("noteTitle").value.trim(), category: $("noteCategory").value, content: $("noteContent").value.trim() } });
    e.target.reset(); closeModal("noteModal"); await loadNotes(); renderNotes(); toast("Note saved!");
  } catch (err) { toast(err.message); }
});

$("timerStart").addEventListener("click", toggleTimer); $("timerReset").addEventListener("click", resetTimer);
$("mobileMenu").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));
$("themeToggle").addEventListener("click", async () => {
  state.profile.theme = state.profile.theme === "light" ? "dark" : "light"; applyTheme();
  try { await api("/user/profile", { method: "PATCH", body: { theme: state.profile.theme } }); } catch (err) { toast(err.message); }
});
$("darkMode").addEventListener("change", async e => {
  state.profile.theme = e.target.checked ? "dark" : "light"; applyTheme();
  try { await api("/user/profile", { method: "PATCH", body: { theme: state.profile.theme } }); } catch (err) { toast(err.message); }
});
$("animations").addEventListener("change", async e => {
  state.profile.animations = e.target.checked; applyTheme();
  try { await api("/user/profile", { method: "PATCH", body: { animations: state.profile.animations } }); } catch (err) { toast(err.message); }
});

$("dateText").textContent = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
updateTimerDisplay();

// If we already have a saved login token, jump straight into the app.
if (token) { enterApp(); }
