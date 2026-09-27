import { createAstronautPreview } from "../three/astronautPreview";

const NAV_ITEMS = [
  ["overview", "⌂", "Overview"], ["academics", "▤", "Academics"],
  ["people", "♟", "Students & Access"],
  ["achievements", "★", "Achievements"], ["inventory", "▦", "Quests & Inventory"], ["avatar", "◉", "Avatar"],
  ["simulations", "◇", "Learning Labs"], ["chat", "◌", "Class Chat"]
];
const SAMPLE_GRADES = [["Life Science", "A−", 92, "Ecosystem interactions"], ["Earth Science", "B+", 88, "Rock cycle & minerals"], ["Scientific Practice", "A", 96, "Evidence and explanations"]];
const ACHIEVEMENTS = [["Science 101", "Unit medallion", "Earned", "unit-science"], ["Geology on Mars", "Unit medallion", "Earned", "unit-geology"], ["Field Researcher", "Complete your first investigation", "Earned", "field"], ["Evidence Builder", "Submit 5 evidence-based explanations", "3 / 5", "evidence"], ["Systems Thinker", "Balance an ecosystem simulation", "Locked", "systems"]];
const STUDY_UNITS = {
  "Science 101": ["Scientific Thinking", "Matter & Energy", "Living Systems"],
  "Geology on Mars": ["The Red Planet", "Rocks & Minerals", "Planetary Change"],
  "Plate Motion": ["Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4"],
  "Rock Transformation": ["Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4"],
  "Phase Change": ["Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4"],
  "Chemical Reaction": ["Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4"],
  "Population & Resources": ["Chapter 1", "Chapter 2", "Chapter 3"],
  "Matter & Energy in Ecosystems": ["Chapter 1", "Chapter 2", "Chapter 3"]
};
const SPHERES = [
  ["Geosphere", "Rock and plant samples are more likely", "◆", "rock + plant"],
  ["Atmosphere", "Specimen and water samples are more likely", "◌", "specimen + water"],
  ["Hydrosphere", "Water and plant samples are more likely", "≈", "water + plant"],
  ["Biosphere", "Plant and specimen samples are more likely", "❋", "plant + specimen"]
];
const MISSION_UNITS = [
  { id: "science-101", title: "Science 101", destination: "Moon", chapters: 3, x: 14, y: 64 },
  { id: "geology-mars", title: "Geology of Mars", destination: "Mars", chapters: 3, x: 27, y: 48 },
  { id: "plate-motion", title: "Plate Motion", destination: "Io", chapters: 4, x: 40, y: 61 },
  { id: "rock-transformation", title: "Rock Transformation", destination: "Europa", chapters: 4, x: 51, y: 40 },
  { id: "phase-change", title: "Phase Change", destination: "Titan", chapters: 4, x: 64, y: 62 },
  { id: "chemical-reaction", title: "Chemical Reaction", destination: "Neptune", chapters: 4, x: 75, y: 39 },
  { id: "population-resources", title: "Population & Resources", destination: "Eridani Frontier", chapters: 3, x: 86, y: 59 },
  { id: "ecosystem-energy", title: "Matter & Energy in Ecosystems", destination: "Epsilon Eridani", chapters: 3, x: 95, y: 31 }
];
const MISSION_STOPS = [{ kind: "start", title: "Earth · Departure", x: 3, y: 71 }];
MISSION_UNITS.forEach((unit, unitIndex) => {
  const previous = MISSION_STOPS[MISSION_STOPS.length - 1];
  for (let chapter = 1; chapter <= unit.chapters; chapter += 1) {
    const ratio = chapter / (unit.chapters + 1);
    MISSION_STOPS.push({ kind: "chapter", title: `${unit.title} · Chapter ${chapter}`, unitIndex, chapter, x: previous.x + (unit.x - previous.x) * ratio, y: previous.y + (unit.y - previous.y) * ratio });
  }
  MISSION_STOPS.push({ kind: "unit", title: unit.title, destination: unit.destination, unitIndex, x: unit.x, y: unit.y });
});

function el(tag, className = "", text = "") { const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node; }
function icon(name) { return `<span class="dashboard-icon" aria-hidden="true">${name}</span>`; }

export function createStudentDashboard({ root, isAdmin = false, classServers = [], missionPosition = 0, classroomStatus = {}, getStudent = () => ({}), getProgression = () => ({}), getInventory = () => ({}), getQuests = () => ({ quests: [] }), getItemDefinition = () => null, onOpenQuest = () => {}, onDeleteInventoryItem = () => false, onOpenSkills = () => {}, onEnterSimulation = () => {}, onOpenSettings = () => {}, onSendChat = () => false, onDeleteChatMessage = async () => {}, onMuteChatUser = async () => {}, onRequestQuest = () => false, onNextStudyQuestion = async () => ({}), onAnswerStudyQuestion = async () => ({}), onLoadQuestionSets = async () => [], onSaveQuestion = async () => {}, onDeleteQuestionSet = async () => {}, onLoadMarket = async () => ({ credits: 0, listings: [] }), onSellMarketItem = async () => {}, onBuyMarketItem = async () => {}, onSwitchClass = () => {}, onSetMissionPosition = () => {}, onConnectClassroom = async () => {}, onSyncClassroom = async () => ({}), onLoadClassRoster = async () => ({ students: [] }), onAddClassStudent = async () => ({}), onRemoveClassStudent = async () => ({}), onLoadStudentStats = async () => ({}), onLoadAccounts = async () => ({ accounts: [] }), onUpdateAccount = async () => ({}) } = {}) {
  if (!root) return null;
  root.querySelector("#student-dashboard")?.remove();
  const shell = el("main", "student-dashboard"); shell.id = "student-dashboard"; shell.setAttribute("aria-label", "Student learning dashboard");
  const sidebar = el("aside", "dashboard-sidebar");
  const brand = el("div", "dashboard-brand"); brand.innerHTML = `<div class="brand-mark">E³</div><div><strong>Epsilon Academy</strong><small>Learning Command</small></div>`;
  const nav = el("nav", "dashboard-nav"); const navButtons = {};
  NAV_ITEMS.forEach(([key, glyph, label], index) => { if (key === "people" && !isAdmin) return; const button = el("button", `dashboard-nav-item${index === 0 ? " active" : ""}`); button.type = "button"; button.dataset.view = key; button.innerHTML = `${icon(glyph)}<span>${label}</span>`; nav.appendChild(button); navButtons[key] = button; });
  const sidebarFooter = el("div", "dashboard-sidebar-footer"); sidebarFooter.innerHTML = `<span class="status-dot"></span><div><strong>Class connected</strong><small>Teacher controls active</small></div>`; sidebar.append(brand, nav, sidebarFooter);
  const content = el("section", "dashboard-content"); const topbar = el("header", "dashboard-topbar"); const titleGroup = el("div", "dashboard-title-group"); titleGroup.innerHTML = `<span class="eyebrow">Student workspace</span><h1>Mission Overview</h1>`;
  const topActions = el("div", "dashboard-top-actions"); const classPill = el("div", "class-pill", "Period —"); const settings = el("button", "icon-button", "⚙"); settings.type = "button"; settings.title = "Settings"; settings.addEventListener("click", onOpenSettings);
  if (isAdmin) { const serverSelect = el("select", "teacher-server-select"); serverSelect.setAttribute("aria-label", "Active class server"); serverSelect.appendChild(new Option(classServers.length ? "Select class server…" : "No class servers available", "")); classServers.forEach(({ code, name }) => serverSelect.appendChild(new Option(name, code))); serverSelect.value = getStudent().classCode || ""; serverSelect.addEventListener("change", () => { if (serverSelect.value) onSwitchClass(serverSelect.value); }); topActions.appendChild(serverSelect); }
  const userChip = el("div", "user-chip"); userChip.innerHTML = `<span class="user-initial">S</span><div><strong>Student</strong><small class="rank-line">Recruit</small><small class="chapter-line">Current chapter: —</small></div>`; topActions.append(classPill, settings, userChip); topbar.append(titleGroup, topActions);
  const viewport = el("div", "dashboard-viewport"); content.append(topbar, viewport); shell.append(sidebar, content); root.appendChild(shell);
  let activeView = "overview"; let avatarPreview = null; let portalEnabled = true; let chatMessages = []; let achievementQueue = []; let activeAchievement = null; let studyContext = null; let studyQuestion = null; let studyLoading = false; let studyProgress = 0; let selectedInventoryKey = null; let currentMissionPosition = Math.max(0, Math.min(MISSION_STOPS.length - 1, Number(missionPosition) || 0));
  const achievementOverlay = el("div", "achievement-reveal");
  achievementOverlay.hidden = true;
  achievementOverlay.innerHTML = `<div class="confetti-field" aria-hidden="true"></div><div class="reveal-medallion"><span class="medal-glyph">✦</span><small>Achievement unlocked</small><strong>Achievement</strong><em>Continue</em></div><p>Click any button or press any key to continue</p>`;
  for (let i = 0; i < 42; i += 1) {
    const angle = Math.random() * Math.PI * 2; const radius = 150 + Math.random() * 290; const bit = el("i"); bit.style.setProperty("--burst-x", `${Math.cos(angle) * radius}px`); bit.style.setProperty("--burst-y", `${Math.sin(angle) * radius * .58}px`); bit.style.setProperty("--fall-x", `${Math.cos(angle) * (radius + 110)}px`); bit.style.setProperty("--fall-y", `${180 + Math.random() * 280}px`); bit.style.setProperty("--r", `${Math.random() * 240}deg`); bit.style.setProperty("--d", `${Math.random() * .18}s`); achievementOverlay.querySelector(".confetti-field").appendChild(bit);
  }
  shell.appendChild(achievementOverlay);
  const gameLoadingOverlay = el("div", "game-loading-overlay");
  gameLoadingOverlay.hidden = true;
  gameLoadingOverlay.innerHTML = `<div class="game-loading-ship"><img src="assets/ui/mission/e3-expedition-ship.png" alt=""><i></i></div><span class="eyebrow">Preparing expedition</span><h2>Loading Original E3 World</h2><p>Building the simulation, loading world artwork, and reconnecting to your class…</p><div class="game-loading-track"><i></i></div>`;
  shell.appendChild(gameLoadingOverlay);
  function showNextAchievement() {
    activeAchievement = achievementQueue.shift() || null;
    if (!activeAchievement) { achievementOverlay.hidden = true; return; }
    achievementOverlay.querySelector(".medal-glyph").textContent = activeAchievement.glyph || "✦";
    achievementOverlay.querySelector("strong").textContent = activeAchievement.title || "New Achievement";
    achievementOverlay.querySelector("em").textContent = activeAchievement.detail || "Added to your record";
    achievementOverlay.hidden = false;
    achievementOverlay.querySelector(".reveal-medallion").classList.toggle("silver", activeAchievement.metal === "silver");
    achievementOverlay.classList.remove("bursting");
    void achievementOverlay.offsetWidth;
    achievementOverlay.classList.add("bursting");
  }
  function advanceAchievement(event) {
    if (achievementOverlay.hidden) return;
    if (event?.type === "keydown" || event?.type === "click") { event.preventDefault?.(); showNextAchievement(); }
  }
  achievementOverlay.addEventListener("click", advanceAchievement);
  window.addEventListener("keydown", advanceAchievement);
  const studentName = () => getStudent().name || "Student Explorer";
  const progressData = () => { const rank = getProgression()?.profileRank || {}; const xp = Number(rank.pointsIntoLevel ?? rank.xp ?? 0); const needed = Math.max(1, Number(rank.pointsForNextLevel) || 100); return { rank, xp, needed, percent: Math.min(100, Math.round((xp / needed) * 100)) }; };
  function card(title, body, className = "") { const section = el("section", `dashboard-card ${className}`.trim()); section.innerHTML = `<div class="card-heading"><h2>${title}</h2></div>`; section.appendChild(body); return section; }

  function renderOverview() {
    const { rank, xp, needed, percent } = progressData(); const wrap = el("div", "overview-layout"); const welcome = el("section", "welcome-card");
    welcome.innerHTML = `<div><span class="eyebrow">Welcome back</span><h2>${studentName()}</h2><p>Your learning record is ready. Continue an assignment or review your progress.</p><div class="xp-progress"><div><span>Experience progress</span><strong>${xp} / ${needed} XP</strong></div><div class="progress-track"><i style="width:${percent}%"></i></div></div></div><div class="level-orbit"><span>LEVEL</span><strong>${rank.level || 1}</strong><small>${rank.label || "Recruit"}</small></div>`;
    const stats = el("div", "stat-grid"); [["Current average", "92%", "↑ 3% this term"], ["Achievements", "8", "2 nearly complete"], ["Class ranking", "#7", "of 28 students"], ["Learning streak", "6 days", "Personal best: 11"]].forEach(([label, value, note]) => { const stat = el("article", "stat-card"); stat.innerHTML = `<span>${label}</span><strong>${value}</strong><small>${note}</small>`; stats.appendChild(stat); });
    const assignments = el("div", "assignment-list"); [["Ecosystem Carrying Capacity", "Life Science", "Due Friday", "Continue"], ["Mineral Evidence Log", "Earth Science", "Submitted", "Review"], ["Population Graph Reflection", "Scientific Practice", "Due Sep 18", "Begin"]].forEach(([name, subject, due, action], index) => { const row = el("div", "assignment-row"); row.innerHTML = `<span class="assignment-symbol">${["∿", "◆", "⌁"][index]}</span><div><strong>${name}</strong><small>${subject} · ${due}</small></div><button type="button">${action}</button>`; assignments.appendChild(row); });
    const activity = el("div", "activity-list"); activity.innerHTML = `<div><span class="activity-dot gold"></span><p><strong>Achievement unlocked</strong><small>Field Researcher · Yesterday</small></p></div><div><span class="activity-dot blue"></span><p><strong>12 XP earned</strong><small>Mineral Evidence Log · Sep 11</small></p></div><div><span class="activity-dot green"></span><p><strong>Grade updated to 92%</strong><small>Life Science · Sep 10</small></p></div>`;
    wrap.append(welcome, stats, card("Current learning", assignments), card("Recent activity", activity)); return wrap;
  }
  function renderAcademics() { const wrap = el("div", "page-stack"); const student = getStudent(); const classroomPercent = Number(student.googleClassroomPercent ?? 92); const summary = el("div", "section-intro"); summary.innerHTML = `<div><span class="eyebrow">Academic record</span><h2>Grades & feedback</h2><p>Progress here reflects learning evidence, not time spent in a game.</p></div><span class="term-chip">Google Classroom · ${classroomPercent}%</span>`; const classroom = el("div", "classroom-summary"); classroom.innerHTML = `<div class="classroom-mark">G</div><div><span>Google Classroom percentage</span><strong>${classroomPercent}%</strong><small>${student.className || "Current class"} · last synchronized grade</small></div><div class="classroom-progress"><i style="width:${Math.max(0, Math.min(100, classroomPercent))}%"></i></div>`; const table = el("div", "grade-table"); table.innerHTML = `<div class="grade-row grade-header"><span>Course</span><span>Grade</span><span>Progress</span><span>Current focus</span></div>`; SAMPLE_GRADES.forEach(([course, grade, score, focus]) => { const row = el("div", "grade-row"); row.innerHTML = `<strong>${course}</strong><b>${grade}</b><span><i><em style="width:${score}%"></em></i>${score}%</span><small>${focus}</small>`; table.appendChild(row); }); wrap.append(summary, classroom, card("Course progress", table)); if (isAdmin) { const controls = el("section", "dashboard-card classroom-controls"); controls.innerHTML = `<div><span class="eyebrow">Teacher integration</span><h2>Google Classroom</h2><p class="classroom-connection-status">${classroomStatus.connected ? `Connected as ${classroomStatus.email || "teacher"}` : classroomStatus.configured ? "Ready to connect" : "OAuth variables are not configured on the server"}</p></div><button type="button" data-classroom="connect">${classroomStatus.connected ? "Reconnect" : "Connect Google Classroom"}</button><button type="button" data-classroom="sync" ${classroomStatus.connected ? "" : "disabled"}>Synchronize classes & rosters</button>`; controls.addEventListener("click", async (event) => { const button = event.target.closest("button[data-classroom]"); if (!button) return; const status = controls.querySelector(".classroom-connection-status"); button.disabled = true; try { if (button.dataset.classroom === "connect") { status.textContent = "Opening Google authorization…"; await onConnectClassroom(); return; } status.textContent = "Synchronizing Classroom…"; const result = await onSyncClassroom(); status.textContent = `Imported ${result.courses || 0} classes and ${result.rosterEntries || 0} roster entries; ${result.matchedStudents || 0} existing E3 accounts matched.`; } catch (error) { status.textContent = error?.message || "Google Classroom action failed."; } finally { button.disabled = false; } }); wrap.appendChild(controls); } return wrap; }
  function renderMissionMap() {
    const map = el("section", "mission-journey");
    const routePoints = MISSION_STOPS.map((stop) => `${stop.x * 10},${stop.y * 4}`).join(" ");
    map.innerHTML = `<div class="mission-map-heading"><div><span class="eyebrow">Expedition progress</span><h2>Voyage to Epsilon Eridani</h2><p>Gold destinations mark units. Silver signals on the route mark ${MISSION_UNITS.reduce((total, unit) => total + unit.chapters, 0)} chapters.</p></div></div><div class="mission-map-stage"><img class="mission-space-art" src="assets/ui/mission/e3-space-route.png" alt="Planetary voyage from Earth toward Epsilon Eridani"><svg class="mission-route-line" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="rgba(127,229,234,.62)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="9 9" points="${routePoints}"/></svg><div class="mission-start">Earth · Departure</div><div class="mission-chapter-dots"></div><div class="mission-destinations"></div><img class="mission-map-ship" src="assets/ui/mission/e3-expedition-ship.png" alt="E3 expedition ship"></div>`;
    const destinationLayer = map.querySelector(".mission-destinations"); const dotsLayer = map.querySelector(".mission-chapter-dots");
    MISSION_UNITS.forEach((unit, unitIndex) => { const stopIndex = MISSION_STOPS.findIndex((stop) => stop.kind === "unit" && stop.unitIndex === unitIndex); const button = el("button", `mission-destination${stopIndex <= currentMissionPosition ? " reached" : ""}${stopIndex === currentMissionPosition ? " current" : ""}`); button.type = "button"; button.style.left = `${unit.x}%`; button.style.top = `${unit.y}%`; button.innerHTML = `<i></i><strong>${unit.destination}</strong><small>${unit.title}</small>`; button.addEventListener("click", () => { achievementQueue.push({ title: unit.title, detail: `${unit.destination} · ${unit.chapters} chapters`, glyph: unitIndex === MISSION_UNITS.length - 1 ? "✦" : "◉", metal: "gold" }); showNextAchievement(); }); destinationLayer.appendChild(button); });
    MISSION_STOPS.forEach((stop, stopIndex) => { if (stop.kind !== "chapter") return; const dot = el("button", `mission-chapter-dot${stopIndex < currentMissionPosition ? " complete" : ""}${stopIndex === currentMissionPosition ? " current" : ""}`); dot.type = "button"; dot.style.left = `${stop.x}%`; dot.style.top = `${stop.y}%`; dot.title = stop.title; dot.setAttribute("aria-label", `View achievement for ${stop.title}`); dot.addEventListener("click", () => { achievementQueue.push({ title: `Chapter ${stop.chapter}`, detail: MISSION_UNITS[stop.unitIndex].title, glyph: "✦", metal: "silver" }); showNextAchievement(); }); dotsLayer.appendChild(dot); });
    const current = MISSION_STOPS[currentMissionPosition]; const ship = map.querySelector(".mission-map-ship"); ship.style.left = `${current.x}%`; ship.style.top = `${current.y}%`;
    if (isAdmin) { const control = el("div", "mission-position-control"); control.innerHTML = `<div class="mission-position-actions"><button type="button" data-step="-1" ${currentMissionPosition === 0 ? "disabled" : ""}>Undo advance</button><button type="button" data-step="1" ${currentMissionPosition === MISSION_STOPS.length - 1 ? "disabled" : ""}>Advance one stop</button></div><span class="mission-position-status"><small>Ship position</small><strong>${current.title}</strong></span>`; control.addEventListener("click", (event) => { const button = event.target.closest("button[data-step]"); if (!button) return; currentMissionPosition = Math.max(0, Math.min(MISSION_STOPS.length - 1, currentMissionPosition + Number(button.dataset.step))); onSetMissionPosition(currentMissionPosition, MISSION_STOPS[currentMissionPosition]?.title); render("achievements"); }); map.querySelector(".mission-map-heading").appendChild(control); }
    return map;
  }
  function renderAchievements() {
    const wrap = el("div", "page-stack");
    const heading = el("div", "section-intro");
    heading.innerHTML = `<div><span class="eyebrow">Milestones</span><h2>Academic achievements</h2><p>Badges recognize demonstrated skills and completed learning goals.</p></div>`;
    const grid = el("div", "achievement-grid achievement-strip");
    const tokenCount = Number(getProgression()?.tokens?.total) || 0;
    const displayedAchievements = tokenCount > 0 ? [...ACHIEVEMENTS, ["Quest Complete", `${tokenCount} research quest${tokenCount === 1 ? "" : "s"} completed`, "Earned", "quest-complete"]] : ACHIEVEMENTS;
    displayedAchievements.forEach(([name, description, state, kind], index) => { const item = el("article", `achievement-card ${state === "Earned" ? "earned" : ""} ${kind}`); item.innerHTML = `<div class="achievement-medal">${["☀", "◆", "✦", "⬡", "◎"][index % 5]}</div><div><span>${state}</span><h3>${name}</h3><p>${description}</p></div>`; grid.appendChild(item); });
    const original = el("section", "original-achievement-window");
    const skills = getProgression()?.skills || [];
    original.innerHTML = `<div class="original-achievement-heading"><div><span>Original expedition record</span><h2>Skills & Achievements</h2><p>Quest completion advances the same science ranks used in the original world.</p></div><button type="button">Open full Skills window</button></div><div class="original-skill-grid"></div>`;
    const skillGrid = original.querySelector(".original-skill-grid");
    const labels = { geology: "Geology", botany: "Botany", zoology: "Zoology", chemistry: "Chemistry", astrobiology: "Astrobiology" };
    skills.forEach((skill) => { const item = el("article", "original-skill-card"); const needed = Math.max(1, Number(skill.pointsForNextLevel) || 1); const current = Math.max(0, Number(skill.pointsIntoLevel) || 0); item.innerHTML = `<h3>${labels[skill.key] || skill.key} · Rank ${skill.level || 1}</h3><p>${skill.key === "astrobiology" ? "Recover Alien Artifacts and help destroy alien structures." : "Complete communication quests with matching samples to advance this rank."}</p><strong>${current}/${needed} points toward the next level</strong><div><i style="width:${Math.min(100, (current / needed) * 100)}%"></i></div>`; skillGrid.appendChild(item); });
    if (!skills.length) skillGrid.innerHTML = `<p class="original-skills-empty">Complete a quest to begin building science skill ranks.</p>`;
    original.querySelector("button").addEventListener("click", onOpenSkills);
    wrap.append(heading, renderMissionMap(), grid, original);
    if (isAdmin) { const controls = el("section", "dashboard-card achievement-controls"); controls.innerHTML = `<div><span class="eyebrow">Teacher controls</span><h2>Award achievements</h2><p>Award a milestone to one student or the whole class.</p></div><select aria-label="Achievement recipient"><option>Whole class</option><option>Current student preview</option></select><button type="button" data-award="Science 101">Award New Unit: Science 101</button><button type="button" data-award="Geology on Mars">Award New Unit: Geology on Mars</button><button type="button" data-award="New Chapter">Award New Chapter</button>`; controls.addEventListener("click", (event) => { const button = event.target.closest("button[data-award]"); if (!button) return; const title = button.dataset.award; achievementQueue.push({ title, detail: title === "New Chapter" ? `Chapter: ${getStudent().currentChapter || "New chapter"}` : `Unit: ${title}`, glyph: title.includes("Geology") ? "◆" : title === "New Chapter" ? "◉" : "☀" }); showNextAchievement(); }); wrap.appendChild(controls); }
    return wrap;
  }
  function renderStudents(includeHeading = true) {
    const wrap = el("div", "page-stack teacher-roster-page");
    const activeClass = classServers.find((entry) => entry.code === getStudent().classCode) || classServers[0];
    if (includeHeading) wrap.innerHTML = `<div class="section-intro"><div><span class="eyebrow">Teacher controls</span><h2>Class roster</h2><p>Classroom students appear automatically after synchronization. Their verified Google sign-in email links them to E3.</p></div></div>`;
    if (!activeClass?.id) { wrap.appendChild(el("section", "dashboard-card roster-empty", "Select a class server above to view its students.")); return wrap; }
    const form = el("form", "dashboard-card roster-add-form");
    form.innerHTML = `<div><span class="eyebrow">Authorize an email</span><h3>${activeClass.name}</h3></div><input name="displayName" aria-label="Student name" placeholder="Student name (optional)"><input name="email" type="email" required aria-label="Student email" placeholder="student@school.org"><button type="submit">Allow Google sign-in</button><small class="roster-form-status"></small>`;
    const layout = el("div", "roster-layout"); const list = el("section", "dashboard-card roster-list"); const detail = el("aside", "dashboard-card roster-detail");
    list.innerHTML = `<div class="roster-loading">Loading students…</div>`; detail.innerHTML = `<span class="eyebrow">Student overview</span><h3>Select a student</h3><p>Click a linked student to view their E3 account status and inventory summary.</p>`; layout.append(list, detail); wrap.append(form, layout);
    const load = async () => {
      try {
        const result = await onLoadClassRoster(activeClass.id); const students = result.students || [];
        list.innerHTML = `<div class="card-heading"><div><span class="eyebrow">${students.length} students</span><h2>${result.class?.name || activeClass.name}</h2></div></div><div class="roster-rows"></div>`;
        const rows = list.querySelector(".roster-rows");
        if (!students.length) rows.appendChild(el("p", "roster-empty", "No students yet. Synchronize Google Classroom or add one by email."));
        students.forEach((student) => {
          const row = el("div", `roster-row${student.inClass ? " linked" : ""}`); row.innerHTML = `<button type="button" class="roster-student"><span class="roster-avatar">${(student.displayName || "S").charAt(0).toUpperCase()}</span><span><strong>${student.displayName}</strong><small>${student.email || "Email hidden by Google"}</small></span></button><span class="roster-source">${student.inClass ? "E3 linked" : "Ready for Google"}</span>${student.inClass ? `<button type="button" class="roster-remove">Remove</button>` : ""}`;
          row.querySelector(".roster-student").disabled = !student.inClass;
          row.querySelector(".roster-student").addEventListener("click", async () => { detail.innerHTML = `<p>Loading overview…</p>`; try { const stats = (await onLoadStudentStats(activeClass.id, student.userId)).student; detail.innerHTML = `<span class="eyebrow">Student overview</span><h3>${stats.displayName}</h3><p>${stats.email || "No email available"}</p><div class="roster-stat-grid"><div><strong>${stats.online ? "Online" : "Offline"}</strong><small>Connection</small></div><div><strong>${stats.inventoryItems}</strong><small>Inventory items</small></div><div><strong>${stats.inventoryTypes}</strong><small>Item types</small></div></div><p class="roster-note">Grades, XP, achievements, level, and ranking will appear here as those overview values are moved into persistent student records.</p>`; } catch (error) { detail.innerHTML = `<p>${error?.message || "Could not load student overview."}</p>`; } });
          row.querySelector(".roster-remove")?.addEventListener("click", async (event) => { const button = event.currentTarget; button.disabled = true; try { await onRemoveClassStudent(activeClass.id, student.userId); await load(); } catch (error) { button.disabled = false; detail.innerHTML = `<p class="roster-error">${error?.message || "Could not remove the student."}</p>`; } });
          rows.appendChild(row);
        });
      } catch (error) { list.innerHTML = `<p class="roster-error">${error?.message || "Could not load the class roster."}</p>`; }
    };
    form.addEventListener("submit", async (event) => { event.preventDefault(); const status = form.querySelector(".roster-form-status"); const button = form.querySelector("button"); button.disabled = true; status.textContent = "Authorizing email…"; try { const result = await onAddClassStudent(activeClass.id, { email: form.elements.email.value, displayName: form.elements.displayName.value }); status.textContent = result.pendingGoogleSignIn ? "Email authorized. The student can now use Sign in with Google—no invitation email was sent." : "Existing E3 account linked to this class."; form.reset(); await load(); } catch (error) { status.textContent = error?.message || "Could not authorize student."; } finally { button.disabled = false; } });
    load(); return wrap;
  }
  function renderPeople() {
    const wrap = el("div", "page-stack people-admin-page");
    wrap.innerHTML = `<div class="section-intro"><div><span class="eyebrow">Teacher controls</span><h2>Students & access</h2><p>Manage the selected class roster, authorize student emails, inspect student records, and assign account roles in one place.</p></div></div>`;
    const roster = renderStudents(false);
    const panel = el("section", "dashboard-card people-list"); panel.innerHTML = `<p>Loading accounts…</p>`; wrap.append(roster, panel);
    const load = async () => { try { const result = await onLoadAccounts(); const accounts = result.accounts || []; panel.innerHTML = `<div class="inventory-toolbar"><div><span class="eyebrow">${accounts.length} accounts</span><h2>Recent logins</h2></div><span>Newest first</span></div><div class="people-rows"></div>`; const rows = panel.querySelector(".people-rows"); accounts.forEach((account) => { const row = el("article", "people-row"); const classOptions = [`<option value="">Unassigned</option>`, ...classServers.map((entry) => `<option value="${entry.id}" ${entry.id === account.classId ? "selected" : ""}>${entry.name}</option>`)].join(""); row.innerHTML = `<div class="people-identity"><span class="roster-avatar">${(account.displayName || "U").charAt(0).toUpperCase()}</span><span><strong>${account.displayName}</strong><small>${account.email}</small><em>${account.lastSignInAt ? `Last login ${new Date(account.lastSignInAt).toLocaleDateString()}` : "Account created; no completed login yet"}</em></span></div><label>Role<select class="people-role"><option value="student" ${account.role === "student" ? "selected" : ""}>Student</option><option value="teacher" ${account.role === "teacher" ? "selected" : ""}>Teacher</option></select></label><label>Class<select class="people-class" ${account.role === "teacher" ? "disabled" : ""}>${classOptions}</select></label><button type="button">Save access</button><small class="people-status"></small>`; const role = row.querySelector(".people-role"); const classSelect = row.querySelector(".people-class"); role.addEventListener("change", () => { classSelect.disabled = role.value === "teacher"; }); row.querySelector("button").addEventListener("click", async (event) => { const button = event.currentTarget; const status = row.querySelector(".people-status"); button.disabled = true; status.textContent = "Saving…"; try { const updated = await onUpdateAccount(account.userId, { role: role.value, classId: classSelect.value }); status.textContent = updated.requiresRelogin ? "Saved. This person should log out and back in." : "Saved."; } catch (error) { status.textContent = error?.message || "Could not update access."; } finally { button.disabled = false; } }); rows.appendChild(row); }); } catch (error) { panel.innerHTML = `<p class="roster-error">${error?.message || "Could not load accounts."}</p>`; } };
    load(); return wrap;
  }
  function renderAvatar() { const wrap = el("div", "avatar-layout avatar-only-layout"); const preview = el("div", "dashboard-avatar-preview"); const stage = el("div", "dashboard-avatar-stage"); preview.appendChild(stage); const caption = el("div", "avatar-caption"); caption.innerHTML = `<span>3D avatar</span><h2>${studentName()}</h2><p>Outfit choices and wearable customization will appear here.</p>`; preview.appendChild(caption); const coming = el("section", "dashboard-card outfit-preview"); coming.innerHTML = `<span class="eyebrow">Outfit bay</span><h2>Outfits coming next</h2><p>Your avatar is now separate from collected samples and quests. Future suits, helmets, and accessories will be managed on this page.</p>`; wrap.append(preview, coming); requestAnimationFrame(() => { avatarPreview = createAstronautPreview(stage); }); return wrap; }
  function renderInventoryAndQuests() {
    const wrap = el("div", "page-stack");
    const counts = getInventory() || {};
    const keys = Object.keys(counts).filter((key) => Number(counts[key]) > 0);
    if (selectedInventoryKey && !keys.includes(selectedInventoryKey)) selectedInventoryKey = null;
    const slotLimit = Math.max(1, Number(getProgression()?.vitals?.inventorySlots) || 12);
    const usedSlots = keys.reduce((total, key) => total + Math.ceil(Number(counts[key]) / 10), 0);
    const inventory = el("section", "dashboard-card inventory-browser");
    inventory.innerHTML = `<div class="inventory-toolbar"><div><span class="eyebrow">Collection</span><h2>Scientific inventory</h2></div><div class="dashboard-inventory-actions"><span>${usedSlots}/${slotLimit} slots</span><button type="button" class="inventory-sell" ${selectedInventoryKey ? "" : "disabled"}>Sell 1</button><button type="button" class="inventory-delete" ${selectedInventoryKey ? "" : "disabled"}>Delete 1</button></div></div>`;
    const grid = el("div", "dashboard-inventory-grid");
    if (!keys.length) {
      grid.innerHTML = `<p class="dashboard-inventory-empty">Your inventory is empty. Complete an Orbital Study Archive mastery bar or collect samples in a simulation.</p>`;
    }
    keys.forEach((key, index) => {
      const def = getItemDefinition(key) || {};
      const item = el("button", `inventory-tile${selectedInventoryKey === key ? " selected" : ""}`);
      item.type = "button";
      item.innerHTML = `${def.imageSrc ? `<img src="${def.imageSrc}" alt="">` : `<span>${["◆", "❋", "≈", "◌"][index % 4]}</span>`}<strong>${def.label || key.replaceAll("_", " ")}</strong><small>× ${counts[key]}</small>`;
      item.addEventListener("click", () => { selectedInventoryKey = selectedInventoryKey === key ? null : key; render("inventory"); });
      grid.appendChild(item);
    });
    inventory.querySelector(".inventory-delete").addEventListener("click", () => {
      if (!selectedInventoryKey) return;
      onDeleteInventoryItem(selectedInventoryKey);
    });
    inventory.querySelector(".inventory-sell").addEventListener("click", async (event) => {
      if (!selectedInventoryKey) return;
      event.currentTarget.disabled = true;
      try { await onSellMarketItem(selectedInventoryKey); selectedInventoryKey = null; render("inventory"); }
      catch (error) { window.alert(error?.message || "The item could not be listed."); event.currentTarget.disabled = false; }
    });
    inventory.appendChild(grid);

    const quests = el("section", "dashboard-card dashboard-quest-list");
    const snapshot = getQuests() || {};
    const active = snapshot.quests || [];
    quests.innerHTML = `<div class="inventory-toolbar"><div><span class="eyebrow">Sample missions</span><h2>Active quests</h2></div><span>${active.length}/${snapshot.maxQuests || 5}</span></div><div class="quest-list-body"></div>`;
    const body = quests.querySelector(".quest-list-body");
    if (!active.length) body.innerHTML = `<p>No active quests. Receive one from the Learning Labs.</p>`;
    active.forEach((quest) => {
      const eligible = Math.max(0, Number(quest.eligibleInventoryCount ?? quest.progress) || 0);
      const ready = quest.status === "ready" || eligible >= Number(quest.requiredCount || 1);
      const row = el("button", `dashboard-quest-row${ready ? " ready" : ""}`);
      row.type = "button";
      row.innerHTML = `<strong>${quest.resourceLabel || "Sample collection"}</strong><span>${eligible}/${quest.requiredCount || 1} eligible · ${quest.minimumQuality || "common"} or better</span><small>${ready ? "Ready — click to select the items for this quest" : "Click to review eligible items"}</small>`;
      row.addEventListener("click", () => onOpenQuest(quest.id));
      body.appendChild(row);
    });
    const market = el("section", "dashboard-card trading-post");
    market.innerHTML = `<div class="inventory-toolbar"><div><span class="eyebrow">Expedition exchange</span><h2>Nova Trading Post</h2></div><strong class="nova-balance">Loading Nova Credits…</strong></div><div class="market-listings"><p>Loading available listings…</p></div>`;
    onLoadMarket().then((snapshot) => {
      if (!market.isConnected) return;
      market.querySelector(".nova-balance").textContent = `${Number(snapshot?.credits) || 0} Nova Credits`;
      const listingRoot = market.querySelector(".market-listings"); const listings = snapshot?.listings || [];
      listingRoot.replaceChildren();
      if (!listings.length) listingRoot.innerHTML = `<p>No samples are listed yet. Select an inventory item and choose Sell 1.</p>`;
      listings.forEach((listing) => { const def = getItemDefinition(listing.itemId) || {}; const card = el("article", "market-listing"); card.innerHTML = `<div><strong>${def.label || listing.itemId.replaceAll("_", " ")}</strong><small>${listing.rarity} · listed by ${listing.sellerName}</small></div><button type="button">Buy · ${listing.price} Nova</button>`; card.querySelector("button").addEventListener("click", async (event) => { event.currentTarget.disabled = true; try { await onBuyMarketItem(listing.id); render("inventory"); } catch (error) { window.alert(error?.message || "Purchase failed."); event.currentTarget.disabled = false; } }); listingRoot.appendChild(card); });
    }).catch((error) => { if (market.isConnected) market.querySelector(".market-listings").innerHTML = `<p class="roster-error">${error?.message || "Trading Post unavailable."}</p>`; });
    wrap.append(inventory, quests, market);
    return wrap;
  }
  function renderSimulations() {
    const wrap = el("div", "page-stack");
    const heading = el("div", "section-intro");
    heading.innerHTML = `<div><span class="eyebrow">Teacher-directed activities</span><h2>Learning Labs</h2><p>Choose a simulation or open the question-based study archive.</p></div><span class="portal-status ${portalEnabled ? "open" : ""}">${portalEnabled ? "Labs online" : "Labs paused"}</span>`;
    const destinations = el("div", "lab-destination-grid");
    destinations.innerHTML = `<article class="lab-destination original-world"><span>EXPEDITION SIMULATION</span><h3>Original E3 World</h3><p>Enter the original multiplayer field simulation with exploration, resources, quests, and portals.</p><button type="button" ${portalEnabled ? "" : "disabled"}>Enter simulation</button></article><article class="lab-destination study-archive"><span>QUESTION EXPEDITION</span><h3>Orbital Study Archive</h3><p>Answer chapter questions and earn weighted samples for every correct response.</p><button type="button" ${portalEnabled ? "" : "disabled"}>Plan an expedition</button></article>`;
    destinations.querySelector(".original-world button").addEventListener("click", async () => {
      gameLoadingOverlay.hidden = false;
      try { await onEnterSimulation("original"); gameLoadingOverlay.hidden = true; }
      catch (error) { gameLoadingOverlay.hidden = true; window.alert(error?.message || "The Original E3 World could not be loaded."); }
    });
    const planner = el("section", "dashboard-card study-planner");
    planner.innerHTML = `<div class="study-step"><span>01</span><label>Unit<select id="study-unit">${Object.keys(STUDY_UNITS).map((unit) => `<option>${unit}</option>`).join("")}</select></label></div><div class="study-step"><span>02</span><label>Chapter<select id="study-chapter"></select></label></div><div class="study-step"><span>03</span><label>Question pool<select id="study-scope"><option value="current">This unit only</option><option value="all">This and previous units</option></select></label></div><div class="study-step sphere-step"><span>04</span><div><strong>Choose a sphere</strong><small>Sphere choice changes sample-type probability. Original rarity odds remain unchanged.</small></div></div><div class="sphere-grid"></div><div class="study-actions"><div><strong>Field quests available</strong><small>Original quest odds, delay, and five-quest maximum apply</small></div><button type="button" class="quest-request">Receive a new quest</button></div>`;
    planner.hidden = true;
    destinations.querySelector(".study-archive button").addEventListener("click", () => { planner.hidden = false; planner.scrollIntoView({ behavior: "smooth", block: "start" }); });
    const unitSelect = planner.querySelector("#study-unit"); const chapterSelect = planner.querySelector("#study-chapter");
    const fillChapters = () => { chapterSelect.innerHTML = STUDY_UNITS[unitSelect.value].map((chapter) => `<option>${chapter}</option>`).join(""); }; fillChapters(); unitSelect.addEventListener("change", fillChapters);
    SPHERES.forEach(([name, description, glyph, bonus]) => { const sphere = el("button", `sphere-option ${name.toLowerCase()}`); sphere.type = "button"; sphere.disabled = !portalEnabled; sphere.innerHTML = `<span>${glyph}</span><strong>${name}</strong><small>${description}</small><em>Boost: ${bonus}</em>`; sphere.addEventListener("click", () => { studyContext = { unit: unitSelect.value, chapter: chapterSelect.value, sphere: name, scope: planner.querySelector("#study-scope").value }; studyQuestion = null; studyProgress = 0; render("study"); loadNextStudyQuestion(); }); planner.querySelector(".sphere-grid").appendChild(sphere); });
    planner.querySelector(".quest-request").addEventListener("click", () => onRequestQuest()); wrap.append(heading, destinations, planner);
    if (isAdmin) { const controls = el("section", "admin-lab-controls dashboard-card"); controls.innerHTML = `<div><span class="eyebrow">Teacher controls</span><h2>Learning Lab access</h2><p>Control all destinations for this class or configure individual access.</p></div><label><span>Enable for whole class</span><input type="checkbox" ${portalEnabled ? "checked" : ""}></label><button type="button">Individual students</button>`; controls.querySelector("input").addEventListener("change", (event) => { portalEnabled = event.target.checked; render("simulations"); }); wrap.appendChild(controls); wrap.appendChild(renderQuestionEditor()); }
    return wrap;
  }
  function renderQuestionEditor() {
    const panel = el("section", "dashboard-card question-set-editor");
    panel.innerHTML = `<div class="inventory-toolbar"><div><span class="eyebrow">Teacher question bank</span><h2>Orbital Study Archive sets</h2></div><span>Ship-linked chapters</span></div><form class="question-editor-form"><input type="hidden" name="setId"><input type="hidden" name="questionId"><label>Ship stop<select name="missionPosition">${MISSION_STOPS.map((stop, index) => index ? `<option value="${index}">${stop.title}</option>` : "").join("")}</select></label><label>Unit<input name="unitName" required></label><label>Chapter<input name="chapterName" required></label><label class="wide">Question<textarea name="prompt" required></textarea></label>${[0,1,2,3].map((index) => `<label>Answer ${index + 1}<input name="answer${index}" required></label>`).join("")}<label>Correct answer<select name="correctIndex">${[0,1,2,3].map((index) => `<option value="${index}">Answer ${index + 1}</option>`).join("")}</select></label><div class="question-editor-actions"><button type="submit">Save question</button><button type="reset">Clear</button><small class="question-editor-status"></small></div></form><div class="question-set-list"><p>Loading question sets…</p></div>`;
    const form = panel.querySelector("form"); const list = panel.querySelector(".question-set-list");
    const load = async () => { try { const sets = await onLoadQuestionSets(); list.replaceChildren(); if (!sets.length) list.innerHTML = `<p>No sets yet. Add the first question above.</p>`; sets.forEach((set) => { const group = el("article", "question-set-group"); group.innerHTML = `<header><div><strong>${set.unit_name} · ${set.chapter_name}</strong><small>${MISSION_STOPS[set.mission_position]?.title || `Stop ${set.mission_position}`} · ${(set.study_questions || []).length} questions</small></div><button type="button" class="delete-set">Delete set</button></header><div class="question-set-rows"></div>`; (set.study_questions || []).forEach((question) => { const row = el("button", "question-set-row"); row.type = "button"; row.textContent = question.prompt; row.addEventListener("click", () => { form.elements.setId.value = set.set_id; form.elements.questionId.value = question.question_id; form.elements.missionPosition.value = set.mission_position; form.elements.unitName.value = set.unit_name; form.elements.chapterName.value = set.chapter_name; form.elements.prompt.value = question.prompt; (question.answers || []).slice(0,4).forEach((answer,index) => { form.elements[`answer${index}`].value = answer; }); form.elements.correctIndex.value = question.correct_index; form.scrollIntoView({ behavior:"smooth", block:"center" }); }); group.querySelector(".question-set-rows").appendChild(row); }); group.querySelector(".delete-set").addEventListener("click", async () => { if (!window.confirm(`Delete ${set.unit_name} · ${set.chapter_name} and all of its questions?`)) return; await onDeleteQuestionSet(set.set_id); await load(); }); list.appendChild(group); }); } catch (error) { list.innerHTML = `<p class="roster-error">${error?.message || "Could not load question sets."}</p>`; } };
    form.elements.missionPosition.addEventListener("change", () => { const stop = MISSION_STOPS[Number(form.elements.missionPosition.value)]; if (!stop) return; const unit = stop.unitIndex == null ? "" : MISSION_UNITS[stop.unitIndex]?.title; form.elements.unitName.value = unit || ""; form.elements.chapterName.value = stop.kind === "chapter" ? `Chapter ${stop.chapter}` : stop.title; });
    form.addEventListener("submit", async (event) => { event.preventDefault(); const status = form.querySelector(".question-editor-status"); status.textContent = "Saving…"; try { await onSaveQuestion({ setId: form.elements.setId.value || null, questionId: form.elements.questionId.value || null, missionPosition: form.elements.missionPosition.value, unitName: form.elements.unitName.value.trim(), chapterName: form.elements.chapterName.value.trim(), prompt: form.elements.prompt.value.trim(), answers: [0,1,2,3].map((index) => form.elements[`answer${index}`].value.trim()), correctIndex: form.elements.correctIndex.value }); form.reset(); status.textContent = "Saved."; await load(); } catch (error) { status.textContent = error?.message || "Could not save question."; } });
    load(); return panel;
  }
  async function loadNextStudyQuestion() {
    if (!studyContext || studyLoading) return;
    studyLoading = true;
    try { const result = await onNextStudyQuestion(studyContext.scope === "current" ? studyContext.unit : null); studyQuestion = result?.question || null; studyProgress = Number(result?.points) || 0; }
    catch (error) { studyQuestion = { error: error?.message || "Could not load a study question." }; }
    finally { studyLoading = false; if (activeView === "study") render("study"); }
  }
  function renderStudySession() {
    const wrap = el("div", "study-session");
    wrap.innerHTML = `<div class="study-session-header"><button type="button">← Learning Labs</button><div><span>${studyContext?.unit || "Archive"} · ${studyContext?.scope === "all" ? "Current + previous units" : "Current unit"}</span><h2>${studyContext?.sphere || "Orbital"} Expedition</h2></div><em>Adaptive review</em></div><div class="study-mastery" role="progressbar" aria-label="Study progress" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${studyProgress}"><i style="width:${studyProgress * 10}%"></i></div><section class="study-question-card"><span>ARCHIVE PROMPT</span><h3></h3><div class="study-answer-grid"></div><p class="study-feedback">Fill the bar with correct answers. An incorrect answer removes three steps.</p></section>`;
    wrap.querySelector(".study-session-header button").addEventListener("click", () => render("simulations"));
    const heading = wrap.querySelector("h3"); const answers = wrap.querySelector(".study-answer-grid");
    if (studyLoading || !studyQuestion) { heading.textContent = "Retrieving the next archive question…"; return wrap; }
    if (studyQuestion.error || !studyQuestion.id) { heading.textContent = studyQuestion.error || "No questions are available for the ship’s current position."; wrap.querySelector(".study-feedback").textContent = "Ask your teacher to add or activate a question set for this chapter."; return wrap; }
    heading.textContent = studyQuestion.prompt;
    (studyQuestion.answers || []).forEach((answer, index) => { const button = el("button", "study-answer", answer); button.type = "button"; button.addEventListener("click", async () => { const feedback = wrap.querySelector(".study-feedback"); wrap.querySelectorAll(".study-answer").forEach((entry) => { entry.disabled = true; }); try { const result = await onAnswerStudyQuestion({ questionId: studyQuestion.id, selectedIndex:index, sphere:studyContext.sphere }); studyProgress = Number(result?.points) || 0; button.classList.add(result?.correct ? "correct" : "wrong"); feedback.textContent = result?.reward ? "Mastery achieved! The prize wheel is awarding your sample. Your bar has restarted." : result?.correct ? "Correct. The mastery signal increased." : "Incorrect. The mastery signal dropped three steps."; window.setTimeout(() => { studyQuestion = null; render("study"); loadNextStudyQuestion(); }, result?.reward ? 2400 : 900); } catch (error) { feedback.textContent = error?.message || "The answer could not be recorded."; wrap.querySelectorAll(".study-answer").forEach((entry) => { entry.disabled = false; }); } }); answers.appendChild(button); });
    return wrap;
  }
  function renderChat() { const wrap = el("div", "chat-page"); const transcript = el("section", "dashboard-card dashboard-chat"); transcript.innerHTML = `<div class="card-heading"><div><span class="eyebrow">Supabase Realtime</span><h2>Class chat</h2></div><span class="online-label"><i></i> Class online</span></div><div class="chat-messages"><div class="system-message">Private class messages remain available without the multiplayer world server.</div></div>`; const messages = transcript.querySelector(".chat-messages"); const currentUserId = String(getStudent()?.userId || ""); chatMessages.forEach((message) => { const line = el("div", `dashboard-chat-line ${message.kind || "chat"}${message.deletedAt ? " deleted" : ""}`); const text = el("span"); text.textContent = message.deletedAt ? (isAdmin ? `${message.displayName}: ${message.body} (deleted)` : "Message deleted") : (message.text || `${message.displayName}: ${message.body}`); line.appendChild(text); if (!message.deletedAt && message.id && (isAdmin || String(message.userId) === currentUserId)) { const actions = el("span", "chat-message-actions"); const remove = el("button", "", "Delete"); remove.type = "button"; remove.addEventListener("click", async () => { remove.disabled = true; try { await onDeleteChatMessage(message.id); } catch (error) { window.alert(error?.message || "Message could not be deleted."); remove.disabled = false; } }); actions.appendChild(remove); if (isAdmin && message.userId && String(message.userId) !== currentUserId) { const mute = el("button", "", "Silence 15m"); mute.type = "button"; mute.addEventListener("click", async () => { mute.disabled = true; try { await onMuteChatUser(message.userId, 15); mute.textContent = "Silenced"; } catch (error) { window.alert(error?.message || "Student could not be silenced."); mute.disabled = false; } }); actions.appendChild(mute); } line.appendChild(actions); } messages.appendChild(line); }); const form = el("form", "dashboard-chat-form"); form.innerHTML = `<input aria-label="Chat message" maxlength="240" placeholder="Message your class"><button type="submit">Send</button><small class="chat-form-status"></small>`; const input = form.querySelector("input"); ["keydown", "keyup", "keypress"].forEach((eventName) => input.addEventListener(eventName, (event) => event.stopPropagation())); form.addEventListener("submit", async (event) => { event.preventDefault(); const text = input.value.trim(); const status = form.querySelector(".chat-form-status"); status.textContent = ""; if (!text) return; try { if (await onSendChat(text)) input.value = ""; } catch (error) { status.textContent = error?.message || "Message could not be sent."; } }); transcript.appendChild(form); wrap.appendChild(transcript); requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; }); return wrap; }
  function render(view = activeView) { avatarPreview?.dispose?.(); avatarPreview = null; activeView = view; Object.entries(navButtons).forEach(([key, button]) => button.classList.toggle("active", key === view || (view === "study" && key === "simulations"))); const labels = { overview: "Mission Overview", academics: "Academic Record", people: "Students & Access", achievements: "Achievements", inventory: "Quests & Inventory", avatar: "Avatar", simulations: "Learning Labs", study: "Orbital Study Archive", chat: "Class Chat" }; titleGroup.querySelector("h1").textContent = labels[view] || "Student Workspace"; viewport.replaceChildren(view === "academics" ? renderAcademics() : view === "people" && isAdmin ? renderPeople() : view === "achievements" ? renderAchievements() : view === "inventory" ? renderInventoryAndQuests() : view === "avatar" ? renderAvatar() : view === "simulations" ? renderSimulations() : view === "study" ? renderStudySession() : view === "chat" ? renderChat() : renderOverview()); const student = getStudent(); const rank = getProgression()?.profileRank || {}; classPill.textContent = student.className || "Class connected"; userChip.querySelector("strong").textContent = student.name || "Student"; userChip.querySelector(".rank-line").textContent = `Level ${rank.level || 1} · ${rank.label || "Recruit"}`; userChip.querySelector(".chapter-line").textContent = `Current chapter: ${student.currentChapter || "Not assigned"}`; userChip.querySelector(".user-initial").textContent = (student.name || "S").charAt(0).toUpperCase(); }
  nav.addEventListener("click", (event) => { const button = event.target.closest("button[data-view]"); if (button) render(button.dataset.view); }); render();
  return { show() { shell.hidden = false; render(activeView); }, hide() { shell.hidden = true; avatarPreview?.dispose?.(); avatarPreview = null; }, refresh() { if (!shell.hidden) render(activeView); }, setMissionPosition(index) { currentMissionPosition = Math.max(0, Math.min(MISSION_STOPS.length - 1, Number(index) || 0)); if (activeView === "achievements" && !shell.hidden) render("achievements"); }, replaceChat(messages = []) { chatMessages = messages.slice(-100); if (activeView === "chat" && !shell.hidden) render("chat"); }, appendChat(message) { chatMessages.push(message); chatMessages = chatMessages.slice(-100); if (activeView === "chat" && !shell.hidden) render("chat"); }, enqueueAchievement(achievement) { achievementQueue.push(achievement); if (!activeAchievement) showNextAchievement(); }, destroy() { avatarPreview?.dispose?.(); window.removeEventListener("keydown", advanceAchievement); shell.remove(); } };
}
