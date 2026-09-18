import { supabase } from "./supabase";
import Phaser from "phaser";
import { Client, Callbacks } from "@colyseus/sdk";
import { createThreeBackground } from "./three/backgroundScene";
import { createAstronautPreview } from "./three/astronautPreview";
import { createPortalPreview } from "./three/portalPreview";
import { createGLTFModelPreview } from "./three/gltfModelPreview";
import { createProceduralObjectPreview } from "./three/proceduralObjectPreview";
import { createWorldPortalLayer } from "./three/worldPortalLayer";
import { createWorldOverheadLayer } from "./three/worldOverheadLayer";
import { createResourceCollectionSequence } from "./ui/resourceCollectionSequence";
import { createStudentDashboard } from "./ui/studentDashboard";

const ADMIN_EMAIL = "mnelsen@susd.net";
const DEFAULT_CLASS_SERVERS = [];

function getConfiguredClassServers() {
  try {
    const stored = JSON.parse(localStorage.getItem("e3ClassServers") || "null");
    return Array.isArray(stored) && stored.length ? stored : DEFAULT_CLASS_SERVERS;
  } catch {
    return DEFAULT_CLASS_SERVERS;
  }
}

function isAdminUser() {
  return (authUser?.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

function getGameServerUrl() {
  return (import.meta.env.VITE_GAME_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:2567`).replace(/\/$/, "");
}

async function loadTeacherClassServers(accessToken) {
  const response = await fetch(`${getGameServerUrl()}/api/classes`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `Class server request failed (${response.status})`);
  const servers = Array.isArray(payload?.classes)
    ? payload.classes.filter((entry) => entry?.code).map((entry) => ({ id: String(entry.id || ""), code: String(entry.code), name: String(entry.name || entry.code) }))
    : [];
  localStorage.setItem("e3ClassServers", JSON.stringify(servers));
  return servers;
}

async function gameServerApi(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;
  if (!accessToken) throw new Error("Sign in before using teacher integrations.");
  const response = await fetch(`${getGameServerUrl()}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `Server request failed (${response.status})`);
  return payload;
}

/*
CLIENT STATE VARIABLES
----------------------
Purpose:
Store the main game, room, UI, and player state used by the client.

Includes:
- multiplayer connection state
- local Phaser references
- station UI references
- inventory UI references
- chat UI references
- announcement banner reference
- resolved class info for the current player
- player sprite settings
- room tile state
- dev tile editor state
*/

let resolvedClassCode = "";
let resolvedClassName = "";
let activeMatchClassCode = "";
let isNormalizingClassRoom = false;

let game;
let sceneRef;
let client;
let room;
let players = {};
let myId = null;
let cursors;
let movementKeys = null;
let interactKey;
let joined = false;
let authUser = null;
let authStatusText = null;

let stationText = null;
let stationBar = null;
let roomFrameGraphics = null;
let transitionDebugGraphics = null;
let playerDebugGraphics = null;
let lastTriggeredTransitionKey = "";
let lastTriggeredTransitionAt = 0;
let isMapTransitionInProgress = false;
let roomReconnectInProgress = false;
let activatingPortalKey = null;
let activatingPortalUntil = 0;
let infoText = null;
let playerStaminaText = null;
let herbivoreStaminaText = null;
let interactionResultText = null;
let inventoryText = null;
let announcementText = null;
let announcementClearTimer = null;

function canSendRoomMessage(targetRoom = room) {
  return !!targetRoom?.connection?.isOpen;
}

function sendRoomMessage(type, payload) {
  if (!canSendRoomMessage()) return false;

  try {
    room.send(type, payload);
    return true;
  } catch (error) {
    console.warn(`Skipped "${type}" because the room connection is unavailable:`, error);
    return false;
  }
}

/*
FLOATING LOOT TEXT STATE
------------------------
Purpose:
Track short-lived floating loot feedback text shown above the local player.

Includes:
- active floating text entries
- per-entry fade and rise timing
*/

let floatingLootTexts = [];
const FLOATING_LOOT_TEXT_DURATION_MS = 1400;
const FLOATING_LOOT_TEXT_RISE_PX = 26;

let floatingMobDamageTexts = [];
const FLOATING_MOB_DAMAGE_TEXT_DURATION_MS = 900;
const FLOATING_MOB_DAMAGE_TEXT_RISE_PX = 24;

let tileEditorText = null;
let tileHoverCursor = null;

let chatWrapper = null;
let chatLog = null;
let chatInput = null;

let inventoryPanel = null;
let inventoryPanelBody = null;
let inventorySlotMap = {};
let inventoryDeleteButton = null;
let inventoryArtifactButton = null;

let hotbarPanel = null;
let hotbarSlotMap = {};
let selectedHotbarIndex = 0;
let hotbarKeys = [];

let toggleChatUiKey = null;
let toggleInventoryUiKey = null;
let toggleHotbarUiKey = null;

let isDraggingDomPanel = false;
let activeDraggedDomPanel = null;
let activeDraggedDomPanelOffsetX = 0;
let activeDraggedDomPanelOffsetY = 0;

let tilePaletteCollapsed = false;
let tilePaletteDragHandle = null;
let isDraggingTilePalette = false;
let tilePaletteDragOffsetX = 0;
let tilePaletteDragOffsetY = 0;

let hotbarAssignments = {};

let profilePanel = null;
let profilePanelBody = null;
let profileContentRows = {};
let toggleProfileUiKey = null;
let astronautPreview = null;
let settingsOverlay = null;
let tradesEnabled = true;
let otherPlayerProfilePanel = null;
let activeOtherPlayerProfile = null;
let tradeRequestOverlay = null;
let pendingTradeRequest = null;
let tradeOverlay = null;
let tradeOfferGrid = null;
let tradePartnerGrid = null;
let tradeStatusText = null;
let tradeAcceptButton = null;
let latestTradeSnapshot = null;
let tradeConfirmationOverlay = null;
let cycleTargetKey = null;
let selectedTargetId = null;
let targetSelectionGraphics = null;

let oxygenPanel = null;
let oxygenPanelBody = null;
let outOfOxygenOverlay = null;
let outOfOxygenText = null;

let animalVitalsPanel = null;
let animalVitalsPanelBody = null;

let oxygenPlayerDisplayMode = "bar";
let oxygenHerbivoreDisplayMode = "bar";

let oxygenPlayerRow = null;
let oxygenPlayerLabel = null;
let oxygenPlayerValue = null;
let oxygenPlayerBarTrack = null;
let oxygenPlayerBarFill = null;
let playerHealthValue = null;
let playerHealthBarTrack = null;
let playerHealthBarFill = null;

let oxygenHerbivoreRow = null;
let oxygenHerbivoreLabel = null;
let oxygenHerbivoreValue = null;
let oxygenHerbivoreBarTrack = null;
let oxygenHerbivoreBarFill = null;

/*
INVENTORY UI CONSTANTS
----------------------
Purpose:
Defines layout and behavior settings for inventory UI.
*/

const INVENTORY_COLUMNS = 4;
const BASE_INVENTORY_SLOT_COUNT = 12;
const MAX_INVENTORY_SLOT_COUNT = 16;
const INVENTORY_STACK_MAX = 10;
let currentInventorySlotCount = BASE_INVENTORY_SLOT_COUNT;
let selectedInventoryKey = null;
let selectedInventorySlotId = null;
const HOTBAR_SLOT_COUNT = 9;

const ITEM_QUALITY_DEFS = {
  common: {
    label: "Common",
    borderColor: "rgba(140, 148, 160, 0.95)",
    glowColor: "rgba(140, 148, 160, 0.30)"
  },
  uncommon: {
    label: "Uncommon",
    borderColor: "rgba(90, 190, 110, 0.95)",
    glowColor: "rgba(90, 190, 110, 0.30)"
  },
  rare: {
    label: "Rare",
    borderColor: "rgba(80, 145, 255, 0.95)",
    glowColor: "rgba(80, 145, 255, 0.30)"
  },
  epic: {
    label: "Epic",
    borderColor: "rgba(170, 95, 255, 0.95)",
    glowColor: "rgba(170, 95, 255, 0.30)"
  },
  legendary: {
    label: "Legendary",
    borderColor: "rgba(218, 165, 32, 0.98)",
    glowColor: "rgba(218, 165, 32, 0.34)"
  }
};

const ITEM_QUALITY_RANK = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4
};

const INVENTORY_ITEM_DEFS = [
  {
    key: "rock_sample",
    label: "Rock Sample",
    imageSrc: "assets/ui/inventory/rock_sample.png"
  },
  {
    key: "water_sample",
    label: "Water Sample",
    imageSrc: "assets/ui/inventory/water_sample.png"
  },
  {
    key: "plant_sample",
    label: "Plant Sample",
    imageSrc: "assets/ui/inventory/plant_sample.png"
  },
  {
    key: "mission_badge",
    label: "Mission Badge",
    imageSrc: "assets/ui/inventory/mission_badge.png"
  },
  {
    key: "comm_quest_token",
    label: "Comm Quest Token",
    imageSrc: "assets/ui/inventory/mission_badge.png"
  },
  {
    key: "herbivore_specimen",
    label: "Animal Specimen",
    imageSrc: "assets/ui/inventory/herbivore_specimen.png"
  },
  {
    key: "habitat_component",
    label: "Habitat Component",
    imageSrc: "assets/ui/inventory/habitat_component.png"
  },
  {
    key: "alien_artifact",
    label: "Alien Artifact",
    imageSrc: "assets/ui/inventory/alien_artifact.png",
    fixedLabel: true
  }
];

const SCIENCE_SKILL_DEFS = {
  geology: { label: "Geology", resource: "mineral samples" },
  botany: { label: "Botany", resource: "plant samples" },
  zoology: { label: "Zoology", resource: "animal specimens" },
  chemistry: { label: "Chemistry", resource: "water samples" },
  astrobiology: {
    label: "Astrobiology",
    resource: "alien artifacts and alien structures",
    rankOnly: true
  }
};
const CORE_ABILITY_UI_DEFS = {
  oxygen_storage: { label: "Oxygen Storage", effect: "+10 maximum oxygen per rank" },
  energy_storage: { label: "Energy Storage", effect: "+10 maximum energy per rank" },
  taser_damage: { label: "Taser Damage", effect: "+10% pulse damage per rank" },
  taser_range: { label: "Taser Range", effect: "+0.5 tile range per rank" },
  taser_attacks: { label: "Taser Attacks", effect: "+1 pulse per burst per rank" }
};
const SPECIAL_ABILITY_UI_DEFS = {
  sprint: { label: "Sprint", abbreviation: "SP", description: "Move at 1.3× speed for 3 seconds. 20 second cooldown.", active: true },
  moxie: { label: "MOXIE", abbreviation: "MX", description: "Restore 2 oxygen per second for 5 seconds. 60 second cooldown.", active: true },
  solar_charge: { label: "Solar Charge", abbreviation: "SC", description: "Restore 2 energy per second for 10 seconds. 60 second cooldown.", active: true },
  oxygen_reserve: { label: "Oxygen Reserve", abbreviation: "O2", description: "+15 maximum oxygen.", active: false },
  energy_reserve: { label: "Energy Reserve", abbreviation: "EN", description: "+15 maximum energy.", active: false },
  geology_mastery: { label: "Geology Mastery", abbreviation: "GM", description: "+3 geology mastery steps for rarity rolls.", active: false },
  botany_mastery: { label: "Botany Mastery", abbreviation: "BM", description: "+3 botany mastery steps for rarity rolls.", active: false },
  zoology_mastery: { label: "Zoology Mastery", abbreviation: "ZM", description: "+3 zoology mastery steps for rarity rolls.", active: false },
  chemistry_mastery: { label: "Chemistry Mastery", abbreviation: "CM", description: "+3 chemistry mastery steps for rarity rolls.", active: false },
  efficient_taser: { label: "Efficient Taser", abbreviation: "ET", description: "Reduce taser energy cost by 20%.", active: false },
  inventory_expansion: { label: "Inventory Expansion", abbreviation: "IN", description: "Add one inventory slot. May be selected four times to build a fourth row.", active: false }
};

function isVirtualInventoryItemKey(itemKey) {
  return String(itemKey || "").startsWith("progress_") ||
    String(itemKey || "").startsWith("comm_quest_token:");
}

let latestInventoryCounts = {};
let questPanel = null;
let questPanelBody = null;
let questActiveSummary = null;
let latestQuestSnapshot = { maxQuests: 5, quests: [] };
let questTurnInOverlay = null;
let questTurnInGrid = null;
let questTurnInRequirement = null;
let questTurnInCounter = null;
let questTurnInSubmitButton = null;
let questTurnInAbandonButton = null;
let activeQuestTurnInId = null;
let questTurnInSelection = {};
let questTurnInSubmitting = false;
let questAcquiredPopup = null;
let questAcquiredPopupTimer = null;
let latestInventorySignature = "";
let skillsOverlay = null;
let skillsTabBody = null;
let skillsTokenSummary = null;
let activeSkillsTab = "skills";
let latestProgressionSnapshot = {
  skills: [],
  profileRank: { level: 1, label: "Recruit", xp: 0, pointsIntoLevel: 0, pointsForNextLevel: 20 },
  abilities: [],
  specials: [],
  tokens: {
    total: 0,
    byQuality: {},
    spent: 0,
    completedQuests: 0,
    specialEarned: 0,
    specialUsed: 0,
    specialAvailable: 0,
    nextSpecialUnlockAt: 10,
    canUnlockSpecial: false
  },
  vitals: { taserRangeTiles: 5 },
  cooldowns: {},
  effects: {},
  settings: { tradesEnabled: true }
};

/*
UI ROOT + PANEL SYSTEM
----------------------
Purpose:
Create a centralized DOM UI layer and reusable panel system
that sits on top of the Phaser game.

Includes:
- UI root container
- panel factory helper
- consistent panel styling
- non-blocking pointer behavior
*/

let uiRoot = null;
let hudCanvasResizeObserver = null;
let resourceCollectionSequence = null;
let studentDashboard = null;
let latestMissionPosition = 0;
let joinGameInProgress = false;
let latestClassroomStatus = { configured: false, connected: false };

function setSimulationMode(active) {
  document.body.classList.toggle("simulation-active", !!active);
  let exitButton = document.getElementById("exit-simulation-button");
  if (active && !exitButton) {
    exitButton = document.createElement("button");
    exitButton.id = "exit-simulation-button";
    exitButton.type = "button";
    exitButton.textContent = "← Return to dashboard";
    exitButton.addEventListener("click", () => setSimulationMode(false));
    document.getElementById("app")?.appendChild(exitButton);
  }
  if (exitButton) exitButton.hidden = !active;
  if (active) studentDashboard?.hide();
  else studentDashboard?.show();
  if (active) window.requestAnimationFrame(applyDefaultHUDLayout);
}

function openStudentDashboard() {
  if (!uiRoot) return;
  studentDashboard?.destroy?.();
  studentDashboard = createStudentDashboard({
    root: uiRoot,
    isAdmin: isAdminUser(),
    classServers: getConfiguredClassServers(),
    missionPosition: latestMissionPosition,
    classroomStatus: latestClassroomStatus,
    getStudent: () => ({
      name: authUser?.user_metadata?.display_name || authUser?.email?.split("@")?.[0] || "Student",
      className: resolvedClassName || resolvedClassCode || "Class connected",
      classCode: resolvedClassCode || activeMatchClassCode || sessionStorage.getItem("classCode") || "",
      currentChapter: sessionStorage.getItem("e3CurrentChapter") || "Scientific Thinking",
      googleClassroomPercent: Number(sessionStorage.getItem("e3GoogleClassroomPercent")) || 92
    }),
    getProgression: () => latestProgressionSnapshot,
    getInventory: () => latestInventoryCounts,
    getItemDefinition: getInventoryItemDefByKey,
    onEnterSimulation: (kind, context = {}) => {
      if (kind === "original") {
        setSimulationMode(true);
        return;
      }
      if (context.chapter) sessionStorage.setItem("e3CurrentChapter", context.chapter);
      sendRoomMessage("set_learning_lab_context", context);
    },
    onOpenSettings: openSettingsWindow,
    onSendChat: (text) => sendRoomMessage("chat", { text }),
    onRequestQuest: () => sendRoomMessage("request_learning_lab_quest"),
    onAnswerStudyQuestion: (context) => sendRoomMessage("complete_study_question", context),
    onSwitchClass: async (classCode) => {
      if (!isAdminUser() || !classCode) return;
      sessionStorage.setItem("classCode", classCode);
      resolvedClassCode = "";
      resolvedClassName = "";
      await rejoinCurrentMap(currentMapKey || DEFAULT_MAP_KEY, classCode);
      studentDashboard?.refresh();
    },
    onSetMissionPosition: (index) => sendRoomMessage("set_mission_progress", { position: index }),
    onConnectClassroom: async () => {
      const result = await gameServerApi("/api/google/classroom/authorization-url");
      window.location.assign(result.url);
    },
    onSyncClassroom: async () => {
      const result = await gameServerApi("/api/google/classroom/sync", { method: "POST" });
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) await loadTeacherClassServers(data.session.access_token);
      latestClassroomStatus = await gameServerApi("/api/google/classroom/status");
      return result;
    },
    onLoadClassRoster: (classId) => gameServerApi(`/api/classes/${encodeURIComponent(classId)}/students`),
    onAddClassStudent: (classId, student) => gameServerApi(`/api/classes/${encodeURIComponent(classId)}/students`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(student) }),
    onRemoveClassStudent: (classId, userId) => gameServerApi(`/api/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(userId)}`, { method: "DELETE" }),
    onLoadStudentStats: (classId, userId) => gameServerApi(`/api/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(userId)}/stats`)
  });
  const achievementScope = authUser?.id || "guest";
  const currentChapter = sessionStorage.getItem("e3CurrentChapter") || "Scientific Thinking";
  const seenChapterKey = `e3SeenChapter:${achievementScope}`;
  if (localStorage.getItem(seenChapterKey) !== currentChapter) {
    studentDashboard?.enqueueAchievement({ title: "New Chapter", detail: currentChapter, glyph: "◉" });
    localStorage.setItem(seenChapterKey, currentChapter);
  }
  setSimulationMode(false);
}

function isResourceCollectionSequenceActive() {
  return !!resourceCollectionSequence?.isActive?.();
}

function isQuestTurnInOpen() {
  return !!questTurnInOverlay && questTurnInOverlay.style.display !== "none";
}

function isSkillsWindowOpen() {
  return !!skillsOverlay && skillsOverlay.style.display !== "none";
}

function isGameplayModalActive() {
  return isResourceCollectionSequenceActive() ||
    isQuestTurnInOpen() ||
    isSkillsWindowOpen() ||
    settingsOverlay?.style?.display === "flex" ||
    !!tradeRequestOverlay ||
    !!tradeOverlay ||
    !!tradeConfirmationOverlay;
}

function getOxygenLabelHtml() {
  return `O<sub>2</sub>`;
}

function getBarPercent(current, max) {
  const safeMax = Math.max(1, Number(max) || 0);
  const safeCurrent = Math.max(0, Math.min(safeMax, Number(current) || 0));
  return (safeCurrent / safeMax) * 100;
}

function getAnimalVitalsLabel(animalKind, speciesKey = "") {
  const speciesLabels = {
    herbivore_a: "Tardislug",
    herbivore_b: "Lophelant",
    herbivore_c: "Bumblewing",
    herbivore_d: "Quacklynx",
    carnivore_a: "Shellkraken",
    carnivore_b: "Siphon Gnat",
    carnivore_c: "Prism Skink",
    apex_predator_a: "Mirebandit",
    apex_predator_b: "Azure Prowler"
  };
  if (speciesLabels[speciesKey]) return speciesLabels[speciesKey];
  if (animalKind === "herbivore") return "Herbivore";
  if (animalKind === "carnivore") return "Carnivore";
  if (animalKind === "apex_predator") return "Apex Predator";
  if (animalKind === "alien_artifact") return "Alien Artifact";
  return "Animal";
}

/*
CREATE UI ROOT
--------------
Purpose:
Creates a full-screen overlay container that holds all UI panels.
*/
function createUIRoot() {
  const app = document.getElementById("app");
  if (!app) return;

  app.style.position = "relative";
  app.style.width = "100vw";
  app.style.height = "100vh";
  app.style.display = "flex";
  app.style.alignItems = "center";
  app.style.justifyContent = "center";
  app.style.overflow = "hidden";

  uiRoot = document.createElement("div");
  uiRoot.id = "ui-root";

  uiRoot.style.position = "absolute";
  uiRoot.style.top = "0";
  uiRoot.style.left = "0";
  uiRoot.style.width = "100%";
  uiRoot.style.height = "100%";
  uiRoot.style.pointerEvents = "none";
  uiRoot.style.zIndex = "100";

  app.appendChild(uiRoot);
  createOutOfOxygenWarningUI();
}

function createOutOfOxygenWarningUI() {
  if (!uiRoot || outOfOxygenOverlay) return;

  outOfOxygenOverlay = document.createElement("div");
  outOfOxygenOverlay.id = "out-of-oxygen-overlay";
  outOfOxygenOverlay.style.position = "absolute";
  outOfOxygenOverlay.style.inset = "0";
  outOfOxygenOverlay.style.display = "none";
  outOfOxygenOverlay.style.alignItems = "center";
  outOfOxygenOverlay.style.justifyContent = "center";
  outOfOxygenOverlay.style.padding = "24px";
  outOfOxygenOverlay.style.boxSizing = "border-box";
  outOfOxygenOverlay.style.background = "rgba(0, 0, 0, 0.52)";
  outOfOxygenOverlay.style.pointerEvents = "none";
  outOfOxygenOverlay.style.overflow = "hidden";
  outOfOxygenOverlay.style.zIndex = "1800";
  outOfOxygenOverlay.setAttribute("aria-hidden", "true");

  outOfOxygenText = document.createElement("div");
  outOfOxygenText.textContent = "OUT OF OXYGEN";
  outOfOxygenText.style.width = "100%";
  outOfOxygenText.style.color = "rgba(255, 22, 22, 0.72)";
  outOfOxygenText.style.fontSize = "clamp(46px, 9vw, 132px)";
  outOfOxygenText.style.fontWeight = "950";
  outOfOxygenText.style.letterSpacing = ".09em";
  outOfOxygenText.style.lineHeight = ".95";
  outOfOxygenText.style.textAlign = "center";
  outOfOxygenText.style.textShadow = "0 0 16px rgba(255,0,0,.78), 0 0 42px rgba(180,0,0,.62)";
  outOfOxygenText.style.userSelect = "none";
  outOfOxygenOverlay.appendChild(outOfOxygenText);
  uiRoot.appendChild(outOfOxygenOverlay);

  outOfOxygenText.animate(
    [
      { opacity: 0.10, transform: "scale(.985)" },
      { opacity: 0.72, transform: "scale(1.025)", offset: 0.46 },
      { opacity: 0.16, transform: "scale(.995)" }
    ],
    {
      duration: 760,
      iterations: Infinity,
      easing: "ease-in-out"
    }
  );
}

function setOutOfOxygenWarning(active) {
  if (!outOfOxygenOverlay) return;
  outOfOxygenOverlay.style.display = active ? "flex" : "none";
  outOfOxygenOverlay.setAttribute("aria-hidden", active ? "false" : "true");
}

/*
UI PANEL SYSTEM
---------------
Purpose:
Creates reusable draggable DOM panels with optional collapse support.

Includes:
- base panel styling
- draggable header
- collapsible body support
- show/hide helpers
- safe drag bounds within the app area
*/

function createUIPanel({ x = 0, y = 0, width = 300, height = 200 } = {}) {
  if (!uiRoot) {
    console.warn("UI Root not initialized yet.");
    return null;
  }

  const panel = document.createElement("div");
  panel.className = "ui-panel";

  panel.style.position = "absolute";
  panel.style.left = `${x}px`;
  panel.style.top = `${y}px`;
  panel.style.width = `${width}px`;
  panel.style.height = `${height}px`;

  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "8px";

  panel.style.background = "rgba(10, 16, 24, 0.75)";
  panel.style.border = "1px solid rgba(120, 160, 200, 0.35)";
  panel.style.borderRadius = "10px";
  panel.style.padding = "10px";
  panel.style.boxSizing = "border-box";
  panel.style.pointerEvents = "auto";
  panel.style.backdropFilter = "blur(4px)";
  panel.style.userSelect = "none";

  panel._expandedHeight = height;
  panel._isCollapsed = false;
  panel._panelHeader = null;
  panel._panelBody = null;
  panel._collapseButton = null;

  uiRoot.appendChild(panel);

  return panel;
}

function clampDomPanelToViewport(panel) {
  if (!panel || !uiRoot) return;

  const app = document.getElementById("app");
  if (!app) return;

  const appRect = app.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();

  const maxLeft = Math.max(0, appRect.width - panelRect.width);
  const maxTop = Math.max(0, appRect.height - panelRect.height);

  const nextLeft = Math.min(Math.max(0, parseFloat(panel.style.left) || 0), maxLeft);
  const nextTop = Math.min(Math.max(0, parseFloat(panel.style.top) || 0), maxTop);

  panel.style.left = `${nextLeft}px`;
  panel.style.top = `${nextTop}px`;
}

function beginDomPanelDrag(panel, clientX, clientY) {
  if (!panel) return;
  if (panel.dataset.hudLocked === "true") return;

  isDraggingDomPanel = true;
  activeDraggedDomPanel = panel;

  const panelLeft = parseFloat(panel.style.left) || 0;
  const panelTop = parseFloat(panel.style.top) || 0;

  activeDraggedDomPanelOffsetX = clientX - panelLeft;
  activeDraggedDomPanelOffsetY = clientY - panelTop;
}

function endDomPanelDrag() {
  if (activeDraggedDomPanel) {
    saveUIPanelState(activeDraggedDomPanel);
  }

  isDraggingDomPanel = false;
  activeDraggedDomPanel = null;
}

function attachGlobalDomPanelDragHandlers() {
  if (document.body.dataset.e3DomPanelDragReady === "true") return;
  document.body.dataset.e3DomPanelDragReady = "true";

  document.addEventListener("mousemove", (event) => {
    if (!isDraggingDomPanel || !activeDraggedDomPanel) return;

    const nextLeft = event.clientX - activeDraggedDomPanelOffsetX;
    const nextTop = event.clientY - activeDraggedDomPanelOffsetY;

    activeDraggedDomPanel.style.left = `${nextLeft}px`;
    activeDraggedDomPanel.style.top = `${nextTop}px`;

    clampDomPanelToViewport(activeDraggedDomPanel);
  });

  document.addEventListener("mouseup", () => {
    endDomPanelDrag();
  });
}

function setUIPanelCollapsed(panel, shouldCollapse) {
  if (!panel || !panel._panelBody) return;

  panel._isCollapsed = shouldCollapse;

  if (shouldCollapse) {
    panel._panelBody.style.display = "none";
    panel.style.height = "auto";

    if (panel._collapseButton) {
      panel._collapseButton.textContent = "+";
      panel._collapseButton.title = "Expand";
    }
  } else {
    panel._panelBody.style.display = "flex";
    panel.style.height = `${panel._expandedHeight}px`;

    if (panel._collapseButton) {
      panel._collapseButton.textContent = "–";
      panel._collapseButton.title = "Collapse";
    }
  }

  if (panel.dataset.hudLocked !== "true") {
    clampDomPanelToViewport(panel);
    saveUIPanelState(panel);
  } else {
    window.requestAnimationFrame(applyDefaultHUDLayout);
  }
}

function toggleUIPanelCollapsed(panel) {
  if (!panel || !panel._panelBody) return;
  setUIPanelCollapsed(panel, !panel._isCollapsed);
  if (panel === questPanel && !panel._isCollapsed) {
    resizeQuestPanelToContent();
  }
}

function toggleUIPanelVisible(panel) {
  if (!panel) return;

  const isHidden = panel.style.display === "none";
  panel.style.display = isHidden ? "flex" : "none";

  if (isHidden) {
    if (panel.dataset.hudLocked !== "true") {
      clampDomPanelToViewport(panel);
      saveUIPanelState(panel);
    }
  }
}

function lockHUDPanel(panel) {
  if (!panel) return;
  panel.dataset.hudLocked = "true";
  if (panel._panelHeader) panel._panelHeader.style.cursor = "default";
}

function setLockedPanelPosition(panel, { left = null, right = null, top = null, bottom = null, width = null } = {}) {
  if (!panel) return;
  panel.style.left = left === null ? "auto" : `${left}px`;
  panel.style.right = right === null ? "auto" : `${right}px`;
  panel.style.top = top === null ? "auto" : `${top}px`;
  panel.style.bottom = bottom === null ? "auto" : `${bottom}px`;
  if (width !== null) panel.style.width = `${width}px`;
}

function applyDefaultHUDLayout() {
  const viewportWidth = Math.max(320, window.innerWidth || 0);
  const viewportHeight = Math.max(480, window.innerHeight || 0);
  const margin = viewportWidth < 720 ? 8 : 16;
  const app = document.getElementById("app");
  const appRect = app?.getBoundingClientRect?.();
  const canvasRect = game?.canvas?.getBoundingClientRect?.();
  const leftGutter = appRect && canvasRect
    ? canvasRect.left - appRect.left
    : (viewportWidth - 800) / 2;
  const rightGutter = appRect && canvasRect
    ? appRect.right - canvasRect.right
    : (viewportWidth - 800) / 2;
  const availableSideWidth = Math.min(leftGutter, rightGutter) - margin * 2;
  const sideWidth = Math.max(
    220,
    Math.min(360, availableSideWidth, viewportWidth - margin * 2)
  );

  let leftTop = margin;
  setLockedPanelPosition(oxygenPanel, { left: margin, top: leftTop, width: sideWidth });
  leftTop += Math.max(42, oxygenPanel?.getBoundingClientRect?.().height || 130) + 8;
  setLockedPanelPosition(animalVitalsPanel, { left: margin, top: leftTop, width: sideWidth });
  leftTop += Math.max(42, animalVitalsPanel?.getBoundingClientRect?.().height || 92) + 8;

  if (chatWrapper) {
    const reservedBelowChat = 72 + margin + 42 + 42 + 24;
    const chatHeight = Math.max(220, Math.min(330, viewportHeight - leftTop - reservedBelowChat));
    chatWrapper._expandedHeight = chatHeight;
    if (!chatWrapper._isCollapsed) chatWrapper.style.height = `${chatHeight}px`;
    setLockedPanelPosition(chatWrapper, { left: margin, top: leftTop, width: sideWidth });
    leftTop += Math.max(42, chatWrapper.getBoundingClientRect().height) + 8;
  }

  setLockedPanelPosition(ecosystemCounterGraphPanel, { left: margin, top: leftTop, width: sideWidth });
  leftTop += Math.max(42, ecosystemCounterGraphPanel?.getBoundingClientRect?.().height || 42) + 8;
  setLockedPanelPosition(ecosystemGraphPanel, { left: margin, top: leftTop, width: sideWidth });

  const rightPanels = [profilePanel, inventoryPanel, questPanel].filter(Boolean);
  let rightTop = margin;
  rightPanels.forEach((panel) => {
    setLockedPanelPosition(panel, { right: margin, top: rightTop, width: sideWidth });
    if (panel.style.display === "none") return;
    rightTop += Math.max(42, panel.getBoundingClientRect().height) + 8;
  });

  if (hotbarPanel) {
    const hotbarWidth = Math.min(620, viewportWidth - margin * 2);
    setLockedPanelPosition(hotbarPanel, { left: Math.max(margin, (viewportWidth - hotbarWidth) / 2), bottom: margin, width: hotbarWidth });
  }
}

function attachUIPanelFrame(panel, {
  title = "Panel",
  collapsible = true,
  bodyDisplay = "flex",
  bodyGap = "8px",
  showHeader = true
} = {}) {
  if (!panel) return null;

  attachGlobalDomPanelDragHandlers();

  const header = document.createElement("div");
  header.className = "ui-panel-header";
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.gap = "8px";
  header.style.cursor = "move";
  header.style.userSelect = "none";

  const titleEl = document.createElement("div");
  titleEl.textContent = title;
  titleEl.style.color = "#ffffff";
  titleEl.style.fontSize = "14px";
  titleEl.style.fontWeight = "bold";
  titleEl.style.letterSpacing = "0.04em";
  titleEl.style.textTransform = "uppercase";
  titleEl.style.pointerEvents = "none";

  const rightControls = document.createElement("div");
  rightControls.style.display = "flex";
  rightControls.style.alignItems = "center";
  rightControls.style.gap = "6px";

  let collapseButton = null;

  if (collapsible) {
    collapseButton = document.createElement("button");
    collapseButton.type = "button";
    collapseButton.textContent = "–";
    collapseButton.title = "Collapse";
    collapseButton.style.width = "24px";
    collapseButton.style.height = "24px";
    collapseButton.style.padding = "0";
    collapseButton.style.borderRadius = "6px";
    collapseButton.style.border = "1px solid rgba(255, 255, 255, 0.12)";
    collapseButton.style.background = "rgba(255, 255, 255, 0.10)";
    collapseButton.style.color = "#ffffff";
    collapseButton.style.cursor = "pointer";
    collapseButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleUIPanelCollapsed(panel);
    });

    rightControls.appendChild(collapseButton);
  }

  header.appendChild(titleEl);
  header.appendChild(rightControls);

  header.addEventListener("mousedown", (event) => {
    const clickedButton = event.target instanceof HTMLElement && event.target.tagName === "BUTTON";
    if (clickedButton) return;

    beginDomPanelDrag(panel, event.clientX, event.clientY);
  });

  const body = document.createElement("div");
  body.className = "ui-panel-body";
  body.style.display = bodyDisplay;
  body.style.flex = "1";
  body.style.minHeight = "0";
  body.style.gap = bodyGap;
  body.style.userSelect = "auto";

  panel.innerHTML = "";
  if (showHeader) panel.appendChild(header);
  panel.appendChild(body);

  panel._panelHeader = showHeader ? header : null;
  panel._panelBody = body;
  panel._collapseButton = collapseButton;
  panel._panelControls = showHeader ? rightControls : null;

  return body;
}

function getUIPrefsStorageKey() {
  const userScope = authUser?.id || "guest";
  return `${UI_PREFS_STORAGE_KEY_PREFIX}:${userScope}`;
}

function loadUIPrefs() {
  try {
    const raw = localStorage.getItem(getUIPrefsStorageKey());
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("Failed to load UI prefs:", error);
    return {};
  }
}

function saveUIPrefs(prefs) {
  try {
    localStorage.setItem(getUIPrefsStorageKey(), JSON.stringify(prefs));
  } catch (error) {
    console.warn("Failed to save UI prefs:", error);
  }
}

function saveVitalsDisplayPrefs() {
  // Vitals now use a single bar-only presentation.
}

function restoreVitalsDisplayPrefs() {
  oxygenPlayerDisplayMode = "bar";
  oxygenHerbivoreDisplayMode = "bar";
}

function applyVitalsDisplayPrefsToUi() {
  refreshOxygenRowDisplayMode(
    oxygenPlayerValue,
    oxygenPlayerBarTrack,
    oxygenPlayerDisplayMode
  );

  refreshOxygenRowDisplayMode(
    oxygenHerbivoreValue,
    oxygenHerbivoreBarTrack,
    oxygenHerbivoreDisplayMode
  );
}

/*
UI LAYOUT PERSISTENCE
---------------------
Purpose:
Save and restore draggable DOM panel positions per signed-in account.

Includes:
- account-scoped localStorage layout read/write
- per-panel position restore
- per-panel position save
- restore helper for all main UI panels
*/

function getUILayoutStorageKey() {
  const userScope = authUser?.id || "guest";
  return `${UI_LAYOUT_STORAGE_KEY_PREFIX}:${userScope}`;
}

function loadUILayoutState() {
  try {
    const raw = localStorage.getItem(getUILayoutStorageKey());
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("Failed to load UI layout state:", error);
    return {};
  }
}

function saveUILayoutState(layoutState) {
  try {
    localStorage.setItem(getUILayoutStorageKey(), JSON.stringify(layoutState));
  } catch (error) {
    console.warn("Failed to save UI layout state:", error);
  }
}

/*
SAVE UI PANEL STATE
-------------------
Purpose:
Persist position, visibility, and collapse state per panel.
*/

function saveUIPanelState(panel) {
  if (!panel || !panel.id) return;
  if (panel.dataset.hudLocked === "true") return;

  const layoutState = loadUILayoutState();

  layoutState[panel.id] = {
    left: parseFloat(panel.style.left) || 0,
    top: parseFloat(panel.style.top) || 0,
    visible: panel.style.display !== "none",
    collapsed: !!panel._isCollapsed
  };

  saveUILayoutState(layoutState);
}

/*
RESTORE UI PANEL STATE
----------------------
Purpose:
Restore position, visibility, and collapse state.
*/

function restoreUIPanelState(panel) {
  if (!panel || !panel.id) return;
  if (panel.dataset.hudLocked === "true") return;

  const layoutState = loadUILayoutState();
  const saved = layoutState[panel.id];

  if (!saved) return;

  if (typeof saved.left === "number") {
    panel.style.left = `${saved.left}px`;
  }

  if (typeof saved.top === "number") {
    panel.style.top = `${saved.top}px`;
  }

  if (saved.visible === false) {
    panel.style.display = "none";
  }

  if (saved.collapsed && panel._panelBody) {
    setUIPanelCollapsed(panel, true);
  }

  clampDomPanelToViewport(panel);
}

function restoreAllUIPanelState() {
  restoreUIPanelState(chatWrapper);
  restoreUIPanelState(inventoryPanel);
  restoreUIPanelState(questPanel);
  restoreUIPanelState(hotbarPanel);
  restoreUIPanelState(tilePaletteContainer);
  restoreUIPanelState(objectPaletteContainer);
  restoreUIPanelState(object3DPreviewPanel);
  restoreUIPanelState(profilePanel);
  restoreUIPanelState(oxygenPanel);
  restoreUIPanelState(animalVitalsPanel);
}

/*
CHAT PANEL UI
-------------
Purpose:
Creates the in-game chat as a draggable, collapsible DOM panel.

Includes:
- shared panel header
- collapsible panel body
- chat log
- chat input + send button
- enter/slash shortcuts
*/

function createChatUI() {
  lastEditorStatusMessage = "";
  lastSignedInMessage = "";

  chatWrapper = createUIPanel({
    x: 480,
    y: 360,
    width: 300,
    height: 330
  });

  if (!chatWrapper) return;

  chatWrapper.id = "chat-ui";
  chatWrapper.style.display = "none";
  restoreUIPanelState(chatWrapper);

  const chatBody = attachUIPanelFrame(chatWrapper, {
    title: "Chat",
    collapsible: true,
    bodyDisplay: "flex",
    bodyGap: "8px"
  });

  chatBody.style.flexDirection = "column";

  chatLog = document.createElement("div");
  chatLog.id = "chat-log";
  chatLog.style.flex = "1";
  chatLog.style.minHeight = "0";
  chatLog.style.overflowY = "auto";
  chatLog.style.background = "rgba(255, 255, 255, 0.06)";
  chatLog.style.color = "white";
  chatLog.style.fontSize = "14px";
  chatLog.style.padding = "8px";
  chatLog.style.borderRadius = "6px";
  chatLog.style.border = "1px solid rgba(255, 255, 255, 0.08)";
  chatLog.textContent = "Chat ready.";

  const inputRow = document.createElement("div");
  inputRow.style.display = "flex";
  inputRow.style.gap = "8px";
  inputRow.style.alignItems = "center";

  chatInput = document.createElement("input");
  chatInput.id = "chat-input";
  chatInput.type = "text";
  chatInput.placeholder = "Type chat or /helpadmin";
  chatInput.autocomplete = "off";
  chatInput.style.flex = "1";
  chatInput.style.padding = "8px";
  chatInput.style.fontSize = "14px";
  chatInput.style.width = "100%";
  chatInput.style.boxSizing = "border-box";
  chatInput.style.borderRadius = "6px";
  chatInput.style.border = "1px solid rgba(255, 255, 255, 0.12)";
  chatInput.style.background = "rgba(255, 255, 255, 0.08)";
  chatInput.style.color = "#ffffff";
  chatInput.style.outline = "none";

  const sendButton = document.createElement("button");
  sendButton.textContent = "Send";
  sendButton.style.padding = "8px 12px";
  sendButton.style.fontSize = "14px";
  sendButton.style.cursor = "pointer";
  sendButton.style.borderRadius = "6px";
  sendButton.style.border = "1px solid rgba(255, 255, 255, 0.12)";
  sendButton.style.background = "rgba(255, 255, 255, 0.10)";
  sendButton.style.color = "#ffffff";

  const closeChatInput = () => {
    chatInput.value = "";
    chatInput.blur();
  };

  const sendChatMessage = () => {
    const text = chatInput?.value?.trim();
    if (!room) return;

    if (!text) {
      closeChatInput();
      return;
    }

    if (sendRoomMessage("chat", { text })) {
      chatInput.value = "";
    }
  };

  chatInput.addEventListener("keydown", (event) => {
    event.stopPropagation();

    if (event.key === "Enter") {
      event.preventDefault();
      sendChatMessage();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeChatInput();
      return;
    }
  });

  chatInput.addEventListener("keyup", (event) => event.stopPropagation());
  chatInput.addEventListener("keypress", (event) => event.stopPropagation());

  chatInput.addEventListener("focus", () => {
    if (sceneRef?.input?.keyboard) {
      sceneRef.input.keyboard.enabled = false;
    }
  });

  chatInput.addEventListener("blur", () => {
    if (sceneRef?.input?.keyboard) {
      sceneRef.input.keyboard.enabled = true;
    }
  });

  sendButton.addEventListener("click", sendChatMessage);

  inputRow.appendChild(chatInput);
  inputRow.appendChild(sendButton);

  chatBody.appendChild(chatLog);
  chatBody.appendChild(inputRow);

  document.addEventListener("keydown", (event) => {
    if (!joined || !chatInput) return;

    if (isTypingInUi()) return;

    const activeElement = document.activeElement;
    const isTypingInJoinUi =
      activeElement &&
      (activeElement.id === "email-input" ||
        activeElement.id === "password-input" ||
        activeElement.id === "player-name-input" ||
        activeElement.id === "classCode");

    const isTypingInChat = activeElement && activeElement.id === "chat-input";

    if (isTypingInJoinUi) return;

    if (!isTypingInChat && event.key === "Enter") {
      event.preventDefault();

      if (chatWrapper.style.display === "none") {
        chatWrapper.style.display = "flex";
      }

      if (chatWrapper._isCollapsed) {
        setUIPanelCollapsed(chatWrapper, false);
      }

      chatInput.focus();
      chatInput.value = "";
      return;
    }

    if (!isTypingInChat && event.key === "/") {
      event.preventDefault();

      if (chatWrapper.style.display === "none") {
        chatWrapper.style.display = "flex";
      }

      if (chatWrapper._isCollapsed) {
        setUIPanelCollapsed(chatWrapper, false);
      }

      chatInput.focus();
      chatInput.value = "/";
      chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
      return;
    }
  });
}

//room/palette/editor state block
let roomBaseLayerMap = [];
let roomDetailLayerMap = [];
let roomOverheadLayerMap = [];
let roomObjectLayerMap = [];

/*
TILESET FRAME METADATA
----------------------
Purpose:
Stores gameplay metadata per tilesheet frame instead of per placed map tile.

Includes:
- collision flag
- action area flag
- action center action type
- animate flag

Notes:
- Every painted map tile inherits metadata from its frame index
- This avoids extra saved map layers
- Metadata is edited from the tilesheet palette, not the room map
*/

let tilesetFrameMetadata = {};
let tilesetFrameMetadataExplicitFrames = new Set();
let tilesetFrameDefaultLayers = {};
let metadataEditorEnabled = false;

/*
METADATA PAINT MODE
-------------------
Purpose:
Controls which metadata type is painted onto tilesheet frames while metadata mode is active.

Modes:
- collision
- layer_base / layer_detail / layer_overhead / clear_layer
- animate
- center_craft
- center_dig
- center_mine
- center_fish
- center_comm
- clear_center
*/
let metadataPaintMode = "collision";
let metadataNumericShortcutMode = null;

let metadataOverlayLayer = null;
let metadataCollisionKey = null;
let metadataLayerKey = null;
let metadataAnimateKey = null;
let metadataActionKey = null;

let metadataCenterCraftKey = null;
let metadataCenterDigKey = null;
let metadataCenterMineKey = null;
let metadataCenterFishKey = null;
let metadataCenterCommKey = null;
let metadataCenterClearKey = null;

let roomBaseTileImages = [];
let roomDetailTileImages = [];
let roomOverheadTileImages = [];

/*
ANIMATED TILE RENDER STATE
--------------------------
Purpose:
Track animated placed map tiles and tilesheet animation groups.

Includes:
- rendered animated map tile list
- frame-to-group lookup
- animation timing
*/
let animatedRoomTiles = [];
let animatedTilesetFrameGroups = [];
let animatedTilesetFrameLookup = {};

const ANIMATED_TILE_FRAME_MS = 180;

let tileEditorEnabled = false;
let selectedTileFrame = 0;
let selectedTileLayer = "base";
let isTilePaintDragging = false;
let isTileEraseDragging = false;
let isPatternPaintDragging = false;
let patternPaintStartTile = null;
let patternPaintStartFrame = 0;

let isObjectPaintDragging = false;
let isObjectEraseDragging = false;

let tilePaletteContainer = null;
let tilePaletteViewport = null;
let tilePaletteContent = null;
let tilePaletteScrollOffsetX = 0;
let tilePaletteScrollOffsetY = 0;
let tilePaletteSheetImage = null;
let tilePaletteSelectionBox = null;
let tilePalettePanelBody = null;
let tilePaletteGridOverlay = null;
let tilePaletteClickLayer = null;
let tilePaletteModeButton = null;
let tilePaletteSelectionLabel = null;
let proceduralMapButton = null;
let proceduralMapSeedLabel = null;
let proceduralMapSeed = null;
let proceduralBiomeSelect = null;
let proceduralBiomeId = "all";
let tileGroups = [];
let deletedBuiltInTileGroupIds = new Set();
let selectedTileGroupId = null;
let tileGroupRecording = false;
let tileGroupDraft = [];
let tileGroupAnchor = null;
let tileGroupPlacementEnabled = false;
let isApplyingTileGroup = false;
let lastPlacedTileGroupAnchorKey = "";
let tileGroupSelect = null;
let tileGroupNameInput = null;
let tileGroupRecordButton = null;
let tileGroupCancelButton = null;
let tileGroupDeleteButton = null;
let tileGroupOverlayLayer = null;
const tileProjectionMode = "isometric";
let lastSyncedEditorTileFrames = new Map();
let lastSyncedEditorMetadata = new Map();

let objectPaletteContainer = null;
let objectPaletteViewport = null;
let objectPaletteContent = null;
let objectPaletteSheetImage = null;
let objectPaletteSelectionBox = null;
let selectedObjectFrame = -1;
let objectEditorEnabled = false;
let roomObjectImages = [];
let object3DPreviewPanel = null;
let object3DPreviewViewport = null;
let object3DPreviewStatus = null;
let activeObject3DPreview = null;
let activeObject3DPreviewKey = null;
let worldPortalLayer = null;
let worldOverheadLayer = null;
let world3DPostRenderHandler = null;

// Assign production GLB/GLTF files by object frame as they become available.
// Use paths under public/assets/models so Vite includes them in the build.
const OBJECT_3D_MODEL_URLS = {
  11: "assets/models/portals/expedition-portal.glb",
  12: "assets/models/portals/expedition-portal.glb",
  13: "assets/models/portals/expedition-portal.glb",
  14: "assets/models/portals/expedition-portal.glb",
  15: "assets/models/portals/expedition-portal.glb",
  16: "assets/models/portals/expedition-portal.glb",
  17: "assets/models/portals/expedition-portal.glb",
  18: "assets/models/portals/expedition-portal.glb",
  19: "assets/models/portals/expedition-portal.glb"
};

/*
RUNTIME MOB CLIENT STATE
------------------------
Purpose:
Store live mob clone render objects and the latest server snapshot data.

Includes:
- active mob sprite entries
- latest snapshot by id
*/

let runtimeMobSprites = {};
let latestRuntimeMobSnapshot = {};
let runtimeMobStatusTexts = {};
let showEsmLabels = false;
let latestAlienArtifactSnapshot = null;
let alienArtifactSprite = null;
let alienArtifactDurabilityGraphics = null;
let alienArtifactCompass = null;

/*
RUNTIME COLLECTABLE CLIENT STATE
--------------------------------
Purpose:
Store live collectable node render objects and latest server snapshot data.

Includes:
- active collectable sprites
- latest snapshot by id
*/

let runtimeCollectableSprites = {};
let latestRuntimeCollectableSnapshot = {};

let ecosystemGraphPanel = null;
let ecosystemGraphCanvas = null;
let ecosystemGraphCtx = null;

let ecosystemCounterGraphPanel = null;
let ecosystemCounterGraphCanvas = null;
let ecosystemCounterGraphCtx = null;

let ecosystemHistory = [];
const ECOSYSTEM_HISTORY_LIMIT = 180;
let lastEcosystemHistoryAt = 0;

/*
TILESET METADATA PAINT STATE
----------------------------
Purpose:
Supports click-drag painting directly on the tilesheet while metadata mode is enabled.

Includes:
- paint drag state
- erase drag state
*/
let isMetadataPalettePaintDragging = false;
let isMetadataPaletteEraseDragging = false;

const UI_LAYOUT_STORAGE_KEY_PREFIX = "e3_ui_layout_v1";
const UI_PREFS_STORAGE_KEY_PREFIX = "e3_ui_prefs_v1";

//editor key var block
let exportTileMapKey;
let resetTileMapKey;
let toggleTileEditorKey;
let selectBaseLayerKey;
let selectDetailLayerKey;
let selectOverheadLayerKey;
let shiftPaintKey;
let currentLayoutKey = null;
let currentMapKey = "default_room";
let pendingSpawnX = null;
let pendingSpawnY = null;
let saveLayoutKey;
let isSavingLayout = false;

/*
METADATA EDITOR KEY REFERENCES
------------------------------
Purpose:
Provides keyboard controls for metadata edit mode and metadata layer selection.

Includes:
- metadata editor toggle
- metadata layer selection keys
*/
let toggleMetadataEditorKey;
let toggleObjectEditorKey;
let toggleMapTestKey;

let lastInput = {
  left: false,
  right: false,
  up: false,
  down: false,
  editorMode: false,
  speedScale: 1
};

const PLAYER_TEXTURE_SIZE = 32;
const PLAYER_WALK_FRAME_MS = 120;
const PLAYER_ACTION_FRAME_MS = 220;

const PLAYER_CELL_WIDTH = 34;
const PLAYER_CELL_HEIGHT = 50;
const PLAYER_FRAME_WIDTH = 32;
const PLAYER_FRAME_HEIGHT = 48;

const PLAYER_RENDER_WIDTH = 48;
const PLAYER_RENDER_HEIGHT = 72;

const PLAYER_LABEL_OFFSET_Y = 62;
const PLAYER_SHADOW_OFFSET_Y = 4;

const PLAYER_RING_RADIUS = 18;
const PLAYER_RING_COLOR = 0x00ff99;
const PLAYER_RING_ALPHA = 0.35;

const PLAYER_LAYER_KEYS = {
  backpack: "recruit_backpack",
  boots: "recruit_boots",
  gloves: "recruit_gloves",
  top: "recruit_top",
  helmet: "recruit_helmet"
};

const PLAYER_ACTION_DEFS = {
  idle: {
    directional: true,
    frames: 4,
    rows: {
      down: 1,
      left: 2,
      right: 3,
      up: 4,
      left_up: 5,
      right_up: 6,
      left_down: 7,
      right_down: 8
    }
  },
  walk: {
    directional: true,
    frames: 6,
    rows: {
      down: 9,
      left: 10,
      right: 11,
      up: 12,
      left_up: 13,
      right_up: 14,
      left_down: 15,
      right_down: 16
    }
  },
  craft: {
    directional: true,
    frames: 4,
    rows: { down: 17, left: 18, right: 19 }
  },
  taser: {
    directional: true,
    frames: 4,
    rows: { down: 21, left: 22, right: 23 }
  },
  mine: {
    directional: true,
    frames: 4,
    rows: { down: 25, left: 26, right: 27 }
  },
  dig: {
    directional: true,
    frames: 4,
    rows: { down: 29, left: 30, right: 31 }
  },
  fish: {
    directional: true,
    frames: 4,
    rows: { down: 33, left: 34, right: 35 }
  },
  comm: {
    directional: true,
    frames: 4,
    rows: { down: 37, left: 38, right: 39 }
  },
  dance1: {
    directional: false,
    frames: 6,
    row: 41
  },
  dance2: {
    directional: false,
    frames: 6,
    row: 42
  },
  dance3: {
    directional: false,
    frames: 6,
    row: 43
  },
  dance4: {
    directional: false,
    frames: 6,
    row: 44
  }
};

//tile/grid/palette constants
const TILE_SIZE = 16;
const ROOM_OFFSET_X = 40;
const ROOM_OFFSET_Y = 70;
const DEFAULT_ROOM_TILE_WIDTH = 90;
const DEFAULT_ROOM_TILE_HEIGHT = 60;
const DEFAULT_MAP_KEY = "default_room";

const MAP_PORTAL_LINKS = [
  {
    fromMapKey: "default_room",
    portalKey: "lab",
    toMapKey: "lab_entrance",
    label: "Lab",
    spawnTileX: 0,
    spawnTileY: 0
  },
  {
    fromMapKey: "default_room",
    portalKey: "shop",
    toMapKey: "shop_entrance",
    label: "Shop",
    spawnTileX: 0,
    spawnTileY: 0
  },
  {
    fromMapKey: "default_room",
    portalKey: "room1",
    toMapKey: "room_test_01",
    label: "Room 1",
    spawnTileX: 0,
    spawnTileY: 0
  },
  {
    fromMapKey: "default_room",
    portalKey: "room2",
    toMapKey: "room_2",
    label: "Room 2",
    spawnTileX: 0,
    spawnTileY: 0
  },
  {
    fromMapKey: "default_room",
    portalKey: "room3",
    toMapKey: "room_3",
    label: "Room 3",
    spawnTileX: 0,
    spawnTileY: 0
  },
  {
    fromMapKey: "default_room",
    portalKey: "cave1",
    toMapKey: "cave_1_entrance",
    label: "Cave 1",
    spawnTileX: 0,
    spawnTileY: 0
  },
  {
    fromMapKey: "default_room",
    portalKey: "cave2",
    toMapKey: "cave_2_entrance",
    label: "Cave 2",
    spawnTileX: 0,
    spawnTileY: 0
  },
  {
    fromMapKey: "default_room",
    portalKey: "cave3",
    toMapKey: "cave_3_entrance",
    label: "Cave 3",
    spawnTileX: 0,
    spawnTileY: 0
  },
  {
    fromMapKey: "room_test_01",
    portalKey: "overworld",
    toMapKey: "default_room",
    label: "Overworld",
    spawnTileX: 0,
    spawnTileY: 0
  },
  {
    fromMapKey: "lab_entrance",
    portalKey: "overworld",
    toMapKey: "default_room",
    label: "Overworld",
    spawnTileX: 0,
    spawnTileY: 0
  },
  {
    fromMapKey: "shop",
    portalKey: "overworld",
    toMapKey: "default_room",
    label: "Overworld",
    spawnTileX: 0,
    spawnTileY: 0
  },
  {
    fromMapKey: "room2",
    portalKey: "overworld",
    toMapKey: "default_room",
    label: "Overworld",
    spawnTileX: 0,
    spawnTileY: 0
  },
  {
    fromMapKey: "room3",
    portalKey: "overworld",
    toMapKey: "default_room",
    label: "Overworld",
    spawnTileX: 0,
    spawnTileY: 0
  },
  {
    fromMapKey: "cave1",
    portalKey: "overworld",
    toMapKey: "default_room",
    label: "Overworld",
    spawnTileX: 0,
    spawnTileY: 0
  },
  {
    fromMapKey: "cave_2_entrance",
    portalKey: "overworld",
    toMapKey: "default_room",
    label: "Overworld",
    spawnTileX: 0,
    spawnTileY: 0
  },
  {
    fromMapKey: "cave3",
    portalKey: "overworld",
    toMapKey: "default_room",
    label: "Overworld",
    spawnTileX: 0,
    spawnTileY: 0
  }
];

/*
DYNAMIC ROOM SIZE HELPERS
-------------------------
Purpose:
Derive the current room size from the loaded layered map instead of relying
on hardcoded room dimensions.

Includes:
- current room width lookup
- current room height lookup
- world pixel width/height lookup
*/

function getCurrentRoomTileWidth() {
  const width =
    roomBaseLayerMap?.[0]?.length ||
    roomDetailLayerMap?.[0]?.length ||
    roomOverheadLayerMap?.[0]?.length ||
    DEFAULT_ROOM_TILE_WIDTH;

  return Math.max(1, width);
}

function getCurrentRoomTileHeight() {
  const height =
    roomBaseLayerMap?.length ||
    roomDetailLayerMap?.length ||
    roomOverheadLayerMap?.length ||
    DEFAULT_ROOM_TILE_HEIGHT;

  return Math.max(1, height);
}

function getCurrentRoomWorldWidth() {
  if (isIsometricMode()) {
    return (
      getCurrentRoomTileWidth() + getCurrentRoomTileHeight()
    ) * (ISO_TILE_WIDTH / 2);
  }
  return getCurrentRoomTileWidth() * TILE_SIZE;
}

function getCurrentRoomWorldHeight() {
  if (isIsometricMode()) {
    return (
      getCurrentRoomTileWidth() + getCurrentRoomTileHeight()
    ) * (ISO_TILE_HEIGHT / 2);
  }
  return getCurrentRoomTileHeight() * TILE_SIZE;
}

const TILE_HOVER_CURSOR_COLOR = 0xffff66;
const TILE_HOVER_CURSOR_ALPHA = 0.9;

const ISO_OUTSIDE_TILESET_KEY = "iso_outside_tilesheet";
const ISO_OUTSIDE_MASTER_KEY = "iso_outside_master";
const ISO_OUTSIDE_MANIFEST_KEY = "iso_outside_manifest";
const ISO_LEGACY_FRAME_MAP_KEY = "iso_legacy_frame_map";
const ISO_PREVIOUS_FRAME_MAP_KEY = "iso_previous_frame_map";
const ISO_ACTIVE_ASSET_ROOT =
  "assets/tiles/isometric/alien-expansion/collection-v2";
const ISO_TILE_FRAME_SIZE = 64;
const ISO_TILE_WIDTH = 64;
const ISO_TILE_HEIGHT = 32;
const ISO_STORED_FRAME_OFFSET = 20000;
const ISO_PREVIOUS_STORED_FRAME_OFFSET = 10000;
const ISO_PREVIOUS_FRAME_COUNT = 160;

function isIsometricMode() {
  return true;
}

function getActiveTilesetFrameWidth() {
  return ISO_TILE_FRAME_SIZE;
}

function getActiveTilesetFrameHeight() {
  return ISO_TILE_FRAME_SIZE;
}

function getActiveTilesetTextureKey() {
  return ISO_OUTSIDE_TILESET_KEY;
}

function getActiveTilesetImageKey() {
  return ISO_OUTSIDE_MASTER_KEY;
}

function getActiveTilesetImageUrl() {
  return `${ISO_ACTIVE_ASSET_ROOT}/alien-collection-v2-master.png`;
}

function encodeTileFrameForStorage(frameIndex) {
  if (frameIndex === TILE_EMPTY) return TILE_EMPTY;
  return ISO_STORED_FRAME_OFFSET + frameIndex;
}

function isStoredIsometricFrame(frameIndex) {
  return Number.isInteger(frameIndex) && frameIndex >= ISO_STORED_FRAME_OFFSET;
}

function isPreviousStoredIsometricFrame(frameIndex) {
  return (
    Number.isInteger(frameIndex) &&
    frameIndex >= ISO_PREVIOUS_STORED_FRAME_OFFSET &&
    frameIndex < ISO_PREVIOUS_STORED_FRAME_OFFSET + ISO_PREVIOUS_FRAME_COUNT
  );
}

function decodeStoredIsometricFrame(frameIndex) {
  if (isStoredIsometricFrame(frameIndex)) {
    return frameIndex - ISO_STORED_FRAME_OFFSET;
  }
  if (isPreviousStoredIsometricFrame(frameIndex)) {
    return frameIndex - ISO_PREVIOUS_STORED_FRAME_OFFSET;
  }
  return frameIndex;
}

const OBJECT_SHEET_KEY = "portal_mob_sheet";
const OBJECT_SHEET_IMAGE_KEY = "portal_mob_sheet_image";
const ALIEN_ARTIFACT_TEXTURE_KEY = "alien_artifact_event";
const ALIEN_ARTIFACT_ITEM_ID = "alien_artifact";
const ALIEN_ARTIFACT_SUMMON_COST = 5;
const OBJECT_FRAME_WIDTH = 32;
const OBJECT_FRAME_HEIGHT = 48;

const TILE_EMPTY = -1;
const OBJECT_EMPTY = -1;

const PORTAL_SPAWN_FRAME = 10;

const PORTAL_FRAME_KEYS = {
  11: "overworld",
  12: "lab",
  13: "shop",
  14: "room1",
  15: "room2",
  16: "room3",
  17: "cave1",
  18: "cave2",
  19: "cave3"
};

/*
OBJECT SHEET ROW + TYPE HELPERS
-------------------------------
Purpose:
Classify frames from the portal/mob sheet so portals, collectables, and mobs
all use one shared object-layer identification system.

Includes:
- sheet row/column helpers
- portal/spawn checks
- collectable type checks
- mob type checks
- animation frame helpers for idle/walk rows

Notes:
- sheet uses 10 columns total
- row 0 is the title row
- column 0 is the row-label column
- usable content frames begin at column 1
*/

const OBJECT_SHEET_COLUMNS = 10;
const OBJECT_SHEET_LABEL_COLUMN = 0;
const OBJECT_SHEET_FIRST_CONTENT_COLUMN = 1;

const OBJECT_ROW_PORTALS = 1;

const OBJECT_ROW_LEVEL1_ROCK = 2;
const OBJECT_ROW_LEVEL2_ROCK = 3;
const OBJECT_ROW_LEVEL3_ROCK = 4;

const OBJECT_ROW_LEVEL1_POND = 5;
const OBJECT_ROW_LEVEL2_POND = 6;
const OBJECT_ROW_LEVEL3_POND = 7;

const OBJECT_ROW_LEVEL1_PLANT_A = 8;
const OBJECT_ROW_LEVEL1_PLANT_B = 9;
const OBJECT_ROW_LEVEL2_PLANT_A = 10;
const OBJECT_ROW_LEVEL2_PLANT_B = 11;
const OBJECT_ROW_LEVEL3_PLANT = 12;

const OBJECT_ROW_LEVEL1_HERBIVORE_A = 13;
const OBJECT_ROW_LEVEL1_HERBIVORE_B = 14;
const OBJECT_ROW_LEVEL2_HERBIVORE_A = 15;
const OBJECT_ROW_LEVEL2_HERBIVORE_B = 16;
const OBJECT_ROW_LEVEL1_CARNIVORE = 17;
const OBJECT_ROW_LEVEL2_CARNIVORE_A = 18;
const OBJECT_ROW_LEVEL2_CARNIVORE_B = 19;
const OBJECT_ROW_LEVEL2_APEX_PREDATOR = 20;
const OBJECT_ROW_LEVEL3_APEX_PREDATOR = 21;

const RESOURCE_OBJECT_ROWS = new Set([
  OBJECT_ROW_LEVEL1_ROCK,
  OBJECT_ROW_LEVEL2_ROCK,
  OBJECT_ROW_LEVEL3_ROCK,
  OBJECT_ROW_LEVEL1_POND,
  OBJECT_ROW_LEVEL2_POND,
  OBJECT_ROW_LEVEL3_POND,
  OBJECT_ROW_LEVEL1_PLANT_A,
  OBJECT_ROW_LEVEL1_PLANT_B,
  OBJECT_ROW_LEVEL2_PLANT_A,
  OBJECT_ROW_LEVEL2_PLANT_B,
  OBJECT_ROW_LEVEL3_PLANT
]);

// Negative object-layer values are invisible procedural spawn slots. They are
// saved with the room, ignored by the object renderer, and consumed by the
// authoritative server when it distributes live resource nodes.
const RESOURCE_SLOT_OBJECT_FRAMES = {
  plant: -101,
  rock: -102,
  pond: -103,
  communication: -104
};

const MOB_OBJECT_ROWS = new Set([
  OBJECT_ROW_LEVEL1_HERBIVORE_A,
  OBJECT_ROW_LEVEL1_HERBIVORE_B,
  OBJECT_ROW_LEVEL2_HERBIVORE_A,
  OBJECT_ROW_LEVEL2_HERBIVORE_B,
  OBJECT_ROW_LEVEL1_CARNIVORE,
  OBJECT_ROW_LEVEL2_CARNIVORE_A,
  OBJECT_ROW_LEVEL2_CARNIVORE_B,
  OBJECT_ROW_LEVEL2_APEX_PREDATOR,
  OBJECT_ROW_LEVEL3_APEX_PREDATOR
]);

function getObjectSheetRow(frameIndex) {
  if (!isValidObjectFrame(frameIndex)) return -1;
  return Math.floor(frameIndex / OBJECT_SHEET_COLUMNS);
}

function getObjectSheetColumn(frameIndex) {
  if (!isValidObjectFrame(frameIndex)) return -1;
  return frameIndex % OBJECT_SHEET_COLUMNS;
}

function getObjectFrameAtRowColumn(row, col) {
  if (row < 0 || col < 0 || col >= OBJECT_SHEET_COLUMNS) return OBJECT_EMPTY;
  return row * OBJECT_SHEET_COLUMNS + col;
}

function isSpawnMarkerFrame(frameIndex) {
  return frameIndex === PORTAL_SPAWN_FRAME;
}

function isPortalFrame(frameIndex) {
  return !!PORTAL_FRAME_KEYS[frameIndex];
}

function isResourceObjectFrame(frameIndex) {
  return RESOURCE_OBJECT_ROWS.has(getObjectSheetRow(frameIndex));
}

function isMobObjectFrame(frameIndex) {
  return MOB_OBJECT_ROWS.has(getObjectSheetRow(frameIndex));
}

function getResourceKindForFrame(frameIndex) {
  const row = getObjectSheetRow(frameIndex);

  if (
    row === OBJECT_ROW_LEVEL1_ROCK ||
    row === OBJECT_ROW_LEVEL2_ROCK ||
    row === OBJECT_ROW_LEVEL3_ROCK
  ) {
    return "rock";
  }

  if (
    row === OBJECT_ROW_LEVEL1_POND ||
    row === OBJECT_ROW_LEVEL2_POND ||
    row === OBJECT_ROW_LEVEL3_POND
  ) {
    return "pond";
  }

  if (
    row === OBJECT_ROW_LEVEL1_PLANT_A ||
    row === OBJECT_ROW_LEVEL1_PLANT_B ||
    row === OBJECT_ROW_LEVEL2_PLANT_A ||
    row === OBJECT_ROW_LEVEL2_PLANT_B ||
    row === OBJECT_ROW_LEVEL3_PLANT
  ) {
    return "plant";
  }

  return null;
}

function getMobKindForFrame(frameIndex) {
  const row = getObjectSheetRow(frameIndex);

  if (
    row === OBJECT_ROW_LEVEL1_HERBIVORE_A ||
    row === OBJECT_ROW_LEVEL1_HERBIVORE_B ||
    row === OBJECT_ROW_LEVEL2_HERBIVORE_A ||
    row === OBJECT_ROW_LEVEL2_HERBIVORE_B
  ) {
    return "herbivore";
  }

  if (
    row === OBJECT_ROW_LEVEL1_CARNIVORE ||
    row === OBJECT_ROW_LEVEL2_CARNIVORE_A ||
    row === OBJECT_ROW_LEVEL2_CARNIVORE_B
  ) {
    return "carnivore";
  }

  if (
    row === OBJECT_ROW_LEVEL2_APEX_PREDATOR ||
    row === OBJECT_ROW_LEVEL3_APEX_PREDATOR
  ) {
    return "apex_predator";
  }

  return null;
}

function getObjectTierForFrame(frameIndex) {
  const row = getObjectSheetRow(frameIndex);

  if (
    row === OBJECT_ROW_LEVEL1_ROCK ||
    row === OBJECT_ROW_LEVEL1_POND ||
    row === OBJECT_ROW_LEVEL1_PLANT_A ||
    row === OBJECT_ROW_LEVEL1_PLANT_B ||
    row === OBJECT_ROW_LEVEL1_HERBIVORE_A ||
    row === OBJECT_ROW_LEVEL1_HERBIVORE_B ||
    row === OBJECT_ROW_LEVEL1_CARNIVORE
  ) {
    return 1;
  }

  if (
    row === OBJECT_ROW_LEVEL2_ROCK ||
    row === OBJECT_ROW_LEVEL2_POND ||
    row === OBJECT_ROW_LEVEL2_PLANT_A ||
    row === OBJECT_ROW_LEVEL2_PLANT_B ||
    row === OBJECT_ROW_LEVEL2_HERBIVORE_A ||
    row === OBJECT_ROW_LEVEL2_HERBIVORE_B ||
    row === OBJECT_ROW_LEVEL2_CARNIVORE_A ||
    row === OBJECT_ROW_LEVEL2_CARNIVORE_B ||
    row === OBJECT_ROW_LEVEL2_APEX_PREDATOR
  ) {
    return 2;
  }

  if (
    row === OBJECT_ROW_LEVEL3_ROCK ||
    row === OBJECT_ROW_LEVEL3_POND ||
    row === OBJECT_ROW_LEVEL3_PLANT ||
    row === OBJECT_ROW_LEVEL3_APEX_PREDATOR
  ) {
    return 3;
  }

  return 0;
}

function getObjectTypeSummary(frameIndex) {
  if (!isValidObjectFrame(frameIndex)) return null;
  if (isSpawnMarkerFrame(frameIndex)) return { category: "spawn_marker" };
  if (isPortalFrame(frameIndex)) {
    return {
      category: "portal",
      portalKey: PORTAL_FRAME_KEYS[frameIndex]
    };
  }

  if (isResourceObjectFrame(frameIndex)) {
    return {
      category: "resource",
      kind: getResourceKindForFrame(frameIndex),
      tier: getObjectTierForFrame(frameIndex)
    };
  }

  if (isMobObjectFrame(frameIndex)) {
    return {
      category: "mob_anchor",
      kind: getMobKindForFrame(frameIndex),
      tier: getObjectTierForFrame(frameIndex)
    };
  }

  return { category: "unknown" };
}

function getMobAnimationFramesForAnchorFrame(frameIndex, direction = "idle") {
  const row = getObjectSheetRow(frameIndex);
  if (!MOB_OBJECT_ROWS.has(row)) return [];

  if (direction === "idle") {
    return [
      getObjectFrameAtRowColumn(row, 1),
      getObjectFrameAtRowColumn(row, 2),
      getObjectFrameAtRowColumn(row, 3)
    ];
  }

  if (direction === "right") {
    return [
      getObjectFrameAtRowColumn(row, 4),
      getObjectFrameAtRowColumn(row, 5),
      getObjectFrameAtRowColumn(row, 6)
    ];
  }

  if (direction === "left") {
    return [
      getObjectFrameAtRowColumn(row, 7),
      getObjectFrameAtRowColumn(row, 8),
      getObjectFrameAtRowColumn(row, 9)
    ];
  }

  return [];
}

function getResourceIdleFramesForAnchorFrame(frameIndex) {
  const row = getObjectSheetRow(frameIndex);
  if (!RESOURCE_OBJECT_ROWS.has(row)) return [];

  return [
    getObjectFrameAtRowColumn(row, 1),
    getObjectFrameAtRowColumn(row, 2),
    getObjectFrameAtRowColumn(row, 3)
  ];
}

function getResourceGrowthFramesForAnchorFrame(frameIndex) {
  const row = getObjectSheetRow(frameIndex);
  if (!RESOURCE_OBJECT_ROWS.has(row)) return [];

  return [
    getObjectFrameAtRowColumn(row, 4),
    getObjectFrameAtRowColumn(row, 5),
    getObjectFrameAtRowColumn(row, 6),
    getObjectFrameAtRowColumn(row, 7),
    getObjectFrameAtRowColumn(row, 8),
    getObjectFrameAtRowColumn(row, 9)
  ];
}

/*
ACTION CENTER CONSTANTS
-----------------------
Purpose:
Controls automatic interaction radius for painted action center tiles.
*/

const ACTION_CENTER_RADIUS_TILES = 3;
const ACTION_CENTER_RADIUS_PX = ACTION_CENTER_RADIUS_TILES * TILE_SIZE;

const TILE_PALETTE_X = 830;
const TILE_PALETTE_Y = 80;
const TILE_PALETTE_WIDTH = 360;
const TILE_PALETTE_HEIGHT = 620;
const TILE_PALETTE_HEADER_HEIGHT = 30;
const TILE_PALETTE_VIEWPORT_WIDTH = 336;
const TILE_PALETTE_VIEWPORT_HEIGHT = 320;
const TILE_PALETTE_SCROLL_SPEED = 22;
const TILE_PALETTE_SELECTION_COLOR = 0xffff66;
const TILE_PALETTE_SELECTION_ALPHA = 1;

const OBJECT_PALETTE_X = 830;
const OBJECT_PALETTE_Y = 520;
const OBJECT_PALETTE_WIDTH = 360;
const OBJECT_PALETTE_HEIGHT = 420;
const OBJECT_PALETTE_VIEWPORT_WIDTH = 336;
const OBJECT_PALETTE_VIEWPORT_HEIGHT = 360;

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 520,
  backgroundColor: "rgba(0,0,0,0)",
  transparent: true,
  parent: "app",
  scene: {
    preload,
    create,
    update
  }
};

const appContainer = document.getElementById("app");
const threeBackground = createThreeBackground(appContainer);

game = new Phaser.Game(config);

// Make the render order explicit: Three.js backdrop, Phaser world, DOM UI.
if (game.canvas) {
  game.canvas.style.position = "relative";
  game.canvas.style.zIndex = "1";
}

window.addEventListener("pagehide", () => {
  threeBackground?.dispose();
  astronautPreview?.dispose();
  resourceCollectionSequence?.destroy?.();
  activeObject3DPreview?.dispose?.();
  if (world3DPostRenderHandler) game?.events?.off?.("postrender", world3DPostRenderHandler);
  hudCanvasResizeObserver?.disconnect?.();
  worldPortalLayer?.dispose?.();
  worldOverheadLayer?.dispose?.();
  clearAlienArtifactVisuals();
}, { once: true });

/*
PRELOAD HANDLER
---------------
Purpose:
Load optional art assets before the scene starts.

Includes the layered astronaut sprites and canonical isometric world sheet.
*/

function preload() {
  Object.entries(PLAYER_LAYER_KEYS).forEach(([, textureKey]) => {
    this.load.spritesheet(`player_layer_${textureKey}`, `assets/player/layers/${textureKey}.png`, {
      frameWidth: PLAYER_CELL_WIDTH,
      frameHeight: PLAYER_CELL_HEIGHT
    });
  });

  // Canonical isometric world set used by the map and Admin Tile Editor.
  this.load.spritesheet(
    ISO_OUTSIDE_TILESET_KEY,
    `${ISO_ACTIVE_ASSET_ROOT}/alien-collection-v2-master.png`,
    {
      frameWidth: 64,
      frameHeight: 64
    }
  );
  this.load.image(
    ISO_OUTSIDE_MASTER_KEY,
    `${ISO_ACTIVE_ASSET_ROOT}/alien-collection-v2-master.png`
  );
  this.load.json(
    ISO_OUTSIDE_MANIFEST_KEY,
    `${ISO_ACTIVE_ASSET_ROOT}/alien-collection-v2-manifest.json`
  );
  this.load.json(
    ISO_LEGACY_FRAME_MAP_KEY,
    "assets/tiles/isometric/legacy_to_iso_frame.json"
  );
  this.load.json(
    ISO_PREVIOUS_FRAME_MAP_KEY,
    `${ISO_ACTIVE_ASSET_ROOT}/previous-outside-frame-map.json`
  );

  this.load.spritesheet(OBJECT_SHEET_KEY, "assets/objects/portal_mob_sheet.png", {
    frameWidth: OBJECT_FRAME_WIDTH,
    frameHeight: OBJECT_FRAME_HEIGHT
  });

  this.load.image(OBJECT_SHEET_IMAGE_KEY, "assets/objects/portal_mob_sheet.png");
  this.load.image(
    ALIEN_ARTIFACT_TEXTURE_KEY,
    "assets/events/alien-artifact/alien-artifact-event.png"
  );
}

/*
PLAYER VISUAL HELPERS
---------------------
Purpose:
Create layered player visuals and named action frames from the
character sheet template.

Includes:
- trimmed 32x48 frame extraction from 34x50 cells
- named frame registration for each layer texture
- layered sprite creation
- idle/walk animation sync
- lowered ring positioning
*/

function ensurePlayerTextures(scene) {
  Object.keys(PLAYER_LAYER_KEYS).forEach((layerName) => {
    const textureKey = getPlayerLayerTextureKey(layerName);
    if (!textureKey || !scene.textures.exists(textureKey)) return;

    const texture = scene.textures.get(textureKey);

    Object.entries(PLAYER_ACTION_DEFS).forEach(([actionName, def]) => {
      if (def.directional) {
        Object.entries(def.rows).forEach(([direction, rowIndex]) => {
          for (let frameNumber = 1; frameNumber <= def.frames; frameNumber++) {
            const frameName = `${actionName}_${direction}_${frameNumber}`;

            if (texture.has(frameName)) continue;

            const frameX = frameNumber * PLAYER_CELL_WIDTH + 1;
            const frameY = rowIndex * PLAYER_CELL_HEIGHT + 1;

            texture.add(frameName, 0, frameX, frameY, PLAYER_FRAME_WIDTH, PLAYER_FRAME_HEIGHT);
          }
        });
      } else {
        for (let frameNumber = 1; frameNumber <= def.frames; frameNumber++) {
          const frameName = `${actionName}_${frameNumber}`;

          if (texture.has(frameName)) continue;

          const frameX = frameNumber * PLAYER_CELL_WIDTH + 1;
          const frameY = def.row * PLAYER_CELL_HEIGHT + 1;

          texture.add(frameName, 0, frameX, frameY, PLAYER_FRAME_WIDTH, PLAYER_FRAME_HEIGHT);
        }
      }
    });
  });
}

function getPlayerLayerTextureKey(layerName) {
  const baseKey = PLAYER_LAYER_KEYS[layerName];
  return baseKey ? `player_layer_${baseKey}` : null;
}

function hasRealPlayerSprite(scene) {
  return !!scene &&
    !!getPlayerLayerTextureKey("helmet") &&
    scene.textures.exists(getPlayerLayerTextureKey("helmet"));
}

function isPlayerMoving(player) {
  return !!(player.left || player.right || player.up || player.down);
}

/*
PLAYER DIRECTION HELPERS
------------------------
Purpose:
Resolve movement direction for cardinal and diagonal walking and idling.

Includes:
- diagonal movement direction detection
- exact idle direction preservation
*/

function getPlayerMoveDirection(player) {
  let horizontal = Number(!!player.right) - Number(!!player.left);
  let vertical = Number(!!player.down) - Number(!!player.up);

  // Colyseus stores movement in the map's logical square grid. Convert that
  // vector back into screen space before choosing an animation direction so
  // an isometric north walk faces north instead of north-west.
  if (isIsometricMode()) {
    const screenHorizontal = horizontal - vertical;
    const screenVertical = horizontal + vertical;
    horizontal = Math.sign(screenHorizontal);
    vertical = Math.sign(screenVertical);
  }

  const left = horizontal < 0;
  const right = horizontal > 0;
  const up = vertical < 0;
  const down = vertical > 0;

  if (left && up) return "left_up";
  if (right && up) return "right_up";
  if (left && down) return "left_down";
  if (right && down) return "right_down";

  if (left) return "left";
  if (right) return "right";
  if (up) return "up";
  if (down) return "down";

  return null;
}

/*
ACTION FACING HELPERS
---------------------
Purpose:
Turns the local player's displayed facing direction toward the chosen
action center before interaction feedback is sent.

Notes:
- This is client-side visual facing only
- server-side animation/state can be added next
*/

function getFacingDirectionTowardTarget(fromX, fromY, toX, toY) {
  const from = logicalWorldToDisplay(fromX, fromY);
  const to = logicalWorldToDisplay(toX, toY);
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (absX > absY) {
    return dx < 0 ? "left" : "right";
  }

  return dy < 0 ? "up" : "down";
}

/*
ACTION DIRECTION NORMALIZER
---------------------------
Purpose:
Convert action-facing directions so action animations never use the up row.

Rules:
- down stays down
- left stays left
- right stays right
- up becomes left or right
*/

function normalizeActionDirection(direction, fallbackDirection = "right") {
  if (direction === "down" || direction === "left" || direction === "right") {
    return direction;
  }

  if (direction === "up") {
    if (fallbackDirection === "left" || fallbackDirection === "right") {
      return fallbackDirection;
    }

    return "right";
  }

  return "down";
}

function getActionFacingDirectionTowardTarget(fromX, fromY, toX, toY, fallbackDirection = "right") {
  const rawDirection = getFacingDirectionTowardTarget(fromX, fromY, toX, toY);
  return normalizeActionDirection(rawDirection, fallbackDirection);
}

function faceLocalPlayerTowardActionCenter(actionCenter) {
  if (!actionCenter || !room?.state?.players || !players?.[myId]) return;

  const me = room.state.players.get(myId);
  const entry = players[myId];

  if (!me || !entry) return;

  const fallbackDirection =
    entry.lastDirection === "left" ||
    entry.lastDirection === "left_up" ||
    entry.lastDirection === "left_down"
      ? "left"
      : "right";

  entry.lastDirection = getActionFacingDirectionTowardTarget(
    me.x ?? 0,
    me.y ?? 0,
    actionCenter.worldX,
    actionCenter.worldY,
    fallbackDirection
  );

  updatePlayerSprite(sceneRef, entry, me, myId);
}

function getPlayerIdleDirection(entry) {
  return entry?.lastDirection || "down";
}

function getPlayerFrameName(actionName, direction, frameNumber) {
  const def = PLAYER_ACTION_DEFS[actionName];
  if (!def) return "idle_down_1";

  if (def.directional) {
    return `${actionName}_${direction}_${frameNumber}`;
  }

  return `${actionName}_${frameNumber}`;
}

function getPlayerAnimationFrameNumber(scene, actionName) {
  const def = PLAYER_ACTION_DEFS[actionName];
  if (!def) return 1;

  const frameDuration = actionName === "walk" ? PLAYER_WALK_FRAME_MS : PLAYER_ACTION_FRAME_MS;
  return 1 + (Math.floor(scene.time.now / frameDuration) % def.frames);
}

/*
FLOATING MOB DAMAGE TEXT
------------------------
Purpose:
Shows short-lived hit, crit, and miss text above mobs when the server
broadcasts taser burst pulse results.
*/

function showFloatingMobDamageText({ x = 0, y = 0, text = "", kind = "hit" } = {}) {
  if (!sceneRef || !text) return;
  const displayPosition = logicalWorldToDisplay(x, y);

  const color =
    kind === "crit"
      ? "#ffd966"
      : kind === "miss"
        ? "#d0d7e6"
        : "#ff8a8a";

  const entryText = sceneRef.add.text(displayPosition.x, displayPosition.y - 34, text, {
    color,
    fontSize: "16px",
    fontStyle: kind === "crit" ? "bold" : "normal",
    stroke: "#10131a",
    strokeThickness: 4
  });

  entryText.setOrigin(0.5, 1);
  entryText.setDepth(40);

  floatingMobDamageTexts.push({
    text: entryText,
    startX: displayPosition.x,
    startY: displayPosition.y - 34,
    startedAt: sceneRef.time.now
  });
}

function recordEcosystemHistory() {
  const now = Date.now();
  if (now - lastEcosystemHistoryAt < 1000) return;

  lastEcosystemHistoryAt = now;

  const nodes = Object.values(latestRuntimeCollectableSnapshot || {});
  const mobs = Object.values(latestRuntimeMobSnapshot || {});

  const plants = nodes.filter((node) => node?.kind === "plant" && node?.state !== "hidden").length;
  const herbivores = mobs.filter((mob) => mob?.kind === "herbivore").length;
  const carnivores = mobs.filter((mob) => mob?.kind === "carnivore").length;
  const apexPredators = mobs.filter((mob) => mob?.kind === "apex_predator").length;

  const totalPlantCounters =
    plants * 1 +
    herbivores * 3 +
    carnivores * 9 +
    apexPredators * 25 +
    mobs.reduce((sum, mob) => sum + (Number(mob?.plantCounter) || 0), 0);

  ecosystemHistory.push({
    at: now,
    plants,
    herbivores,
    carnivores,
    apexPredators,
    totalPlantCounters
  });

  if (ecosystemHistory.length > ECOSYSTEM_HISTORY_LIMIT) {
    ecosystemHistory.shift();
  }
}

function drawSimpleLineGraph(ctx, canvas, seriesDefs, maxValueFallback = 1) {
  if (!ctx || !canvas) return;

  const width = canvas.width;
  const height = canvas.height;
  const pad = 24;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#10131a";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, height - pad);
  ctx.lineTo(width - pad, height - pad);
  ctx.stroke();

  const maxValue = Math.max(
    maxValueFallback,
    ...seriesDefs.flatMap((series) => series.values)
  );

  seriesDefs.forEach((series) => {
    if (!series.values.length) return;

    ctx.strokeStyle = series.color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    series.values.forEach((value, index) => {
      const x =
        pad +
        ((width - pad * 2) * index) / Math.max(1, series.values.length - 1);
      const y =
        height - pad -
        ((height - pad * 2) * value) / Math.max(1, maxValue);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  });

  ctx.fillStyle = "#d7e6ff";
  ctx.font = "12px sans-serif";
  ctx.fillText(`max ${maxValue}`, pad, 14);
}

function drawEcosystemGraphs() {
  if (!ecosystemHistory.length) return;

  drawSimpleLineGraph(
    ecosystemGraphCtx,
    ecosystemGraphCanvas,
    [
      {
        color: "#6ee08c",
        values: ecosystemHistory.map((entry) => entry.plants)
      },
      {
        color: "#ffd27a",
        values: ecosystemHistory.map((entry) => entry.herbivores)
      },
      {
        color: "#ff8a8a",
        values: ecosystemHistory.map((entry) => entry.carnivores)
      },
      {
        color: "#9f95ff",
        values: ecosystemHistory.map((entry) => entry.apexPredators)
      }
    ],
    1
  );

  drawSimpleLineGraph(
    ecosystemCounterGraphCtx,
    ecosystemCounterGraphCanvas,
    [
      {
        color: "#8fc7ff",
        values: ecosystemHistory.map((entry) => entry.totalPlantCounters)
      }
    ],
    1
  );
}

function updateFloatingMobDamageTexts(scene) {
  if (!scene || !floatingMobDamageTexts.length) return;

  const now = scene.time.now;

  floatingMobDamageTexts = floatingMobDamageTexts.filter((entry) => {
    if (!entry?.text?.active) {
      entry?.text?.destroy?.();
      return false;
    }

    const elapsed = now - entry.startedAt;
    const progress = Math.max(
      0,
      Math.min(1, elapsed / FLOATING_MOB_DAMAGE_TEXT_DURATION_MS)
    );

    entry.text.setY(
      entry.startY - FLOATING_MOB_DAMAGE_TEXT_RISE_PX * progress
    );
    entry.text.setAlpha(1 - progress);

    if (progress >= 1) {
      entry.text.destroy();
      return false;
    }

    return true;
  });
}

/*
RUNTIME MOB RENDER HELPERS
--------------------------
Purpose:
Render live mob clones from server snapshots using the portal/mob sheet.

Includes:
- mob sprite creation
- mob animation frame selection
- snapshot application
- cleanup on rejoin/map change
*/

const MOB_IDLE_FRAME_MS = 280;
const MOB_WALK_FRAME_MS = 180;
const TAB_TARGET_RADIUS_PX = TILE_SIZE * 7;

function clearRuntimeMobSprites() {
  Object.values(runtimeMobSprites).forEach((entry) => {
    entry?.sprite?.destroy();
  });

  Object.values(runtimeMobStatusTexts).forEach((text) => {
    text?.destroy?.();
  });

  floatingMobDamageTexts.forEach((entry) => {
    entry?.text?.destroy?.();
  });

  targetSelectionGraphics?.clear?.();
  selectedTargetId = null;

  runtimeMobSprites = {};
  runtimeMobStatusTexts = {};
  latestRuntimeMobSnapshot = {};
  floatingMobDamageTexts = [];
}

function getMobAnimationFrameIndex(scene, state) {
  const frameMs = state === "walk" ? MOB_WALK_FRAME_MS : MOB_IDLE_FRAME_MS;
  return Math.floor(scene.time.now / frameMs) % 3;
}

function getMobRuntimeFrame(anchorFrame, facing, state, scene) {
  const direction = state === "walk" ? (facing === "left" ? "left" : "right") : "idle";
  const frames = getMobAnimationFramesForAnchorFrame(anchorFrame, direction);

  if (!frames.length) {
    return anchorFrame;
  }

  return frames[getMobAnimationFrameIndex(scene, state)];
}

function ensureRuntimeMobSprite(scene, mobId, snapshot) {
  if (runtimeMobSprites[mobId]?.sprite?.active) {
    return runtimeMobSprites[mobId];
  }

  const sprite = scene.add.sprite(
    snapshot.x ?? 0,
    snapshot.y ?? 0,
    OBJECT_SHEET_KEY,
    snapshot.anchorFrame
  );

  sprite.setOrigin(0.5, 0.82);
  sprite.setDepth(29);
  sprite.setInteractive({ useHandCursor: true });
  sprite.on("pointerdown", (pointer, _localX, _localY, event) => {
    if (!pointer.leftButtonDown()) return;
    if (tileEditorEnabled || metadataEditorEnabled || objectEditorEnabled) return;
    selectMobTarget(mobId);
    event?.stopPropagation?.();
  });

  runtimeMobSprites[mobId] = {
    sprite,
    lastFacing: snapshot.facing || "right",
    lastState: snapshot.state || "idle",
    anchorFrame: snapshot.anchorFrame,
    incapacitated: !!snapshot.incapacitated
  };

  return runtimeMobSprites[mobId];
}

function applyRuntimeMobSnapshot(snapshotData) {
  if (!sceneRef) return;

  const snapshotMapKey = snapshotData?.mapKey || currentMapKey || DEFAULT_MAP_KEY;
  if (snapshotMapKey !== (currentMapKey || DEFAULT_MAP_KEY)) {
    return;
  }

  const mobs = Array.isArray(snapshotData?.mobs) ? snapshotData.mobs : [];
  const nextById = {};

  mobs.forEach((mob) => {
    if (!mob?.id) return;

    nextById[mob.id] = mob;

    const entry = ensureRuntimeMobSprite(sceneRef, mob.id, mob);
    entry.anchorFrame = mob.anchorFrame;
    entry.lastFacing = mob.facing || entry.lastFacing || "right";
    entry.lastState = mob.state || entry.lastState || "idle";
    entry.incapacitated = !!mob.incapacitated;

    const displayPosition = logicalWorldToDisplay(mob.x ?? 0, mob.y ?? 0);
    entry.sprite.setPosition(displayPosition.x, displayPosition.y);
  });

  Object.keys(runtimeMobSprites).forEach((mobId) => {
    if (nextById[mobId]) return;

    runtimeMobSprites[mobId]?.sprite?.destroy();
    delete runtimeMobSprites[mobId];
  });

  latestRuntimeMobSnapshot = nextById;
}

function ensureRuntimeMobStatusText(scene, mobId) {
  if (runtimeMobStatusTexts[mobId]?.active) {
    return runtimeMobStatusTexts[mobId];
  }

  const text = scene.add.text(0, 0, "", {
    fontSize: "11px",
    color: "#fff3a1",
    align: "center",
    stroke: "#10131a",
    strokeThickness: 4
  });

  text.setOrigin(0.5, 1);
  text.setDepth(31);
  text.setVisible(false);

  runtimeMobStatusTexts[mobId] = text;
  return text;
}

function updateRuntimeMobSprites(scene) {
  Object.entries(runtimeMobSprites).forEach(([mobId, entry]) => {
    const snapshot = latestRuntimeMobSnapshot[mobId];

    if (!snapshot || !entry?.sprite?.active) {
      runtimeMobStatusTexts[mobId]?.destroy?.();
      delete runtimeMobStatusTexts[mobId];
      return;
    }

    const facing = snapshot.facing || entry.lastFacing || "right";
    const state = snapshot.state || entry.lastState || "idle";
    const frame = getMobRuntimeFrame(entry.anchorFrame, facing, state, scene);

    entry.lastFacing = facing;
    entry.lastState = state;
    entry.sprite.setFrame(frame);
    entry.sprite.setDepth(
      isIsometricMode()
        ? 10 + entry.sprite.y * 0.001
        : 29
    );
    entry.sprite.setAlpha(worldPortalLayer ? 0.001 : 1);
    entry.sprite.setScale(selectedTargetId === mobId ? 1.1 : 1);
    if (selectedTargetId === mobId) entry.sprite.setTint(0xb8f5ff);
    else entry.sprite.clearTint();

    const statusText = ensureRuntimeMobStatusText(scene, mobId);

    const esm = Number(snapshot.esm);
    const maxEsm = Number(snapshot.maxEsm);
    const stateLabel = snapshot.ecosystemState || snapshot.state || "unknown";
    const targetLabel = snapshot.targetId ? `\nT: ${String(snapshot.targetId).slice(-6)}` : "";
    const displayPosition = logicalWorldToDisplay(snapshot.x ?? 0, snapshot.y ?? 0);

    if (showEsmLabels) {
      const esmText =
        Number.isFinite(esm) && Number.isFinite(maxEsm)
          ? `ESM ${esm.toFixed(1)}/${maxEsm.toFixed(0)}`
          : "ESM ?";

      statusText.setText(`${esmText}\n${stateLabel}${targetLabel}`);
      statusText.setVisible(true);
      statusText.setPosition(
        displayPosition.x,
        displayPosition.y - 48
      );
      statusText.setDepth(31);
    } else if (snapshot.incapacitated) {
      statusText.setText("incapacitated");
      statusText.setVisible(true);
      statusText.setPosition(
        displayPosition.x,
        displayPosition.y - 42
      );
      statusText.setDepth(31);
    } else {
      statusText.setVisible(false);
    }
  });

  Object.keys(runtimeMobStatusTexts).forEach((mobId) => {
    if (latestRuntimeMobSnapshot[mobId]) return;

    runtimeMobStatusTexts[mobId]?.destroy?.();
    delete runtimeMobStatusTexts[mobId];
  });

  updateTargetSelectionGraphics(scene);
}

function getNearbyTargetCandidates(worldX, worldY) {
  return getAllTargetSnapshots()
    .filter((mob) => mob?.id)
    .map((mob) => {
      const dx = (mob.x ?? 0) - worldX;
      const dy = (mob.y ?? 0) - worldY;
      return { ...mob, worldDistance: Math.sqrt(dx * dx + dy * dy) };
    })
    .filter((mob) => mob.worldDistance <= TAB_TARGET_RADIUS_PX)
    .sort((a, b) => a.worldDistance - b.worldDistance);
}

function selectMobTarget(mobId) {
  if (!mobId || !getTargetSnapshotById(mobId)) return;
  selectedTargetId = mobId;
}

function getSelectedTargetInRange(player, rangePx) {
  const target = getSelectedTargetSnapshot();
  if (!player || !target) return null;
  const dx = (target.x ?? 0) - (player.x ?? 0);
  const dy = (target.y ?? 0) - (player.y ?? 0);
  const worldDistance = Math.sqrt(dx * dx + dy * dy);
  if (worldDistance > rangePx) return null;
  return { ...target, worldDistance };
}

function getCurrentTaserRangePx() {
  return TILE_SIZE * Math.max(1, Number(latestProgressionSnapshot.vitals?.taserRangeTiles) || 5);
}

function cycleNearbyTarget(player) {
  if (!player) return;
  const candidates = getNearbyTargetCandidates(player.x ?? 0, player.y ?? 0);
  if (!candidates.length) {
    selectedTargetId = null;
    return;
  }

  const currentIndex = candidates.findIndex((mob) => mob.id === selectedTargetId);
  selectedTargetId = candidates[(currentIndex + 1) % candidates.length].id;
}

function updateTargetSelectionGraphics(scene) {
  if (!scene) return;
  if (!targetSelectionGraphics) {
    targetSelectionGraphics = scene.add.graphics();
    targetSelectionGraphics.setDepth(32);
  }
  targetSelectionGraphics.clear();

  const target = getSelectedTargetSnapshot();
  if (!target) {
    selectedTargetId = null;
    return;
  }

  const pulse = 0.72 + Math.sin(scene.time.now / 130) * 0.18;
  const displayPosition = logicalWorldToDisplay(target.x ?? 0, target.y ?? 0);
  targetSelectionGraphics.lineStyle(2, 0x66e8ff, pulse);
  targetSelectionGraphics.strokeEllipse(
    displayPosition.x,
    displayPosition.y + 2,
    40,
    18
  );
}

function getAlienArtifactTargetSnapshot() {
  if (!latestAlienArtifactSnapshot?.id) return null;
  return {
    ...latestAlienArtifactSnapshot,
    kind: "alien_artifact",
    tier: 3,
    stamina: Number(latestAlienArtifactSnapshot.durability) || 0,
    maxStamina: Number(latestAlienArtifactSnapshot.maxDurability) || 100,
    incapacitated: false
  };
}

function getTargetSnapshotById(targetId) {
  if (!targetId) return null;
  if (latestRuntimeMobSnapshot[targetId]) return latestRuntimeMobSnapshot[targetId];
  const artifact = getAlienArtifactTargetSnapshot();
  return artifact?.id === targetId ? artifact : null;
}

function getSelectedTargetSnapshot() {
  return getTargetSnapshotById(selectedTargetId);
}

function getAllTargetSnapshots() {
  const targets = Object.values(latestRuntimeMobSnapshot || {});
  const artifact = getAlienArtifactTargetSnapshot();
  if (artifact) targets.push(artifact);
  return targets;
}

function clearAlienArtifactVisuals() {
  alienArtifactSprite?.destroy?.();
  alienArtifactDurabilityGraphics?.destroy?.();
  alienArtifactCompass?.remove?.();
  alienArtifactSprite = null;
  alienArtifactDurabilityGraphics = null;
  alienArtifactCompass = null;
  latestAlienArtifactSnapshot = null;
  if (selectedTargetId?.startsWith?.("alien-artifact:")) selectedTargetId = null;
  refreshAlienArtifactInventoryButton();
}

function ensureAlienArtifactCompass() {
  if (alienArtifactCompass?.isConnected) return alienArtifactCompass;
  if (!uiRoot) return null;
  const compass = document.createElement("div");
  compass.id = "alien-artifact-compass";
  compass.style.position = "absolute";
  compass.style.width = "84px";
  compass.style.height = "84px";
  compass.style.display = "none";
  compass.style.alignItems = "center";
  compass.style.justifyContent = "center";
  compass.style.border = "2px solid rgba(116, 225, 255, 0.82)";
  compass.style.borderRadius = "50%";
  compass.style.background = "radial-gradient(circle, rgba(72,31,120,0.86), rgba(5,13,24,0.92))";
  compass.style.boxShadow = "0 0 20px rgba(83, 217, 255, 0.38)";
  compass.style.pointerEvents = "none";
  compass.style.zIndex = "930";

  const arrow = document.createElement("div");
  arrow.dataset.role = "arrow";
  arrow.textContent = "▲";
  arrow.style.color = "#67efff";
  arrow.style.fontSize = "34px";
  arrow.style.lineHeight = "1";
  arrow.style.transformOrigin = "50% 58%";
  arrow.style.textShadow = "0 0 10px #b166ff";

  const distance = document.createElement("div");
  distance.dataset.role = "distance";
  distance.style.position = "absolute";
  distance.style.left = "4px";
  distance.style.right = "4px";
  distance.style.bottom = "7px";
  distance.style.textAlign = "center";
  distance.style.fontSize = "9px";
  distance.style.fontWeight = "700";
  distance.style.color = "#efe5ff";
  distance.style.textTransform = "uppercase";

  compass.appendChild(arrow);
  compass.appendChild(distance);
  uiRoot.appendChild(compass);
  alienArtifactCompass = compass;
  return compass;
}

function applyAlienArtifactSnapshot(snapshotData) {
  const snapshotMapKey = snapshotData?.mapKey || currentMapKey || DEFAULT_MAP_KEY;
  if (snapshotMapKey !== (currentMapKey || DEFAULT_MAP_KEY)) return;
  latestAlienArtifactSnapshot = snapshotData?.artifact?.id
    ? { ...snapshotData.artifact }
    : null;
  if (!latestAlienArtifactSnapshot && selectedTargetId?.startsWith?.("alien-artifact:")) {
    selectedTargetId = null;
  }
  refreshAlienArtifactInventoryButton();
}

function updateAlienArtifactVisuals(scene, player) {
  const artifact = latestAlienArtifactSnapshot;
  if (!artifact?.id || !scene) {
    alienArtifactSprite?.destroy?.();
    alienArtifactDurabilityGraphics?.destroy?.();
    alienArtifactSprite = null;
    alienArtifactDurabilityGraphics = null;
    if (alienArtifactCompass) alienArtifactCompass.style.display = "none";
    return;
  }

  if (!alienArtifactSprite?.active) {
    alienArtifactSprite = scene.add.image(artifact.x, artifact.y, ALIEN_ARTIFACT_TEXTURE_KEY);
    alienArtifactSprite.setOrigin(0.5, 0.82);
    alienArtifactSprite.setDisplaySize(192, 192);
    alienArtifactSprite.setInteractive({ useHandCursor: true });
    alienArtifactSprite.on("pointerdown", (pointer, _localX, _localY, event) => {
      if (!pointer.leftButtonDown()) return;
      if (tileEditorEnabled || metadataEditorEnabled || objectEditorEnabled) return;
      selectMobTarget(latestAlienArtifactSnapshot?.id);
      event?.stopPropagation?.();
    });
  }
  if (!alienArtifactDurabilityGraphics?.active) {
    alienArtifactDurabilityGraphics = scene.add.graphics();
  }

  const display = logicalWorldToDisplay(artifact.x, artifact.y);
  alienArtifactSprite.setPosition(display.x, display.y);
  alienArtifactSprite.setDepth(isIsometricMode() ? 10 + display.y * 0.001 : 29);
  alienArtifactSprite.setDisplaySize(
    selectedTargetId === artifact.id ? 204 : 192,
    selectedTargetId === artifact.id ? 204 : 192
  );

  const maxDurability = Math.max(1, Number(artifact.maxDurability) || 100);
  const durability = Math.max(0, Number(artifact.durability) || 0);
  const barWidth = 86;
  const barY = display.y - 142;
  alienArtifactDurabilityGraphics.clear();
  alienArtifactDurabilityGraphics.setDepth(33);
  alienArtifactDurabilityGraphics.fillStyle(0x08111d, 0.9);
  alienArtifactDurabilityGraphics.fillRoundedRect(display.x - barWidth / 2, barY, barWidth, 7, 3);
  alienArtifactDurabilityGraphics.fillStyle(0xb06cff, 0.95);
  alienArtifactDurabilityGraphics.fillRoundedRect(display.x - barWidth / 2 + 1, barY + 1, (barWidth - 2) * durability / maxDurability, 5, 2);

  const compass = ensureAlienArtifactCompass();
  const isSummoner = !!authUser?.id && artifact.summonerUserId === authUser.id;
  if (!compass || !isSummoner || !player) {
    if (compass) compass.style.display = "none";
    return;
  }

  const canvasRect = game?.canvas?.getBoundingClientRect?.();
  const rootRect = uiRoot?.getBoundingClientRect?.();
  if (canvasRect && rootRect) {
    compass.style.left = `${Math.max(8, canvasRect.right - rootRect.left - 96)}px`;
    compass.style.top = `${Math.max(8, canvasRect.bottom - rootRect.top - 96)}px`;
  }
  const playerDisplay = logicalWorldToDisplay(player.x ?? 0, player.y ?? 0);
  const angle = Math.atan2(display.y - playerDisplay.y, display.x - playerDisplay.x) * 180 / Math.PI + 90;
  const arrow = compass.querySelector('[data-role="arrow"]');
  if (arrow) arrow.style.transform = `rotate(${angle}deg)`;
  const distanceTiles = Math.ceil(Math.hypot((artifact.x ?? 0) - (player.x ?? 0), (artifact.y ?? 0) - (player.y ?? 0)) / TILE_SIZE);
  const distance = compass.querySelector('[data-role="distance"]');
  if (distance) distance.textContent = `${distanceTiles} tiles`;
  compass.style.display = "flex";
}

/*
RUNTIME COLLECTABLE RENDER HELPERS
----------------------------------
Purpose:
Render live collectable nodes from server snapshots using the portal/mob sheet.

Includes:
- collectable sprite creation
- idle/growth frame selection
- snapshot application
- cleanup on rejoin/map change
*/

const COLLECTABLE_IDLE_FRAME_MS = 320;
const COLLECTABLE_GROWTH_FRAME_MS = 220;

function clearRuntimeCollectableSprites() {
  Object.values(runtimeCollectableSprites).forEach((entry) => {
    entry?.sprite?.destroy();
    entry?.questIcon?.destroy();
  });

  runtimeCollectableSprites = {};
  latestRuntimeCollectableSnapshot = {};
}

function createQuestAvailableIcon(scene) {
  const icon = scene.add.graphics();
  icon.lineStyle(3, 0x39cfff, 1);
  [6, 11, 16].forEach((radius) => {
    icon.beginPath();
    icon.arc(0, 8, radius, Math.PI, Math.PI * 2, false);
    icon.strokePath();
  });
  icon.fillStyle(0x8df5ff, 1);
  icon.fillCircle(0, 8, 2.5);
  icon.setDepth(42);
  return icon;
}

function getCollectableIdleFrame(anchorFrame, scene) {
  const frames = getResourceIdleFramesForAnchorFrame(anchorFrame);
  if (!frames.length) return anchorFrame;

  const frameIndex = Math.floor(scene.time.now / COLLECTABLE_IDLE_FRAME_MS) % frames.length;
  return frames[frameIndex];
}

function getCollectableGrowthFrame(anchorFrame, growthStage = 0) {
  const frames = getResourceGrowthFramesForAnchorFrame(anchorFrame);
  if (!frames.length) return anchorFrame;

  const clampedStage = Math.max(0, Math.min(frames.length - 1, growthStage));
  return frames[clampedStage];
}

function getCollectableRuntimeFrame(snapshot, scene) {
  if (snapshot?.kind === "plant") {
    if (snapshot?.state === "growing") {
      return getCollectableGrowthFrame(snapshot.anchorFrame, snapshot.growthStage ?? 0);
    }

    if (snapshot?.state === "idle") {
      return getCollectableIdleFrame(snapshot.anchorFrame, scene);
    }
  }

  if (snapshot?.state === "growing") {
    return getCollectableGrowthFrame(snapshot.anchorFrame, snapshot.growthStage ?? 0);
  }

  return getCollectableIdleFrame(snapshot.anchorFrame, scene);
}

function ensureRuntimeCollectableSprite(scene, nodeId, snapshot) {
  if (runtimeCollectableSprites[nodeId]?.sprite?.active) {
    return runtimeCollectableSprites[nodeId];
  }

  const sprite = scene.add.sprite(
    snapshot.x ?? 0,
    snapshot.y ?? 0,
    OBJECT_SHEET_KEY,
    snapshot.anchorFrame
  );

  sprite.setOrigin(0.5, 0.82);
  sprite.setDepth(28);

  runtimeCollectableSprites[nodeId] = {
    sprite,
    questIcon: snapshot.kind === "communication" ? createQuestAvailableIcon(scene) : null,
    kind: snapshot.kind,
    anchorFrame: snapshot.anchorFrame,
    lastState: snapshot.state || "ready",
    growthStage: snapshot.growthStage || 0
  };

  return runtimeCollectableSprites[nodeId];
}

function applyRuntimeCollectableSnapshot(snapshotData) {
  if (!sceneRef) return;

  const snapshotMapKey = snapshotData?.mapKey || currentMapKey || DEFAULT_MAP_KEY;
  if (snapshotMapKey !== (currentMapKey || DEFAULT_MAP_KEY)) {
    return;
  }

  const nodes = Array.isArray(snapshotData?.nodes) ? snapshotData.nodes : [];
  const nextById = {};

  nodes.forEach((node) => {
    if (!node?.id) return;

    nextById[node.id] = node;

    const entry = ensureRuntimeCollectableSprite(sceneRef, node.id, node);
    entry.kind = node.kind;
    entry.anchorFrame = node.anchorFrame;
    entry.lastState = node.state || entry.lastState || "ready";
    entry.growthStage = node.growthStage || 0;
    const displayPosition = logicalWorldToDisplay(node.x ?? 0, node.y ?? 0);
    entry.sprite.setPosition(displayPosition.x, displayPosition.y);
    entry.sprite.setVisible(true);
    if (node.kind === "communication" && !entry.questIcon) {
      entry.questIcon = createQuestAvailableIcon(sceneRef);
    }
    entry.questIcon?.setPosition(displayPosition.x, displayPosition.y - 54);
    entry.questIcon?.setVisible(node.kind === "communication" && node.state === "ready");
  });

  Object.keys(runtimeCollectableSprites).forEach((nodeId) => {
    if (nextById[nodeId]) return;

    const entry = runtimeCollectableSprites[nodeId];
    if (entry?.sprite) {
      entry.sprite.destroy();
    }
    entry?.questIcon?.destroy();
    delete runtimeCollectableSprites[nodeId];
  });

  latestRuntimeCollectableSnapshot = nextById;
}

function updateRuntimeCollectableSprites(scene) {
  Object.entries(runtimeCollectableSprites).forEach(([nodeId, entry]) => {
    const snapshot = latestRuntimeCollectableSnapshot[nodeId];

    if (!snapshot || !entry?.sprite?.active) {
      if (entry?.sprite?.active) {
        entry.sprite.destroy();
      }
      entry?.questIcon?.destroy();
      delete runtimeCollectableSprites[nodeId];
      return;
    }

    entry.lastState = snapshot.state || entry.lastState || "ready";
    entry.growthStage = snapshot.growthStage || 0;

    const frame = getCollectableRuntimeFrame(snapshot, scene);

    entry.sprite.setVisible(true);
    entry.sprite.setFrame(frame);
    entry.sprite.setDepth(28);
    entry.sprite.setAlpha(
      worldPortalLayer
        ? 0.001
        : snapshot.state === "growing" ||
            snapshot.state === "being_collected" ||
            snapshot.state === "being_eaten"
          ? 0.92
          : 1
    );
    if (entry.questIcon) {
      const displayPosition = logicalWorldToDisplay(snapshot.x ?? 0, snapshot.y ?? 0);
      entry.questIcon.setPosition(
        displayPosition.x,
        displayPosition.y - 54 + Math.sin(scene.time.now * 0.004 + displayPosition.x) * 3
      );
      entry.questIcon.setVisible(snapshot.kind === "communication" && snapshot.state === "ready");
      entry.questIcon.setAlpha(0.78 + Math.sin(scene.time.now * 0.006) * 0.2);
    }
  });
}

function syncWorld3DEntities() {
  if (!worldPortalLayer) return;
  const projectEntity = (entity) => {
    const displayPosition = logicalWorldToDisplay(entity.x ?? 0, entity.y ?? 0);
    return {
      ...entity,
      x: displayPosition.x,
      y: displayPosition.y
    };
  };
  worldPortalLayer.setMobs(
    Object.values(latestRuntimeMobSnapshot).map(projectEntity),
    selectedTargetId
  );
  worldPortalLayer.setResources(
    Object.values(latestRuntimeCollectableSnapshot).map(projectEntity)
  );
}

/*
NEAREST MOB TARGET HELPER
-------------------------
Purpose:
Find the nearest visible herbivore the player can taser.

Rules:
- only herbivores
- must not be incapacitated
- must be within 5 tiles
*/

function getNearestVisibleMobTarget(worldX, worldY) {
  let best = null;

  Object.values(latestRuntimeMobSnapshot).forEach((mob) => {
    if (!mob?.id) return;
    if (mob.incapacitated) return;

    const isTargetable =
      mob.kind === "herbivore" ||
      mob.kind === "carnivore" ||
      mob.kind === "apex_predator";

    if (!isTargetable) return;

    const dx = (mob.x ?? 0) - worldX;
    const dy = (mob.y ?? 0) - worldY;
    const worldDistance = Math.sqrt(dx * dx + dy * dy);

    if (worldDistance > TILE_SIZE * 5) return;

    if (!best || worldDistance < best.worldDistance) {
      best = {
        ...mob,
        worldDistance
      };
    }
  });

  return best;
}

/*
NEAREST INCAPACITATED MOB HELPER
-------------------------------
Purpose:
Find the nearest incapacitated mob the player can collect.

Rules:
- must already be incapacitated
- must be within 3 tiles
*/

function getNearestVisibleIncapacitatedHerbivore(worldX, worldY) {
  let best = null;

  Object.values(latestRuntimeMobSnapshot).forEach((mob) => {
    if (!mob?.id) return;
    if (!mob.incapacitated) return;

    const dx = (mob.x ?? 0) - worldX;
    const dy = (mob.y ?? 0) - worldY;
    const worldDistance = Math.sqrt(dx * dx + dy * dy);

    if (worldDistance > TILE_SIZE * 3) return;

    if (!best || worldDistance < best.worldDistance) {
      best = {
        ...mob,
        worldDistance
      };
    }
  });

  return best;
}

/*
HERBIVORE STAMINA DISPLAY TARGET HELPER
---------------------------------------
Purpose:
Choose the nearest herbivore whose stamina should be shown in the UI.

Priority:
1. nearby incapacitated herbivore
2. nearby live herbivore
*/

function getHerbivoreStaminaDisplayTarget(worldX, worldY) {
  const incapacitated = getNearestVisibleIncapacitatedHerbivore(worldX, worldY);
  if (incapacitated) return incapacitated;

  const liveTarget = getNearestVisibleMobTarget(worldX, worldY);
  if (liveTarget) return liveTarget;

  return null;
}

function getNearestVisibleCollectableNode(worldX, worldY) {
  let best = null;

  Object.values(latestRuntimeCollectableSnapshot).forEach((node) => {
    if (!node) return;

    const isAvailable =
      node.kind === "plant"
        ? node.state === "idle"
        : node.state === "ready";

    if (!isAvailable) return;

    const dx = (node.x ?? 0) - worldX;
    const dy = (node.y ?? 0) - worldY;
    const worldDistance = Math.sqrt(dx * dx + dy * dy);

    if (worldDistance > TILE_SIZE * 3) return;

    const action =
      node.kind === "rock"
        ? "mine"
        : node.kind === "pond"
          ? "fish"
          : node.kind === "communication"
            ? "comm"
            : "dig";

    if (!best || worldDistance < best.worldDistance) {
      best = {
        ...node,
        action,
        worldDistance
      };
    }
  });

  return best;
}

/*
LOCAL ACTION ANIMATION HELPERS
------------------------------
Purpose:
Play a temporary local character-sheet action animation when the player
uses an action center.

Includes:
- active action timing check
- action duration lookup
- local player action start
*/

function isPlayerActionActive(entry) {
  return !!(
    entry &&
    entry.activeActionName &&
    typeof entry.activeActionUntil === "number" &&
    sceneRef?.time?.now < entry.activeActionUntil
  );
}

function isServerPlayerActionActive(player) {
  return !!(
    player &&
    player.actionName &&
    typeof player.actionUntilEpochMs === "number" &&
    player.actionUntilEpochMs > Date.now()
  );
}

function getPlayerActionDurationMs(actionName) {
  const def = PLAYER_ACTION_DEFS[actionName];
  if (!def) return 0;

  return def.frames * PLAYER_ACTION_FRAME_MS;
}

function startLocalPlayerActionAnimation(actionName) {
  if (!sceneRef || !players?.[myId]) return;
  if (!PLAYER_ACTION_DEFS[actionName]) return;

  const entry = players[myId];

  const fallbackDirection =
    entry.lastDirection === "left" ||
    entry.lastDirection === "left_up" ||
    entry.lastDirection === "left_down"
      ? "left"
      : "right";

  entry.activeActionName = actionName;
  entry.activeActionDirection = normalizeActionDirection(
    entry.lastDirection || "down",
    fallbackDirection
  );
  entry.activeActionUntil = sceneRef.time.now + getPlayerActionDurationMs(actionName);

  const me = room?.state?.players?.get?.(myId);
  if (me) {
    updatePlayerSprite(sceneRef, entry, me, myId);
  }
}

function createPlayerLayerSprite(scene, layerName) {
  const textureKey = getPlayerLayerTextureKey(layerName);
  const layer = scene.add.sprite(0, 0, textureKey, "idle_down_1");
  layer.setDisplaySize(PLAYER_RENDER_WIDTH, PLAYER_RENDER_HEIGHT);
  layer.setOrigin(0.5, 0.82);
  return layer;
}

/*
LAYERED PLAYER DISPLAY OBJECT
-----------------------------
Purpose:
Creates a container-based player with layered sprite parts.

Includes:
- shadow + optional ring
- container holding all avatar layers
- backpack / boots / top / gloves / helmet layers
*/

function createPlayerDisplayObject(scene, x, y, isLocalPlayer) {
  const shadow = scene.add.ellipse(x, y + PLAYER_SHADOW_OFFSET_Y, 24, 12, 0x000000, 0.22);
  shadow.setDepth(9);

  let ring = null;

  if (isLocalPlayer) {
    ring = scene.add.circle(x, y + 4, PLAYER_RING_RADIUS, PLAYER_RING_COLOR, PLAYER_RING_ALPHA);
    ring.setDepth(8);
  }

  const container = scene.add.container(x, y);
  container.setDepth(10);

  const layers = {
    backpack: createPlayerLayerSprite(scene, "backpack"),
    boots: createPlayerLayerSprite(scene, "boots"),
    top: createPlayerLayerSprite(scene, "top"),
    gloves: createPlayerLayerSprite(scene, "gloves"),
    helmet: createPlayerLayerSprite(scene, "helmet")
  };

  Object.values(layers).forEach((layer) => container.add(layer));

  return { shadow, ring, container, layers };
}

function setPlayerScreenPosition(entry, x, y) {
  const displayPosition = logicalWorldToDisplay(x, y);
  const displayX = displayPosition.x;
  const displayY = displayPosition.y;

  entry.shadow.setPosition(displayX, displayY + PLAYER_SHADOW_OFFSET_Y);

  if (entry.ring) {
    entry.ring.setPosition(displayX, displayY + 4);
  }

  entry.container.setPosition(displayX, displayY);
  entry.container.setDepth(isIsometricMode() ? 10 + displayY * 0.001 : 10);
  entry.label.setPosition(displayX, displayY - PLAYER_LABEL_OFFSET_Y);
  entry.label.setDepth(isIsometricMode() ? 11 + displayY * 0.001 : 11);
}

function syncWorld3DPlayers() {
  if (!worldPortalLayer || !room?.state?.players) return;
  const worldPlayers = [];

  room.state.players.forEach((player, id) => {
    const entry = players[id];
    if (!entry) return;
    const displayPosition = logicalWorldToDisplay(player.x ?? 0, player.y ?? 0);
    worldPlayers.push({
      id,
      x: displayPosition.x,
      y: displayPosition.y,
      direction: entry.lastDirection || "down",
      moving: isPlayerMoving(player),
      actionActive: isServerPlayerActionActive(player) || isPlayerActionActive(entry),
      isLocalPlayer: id === myId
    });
  });

  worldPortalLayer.setPlayers(worldPlayers);
}

function updatePlayerSprite(scene, entry, player, id) {
  const moving = isPlayerMoving(player);
  const moveDirection = getPlayerMoveDirection(player);

  if (moveDirection) {
    entry.lastDirection = moveDirection;
  }

  let actionName = moving ? "walk" : "idle";
  let direction = moving ? moveDirection : getPlayerIdleDirection(entry);

  if (isServerPlayerActionActive(player)) {
    actionName = player.actionName;

    const fallbackDirection =
      entry.lastDirection === "left" ||
      entry.lastDirection === "left_up" ||
      entry.lastDirection === "left_down"
        ? "left"
        : "right";

    direction = normalizeActionDirection(
      player.actionDirection || getPlayerIdleDirection(entry),
      fallbackDirection
    );

    entry.lastDirection = direction;
  } else if (isPlayerActionActive(entry)) {
    actionName = entry.activeActionName;

    const fallbackDirection =
      entry.lastDirection === "left" ||
      entry.lastDirection === "left_up" ||
      entry.lastDirection === "left_down"
        ? "left"
        : "right";

    direction = normalizeActionDirection(
      entry.activeActionDirection || getPlayerIdleDirection(entry),
      fallbackDirection
    );
  } else if (entry) {
    entry.activeActionName = null;
    entry.activeActionDirection = null;
    entry.activeActionUntil = 0;
  }

  const frameNumber = getPlayerAnimationFrameNumber(scene, actionName);
  const frameName = getPlayerFrameName(actionName, direction, frameNumber);

  Object.values(entry.layers || {}).forEach((layer) => {
    if (!layer) return;

    layer.setFrame(frameName);
    layer.clearTint();

    if (!hasRealPlayerSprite(scene)) {
      layer.setTint(id === myId ? 0x8aff8a : 0x8fc7ff);
    }
  });

  entry.currentAnim = `${actionName}_${direction}`;
}

/*
DEV TILE KEY HELPERS
--------------------
Purpose:
Create reusable number key references for tile palette switching.
*/

let tileKey1;
let tileKey2;
let tileKey3;
let tileKey4;
let tileKey5;
let tileKey6;

/*
CREATE SCENE HANDLER
--------------------
Purpose:
Build the Phaser scene, draw the room, create UI text, set up controls,
and initialize the join/login UI.

Includes:
- generated player textures
- generated tile textures
- player animations
- room drawing
- status text
- inventory display
- announcement banner
- tile editor status
- keyboard setup
- join UI creation
- chat UI creation
- current auth check
- dev tile painting input
- room layout save hotkey
*/

function create() {
  sceneRef = this;

  ensurePlayerTextures(this);
  ensureTileTextures(this);
  ensurePlayerTextures(this);

  createUIRoot();

  resourceCollectionSequence = createResourceCollectionSequence({
    root: uiRoot,
    qualityDefs: ITEM_QUALITY_DEFS,
    getItemDefinition: getInventoryItemDefByKey,
    onFloatingReward: showFloatingLootText,
    onQuestionAttempt: () => sendRoomMessage("resource_question_attempt")
  });

  worldPortalLayer = createWorldPortalLayer({
    container: document.getElementById("app"),
    phaserCanvas: game.canvas,
    getCamera: () => sceneRef?.cameras?.main,
    modelUrl: OBJECT_3D_MODEL_URLS[11]
  });
  worldOverheadLayer = createWorldOverheadLayer({
    container: document.getElementById("app"),
    phaserCanvas: game.canvas,
    getCamera: () => sceneRef?.cameras?.main,
    getTiles: () => roomOverheadLayerMap,
    getDisplayFrame: (storedFrame) =>
      getTextureFrameForLogicalFrame(resolveDisplayFrameIndex(sceneRef, storedFrame)),
    getTilePosition: (tileX, tileY) =>
      tileToDisplayPosition(tileX, tileY),
    isEnabled: () => isIsometricMode(),
    imageUrl: `${ISO_ACTIVE_ASSET_ROOT}/alien-collection-v2-master.png`,
    frameWidth: ISO_TILE_FRAME_SIZE,
    frameHeight: ISO_TILE_FRAME_SIZE,
    sheetColumns: getTilesheetColumns()
  });
  world3DPostRenderHandler = () => {
    worldPortalLayer?.update();
    worldOverheadLayer?.update();
  };
  game.events.on("postrender", world3DPostRenderHandler);

  rebuildAnimatedTilesetFrameGroups();
  drawRoom(this);
  syncTileEditorVisibility();

  infoText = this.add.text(20, 20, "E3 Prototype Room", {
    color: "#ffffff",
    fontSize: "24px"
  });

  announcementText = this.add.text(400, 20, "", {
    color: "#111111",
    fontSize: "20px",
    backgroundColor: "#ffd966",
    padding: { left: 12, right: 12, top: 8, bottom: 8 }
  });
  announcementText.setOrigin(0.5, 0);
  announcementText.setDepth(1000);
  announcementText.setScrollFactor(0);
  announcementText.setVisible(false);

  authStatusText = null;

  interactionResultText = this.add.text(20, 545, "", {
    color: "#7CFC00",
    fontSize: "16px"
  });

  tileEditorText = null;
  updateTileEditorText();

  cursors = this.input.keyboard.createCursorKeys();
  interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

  exportTileMapKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
  resetTileMapKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O);
  toggleTileEditorKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);

  shiftPaintKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  saveLayoutKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);

  toggleMetadataEditorKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Y);
  toggleObjectEditorKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U);
  toggleMapTestKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
  metadataCollisionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F6);
  metadataLayerKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F7);
  metadataAnimateKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F8);
  metadataActionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F9);

  metadataCenterCraftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
  metadataCenterDigKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
  metadataCenterMineKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
  metadataCenterFishKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);
  metadataCenterCommKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE);
  metadataCenterClearKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ZERO);

    toggleChatUiKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
  toggleInventoryUiKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
  toggleHotbarUiKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);
  toggleProfileUiKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
  cycleTargetKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
  this.input.keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.TAB);

  hotbarKeys = [
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SIX),
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SEVEN),
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.EIGHT),
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NINE)
  ];
  [selectBaseLayerKey, selectDetailLayerKey, selectOverheadLayerKey] =
    hotbarKeys;

  movementKeys = {
    up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
    down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
    right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
  };

  this.input.on("pointerdown", handleTilePalettePointerDown);
  this.input.on("pointerdown", handleTilePointerDown);
  this.input.on("pointermove", handleTilePointerMove);
  this.input.on("pointerup", handleTilePointerUp);
  this.input.on("pointerupoutside", handleTilePointerUp);
  this.input.on("gameout", hideTileHoverCursor);
  this.input.on("wheel", handleTilePaletteWheel);

  if (this.input.mouse?.disableContextMenu) {
    this.input.mouse.disableContextMenu();
  }
  createJoinUI();
  createChatUI();
  createInventoryUI();
  createQuestUI();
  createHotbarUI();
  createProfileUI();
  restoreVitalsDisplayPrefs();
  createOxygenUI();
  createAnimalVitalsUI();
  createEcosystemGraphUI();
  createEcosystemCounterGraphUI();
  applyVitalsDisplayPrefsToUi();

  [
    oxygenPanel,
    animalVitalsPanel,
    profilePanel,
    inventoryPanel,
    questPanel,
    ecosystemCounterGraphPanel,
    ecosystemGraphPanel,
    hotbarPanel,
    chatWrapper
  ].forEach(lockHUDPanel);

  setUIPanelCollapsed(ecosystemCounterGraphPanel, true);
  setUIPanelCollapsed(ecosystemGraphPanel, true);
  applyDefaultHUDLayout();

  if (document.body.dataset.e3DefaultHudResizeReady !== "true") {
    document.body.dataset.e3DefaultHudResizeReady = "true";
    window.addEventListener("resize", applyDefaultHUDLayout);
  }

  if (!hudCanvasResizeObserver && game?.canvas) {
    hudCanvasResizeObserver = new ResizeObserver(applyDefaultHUDLayout);
    hudCanvasResizeObserver.observe(game.canvas);
  }
  window.requestAnimationFrame(applyDefaultHUDLayout);

  supabase.auth.getUser().then(({ data }) => {
    if (data?.user) {
      authUser = data.user;
      authStatusText?.setText(`Signed in: ${data.user.email}`);
      authStatusText?.setColor("#7CFC00");
      tileEditorEnabled = false;
      metadataEditorEnabled = false;
      objectEditorEnabled = false;
      restoreAllUIPanelState();
      restoreVitalsDisplayPrefs();
      applyVitalsDisplayPrefsToUi();
      syncTileEditorVisibility();
      updateProfileUI();
      lastEditorStatusMessage = "";
    }
  });
}

/*
UPDATE SCENE HANDLER
--------------------
Purpose:
Runs every frame to send movement input, sync player visuals, refresh
inventory text, update station prompts, handle keyboard shortcuts,
and support layered frame-based tile editing.

Keyboard behavior:
- Enter opens chat when not typing
- / opens chat and starts a slash command when not typing
- E interacts only when not typing and tile edit is off
- T toggles tile edit mode
- 1/2/3 select base/detail/overhead layer while tile editing
- Shift + left drag paints pattern from the tilesheet
- P exports the current layered tile map to console
- O resets the current layered tile map
- K saves the current layered tile map through the server
*/

function update() {
  if (!isGameplayModalActive()) {
    handleHotbarKeyInput();
  }

  if (!isTypingInUi() && !isGameplayModalActive()) {
    if (Phaser.Input.Keyboard.JustDown(toggleChatUiKey)) {
      toggleUIPanelVisible(chatWrapper);
    }

    if (Phaser.Input.Keyboard.JustDown(toggleInventoryUiKey)) {
      toggleUIPanelVisible(inventoryPanel);
    }

    if (Phaser.Input.Keyboard.JustDown(toggleHotbarUiKey)) {
      toggleUIPanelVisible(hotbarPanel);
    }

    if (Phaser.Input.Keyboard.JustDown(toggleProfileUiKey) && profilePanel) {
      toggleUIPanelVisible(profilePanel);
    }

    if (isAdminUser() && Phaser.Input.Keyboard.JustDown(toggleTileEditorKey)) {
      if (tileGroupRecording && tileEditorEnabled) {
        finishTileGroupRecording();
      }
      tileEditorEnabled = !tileEditorEnabled;

      if (tileEditorEnabled) {
        metadataEditorEnabled = false;
        objectEditorEnabled = false;
      }

      lastEditorStatusMessage = "";
      syncTileEditorVisibility();
      updateTileEditorText();
      if (tileEditorEnabled) {
        showMetadataEditorInstructions();
      }
    }

    if (isAdminUser() && Phaser.Input.Keyboard.JustDown(toggleMetadataEditorKey)) {
      if (tileGroupRecording) {
        finishTileGroupRecording();
      }
      metadataEditorEnabled = !metadataEditorEnabled;

      if (metadataEditorEnabled) {
        tileEditorEnabled = false;
        objectEditorEnabled = false;
      } else {
        tileEditorEnabled = true;
      }

      lastEditorStatusMessage = "";
      syncTileEditorVisibility();
      updateTileEditorText();
      if (metadataEditorEnabled) {
        showMetadataEditorInstructions();
      }
    }

    if (isAdminUser() && Phaser.Input.Keyboard.JustDown(toggleObjectEditorKey)) {
      if (tileGroupRecording) {
        finishTileGroupRecording();
      }
      objectEditorEnabled = !objectEditorEnabled;

      if (objectEditorEnabled) {
        tileEditorEnabled = false;
        metadataEditorEnabled = false;
      }

      lastEditorStatusMessage = "";
      syncTileEditorVisibility();
      renderObjectLayer(sceneRef);
      updateTileEditorText();

      appendSystemChatLine(
        objectEditorEnabled
          ? "System: Object editor opened."
          : "System: Object editor closed.",
        "#9ad0ff"
      );
    }

    if (isAdminUser() && Phaser.Input.Keyboard.JustDown(toggleMapTestKey)) {
      if (tileGroupRecording) {
        finishTileGroupRecording();
      }
      void toggleTestMap();
    }

    if (tileEditorEnabled) {
      if (Phaser.Input.Keyboard.JustDown(selectBaseLayerKey)) {
        selectedTileLayer = "base";
        updateTileEditorText();
      }

      if (Phaser.Input.Keyboard.JustDown(selectDetailLayerKey)) {
        selectedTileLayer = "detail";
        updateTileEditorText();
      }

      if (Phaser.Input.Keyboard.JustDown(selectOverheadLayerKey)) {
        selectedTileLayer = "overhead";
        updateTileEditorText();
      }

      if (Phaser.Input.Keyboard.JustDown(exportTileMapKey)) {
        exportRoomTileMapToConsole();
      }

      if (Phaser.Input.Keyboard.JustDown(resetTileMapKey)) {
        resetRoomTileMap(sceneRef);
      }
    }

    if ((tileEditorEnabled || objectEditorEnabled || metadataEditorEnabled) && Phaser.Input.Keyboard.JustDown(saveLayoutKey)) {
      void saveCurrentRoomLayout();
    }

    if (metadataEditorEnabled) {
      if (Phaser.Input.Keyboard.JustDown(metadataCollisionKey)) {
        metadataNumericShortcutMode = null;
        metadataPaintMode = "collision";
        updateTileEditorText();
      }

      if (Phaser.Input.Keyboard.JustDown(metadataLayerKey)) {
        metadataNumericShortcutMode = "layer";
        metadataPaintMode = "layer_base";
        updateTileEditorText();
      }

      if (Phaser.Input.Keyboard.JustDown(metadataAnimateKey)) {
        metadataNumericShortcutMode = null;
        metadataPaintMode = "animate";
        updateTileEditorText();
      }

      if (Phaser.Input.Keyboard.JustDown(metadataActionKey)) {
        metadataNumericShortcutMode = "action";
        metadataPaintMode = "center_craft";
        updateTileEditorText();
      }

      if (metadataNumericShortcutMode === "layer") {
        if (Phaser.Input.Keyboard.JustDown(metadataCenterCraftKey)) {
          metadataPaintMode = "layer_base";
          updateTileEditorText();
        }

        if (Phaser.Input.Keyboard.JustDown(metadataCenterDigKey)) {
          metadataPaintMode = "layer_detail";
          updateTileEditorText();
        }

        if (Phaser.Input.Keyboard.JustDown(metadataCenterMineKey)) {
          metadataPaintMode = "layer_overhead";
          updateTileEditorText();
        }

        if (Phaser.Input.Keyboard.JustDown(metadataCenterClearKey)) {
          metadataPaintMode = "clear_layer";
          updateTileEditorText();
        }
      } else if (metadataNumericShortcutMode === "action") {
        if (Phaser.Input.Keyboard.JustDown(metadataCenterCraftKey)) {
          metadataPaintMode = "center_craft";
          updateTileEditorText();
        }

        if (Phaser.Input.Keyboard.JustDown(metadataCenterDigKey)) {
          metadataPaintMode = "center_dig";
          updateTileEditorText();
        }

        if (Phaser.Input.Keyboard.JustDown(metadataCenterMineKey)) {
          metadataPaintMode = "center_mine";
          updateTileEditorText();
        }

        if (Phaser.Input.Keyboard.JustDown(metadataCenterFishKey)) {
          metadataPaintMode = "center_fish";
          updateTileEditorText();
        }

        if (Phaser.Input.Keyboard.JustDown(metadataCenterCommKey)) {
          metadataPaintMode = "center_comm";
          updateTileEditorText();
        }

        if (Phaser.Input.Keyboard.JustDown(metadataCenterClearKey)) {
          metadataPaintMode = "clear_center";
          updateTileEditorText();
        }
      }
    }
  }

  if (!joined || !room || !myId || !room.state || !room.state.players) return;

  const localPlayerEntry = players[myId];
  const isActionLocked =
    isPlayerActionActive(localPlayerEntry) ||
    isGameplayModalActive();

  const keyboardInput = isActionLocked
    ? {
        left: false,
        right: false,
        up: false,
        down: false
      }
    : {
        left: !!cursors.left?.isDown || !!movementKeys?.left?.isDown,
        right: !!cursors.right?.isDown || !!movementKeys?.right?.isDown,
        up: !!cursors.up?.isDown || !!movementKeys?.up?.isDown,
        down: !!cursors.down?.isDown || !!movementKeys?.down?.isDown
      };

  const screenHorizontal =
    Number(keyboardInput.right) - Number(keyboardInput.left);
  const screenVertical =
    Number(keyboardInput.down) - Number(keyboardInput.up);
  const logicalHorizontal = screenHorizontal + screenVertical;
  const logicalVertical = screenVertical - screenHorizontal;
  const input = isIsometricMode()
    ? {
        left: logicalHorizontal < 0,
        right: logicalHorizontal > 0,
        up: logicalVertical < 0,
        down: logicalVertical > 0
      }
    : keyboardInput;

  const isScreenDiagonal =
    (keyboardInput.left || keyboardInput.right) &&
    (keyboardInput.up || keyboardInput.down);
  const isScreenHorizontal =
    isIsometricMode() &&
    (keyboardInput.left || keyboardInput.right) &&
    !keyboardInput.up &&
    !keyboardInput.down;
  const editorMode =
    isAdminUser() &&
    (tileEditorEnabled || metadataEditorEnabled || objectEditorEnabled);
  const inputMessage = {
    ...input,
    editorMode,
    speedScale: isScreenDiagonal
      ? Math.SQRT1_2
      : isScreenHorizontal
        ? 0.5
        : 1
  };

  if (
    !isMapTransitionInProgress &&
    (
      input.left !== lastInput.left ||
      input.right !== lastInput.right ||
      input.up !== lastInput.up ||
      input.down !== lastInput.down ||
      inputMessage.editorMode !== lastInput.editorMode ||
      inputMessage.speedScale !== lastInput.speedScale
    )
  ) {
    if (sendRoomMessage("input", inputMessage)) {
      lastInput = { ...inputMessage };
    }
  }

  room.state.players.forEach((player, id) => {
    const entry = players[id];
    if (!entry || !entry.container || !entry.label || !entry.shadow) return;

    setPlayerScreenPosition(entry, player.x ?? 100, player.y ?? 100);
    updatePlayerSprite(sceneRef, entry, player, id);
    entry.container.setVisible(!worldPortalLayer);

    entry.label.setText(player.name || "Player");
  });

  syncWorld3DPlayers();

  const me = room.state.players.get(myId);
  if (
    me &&
    !isTypingInUi() &&
    !isGameplayModalActive() &&
    !tileEditorEnabled &&
    !metadataEditorEnabled &&
    !objectEditorEnabled &&
    Phaser.Input.Keyboard.JustDown(cycleTargetKey)
  ) {
    cycleNearbyTarget(me);
  }

  if (me) {
    const inventoryCounts = {};

    me.inventory?.forEach?.((count, key) => {
      inventoryCounts[key] = Number(count) || 0;
    });

    updateInventoryUI(inventoryCounts);

    const stamina = Number(me.stamina) || 0;
    const maxStamina = Number(me.maxStamina) || 0;
    const health = Number(me.health ?? 100);
    const maxHealth = Math.max(1, Number(me.maxHealth ?? 100));

    if (playerHealthValue) {
      playerHealthValue.textContent = `${health}/${maxHealth}`;
    }

    if (playerHealthBarFill) {
      playerHealthBarFill.style.width = `${getBarPercent(health, maxHealth)}%`;
    }
    if (playerHealthBarTrack) {
      playerHealthBarTrack.title = `Energy ${Math.round(health)}/${Math.round(maxHealth)}`;
    }

    if (oxygenPlayerValue) {
      oxygenPlayerValue.textContent = `${stamina}/${maxStamina}`;
    }

    if (oxygenPlayerBarFill) {
      oxygenPlayerBarFill.style.width = `${getBarPercent(stamina, maxStamina)}%`;
    }

    if (oxygenPlayerRow) {
      const oxygenDepleted = stamina <= 0;
      oxygenPlayerRow.style.borderColor = oxygenDepleted
        ? "rgba(255, 104, 104, 0.82)"
        : "rgba(255, 255, 255, 0.10)";
      oxygenPlayerRow.style.boxShadow = oxygenDepleted
        ? "0 0 14px rgba(255, 70, 70, 0.30)"
        : "none";
      oxygenPlayerRow.title = oxygenDepleted
        ? `Oxygen ${Math.round(stamina)}/${Math.round(maxStamina)} — movement speed is reduced to one quarter.`
        : `Oxygen ${Math.round(stamina)}/${Math.round(maxStamina)}`;
    }

    const herbivoreTarget = getSelectedTargetSnapshot();

    if (herbivoreTarget) {
      const herbivoreStamina = Number(herbivoreTarget.stamina) || 0;
      const herbivoreMaxStamina = Number(herbivoreTarget.maxStamina) || 0;

      if (animalVitalsPanel) {
        animalVitalsPanel.style.display = "flex";
      }

      if (oxygenHerbivoreValue) {
        oxygenHerbivoreValue.textContent = `${herbivoreStamina}/${herbivoreMaxStamina}`;
      }

      if (oxygenHerbivoreBarFill) {
        oxygenHerbivoreBarFill.style.width = `${getBarPercent(herbivoreStamina, herbivoreMaxStamina)}%`;
      }
      if (oxygenHerbivoreBarTrack) {
        oxygenHerbivoreBarTrack.title = `${herbivoreTarget.kind === "alien_artifact" ? "Durability" : "Target HP"} ${Math.round(herbivoreStamina)}/${Math.round(herbivoreMaxStamina)}`;
      }

      if (oxygenHerbivoreLabel) {
        oxygenHerbivoreLabel.textContent = herbivoreTarget.kind === "alien_artifact"
          ? "Alien Artifact · Durability"
          : `${getAnimalVitalsLabel(herbivoreTarget.kind, herbivoreTarget.speciesKey)} · Lv ${Math.max(1, Number(herbivoreTarget.tier) || 1)}`;
      }
    } else {
      if (animalVitalsPanel) {
        animalVitalsPanel.style.display = "flex";
      }

      if (oxygenHerbivoreValue) {
        oxygenHerbivoreValue.textContent = "—";
      }

      if (oxygenHerbivoreBarFill) {
        oxygenHerbivoreBarFill.style.width = "0%";
      }
      if (oxygenHerbivoreBarTrack) {
        oxygenHerbivoreBarTrack.title = "No target selected";
      }

      if (oxygenHerbivoreLabel) {
        oxygenHerbivoreLabel.textContent = "No Target";
      }
    }
  }

  setOutOfOxygenWarning(!!me && Number(me.stamina) <= 0);

  updateStationMessage();
  updateProfileUI();
  updateAnimatedRoomTiles(sceneRef);
  updateRuntimeMobSprites(sceneRef);
  updateAlienArtifactVisuals(sceneRef, me);
  updateRuntimeCollectableSprites(sceneRef);
  syncWorld3DEntities();
  updateFloatingLootTexts(sceneRef);
  updateFloatingMobDamageTexts(sceneRef);
  recordEcosystemHistory();
  drawEcosystemGraphs();
  refreshPlayerDebugGraphics(sceneRef);
  updateWorldPortalInteractionState(me);

  if (!tileEditorEnabled && !metadataEditorEnabled && !objectEditorEnabled && !isTypingInUi() && !isGameplayModalActive() && Phaser.Input.Keyboard.JustDown(interactKey)) {
    const activePortal = getPortalAtWorldPosition(me?.x ?? 0, me?.y ?? 0);

    if (activePortal && !isMapTransitionInProgress) {
      activatingPortalKey = activePortal.portalKey;
      activatingPortalUntil = Date.now() + 3000;
      updateWorldPortalInteractionState(me);
      sendRoomMessage("request_map_transition");
      return;
    }

    const selectedMob = getSelectedTargetSnapshot();
    if (selectedMob) {
      const selectedMobInAttackRange = getSelectedTargetInRange(me, getCurrentTaserRangePx());
      const selectedMobInCollectRange = getSelectedTargetInRange(me, TILE_SIZE * 3);

      if (selectedMob.incapacitated) {
        if (!selectedMobInCollectRange) {
          showStatusMessage("Selected target is out of collection range.", false);
          return;
        }

        resourceCollectionSequence?.start({
          resourceKind: "animal",
          resourceLabel: "Animal Specimen",
          tier: selectedMob.tier || 1,
          requestCollection: () => {
            faceLocalPlayerTowardActionCenter({
              worldX: selectedMob.x,
              worldY: selectedMob.y
            });
            startLocalPlayerActionAnimation("dig");
            players[myId].activeActionUntil = sceneRef.time.now + 6000;
            return sendRoomMessage("interact", {
              source: "mob",
              action: "collect_incapacitated_herbivore",
              mobId: selectedMob.id
            });
          }
        });
        return;
      }

      if (!selectedMobInAttackRange) {
        showStatusMessage("Selected target is out of attack range.", false);
        return;
      }

      const taserEnergyCost = Math.max(
        1,
        Number(latestProgressionSnapshot.vitals?.taserEnergyCost) || 8
      );
      if (Number(me.health) < taserEnergyCost) {
        showStatusMessage(`Not enough energy. The taser requires ${taserEnergyCost}.`, false);
        return;
      }

      faceLocalPlayerTowardActionCenter({
        worldX: selectedMob.x,
        worldY: selectedMob.y
      });
      startLocalPlayerActionAnimation("taser");
      sendRoomMessage("interact", {
        source: selectedMob.kind === "alien_artifact" ? "alien_artifact" : "mob",
        action: selectedMob.kind === "alien_artifact" ? "taser_artifact" : "taser",
        ...(selectedMob.kind === "alien_artifact"
          ? { artifactId: selectedMob.id }
          : { mobId: selectedMob.id })
      });
      return;
    }

    const nearbyCollectable = getNearestVisibleCollectableNode(me?.x ?? 0, me?.y ?? 0);

    if (nearbyCollectable) {
      if (nearbyCollectable.kind === "communication") {
        faceLocalPlayerTowardActionCenter({
          worldX: nearbyCollectable.x,
          worldY: nearbyCollectable.y
        });
        startLocalPlayerActionAnimation("comm");
        sendRoomMessage("interact", {
          source: "collectable",
          action: "comm",
          nodeId: nearbyCollectable.id
        });
        return;
      }

      resourceCollectionSequence?.start({
        resourceKind: nearbyCollectable.kind,
        resourceLabel:
          nearbyCollectable.kind === "rock"
            ? "Rock Sample"
            : nearbyCollectable.kind === "pond"
              ? "Water Sample"
              : nearbyCollectable.kind === "specimen"
                ? "Alien Specimen"
              : "Plant Sample",
        tier: nearbyCollectable.tier || 1,
        requestCollection: () => {
          faceLocalPlayerTowardActionCenter({
            worldX: nearbyCollectable.x,
            worldY: nearbyCollectable.y
          });
          startLocalPlayerActionAnimation(nearbyCollectable.action);
          return sendRoomMessage("interact", {
            source: "collectable",
            action: nearbyCollectable.action,
            nodeId: nearbyCollectable.id
          });
        }
      });

      return;
    }

const nearbyActionCenter = getNearestActionCenterForWorldPosition(me?.x ?? 0, me?.y ?? 0);

if (nearbyActionCenter) {
  const resourceKindByAction = {
    mine: "rock",
    fish: "pond",
    dig: "plant"
  };
  const actionResourceKind = resourceKindByAction[nearbyActionCenter.action] || null;
  const requestActionCenterCollection = () => {
    faceLocalPlayerTowardActionCenter(nearbyActionCenter);
    startLocalPlayerActionAnimation(nearbyActionCenter.action);
    return sendRoomMessage("interact", {
      source: "action_center",
      action: nearbyActionCenter.action,
      tileX: nearbyActionCenter.tileX,
      tileY: nearbyActionCenter.tileY,
      selectedItemKey: selectedInventoryKey || ""
    });
  };

  if (actionResourceKind) {
    resourceCollectionSequence?.start({
      resourceKind: actionResourceKind,
      resourceLabel:
        actionResourceKind === "rock"
          ? "Rock Sample"
          : actionResourceKind === "pond"
            ? "Water Sample"
            : "Plant Sample",
      tier: 1,
      requestCollection: requestActionCenterCollection
    });
    return;
  }

  requestActionCenterCollection();
}
  }

  if (
    !isMapTransitionInProgress &&
    !tileEditorEnabled &&
    !metadataEditorEnabled &&
    !isTypingInUi() &&
    me
  ) {
    const activePortal = getPortalAtWorldPosition(me.x ?? 0, me.y ?? 0);

    if (!activePortal) {
      lastTriggeredTransitionKey = "";
    }
  }
}

/*
TILE SYSTEM
-----------
Purpose:
Define layered 16x16 tile maps that store tilesheet frame indices.

Includes:
- fallback tile textures
- frame helpers
- layered map creation helpers
- paint helpers
- layout import/export helpers
- layered tile rendering helpers
*/

const FALLBACK_FRAME_DEFS = {
  0: { key: "tile_floor", color: 0x1f2a38, stroke: 0x2f4157 },
  1: { key: "tile_wall", color: 0x243041, stroke: 0x5b6f8a },
  2: { key: "tile_platform", color: 0x2a3445, stroke: 0x42536b },
  3: { key: "tile_grass", color: 0x284a2f, stroke: 0x3e6b47 },
  4: { key: "tile_path", color: 0x6f5b43, stroke: 0x8d7558 },
  5: { key: "tile_rock", color: 0x4c5663, stroke: 0x687385 }
};

function ensureTileTextures(scene) {
  Object.values(FALLBACK_FRAME_DEFS).forEach((def) => {
    if (scene.textures.exists(def.key)) return;

    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    g.clear();
    g.fillStyle(def.color, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    g.lineStyle(1, def.stroke, 1);
    g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);

    g.generateTexture(def.key, TILE_SIZE, TILE_SIZE);
    g.destroy();
  });
}

function getTilesheetImageSize() {
  const imageKey = getActiveTilesetImageKey();
  const frameWidth = getActiveTilesetFrameWidth();
  const frameHeight = getActiveTilesetFrameHeight();

  if (!sceneRef?.textures?.exists(imageKey)) {
    return {
      width: frameWidth,
      height: frameHeight
    };
  }

  const image = sceneRef.textures.get(imageKey).getSourceImage();

  return {
    width: image.width,
    height: image.height
  };
}

function getTilesheetColumns() {
  const size = getTilesheetImageSize();
  return Math.max(1, Math.floor(size.width / getActiveTilesetFrameWidth()));
}

function getTilesheetRows() {
  const size = getTilesheetImageSize();
  return Math.max(1, Math.floor(size.height / getActiveTilesetFrameHeight()));
}

function getTilesheetFrameCount() {
  return getTilesheetColumns() * getTilesheetRows();
}

function getLogicalTilesheetFrameCount() {
  const manifest = sceneRef?.cache?.json?.get?.(ISO_OUTSIDE_MANIFEST_KEY);
  return manifest?.frames?.length || getTilesheetFrameCount();
}

function getTextureFrameForLogicalFrame(frameIndex) {
  const definition = getManifestFrameDefinition(frameIndex);
  return Number.isInteger(definition?.textureFrame)
    ? definition.textureFrame
    : frameIndex;
}

function getLogicalFrameForTextureFrame(textureFrame) {
  if (!Number.isInteger(textureFrame) || textureFrame < 0) return null;
  const manifest = sceneRef?.cache?.json?.get?.(ISO_OUTSIDE_MANIFEST_KEY);
  const match = manifest?.frames?.find?.((entry) =>
    (Number.isInteger(entry?.textureFrame) ? entry.textureFrame : entry?.frame) === textureFrame
  );
  return Number.isInteger(match?.frame) ? match.frame : null;
}

function getObjectSheetImageSize() {
  if (!sceneRef?.textures?.exists(OBJECT_SHEET_IMAGE_KEY)) {
    return {
      width: OBJECT_FRAME_WIDTH,
      height: OBJECT_FRAME_HEIGHT
    };
  }

  const image = sceneRef.textures.get(OBJECT_SHEET_IMAGE_KEY).getSourceImage();

  return {
    width: image.width,
    height: image.height
  };
}

function getObjectSheetColumns() {
  const size = getObjectSheetImageSize();
  return Math.max(1, Math.floor(size.width / OBJECT_FRAME_WIDTH));
}

function getObjectSheetRows() {
  const size = getObjectSheetImageSize();
  return Math.max(1, Math.floor(size.height / OBJECT_FRAME_HEIGHT));
}

function getObjectSheetFrameCount() {
  return getObjectSheetColumns() * getObjectSheetRows();
}

function isValidObjectFrame(frameIndex) {
  return Number.isInteger(frameIndex) && frameIndex >= 0 && frameIndex < getObjectSheetFrameCount();
}

function isValidTilesheetFrame(frameIndex) {
  if (!Number.isInteger(frameIndex) || frameIndex < 0) return false;
  const manifest = sceneRef?.cache?.json?.get?.(ISO_OUTSIDE_MANIFEST_KEY);
  if (!manifest?.frames?.length) return frameIndex < getTilesheetFrameCount();
  return !!getManifestFrameDefinition(frameIndex);
}

function getFrameName(frameIndex) {
  if (isIsometricMode()) {
    const frame = getManifestFrameDefinition(frameIndex);
    if (frame?.label) {
      return `${frame.label} (Frame ${frameIndex})`;
    }
  }
  return `Frame ${frameIndex}`;
}

function getFrameSemanticHints(frameIndex) {
  if (!isIsometricMode()) return "";
  const frame = getManifestFrameDefinition(frameIndex);
  if (!frame) return "";

  const hints = [frame.category].filter(Boolean);
  if (frame.solidSuggested) hints.push("solid suggested");
  if (frame.overheadSuggested) hints.push("overhead suggested");
  const defaultLayer = getFrameDefaultLayer(frameIndex);
  if (defaultLayer) hints.push(`layer ${getLayerName(defaultLayer)}`);
  return hints.join(" • ");
}

/*
FRAME METADATA HELPERS
----------------------
Purpose:
Reads and writes metadata assigned to tilesheet frames.

Includes:
- default frame metadata
- safe metadata lookup
- metadata toggle helpers
- action center assignment
*/

function getManifestFrameDefinition(frameIndex) {
  const manifest = sceneRef?.cache?.json?.get?.(ISO_OUTSIDE_MANIFEST_KEY);
  const direct = manifest?.frames?.[frameIndex];
  if (direct?.frame === frameIndex) return direct;
  return manifest?.frames?.find?.((entry) => entry?.frame === frameIndex) || null;
}

function getManifestActionCenter(frameIndex) {
  const interaction = getManifestFrameDefinition(frameIndex)?.interactionSuggested;
  if (interaction === "craft") return "craft";
  if (interaction === "fish") return "fish";
  if (interaction === "mine") return "mine";
  if (interaction === "communicate") return "comm";
  if (interaction === "harvest" || interaction === "dig") return "dig";
  return null;
}

function isManifestAnimationFrame(frameIndex) {
  const manifest = sceneRef?.cache?.json?.get?.(ISO_OUTSIDE_MANIFEST_KEY);
  return !!manifest?.animations?.some?.((animation) =>
    animation.frames?.includes?.(frameIndex)
  );
}

function createDefaultFrameMetadata(frameIndex = null) {
  const semantic = Number.isInteger(frameIndex)
    ? getManifestFrameDefinition(frameIndex)
    : null;
  return {
    collision: semantic?.solidSuggested && !semantic?.overheadSuggested ? 1 : 0,
    actionCenter: Number.isInteger(frameIndex)
      ? getManifestActionCenter(frameIndex)
      : null,
    animate: Number.isInteger(frameIndex) && isManifestAnimationFrame(frameIndex)
      ? 1
      : 0
  };
}

function getFrameMetadata(frameIndex) {
  if (!isValidTilesheetFrame(frameIndex)) {
    return createDefaultFrameMetadata();
  }

  if (!tilesetFrameMetadata[frameIndex]) {
    tilesetFrameMetadata[frameIndex] = createDefaultFrameMetadata(frameIndex);
  }

  return tilesetFrameMetadata[frameIndex];
}

const TILESET_DEFAULT_LAYER_STORAGE_KEY = "e3_tileset_default_layers_v2";

function getFrameDefaultLayer(frameIndex) {
  const layer = tilesetFrameDefaultLayers[frameIndex];
  if (["base", "detail", "overhead"].includes(layer)) return layer;

  const suggested = getManifestFrameDefinition(frameIndex)?.layerSuggested;
  if (suggested === 1 || suggested === "base") return "base";
  if (suggested === 2 || suggested === "detail") return "detail";
  if (suggested === 3 || suggested === "overhead") return "overhead";
  return null;
}

function saveTilesetDefaultLayers() {
  try {
    localStorage.setItem(
      TILESET_DEFAULT_LAYER_STORAGE_KEY,
      JSON.stringify(tilesetFrameDefaultLayers)
    );
  } catch (error) {
    console.warn("Failed to save tileset layer designations:", error);
  }
}

function loadTilesetDefaultLayers() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(TILESET_DEFAULT_LAYER_STORAGE_KEY) || "{}"
    );
    tilesetFrameDefaultLayers = Object.fromEntries(
      Object.entries(parsed || {}).filter(([frameIndex, layer]) =>
        Number.isInteger(Number(frameIndex)) &&
        Number(frameIndex) >= 0 &&
        ["base", "detail", "overhead"].includes(layer)
      )
    );
  } catch (error) {
    console.warn("Failed to load tileset layer designations:", error);
    tilesetFrameDefaultLayers = {};
  }
}

function setFrameDefaultLayer(frameIndex, layer) {
  if (!isValidTilesheetFrame(frameIndex)) return;

  if (["base", "detail", "overhead"].includes(layer)) {
    tilesetFrameDefaultLayers[frameIndex] = layer;
  } else {
    delete tilesetFrameDefaultLayers[frameIndex];
  }
  saveTilesetDefaultLayers();
}

function toggleFrameCollision(frameIndex) {
  const meta = getFrameMetadata(frameIndex);
  tilesetFrameMetadataExplicitFrames.add(frameIndex);
  meta.collision = meta.collision ? 0 : 1;
  refreshTilePaletteMetadataOverlay();
}

function toggleFrameAnimate(frameIndex) {
  const meta = getFrameMetadata(frameIndex);
  tilesetFrameMetadataExplicitFrames.add(frameIndex);
  meta.animate = meta.animate ? 0 : 1;
  refreshTilePaletteMetadataOverlay();
}

function setFrameActionCenter(frameIndex, actionName) {
  const meta = getFrameMetadata(frameIndex);
  tilesetFrameMetadataExplicitFrames.add(frameIndex);
  meta.actionCenter = actionName;
  refreshTilePaletteMetadataOverlay();
}

function clearFrameActionCenter(frameIndex) {
  const meta = getFrameMetadata(frameIndex);
  tilesetFrameMetadataExplicitFrames.add(frameIndex);
  meta.actionCenter = null;
  refreshTilePaletteMetadataOverlay();
}

/*
METADATA BRUSH HELPERS
----------------------
Purpose:
Copies metadata from the selected source frame and paints or clears it
across other tilesheet frames during click-drag editing.
*/

function clearFrameMetadata(frameIndex) {
  if (!isValidTilesheetFrame(frameIndex)) return;

  tilesetFrameMetadata[frameIndex] = createDefaultFrameMetadata();
  tilesetFrameMetadataExplicitFrames.add(frameIndex);
}

/*
METADATA PAINT MODE HELPERS
---------------------------
Purpose:
Paint or erase the currently selected metadata type across tilesheet frames.
*/

function applyMetadataPaintModeToFrame(frameIndex) {
  if (!isValidTilesheetFrame(frameIndex)) return;

  const meta = getFrameMetadata(frameIndex);
  tilesetFrameMetadataExplicitFrames.add(frameIndex);

  if (metadataPaintMode === "layer_base") {
    setFrameDefaultLayer(frameIndex, "base");
    return;
  }

  if (metadataPaintMode === "layer_detail") {
    setFrameDefaultLayer(frameIndex, "detail");
    return;
  }

  if (metadataPaintMode === "layer_overhead") {
    setFrameDefaultLayer(frameIndex, "overhead");
    return;
  }

  if (metadataPaintMode === "clear_layer") {
    setFrameDefaultLayer(frameIndex, null);
    return;
  }

  if (metadataPaintMode === "collision") {
    meta.collision = 1;
    return;
  }

  if (metadataPaintMode === "animate") {
    meta.animate = 1;
    return;
  }

  if (metadataPaintMode === "center_craft") {
    meta.actionCenter = "craft";
    return;
  }

  if (metadataPaintMode === "center_dig") {
    meta.actionCenter = "dig";
    return;
  }

  if (metadataPaintMode === "center_mine") {
    meta.actionCenter = "mine";
    return;
  }

  if (metadataPaintMode === "center_fish") {
    meta.actionCenter = "fish";
    return;
  }

  if (metadataPaintMode === "center_comm") {
    meta.actionCenter = "comm";
    return;
  }

  if (metadataPaintMode === "clear_center") {
    meta.actionCenter = null;
  }
}

function eraseMetadataPaintModeFromFrame(frameIndex) {
  if (!isValidTilesheetFrame(frameIndex)) return;

  const meta = getFrameMetadata(frameIndex);
  tilesetFrameMetadataExplicitFrames.add(frameIndex);

  if (
    metadataPaintMode === "layer_base" ||
    metadataPaintMode === "layer_detail" ||
    metadataPaintMode === "layer_overhead" ||
    metadataPaintMode === "clear_layer"
  ) {
    setFrameDefaultLayer(frameIndex, null);
    return;
  }

  if (metadataPaintMode === "collision") {
    meta.collision = 0;
    return;
  }

  if (metadataPaintMode === "animate") {
    meta.animate = 0;
    return;
  }

  if (
    metadataPaintMode === "center_craft" ||
    metadataPaintMode === "center_dig" ||
    metadataPaintMode === "center_mine" ||
    metadataPaintMode === "center_fish" ||
    metadataPaintMode === "center_comm" ||
    metadataPaintMode === "clear_center"
  ) {
    meta.actionCenter = null;
  }
}

function getMetadataPaintModeLabel() {
  if (metadataPaintMode === "collision") return "Collision";
  if (metadataPaintMode === "layer_base") return "Layer: Base";
  if (metadataPaintMode === "layer_detail") return "Layer: Detail";
  if (metadataPaintMode === "layer_overhead") return "Layer: Overhead";
  if (metadataPaintMode === "clear_layer") return "Layer: Clear";
  if (metadataPaintMode === "animate") return "Animate";
  if (metadataPaintMode === "center_craft") return "Center: Craft";
  if (metadataPaintMode === "center_dig") return "Center: Dig";
  if (metadataPaintMode === "center_mine") return "Center: Mine";
  if (metadataPaintMode === "center_fish") return "Center: Fish";
  if (metadataPaintMode === "center_comm") return "Center: Comm";
  if (metadataPaintMode === "clear_center") return "Clear Center";
  return metadataPaintMode;
}

function stopMetadataPaletteDrag() {
  isMetadataPalettePaintDragging = false;
  isMetadataPaletteEraseDragging = false;
}

function getActionCenterShortLabel(actionName) {
  if (actionName === "craft") return "CR";
  if (actionName === "dig") return "DG";
  if (actionName === "mine") return "MN";
  if (actionName === "fish") return "FS";
  if (actionName === "comm") return "CM";
  return "";
}

/*
TILESET METADATA SERIALIZATION HELPERS
--------------------------------------
Purpose:
Convert frame metadata between in-memory object form and Supabase row form.
*/

function clearAllTilesetFrameMetadata() {
  tilesetFrameMetadata = {};
  tilesetFrameMetadataExplicitFrames = new Set();
}

function getTilesetMetadataRowsForSave() {
  return Object.entries(tilesetFrameMetadata)
    .map(([frameIndex, meta]) => ({
      frame_index: Number(frameIndex),
      collision: !!meta?.collision,
      animate: !!meta?.animate,
      action_center: meta?.actionCenter || null
    }))
    .filter((row) =>
      Number.isInteger(row.frame_index) &&
      row.frame_index >= 0 &&
      (
        row.collision ||
        row.animate ||
        row.action_center ||
        tilesetFrameMetadataExplicitFrames.has(row.frame_index)
      )
    )
    .sort((a, b) => a.frame_index - b.frame_index);
}

function applyTilesetMetadataRows(rows) {
  clearAllTilesetFrameMetadata();

  if (!Array.isArray(rows)) {
    refreshTilesetAnimationData();
    refreshTilePaletteMetadataOverlay();
    updateTileEditorText();
    return;
  }

  rows.forEach((row) => {
    const frameIndex = Number(row?.frame_index);

    if (!isValidTilesheetFrame(frameIndex)) return;

    tilesetFrameMetadata[frameIndex] = {
      collision: row?.collision ? 1 : 0,
      animate: row?.animate ? 1 : 0,
      actionCenter: row?.action_center || null
    };
    tilesetFrameMetadataExplicitFrames.add(frameIndex);
  });

  refreshTilesetAnimationData();
  refreshTilePaletteMetadataOverlay();
  updateTileEditorText();
}

function resolveDisplayFrameIndex(scene, frameIndex) {
  if (!isIsometricMode()) return frameIndex;

  let isoFrame;
  const previousMap = scene?.cache?.json?.get?.(ISO_PREVIOUS_FRAME_MAP_KEY);

  if (isStoredIsometricFrame(frameIndex)) {
    isoFrame = frameIndex - ISO_STORED_FRAME_OFFSET;
  } else if (isPreviousStoredIsometricFrame(frameIndex)) {
    const previousFrame = frameIndex - ISO_PREVIOUS_STORED_FRAME_OFFSET;
    isoFrame = Number(previousMap?.frames?.[String(previousFrame)] ?? 0);
  } else {
    const legacyMap = scene?.cache?.json?.get?.(ISO_LEGACY_FRAME_MAP_KEY);
    const previousFrame = Number(legacyMap?.frames?.[String(frameIndex)] ?? 0);
    isoFrame = Number(previousMap?.frames?.[String(previousFrame)] ?? 0);
  }

  const manifest = scene?.cache?.json?.get?.(ISO_OUTSIDE_MANIFEST_KEY);
  const isoFrameCount = manifest?.frames?.length || getTilesheetFrameCount();
  return Number.isInteger(isoFrame) && isoFrame >= 0 && isoFrame < isoFrameCount
    ? isoFrame
    : 0;
}

function migrateTileLayerToActiveTileset(scene, layer) {
  return layer.map((row) =>
    row.map((storedFrame) => {
      if (storedFrame === TILE_EMPTY || isStoredIsometricFrame(storedFrame)) {
        return storedFrame;
      }
      return encodeTileFrameForStorage(
        resolveDisplayFrameIndex(scene, storedFrame)
      );
    })
  );
}

function getTileRenderSource(scene, frameIndex) {
  if (frameIndex === TILE_EMPTY) return null;
  const isoFrame = resolveDisplayFrameIndex(scene, frameIndex);
  if (!scene.textures.exists(ISO_OUTSIDE_TILESET_KEY)) return null;
  return {
    textureKey: ISO_OUTSIDE_TILESET_KEY,
    frame: getTextureFrameForLogicalFrame(isoFrame)
  };
}

function createEmptyRoomTileMap(width, height, fillValue = TILE_EMPTY) {
  const map = [];

  for (let row = 0; row < height; row++) {
    const rowData = [];

    for (let col = 0; col < width; col++) {
      rowData.push(fillValue);
    }

    map.push(rowData);
  }

  return map;
}

function paintRect(tileMap, startCol, startRow, width, height, frameIndex) {
  for (let row = startRow; row < startRow + height; row++) {
    for (let col = startCol; col < startCol + width; col++) {
      if (!tileMap[row] || tileMap[row][col] === undefined) continue;
      tileMap[row][col] = frameIndex;
    }
  }
}

function paintBorder(tileMap, frameIndex) {
  const height = tileMap.length;
  const width = tileMap[0]?.length || 0;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const isBorder =
        row === 0 ||
        row === height - 1 ||
        col === 0 ||
        col === width - 1;

      if (isBorder) {
        tileMap[row][col] = frameIndex;
      }
    }
  }
}

function cloneTileMap(tileMap) {
  return tileMap.map((row) => [...row]);
}

function cloneLayeredRoomLayout(layout) {
  return {
    base: cloneTileMap(layout.base),
    detail: cloneTileMap(layout.detail),
    overhead: cloneTileMap(layout.overhead),
    objects: cloneTileMap(layout.objects || createStarterRoomObjectLayerMap())
  };
}

function expandLayerToSize(layer, targetWidth, targetHeight, fillValue = TILE_EMPTY) {
  return Array.from({ length: targetHeight }, (_, rowIndex) =>
    Array.from({ length: targetWidth }, (_, colIndex) => {
      return layer?.[rowIndex]?.[colIndex] ?? fillValue;
    })
  );
}

function expandRoomLayoutToSize(layout, targetWidth, targetHeight) {
  return {
    base: expandLayerToSize(layout.base, targetWidth, targetHeight, TILE_EMPTY),
    detail: expandLayerToSize(layout.detail, targetWidth, targetHeight, TILE_EMPTY),
    overhead: expandLayerToSize(layout.overhead, targetWidth, targetHeight, TILE_EMPTY),
    objects: expandLayerToSize(layout.objects || [], targetWidth, targetHeight, OBJECT_EMPTY)
  };
}

function isValidLayerMap(layer) {
  return (
    Array.isArray(layer) &&
    layer.every(
      (row) =>
        Array.isArray(row) &&
        row.every((cell) => Number.isInteger(cell))
    )
  );
}

function isValidRoomLayout(layout) {
  if (
    !layout ||
    typeof layout !== "object" ||
    !isValidLayerMap(layout.base) ||
    !isValidLayerMap(layout.detail) ||
    !isValidLayerMap(layout.overhead) ||
    (
      layout.objects !== undefined &&
      !isValidLayerMap(layout.objects)
    )
  ) {
    return false;
  }

  const height = layout.base.length;
  const width = layout.base[0]?.length || 0;

  if (height <= 0 || width <= 0) {
    return false;
  }

  const objectLayer =
    layout.objects ||
    createEmptyRoomTileMap(width, height, OBJECT_EMPTY);

  const isSameSize = (layer) =>
    layer.length === height &&
    layer.every((row) => Array.isArray(row) && row.length === width);

  return (
    isSameSize(layout.base) &&
    isSameSize(layout.detail) &&
    isSameSize(layout.overhead) &&
    isSameSize(objectLayer)
  );
}

function getCurrentRoomLayoutData() {
  return {
    base: cloneTileMap(roomBaseLayerMap),
    detail: cloneTileMap(roomDetailLayerMap),
    overhead: cloneTileMap(roomOverheadLayerMap),
    objects: cloneTileMap(roomObjectLayerMap)
  };
}

function applyRoomLayout(scene, layout) {
  if (!isValidRoomLayout(layout)) {
    console.warn("Ignoring invalid room layout:", layout);
    return false;
  }

  const height = layout.base.length;
  const width = layout.base[0]?.length || 0;

  const hasExpectedSize =
    height > 0 &&
    width > 0 &&
    layout.base.every((row) => Array.isArray(row) && row.length === width) &&
    layout.detail.length === height &&
    layout.detail.every((row) => Array.isArray(row) && row.length === width) &&
    layout.overhead.length === height &&
    layout.overhead.every((row) => Array.isArray(row) && row.length === width);

  if (!hasExpectedSize) {
    console.warn("Ignoring empty or wrong-sized server room layout:", layout);
    return false;
  }

  roomBaseLayerMap = migrateTileLayerToActiveTileset(scene, layout.base);
  roomDetailLayerMap = migrateTileLayerToActiveTileset(scene, layout.detail);
  roomOverheadLayerMap = migrateTileLayerToActiveTileset(scene, layout.overhead);

  const objectLayer =
    layout.objects ||
    createEmptyRoomTileMap(
      roomBaseLayerMap[0]?.length || DEFAULT_ROOM_TILE_WIDTH,
      roomBaseLayerMap.length || DEFAULT_ROOM_TILE_HEIGHT,
      OBJECT_EMPTY
    );

  roomObjectLayerMap = cloneTileMap(objectLayer);

  renderAllTileLayers(scene);
  refreshRoomFrameGraphics(scene);
  refreshTransitionDebugGraphics(scene);
  refreshPlayerDebugGraphics(scene);
  refreshCameraBounds(scene);

  return true;
}

/*
SEEDED PROCEDURAL MAP GENERATOR
-------------------------------
Purpose:
Build an editable isometric starting map from the semantic outside tilesheet.

Rules:
- generation is deterministic for a seed
- Base receives continuous terrain
- Detail receives transitions, blockers, trunks, and ground decoration
- Overhead receives canopy art only
- existing object placements are preserved
*/

function getProceduralHash(seed, x, y, salt = 0) {
  let value =
    (Number(seed) >>> 0) ^
    Math.imul((x | 0) + 0x9e3779b9, 0x85ebca6b) ^
    Math.imul((y | 0) + 0x7f4a7c15, 0xc2b2ae35) ^
    Math.imul((salt | 0) + 0x165667b1, 0x27d4eb2f);
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function getProceduralValueNoise(seed, x, y, scale, salt = 0) {
  const sampleX = x / scale;
  const sampleY = y / scale;
  const x0 = Math.floor(sampleX);
  const y0 = Math.floor(sampleY);
  const txRaw = sampleX - x0;
  const tyRaw = sampleY - y0;
  const tx = txRaw * txRaw * (3 - 2 * txRaw);
  const ty = tyRaw * tyRaw * (3 - 2 * tyRaw);
  const topLeft = getProceduralHash(seed, x0, y0, salt);
  const topRight = getProceduralHash(seed, x0 + 1, y0, salt);
  const bottomLeft = getProceduralHash(seed, x0, y0 + 1, salt);
  const bottomRight = getProceduralHash(seed, x0 + 1, y0 + 1, salt);
  const top = Phaser.Math.Linear(topLeft, topRight, tx);
  const bottom = Phaser.Math.Linear(bottomLeft, bottomRight, tx);
  return Phaser.Math.Linear(top, bottom, ty);
}

function getProceduralFractalNoise(seed, x, y, salt = 0) {
  return (
    getProceduralValueNoise(seed, x, y, 22, salt) * 0.55 +
    getProceduralValueNoise(seed, x, y, 11, salt + 17) * 0.3 +
    getProceduralValueNoise(seed, x, y, 5.5, salt + 41) * 0.15
  );
}

function getProceduralVariant(frames, seed, x, y, salt = 0) {
  if (!frames.length) return TILE_EMPTY;
  const index = Math.floor(
    getProceduralHash(seed, x, y, salt) * frames.length
  ) % frames.length;
  return ISO_STORED_FRAME_OFFSET + frames[index];
}

function getProceduralListVariant(items, seed, x, y, salt = 0) {
  if (!items.length) return null;
  const index = Math.floor(
    getProceduralHash(seed, x, y, salt) * items.length
  ) % items.length;
  return items[index];
}

function getProceduralReservedTiles(width, height) {
  const reserved = new Set();
  const reserveRadius = (centerX, centerY, radius) => {
    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        const tileX = centerX + offsetX;
        const tileY = centerY + offsetY;
        if (tileX < 0 || tileY < 0 || tileX >= width || tileY >= height) continue;
        reserved.add(`${tileX}:${tileY}`);
      }
    }
  };

  roomObjectLayerMap.forEach((row, tileY) => {
    row?.forEach?.((frame, tileX) => {
      if (Number.isInteger(frame) && frame !== OBJECT_EMPTY) {
        reserveRadius(tileX, tileY, 2);
      }
    });
  });

  room?.state?.players?.forEach?.((player) => {
    const tileX = Math.floor(((player.x ?? ROOM_OFFSET_X) - ROOM_OFFSET_X) / TILE_SIZE);
    const tileY = Math.floor(((player.y ?? ROOM_OFFSET_Y) - ROOM_OFFSET_Y) / TILE_SIZE);
    reserveRadius(tileX, tileY, 3);
  });

  reserveRadius(Math.floor(width / 2), Math.floor(height / 2), 3);
  return reserved;
}

const ISO_SCREEN_COMPASS = [
  { key: "N", tileDx: -1, tileDy: -1, screenDx: 0, screenDy: -1 },
  { key: "NE", tileDx: 0, tileDy: -1, screenDx: 1, screenDy: -1 },
  { key: "E", tileDx: 1, tileDy: -1, screenDx: 1, screenDy: 0 },
  { key: "SE", tileDx: 1, tileDy: 0, screenDx: 1, screenDy: 1 },
  { key: "S", tileDx: 1, tileDy: 1, screenDx: 0, screenDy: 1 },
  { key: "SW", tileDx: 0, tileDy: 1, screenDx: -1, screenDy: 1 },
  { key: "W", tileDx: -1, tileDy: 1, screenDx: -1, screenDy: 0 },
  { key: "NW", tileDx: -1, tileDy: 0, screenDx: -1, screenDy: -1 }
];

const LAKE_TRANSITION_FRAMES = {
  N: 80,
  NE: 81,
  NW: 82,
  E: 83,
  W: 86,
  SE: 87,
  SW: 88,
  S: 89
};
const HILL_SLOPE_FRAMES = {
  N: 30,
  NE: 31,
  NW: 32,
  E: 33,
  W: 35,
  SE: 36,
  SW: 37,
  S: 38
};
const MOUNTAIN_SLOPE_FRAMES = {
  N: 50,
  NE: 51,
  NW: 52,
  E: 53,
  W: 56,
  SE: 57,
  SW: 58,
  S: 59
};
const TALL_GRASS_EDGE_FRAMES = {
  N: 110,
  NE: 111,
  NW: 112,
  E: 113,
  W: 115,
  SE: 116,
  SW: 117,
  S: 118
};
const RIVER_FRAME_BY_EDGES = {
  "NE|NW": 90,
  "NW|SE": 91,
  "NE|SW": 92,
  "NE|SE": 93,
  "NW|SW": 94,
  "SE|SW": 95
};
const ISO_EDGE_OPPOSITE = {
  NW: "SE",
  NE: "SW",
  SE: "NW",
  SW: "NE"
};
const ISO_EDGE_STEP = {
  NW: { dx: -1, dy: 0 },
  NE: { dx: 0, dy: -1 },
  SE: { dx: 1, dy: 0 },
  SW: { dx: 0, dy: 1 }
};

function createProceduralMask(width, height, initialValue = false) {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => initialValue)
  );
}

function isProceduralMaskSet(mask, tileX, tileY) {
  return !!mask?.[tileY]?.[tileX];
}

function getProceduralRegionDirection(mask, tileX, tileY) {
  if (!isProceduralMaskSet(mask, tileX, tileY)) return null;

  const immediateNeighbors = ISO_SCREEN_COMPASS.filter((direction) =>
    isProceduralMaskSet(
      mask,
      tileX + direction.tileDx,
      tileY + direction.tileDy
    )
  );
  if (!immediateNeighbors.length || immediateNeighbors.length === 8) return null;

  let vectorX = 0;
  let vectorY = 0;
  ISO_SCREEN_COMPASS.forEach((direction) => {
    let score = 0;
    for (let distance = 1; distance <= 3; distance += 1) {
      if (
        isProceduralMaskSet(
          mask,
          tileX + direction.tileDx * distance,
          tileY + direction.tileDy * distance
        )
      ) {
        score += 4 - distance;
      }
    }
    vectorX += direction.screenDx * score;
    vectorY += direction.screenDy * score;
  });

  if (Math.abs(vectorX) < 0.001 && Math.abs(vectorY) < 0.001) {
    return immediateNeighbors[0].key;
  }

  let bestDirection = immediateNeighbors[0];
  let bestDot = -Infinity;
  ISO_SCREEN_COMPASS.forEach((direction) => {
    const length = Math.hypot(direction.screenDx, direction.screenDy) || 1;
    const dot =
      (direction.screenDx * vectorX + direction.screenDy * vectorY) / length;
    if (dot > bestDot) {
      bestDot = dot;
      bestDirection = direction;
    }
  });
  return bestDirection.key;
}

function getRiverFrameForEdges(firstEdge, secondEdge) {
  if (!firstEdge || !secondEdge || firstEdge === secondEdge) return null;
  const order = ["NE", "NW", "SE", "SW"];
  const edges = [firstEdge, secondEdge].sort(
    (left, right) => order.indexOf(left) - order.indexOf(right)
  );
  return RIVER_FRAME_BY_EDGES[edges.join("|")] ?? null;
}

function buildProceduralRiverFrames(
  seed,
  width,
  height,
  reserved,
  waterMask
) {
  const riverFrames = new Map();
  const verticalRoute = getProceduralHash(seed, 0, 0, 901) < 0.5;
  const routeEdges = verticalRoute ? ["SE", "SW"] : ["SE", "NE"];
  let tileX = verticalRoute ? 2 : 2;
  let tileY = verticalRoute ? 2 : height - 3;
  const goalX = width - 3;
  const goalY = verticalRoute ? height - 3 : 2;

  while (
    (
      reserved.has(`${tileX}:${tileY}`) ||
      isProceduralMaskSet(waterMask, tileX, tileY)
    ) &&
    tileX < width - 4
  ) {
    tileX += 1;
  }

  const path = [{ tileX, tileY }];
  const outboundEdges = [];
  const visited = new Set([`${tileX}:${tileY}`]);
  const maxSteps = width + height + 24;

  for (let stepIndex = 0; stepIndex < maxSteps; stepIndex += 1) {
    if (tileX === goalX && tileY === goalY) break;

    const candidates = routeEdges
      .map((edge) => {
        const step = ISO_EDGE_STEP[edge];
        return {
          edge,
          tileX: tileX + step.dx,
          tileY: tileY + step.dy
        };
      })
      .filter((candidate) => {
        if (
          candidate.tileX < 1 ||
          candidate.tileY < 1 ||
          candidate.tileX >= width - 1 ||
          candidate.tileY >= height - 1
        ) {
          return false;
        }
        if (visited.has(`${candidate.tileX}:${candidate.tileY}`)) return false;
        if (reserved.has(`${candidate.tileX}:${candidate.tileY}`)) return false;
        if (candidate.edge === "SE" && tileX >= goalX) return false;
        if (candidate.edge === "SW" && tileY >= goalY) return false;
        if (candidate.edge === "NE" && tileY <= goalY) return false;
        return true;
      });
    if (!candidates.length) break;

    const random = getProceduralHash(seed, tileX, tileY, 919 + stepIndex);
    let selected = candidates[0];
    if (candidates.length > 1) {
      const remainingX = Math.max(0, goalX - tileX);
      const remainingY = Math.abs(goalY - tileY);
      const xChance = remainingX / Math.max(1, remainingX + remainingY);
      selected = random < xChance
        ? candidates.find((entry) => entry.edge === "SE") || candidates[0]
        : candidates.find((entry) => entry.edge !== "SE") || candidates[0];
    }

    outboundEdges.push(selected.edge);
    if (
      path.length > 8 &&
      isProceduralMaskSet(waterMask, selected.tileX, selected.tileY)
    ) {
      break;
    }

    tileX = selected.tileX;
    tileY = selected.tileY;
    visited.add(`${tileX}:${tileY}`);
    path.push({ tileX, tileY });
  }

  if (outboundEdges.length < path.length) {
    outboundEdges.push(outboundEdges[outboundEdges.length - 1] || routeEdges[0]);
  }

  path.forEach((tile, index) => {
    const outbound = outboundEdges[index];
    const inbound = index === 0
      ? ISO_EDGE_OPPOSITE[outbound]
      : ISO_EDGE_OPPOSITE[outboundEdges[index - 1]];
    const frame = getRiverFrameForEdges(inbound, outbound);
    if (frame !== null) riverFrames.set(`${tile.tileX}:${tile.tileY}`, frame);
  });
  return riverFrames;
}

function applyProceduralCollisionSuggestions(usedFrames) {
  const manifest = sceneRef?.cache?.json?.get?.(ISO_OUTSIDE_MANIFEST_KEY);
  usedFrames.forEach((frameIndex) => {
    const semantic = manifest?.frames?.[frameIndex];
    if (!semantic?.solidSuggested || semantic?.overheadSuggested) return;
    getFrameMetadata(frameIndex).collision = 1;
  });
  refreshTilePaletteMetadataOverlay();
}

function getProceduralGroupsForCategory(category) {
  const manifest = sceneRef?.cache?.json?.get?.(ISO_OUTSIDE_MANIFEST_KEY);
  return tileGroups.filter((group) =>
    (!group.projection || group.projection === "isometric") &&
    group.entries.some((entry) =>
      manifest?.frames?.[entry.frame]?.category === category
    )
  );
}

function reserveProceduralFootprint(
  occupied,
  footprint,
  width,
  height,
  padding = 1
) {
  footprint.forEach(({ tileX, tileY }) => {
    for (let offsetY = -padding; offsetY <= padding; offsetY += 1) {
      for (let offsetX = -padding; offsetX <= padding; offsetX += 1) {
        const reservedX = tileX + offsetX;
        const reservedY = tileY + offsetY;
        if (
          reservedX < 0 ||
          reservedY < 0 ||
          reservedX >= width ||
          reservedY >= height
        ) {
          continue;
        }
        occupied.add(`${reservedX}:${reservedY}`);
      }
    }
  });
}

function tryStampProceduralTileGroup({
  group,
  anchorTileX,
  anchorTileY,
  layout,
  width,
  height,
  reserved,
  occupied,
  waterFrames,
  usedFrames,
  canPlaceAt = null
}) {
  const placements = getTileGroupPlacements(group, group.anchorFrame).map(
    (entry) => ({
      ...entry,
      tileX: anchorTileX + entry.mapDx,
      tileY: anchorTileY + entry.mapDy
    })
  );
  if (!placements.length) return false;

  const footprint = [];
  const footprintKeys = new Set();
  for (const placement of placements) {
    const { tileX, tileY } = placement;
    const key = `${tileX}:${tileY}`;
    if (
      tileX < 1 ||
      tileY < 1 ||
      tileX >= width - 1 ||
      tileY >= height - 1 ||
      reserved.has(key) ||
      occupied.has(key) ||
      (canPlaceAt && !canPlaceAt(tileX, tileY, placement)) ||
      waterFrames.includes(decodeStoredIsometricFrame(layout.base[tileY][tileX]))
    ) {
      return false;
    }

    const layerMap = layout[placement.layer];
    if (!layerMap?.[tileY] || layerMap[tileY][tileX] === undefined) return false;
    if (placement.layer !== "base" && layerMap[tileY][tileX] !== TILE_EMPTY) {
      return false;
    }

    if (!footprintKeys.has(key)) {
      footprintKeys.add(key);
      footprint.push({ tileX, tileY });
    }
  }

  placements.forEach((placement) => {
    layout[placement.layer][placement.tileY][placement.tileX] =
      ISO_STORED_FRAME_OFFSET + placement.frame;
    usedFrames.add(placement.frame);
  });
  reserveProceduralFootprint(occupied, footprint, width, height, 1);
  return true;
}

function buildProceduralRoomLayout(seed, width, height) {
  const grassFrames = [0, 1];
  const dirtFrames = [2, 3];
  const waterFrames = [84, 85];
  const grassDirtTransitionFrames = [
    4, 5, 6,
    10, 11, 12, 13, 14, 15, 16, 17,
    20, 21, 22, 23
  ];
  const mountainTopFrames = [54, 55, 71, 72, 73, 74, 75, 76, 77, 78, 79];
  const rockFrames = [66, 67, 68, 69];
  const standaloneTreeFrames = [140, 141, 147, 148, 149, 154, 156, 157, 159];
  const base = createEmptyRoomTileMap(width, height, TILE_EMPTY);
  const detail = createEmptyRoomTileMap(width, height, TILE_EMPTY);
  const overhead = createEmptyRoomTileMap(width, height, TILE_EMPTY);
  const waterMask = createProceduralMask(width, height);
  const dirtMask = createProceduralMask(width, height);
  const mountainMask = createProceduralMask(width, height);
  const hillMask = createProceduralMask(width, height);
  const forestMask = createProceduralMask(width, height);
  const tallGrassMask = createProceduralMask(width, height);
  const reserved = getProceduralReservedTiles(width, height);
  const occupied = new Set();
  const usedFrames = new Set();
  const rockGroups = getProceduralGroupsForCategory("rock");
  const treeGroups = getProceduralGroupsForCategory("tree");

  for (let tileY = 0; tileY < height; tileY += 1) {
    for (let tileX = 0; tileX < width; tileX += 1) {
      const edgeDistance = Math.min(
        tileX,
        tileY,
        width - 1 - tileX,
        height - 1 - tileY
      );
      const isReserved = reserved.has(`${tileX}:${tileY}`);
      const lakeNoise = getProceduralFractalNoise(seed, tileX, tileY, 3);
      const boundaryLakeNoise = getProceduralValueNoise(
        seed,
        tileX,
        tileY,
        18,
        37
      );
      const mountainNoise = getProceduralFractalNoise(seed, tileX, tileY, 151);
      const boundaryMountainNoise = getProceduralValueNoise(
        seed,
        tileX,
        tileY,
        20,
        181
      );
      const hillNoise = getProceduralFractalNoise(seed, tileX, tileY, 251);
      const biomeNoise = getProceduralValueNoise(
        seed,
        tileX,
        tileY,
        17,
        401
      );
      const groundNoise = getProceduralFractalNoise(seed, tileX, tileY, 503);

      const isWater =
        !isReserved &&
        (
          lakeNoise < 0.34 ||
          (edgeDistance < 3 && boundaryLakeNoise < 0.42)
        );
      const isMountain =
        !isReserved &&
        !isWater &&
        (
          mountainNoise > 0.66 ||
          (edgeDistance < 4 && boundaryMountainNoise > 0.68)
        );
      const isHill =
        !isReserved &&
        !isWater &&
        !isMountain &&
        hillNoise > 0.61;
      const isForest =
        !isReserved &&
        !isWater &&
        !isMountain &&
        !isHill &&
        biomeNoise < 0.46;
      const isTallGrass =
        !isReserved &&
        !isWater &&
        !isMountain &&
        !isHill &&
        !isForest &&
        biomeNoise > 0.57;
      const isDirt =
        !isReserved &&
        !isWater &&
        !isMountain &&
        !isHill &&
        !isForest &&
        !isTallGrass &&
        groundNoise < 0.43;

      waterMask[tileY][tileX] = isWater;
      mountainMask[tileY][tileX] = isMountain;
      hillMask[tileY][tileX] = isHill;
      forestMask[tileY][tileX] = isForest;
      tallGrassMask[tileY][tileX] = isTallGrass;
      dirtMask[tileY][tileX] = isDirt;
      const sourceFrames = isWater
        ? waterFrames
        : isDirt
          ? dirtFrames
          : grassFrames;
      const storedFrame = getProceduralVariant(
        sourceFrames,
        seed,
        tileX,
        tileY,
        211
      );
      base[tileY][tileX] = storedFrame;
      usedFrames.add(decodeStoredIsometricFrame(storedFrame));
    }
  }

  const riverFrames = buildProceduralRiverFrames(
    seed,
    width,
    height,
    reserved,
    waterMask
  );
  riverFrames.forEach((_frame, key) => {
    const [tileX, tileY] = key.split(":").map(Number);
    waterMask[tileY][tileX] = false;
    dirtMask[tileY][tileX] = false;
    mountainMask[tileY][tileX] = false;
    hillMask[tileY][tileX] = false;
    forestMask[tileY][tileX] = false;
    tallGrassMask[tileY][tileX] = false;
    const grass = getProceduralVariant(grassFrames, seed, tileX, tileY, 617);
    base[tileY][tileX] = grass;
    usedFrames.add(decodeStoredIsometricFrame(grass));
  });

  // Paint coherent terrain regions first so feature groups can test the final
  // terrain footprint before choosing a placement.
  for (let tileY = 1; tileY < height - 1; tileY += 1) {
    for (let tileX = 1; tileX < width - 1; tileX += 1) {
      const key = `${tileX}:${tileY}`;
      if (riverFrames.has(key)) {
        const riverFrame = riverFrames.get(key);
        detail[tileY][tileX] = ISO_STORED_FRAME_OFFSET + riverFrame;
        usedFrames.add(riverFrame);
        continue;
      }

      if (isProceduralMaskSet(waterMask, tileX, tileY)) {
        const direction = getProceduralRegionDirection(waterMask, tileX, tileY);
        const shoreFrame = LAKE_TRANSITION_FRAMES[direction];
        if (Number.isInteger(shoreFrame)) {
          detail[tileY][tileX] = ISO_STORED_FRAME_OFFSET + shoreFrame;
          usedFrames.add(shoreFrame);
        }
        continue;
      }

      if (isProceduralMaskSet(mountainMask, tileX, tileY)) {
        const direction = getProceduralRegionDirection(mountainMask, tileX, tileY);
        const mountainFrame = MOUNTAIN_SLOPE_FRAMES[direction];
        const storedFrame = Number.isInteger(mountainFrame)
          ? ISO_STORED_FRAME_OFFSET + mountainFrame
          : getProceduralVariant(
              mountainTopFrames,
              seed,
              tileX,
              tileY,
              653
            );
        detail[tileY][tileX] = storedFrame;
        usedFrames.add(decodeStoredIsometricFrame(storedFrame));
        continue;
      }

      if (isProceduralMaskSet(hillMask, tileX, tileY)) {
        const direction = getProceduralRegionDirection(hillMask, tileX, tileY);
        const hillFrame = HILL_SLOPE_FRAMES[direction] ?? 34;
        detail[tileY][tileX] = ISO_STORED_FRAME_OFFSET + hillFrame;
        usedFrames.add(hillFrame);
        continue;
      }

      if (isProceduralMaskSet(dirtMask, tileX, tileY)) {
        const bordersGrass = ISO_SCREEN_COMPASS.some((direction) =>
          !isProceduralMaskSet(
            dirtMask,
            tileX + direction.tileDx,
            tileY + direction.tileDy
          )
        );
        if (!bordersGrass) continue;
        const transition = getProceduralVariant(
          grassDirtTransitionFrames,
          seed,
          tileX,
          tileY,
          401
        );
        detail[tileY][tileX] = transition;
        usedFrames.add(decodeStoredIsometricFrame(transition));
        continue;
      }

      if (isProceduralMaskSet(tallGrassMask, tileX, tileY)) {
        const direction = getProceduralRegionDirection(
          tallGrassMask,
          tileX,
          tileY
        );
        const grassFrame = TALL_GRASS_EDGE_FRAMES[direction] ?? 114;
        detail[tileY][tileX] = ISO_STORED_FRAME_OFFSET + grassFrame;
        usedFrames.add(grassFrame);
      }
    }
  }

  // Populate forest regions and leave the remaining biome intentionally open.
  for (let tileY = 2; tileY < height - 2; tileY += 1) {
    for (let tileX = 2; tileX < width - 2; tileX += 1) {
      const key = `${tileX}:${tileY}`;
      if (reserved.has(key) || occupied.has(key)) continue;
      if (detail[tileY][tileX] !== TILE_EMPTY) continue;
      if (isProceduralMaskSet(waterMask, tileX, tileY)) continue;

      if (isProceduralMaskSet(forestMask, tileX, tileY)) {
        if (getProceduralHash(seed, tileX, tileY, 701) >= 0.32) continue;
        const treeGroup = getProceduralListVariant(
          treeGroups,
          seed,
          tileX,
          tileY,
          719
        );
        if (
          treeGroup &&
          tryStampProceduralTileGroup({
            group: treeGroup,
            anchorTileX: tileX,
            anchorTileY: tileY,
            layout: { base, detail, overhead },
            width,
            height,
            reserved,
            occupied,
            waterFrames,
            usedFrames
          })
        ) {
          continue;
        }

        if (!treeGroups.length) {
          const tree = getProceduralVariant(
            standaloneTreeFrames,
            seed,
            tileX,
            tileY,
            727
          );
          detail[tileY][tileX] = tree;
          usedFrames.add(decodeStoredIsometricFrame(tree));
          reserveProceduralFootprint(
            occupied,
            [{ tileX, tileY }],
            width,
            height,
            1
          );
        }
        continue;
      }

      const isOpenGround =
        !isProceduralMaskSet(mountainMask, tileX, tileY) &&
        !isProceduralMaskSet(hillMask, tileX, tileY) &&
        !isProceduralMaskSet(tallGrassMask, tileX, tileY);
      if (
        isOpenGround &&
        getProceduralHash(seed, tileX, tileY, 809) < 0.007
      ) {
        const rockGroup = getProceduralListVariant(
          rockGroups,
          seed,
          tileX,
          tileY,
          811
        );
        if (
          rockGroup &&
          tryStampProceduralTileGroup({
            group: rockGroup,
            anchorTileX: tileX,
            anchorTileY: tileY,
            layout: { base, detail, overhead },
            width,
            height,
            reserved,
            occupied,
            waterFrames,
            usedFrames
          })
        ) {
          continue;
        }

        const rock = getProceduralVariant(rockFrames, seed, tileX, tileY, 821);
        detail[tileY][tileX] = rock;
        usedFrames.add(decodeStoredIsometricFrame(rock));
        reserveProceduralFootprint(
          occupied,
          [{ tileX, tileY }],
          width,
          height,
          0
        );
      }
    }
  }

  return {
    layout: {
      base,
      detail,
      overhead,
      objects: expandLayerToSize(
        roomObjectLayerMap,
        width,
        height,
        OBJECT_EMPTY
      )
    },
    usedFrames
  };
}

function getActiveTilesetManifest() {
  return sceneRef?.cache?.json?.get?.(ISO_OUTSIDE_MANIFEST_KEY) || null;
}

function getManifestFrameIndexByKey(frameKey) {
  const frame = getActiveTilesetManifest()?.frames?.find?.(
    (entry) => entry.key === frameKey
  );
  return Number.isInteger(frame?.frame) ? frame.frame : null;
}

function getManifestGroupById(groupId) {
  const directMatch = tileGroups.find((group) => group.id === groupId);
  if (directMatch) return directMatch;

  const manifestGroup = getActiveTilesetManifest()?.groups?.find?.(
    (group) => group.id === groupId
  );
  if (!Number.isInteger(manifestGroup?.anchorFrame)) return null;
  return getTileGroupForFrame(manifestGroup.anchorFrame);
}

function buildProceduralBiomeMap(seed, width, height, biomeDefinitions) {
  const anchorTemplates = [
    { x: 0.23, y: 0.25 },
    { x: 0.76, y: 0.23 },
    { x: 0.25, y: 0.77 },
    { x: 0.74, y: 0.75 }
  ];
  const rotation = Math.floor(getProceduralHash(seed, 0, 0, 1201) * 4);
  const anchors = biomeDefinitions.map((biome, index) => {
    const template = anchorTemplates[(index + rotation) % anchorTemplates.length];
    const jitterX = (getProceduralHash(seed, index, 0, 1213) - 0.5) * 0.12;
    const jitterY = (getProceduralHash(seed, 0, index, 1229) - 0.5) * 0.12;
    return {
      id: biome.id,
      x: (template.x + jitterX) * width,
      y: (template.y + jitterY) * height
    };
  });

  return Array.from({ length: height }, (_, tileY) =>
    Array.from({ length: width }, (_, tileX) => {
      let selected = anchors[0];
      let selectedScore = Infinity;
      anchors.forEach((anchor, index) => {
        const dx = (tileX - anchor.x) / Math.max(1, width);
        const dy = (tileY - anchor.y) / Math.max(1, height);
        const edgeVariation =
          (getProceduralValueNoise(seed, tileX, tileY, 13, 1301 + index * 31) - 0.5) *
          0.11;
        const score = Math.hypot(dx, dy) + edgeVariation;
        if (score < selectedScore) {
          selected = anchor;
          selectedScore = score;
        }
      });
      return selected.id;
    })
  );
}

function getClosestScreenDirection(vectorX, vectorY) {
  if (Math.abs(vectorX) < 0.001 && Math.abs(vectorY) < 0.001) return "N";
  let best = ISO_SCREEN_COMPASS[0];
  let bestDot = -Infinity;
  ISO_SCREEN_COMPASS.forEach((direction) => {
    const length = Math.hypot(direction.screenDx, direction.screenDy) || 1;
    const dot =
      (vectorX * direction.screenDx + vectorY * direction.screenDy) / length;
    if (dot > bestDot) {
      best = direction;
      bestDot = dot;
    }
  });
  return best.key;
}

const ISO_SCREEN_OPPOSITE = {
  N: "S",
  NE: "SW",
  E: "W",
  SE: "NW",
  S: "N",
  SW: "NE",
  W: "E",
  NW: "SE"
};

function getBiomeTransitionFrame(biomeMap, waterMask, tileX, tileY) {
  const currentBiome = biomeMap?.[tileY]?.[tileX];
  if (!currentBiome || isProceduralMaskSet(waterMask, tileX, tileY)) return null;

  const neighborsByBiome = new Map();
  ISO_SCREEN_COMPASS.forEach((direction) => {
    const neighborX = tileX + direction.tileDx;
    const neighborY = tileY + direction.tileDy;
    if (isProceduralMaskSet(waterMask, neighborX, neighborY)) return;
    const neighborBiome = biomeMap?.[neighborY]?.[neighborX];
    if (!neighborBiome || neighborBiome === currentBiome) return;
    const record = neighborsByBiome.get(neighborBiome) || {
      count: 0,
      vectorX: 0,
      vectorY: 0
    };
    record.count += 1;
    record.vectorX += direction.screenDx;
    record.vectorY += direction.screenDy;
    neighborsByBiome.set(neighborBiome, record);
  });
  if (!neighborsByBiome.size) return null;

  const [targetBiome, target] = [...neighborsByBiome.entries()].sort(
    (left, right) => right[1].count - left[1].count
  )[0];
  const transition = getActiveTilesetManifest()?.biomeTransitions?.find?.(
    (entry) =>
      entry.biomes?.includes?.(currentBiome) &&
      entry.biomes?.includes?.(targetBiome)
  );
  if (!transition) return null;

  const directionTowardTarget = getClosestScreenDirection(
    target.vectorX,
    target.vectorY
  );
  const secondBiomeDirection = transition.biomes[1] === targetBiome
    ? directionTowardTarget
    : ISO_SCREEN_OPPOSITE[directionTowardTarget];
  const frame = transition.frames?.[secondBiomeDirection];
  return Number.isInteger(frame) ? frame : null;
}

function buildAlienProceduralRoomLayout(seed, width, height, requestedBiomeId = "all") {
  const manifest = getActiveTilesetManifest();
  const allBiomeDefinitions = manifest?.biomes || [];
  const requestedBiome = allBiomeDefinitions.find(
    (biome) => biome.id === requestedBiomeId
  );
  const biomeDefinitions = requestedBiome ? [requestedBiome] : allBiomeDefinitions;
  if (!biomeDefinitions.length) {
    console.warn("Alien biome definitions are unavailable; using the legacy generator.");
    return buildProceduralRoomLayout(seed, width, height);
  }

  const base = createEmptyRoomTileMap(width, height, TILE_EMPTY);
  const detail = createEmptyRoomTileMap(width, height, TILE_EMPTY);
  const overhead = createEmptyRoomTileMap(width, height, TILE_EMPTY);
  const waterMask = createProceduralMask(width, height);
  const forestMask = createProceduralMask(width, height);
  const biomeMap = buildProceduralBiomeMap(seed, width, height, biomeDefinitions);
  const biomeById = Object.fromEntries(
    biomeDefinitions.map((biome) => [biome.id, biome])
  );
  const biomeIndexById = Object.fromEntries(
    biomeDefinitions.map((biome, index) => [biome.id, index])
  );
  const reserved = getProceduralReservedTiles(width, height);
  const occupied = new Set();
  const usedFrames = new Set();
  const waterFrames = (manifest.frames || [])
    .filter((frame) => frame.category === "water")
    .map((frame) => frame.frame);
  const animationStart = Object.fromEntries(
    (manifest.animations || []).map((animation) => [
      animation.id,
      animation.frames?.[0]
    ])
  );
  const waterOpenFrame = animationStart.water_open_loop ?? waterFrames[0];
  const waterStraightFrame = animationStart.water_shore_straight_loop ?? waterOpenFrame;
  const waterCornerFrame = animationStart.water_shore_corner_loop ?? waterStraightFrame;
  const waterIslandFrame = animationStart.water_mineral_island_loop ?? waterOpenFrame;
  const directionalWaterFrames = {
    NE: animationStart.master_v3_water_edge_ne_loop,
    NW: animationStart.master_v3_water_edge_nw_loop,
    SW: animationStart.master_v3_water_edge_sw_loop,
    SE: animationStart.master_v3_water_edge_se_loop
  };

  const getDirectionalWaterFrame = (tileX, tileY) => {
    let direction = getProceduralRegionDirection(waterMask, tileX, tileY);
    if (direction === "N") {
      direction = getProceduralHash(seed, tileX, tileY, 1591) < 0.5 ? "NE" : "NW";
    } else if (direction === "E") {
      direction = getProceduralHash(seed, tileX, tileY, 1593) < 0.5 ? "NE" : "SE";
    } else if (direction === "S") {
      direction = getProceduralHash(seed, tileX, tileY, 1597) < 0.5 ? "SE" : "SW";
    } else if (direction === "W") {
      direction = getProceduralHash(seed, tileX, tileY, 1599) < 0.5 ? "NW" : "SW";
    }
    return directionalWaterFrames[direction] ?? null;
  };

  for (let tileY = 0; tileY < height; tileY += 1) {
    for (let tileX = 0; tileX < width; tileX += 1) {
      const key = `${tileX}:${tileY}`;
      const edgeDistance = Math.min(
        tileX,
        tileY,
        width - 1 - tileX,
        height - 1 - tileY
      );
      const lakeNoise = getProceduralFractalNoise(seed, tileX, tileY, 1409);
      const lakeRegionNoise = getProceduralValueNoise(seed, tileX, tileY, 20, 1423);
      const isWater =
        !reserved.has(key) &&
        (lakeNoise < 0.31 || (edgeDistance < 2 && lakeRegionNoise < 0.4));
      waterMask[tileY][tileX] = isWater;

      const biomeId = biomeMap[tileY][tileX];
      const biomeIndex = biomeIndexById[biomeId] || 0;
      const forestNoise = getProceduralValueNoise(
        seed,
        tileX,
        tileY,
        14,
        1501 + biomeIndex * 47
      );
      const forestThreshold = [0.5, 0.47, 0.39, 0.36][biomeIndex] ?? 0.42;
      forestMask[tileY][tileX] =
        !isWater && !reserved.has(key) && forestNoise < forestThreshold;
    }
  }

  for (let tileY = 0; tileY < height; tileY += 1) {
    for (let tileX = 0; tileX < width; tileX += 1) {
      let frame;
      if (isProceduralMaskSet(waterMask, tileX, tileY)) {
        const landNeighbors = ISO_SCREEN_COMPASS.filter((direction) =>
          !isProceduralMaskSet(
            waterMask,
            tileX + direction.tileDx,
            tileY + direction.tileDy
          )
        ).length;
        const islandRoll = getProceduralHash(seed, tileX, tileY, 1601);
        const directionalEdgeFrame = landNeighbors > 0
          ? getDirectionalWaterFrame(tileX, tileY)
          : null;
        frame = Number.isInteger(directionalEdgeFrame)
          ? directionalEdgeFrame
          : landNeighbors >= 3
            ? waterCornerFrame
            : landNeighbors > 0
              ? waterStraightFrame
              : islandRoll < 0.018
                ? waterIslandFrame
                : waterOpenFrame;
      } else {
        frame = getBiomeTransitionFrame(
          biomeMap,
          waterMask,
          tileX,
          tileY
        );
        if (!Number.isInteger(frame)) {
          const biome = biomeById[biomeMap[tileY][tileX]];
          const stored = getProceduralVariant(
            biome?.baseFrames || [0],
            seed,
            tileX,
            tileY,
            1613
          );
          base[tileY][tileX] = stored;
          usedFrames.add(decodeStoredIsometricFrame(stored));
          continue;
        }
      }
      base[tileY][tileX] = encodeTileFrameForStorage(frame);
      usedFrames.add(frame);
    }
  }

  const canPlaceBiomeGroup = (biomeId) => (tileX, tileY) =>
    biomeMap?.[tileY]?.[tileX] === biomeId &&
    !isProceduralMaskSet(waterMask, tileX, tileY);

  for (let tileY = 3; tileY < height - 2; tileY += 1) {
    for (let tileX = 3; tileX < width - 2; tileX += 1) {
      const key = `${tileX}:${tileY}`;
      if (reserved.has(key) || occupied.has(key)) continue;
      const biome = biomeById[biomeMap[tileY][tileX]];
      if (!biome || isProceduralMaskSet(waterMask, tileX, tileY)) continue;

      const mountainNoise = getProceduralFractalNoise(seed, tileX, tileY, 1709);
      if (
        mountainNoise > 0.68 &&
        getProceduralHash(seed, tileX, tileY, 1721) < 0.03
      ) {
        const group = getManifestGroupById(biome.mountainGroup);
        if (group && tryStampProceduralTileGroup({
          group,
          anchorTileX: tileX,
          anchorTileY: tileY,
          layout: { base, detail, overhead },
          width,
          height,
          reserved,
          occupied,
          waterFrames,
          usedFrames,
          canPlaceAt: canPlaceBiomeGroup(biome.id)
        })) continue;
      }

      const hillNoise = getProceduralFractalNoise(seed, tileX, tileY, 1801);
      if (
        hillNoise > 0.61 &&
        getProceduralHash(seed, tileX, tileY, 1811) < 0.025
      ) {
        const group = getManifestGroupById(biome.hillGroup);
        if (group && tryStampProceduralTileGroup({
          group,
          anchorTileX: tileX,
          anchorTileY: tileY,
          layout: { base, detail, overhead },
          width,
          height,
          reserved,
          occupied,
          waterFrames,
          usedFrames,
          canPlaceAt: canPlaceBiomeGroup(biome.id)
        })) continue;
      }

      if (
        isProceduralMaskSet(forestMask, tileX, tileY) &&
        getProceduralHash(seed, tileX, tileY, 1901) < 0.018
      ) {
        const giantPlantGroupIds = biome.giantPlantGroups?.length
          ? biome.giantPlantGroups
          : [biome.giantPlantGroup].filter(Boolean);
        const groupId = getProceduralListVariant(
          giantPlantGroupIds,
          seed,
          tileX,
          tileY,
          1913
        );
        const group = getManifestGroupById(groupId);
        if (group) {
          tryStampProceduralTileGroup({
            group,
            anchorTileX: tileX,
            anchorTileY: tileY,
            layout: { base, detail, overhead },
            width,
            height,
            reserved,
            occupied,
            waterFrames,
            usedFrames,
            canPlaceAt: canPlaceBiomeGroup(biome.id)
          });
        }
      }
    }
  }

  for (let tileY = 1; tileY < height - 1; tileY += 1) {
    for (let tileX = 1; tileX < width - 1; tileX += 1) {
      if (!isProceduralMaskSet(forestMask, tileX, tileY)) continue;
      if (detail[tileY][tileX] !== TILE_EMPTY || occupied.has(`${tileX}:${tileY}`)) continue;
      const clusterNoise = getProceduralValueNoise(
        seed,
        tileX,
        tileY,
        4.5,
        1941 + (biomeIndexById[biomeMap[tileY][tileX]] || 0) * 17
      );
      const floraChance = clusterNoise < 0.58 ? 0.72 : 0.24;
      if (getProceduralHash(seed, tileX, tileY, 1949) >= floraChance) continue;
      const biome = biomeById[biomeMap[tileY][tileX]];
      const floraSet = manifest.floraSets?.find?.(
        (entry) => entry.id === biome?.floraSet
      );
      const storedFrame = getProceduralVariant(
        floraSet?.frames || [],
        seed,
        tileX,
        tileY,
        1973
      );
      if (storedFrame === TILE_EMPTY) continue;
      detail[tileY][tileX] = storedFrame;
      usedFrames.add(decodeStoredIsometricFrame(storedFrame));
    }
  }

  const preferredHabitatGroupIds = manifest.proceduralHabitatGroups || [];
  const habitatGroups = (
    preferredHabitatGroupIds.length
      ? preferredHabitatGroupIds
      : (manifest.groups || [])
          .filter((group) => group.type === "vertical_building")
          .map((group) => group.id)
  )
    .map((groupId) => getManifestGroupById(groupId))
    .filter(Boolean);
  const hardwareFrames = (manifest.frames || [])
    .filter((frame) => frame.category === "cargo" || frame.category === "hardware")
    .map((frame) => frame.frame);
  let habitatsPlaced = 0;
  for (let tileY = 5; tileY < height - 4 && habitatsPlaced < 2; tileY += 1) {
    for (let tileX = 5; tileX < width - 4 && habitatsPlaced < 2; tileX += 1) {
      if (getProceduralHash(seed, tileX, tileY, 2003) >= 0.0008) continue;
      if (
        reserved.has(`${tileX}:${tileY}`) ||
        occupied.has(`${tileX}:${tileY}`) ||
        isProceduralMaskSet(waterMask, tileX, tileY) ||
        isProceduralMaskSet(forestMask, tileX, tileY)
      ) continue;
      const group = getProceduralListVariant(
        habitatGroups,
        seed,
        tileX,
        tileY,
        2017
      );
      if (!group || !tryStampProceduralTileGroup({
        group,
        anchorTileX: tileX,
        anchorTileY: tileY,
        layout: { base, detail, overhead },
        width,
        height,
        reserved,
        occupied,
        waterFrames,
        usedFrames,
        canPlaceAt: (x, y) => !isProceduralMaskSet(waterMask, x, y)
      })) continue;

      habitatsPlaced += 1;
      [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }].forEach(
        (offset, index) => {
          const hardwareX = tileX + offset.dx;
          const hardwareY = tileY + offset.dy;
          if (detail?.[hardwareY]?.[hardwareX] !== TILE_EMPTY) return;
          const stored = getProceduralVariant(
            hardwareFrames,
            seed,
            hardwareX,
            hardwareY,
            2039 + index
          );
          if (stored === TILE_EMPTY) return;
          detail[hardwareY][hardwareX] = stored;
          usedFrames.add(decodeStoredIsometricFrame(stored));
        }
      );
    }
  }

  const objects = expandLayerToSize(
    roomObjectLayerMap,
    width,
    height,
    OBJECT_EMPTY
  );
  const hiddenSlotValues = new Set(Object.values(RESOURCE_SLOT_OBJECT_FRAMES));
  for (let tileY = 0; tileY < height; tileY += 1) {
    for (let tileX = 0; tileX < width; tileX += 1) {
      const existing = objects[tileY][tileX];
      if (hiddenSlotValues.has(existing) || isResourceObjectFrame(existing)) {
        objects[tileY][tileX] = OBJECT_EMPTY;
      }
    }
  }

  const slotCandidates = { plant: [], rock: [], pond: [], communication: [] };
  for (let tileY = 1; tileY < height - 1; tileY += 1) {
    for (let tileX = 1; tileX < width - 1; tileX += 1) {
      const key = `${tileX}:${tileY}`;
      if (reserved.has(key) || objects[tileY][tileX] !== OBJECT_EMPTY) continue;
      if (!occupied.has(key) && !isProceduralMaskSet(waterMask, tileX, tileY)) {
        slotCandidates.communication.push({ tileX, tileY });
      }
      if (isProceduralMaskSet(waterMask, tileX, tileY)) {
        slotCandidates.pond.push({ tileX, tileY });
      } else if (
        isProceduralMaskSet(forestMask, tileX, tileY) &&
        !occupied.has(key)
      ) {
        slotCandidates.plant.push({ tileX, tileY });
      } else if (
        !occupied.has(key) &&
        detail[tileY][tileX] === TILE_EMPTY
      ) {
        slotCandidates.rock.push({ tileX, tileY });
      }
    }
  }

  const slotLimits = { plant: 80, rock: 56, pond: 56, communication: 16 };
  Object.entries(slotCandidates).forEach(([kind, candidates], kindIndex) => {
    candidates
      .sort((left, right) =>
        getProceduralHash(seed, left.tileX, left.tileY, 2201 + kindIndex * 101) -
        getProceduralHash(seed, right.tileX, right.tileY, 2201 + kindIndex * 101)
      )
      .slice(0, slotLimits[kind])
      .forEach(({ tileX, tileY }) => {
        if (objects[tileY][tileX] !== OBJECT_EMPTY) return;
        objects[tileY][tileX] = RESOURCE_SLOT_OBJECT_FRAMES[kind];
      });
  });

  return {
    layout: {
      base,
      detail,
      overhead,
      objects
    },
    usedFrames
  };
}

function getNextProceduralMapSeed() {
  if (!Number.isInteger(proceduralMapSeed)) {
    return ((Date.now() >>> 0) ^ 0x45d9f3b) >>> 0;
  }
  return (
    Math.imul(proceduralMapSeed ^ 0xa5a5a5a5, 1664525) +
    1013904223
  ) >>> 0;
}

function generateProceduralMap() {
  if (!isAdminUser() || !sceneRef) return;

  proceduralMapSeed = getNextProceduralMapSeed();
  const width = getCurrentRoomTileWidth() || DEFAULT_ROOM_TILE_WIDTH;
  const height = getCurrentRoomTileHeight() || DEFAULT_ROOM_TILE_HEIGHT;
  const generated = buildAlienProceduralRoomLayout(
    proceduralMapSeed,
    width,
    height,
    proceduralBiomeId
  );

  roomBaseLayerMap = generated.layout.base;
  roomDetailLayerMap = generated.layout.detail;
  roomOverheadLayerMap = generated.layout.overhead;
  roomObjectLayerMap = generated.layout.objects;
  applyProceduralCollisionSuggestions(generated.usedFrames);

  renderAllTileLayers(sceneRef);
  refreshRoomFrameGraphics(sceneRef);
  refreshTransitionDebugGraphics(sceneRef);
  refreshPlayerDebugGraphics(sceneRef);
  refreshCameraBounds(sceneRef);
  syncWorld3DPlayers();
  syncWorld3DEntities();
  updateProceduralMapControls();

  const message =
    `Generated ${proceduralBiomeId === "all" ? "all biomes" : `${proceduralBiomeId} biome`} map with seed ${proceduralMapSeed}. ` +
    "Existing objects were preserved; press K to save after reviewing it.";
  showStatusMessage(message);
  appendSystemChatLine(`Admin Editor: ${message}`, "#7CFC00");
}

function updateProceduralMapControls() {
  if (proceduralBiomeSelect && proceduralBiomeSelect.value !== proceduralBiomeId) {
    proceduralBiomeSelect.value = proceduralBiomeId;
  }
  if (proceduralMapButton) {
    proceduralMapButton.textContent = Number.isInteger(proceduralMapSeed)
      ? "Generate New Seed"
      : "Generate Procedural Map";
  }
  if (proceduralMapSeedLabel) {
    proceduralMapSeedLabel.textContent = Number.isInteger(proceduralMapSeed)
      ? `Seed ${proceduralMapSeed}`
      : "Seed will be created on click";
  }
}

function createStarterRoomBaseLayerMap() {
  const grassFrame = encodeTileFrameForStorage(
    getManifestFrameIndexByKey("base_cyan_01") ?? 0
  );
  const dirtFrame = encodeTileFrameForStorage(
    getManifestFrameIndexByKey("base_coral_01") ?? 8
  );
  const waterFrame = encodeTileFrameForStorage(
    getManifestFrameIndexByKey("water_open_1") ?? 80
  );
  const map = createEmptyRoomTileMap(
    DEFAULT_ROOM_TILE_WIDTH,
    DEFAULT_ROOM_TILE_HEIGHT,
    grassFrame
  );

  paintBorder(map, waterFrame);
  paintRect(map, 13, 7, 19, 8, dirtFrame);
  paintRect(map, 5, 23, 4, 5, dirtFrame);
  paintRect(map, 16, 23, 5, 5, dirtFrame);

  return map;
}

function createStarterRoomDetailLayerMap() {
  const map = createEmptyRoomTileMap(DEFAULT_ROOM_TILE_WIDTH, DEFAULT_ROOM_TILE_HEIGHT, TILE_EMPTY);

  paintRect(
    map,
    28,
    23,
    4,
    5,
    encodeTileFrameForStorage(
      getManifestFrameIndexByKey("coral_mountain_base") ?? 50
    )
  );

  return map;
}

function createStarterRoomOverheadLayerMap() {
  const map = createEmptyRoomTileMap(
    DEFAULT_ROOM_TILE_WIDTH,
    DEFAULT_ROOM_TILE_HEIGHT,
    TILE_EMPTY
  );
  paintRect(
    map,
    30,
    21,
    2,
    2,
    encodeTileFrameForStorage(
      getManifestFrameIndexByKey("coral_giant_plant_crown") ?? 57
    )
  );
  return map;
}

function createStarterRoomObjectLayerMap() {
  return createEmptyRoomTileMap(DEFAULT_ROOM_TILE_WIDTH, DEFAULT_ROOM_TILE_HEIGHT, OBJECT_EMPTY);
}

const DEFAULT_ROOM_LAYOUT = {
  base: createStarterRoomBaseLayerMap(),
  detail: createStarterRoomDetailLayerMap(),
  overhead: createStarterRoomOverheadLayerMap(),
  objects: createStarterRoomObjectLayerMap()
};

function clearRenderedTileLayer(imageList) {
  imageList.forEach((image) => image.destroy());
  imageList.length = 0;
}

function renderTileLayer(scene, tileMap, imageList, depth) {
  clearRenderedTileLayer(imageList);

  for (let row = 0; row < tileMap.length; row++) {
    for (let col = 0; col < tileMap[row].length; col++) {
      const frameIndex = tileMap[row][col];
      if (frameIndex === TILE_EMPTY) continue;

      const source = getTileRenderSource(scene, frameIndex);
      if (!source) continue;

      const displayPosition = tileToDisplayPosition(col, row);

      const image = scene.add.image(
        displayPosition.x,
        displayPosition.y,
        source.textureKey,
        source.frame
      );
      image.setOrigin(isIsometricMode() ? 0.5 : 0, isIsometricMode() ? 1 : 0);
      image.setDepth(
        isIsometricMode()
          ? depth + (row + col) * 0.01
          : depth
      );
      image.setData("baseFrameIndex", frameIndex);

      imageList.push(image);
    }
  }
}

/*
OBJECT LAYER RENDERER
---------------------
Purpose:
Renders placed object-layer anchors while the object editor is open.

Includes:
- portal markers
- resource anchors
- mob anchor markers
- hidden spawn marker
*/

function renderObjectLayer(scene) {
  clearRenderedTileLayer(roomObjectImages);

  if (!scene || !scene.textures.exists(OBJECT_SHEET_KEY)) return;
  if (!objectEditorEnabled) return;

  for (let row = 0; row < roomObjectLayerMap.length; row++) {
    for (let col = 0; col < roomObjectLayerMap[row].length; col++) {
      const frameIndex = roomObjectLayerMap[row][col];
      if (!Number.isInteger(frameIndex) || frameIndex < 0) continue;
      if (isSpawnMarkerFrame(frameIndex)) continue;

      const displayPosition = tileToDisplayPosition(col, row);
      const worldX = isIsometricMode()
        ? displayPosition.x
        : tileToWorldX(col) + TILE_SIZE / 2;
      const worldY = isIsometricMode()
        ? displayPosition.y
        : tileToWorldY(row) + TILE_SIZE;

      const image = scene.add.image(worldX, worldY, OBJECT_SHEET_KEY, frameIndex);
      image.setOrigin(0.5, 1);
      image.setDepth(isIsometricMode() ? 12 + (row + col) * 0.01 : 30);

      const objectSummary = getObjectTypeSummary(frameIndex);
      image.setData("objectCategory", objectSummary?.category || "unknown");
      image.setData("objectKind", objectSummary?.kind || null);
      image.setData("objectTier", objectSummary?.tier || 0);

      roomObjectImages.push(image);
    }
  }
}

function refreshWorld3DPortals() {
  if (!worldPortalLayer) return;

  const portals = [];
  for (let row = 0; row < roomObjectLayerMap.length; row++) {
    for (let col = 0; col < roomObjectLayerMap[row].length; col++) {
      const frameIndex = roomObjectLayerMap[row][col];
      if (!isPortalFrame(frameIndex)) continue;
      const portalKey = PORTAL_FRAME_KEYS[frameIndex];
      const portalLink = getPortalsForCurrentMap().find((entry) => entry.portalKey === portalKey);

      const displayPosition = tileToDisplayPosition(col, row);
      portals.push({
        frameIndex,
        portalKey,
        locked: !portalLink,
        tileX: col,
        tileY: row,
        worldX: isIsometricMode()
          ? displayPosition.x
          : tileToWorldX(col) + TILE_SIZE / 2,
        worldY: isIsometricMode()
          ? displayPosition.y
          : tileToWorldY(row) + TILE_SIZE,
        scale: 13
      });
    }
  }

  worldPortalLayer.setPortals(portals).catch((error) => {
    console.error("Failed to refresh 3D portals:", error);
  });
}

function renderAllTileLayers(scene) {
  renderTileLayer(scene, roomBaseLayerMap, roomBaseTileImages, 0);
  renderTileLayer(scene, roomDetailLayerMap, roomDetailTileImages, 2);
  renderTileLayer(scene, roomOverheadLayerMap, roomOverheadTileImages, 20);
  renderObjectLayer(scene);
  refreshWorld3DPortals();

  refreshRenderedAnimatedTiles();
}

function rebuildRoomTileMap(scene) {
  if (
    roomBaseLayerMap.length > 0 &&
    roomDetailLayerMap.length > 0 &&
    roomOverheadLayerMap.length > 0 &&
    roomObjectLayerMap.length > 0
  ) {
    renderAllTileLayers(scene);
    return;
  }

  roomBaseLayerMap = createStarterRoomBaseLayerMap();
  roomDetailLayerMap = createStarterRoomDetailLayerMap();
  roomOverheadLayerMap = createStarterRoomOverheadLayerMap();
  roomObjectLayerMap = createStarterRoomObjectLayerMap();

  renderAllTileLayers(scene);
}

function getTileLayerMap(layerName) {
  if (layerName === "base") return roomBaseLayerMap;
  if (layerName === "detail") return roomDetailLayerMap;
  if (layerName === "overhead") return roomOverheadLayerMap;
  return roomBaseLayerMap;
}

function getSelectedLayerMap() {
  return getTileLayerMap(selectedTileLayer);
}

function getFrameAt(tileX, tileY) {
  const layerMap = getSelectedLayerMap();

  if (!layerMap[tileY] || layerMap[tileY][tileX] === undefined) return null;
  return layerMap[tileY][tileX];
}

function getObjectFrameAt(tileX, tileY) {
  if (!roomObjectLayerMap[tileY] || roomObjectLayerMap[tileY][tileX] === undefined) {
    return null;
  }

  return roomObjectLayerMap[tileY][tileX];
}

function findSpawnMarkerTile() {
  for (let row = 0; row < roomObjectLayerMap.length; row++) {
    for (let col = 0; col < roomObjectLayerMap[row].length; col++) {
      if (roomObjectLayerMap[row][col] === PORTAL_SPAWN_FRAME) {
        return { tileX: col, tileY: row };
      }
    }
  }

  return null;
}

function paintSingleObjectTile(scene, tileX, tileY, frameIndex) {
  if (!roomObjectLayerMap[tileY] || roomObjectLayerMap[tileY][tileX] === undefined) return;

  roomObjectLayerMap[tileY][tileX] = frameIndex;
  syncEditorTileToRoom("objects", tileX, tileY, frameIndex);
  renderObjectLayer(scene);
  refreshWorld3DPortals();
}

/*
MULTI-LAYER TILE GROUPS
-----------------------
Purpose:
Select reusable tile prefabs directly from the palette, assign each selected
piece to Base, Detail, or Overhead, then place the complete prefab with one map
click.
*/

const TILE_GROUP_STORAGE_KEY = "e3_tile_groups_v2";
const DELETED_BUILT_IN_TILE_GROUP_STORAGE_KEY =
  "e3_deleted_builtin_tile_groups_v2";

function validateTileGroup(group) {
  return (
    group &&
    typeof group.id === "string" &&
    typeof group.name === "string" &&
    Array.isArray(group.entries) &&
    group.entries.length > 0 &&
    group.entries.every((entry) =>
      ["base", "detail", "overhead"].includes(entry?.layer) &&
      Number.isInteger(entry?.dx) &&
      Number.isInteger(entry?.dy) &&
      Number.isInteger(entry?.frame) &&
      entry.frame >= 0
    )
  );
}

function loadTileGroups() {
  let repairedPaletteFrames = false;
  try {
    const deletedBuiltInIds = JSON.parse(
      localStorage.getItem(DELETED_BUILT_IN_TILE_GROUP_STORAGE_KEY) || "[]"
    );
    deletedBuiltInTileGroupIds = new Set(
      Array.isArray(deletedBuiltInIds)
        ? deletedBuiltInIds.filter((id) => typeof id === "string")
        : []
    );
    const parsed = JSON.parse(localStorage.getItem(TILE_GROUP_STORAGE_KEY) || "[]");
    const userGroups = Array.isArray(parsed)
      ? parsed.filter(validateTileGroup)
      : [];
    const manifest = sceneRef?.cache?.json?.get?.(ISO_OUTSIDE_MANIFEST_KEY);
    const builtInGroups = (manifest?.groups || [])
      .map((group) => ({ ...group, builtIn: true }))
      .filter(
        (group) =>
          validateTileGroup(group) &&
          !deletedBuiltInTileGroupIds.has(group.id)
      );
    const builtInIds = new Set(builtInGroups.map((group) => group.id));
    tileGroups = [
      ...builtInGroups,
      ...userGroups.filter((group) => !builtInIds.has(group.id))
    ];

    const columns = getTilesheetColumns();
    tileGroups = tileGroups.map((group) => {
      if (
        group.offsetSpace === "map" ||
        !Number.isInteger(group.anchorFrame)
      ) return group;

      const entries = group.entries.map((entry) => {
        const expectedFrame =
          group.anchorFrame + entry.dy * columns + entry.dx;
        if (!isValidTilesheetFrame(expectedFrame)) return entry;
        if (expectedFrame !== entry.frame) repairedPaletteFrames = true;
        return {
          ...entry,
          frame: expectedFrame
        };
      });
      return {
        ...group,
        entries
      };
    });
  } catch (error) {
    console.warn("Failed to load tile groups:", error);
    tileGroups = [];
  }

  if (repairedPaletteFrames) {
    saveTileGroups();
  }

  if (!tileGroups.some((group) => group.id === selectedTileGroupId)) {
    selectedTileGroupId = tileGroups[0]?.id || null;
  }
  refreshTileGroupControls();
  if (tileGroupNameInput) {
    tileGroupNameInput.value = getSelectedTileGroup()?.name || "";
  }
}

function saveTileGroups() {
  try {
    localStorage.setItem(
      TILE_GROUP_STORAGE_KEY,
      JSON.stringify(tileGroups.filter((group) => !group.builtIn))
    );
    localStorage.setItem(
      DELETED_BUILT_IN_TILE_GROUP_STORAGE_KEY,
      JSON.stringify([...deletedBuiltInTileGroupIds])
    );
  } catch (error) {
    console.warn("Failed to save tile groups:", error);
  }
}

function getSelectedTileGroup() {
  return tileGroups.find((group) => group.id === selectedTileGroupId) || null;
}

function getTileGroupForFrame(frameIndex) {
  for (let index = tileGroups.length - 1; index >= 0; index -= 1) {
    const group = tileGroups[index];
    if (group.projection && group.projection !== tileProjectionMode) continue;
    if (group.entries.some((entry) => entry.frame === frameIndex)) return group;
  }
  return null;
}

function getTileGroupPlacements(group, anchorFrame = group?.anchorFrame) {
  if (!group?.entries?.length) return [];

  const anchorEntry =
    group.entries.find((entry) => entry.frame === anchorFrame) ||
    group.entries.find((entry) => entry.frame === group.anchorFrame) ||
    group.entries[0];
  const usesIsometricOffsets =
    (group.projection || tileProjectionMode) === "isometric";
  const usesDirectMapOffsets = group.offsetSpace === "map";

  return group.entries.map((entry) => {
    const paletteDx = entry.dx - anchorEntry.dx;
    const paletteDy = entry.dy - anchorEntry.dy;
    return {
      ...entry,
      mapDx: usesDirectMapOffsets
        ? paletteDx
        : usesIsometricOffsets
        ? paletteDx + paletteDy * 2
        : paletteDx,
      mapDy: usesDirectMapOffsets
        ? paletteDy
        : usesIsometricOffsets
        ? -paletteDx + paletteDy * 2
        : paletteDy
    };
  });
}

function selectTileFrameForPainting(frameIndex) {
  if (!isValidTilesheetFrame(frameIndex)) return;

  selectedTileFrame = frameIndex;
  const matchingGroup = getTileGroupForFrame(frameIndex);
  tileGroupPlacementEnabled = !!matchingGroup;
  lastPlacedTileGroupAnchorKey = "";

  if (matchingGroup) {
    selectedTileGroupId = matchingGroup.id;
    if (tileGroupNameInput) tileGroupNameInput.value = matchingGroup.name;
  }

  refreshTileGroupControls();
  updateTileEditorText();
}

function refreshTileGroupControls() {
  if (tileGroupSelect) {
    const currentId = selectedTileGroupId;
    tileGroupSelect.innerHTML = "";

    if (!tileGroups.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No saved groups";
      tileGroupSelect.appendChild(option);
    } else {
      tileGroups.forEach((group) => {
        const option = document.createElement("option");
        option.value = group.id;
        option.textContent = `${group.name} (${group.entries.length})`;
        tileGroupSelect.appendChild(option);
      });
    }

    tileGroupSelect.value = tileGroups.some((group) => group.id === currentId)
      ? currentId
      : (tileGroups[0]?.id || "");
    selectedTileGroupId = tileGroupSelect.value || null;
  }

  if (tileGroupRecordButton) {
    tileGroupRecordButton.textContent = tileGroupRecording
      ? `Finish Group (${tileGroupDraft.length})`
      : "Start Group";
  }

  if (tileGroupSelect) {
    tileGroupSelect.disabled = tileGroupRecording;
    tileGroupSelect.style.opacity = tileGroupRecording ? "0.55" : "1";
  }

  if (tileGroupCancelButton) {
    tileGroupCancelButton.style.display = tileGroupRecording ? "inline-block" : "none";
  }

  if (tileGroupDeleteButton) {
    const selectedGroup = getSelectedTileGroup();
    tileGroupDeleteButton.disabled =
      tileGroupRecording || !selectedGroup;
    tileGroupDeleteButton.style.opacity =
      tileGroupDeleteButton.disabled ? "0.5" : "1";
  }

  refreshTileGroupOverlay();
}

function startTileGroupRecording() {
  if (!tileEditorEnabled) return;

  tileGroupRecording = true;
  tileGroupDraft = [];
  tileGroupAnchor = null;
  tileGroupPlacementEnabled = false;
  lastPlacedTileGroupAnchorKey = "";

  if (tileGroupNameInput && !tileGroupNameInput.value.trim()) {
    tileGroupNameInput.value = `Tile Group ${tileGroups.length + 1}`;
  }

  refreshTileGroupControls();
  updateTileEditorText();
  appendSystemChatLine(
    "Tile Group: Click the first palette tile. F7 layer designations are used automatically; otherwise the current 1/2/3 tile layer is used. Shift+left-click adds tiles and Shift+right-click removes one. A normal left-click, changing tools, or closing the editor saves the group.",
    "#9ad0ff"
  );
}

function cancelTileGroupRecording() {
  if (!tileGroupRecording) return;

  tileGroupRecording = false;
  tileGroupDraft = [];
  tileGroupAnchor = null;
  refreshTileGroupControls();
  updateTileEditorText();
  appendSystemChatLine("Tile Group: Selection cancelled.", "#9ad0ff");
}

function finishTileGroupRecording() {
  if (!tileGroupRecording) return false;

  if (!tileGroupDraft.length) {
    tileGroupRecording = false;
    tileGroupAnchor = null;
    refreshTileGroupControls();
    updateTileEditorText();
    appendSystemChatLine(
      "Tile Group: No palette tiles were selected, so nothing was saved.",
      "#ffcc88"
    );
    return false;
  }

  const name =
    tileGroupNameInput?.value?.trim() ||
    `Tile Group ${tileGroups.length + 1}`;
  const group = {
    id: `tile_group_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    name,
    projection: tileProjectionMode,
    anchorFrame: tileGroupAnchor?.frame ?? tileGroupDraft[0].frame,
    entries: tileGroupDraft
      .map((entry) => ({ ...entry }))
      .sort((left, right) =>
        left.dy - right.dy ||
        left.dx - right.dx ||
        ["base", "detail", "overhead"].indexOf(left.layer) -
          ["base", "detail", "overhead"].indexOf(right.layer)
      )
  };

  tileGroups.push(group);
  selectedTileGroupId = group.id;
  tileGroupRecording = false;
  tileGroupDraft = [];
  tileGroupAnchor = null;
  tileGroupPlacementEnabled = group.entries.some(
    (entry) => entry.frame === selectedTileFrame
  );
  saveTileGroups();
  refreshTileGroupControls();
  updateTileEditorText();
  if (tileGroupNameInput) tileGroupNameInput.value = group.name;
  appendSystemChatLine(
    `Tile Group: Saved "${group.name}" with ${group.entries.length} tiles. Selecting any of its tiles now places the complete group automatically.`,
    "#7CFC00"
  );
  return true;
}

function addPaletteFrameToTileGroup(frameIndex, col, row) {
  if (!tileGroupRecording || !isValidTilesheetFrame(frameIndex)) return;
  if (!tileGroupAnchor) {
    tileGroupAnchor = { frame: frameIndex, col, row };
  }

  const dx = col - tileGroupAnchor.col;
  const dy = row - tileGroupAnchor.row;
  const matchingIndex = tileGroupDraft.findIndex(
    (entry) => entry.frame === frameIndex
  );
  const entry = {
    layer: getFrameDefaultLayer(frameIndex) || selectedTileLayer,
    dx,
    dy,
    frame: frameIndex
  };

  if (matchingIndex >= 0) tileGroupDraft[matchingIndex] = entry;
  else tileGroupDraft.push(entry);

  refreshTileGroupControls();
  updateTileEditorText();
}

function removePaletteFrameFromTileGroup(frameIndex) {
  if (!tileGroupRecording) return;
  const matchingIndex = tileGroupDraft.findIndex(
    (entry) => entry.frame === frameIndex
  );
  if (matchingIndex < 0) return;

  tileGroupDraft.splice(matchingIndex, 1);
  refreshTileGroupControls();
  updateTileEditorText();
}

function refreshTileGroupOverlay() {
  if (!tileGroupOverlayLayer) return;
  tileGroupOverlayLayer.innerHTML = "";

  if (!tileEditorEnabled) {
    tileGroupOverlayLayer.style.display = "none";
    return;
  }

  const groupEntries = tileGroupRecording
    ? tileGroupDraft
    : tileGroupPlacementEnabled
      ? (getSelectedTileGroup()?.entries || [])
      : [];
  if (!groupEntries.length) {
    tileGroupOverlayLayer.style.display = "none";
    return;
  }

  tileGroupOverlayLayer.style.display = "block";
  const frameWidth = getActiveTilesetFrameWidth();
  const frameHeight = getActiveTilesetFrameHeight();
  const columns = getTilesheetColumns();
  const layerStyle = {
    base: { color: "#ffe071", background: "rgba(255, 224, 113, 0.2)", label: "1" },
    detail: { color: "#66f2df", background: "rgba(102, 242, 223, 0.2)", label: "2" },
    overhead: { color: "#f58cff", background: "rgba(245, 140, 255, 0.2)", label: "3" }
  };

  groupEntries.forEach((entry) => {
    if (!isValidTilesheetFrame(entry.frame)) return;
    const style = layerStyle[entry.layer] || layerStyle.base;
    const marker = document.createElement("div");
    const textureFrame = getTextureFrameForLogicalFrame(entry.frame);
    const col = textureFrame % columns;
    const row = Math.floor(textureFrame / columns);
    marker.style.position = "absolute";
    marker.style.left = `${col * frameWidth}px`;
    marker.style.top = `${row * frameHeight}px`;
    marker.style.width = `${frameWidth}px`;
    marker.style.height = `${frameHeight}px`;
    marker.style.boxSizing = "border-box";
    marker.style.border = `3px solid ${style.color}`;
    marker.style.background = style.background;
    marker.style.boxShadow = `inset 0 0 0 1px rgba(5, 12, 20, 0.8)`;
    marker.style.pointerEvents = "none";

    const label = document.createElement("span");
    label.textContent = style.label;
    label.title = `${getLayerName(entry.layer)} layer`;
    label.style.position = "absolute";
    label.style.left = "2px";
    label.style.top = "2px";
    label.style.minWidth = "14px";
    label.style.height = "14px";
    label.style.lineHeight = "14px";
    label.style.textAlign = "center";
    label.style.borderRadius = "3px";
    label.style.background = style.color;
    label.style.color = "#071019";
    label.style.font = "bold 10px sans-serif";
    marker.appendChild(label);
    tileGroupOverlayLayer.appendChild(marker);
  });
}

function applyTileGroupAt(scene, anchorTileX, anchorTileY) {
  const group = getSelectedTileGroup();
  if (!scene || !group) return;

  if (group.projection && group.projection !== tileProjectionMode) return;

  const placements = getTileGroupPlacements(group, selectedTileFrame);

  isApplyingTileGroup = true;
  try {
    placements.forEach((entry) => {
      const tileX = anchorTileX + entry.mapDx;
      const tileY = anchorTileY + entry.mapDy;
      const layerMap = getTileLayerMap(entry.layer);
      if (!layerMap?.[tileY] || layerMap[tileY][tileX] === undefined) return;
      const storedFrame = encodeTileFrameForStorage(entry.frame);
      layerMap[tileY][tileX] = storedFrame;
      syncEditorTileToRoom(entry.layer, tileX, tileY, storedFrame);
    });
  } finally {
    isApplyingTileGroup = false;
  }

  renderAllTileLayers(scene);
}

function deleteSelectedTileGroup() {
  const group = getSelectedTileGroup();
  if (!group) return;
  if (group.builtIn) {
    deletedBuiltInTileGroupIds.add(group.id);
  }
  tileGroups = tileGroups.filter((entry) => entry.id !== group.id);
  selectedTileGroupId = tileGroups[0]?.id || null;
  tileGroupPlacementEnabled = false;
  saveTileGroups();
  refreshTileGroupControls();
  if (tileGroupNameInput) {
    tileGroupNameInput.value = getSelectedTileGroup()?.name || "";
  }
  appendSystemChatLine(`Tile Group: Deleted "${group.name}".`, "#ffcc88");
  selectTileFrameForPainting(selectedTileFrame);
}

/*
PLACED TILE METADATA LOOKUP
---------------------------
Purpose:
Reads metadata for a room tile by checking the visible painted frame at that location.

Priority:
- detail
- base

The overhead layer is visual-only. It must not override the collision or
interaction metadata painted on the detail/base layers beneath it.
*/

function getTopFrameAt(tileX, tileY) {
  const detailFrame = roomDetailLayerMap?.[tileY]?.[tileX];
  if (Number.isInteger(detailFrame) && detailFrame !== TILE_EMPTY) {
    return detailFrame;
  }

  const baseFrame = roomBaseLayerMap?.[tileY]?.[tileX];
  if (Number.isInteger(baseFrame) && baseFrame !== TILE_EMPTY) {
    return baseFrame;
  }

  return TILE_EMPTY;
}

function getPlacedTileMetadata(tileX, tileY) {
  const detailFrame = roomDetailLayerMap?.[tileY]?.[tileX];
  if (Number.isInteger(detailFrame) && detailFrame !== TILE_EMPTY) {
    const detailMetadata = getFrameMetadata(
      resolveDisplayFrameIndex(sceneRef, detailFrame)
    );
    if (detailMetadata?.actionCenter) return detailMetadata;
  }

  const baseFrame = roomBaseLayerMap?.[tileY]?.[tileX];
  if (Number.isInteger(baseFrame) && baseFrame !== TILE_EMPTY) {
    const baseMetadata = getFrameMetadata(
      resolveDisplayFrameIndex(sceneRef, baseFrame)
    );
    if (baseMetadata?.actionCenter) return baseMetadata;
  }

  return createDefaultFrameMetadata();
}

/*
TILESET ANIMATION GROUP HELPERS
-------------------------------
Purpose:
Build animation groups from the manifest and tilesheet metadata.

Rules:
- explicit manifest animations stay separate, even when adjacent in the atlas
- only frames with animate metadata are considered
- remaining metadata-only groups are built left-to-right within the same row
- a contiguous run becomes one looping animation group
*/

function rebuildAnimatedTilesetFrameGroups() {
  animatedTilesetFrameGroups = [];
  animatedTilesetFrameLookup = {};

  const rows = getTilesheetRows();
  const cols = getTilesheetColumns();
  const claimedFrames = new Set();

  const registerAnimationGroup = (candidateFrames) => {
    const groupFrames = candidateFrames.filter(
      (frameIndex) =>
        Number.isInteger(frameIndex) &&
        isValidTilesheetFrame(frameIndex) &&
        !claimedFrames.has(frameIndex)
    );

    if (groupFrames.length === 0) return;

    animatedTilesetFrameGroups.push(groupFrames);
    groupFrames.forEach((groupFrameIndex) => {
      claimedFrames.add(groupFrameIndex);
      animatedTilesetFrameLookup[groupFrameIndex] = groupFrames;
    });
  };

  (getActiveTilesetManifest()?.animations || []).forEach((animation) => {
    registerAnimationGroup(Array.isArray(animation?.frames) ? animation.frames : []);
  });

  for (let row = 0; row < rows; row++) {
    let col = 0;

    while (col < cols) {
      const frameIndex = getLogicalFrameForTextureFrame(row * cols + col);
      const meta = getFrameMetadata(frameIndex);

      if (frameIndex === null || claimedFrames.has(frameIndex) || !meta?.animate) {
        col += 1;
        continue;
      }

      const groupFrames = [];

      while (col < cols) {
        const nextFrameIndex = getLogicalFrameForTextureFrame(row * cols + col);
        if (nextFrameIndex === null) break;
        const nextMeta = getFrameMetadata(nextFrameIndex);

        if (claimedFrames.has(nextFrameIndex) || !nextMeta?.animate) {
          break;
        }

        groupFrames.push(nextFrameIndex);
        col += 1;
      }

      registerAnimationGroup(groupFrames);
    }
  }
}

function getAnimateGroupForFrame(frameIndex) {
  return animatedTilesetFrameLookup[frameIndex] || null;
}

function getAllRenderedTileImages() {
  return [
    ...roomBaseTileImages,
    ...roomDetailTileImages,
    ...roomOverheadTileImages
  ];
}

function refreshRenderedAnimatedTiles() {
  animatedRoomTiles = [];

  const textureKey = getActiveTilesetTextureKey();
  if (!sceneRef?.textures?.exists(textureKey)) return;

  const currentStep =
    Math.floor(sceneRef.time.now / ANIMATED_TILE_FRAME_MS);

  getAllRenderedTileImages().forEach((image) => {
    const storedFrameIndex = image.getData("baseFrameIndex");
    const baseFrameIndex = resolveDisplayFrameIndex(sceneRef, storedFrameIndex);

    if (!Number.isInteger(baseFrameIndex) || !isValidTilesheetFrame(baseFrameIndex)) {
      return;
    }

    const groupFrames = getAnimateGroupForFrame(baseFrameIndex);

    if (groupFrames && groupFrames.length > 1) {
      animatedRoomTiles.push({
        image,
        frames: groupFrames
      });

      const currentFrame = groupFrames[currentStep % groupFrames.length];
      image.setTexture(textureKey, getTextureFrameForLogicalFrame(currentFrame));
      return;
    }

    image.setTexture(textureKey, getTextureFrameForLogicalFrame(baseFrameIndex));
  });
}

function updateAnimatedRoomTiles(scene) {
  if (!scene || !animatedRoomTiles.length) return;

  const currentStep =
    Math.floor(scene.time.now / ANIMATED_TILE_FRAME_MS);

  animatedRoomTiles.forEach((entry) => {
    if (!entry?.image?.active || !Array.isArray(entry.frames) || !entry.frames.length) {
      return;
    }

    const currentFrame = entry.frames[currentStep % entry.frames.length];
    entry.image.setTexture(
      getActiveTilesetTextureKey(),
      getTextureFrameForLogicalFrame(currentFrame)
    );
  });
}

function refreshTilesetAnimationData() {
  rebuildAnimatedTilesetFrameGroups();
  refreshRenderedAnimatedTiles();
}

/*
ACTION CENTER HELPERS
---------------------
Purpose:
Finds nearby painted action centers from tilesheet metadata and resolves
the nearest usable interaction target for the player.

Includes:
- tile distance checks
- nearest action center lookup
- action label formatting
*/

function getActionDisplayName(actionName) {
  if (actionName === "craft") return "Craft";
  if (actionName === "dig") return "Dig";
  if (actionName === "mine") return "Mine";
  if (actionName === "fish") return "Fish";
  if (actionName === "comm") return "Comm";
  return actionName || "Action";
}

function isSpawnOnlyActionCenter(actionName) {
  return actionName === "dig" ||
    actionName === "mine" ||
    actionName === "fish" ||
    actionName === "comm";
}

function getNearestActionCenterForWorldPosition(worldX, worldY) {
  const originTile = logicalWorldToTilePosition(worldX, worldY);
  if (!originTile) return null;

  let best = null;

  const roomHeight = getCurrentRoomTileHeight();
  const roomWidth = getCurrentRoomTileWidth();

  for (let row = 0; row < roomHeight; row++) {
    for (let col = 0; col < roomWidth; col++) {
      const meta = getPlacedTileMetadata(col, row);
      if (!meta?.actionCenter) continue;
      if (isSpawnOnlyActionCenter(meta.actionCenter)) continue;

      const dxTiles = col - originTile.tileX;
      const dyTiles = row - originTile.tileY;
      const tileDistance = Math.sqrt(dxTiles * dxTiles + dyTiles * dyTiles);

      if (tileDistance > ACTION_CENTER_RADIUS_TILES) continue;

      const centerWorldX = tileToWorldX(col) + TILE_SIZE / 2;
      const centerWorldY = tileToWorldY(row) + TILE_SIZE / 2;

      const dxWorld = centerWorldX - worldX;
      const dyWorld = centerWorldY - worldY;
      const worldDistance = Math.sqrt(dxWorld * dxWorld + dyWorld * dyWorld);

      if (!best || worldDistance < best.worldDistance) {
        best = {
          action: meta.actionCenter,
          tileX: col,
          tileY: row,
          worldX: centerWorldX,
          worldY: centerWorldY,
          tileDistance,
          worldDistance
        };
      }
    }
  }

  return best;
}

/*
UI INPUT HELPER
---------------
Purpose:
Prevent gameplay and dev tools from firing while typing in DOM inputs.
*/

function isTypingInUi() {
  const activeElement = document.activeElement;

  return !!(
    activeElement &&
    (
      activeElement.id === "chat-input" ||
      activeElement.id === "email-input" ||
      activeElement.id === "password-input" ||
      activeElement.id === "player-name-input" ||
      activeElement.id === "classCode" ||
      activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      activeElement.tagName === "SELECT"
    )
  );
}

/*
HOTBAR INPUT HANDLER
--------------------
Purpose:
Allows number keys 1 through 9 to select hotbar slots while not typing in UI.
*/

function handleHotbarKeyInput() {
  if (isTypingInUi()) return;
  if (tileEditorEnabled || metadataEditorEnabled || objectEditorEnabled) return;

  for (let i = 0; i < hotbarKeys.length; i++) {
    if (Phaser.Input.Keyboard.JustDown(hotbarKeys[i])) {
      const assignedKey = hotbarAssignments[i] || "";
      if (assignedKey.startsWith("ability:")) {
        const abilityKey = assignedKey.slice("ability:".length);
        sendRoomMessage("use_special_ability", { abilityKey });
      }

      selectedHotbarIndex = i;
      refreshHotbarSelectionState();
      break;
    }
  }
}

/*
MAP KEY HELPER
--------------
Purpose:
Sets the client's target map key so future joins or transitions can request
a specific map.
*/

function setCurrentMapKey(mapKey) {
  currentMapKey = mapKey || DEFAULT_MAP_KEY;
  activatingPortalKey = null;
  activatingPortalUntil = 0;

  if (sceneRef) {
    refreshTransitionDebugGraphics(sceneRef);
  }
}

/*
MAP REJOIN HELPER
-----------------
Purpose:
Reconnects the current signed-in player into the selected map key using the
existing join flow.

Notes:
- admin-only for now
- used to test named maps before door transitions are added
*/

async function rejoinCurrentMap(fallbackMapKey = DEFAULT_MAP_KEY, matchmakingClassCode = null) {
  if (!authUser) return false;

  const chosenName =
    sessionStorage.getItem("playerName") ||
    authUser?.email?.split("@")?.[0] ||
    "Player";

  // The server still resolves trusted membership. This value only ensures
  // every member of that class reaches the same matchmaking bucket.
  const classCode = matchmakingClassCode ?? activeMatchClassCode ?? sessionStorage.getItem("classCode") ?? "";
  const previousRoom = room;
  const previousClient = client;
  const previousMyId = myId;
  const targetMapKey = currentMapKey || DEFAULT_MAP_KEY;

  const success = await joinGame(
    chosenName,
    classCode,
    targetMapKey
  );

  if (success) {
    if (previousRoom && previousRoom !== room) {
      try {
        await previousRoom.leave(true);
      } catch (error) {
        console.warn("Destination joined, but source room cleanup failed:", error);
      }
    }
    appendSystemChatLine(
      `System: Switched to map "${currentMapKey || DEFAULT_MAP_KEY}".`,
      "#7CFC00"
    );
    return true;
  } else {
    setCurrentMapKey(fallbackMapKey || DEFAULT_MAP_KEY);

    if (canSendRoomMessage(previousRoom)) {
      room = previousRoom;
      client = previousClient;
      myId = previousMyId;
      joined = true;
    } else {
      room = null;
      client = null;
      myId = null;
      joined = false;

      const recovered = await joinGame(
        chosenName,
        classCode,
        fallbackMapKey || DEFAULT_MAP_KEY
      );

      if (recovered) {
        appendSystemChatLine(
          `System: Destination failed, but the connection to "${fallbackMapKey || DEFAULT_MAP_KEY}" was restored.`,
          "#ffcc88"
        );
      } else {
        appendSystemChatLine(
          "System: The room connection closed during the transition. Please use Join Game to reconnect.",
          "#ff6666"
        );
      }
    }

    appendSystemChatLine(
      `System: Failed to switch to map "${targetMapKey}".`,
      "#ff6666"
    );
    return false;
  }
}

/*
TEST MAP TOGGLE HELPER
----------------------
Purpose:
Switches between the default map and a test room map for admin testing.
*/

async function toggleTestMap() {
  if (!isAdminUser()) return;
  if (isMapTransitionInProgress) return;

  const previousMapKey = currentMapKey || DEFAULT_MAP_KEY;
  const nextMapKey =
    previousMapKey === DEFAULT_MAP_KEY
      ? "room_test_01"
      : DEFAULT_MAP_KEY;

  await runMapTransitionFade(async () => {
    setCurrentMapKey(nextMapKey);
    await rejoinCurrentMap(previousMapKey);
  });
}

/*
MAP TRANSITION FADE HELPER
--------------------------
Purpose:
Wraps a map switch in a short camera fade so moving between maps feels smooth.

Includes:
- fade out
- async map switch
- fade back in
- transition lock
*/

function runMapTransitionFade(asyncWork) {
  return new Promise((resolve) => {
    if (!sceneRef?.cameras?.main) {
      Promise.resolve(asyncWork?.()).finally(resolve);
      return;
    }

    const camera = sceneRef.cameras.main;
    isMapTransitionInProgress = true;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(safetyTimer);
      camera.resetFX?.();
      isMapTransitionInProgress = false;
      resolve();
    };
    const safetyTimer = window.setTimeout(() => {
      console.error("Map transition timed out; restoring the camera.");
      finish();
    }, 15000);

    camera.fadeOut(250, 0, 0, 0);

    camera.once("camerafadeoutcomplete", async () => {
      try {
        await Promise.resolve(asyncWork?.());
      } catch (error) {
        console.error("Map transition work failed:", error);
      }

      camera.fadeIn(250, 0, 0, 0);

      camera.once("camerafadeincomplete", () => {
        finish();
      });
    });
  });
}

/*
CHAT STATUS HELPERS
-------------------
Purpose:
Show account and admin-only editor status inside the chat panel instead of on
the Phaser canvas.
*/

function appendSystemChatLine(message, color = "#9ad0ff") {
  if (!chatLog || !message) return;

  const line = document.createElement("div");
  line.textContent = message;
  line.style.marginBottom = "4px";
  line.style.color = color;

  chatLog.appendChild(line);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function showMetadataEditorInstructions() {
  [
    "Admin modes: T Tile Editor | Y Metadata | U Objects | K Save.",
    "Tile mode layers: 1 Base | 2 Detail | 3 Overhead.",
    "Metadata tools: F6 Collision | F7 Layer designation | F8 Animate | F9 Resource/action.",
    "F7 Layer tool: 1 Base | 2 Detail | 3 Overhead | 0 Clear layer.",
    "F9 Resource/action tool: 1 Craft | 2 Dig | 3 Mine | 4 Fish | 5 Communicate | 0 Clear action.",
    "Palette controls: Left drag applies the selected metadata | Right drag erases it.",
    "Metadata rules: Detail overrides Base; Overhead is visual-only. Press Y to return to Tile mode."
  ].forEach((message) => appendSystemChatLine(message, "#9ad0ff"));
}

let lastEditorStatusMessage = "";

let lastSignedInMessage = "";

function updateChatStatusUI() {
  const isAdmin = isAdminUser();

  if (!authUser?.email) return;

  const signedInMessage = `System: Signed in as ${authUser.email}`;
  if (lastSignedInMessage !== signedInMessage) {
    appendSystemChatLine(signedInMessage, "#d7e6ff");
    lastSignedInMessage = signedInMessage;
  }

  if (!joined || !isAdmin) return;

  let message = "";

  if (metadataEditorEnabled) {
    const meta = getFrameMetadata(selectedTileFrame);
    const defaultLayer = getFrameDefaultLayer(selectedTileFrame);
    message =
      `Admin Editor: Metadata ON | Frame ${getFrameName(selectedTileFrame)} | Mode: ${getMetadataPaintModeLabel()} | layer=${defaultLayer ? getLayerName(defaultLayer) : "none"} | collision=${meta.collision ? "ON" : "OFF"} | center=${meta.actionCenter || "none"} | animate=${meta.animate ? "ON" : "OFF"}`;
  } else if (tileEditorEnabled) {
    const groupStatus = tileGroupRecording
      ? ` | Selecting group (${tileGroupDraft.length} tiles; Shift+click adds; layer ${getLayerName(selectedTileLayer)})`
      : tileGroupPlacementEnabled && getSelectedTileGroup()
        ? ` | Group brush: ${getSelectedTileGroup().name}`
        : "";
    message =
      `Admin Editor: Tile Edit ON | Layer: ${getLayerName(selectedTileLayer)} (1 Base / 2 Detail / 3 Overhead) | Selected: ${getFrameName(selectedTileFrame)}${groupStatus} | Press T to close | Press U for objects`;
  } else if (objectEditorEnabled) {
    const selectedObjectLabel =
      selectedObjectFrame === PORTAL_SPAWN_FRAME
        ? "Spawn Marker"
        : (PORTAL_FRAME_KEYS[selectedObjectFrame] || `Frame ${selectedObjectFrame}`);

    message =
      `Admin Editor: Object Edit ON | Selected: ${selectedObjectLabel} | Left drag place | Right drag erase | Middle click pick`;
  } else {
    return;
  }

  if (lastEditorStatusMessage !== message) {
    appendSystemChatLine(message, "#9ad0ff");
    lastEditorStatusMessage = message;
  }
}

/*
STATUS MESSAGE HELPER
---------------------
Purpose:
Show a short temporary status message in the existing result text area.
*/

function showStatusMessage(message, success = true) {
  if (!interactionResultText || !sceneRef) return;

  interactionResultText.setColor(success ? "#7CFC00" : "#ff6666");
  interactionResultText.setText(message);

  sceneRef.time.delayedCall(3000, () => {
    if (interactionResultText?.text === message) {
      interactionResultText.setText("");
    }
  });
}

/*
DEV TILE EDITOR HELPERS
-----------------------
Purpose:
Support click-and-drag frame painting during development.

Includes:
- layer selection labels
- pointer-to-tile conversion
- single tile painting
- shift pattern painting
- paint / erase drag handling
- eyedropper selection
- layered map export helpers
- room layout save helper
- dev UI updates
*/

function getLayerName(layerName) {
  if (layerName === "base") return "Base";
  if (layerName === "detail") return "Detail";
  if (layerName === "overhead") return "Overhead";
  return layerName;
}

/*
METADATA LAYER HELPERS
----------------------
Purpose:
Provides readable names and map lookup for metadata editing.

Includes:
- metadata layer label helper
- selected metadata map lookup
- metadata tile value helpers
*/

function getMetadataLayerName(layerName) {
  if (layerName === "collision") return "Collision";
  if (layerName === "actionArea") return "Action Area";
  if (layerName === "actionCenter") return "Action Center";
  if (layerName === "animate") return "Animate";
  return layerName;
}

function updateTileEditorText() {
  updateChatStatusUI();
  refreshTilePaletteSelection();
  refreshTilePaletteMetadataOverlay();
  refreshTileGroupOverlay();
}

function worldToTilePosition(worldX, worldY) {
  let tileX;
  let tileY;

  if (isIsometricMode()) {
    const originX = getIsometricOriginX();
    const relativeX = worldX - originX;
    const relativeY = worldY - ROOM_OFFSET_Y;
    const fractionalX =
      relativeY / ISO_TILE_HEIGHT + relativeX / ISO_TILE_WIDTH + 0.5;
    const fractionalY =
      relativeY / ISO_TILE_HEIGHT - relativeX / ISO_TILE_WIDTH + 0.5;
    tileX = Math.floor(fractionalX);
    tileY = Math.floor(fractionalY);
  } else {
    tileX = Math.floor((worldX - ROOM_OFFSET_X) / TILE_SIZE);
    tileY = Math.floor((worldY - ROOM_OFFSET_Y) / TILE_SIZE);
  }

  const roomWidth = getCurrentRoomTileWidth();
  const roomHeight = getCurrentRoomTileHeight();

  const inBounds =
    tileX >= 0 &&
    tileY >= 0 &&
    tileX < roomWidth &&
    tileY < roomHeight;

  if (!inBounds) return null;

  return { tileX, tileY };
}

function logicalWorldToTilePosition(worldX, worldY) {
  const tileX = Math.floor((worldX - ROOM_OFFSET_X) / TILE_SIZE);
  const tileY = Math.floor((worldY - ROOM_OFFSET_Y) / TILE_SIZE);
  const inBounds =
    tileX >= 0 &&
    tileY >= 0 &&
    tileX < getCurrentRoomTileWidth() &&
    tileY < getCurrentRoomTileHeight();

  return inBounds ? { tileX, tileY } : null;
}

function paintSingleTile(scene, tileX, tileY, frameIndex) {
  const layerMap = getSelectedLayerMap();

  if (!layerMap[tileY] || layerMap[tileY][tileX] === undefined) return;

  const storedFrame = encodeTileFrameForStorage(frameIndex);
  layerMap[tileY][tileX] = storedFrame;
  syncEditorTileToRoom(selectedTileLayer, tileX, tileY, storedFrame);
  renderAllTileLayers(scene);
}

/*
METADATA PAINT HELPERS
----------------------
Purpose:
Supports click-and-drag painting for metadata layers.

Includes:
- single metadata tile painting
- pointer-to-metadata painting
- defensive bounds checking
*/

function paintTileFromPointer(pointer, frameIndex) {
  if (!tileEditorEnabled || !sceneRef) return;
  if (isTypingInUi()) return;

  const tilePos = worldToTilePosition(pointer.worldX, pointer.worldY);
  if (!tilePos) return;

  if (tileGroupPlacementEnabled && frameIndex !== TILE_EMPTY) {
    const anchorKey = `${tilePos.tileX}:${tilePos.tileY}`;
    if (anchorKey === lastPlacedTileGroupAnchorKey) return;
    lastPlacedTileGroupAnchorKey = anchorKey;
    applyTileGroupAt(sceneRef, tilePos.tileX, tilePos.tileY);
    return;
  }

  paintSingleTile(sceneRef, tilePos.tileX, tilePos.tileY, frameIndex);
}

function paintObjectFromPointer(pointer, frameIndex) {
  if (!objectEditorEnabled || !sceneRef) return;
  if (!isAdminUser()) return;
  if (isTypingInUi()) return;

  const tilePos = worldToTilePosition(pointer.worldX, pointer.worldY);
  if (!tilePos) return;

  paintSingleObjectTile(sceneRef, tilePos.tileX, tilePos.tileY, frameIndex);
}

function pickObjectFromPointer(pointer) {
  if (!objectEditorEnabled) return;
  if (!isAdminUser()) return;
  if (isTypingInUi()) return;

  const tilePos = worldToTilePosition(pointer.worldX, pointer.worldY);
  if (!tilePos) return;

  const frameIndex = getObjectFrameAt(tilePos.tileX, tilePos.tileY);
  if (frameIndex === null || frameIndex === OBJECT_EMPTY) return;

  selectedObjectFrame = frameIndex;
  refreshObjectPaletteSelection();
  updateChatStatusUI();

  const summary = getObjectTypeSummary(frameIndex);
  appendSystemChatLine(
    `System: Picked object frame ${frameIndex} | ${summary?.category || "unknown"}${summary?.kind ? ` | ${summary.kind}` : ""}${summary?.tier ? ` | tier ${summary.tier}` : ""}.`,
    "#9ad0ff"
  );
}

function getFrameFromPatternOffset(startFrame, offsetX, offsetY) {
  if (!isValidTilesheetFrame(startFrame)) return null;

  const columns = getTilesheetColumns();
  const rows = getTilesheetRows();

  const startCol = startFrame % columns;
  const startRow = Math.floor(startFrame / columns);

  const targetCol = startCol + offsetX;
  const targetRow = startRow + offsetY;

  const inBounds =
    targetCol >= 0 &&
    targetRow >= 0 &&
    targetCol < columns &&
    targetRow < rows;

  if (!inBounds) return null;

  return targetRow * columns + targetCol;
}

function paintPatternTileFromPointer(pointer) {
  if (!tileEditorEnabled || !sceneRef) return;
  if (isTypingInUi()) return;
  if (!patternPaintStartTile) return;

  const tilePos = worldToTilePosition(pointer.worldX, pointer.worldY);
  if (!tilePos) return;

  const offsetX = tilePos.tileX - patternPaintStartTile.tileX;
  const offsetY = tilePos.tileY - patternPaintStartTile.tileY;

  const frameIndex = getFrameFromPatternOffset(
    patternPaintStartFrame,
    offsetX,
    offsetY
  );

  if (frameIndex === null) return;

  paintSingleTile(sceneRef, tilePos.tileX, tilePos.tileY, frameIndex);
}

function pickTileFromPointer(pointer) {
  if (!tileEditorEnabled) return;
  if (isTypingInUi()) return;

  const tilePos = worldToTilePosition(pointer.worldX, pointer.worldY);
  if (!tilePos) return;

  const frameIndex = getFrameAt(tilePos.tileX, tilePos.tileY);
  if (frameIndex === null || frameIndex === TILE_EMPTY) return;

  let pickedFrame;
  if (isIsometricMode()) {
    const legacyMap = sceneRef?.cache?.json?.get?.(ISO_LEGACY_FRAME_MAP_KEY);
    pickedFrame = isStoredIsometricFrame(frameIndex)
      ? decodeStoredIsometricFrame(frameIndex)
      : Number(legacyMap?.frames?.[String(frameIndex)] ?? 0);
  } else {
    pickedFrame = isStoredIsometricFrame(frameIndex)
      ? decodeStoredIsometricFrame(frameIndex)
      : frameIndex;
  }
  selectTileFrameForPainting(pickedFrame);
}

function handleTilePointerDown(pointer) {
  if (!isAdminUser()) return;

  if (objectEditorEnabled) {
    if (isPointerOverPalette(pointer)) return;

    if (pointer.middleButtonDown()) {
      pickObjectFromPointer(pointer);
      return;
    }

    if (pointer.rightButtonDown()) {
      isObjectEraseDragging = true;
      isObjectPaintDragging = false;
      paintObjectFromPointer(pointer, OBJECT_EMPTY);
      return;
    }

    if (pointer.leftButtonDown()) {
      if (!isValidObjectFrame(selectedObjectFrame)) return;

      isObjectPaintDragging = true;
      isObjectEraseDragging = false;
      paintObjectFromPointer(pointer, selectedObjectFrame);
    }

    return;
  }

  if (!tileEditorEnabled) return;
  if (isPointerOverPalette(pointer)) return;

  if (pointer.middleButtonDown()) {
    pickTileFromPointer(pointer);
    return;
  }

  if (pointer.rightButtonDown()) {
    isTileEraseDragging = true;
    isPatternPaintDragging = false;
    patternPaintStartTile = null;
    paintTileFromPointer(pointer, TILE_EMPTY);
    return;
  }

  if (pointer.leftButtonDown()) {
    const isShiftPattern =
      !tileGroupPlacementEnabled &&
      !!shiftPaintKey?.isDown;

    if (isShiftPattern) {
      const tilePos = worldToTilePosition(pointer.worldX, pointer.worldY);
      if (!tilePos) return;

      isPatternPaintDragging = true;
      isTilePaintDragging = false;
      patternPaintStartTile = tilePos;
      patternPaintStartFrame = selectedTileFrame;

      paintPatternTileFromPointer(pointer);
      return;
    }

    isTilePaintDragging = true;
    isPatternPaintDragging = false;
    patternPaintStartTile = null;
    paintTileFromPointer(pointer, selectedTileFrame);
  }
}

function handleTilePointerMove(pointer) {
  if (!isAdminUser()) return;
  if (!tileEditorEnabled && !metadataEditorEnabled && !objectEditorEnabled) return;

  updateTileHoverCursor(pointer);

  if (objectEditorEnabled) {
    if (isObjectPaintDragging) {
      paintObjectFromPointer(pointer, selectedObjectFrame);
      return;
    }

    if (isObjectEraseDragging) {
      paintObjectFromPointer(pointer, OBJECT_EMPTY);
      return;
    }

    return;
  }

  if (!tileEditorEnabled) {
    return;
  }

  if (isPatternPaintDragging) {
    paintPatternTileFromPointer(pointer);
    return;
  }

  if (isTilePaintDragging) {
    paintTileFromPointer(pointer, selectedTileFrame);
    return;
  }

  if (isTileEraseDragging) {
    paintTileFromPointer(pointer, TILE_EMPTY);
  }
}

function handleTilePointerUp() {
  isTilePaintDragging = false;
  isTileEraseDragging = false;
  isPatternPaintDragging = false;
  patternPaintStartTile = null;
  lastPlacedTileGroupAnchorKey = "";

  isObjectPaintDragging = false;
  isObjectEraseDragging = false;

  stopMetadataPaletteDrag();
}

function exportRoomTileMapToConsole() {
  const exportObject = {
    base: roomBaseLayerMap,
    detail: roomDetailLayerMap,
    overhead: roomOverheadLayerMap,
    objects: roomObjectLayerMap
  };

  const json = JSON.stringify(exportObject, null, 2);
  console.log("const DEFAULT_ROOM_LAYOUT = " + json + ";");
}

function resetRoomTileMap(scene) {
  roomBaseLayerMap = createStarterRoomBaseLayerMap();
  roomDetailLayerMap = createStarterRoomDetailLayerMap();
  roomOverheadLayerMap = createStarterRoomOverheadLayerMap();
  roomObjectLayerMap = createStarterRoomObjectLayerMap();

  renderAllTileLayers(scene);
}

function syncEditorTileToRoom(layer, tileX, tileY, frame) {
  if (
    !joined ||
    !canSendRoomMessage() ||
    isMapTransitionInProgress
  ) return false;
  if (!["base", "detail", "overhead", "objects"].includes(layer)) return false;
  if (
    !Number.isInteger(tileX) ||
    !Number.isInteger(tileY) ||
    !Number.isInteger(frame)
  ) return false;

  const tileKey = `${layer}:${tileX}:${tileY}`;
  if (lastSyncedEditorTileFrames.get(tileKey) === frame) return true;

  const sent = sendRoomMessage("editor_tile_update", {
    layer,
    tileX,
    tileY,
    frame
  });
  if (sent) lastSyncedEditorTileFrames.set(tileKey, frame);
  return sent;
}

function syncEditorMetadataToRoom(frameIndex) {
  if (
    !joined ||
    !canSendRoomMessage() ||
    isMapTransitionInProgress ||
    !Number.isInteger(frameIndex) ||
    frameIndex < 0
  ) return false;

  const metadata = getFrameMetadata(frameIndex);
  const payload = {
    frame_index: frameIndex,
    collision: !!metadata.collision,
    animate: !!metadata.animate,
    action_center: metadata.actionCenter || null
  };
  const signature = JSON.stringify(payload);
  if (lastSyncedEditorMetadata.get(frameIndex) === signature) return true;

  const sent = sendRoomMessage("editor_metadata_update", payload);
  if (sent) lastSyncedEditorMetadata.set(frameIndex, signature);
  return sent;
}

async function saveCurrentRoomLayout() {
  if (isSavingLayout) return;

  try {
    isSavingLayout = true;
    if (tileGroupRecording) finishTileGroupRecording();
    saveTileGroups();
    saveTilesetDefaultLayers();

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      showStatusMessage("You must be signed in to save the layout.", false);
      return;
    }

    const email = (userData.user.email || "").toLowerCase();
    const ADMIN_EMAIL = "mnelsen@susd.net".toLowerCase();

    if (email !== ADMIN_EMAIL) {
      showStatusMessage("Only the admin can save the global layout.", false);
      return;
    }

    const layout = getCurrentRoomLayoutData();

    if (!isValidRoomLayout(layout)) {
      showStatusMessage("Layout is invalid and could not be saved.", false);
      return;
    }

    const metadataRows = getTilesetMetadataRowsForSave();

    const { error: layoutError } = await supabase
      .from("room_layouts")
      .upsert(
        {
          layout_key: currentMapKey || DEFAULT_MAP_KEY,
          layout_name: currentMapKey || DEFAULT_MAP_KEY,
          base_layer: layout.base,
          detail_layer: layout.detail,
          overhead_layer: layout.overhead,
          object_layer: layout.objects
        },
        {
          onConflict: "layout_key"
        }
      );

    if (layoutError) {
      console.error("Failed to save global layout:", layoutError);
      showStatusMessage("Failed to save global layout.", false);
      appendSystemChatLine("System: Failed to save map.", "#ff6666");
      return;
    }

    // Keep the active Colyseus room authoritative state synchronized with the
    // layout and metadata that were just persisted. Without this message, the
    // client could see an action center while the server still validated
    // against the previous room snapshot.
    sendRoomMessage("save_layout", {
      ...layout,
      metadata: metadataRows
    });

    currentLayoutKey = currentMapKey || DEFAULT_MAP_KEY;
    showStatusMessage("Saved layout, metadata, layer designations, and tile groups.");
    const savedObjectCount = roomObjectLayerMap
      .flat()
      .filter((value) => value !== OBJECT_EMPTY).length;

    appendSystemChatLine(
      `System: Saved map "${currentMapKey || DEFAULT_MAP_KEY}" | metadata rows: ${metadataRows.length} | tile groups: ${tileGroups.length} | objects: ${savedObjectCount}.`,
      "#7CFC00"
    );
    console.log("Saved global layout to room_layouts.default_room");
    console.log("Saved tileset metadata rows:", metadataRows.length);
  } catch (error) {
    console.error("Unexpected layout save error:", error);
    showStatusMessage("Failed to save global layout.", false);
    appendSystemChatLine("System: Unexpected error while saving map.", "#ff6666");
  } finally {
    isSavingLayout = false;
  }
}

/*
TILE HOVER CURSOR HELPERS
-------------------------
Purpose:
Show a visible tile outline under the pointer while editing.

Includes:
- hover cursor creation
- hover cursor movement
- hover cursor visibility control
*/

function createTileHoverCursor(scene) {
  const g = scene.add.graphics();
  g.setDepth(20);
  g.setVisible(false);
  return g;
}

function updateTileHoverCursor(pointer) {
  if (!tileEditorEnabled || !tileHoverCursor) return;

  const tilePos = worldToTilePosition(pointer.worldX, pointer.worldY);

  if (!tilePos) {
    tileHoverCursor.setVisible(false);
    return;
  }

  tileHoverCursor.clear();
  tileHoverCursor.lineStyle(2, TILE_HOVER_CURSOR_COLOR, TILE_HOVER_CURSOR_ALPHA);
  if (isIsometricMode()) {
    const anchor = tileToDisplayPosition(tilePos.tileX, tilePos.tileY);
    tileHoverCursor.beginPath();
    tileHoverCursor.moveTo(anchor.x, anchor.y - ISO_TILE_HEIGHT);
    tileHoverCursor.lineTo(anchor.x + ISO_TILE_WIDTH / 2, anchor.y - ISO_TILE_HEIGHT / 2);
    tileHoverCursor.lineTo(anchor.x, anchor.y);
    tileHoverCursor.lineTo(anchor.x - ISO_TILE_WIDTH / 2, anchor.y - ISO_TILE_HEIGHT / 2);
    tileHoverCursor.closePath();
    tileHoverCursor.strokePath();
  } else {
    const worldX = tileToWorldX(tilePos.tileX);
    const worldY = tileToWorldY(tilePos.tileY);
    tileHoverCursor.strokeRect(worldX, worldY, TILE_SIZE, TILE_SIZE);
  }
  tileHoverCursor.setVisible(true);
}

function hideTileHoverCursor() {
  if (!tileHoverCursor) return;
  tileHoverCursor.setVisible(false);
}

/*
TILE PALETTE HELPERS
--------------------
Purpose:
Render a clickable, scrollable full-tilesheet palette.

Includes:
- full tilesheet display
- horizontal and vertical scroll handling
- click-to-select frame handling
- selection highlight
*/

function getPaletteSheetPixelWidth() {
  return getTilesheetColumns() * getActiveTilesetFrameWidth();
}

function getPaletteSheetPixelHeight() {
  return getTilesheetRows() * getActiveTilesetFrameHeight();
}

function getPaletteScrollMinX() {
  return Math.min(0, TILE_PALETTE_VIEWPORT_WIDTH - getPaletteSheetPixelWidth());
}

function getPaletteScrollMinY() {
  return Math.min(0, TILE_PALETTE_VIEWPORT_HEIGHT - getPaletteSheetPixelHeight());
}

function clampTilePaletteScroll() {
  const minX = getPaletteScrollMinX();
  const minY = getPaletteScrollMinY();

  if (tilePaletteScrollOffsetX > 0) {
    tilePaletteScrollOffsetX = 0;
  }

  if (tilePaletteScrollOffsetY > 0) {
    tilePaletteScrollOffsetY = 0;
  }

  if (tilePaletteScrollOffsetX < minX) {
    tilePaletteScrollOffsetX = minX;
  }

  if (tilePaletteScrollOffsetY < minY) {
    tilePaletteScrollOffsetY = minY;
  }
}

function applyTilePaletteScroll() {
  clampTilePaletteScroll();

  if (tilePaletteViewport) {
    tilePaletteViewport.scrollLeft = Math.abs(tilePaletteScrollOffsetX);
    tilePaletteViewport.scrollTop = Math.abs(tilePaletteScrollOffsetY);
  }

  refreshTilePaletteSelection();
}

function isPointerOverPalette(pointer) {
  if (!pointer || !tilePaletteContainer || tilePaletteContainer.style.display === "none") {
    return false;
  }

  if (tilePaletteContainer._isCollapsed) {
    return false;
  }

  const rect = tilePaletteContainer.getBoundingClientRect();
  const canvas = sceneRef?.game?.canvas;
  const canvasRect = canvas?.getBoundingClientRect();

  if (!canvasRect) return false;

  const clientX = canvasRect.left + pointer.x;
  const clientY = canvasRect.top + pointer.y;

  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

function handleTilePaletteWheel(pointer, _gameObjects, deltaX, deltaY) {
  if (!tileEditorEnabled) return;
  if (!tilePaletteContainer) return;
  if (tilePaletteContainer.style.display === "none") return;
  if (tilePaletteContainer._isCollapsed) return;
  if (!isPointerOverPalette(pointer)) return;

  const useHorizontal = Math.abs(deltaX) > Math.abs(deltaY) || !!shiftPaintKey?.isDown;

  if (useHorizontal) {
    const amount = deltaX !== 0 ? deltaX : deltaY;
    tilePaletteScrollOffsetX -= Math.sign(amount) * TILE_PALETTE_SCROLL_SPEED;
  } else {
    tilePaletteScrollOffsetY -= Math.sign(deltaY) * TILE_PALETTE_SCROLL_SPEED;
  }

  applyTilePaletteScroll();
}

function getPaletteLocalPointerPosition(pointer) {
  if (!tilePaletteViewport) {
    return { localX: -1, localY: -1 };
  }

  const viewportRect = tilePaletteViewport.getBoundingClientRect();
  const canvas = sceneRef?.game?.canvas;
  const canvasRect = canvas?.getBoundingClientRect();

  if (!canvasRect) {
    return { localX: -1, localY: -1 };
  }

  const clientX = canvasRect.left + pointer.x;
  const clientY = canvasRect.top + pointer.y;

  const localX = clientX - viewportRect.left + tilePaletteViewport.scrollLeft;
  const localY = clientY - viewportRect.top + tilePaletteViewport.scrollTop;

  return { localX, localY };
}

function getPaletteFrameAtPointer(pointer) {
  if (!tilePaletteViewport) return null;
  if (tilePaletteContainer?._isCollapsed) return null;

  const viewportRect = tilePaletteViewport.getBoundingClientRect();
  const canvas = sceneRef?.game?.canvas;
  const canvasRect = canvas?.getBoundingClientRect();

  if (!canvasRect) return null;

  const clientX = canvasRect.left + pointer.x;
  const clientY = canvasRect.top + pointer.y;

  const insideViewport =
    clientX >= viewportRect.left &&
    clientX <= viewportRect.right &&
    clientY >= viewportRect.top &&
    clientY <= viewportRect.bottom;

  if (!insideViewport) return null;

  const { localX, localY } = getPaletteLocalPointerPosition(pointer);

  const inBounds =
    localX >= 0 &&
    localY >= 0 &&
    localX < getPaletteSheetPixelWidth() &&
    localY < getPaletteSheetPixelHeight();

  if (!inBounds) return null;

  const col = Math.floor(localX / getActiveTilesetFrameWidth());
  const row = Math.floor(localY / getActiveTilesetFrameHeight());
  const frameIndex = getLogicalFrameForTextureFrame(
    row * getTilesheetColumns() + col
  );

  if (frameIndex === null || !isValidTilesheetFrame(frameIndex)) return null;

  return frameIndex;
}

//OLD PHASER HANDLER - Do NOT remove until sure nothing else using it
function handleTilePalettePointerDown(pointer) {
  if (!tileEditorEnabled) return;
  if (!isPointerOverPalette(pointer)) return;

  const frameIndex = getPaletteFrameAtPointer(pointer);
  if (frameIndex === null) return;

  selectTileFrameForPainting(frameIndex);
}

/*
DOM TILE PALETTE POINTER HANDLER
--------------------------------
Purpose:
Handles tile palette selection using DOM-local coordinates instead of Phaser
world coordinates, so dragging the panel does not break tile selection.
*/

function handleDomTilePalettePointerDown(event) {
  if (!isAdminUser()) return;
  if (!tileEditorEnabled) return;
  if (!tilePaletteViewport || !tilePaletteContent) return;
  if (tilePaletteContainer?._isCollapsed) return;

  const contentRect = tilePaletteContent.getBoundingClientRect();

  const localX = event.clientX - contentRect.left;
  const localY = event.clientY - contentRect.top;

  const inBounds =
    localX >= 0 &&
    localY >= 0 &&
    localX < getPaletteSheetPixelWidth() &&
    localY < getPaletteSheetPixelHeight();

  if (!inBounds) return;

  const col = Math.floor(localX / getActiveTilesetFrameWidth());
  const row = Math.floor(localY / getActiveTilesetFrameHeight());
  const frameIndex = getLogicalFrameForTextureFrame(
    row * getTilesheetColumns() + col
  );

  if (frameIndex === null || !isValidTilesheetFrame(frameIndex)) return;

  if (tileGroupRecording) {
    if (event.button === 2 && event.shiftKey) {
      removePaletteFrameFromTileGroup(frameIndex);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.button !== 0) return;

    if (!tileGroupAnchor || event.shiftKey) {
      selectedTileFrame = frameIndex;
      addPaletteFrameToTileGroup(frameIndex, col, row);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    finishTileGroupRecording();
  }

  if (event.button !== 0) return;
  selectTileFrameForPainting(frameIndex);

  event.preventDefault();
  event.stopPropagation();
}

/*
DOM TILE PALETTE METADATA DRAG HANDLERS
---------------------------------------
Purpose:
Allows tilesheet metadata to be painted or erased directly by click-dragging
on the palette while metadata mode is enabled.

Behavior:
- left click on a different frame selects it
- left drag from the selected frame paints that frame's metadata
- right drag clears metadata
*/

function getPaletteFrameIndexFromDomEvent(event) {
  if (!tilePaletteContent) return null;

  const contentRect = tilePaletteContent.getBoundingClientRect();

  const localX = event.clientX - contentRect.left;
  const localY = event.clientY - contentRect.top;

  const inBounds =
    localX >= 0 &&
    localY >= 0 &&
    localX < getPaletteSheetPixelWidth() &&
    localY < getPaletteSheetPixelHeight();

  if (!inBounds) return null;

  const col = Math.floor(localX / getActiveTilesetFrameWidth());
  const row = Math.floor(localY / getActiveTilesetFrameHeight());
  const frameIndex = getLogicalFrameForTextureFrame(
    row * getTilesheetColumns() + col
  );

  return frameIndex !== null && isValidTilesheetFrame(frameIndex) ? frameIndex : null;
}

function handleDomTilePaletteMetadataPointerDown(event) {
  if (!isAdminUser()) return;
  if (!metadataEditorEnabled) return;
  if (!tilePaletteViewport || !tilePaletteContent) return;
  if (tilePaletteContainer?._isCollapsed) return;

  const frameIndex = getPaletteFrameIndexFromDomEvent(event);
  if (frameIndex === null) return;

  selectedTileFrame = frameIndex;

  if (event.button === 2) {
    isMetadataPaletteEraseDragging = true;
    isMetadataPalettePaintDragging = false;

    eraseMetadataPaintModeFromFrame(frameIndex);
    syncEditorMetadataToRoom(frameIndex);
    refreshTilesetAnimationData();
    refreshTilePaletteMetadataOverlay();
    updateTileEditorText();

    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (event.button !== 0) return;

  isMetadataPalettePaintDragging = true;
  isMetadataPaletteEraseDragging = false;

  applyMetadataPaintModeToFrame(frameIndex);
  syncEditorMetadataToRoom(frameIndex);
  refreshTilesetAnimationData();
  refreshTilePaletteMetadataOverlay();
  updateTileEditorText();

  event.preventDefault();
  event.stopPropagation();
}

function handleDomTilePaletteMetadataPointerMove(event) {
  if (!isAdminUser()) return;
  if (!metadataEditorEnabled) return;
  if (!isMetadataPalettePaintDragging && !isMetadataPaletteEraseDragging) return;

  const frameIndex = getPaletteFrameIndexFromDomEvent(event);
  if (frameIndex === null) return;

  selectedTileFrame = frameIndex;

  if (isMetadataPalettePaintDragging) {
    applyMetadataPaintModeToFrame(frameIndex);
  } else if (isMetadataPaletteEraseDragging) {
    eraseMetadataPaintModeFromFrame(frameIndex);
  }

  syncEditorMetadataToRoom(frameIndex);
  refreshTilesetAnimationData();
  refreshTilePaletteMetadataOverlay();
  updateTileEditorText();

  event.preventDefault();
  event.stopPropagation();
}

function attachGlobalMetadataPaletteDragHandlers() {
  if (document.body.dataset.e3MetadataPaletteDragReady === "true") return;
  document.body.dataset.e3MetadataPaletteDragReady = "true";

  document.addEventListener("pointerup", () => {
    stopMetadataPaletteDrag();
  });

  document.addEventListener("pointercancel", () => {
    stopMetadataPaletteDrag();
  });
}

function refreshTilePaletteForProjectionMode() {
  const width = getPaletteSheetPixelWidth();
  const height = getPaletteSheetPixelHeight();
  const frameWidth = getActiveTilesetFrameWidth();
  const frameHeight = getActiveTilesetFrameHeight();

  if (tilePaletteContent) {
    tilePaletteContent.style.width = `${width}px`;
    tilePaletteContent.style.height = `${height}px`;
  }

  if (tilePaletteSheetImage) {
    tilePaletteSheetImage.src = getActiveTilesetImageUrl();
    tilePaletteSheetImage.alt = isIsometricMode()
      ? "Isometric outside tilesheet"
      : "Classic tilesheet";
    tilePaletteSheetImage.style.width = `${width}px`;
    tilePaletteSheetImage.style.height = `${height}px`;
  }

  if (tilePaletteGridOverlay) {
    tilePaletteGridOverlay.style.width = `${width}px`;
    tilePaletteGridOverlay.style.height = `${height}px`;
    tilePaletteGridOverlay.style.backgroundSize = `${frameWidth}px ${frameHeight}px`;
  }

  if (metadataOverlayLayer) {
    metadataOverlayLayer.style.width = `${width}px`;
    metadataOverlayLayer.style.height = `${height}px`;
  }

  if (tileGroupOverlayLayer) {
    tileGroupOverlayLayer.style.width = `${width}px`;
    tileGroupOverlayLayer.style.height = `${height}px`;
  }

  if (tilePaletteClickLayer) {
    tilePaletteClickLayer.style.width = `${width}px`;
    tilePaletteClickLayer.style.height = `${height}px`;
  }

  if (tilePaletteModeButton) {
    tilePaletteModeButton.textContent = "Isometric 64×32";
  }

  tilePaletteScrollOffsetX = 0;
  tilePaletteScrollOffsetY = 0;
  selectedTileFrame = 0;
  applyTilePaletteScroll();
  refreshTilePaletteSelection();
  refreshTilePaletteMetadataOverlay();
  refreshTileGroupOverlay();
  updateChatStatusUI();
}

/*
TILE PALETTE UI
---------------
Purpose:
Creates a draggable, collapsible DOM tile palette that can live
outside the Phaser game area.

Includes:
- shared DOM panel frame
- larger scrollable viewport
- tilesheet image
- overlay grid
- clickable frame selection
*/

function createTilePalette(scene) {
  tilePaletteContainer = createUIPanel({
    x: TILE_PALETTE_X,
    y: TILE_PALETTE_Y,
    width: TILE_PALETTE_WIDTH,
    height: TILE_PALETTE_HEIGHT
  });

  if (!tilePaletteContainer) return null;

  tilePaletteContainer.id = "tile-palette-ui";
  restoreUIPanelState(tilePaletteContainer);

  tilePalettePanelBody = attachUIPanelFrame(tilePaletteContainer, {
    title: "Tilesheet",
    collapsible: true,
    bodyDisplay: "flex",
    bodyGap: "8px"
  });

  tilePalettePanelBody.style.flexDirection = "column";

  const projectionControls = document.createElement("div");
  projectionControls.style.display = "flex";
  projectionControls.style.alignItems = "center";
  projectionControls.style.justifyContent = "space-between";
  projectionControls.style.gap = "8px";

  const projectionLabel = document.createElement("span");
  projectionLabel.textContent = "Map projection";
  projectionLabel.style.color = "#9fb4ca";
  projectionLabel.style.fontSize = "11px";
  projectionLabel.style.textTransform = "uppercase";
  projectionLabel.style.letterSpacing = "0.04em";

  tilePaletteModeButton = document.createElement("span");
  tilePaletteModeButton.style.padding = "6px 9px";
  tilePaletteModeButton.style.borderRadius = "6px";
  tilePaletteModeButton.style.border = "1px solid rgba(90, 220, 255, 0.45)";
  tilePaletteModeButton.style.background = "rgba(21, 78, 98, 0.72)";
  tilePaletteModeButton.style.color = "#d9f8ff";
  tilePaletteModeButton.textContent = "Isometric 64×32";

  projectionControls.appendChild(projectionLabel);
  projectionControls.appendChild(tilePaletteModeButton);
  tilePalettePanelBody.appendChild(projectionControls);

  const proceduralControls = document.createElement("div");
  proceduralControls.style.display = "flex";
  proceduralControls.style.alignItems = "center";
  proceduralControls.style.justifyContent = "space-between";
  proceduralControls.style.gap = "8px";

  proceduralBiomeSelect = document.createElement("select");
  proceduralBiomeSelect.title = "Choose which biome the generator should create";
  proceduralBiomeSelect.style.minWidth = "116px";
  proceduralBiomeSelect.style.padding = "6px 7px";
  proceduralBiomeSelect.style.borderRadius = "6px";
  proceduralBiomeSelect.style.border = "1px solid rgba(90, 220, 255, 0.45)";
  proceduralBiomeSelect.style.background = "rgba(12, 38, 54, 0.92)";
  proceduralBiomeSelect.style.color = "#d9f8ff";
  [
    { id: "all", label: "All biomes" },
    ...(getActiveTilesetManifest()?.biomes || [])
  ].forEach((biome) => {
    const option = document.createElement("option");
    option.value = biome.id;
    option.textContent = biome.label;
    proceduralBiomeSelect.appendChild(option);
  });
  proceduralBiomeSelect.value = proceduralBiomeId;
  proceduralBiomeSelect.addEventListener("change", () => {
    proceduralBiomeId = proceduralBiomeSelect.value || "all";
    updateProceduralMapControls();
  });

  proceduralMapButton = document.createElement("button");
  proceduralMapButton.type = "button";
  proceduralMapButton.style.padding = "6px 9px";
  proceduralMapButton.style.borderRadius = "6px";
  proceduralMapButton.style.border = "1px solid rgba(117, 236, 145, 0.55)";
  proceduralMapButton.style.background = "rgba(31, 105, 61, 0.78)";
  proceduralMapButton.style.color = "#e4ffea";
  proceduralMapButton.style.cursor = "pointer";
  proceduralMapButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (tileGroupRecording) {
      finishTileGroupRecording();
    }
    generateProceduralMap();
  });

  proceduralMapSeedLabel = document.createElement("span");
  proceduralMapSeedLabel.style.color = "#9fb4ca";
  proceduralMapSeedLabel.style.fontSize = "10px";
  proceduralMapSeedLabel.style.textAlign = "right";

  proceduralControls.appendChild(proceduralBiomeSelect);
  proceduralControls.appendChild(proceduralMapButton);
  proceduralControls.appendChild(proceduralMapSeedLabel);
  tilePalettePanelBody.appendChild(proceduralControls);
  updateProceduralMapControls();

  const tileGroupPanel = document.createElement("div");
  tileGroupPanel.style.display = "flex";
  tileGroupPanel.style.flexDirection = "column";
  tileGroupPanel.style.gap = "6px";
  tileGroupPanel.style.padding = "7px";
  tileGroupPanel.style.border = "1px solid rgba(154, 208, 255, 0.24)";
  tileGroupPanel.style.borderRadius = "7px";
  tileGroupPanel.style.background = "rgba(14, 31, 48, 0.7)";

  const tileGroupTitle = document.createElement("div");
  tileGroupTitle.textContent = "Multi-layer tile groups";
  tileGroupTitle.style.color = "#9fb4ca";
  tileGroupTitle.style.fontSize = "10px";
  tileGroupTitle.style.fontWeight = "bold";
  tileGroupTitle.style.textTransform = "uppercase";
  tileGroupTitle.style.letterSpacing = "0.04em";

  const tileGroupSelectRow = document.createElement("div");
  tileGroupSelectRow.style.display = "flex";
  tileGroupSelectRow.style.gap = "6px";

  tileGroupSelect = document.createElement("select");
  tileGroupSelect.id = "tile-group-select";
  tileGroupSelect.style.flex = "1";
  tileGroupSelect.style.minWidth = "0";
  tileGroupSelect.style.padding = "5px";
  tileGroupSelect.style.borderRadius = "5px";
  tileGroupSelect.style.background = "#111b27";
  tileGroupSelect.style.color = "#e7f6ff";
  tileGroupSelect.addEventListener("change", () => {
    selectedTileGroupId = tileGroupSelect.value || null;
    tileGroupPlacementEnabled = false;
    const group = getSelectedTileGroup();
    if (tileGroupNameInput) tileGroupNameInput.value = group?.name || "";
    refreshTileGroupControls();
  });

  tileGroupSelectRow.appendChild(tileGroupSelect);

  const tileGroupRecordRow = document.createElement("div");
  tileGroupRecordRow.style.display = "flex";
  tileGroupRecordRow.style.gap = "6px";

  tileGroupNameInput = document.createElement("input");
  tileGroupNameInput.id = "tile-group-name-input";
  tileGroupNameInput.type = "text";
  tileGroupNameInput.placeholder = "Group name";
  tileGroupNameInput.style.flex = "1";
  tileGroupNameInput.style.minWidth = "0";
  tileGroupNameInput.style.padding = "5px";
  tileGroupNameInput.style.borderRadius = "5px";
  tileGroupNameInput.style.border = "1px solid rgba(255,255,255,0.16)";
  tileGroupNameInput.style.background = "#111b27";
  tileGroupNameInput.style.color = "#ffffff";

  tileGroupRecordButton = document.createElement("button");
  tileGroupRecordButton.type = "button";
  tileGroupRecordButton.addEventListener("click", () => {
    if (tileGroupRecording) finishTileGroupRecording();
    else startTileGroupRecording();
  });

  tileGroupRecordRow.appendChild(tileGroupNameInput);
  tileGroupRecordRow.appendChild(tileGroupRecordButton);

  const tileGroupActionRow = document.createElement("div");
  tileGroupActionRow.style.display = "flex";
  tileGroupActionRow.style.justifyContent = "flex-end";
  tileGroupActionRow.style.gap = "6px";

  tileGroupCancelButton = document.createElement("button");
  tileGroupCancelButton.type = "button";
  tileGroupCancelButton.textContent = "Cancel";
  tileGroupCancelButton.addEventListener("click", cancelTileGroupRecording);

  tileGroupDeleteButton = document.createElement("button");
  tileGroupDeleteButton.type = "button";
  tileGroupDeleteButton.textContent = "Delete";
  tileGroupDeleteButton.addEventListener("click", deleteSelectedTileGroup);

  [
    tileGroupRecordButton,
    tileGroupCancelButton,
    tileGroupDeleteButton
  ].forEach((button) => {
    button.style.padding = "5px 7px";
    button.style.borderRadius = "5px";
    button.style.border = "1px solid rgba(90, 220, 255, 0.35)";
    button.style.background = "rgba(21, 78, 98, 0.72)";
    button.style.color = "#d9f8ff";
    button.style.cursor = "pointer";
  });

  tileGroupActionRow.appendChild(tileGroupCancelButton);
  tileGroupActionRow.appendChild(tileGroupDeleteButton);

  tileGroupPanel.appendChild(tileGroupTitle);
  tileGroupPanel.appendChild(tileGroupSelectRow);
  tileGroupPanel.appendChild(tileGroupRecordRow);
  tileGroupPanel.appendChild(tileGroupActionRow);

  const tileGroupHelp = document.createElement("div");
  tileGroupHelp.textContent =
    "Start > click first tile | F7 default or 1/2/3 layer | Shift+left add | Shift+right remove | plain click saves | any grouped tile auto-places its group";
  tileGroupHelp.style.color = "#9fb4ca";
  tileGroupHelp.style.fontSize = "10px";
  tileGroupHelp.style.lineHeight = "1.35";
  tileGroupPanel.appendChild(tileGroupHelp);

  tilePalettePanelBody.appendChild(tileGroupPanel);
  loadTilesetDefaultLayers();
  loadTileGroups();

  tilePaletteSelectionLabel = document.createElement("div");
  tilePaletteSelectionLabel.style.minHeight = "18px";
  tilePaletteSelectionLabel.style.color = "#d9f8ff";
  tilePaletteSelectionLabel.style.fontSize = "12px";
  tilePaletteSelectionLabel.style.whiteSpace = "nowrap";
  tilePaletteSelectionLabel.style.overflow = "hidden";
  tilePaletteSelectionLabel.style.textOverflow = "ellipsis";
  tilePalettePanelBody.appendChild(tilePaletteSelectionLabel);

  tilePaletteViewport = document.createElement("div");
  tilePaletteViewport.id = "tile-palette-viewport";
  tilePaletteViewport.style.position = "relative";
  tilePaletteViewport.style.width = `${TILE_PALETTE_VIEWPORT_WIDTH}px`;
  tilePaletteViewport.style.height = `${TILE_PALETTE_VIEWPORT_HEIGHT}px`;
  tilePaletteViewport.style.overflow = "auto";
  tilePaletteViewport.style.background = "rgba(255,255,255,0.04)";
  tilePaletteViewport.style.border = "1px solid rgba(255,255,255,0.08)";
  tilePaletteViewport.style.borderRadius = "6px";
  tilePaletteViewport.style.alignSelf = "stretch";

  tilePaletteContent = document.createElement("div");
  tilePaletteContent.id = "tile-palette-content";
  tilePaletteContent.style.position = "relative";
  tilePaletteContent.style.width = `${getPaletteSheetPixelWidth()}px`;
  tilePaletteContent.style.height = `${getPaletteSheetPixelHeight()}px`;

  if (scene.textures.exists(getActiveTilesetImageKey())) {
    tilePaletteSheetImage = document.createElement("img");
    tilePaletteSheetImage.src = getActiveTilesetImageUrl();
    tilePaletteSheetImage.alt = isIsometricMode()
      ? "Isometric outside tilesheet"
      : "Classic tilesheet";
    tilePaletteSheetImage.draggable = false;
    tilePaletteSheetImage.style.position = "absolute";
    tilePaletteSheetImage.style.left = "0";
    tilePaletteSheetImage.style.top = "0";
    tilePaletteSheetImage.style.width = `${getPaletteSheetPixelWidth()}px`;
    tilePaletteSheetImage.style.height = `${getPaletteSheetPixelHeight()}px`;
    tilePaletteSheetImage.style.imageRendering = "pixelated";
    tilePaletteSheetImage.style.userSelect = "none";
    tilePaletteSheetImage.style.pointerEvents = "none";

    tilePaletteContent.appendChild(tilePaletteSheetImage);
  } else {
    const fallbackBg = document.createElement("div");
    fallbackBg.style.position = "absolute";
    fallbackBg.style.left = "0";
    fallbackBg.style.top = "0";
    fallbackBg.style.width = `${getPaletteSheetPixelWidth()}px`;
    fallbackBg.style.height = `${getPaletteSheetPixelHeight()}px`;
    fallbackBg.style.background = "#1a2230";
    tilePaletteContent.appendChild(fallbackBg);
  }

  tilePaletteGridOverlay = document.createElement("div");
  tilePaletteGridOverlay.style.position = "absolute";
  tilePaletteGridOverlay.style.left = "0";
  tilePaletteGridOverlay.style.top = "0";
  tilePaletteGridOverlay.style.width = `${getPaletteSheetPixelWidth()}px`;
  tilePaletteGridOverlay.style.height = `${getPaletteSheetPixelHeight()}px`;
  tilePaletteGridOverlay.style.pointerEvents = "none";
  tilePaletteGridOverlay.style.backgroundImage = `
    linear-gradient(to right, rgba(74, 92, 117, 0.85) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(74, 92, 117, 0.85) 1px, transparent 1px)
  `;
  tilePaletteGridOverlay.style.backgroundSize =
    `${getActiveTilesetFrameWidth()}px ${getActiveTilesetFrameHeight()}px`;

  tilePaletteSelectionBox = document.createElement("div");
  tilePaletteSelectionBox.id = "tile-palette-selection-box";
  tilePaletteSelectionBox.style.position = "absolute";
  tilePaletteSelectionBox.style.width = `${getActiveTilesetFrameWidth()}px`;
  tilePaletteSelectionBox.style.height = `${getActiveTilesetFrameHeight()}px`;
  tilePaletteSelectionBox.style.boxSizing = "border-box";
  tilePaletteSelectionBox.style.border = `2px solid #ffff66`;
  tilePaletteSelectionBox.style.pointerEvents = "none";

  metadataOverlayLayer = document.createElement("div");
  metadataOverlayLayer.id = "tile-palette-metadata-overlay";
  metadataOverlayLayer.style.position = "absolute";
  metadataOverlayLayer.style.left = "0";
  metadataOverlayLayer.style.top = "0";
  metadataOverlayLayer.style.width = `${getPaletteSheetPixelWidth()}px`;
  metadataOverlayLayer.style.height = `${getPaletteSheetPixelHeight()}px`;
  metadataOverlayLayer.style.pointerEvents = "none";
  metadataOverlayLayer.style.display = "none";

  tileGroupOverlayLayer = document.createElement("div");
  tileGroupOverlayLayer.id = "tile-palette-group-overlay";
  tileGroupOverlayLayer.style.position = "absolute";
  tileGroupOverlayLayer.style.left = "0";
  tileGroupOverlayLayer.style.top = "0";
  tileGroupOverlayLayer.style.width = `${getPaletteSheetPixelWidth()}px`;
  tileGroupOverlayLayer.style.height = `${getPaletteSheetPixelHeight()}px`;
  tileGroupOverlayLayer.style.pointerEvents = "none";
  tileGroupOverlayLayer.style.display = "none";

  tilePaletteClickLayer = document.createElement("div");
  tilePaletteClickLayer.id = "tile-palette-click-layer";
  tilePaletteClickLayer.style.position = "absolute";
  tilePaletteClickLayer.style.left = "0";
  tilePaletteClickLayer.style.top = "0";
  tilePaletteClickLayer.style.width = `${getPaletteSheetPixelWidth()}px`;
  tilePaletteClickLayer.style.height = `${getPaletteSheetPixelHeight()}px`;
  tilePaletteClickLayer.style.cursor = "crosshair";

  tilePaletteClickLayer.addEventListener("pointerdown", (event) => {
    if (metadataEditorEnabled) {
      handleDomTilePaletteMetadataPointerDown(event);
      return;
    }

    handleDomTilePalettePointerDown(event);
  });

  tilePaletteClickLayer.addEventListener("pointermove", handleDomTilePaletteMetadataPointerMove);

  tilePaletteClickLayer.addEventListener("contextmenu", (event) => {
    if (metadataEditorEnabled || tileGroupRecording) {
      event.preventDefault();
    }
  });

  attachGlobalMetadataPaletteDragHandlers();

  tilePaletteContent.appendChild(tilePaletteGridOverlay);
  tilePaletteContent.appendChild(metadataOverlayLayer);
  tilePaletteContent.appendChild(tileGroupOverlayLayer);
  tilePaletteContent.appendChild(tilePaletteSelectionBox);
  tilePaletteContent.appendChild(tilePaletteClickLayer);
  tilePaletteViewport.appendChild(tilePaletteContent);
  tilePalettePanelBody.appendChild(tilePaletteViewport);

  tilePaletteViewport.addEventListener("scroll", () => {
    tilePaletteScrollOffsetX = -tilePaletteViewport.scrollLeft;
    tilePaletteScrollOffsetY = -tilePaletteViewport.scrollTop;
    refreshTilePaletteSelection();
  });

  tilePaletteScrollOffsetX = 0;
  tilePaletteScrollOffsetY = 0;
  refreshTilePaletteForProjectionMode();
  applyTilePaletteScroll();
  refreshTilePaletteMetadataOverlay();
  refreshTileGroupOverlay();

  return tilePaletteContainer;
}

/*
OBJECT PALETTE UI
-----------------
Purpose:
Creates a draggable admin window for selecting doorway, collectible, and mob
frames from the portal/mob sheet.

Includes:
- scrollable object-sheet image
- frame selection
- selection highlight
*/

function createObjectPalette(scene) {
  objectPaletteContainer = createUIPanel({
    x: OBJECT_PALETTE_X,
    y: OBJECT_PALETTE_Y,
    width: OBJECT_PALETTE_WIDTH,
    height: OBJECT_PALETTE_HEIGHT
  });

  if (!objectPaletteContainer) return null;

  objectPaletteContainer.id = "object-palette-ui";
  restoreUIPanelState(objectPaletteContainer);

  const panelBody = attachUIPanelFrame(objectPaletteContainer, {
    title: "Objects",
    collapsible: true,
    bodyDisplay: "flex",
    bodyGap: "8px"
  });

  panelBody.style.flexDirection = "column";

  objectPaletteViewport = document.createElement("div");
  objectPaletteViewport.id = "object-palette-viewport";
  objectPaletteViewport.style.position = "relative";
  objectPaletteViewport.style.width = `${OBJECT_PALETTE_VIEWPORT_WIDTH}px`;
  objectPaletteViewport.style.height = `${OBJECT_PALETTE_VIEWPORT_HEIGHT}px`;
  objectPaletteViewport.style.overflow = "auto";
  objectPaletteViewport.style.background = "rgba(255,255,255,0.04)";
  objectPaletteViewport.style.border = "1px solid rgba(255,255,255,0.08)";
  objectPaletteViewport.style.borderRadius = "6px";
  objectPaletteViewport.style.alignSelf = "stretch";

  objectPaletteContent = document.createElement("div");
  objectPaletteContent.id = "object-palette-content";
  const objectSheetSize = getObjectSheetImageSize();

  objectPaletteContent.style.position = "relative";
  objectPaletteContent.style.width = `${objectSheetSize.width}px`;
  objectPaletteContent.style.height = `${objectSheetSize.height}px`;

  if (scene.textures.exists(OBJECT_SHEET_IMAGE_KEY)) {
    objectPaletteSheetImage = document.createElement("img");
    objectPaletteSheetImage.src = "assets/objects/portal_mob_sheet.png";
    objectPaletteSheetImage.alt = "Object Sheet";
    objectPaletteSheetImage.draggable = false;
    objectPaletteSheetImage.style.position = "absolute";
    objectPaletteSheetImage.style.left = "0";
    objectPaletteSheetImage.style.top = "0";
    objectPaletteSheetImage.style.width = `${objectSheetSize.width}px`;
    objectPaletteSheetImage.style.height = `${objectSheetSize.height}px`;
    objectPaletteSheetImage.style.display = "block";
    objectPaletteSheetImage.style.imageRendering = "pixelated";
    objectPaletteSheetImage.style.userSelect = "none";
    objectPaletteSheetImage.style.pointerEvents = "none";

    objectPaletteContent.appendChild(objectPaletteSheetImage);
  }

  const gridOverlay = document.createElement("div");
  gridOverlay.style.position = "absolute";
  gridOverlay.style.left = "0";
  gridOverlay.style.top = "0";
  gridOverlay.style.width = `${objectSheetSize.width}px`;
  gridOverlay.style.height = `${objectSheetSize.height}px`;
  gridOverlay.style.pointerEvents = "none";
  gridOverlay.style.backgroundImage = `
    linear-gradient(to right, rgba(74, 92, 117, 0.85) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(74, 92, 117, 0.85) 1px, transparent 1px)
  `;
  gridOverlay.style.backgroundSize = `${OBJECT_FRAME_WIDTH}px ${OBJECT_FRAME_HEIGHT}px`;

  objectPaletteSelectionBox = document.createElement("div");
  objectPaletteSelectionBox.id = "object-palette-selection-box";
  objectPaletteSelectionBox.style.position = "absolute";
  objectPaletteSelectionBox.style.width = `${OBJECT_FRAME_WIDTH}px`;
  objectPaletteSelectionBox.style.height = `${OBJECT_FRAME_HEIGHT}px`;
  objectPaletteSelectionBox.style.boxSizing = "border-box";
  objectPaletteSelectionBox.style.border = "2px solid #66ffcc";
  objectPaletteSelectionBox.style.pointerEvents = "none";

  const clickLayer = document.createElement("div");
  clickLayer.id = "object-palette-click-layer";
  clickLayer.style.position = "absolute";
  clickLayer.style.left = "0";
  clickLayer.style.top = "0";
  clickLayer.style.width = `${objectSheetSize.width}px`;
  clickLayer.style.height = `${objectSheetSize.height}px`;
  clickLayer.style.cursor = "pointer";

  clickLayer.addEventListener("pointerdown", (event) => {
    if (!isAdminUser()) return;
    if (!objectEditorEnabled) return;
    if (!objectPaletteViewport || !objectPaletteContent) return;
    if (objectPaletteContainer?._isCollapsed) return;

    const rect = objectPaletteContent.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;

    const col = Math.floor(localX / OBJECT_FRAME_WIDTH);
    const row = Math.floor(localY / OBJECT_FRAME_HEIGHT);
    const frameIndex = row * getObjectSheetColumns() + col;

    if (!isValidObjectFrame(frameIndex)) return;

    selectedObjectFrame = frameIndex;
    refreshObjectPaletteSelection();
    updateChatStatusUI();

    event.preventDefault();
    event.stopPropagation();
  });

  objectPaletteContent.appendChild(gridOverlay);
  objectPaletteContent.appendChild(objectPaletteSelectionBox);
  objectPaletteContent.appendChild(clickLayer);
  objectPaletteViewport.appendChild(objectPaletteContent);
  panelBody.appendChild(objectPaletteViewport);

  refreshObjectPaletteSelection();

  return objectPaletteContainer;
}

/*
3D OBJECT PREVIEW UI
--------------------
Purpose:
Keeps world-object previews separate from the player's profile paperdoll and
tracks the currently selected object-palette frame.
*/

function createObject3DPreviewUI() {
  object3DPreviewPanel = createUIPanel({
    x: 450,
    y: 210,
    width: 300,
    height: 320
  });
  if (!object3DPreviewPanel) return;

  object3DPreviewPanel.id = "object-3d-preview-ui";
  const panelBody = attachUIPanelFrame(object3DPreviewPanel, {
    title: "3D Object Preview",
    collapsible: true,
    bodyDisplay: "flex",
    bodyGap: "8px"
  });
  panelBody.style.flexDirection = "column";

  object3DPreviewViewport = document.createElement("div");
  object3DPreviewViewport.id = "object-3d-preview-viewport";
  object3DPreviewViewport.style.position = "relative";
  object3DPreviewViewport.style.flex = "1";
  object3DPreviewViewport.style.minHeight = "0";
  object3DPreviewViewport.style.overflow = "hidden";
  object3DPreviewViewport.style.borderRadius = "8px";
  object3DPreviewViewport.style.border = "1px solid rgba(95, 180, 230, 0.3)";
  object3DPreviewViewport.style.background = "radial-gradient(circle at 50% 45%, rgba(28, 64, 88, 0.72), rgba(8, 14, 23, 0.98) 72%)";

  object3DPreviewStatus = document.createElement("div");
  object3DPreviewStatus.style.minHeight = "18px";
  object3DPreviewStatus.style.color = "#a9c3dc";
  object3DPreviewStatus.style.fontSize = "11px";
  object3DPreviewStatus.style.lineHeight = "1.35";
  object3DPreviewStatus.style.textAlign = "center";
  object3DPreviewStatus.textContent = "Select an object frame to preview it.";

  panelBody.appendChild(object3DPreviewViewport);
  panelBody.appendChild(object3DPreviewStatus);
  restoreUIPanelState(object3DPreviewPanel);
  refreshObject3DPreview();
}

function setObject3DPreviewStatus(message, state = "idle") {
  if (!object3DPreviewStatus) return;
  object3DPreviewStatus.textContent = message;
  object3DPreviewStatus.style.color =
    state === "error" ? "#ff8d8d" : state === "ready" ? "#76e6ff" : "#a9c3dc";
}

function clearObject3DPreview() {
  activeObject3DPreview?.dispose?.();
  activeObject3DPreview = null;
  activeObject3DPreviewKey = null;
  object3DPreviewViewport?.replaceChildren();
}

function refreshObject3DPreview() {
  if (!object3DPreviewViewport) return;

  if (!isValidObjectFrame(selectedObjectFrame)) {
    clearObject3DPreview();
    setObject3DPreviewStatus("Select an object frame to preview it.");
    return;
  }

  const summary = getObjectTypeSummary(selectedObjectFrame);
  const modelUrl = OBJECT_3D_MODEL_URLS[selectedObjectFrame];
  const previewKey = `${selectedObjectFrame}:${modelUrl || summary?.category || "unknown"}:${summary?.kind || ""}:${summary?.tier || ""}`;
  if (activeObject3DPreview && activeObject3DPreviewKey === previewKey) return;
  clearObject3DPreview();
  activeObject3DPreviewKey = previewKey;

  if (modelUrl) {
    activeObject3DPreview = createGLTFModelPreview(object3DPreviewViewport, {
      url: modelUrl,
      onStatus(state, message) {
        setObject3DPreviewStatus(`Frame ${selectedObjectFrame} • ${message}`, state);
      }
    });
    return;
  }

  if (summary?.category === "portal") {
    activeObject3DPreview = createPortalPreview(object3DPreviewViewport);
    setObject3DPreviewStatus(
      `${summary.portalKey || "Portal"} • procedural fallback • drag to rotate`,
      "ready"
    );
    return;
  }

  if (summary?.category === "resource" || summary?.category === "mob_anchor") {
    activeObject3DPreview = createProceduralObjectPreview(object3DPreviewViewport, {
      category: summary.category,
      kind: summary.kind,
      tier: summary.tier || 1
    });
    const objectLabel = String(summary.kind || summary.category)
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    setObject3DPreviewStatus(
      `Frame ${selectedObjectFrame} • ${objectLabel} • tier ${summary.tier || 1} • drag to rotate`,
      "ready"
    );
    return;
  }

  setObject3DPreviewStatus(
    `Frame ${selectedObjectFrame} • ${summary?.category || "unknown"} • no 3D model assigned`
  );
}

function refreshTilePaletteSelection() {
  if (!tilePaletteSelectionBox) return;
  if (!isValidTilesheetFrame(selectedTileFrame)) return;

  const textureFrame = getTextureFrameForLogicalFrame(selectedTileFrame);
  const col = textureFrame % getTilesheetColumns();
  const row = Math.floor(textureFrame / getTilesheetColumns());
  const frameWidth = getActiveTilesetFrameWidth();
  const frameHeight = getActiveTilesetFrameHeight();

  tilePaletteSelectionBox.style.left = `${col * frameWidth}px`;
  tilePaletteSelectionBox.style.top = `${row * frameHeight}px`;
  tilePaletteSelectionBox.style.width = `${frameWidth}px`;
  tilePaletteSelectionBox.style.height = `${frameHeight}px`;

  if (tilePaletteSelectionLabel) {
    const semanticHints = getFrameSemanticHints(selectedTileFrame);
    const text = [
      getFrameName(selectedTileFrame),
      semanticHints
    ].filter(Boolean).join(" • ");
    tilePaletteSelectionLabel.textContent = text;
    tilePaletteSelectionLabel.title = text;
  }
}

function refreshObjectPaletteSelection() {
  if (!objectPaletteSelectionBox) return;
  if (!isValidObjectFrame(selectedObjectFrame)) {
    objectPaletteSelectionBox.style.display = "none";
    return;
  }

  objectPaletteSelectionBox.style.display = "block";

  const col = selectedObjectFrame % getObjectSheetColumns();
  const row = Math.floor(selectedObjectFrame / getObjectSheetColumns());

  objectPaletteSelectionBox.style.left = `${col * OBJECT_FRAME_WIDTH}px`;
  objectPaletteSelectionBox.style.top = `${row * OBJECT_FRAME_HEIGHT}px`;
  objectPaletteSelectionBox.style.width = `${OBJECT_FRAME_WIDTH}px`;
  objectPaletteSelectionBox.style.height = `${OBJECT_FRAME_HEIGHT}px`;
  refreshObject3DPreview();
}

/*
TILE PALETTE METADATA OVERLAY
-----------------------------
Purpose:
Shows all frame metadata at once on the tilesheet palette.

Visuals:
- red fill = collision
- blue inset border = actionArea
- gold label = actionCenter type
- purple corner = animate
*/

function refreshTilePaletteMetadataOverlay() {
  if (!metadataOverlayLayer) return;

  metadataOverlayLayer.innerHTML = "";
  metadataOverlayLayer.style.display = metadataEditorEnabled ? "block" : "none";

  if (!metadataEditorEnabled) return;

  for (let frameIndex = 0; frameIndex < getLogicalTilesheetFrameCount(); frameIndex++) {
    const meta = getFrameMetadata(frameIndex);
    const defaultLayer = getFrameDefaultLayer(frameIndex);

    const hasAnyMetadata =
      !!meta.collision ||
      !!meta.animate ||
      !!meta.actionCenter ||
      !!defaultLayer;

    if (!hasAnyMetadata) continue;

    const textureFrame = getTextureFrameForLogicalFrame(frameIndex);
    const col = textureFrame % getTilesheetColumns();
    const row = Math.floor(textureFrame / getTilesheetColumns());
    const frameWidth = getActiveTilesetFrameWidth();
    const frameHeight = getActiveTilesetFrameHeight();

    const marker = document.createElement("div");
    marker.style.position = "absolute";
    marker.style.left = `${col * frameWidth}px`;
    marker.style.top = `${row * frameHeight}px`;
    marker.style.width = `${frameWidth}px`;
    marker.style.height = `${frameHeight}px`;
    marker.style.boxSizing = "border-box";
    marker.style.pointerEvents = "none";

    if (meta.collision) {
      marker.style.background = "rgba(255, 70, 70, 0.32)";
    }

    if (meta.actionCenter) {
      marker.style.boxShadow = "inset 0 0 0 2px rgba(255, 210, 70, 0.95)";

      const label = document.createElement("div");
      label.textContent = getActionCenterShortLabel(meta.actionCenter);
      label.style.position = "absolute";
      label.style.left = "1px";
      label.style.bottom = "0px";
      label.style.fontSize = "8px";
      label.style.lineHeight = "1";
      label.style.fontWeight = "700";
      label.style.color = "#111111";
      label.style.background = "rgba(255, 230, 120, 0.95)";
      label.style.padding = "1px 2px";
      label.style.borderRadius = "2px";
      label.style.pointerEvents = "none";
      marker.appendChild(label);
    }

    if (meta.animate) {
      const dot = document.createElement("div");
      dot.style.position = "absolute";
      dot.style.right = "1px";
      dot.style.top = "1px";
      dot.style.width = "5px";
      dot.style.height = "5px";
      dot.style.borderRadius = "999px";
      dot.style.background = "rgba(180, 90, 255, 0.95)";
      dot.style.pointerEvents = "none";
      marker.appendChild(dot);
    }

    if (defaultLayer) {
      const layerNumber = {
        base: "1",
        detail: "2",
        overhead: "3"
      }[defaultLayer];
      const layerLabel = document.createElement("div");
      layerLabel.textContent = `L${layerNumber}`;
      layerLabel.title = `Default layer: ${getLayerName(defaultLayer)}`;
      layerLabel.style.position = "absolute";
      layerLabel.style.right = "1px";
      layerLabel.style.bottom = "1px";
      layerLabel.style.fontSize = "9px";
      layerLabel.style.lineHeight = "1";
      layerLabel.style.fontWeight = "800";
      layerLabel.style.color = "#06131a";
      layerLabel.style.background = "rgba(94, 232, 255, 0.96)";
      layerLabel.style.padding = "2px 3px";
      layerLabel.style.borderRadius = "3px";
      layerLabel.style.pointerEvents = "none";
      marker.appendChild(layerLabel);
    }

    metadataOverlayLayer.appendChild(marker);
  }
}

/*
TILE EDITOR MODE HELPERS
------------------------
Purpose:
Show or hide tile editing tools and keep metadata palette drag state clean.
*/

function ensureAdminEditorUI() {
  if (!isAdminUser() || !sceneRef) return;
  if (!tileHoverCursor) tileHoverCursor = createTileHoverCursor(sceneRef);
  if (!tilePaletteContainer) tilePaletteContainer = createTilePalette(sceneRef);
  if (!objectPaletteContainer) objectPaletteContainer = createObjectPalette(sceneRef);
  if (!object3DPreviewPanel) createObject3DPreviewUI();
}

function destroyAdminEditorUI() {
  tilePaletteContainer?.remove?.();
  objectPaletteContainer?.remove?.();
  object3DPreviewPanel?.remove?.();
  tilePaletteContainer = null;
  objectPaletteContainer = null;
  object3DPreviewPanel = null;
  activeObject3DPreview?.dispose?.();
  activeObject3DPreview = null;
  activeObject3DPreviewKey = null;
  tileHoverCursor?.destroy?.();
  tileHoverCursor = null;
}

function syncTileEditorVisibility() {
  const adminUser = isAdminUser();

  if (!adminUser) {
    tileEditorEnabled = false;
    metadataEditorEnabled = false;
    objectEditorEnabled = false;
    destroyAdminEditorUI();
  } else {
    ensureAdminEditorUI();
  }

  if (tilePaletteContainer) {
    tilePaletteContainer.style.display =
      adminUser && (tileEditorEnabled || metadataEditorEnabled) ? "flex" : "none";
  }

  if (objectPaletteContainer) {
    objectPaletteContainer.style.display =
      adminUser && objectEditorEnabled ? "flex" : "none";
  }

  if (object3DPreviewPanel) {
    object3DPreviewPanel.style.display =
      adminUser && objectEditorEnabled ? "flex" : "none";
  }

  if (!tileEditorEnabled && !objectEditorEnabled) {
    hideTileHoverCursor();
    isTilePaintDragging = false;
    isTileEraseDragging = false;
    isPatternPaintDragging = false;
    patternPaintStartTile = null;
    isObjectPaintDragging = false;
    isObjectEraseDragging = false;
  }

  if (sceneRef) {
    renderObjectLayer(sceneRef);
    refreshTransitionDebugGraphics(sceneRef);
    refreshPlayerDebugGraphics(sceneRef);
  }


  if (!tileEditorEnabled) {
    hideTileHoverCursor();
    isTilePaintDragging = false;
    isTileEraseDragging = false;
    isPatternPaintDragging = false;
    patternPaintStartTile = null;
  }

  if (!metadataEditorEnabled) {
    stopMetadataPaletteDrag();
  }

  refreshTilePaletteMetadataOverlay();
}

function toggleTileEditor() {
  tileEditorEnabled = !tileEditorEnabled;

  if (tileEditorEnabled) {
    metadataEditorEnabled = false;
  }

  syncTileEditorVisibility();
  updateTileEditorText();
}

/*
METADATA EDITOR TOGGLE
----------------------
Purpose:
Turns metadata editing on or off and disables tile editing while metadata mode is active.
*/

function toggleMetadataEditor() {
  metadataEditorEnabled = !metadataEditorEnabled;

  if (metadataEditorEnabled) {
    tileEditorEnabled = false;
  }

  syncTileEditorVisibility();
  updateTileEditorText();
}

/*
ROOM MAP DEBUG HELPERS
----------------------
Purpose:
Provide simple in-code examples for changing the room map layout.
*/

function applyRoomDebugPaintExample(scene) {
  if (!roomTileMap.length) return;

  paintRect(roomTileMap, 10, 18, 6, 3, TILE_IDS.GRASS);
  paintRect(roomTileMap, 22, 18, 6, 3, TILE_IDS.PATH);

  renderTileMap(scene, roomTileMap);
}

/*
ROOM FRAME + CAMERA HELPERS
---------------------------
Purpose:
Refresh the visible room border and keep the camera bounded to the current
loaded map size.

Includes:
- room border redraw
- camera bounds update
- local player follow hookup
*/

function refreshRoomFrameGraphics(scene) {
  if (!scene) return;

  if (!roomFrameGraphics) {
    roomFrameGraphics = scene.add.graphics();
  }

  roomFrameGraphics.clear();
  roomFrameGraphics.lineStyle(4, 0x5b6f8a, 1);
  if (isIsometricMode()) {
    const width = getCurrentRoomTileWidth();
    const height = getCurrentRoomTileHeight();
    const top = tileToDisplayPosition(0, 0);
    const right = tileToDisplayPosition(width - 1, 0);
    const bottom = tileToDisplayPosition(width - 1, height - 1);
    const left = tileToDisplayPosition(0, height - 1);

    roomFrameGraphics.beginPath();
    roomFrameGraphics.moveTo(top.x, top.y - ISO_TILE_HEIGHT);
    roomFrameGraphics.lineTo(right.x + ISO_TILE_WIDTH / 2, right.y - ISO_TILE_HEIGHT / 2);
    roomFrameGraphics.lineTo(bottom.x, bottom.y);
    roomFrameGraphics.lineTo(left.x - ISO_TILE_WIDTH / 2, left.y - ISO_TILE_HEIGHT / 2);
    roomFrameGraphics.closePath();
    roomFrameGraphics.strokePath();
  } else {
    roomFrameGraphics.strokeRect(
      ROOM_OFFSET_X,
      ROOM_OFFSET_Y,
      getCurrentRoomWorldWidth(),
      getCurrentRoomWorldHeight()
    );
  }

  roomFrameGraphics.setDepth(5);

  if (stationBar && scene?.cameras?.main) {
    stationBar.setPosition(
      scene.cameras.main.width / 2,
      scene.cameras.main.height - 18
    );
    stationBar.width = scene.cameras.main.width - 8;
  }

  if (stationText && scene?.cameras?.main) {
    stationText.setPosition(
      scene.cameras.main.width / 2,
      scene.cameras.main.height - 28
    );
  }
}

function refreshCameraBounds(scene) {
  if (!scene?.cameras?.main) return;

  const worldLeft = ROOM_OFFSET_X;
  const worldTop = isIsometricMode()
    ? ROOM_OFFSET_Y - ISO_TILE_HEIGHT / 2
    : ROOM_OFFSET_Y;
  const worldWidth = getCurrentRoomWorldWidth();
  const worldHeight = getCurrentRoomWorldHeight();

  console.log("CAMERA BOUNDS:", {
    worldLeft,
    worldTop,
    worldWidth,
    worldHeight,
    roomTileWidth: getCurrentRoomTileWidth(),
    roomTileHeight: getCurrentRoomTileHeight(),
    cameraWidth: scene.cameras.main.width,
    cameraHeight: scene.cameras.main.height
  });

  scene.cameras.main.setBounds(worldLeft, worldTop, worldWidth, worldHeight);
}

function startFollowingLocalPlayer() {
  if (!sceneRef?.cameras?.main || !players?.[myId]?.container) return;

  sceneRef.cameras.main.startFollow(players[myId].container, true, 1, 1);
  refreshCameraBounds(sceneRef);
}

function drawRoom(scene) {
  rebuildRoomTileMap(scene);
  refreshRoomFrameGraphics(scene);
  refreshTransitionDebugGraphics(scene);
  refreshPlayerDebugGraphics(scene);
  refreshCameraBounds(scene);

  stationBar = scene.add.rectangle(
    scene.cameras.main.width / 2,
    scene.cameras.main.height - 18,
    scene.cameras.main.width - 8,
    36,
    0x000000,
    0.82
  );
  stationBar.setDepth(1000);
  stationBar.setScrollFactor(0);

  stationText = scene.add.text(
    scene.cameras.main.width / 2,
    scene.cameras.main.height - 28,
    "",
    {
      color: "#ffffff",
      fontSize: "16px",
      stroke: "#000000",
      strokeThickness: 3
    }
  );
  stationText.setOrigin(0.5, 0);
  stationText.setDepth(1001);
  stationText.setScrollFactor(0);
}

/*
GRID HELPERS
------------
Purpose:
Convert tile coordinates into world coordinates for room rendering and gameplay.
*/

function tileToWorldX(tileX) {
  return ROOM_OFFSET_X + tileX * TILE_SIZE;
}

function tileToWorldY(tileY) {
  return ROOM_OFFSET_Y + tileY * TILE_SIZE;
}

function getIsometricOriginX() {
  return ROOM_OFFSET_X + getCurrentRoomTileHeight() * (ISO_TILE_WIDTH / 2);
}

function tileToDisplayPosition(tileX, tileY) {
  if (!isIsometricMode()) {
    return {
      x: tileToWorldX(tileX),
      y: tileToWorldY(tileY)
    };
  }

  return {
    x: getIsometricOriginX() + (tileX - tileY) * (ISO_TILE_WIDTH / 2),
    y: ROOM_OFFSET_Y + (tileX + tileY + 1) * (ISO_TILE_HEIGHT / 2)
  };
}

function logicalWorldToDisplay(worldX, worldY) {
  if (!isIsometricMode()) return { x: worldX, y: worldY };

  const tileX = (worldX - ROOM_OFFSET_X) / TILE_SIZE;
  const tileY = (worldY - ROOM_OFFSET_Y) / TILE_SIZE;

  return {
    x: getIsometricOriginX() + (tileX - tileY) * (ISO_TILE_WIDTH / 2),
    y: ROOM_OFFSET_Y + (tileX + tileY - 1) * (ISO_TILE_HEIGHT / 2)
  };
}

function drawIsometricTileArea(graphics, tileX, tileY, width = 1, height = 1, fill = false) {
  const top = tileToDisplayPosition(tileX, tileY);
  const right = tileToDisplayPosition(tileX + width - 1, tileY);
  const bottom = tileToDisplayPosition(tileX + width - 1, tileY + height - 1);
  const left = tileToDisplayPosition(tileX, tileY + height - 1);

  graphics.beginPath();
  graphics.moveTo(top.x, top.y - ISO_TILE_HEIGHT);
  graphics.lineTo(right.x + ISO_TILE_WIDTH / 2, right.y - ISO_TILE_HEIGHT / 2);
  graphics.lineTo(bottom.x, bottom.y);
  graphics.lineTo(left.x - ISO_TILE_WIDTH / 2, left.y - ISO_TILE_HEIGHT / 2);
  graphics.closePath();
  if (fill) graphics.fillPath();
  else graphics.strokePath();
}

/*
MAP TRANSITION HELPERS
----------------------
Purpose:
Find and draw client-side transition zones for testing, and detect whether
the local player is standing in one.

Includes:
- current-map transition filtering
- player-inside-transition check
- transition debug rendering
*/

function getPortalsForCurrentMap() {
  return MAP_PORTAL_LINKS.filter(
    (portal) => portal.fromMapKey === (currentMapKey || DEFAULT_MAP_KEY)
  );
}

function getPortalAtWorldPosition(worldX, worldY) {
  // Player state is stored in logical square-grid world coordinates. Pointer
  // input uses the separate isometric screen-to-tile conversion above.
  const tilePos = logicalWorldToTilePosition(worldX, worldY);
  if (!tilePos) return null;

  for (let markerY = tilePos.tileY - 2; markerY <= tilePos.tileY + 2; markerY++) {
    for (let markerX = tilePos.tileX - 2; markerX <= tilePos.tileX + 2; markerX++) {
      if (markerX < 0 || markerY < 0) continue;

      const objectFrame = getObjectFrameAt(markerX, markerY);
      if (objectFrame === null || objectFrame === OBJECT_EMPTY) continue;

      const portalKey = PORTAL_FRAME_KEYS[objectFrame];
      if (!portalKey) continue;

      const originX = markerX - 1;
      const originY = markerY - 1;

      const insideX = tilePos.tileX >= originX && tilePos.tileX < originX + 4;
      const insideY = tilePos.tileY >= originY && tilePos.tileY < originY + 4;

      if (!insideX || !insideY) continue;

      const portal = getPortalsForCurrentMap().find((entry) => entry.portalKey === portalKey);
      if (!portal) continue;

      return {
        portalKey,
        tileX: markerX,
        tileY: markerY,
        originTileX: originX,
        originTileY: originY,
        width: 4,
        height: 4,
        ...portal
      };
    }
  }

  return null;
}

function getPortalRuntimeKey(portal) {
  if (!portal) return "";
  return [
    portal.fromMapKey,
    portal.portalKey,
    portal.tileX,
    portal.tileY
  ].join(":");
}

function updateWorldPortalInteractionState(player) {
  if (!worldPortalLayer) return;

  if (activatingPortalKey && Date.now() >= activatingPortalUntil) {
    activatingPortalKey = null;
    activatingPortalUntil = 0;
  }

  const nearbyPortal = player && !objectEditorEnabled && !tileEditorEnabled && !metadataEditorEnabled
    ? getPortalAtWorldPosition(player.x ?? 0, player.y ?? 0)
    : null;

  worldPortalLayer.setInteractionState({
    nearbyPortalKey: nearbyPortal?.portalKey || null,
    activatingPortalKey
  });
}

function refreshTransitionDebugGraphics(scene) {
  if (!scene) return;

  if (!transitionDebugGraphics) {
    transitionDebugGraphics = scene.add.graphics();
  }

  transitionDebugGraphics.clear();
  transitionDebugGraphics.setDepth(900);

  const showDebug = isAdminUser() && (tileEditorEnabled || metadataEditorEnabled || objectEditorEnabled);
  if (!showDebug) return;

  for (let row = 0; row < roomObjectLayerMap.length; row++) {
    for (let col = 0; col < roomObjectLayerMap[row].length; col++) {
      const objectFrame = roomObjectLayerMap[row][col];

      if (objectFrame === PORTAL_SPAWN_FRAME) {
        transitionDebugGraphics.lineStyle(2, 0x66ff66, 0.95);
        transitionDebugGraphics.fillStyle(0x66ff66, 0.18);
        if (isIsometricMode()) {
          drawIsometricTileArea(transitionDebugGraphics, col, row, 1, 1, true);
          drawIsometricTileArea(transitionDebugGraphics, col, row);
        } else {
          const worldX = tileToWorldX(col);
          const worldY = tileToWorldY(row);
          transitionDebugGraphics.strokeRect(worldX, worldY, TILE_SIZE, TILE_SIZE);
          transitionDebugGraphics.fillRect(worldX, worldY, TILE_SIZE, TILE_SIZE);
        }
        continue;
      }

      const portalKey = PORTAL_FRAME_KEYS[objectFrame];
      if (!portalKey) continue;

      transitionDebugGraphics.lineStyle(2, 0x00ffff, 0.95);
      transitionDebugGraphics.fillStyle(0x00ffff, 0.12);
      if (isIsometricMode()) {
        drawIsometricTileArea(transitionDebugGraphics, col - 1, row - 1, 4, 4, true);
        drawIsometricTileArea(transitionDebugGraphics, col - 1, row - 1, 4, 4);
      } else {
        const worldX = tileToWorldX(col - 1);
        const worldY = tileToWorldY(row - 1);
        transitionDebugGraphics.strokeRect(worldX, worldY, TILE_SIZE * 4, TILE_SIZE * 4);
        transitionDebugGraphics.fillRect(worldX, worldY, TILE_SIZE * 4, TILE_SIZE * 4);
      }
    }
  }
}

function refreshPlayerDebugGraphics(scene) {
  if (!scene) return;

  if (!playerDebugGraphics) {
    playerDebugGraphics = scene.add.graphics();
  }

  playerDebugGraphics.clear();
  playerDebugGraphics.setDepth(901);

  const showDebug = isAdminUser() && (tileEditorEnabled || metadataEditorEnabled || objectEditorEnabled);
  if (!showDebug || !room?.state?.players || !myId) return;

  const me = room.state.players.get(myId);
  if (!me) return;

  const activePortal = getPortalAtWorldPosition(me.x, me.y);
  if (activePortal) {
    playerDebugGraphics.lineStyle(2, 0xffff66, 0.95);
    playerDebugGraphics.fillStyle(0xffff66, 0.10);
    if (isIsometricMode()) {
      drawIsometricTileArea(
        playerDebugGraphics,
        activePortal.originTileX,
        activePortal.originTileY,
        4,
        4,
        true
      );
      drawIsometricTileArea(
        playerDebugGraphics,
        activePortal.originTileX,
        activePortal.originTileY,
        4,
        4
      );
    } else {
      const worldX = tileToWorldX(activePortal.originTileX);
      const worldY = tileToWorldY(activePortal.originTileY);
      playerDebugGraphics.strokeRect(worldX, worldY, TILE_SIZE * 4, TILE_SIZE * 4);
      playerDebugGraphics.fillRect(worldX, worldY, TILE_SIZE * 4, TILE_SIZE * 4);
    }
  }

  const nearbyActionCenter = getNearestActionCenterForWorldPosition(me.x, me.y);
  if (nearbyActionCenter) {
    const radiusPx = isIsometricMode()
      ? ACTION_CENTER_RADIUS_TILES * ISO_TILE_HEIGHT
      : ACTION_CENTER_RADIUS_TILES * TILE_SIZE;
    const displayPosition = logicalWorldToDisplay(
      nearbyActionCenter.worldX,
      nearbyActionCenter.worldY
    );

    playerDebugGraphics.lineStyle(2, 0xff66ff, 0.95);
    playerDebugGraphics.strokeCircle(
      displayPosition.x,
      displayPosition.y,
      radiusPx
    );
  }
}

function updateStationMessage() {
  if (!room || !myId || !room.state || !room.state.players || !stationText) return;

  const me = room.state.players.get(myId);
  if (!me) return;

  const activePortal = getPortalAtWorldPosition(me.x, me.y);
  if (activePortal) {
    stationText.setText(
      activatingPortalKey === activePortal.portalKey
        ? `Opening portal to '${activePortal.label}'…`
        : `Press 'E' to enter '${activePortal.label}'`
    );
    return;
  }

  if (objectEditorEnabled || tileEditorEnabled || metadataEditorEnabled) {
    stationText.setText("");
    return;
  }

  const selectedMob = getSelectedTargetSnapshot();
  if (selectedMob) {
    const targetLabel = getAnimalVitalsLabel(selectedMob.kind, selectedMob.speciesKey);
    const requiredRange = selectedMob.incapacitated ? TILE_SIZE * 3 : getCurrentTaserRangePx();
    const inRange = !!getSelectedTargetInRange(me, requiredRange);
    stationText.setText(
      inRange
        ? selectedMob.incapacitated
          ? `Press E to collect targeted ${targetLabel}.`
          : `Press E to attack targeted ${targetLabel}.`
        : `Targeted ${targetLabel} is out of range.`
    );
    return;
  }

  const nearbyCollectable = getNearestVisibleCollectableNode(me.x, me.y);

  if (nearbyCollectable) {
    const actionLabel = getActionDisplayName(nearbyCollectable.action);
    const resourceLabel =
      nearbyCollectable.kind === "rock"
        ? "rock"
        : nearbyCollectable.kind === "pond"
          ? "pond"
          : nearbyCollectable.kind === "communication"
            ? "communication uplink"
            : "plant";

    const verbLabel =
      nearbyCollectable.kind === "plant"
        ? "collect"
        : nearbyCollectable.kind === "communication"
          ? "access"
        : actionLabel;

    stationText.setText(`Press E to ${verbLabel} ${resourceLabel}.`);
    return;
  }

  const nearbyActionCenter = getNearestActionCenterForWorldPosition(me.x, me.y);

  if (nearbyActionCenter) {
    stationText.setText(`Press E to ${getActionDisplayName(nearbyActionCenter.action)}.`);
    return;
  }

  stationText.setText("");
}

function createJoinUI() {
  const app = document.getElementById("app");

  const wrapper = document.createElement("div");
  wrapper.id = "join-ui";
  wrapper.style.position = "absolute";
  wrapper.style.inset = "0";
  wrapper.style.zIndex = "1000";
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.justifyContent = "center";
  wrapper.style.padding = "24px";
  wrapper.style.boxSizing = "border-box";
  wrapper.style.pointerEvents = "auto";
  wrapper.style.background = "radial-gradient(circle at 50% 36%, rgba(25, 76, 108, 0.52), rgba(4, 8, 14, 0.98) 68%)";

  const loginShell = document.createElement("div");
  loginShell.id = "login-shell";
  loginShell.style.display = "flex";
  loginShell.style.flexWrap = "wrap";
  loginShell.style.width = "min(920px, 100%)";
  loginShell.style.minHeight = "480px";
  loginShell.style.overflow = "hidden";
  loginShell.style.border = "1px solid rgba(102, 205, 255, 0.34)";
  loginShell.style.borderRadius = "20px";
  loginShell.style.background = "rgba(7, 13, 22, 0.92)";
  loginShell.style.boxShadow = "0 24px 80px rgba(0, 0, 0, 0.58), 0 0 42px rgba(26, 169, 222, 0.12)";
  loginShell.style.backdropFilter = "blur(12px)";

  const artworkPane = document.createElement("div");
  artworkPane.id = "login-artwork";
  artworkPane.style.flex = "1 1 440px";
  artworkPane.style.minHeight = "300px";
  artworkPane.style.position = "relative";
  artworkPane.style.display = "flex";
  artworkPane.style.flexDirection = "column";
  artworkPane.style.justifyContent = "flex-end";
  artworkPane.style.padding = "38px";
  artworkPane.style.boxSizing = "border-box";
  artworkPane.style.background = "linear-gradient(180deg, rgba(5, 12, 22, 0.04), rgba(5, 12, 22, 0.92)), radial-gradient(circle at 52% 38%, rgba(27, 206, 238, 0.34), transparent 44%), linear-gradient(135deg, #172943, #07101c 72%)";
  artworkPane.style.backgroundPosition = "center";
  artworkPane.style.backgroundSize = "cover";

  const gameTitle = document.createElement("div");
  gameTitle.textContent = "EPSILON ERIDANI EXPEDITION";
  gameTitle.style.color = "#ffffff";
  gameTitle.style.fontSize = "clamp(26px, 3vw, 42px)";
  gameTitle.style.fontWeight = "800";
  gameTitle.style.lineHeight = "1.05";
  gameTitle.style.letterSpacing = "0.04em";

  const gameSubtitle = document.createElement("div");
  gameSubtitle.textContent = "Explore. Research. Survive.";
  gameSubtitle.style.marginTop = "10px";
  gameSubtitle.style.color = "#9edcf2";
  gameSubtitle.style.fontSize = "15px";
  gameSubtitle.style.letterSpacing = "0.12em";
  gameSubtitle.style.textTransform = "uppercase";
  const loginFlight = document.createElement("div");
  loginFlight.className = "login-flight-scene";
  loginFlight.innerHTML = `<div class="login-star-stream" aria-hidden="true"></div><div class="login-asteroid a1"></div><div class="login-asteroid a2"></div><div class="login-asteroid a3"></div><img src="assets/ui/mission/e3-expedition-ship.png" alt="E3 expedition ship">`;
  artworkPane.appendChild(loginFlight);
  artworkPane.appendChild(gameTitle);
  artworkPane.appendChild(gameSubtitle);

  const formPanel = document.createElement("form");
  formPanel.id = "login-form";
  formPanel.style.flex = "0 1 360px";
  formPanel.style.display = "flex";
  formPanel.style.flexDirection = "column";
  formPanel.style.justifyContent = "center";
  formPanel.style.gap = "12px";
  formPanel.style.padding = "42px";
  formPanel.style.boxSizing = "border-box";

  const loginTitle = document.createElement("div");
  loginTitle.textContent = "MISSION ACCESS";
  loginTitle.style.color = "#ffffff";
  loginTitle.style.fontSize = "22px";
  loginTitle.style.fontWeight = "800";
  loginTitle.style.letterSpacing = "0.08em";
  loginTitle.style.marginBottom = "8px";
  formPanel.appendChild(loginTitle);

  const emailInput = document.createElement("input");
  emailInput.id = "email-input";
  emailInput.type = "email";
  emailInput.placeholder = "Email";
  emailInput.autocomplete = "off";
  emailInput.style.padding = "8px";
  emailInput.style.fontSize = "16px";
  emailInput.style.width = "100%";
  emailInput.style.boxSizing = "border-box";

  const passwordInput = document.createElement("input");
  passwordInput.id = "password-input";
  passwordInput.type = "password";
  passwordInput.placeholder = "Password";
  passwordInput.autocomplete = "off";
  passwordInput.style.padding = "8px";
  passwordInput.style.fontSize = "16px";
  passwordInput.style.width = "100%";
  passwordInput.style.boxSizing = "border-box";

  const nameInput = document.createElement("input");
  nameInput.id = "player-name-input";
  nameInput.type = "text";
  nameInput.placeholder = "Display name";
  nameInput.value = sessionStorage.getItem("playerName") || "";
  nameInput.maxLength = 20;
  nameInput.autocomplete = "off";
  nameInput.style.padding = "8px";
  nameInput.style.fontSize = "16px";
  nameInput.style.width = "100%";
  nameInput.style.boxSizing = "border-box";
  nameInput.style.display = "none";

  const classCodeInput = document.createElement("select");
  classCodeInput.id = "classCode";
  const savedClassCode = sessionStorage.getItem("classCode") || "";
  const savedClassServers = getConfiguredClassServers();
  classCodeInput.appendChild(new Option("Select a Google Classroom class…", ""));
  savedClassServers.forEach(({ code, name }) => classCodeInput.appendChild(new Option(`${name} · ${code}`, code)));
  classCodeInput.value = savedClassCode;
  classCodeInput.style.padding = "8px";
  classCodeInput.style.fontSize = "16px";
  classCodeInput.style.width = "100%";
  classCodeInput.style.boxSizing = "border-box";
  classCodeInput.style.display = "none";

  [emailInput, passwordInput, nameInput, classCodeInput].forEach((input) => {    input.addEventListener("keydown", (event) => event.stopPropagation());
    input.addEventListener("keyup", (event) => event.stopPropagation());
    input.addEventListener("keypress", (event) => event.stopPropagation());

    input.addEventListener("focus", () => {
      if (sceneRef?.input?.keyboard) {
        sceneRef.input.keyboard.enabled = false;
      }
    });

    input.addEventListener("blur", () => {
      if (sceneRef?.input?.keyboard) {
        sceneRef.input.keyboard.enabled = true;
      }
    });
  });

  const buttonRow = document.createElement("div");
  buttonRow.style.display = "flex";
  buttonRow.style.gap = "8px";

  const signUpButton = document.createElement("button");
  signUpButton.type = "button";
  signUpButton.textContent = "Sign Up";
  signUpButton.style.padding = "8px 12px";
  signUpButton.style.fontSize = "16px";
  signUpButton.style.cursor = "pointer";

  const signInButton = document.createElement("button");
  signInButton.type = "button";
  signInButton.textContent = "Sign In";
  signInButton.style.padding = "8px 12px";
  signInButton.style.fontSize = "16px";
  signInButton.style.cursor = "pointer";

  const googleSignInButton = document.createElement("button");
  googleSignInButton.type = "button";
  googleSignInButton.className = "google-sign-in-button";
  googleSignInButton.innerHTML = `<span aria-hidden="true">G</span> Sign in with Google`;
  googleSignInButton.addEventListener("click", async () => {
    googleSignInButton.disabled = true;
    localStatus.textContent = "Opening Google sign-in…";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` }
    });
    if (error) {
      googleSignInButton.disabled = false;
      localStatus.textContent = `Google sign-in failed: ${error.message}`;
    }
  });

  const joinButton = document.createElement("button");
  joinButton.type = "button";
  joinButton.textContent = "Opening dashboard…";
  joinButton.style.padding = "8px 12px";
  joinButton.style.fontSize = "16px";
  joinButton.style.cursor = "pointer";
  joinButton.disabled = true;
  joinButton.style.display = "none";

  const localStatus = document.createElement("div");
  localStatus.style.color = "white";
  localStatus.style.fontSize = "14px";
  localStatus.textContent = "Sign in first.";

/*
SIGN UP BUTTON HANDLER
----------------------
Purpose:
Creates a new Supabase account using email and password.

What it does:
1. Reads the email, password, and display name entered by the user.
2. Creates a new Supabase Auth account.
3. Stores the player's display name in the "profiles" table.
4. If signup creates an active session, the user is treated as signed in.
5. Locks the display name field so it cannot be changed after signup.
6. Enables the "Join Game" button.
*/

signUpButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const emailPrefix = email.split("@")[0].trim();
  const displayName = emailPrefix || "Player";

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    localStatus.textContent = `Sign up failed: ${error.message}`;
    return;
  }

  const sessionUser = data?.session?.user ?? null;
  authUser = sessionUser;

  if (sessionUser) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      user_id: sessionUser.id,
      display_name: displayName
    });

    if (profileError) {
      localStatus.textContent = `Profile save failed: ${profileError.message}`;
      return;
    }

    // Lock the display name so it cannot be changed after signup
    nameInput.value = displayName;
    nameInput.disabled = true;

    localStatus.textContent = "Sign up successful. You can join now.";
    authStatusText?.setText(`Signed in: ${email}`);
    authStatusText?.setColor("#7CFC00");

    restoreAllUIPanelState();
    updateProfileUI();
    joinButton.disabled = false;
    joinButton.click();

  } else {
    // Happens if Supabase requires email confirmation
    localStatus.textContent =
      "Account created. Confirm your email, then sign in.";
    joinButton.disabled = true;
  }
});

/*
SIGN IN BUTTON HANDLER
----------------------
Purpose:
Signs an existing player into Supabase.

Flow:
1. Reads the email and password entered by the user.
2. Signs in with Supabase Auth.
3. Loads the saved display name from the profiles table.
4. Fills the hidden display name field with the saved name.
5. Shows the class code input only for the admin account.
6. Enables the Join Game button.

Important:
Student class membership is no longer checked on the client here.
The server is the source of truth for assigning the student's class.
*/

signInButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    localStatus.textContent = `Sign in failed: ${error.message}`;
    return;
  }

  const sessionUser = data?.user ?? data?.session?.user ?? null;
  authUser = sessionUser;

  if (!sessionUser) {
    localStatus.textContent = "Sign in failed: no session user returned.";
    joinButton.disabled = true;
    return;
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", sessionUser.id)
    .single();

  if (profileError) {
    localStatus.textContent = `Profile load failed: ${profileError.message}`;
    joinButton.disabled = true;
    return;
  }

  const savedName = profileData?.display_name || "Player";
  nameInput.value = savedName;
  nameInput.disabled = true;

  const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (isAdmin) {
    classCodeInput.style.display = "none";
    classCodeInput.disabled = false;
    classCodeInput.value = sessionStorage.getItem("classCode") || savedClassServers[0]?.code || "";
    resolvedClassCode = "";
    resolvedClassName = "";
    localStatus.textContent = "Signed in. Opening the teacher dashboard…";
  } else {
    classCodeInput.style.display = "none";
    classCodeInput.value = "";
    resolvedClassCode = "";
    resolvedClassName = "";
    localStatus.textContent = "Signed in. Click Join Game.";
  }

  authStatusText?.setText(`Signed in: ${email}`);
  authStatusText?.setColor("#7CFC00");
  restoreAllUIPanelState();
    updateProfileUI();
  if (isAdmin) {
    localStatus.textContent = "Loading class servers…";
    try {
      const servers = await loadTeacherClassServers(data?.session?.access_token);
      try {
        latestClassroomStatus = await gameServerApi("/api/google/classroom/status");
      } catch (classroomError) {
        console.warn("Google Classroom status is unavailable:", classroomError);
        latestClassroomStatus = { configured: false, connected: false };
      }
      const rememberedCode = sessionStorage.getItem("classCode") || "";
      const selectedServer = servers.find((entry) => entry.code === rememberedCode) || servers[0] || null;
      if (selectedServer) {
        sessionStorage.setItem("classCode", selectedServer.code);
        localStatus.textContent = `Connecting to ${selectedServer.name}…`;
        const connected = await joinGame(savedName, selectedServer.code, currentMapKey || DEFAULT_MAP_KEY);
        if (!connected) {
          localStatus.textContent = `Signed in, but ${selectedServer.name} could not be connected.`;
          return;
        }
      }
      wrapper.remove();
      openStudentDashboard();
    } catch (classError) {
      console.error("Failed to load teacher classes:", classError);
      localStatus.textContent = `Teacher classes could not be loaded: ${classError.message}`;
    }
    return;
  }
  joinButton.disabled = false;
  joinButton.click();
});

/*
JOIN GAME BUTTON HANDLER
------------------------
Purpose:
Starts the game join process for an authenticated player.

Flow:
1. Confirms there is an active Supabase session.
2. Loads the saved display name from the profiles table.
3. Determines whether the signed-in account is admin.
4. Requires a typed class code only for admin.
5. Lets students join without sending a class code.
6. Calls joinGame() and removes the login UI only after a successful join.
*/
joinButton.addEventListener("click", async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUser = sessionData?.session?.user;

  if (!sessionUser) {
    localStatus.textContent = "You must be signed in before joining.";
    authStatusText?.setText("Not signed in");
    authStatusText?.setColor("#ff9999");
    return;
  }

  authUser = sessionUser;

  const { data: profileData, error: profileLoadError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", authUser.id)
    .single();

  if (profileLoadError || !profileData) {
    localStatus.textContent = "Could not load saved display name.";
    return;
  }

  const chosenName = profileData.display_name || "Player";
  const signedInEmail = sessionUser.email || "";
  const isAdmin = signedInEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  let enteredClassCode = classCodeInput.value.trim().toUpperCase();

  if (!isAdmin) {
    try {
      localStatus.textContent = "Finding your class…";
      const assignedClass = await gameServerApi("/api/student/class");
      enteredClassCode = assignedClass.code || "";
      resolvedClassCode = assignedClass.code || "";
      resolvedClassName = assignedClass.name || assignedClass.code || "";
    } catch (classError) {
      localStatus.textContent = classError?.message || "Your account is not assigned to a class yet.";
      return;
    }
  }

  if (isAdmin && !enteredClassCode) {
    enteredClassCode = savedClassServers[0]?.code || "";
    classCodeInput.value = enteredClassCode;
  }

  if (isAdmin && !enteredClassCode) {
    wrapper.remove();
    openStudentDashboard();
    return;
  }

  if (isAdmin) {
    sessionStorage.setItem("classCode", enteredClassCode);
  }

  sessionStorage.setItem("playerName", chosenName);
  nameInput.value = chosenName;

  if (sceneRef?.input?.keyboard) {
    sceneRef.input.keyboard.enabled = true;
    sceneRef.input.keyboard.resetKeys();
  }

  const success = await joinGame(
    chosenName,
    enteredClassCode,
    currentMapKey || DEFAULT_MAP_KEY
  );

  if (success) {
    wrapper.remove();
    openStudentDashboard();
  } else {
    localStatus.textContent = "Failed to join the game.";
  }
});

  buttonRow.appendChild(signUpButton);
  buttonRow.appendChild(signInButton);

  formPanel.appendChild(emailInput);
  formPanel.appendChild(passwordInput);
  formPanel.appendChild(nameInput);
  formPanel.appendChild(buttonRow);
  formPanel.appendChild(googleSignInButton);
  formPanel.appendChild(joinButton);
  formPanel.appendChild(localStatus);
  formPanel.addEventListener("submit", (event) => {
    event.preventDefault();
    signInButton.click();
  });

  loginShell.appendChild(artworkPane);
  loginShell.appendChild(formPanel);
  wrapper.appendChild(loginShell);

  app.appendChild(wrapper);

  supabase.auth.getSession().then(async ({ data }) => {
    const sessionUser = data?.session?.user;
    if (!sessionUser || !document.body.contains(wrapper)) return;
    authUser = sessionUser;
    const displayName = sessionUser.user_metadata?.display_name || sessionUser.email?.split("@")[0] || "Student";
    await supabase.from("profiles").upsert({ user_id: sessionUser.id, display_name: displayName }, { onConflict: "user_id" });
    emailInput.value = sessionUser.email || "";
    nameInput.value = displayName;
    if ((sessionUser.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      localStatus.textContent = "Google account confirmed. Loading teacher classes…";
      const servers = await loadTeacherClassServers(data.session.access_token);
      try {
        latestClassroomStatus = await gameServerApi("/api/google/classroom/status");
      } catch (error) {
        console.warn("Google Classroom status is unavailable:", error);
      }
      const rememberedCode = sessionStorage.getItem("classCode") || "";
      const selectedServer = servers.find((entry) => entry.code === rememberedCode) || servers[0] || null;
      if (selectedServer) {
        sessionStorage.setItem("classCode", selectedServer.code);
        const connected = await joinGame(displayName, selectedServer.code, currentMapKey || DEFAULT_MAP_KEY);
        if (!connected) throw new Error(`Could not connect to ${selectedServer.name}.`);
      }
      wrapper.remove();
      openStudentDashboard();
      return;
    }
    localStatus.textContent = "Account confirmed. Finding your class…";
    joinButton.disabled = false;
    joinButton.click();
  }).catch((error) => {
    console.warn("Existing Google session could not be resumed:", error);
    localStatus.textContent = error?.message || "Google sign-in could not be completed.";
  });

  setTimeout(() => emailInput.focus(), 50);
}

/*
OXYGEN PANEL UI
---------------
Purpose:
Creates a compact DOM stamina/oxygen panel in the top-left.

Includes:
- player oxygen display
- herbivore stamina display
- click-to-toggle text/bar mode per section
*/

function createOxygenRow({
  labelHtml = "",
  accentColor = "rgba(120, 200, 255, 0.95)",
  defaultValueText = ""
} = {}) {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.flexDirection = "row";
  row.style.alignItems = "center";
  row.style.gap = "8px";
  row.style.flex = "1";
  row.style.minWidth = "0";
  row.style.padding = "8px";
  row.style.borderRadius = "8px";
  row.style.border = "1px solid rgba(255, 255, 255, 0.10)";
  row.style.background = "rgba(255, 255, 255, 0.04)";
  row.style.cursor = "default";
  row.style.textAlign = "left";

  const label = document.createElement("div");
  label.innerHTML = labelHtml;
  label.style.color = "#dfe9f7";
  label.style.fontSize = "13px";
  label.style.fontWeight = "600";
  label.style.letterSpacing = "0.02em";
  label.style.flex = "0 0 auto";
  label.style.minWidth = "22px";

  const value = document.createElement("div");
  value.textContent = defaultValueText;
  value.style.color = "#ffffff";
  value.style.fontSize = "14px";
  value.style.fontWeight = "700";
  value.style.flex = "0 0 auto";
  value.style.minWidth = "48px";

  const track = document.createElement("div");
  track.style.position = "relative";
  track.style.height = "12px";
  track.style.flex = "1";
  track.style.minWidth = "60px";
  track.style.borderRadius = "999px";
  track.style.overflow = "hidden";
  track.style.background = "rgba(255, 255, 255, 0.08)";
  track.style.border = "1px solid rgba(255, 255, 255, 0.08)";
  track.style.display = "none";

  const fill = document.createElement("div");
  fill.style.width = "100%";
  fill.style.height = "100%";
  fill.style.borderRadius = "999px";
  fill.style.background = accentColor;
  fill.style.boxShadow = `0 0 10px ${accentColor}`;
  track.appendChild(fill);

  row.appendChild(label);
  row.appendChild(value);
  row.appendChild(track);

  return {
    root: row,
    label,
    value,
    track,
    fill
  };
}

function refreshOxygenRowDisplayMode(valueEl, trackEl, mode) {
  if (!valueEl || !trackEl) return;

  const showBar = mode === "bar";
  valueEl.style.display = showBar ? "none" : "block";
  trackEl.style.display = showBar ? "block" : "none";
}

function createOxygenUI() {
  oxygenPanel = createUIPanel({
    x: 14,
    y: 52,
    width: 180,
    height: 92
  });

  if (!oxygenPanel) {
    console.warn("Failed to create oxygen panel.");
    return;
  }

  oxygenPanel.id = "oxygen-ui";
  restoreUIPanelState(oxygenPanel);
  oxygenPanel.style.pointerEvents = "auto";
  oxygenPanel.style.padding = "8px 10px";
  oxygenPanel.style.gap = "8px";
  oxygenPanel.style.height = "auto";

  const body = attachUIPanelFrame(oxygenPanel, {
    title: "Player Status",
    collapsible: false,
    bodyDisplay: "flex",
    bodyGap: "8px"
  });

  if (!body) {
    console.warn("Failed to create oxygen panel body.");
    return;
  }

  oxygenPanelBody = body;

  const healthRow = createOxygenRow({
    labelHtml: "EN",
    accentColor: "rgba(255, 202, 84, 0.95)",
    defaultValueText: "100/100"
  });
  playerHealthValue = healthRow.value;
  playerHealthBarTrack = healthRow.track;
  playerHealthBarFill = healthRow.fill;
  refreshOxygenRowDisplayMode(playerHealthValue, playerHealthBarTrack, "bar");

  const playerRow = createOxygenRow({
    labelHtml: getOxygenLabelHtml(),
    accentColor: "rgba(110, 220, 140, 0.95)",
    defaultValueText: "100/100"
  });

  if (!playerRow?.root) {
    console.warn("Failed to create oxygen row UI.");
    return;
  }

  oxygenPlayerRow = playerRow.root;

  oxygenPlayerLabel = playerRow.label;
  oxygenPlayerValue = playerRow.value;
  oxygenPlayerBarTrack = playerRow.track;
  oxygenPlayerBarFill = playerRow.fill;

  refreshOxygenRowDisplayMode(
    oxygenPlayerValue,
    oxygenPlayerBarTrack,
    oxygenPlayerDisplayMode
  );

  body.style.flexDirection = "column";
  body.style.alignItems = "stretch";

  body.appendChild(healthRow.root);
  body.appendChild(oxygenPlayerRow);
}

function createGraphCanvas(width = 320, height = 180) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = "100%";
  canvas.style.maxWidth = `${width}px`;
  canvas.style.boxSizing = "border-box";
  canvas.style.height = `${height}px`;
  canvas.style.background = "rgba(255,255,255,0.04)";
  canvas.style.border = "1px solid rgba(255,255,255,0.08)";
  canvas.style.borderRadius = "8px";
  return canvas;
}

function createEcosystemGraphUI() {
  ecosystemGraphPanel = createUIPanel({
    x: 620,
    y: 52,
    width: 360,
    height: 250
  });

  if (!ecosystemGraphPanel) return;

  ecosystemGraphPanel.id = "ecosystem-graph-ui";
  restoreUIPanelState(ecosystemGraphPanel);
  ecosystemGraphPanel.style.pointerEvents = "auto";

  const body = attachUIPanelFrame(ecosystemGraphPanel, {
    title: "Ecosystem Counts",
    collapsible: true,
    bodyDisplay: "flex",
    bodyGap: "8px"
  });

  if (!body) return;

  body.style.flexDirection = "column";

  ecosystemGraphCanvas = createGraphCanvas(320, 180);
  ecosystemGraphCtx = ecosystemGraphCanvas.getContext("2d");

  body.appendChild(ecosystemGraphCanvas);
}

function createEcosystemCounterGraphUI() {
  ecosystemCounterGraphPanel = createUIPanel({
    x: 620,
    y: 318,
    width: 360,
    height: 250
  });

  if (!ecosystemCounterGraphPanel) return;

  ecosystemCounterGraphPanel.id = "ecosystem-counter-graph-ui";
  restoreUIPanelState(ecosystemCounterGraphPanel);
  ecosystemCounterGraphPanel.style.pointerEvents = "auto";

  const body = attachUIPanelFrame(ecosystemCounterGraphPanel, {
    title: "Plant Counter Total",
    collapsible: true,
    bodyDisplay: "flex",
    bodyGap: "8px"
  });

  if (!body) return;

  body.style.flexDirection = "column";

  ecosystemCounterGraphCanvas = createGraphCanvas(320, 180);
  ecosystemCounterGraphCtx = ecosystemCounterGraphCanvas.getContext("2d");

  body.appendChild(ecosystemCounterGraphCanvas);
}

function createAnimalVitalsUI() {
  animalVitalsPanel = createUIPanel({
    x: 386,
    y: 52,
    width: 220,
    height: 92
  });

  if (!animalVitalsPanel) {
    console.warn("Failed to create animal vitals panel.");
    return;
  }

  animalVitalsPanel.id = "animal-vitals-ui";
  restoreUIPanelState(animalVitalsPanel);
  animalVitalsPanel.style.pointerEvents = "auto";
  animalVitalsPanel.style.padding = "8px 10px";
  animalVitalsPanel.style.gap = "8px";
  animalVitalsPanel.style.height = "auto";
  animalVitalsPanel.style.display = "flex";

  const body = attachUIPanelFrame(animalVitalsPanel, {
    title: "Target",
    collapsible: false,
    bodyDisplay: "flex",
    bodyGap: "8px"
  });

  if (!body) {
    console.warn("Failed to create animal vitals body.");
    return;
  }

  animalVitalsPanelBody = body;

  const herbivoreRow = createOxygenRow({
    labelHtml: "No Target",
    accentColor: "rgba(255, 210, 122, 0.95)",
    defaultValueText: "—"
  });

  if (!herbivoreRow?.root) {
    console.warn("Failed to create animal vitals row.");
    return;
  }

  oxygenHerbivoreRow = herbivoreRow.root;
  oxygenHerbivoreLabel = herbivoreRow.label;
  oxygenHerbivoreValue = herbivoreRow.value;
  oxygenHerbivoreBarTrack = herbivoreRow.track;
  oxygenHerbivoreBarFill = herbivoreRow.fill;

  refreshOxygenRowDisplayMode(
    oxygenHerbivoreValue,
    oxygenHerbivoreBarTrack,
    oxygenHerbivoreDisplayMode
  );

  body.style.flexDirection = "row";
  body.style.alignItems = "stretch";
  body.appendChild(oxygenHerbivoreRow);
}

/*
INVENTORY PANEL UI
------------------
Purpose:
Creates a draggable, collapsible inventory panel with slot tiles.

Includes:
- shared panel header
- collapsible inventory body
- item slot grid
- empty placeholders
*/

function createInventoryUI() {
  inventoryPanel = createUIPanel({
    x: 490,
    y: 110,
    width: 290,
    height: 250
  });

  if (!inventoryPanel) return;

  inventoryPanel.id = "inventory-ui";
  restoreUIPanelState(inventoryPanel);

  const panelBody = attachUIPanelFrame(inventoryPanel, {
    title: "Inventory",
    collapsible: true,
    bodyDisplay: "flex",
    bodyGap: "0"
  });

  inventoryDeleteButton = document.createElement("button");
  inventoryDeleteButton.type = "button";
  inventoryDeleteButton.textContent = "Delete 1";
  inventoryDeleteButton.title = "Select an inventory item, then delete one count";
  inventoryDeleteButton.disabled = true;
  inventoryDeleteButton.style.height = "24px";
  inventoryDeleteButton.style.padding = "0 8px";
  inventoryDeleteButton.style.borderRadius = "6px";
  inventoryDeleteButton.style.border = "1px solid rgba(255, 112, 112, 0.42)";
  inventoryDeleteButton.style.background = "rgba(125, 36, 36, 0.58)";
  inventoryDeleteButton.style.color = "#ffe4e4";
  inventoryDeleteButton.style.fontSize = "10px";
  inventoryDeleteButton.style.fontWeight = "700";
  inventoryDeleteButton.style.cursor = "default";
  inventoryDeleteButton.style.opacity = "0.45";
  inventoryDeleteButton.addEventListener("click", () => {
    if (!selectedInventoryKey || inventoryDeleteButton.disabled) return;
    sendRoomMessage("delete_inventory_item", { itemId: selectedInventoryKey });
  });
  inventoryPanel._panelControls?.insertBefore(
    inventoryDeleteButton,
    inventoryPanel._panelControls.firstChild
  );

  inventoryArtifactButton = document.createElement("button");
  inventoryArtifactButton.type = "button";
  inventoryArtifactButton.textContent = "Signal 0/5";
  inventoryArtifactButton.title = "Collect five Alien Artifacts to trigger a global alien event";
  inventoryArtifactButton.style.height = "24px";
  inventoryArtifactButton.style.padding = "0 8px";
  inventoryArtifactButton.style.borderRadius = "6px";
  inventoryArtifactButton.style.border = "1px solid rgba(139, 102, 255, 0.55)";
  inventoryArtifactButton.style.background = "rgba(75, 37, 132, 0.62)";
  inventoryArtifactButton.style.color = "#f0e7ff";
  inventoryArtifactButton.style.fontSize = "10px";
  inventoryArtifactButton.style.fontWeight = "700";
  inventoryArtifactButton.addEventListener("click", () => {
    if (inventoryArtifactButton.disabled) return;
    if (!window.confirm("Consume 5 Alien Artifacts and trigger a global alien event on this map?")) return;
    sendRoomMessage("summon_alien_artifact");
  });
  inventoryPanel._panelControls?.insertBefore(
    inventoryArtifactButton,
    inventoryDeleteButton
  );

  inventoryPanelBody = document.createElement("div");
  inventoryPanelBody.id = "inventory-panel-body";
  inventoryPanelBody.style.display = "grid";
  inventoryPanelBody.style.gridTemplateColumns = `repeat(${INVENTORY_COLUMNS}, 52px)`;
  inventoryPanelBody.style.gap = "10px";
  inventoryPanelBody.style.justifyContent = "start";
  inventoryPanelBody.style.justifyItems = "center";
  inventoryPanelBody.style.alignContent = "start";
  inventoryPanelBody.style.background = "rgba(255, 255, 255, 0.05)";
  inventoryPanelBody.style.border = "1px solid rgba(255, 255, 255, 0.08)";
  inventoryPanelBody.style.borderRadius = "6px";
  inventoryPanelBody.style.padding = "10px";
  inventoryPanelBody.style.flex = "1";
  inventoryPanelBody.style.minHeight = "0";
  inventoryPanelBody.style.overflowY = "hidden";
  inventoryPanelBody.style.overflowX = "hidden";

  panelBody.appendChild(inventoryPanelBody);

  inventorySlotMap = {};

  for (let i = 0; i < currentInventorySlotCount; i++) {
    const slot = createInventorySlot(i);
    inventorySlotMap[`slot_${i}`] = slot;
    inventoryPanelBody.appendChild(slot.root);
  }

  updateInventoryUI({});
}

function ensureInventorySlotCapacity(requestedSlotCount) {
  const nextSlotCount = Math.max(
    BASE_INVENTORY_SLOT_COUNT,
    Math.min(MAX_INVENTORY_SLOT_COUNT, Math.floor(Number(requestedSlotCount) || BASE_INVENTORY_SLOT_COUNT))
  );
  if (nextSlotCount === currentInventorySlotCount) return;

  if (inventoryPanelBody) {
    if (nextSlotCount > currentInventorySlotCount) {
      for (let index = currentInventorySlotCount; index < nextSlotCount; index++) {
        const slot = createInventorySlot(index);
        inventorySlotMap[`slot_${index}`] = slot;
        inventoryPanelBody.appendChild(slot.root);
      }
    } else {
      for (let index = currentInventorySlotCount - 1; index >= nextSlotCount; index--) {
        inventorySlotMap[`slot_${index}`]?.root?.remove();
        delete inventorySlotMap[`slot_${index}`];
      }
    }
  }

  currentInventorySlotCount = nextSlotCount;
  if (inventoryPanel) {
    inventoryPanel._expandedHeight = 250;
    if (!inventoryPanel._isCollapsed) {
      inventoryPanel.style.height = `${inventoryPanel._expandedHeight}px`;
    }
  }
  if (inventoryPanelBody) {
    inventoryPanelBody.style.overflowY = nextSlotCount > BASE_INVENTORY_SLOT_COUNT ? "auto" : "hidden";
    inventoryPanelBody.style.paddingRight = nextSlotCount > BASE_INVENTORY_SLOT_COUNT ? "6px" : "10px";
  }
  updateInventoryUI(latestInventoryCounts);
  window.requestAnimationFrame(applyDefaultHUDLayout);
}

/*
QUEST PANEL UI
--------------
Shows up to five communication quests directly below Inventory. Clicking a
quest opens the centered inventory turn-in window, where eligible items are
selected before the server consumes them and awards the quest token.
*/
function createQuestUI() {
  questPanel = createUIPanel({
    x: 490,
    y: 370,
    width: 290,
    height: 170
  });
  if (!questPanel) return;

  questPanel.id = "quest-ui";
  restoreUIPanelState(questPanel);
  const panelBody = attachUIPanelFrame(questPanel, {
    title: "Quests",
    collapsible: true,
    bodyDisplay: "flex",
    bodyGap: "6px"
  });
  questActiveSummary = document.createElement("span");
  questActiveSummary.textContent = "0/5 active";
  questActiveSummary.style.fontSize = "11px";
  questActiveSummary.style.fontWeight = "500";
  questActiveSummary.style.color = "rgba(205, 226, 245, 0.72)";
  questActiveSummary.style.whiteSpace = "nowrap";
  questPanel._panelControls?.insertBefore(
    questActiveSummary,
    questPanel._panelControls.firstChild
  );
  panelBody.style.minWidth = "0";
  panelBody.style.flexDirection = "column";
  panelBody.style.alignItems = "stretch";
  panelBody.style.overflow = "hidden";
  questPanelBody = document.createElement("div");
  questPanelBody.id = "quest-panel-body";
  questPanelBody.style.display = "flex";
  questPanelBody.style.flexDirection = "column";
  questPanelBody.style.gap = "6px";
  questPanelBody.style.width = "100%";
  questPanelBody.style.boxSizing = "border-box";
  questPanelBody.style.minHeight = "0";
  questPanelBody.style.flex = "1 1 auto";
  questPanelBody.style.overflowY = "auto";
  questPanelBody.style.overflowX = "hidden";
  questPanelBody.style.paddingRight = "4px";
  questPanelBody.style.scrollbarGutter = "stable";
  panelBody.appendChild(questPanelBody);
  createQuestTurnInUI();
  updateQuestUI(latestQuestSnapshot);
}

function resizeQuestPanelToContent() {
  if (!questPanel || !questPanelBody || questPanel._isCollapsed) return;
  window.requestAnimationFrame(() => {
    if (!questPanel || !questPanelBody || questPanel._isCollapsed) return;
    const panelStyle = window.getComputedStyle(questPanel);
    const verticalPadding =
      (parseFloat(panelStyle.paddingTop) || 0) +
      (parseFloat(panelStyle.paddingBottom) || 0);
    const panelGap = parseFloat(panelStyle.rowGap || panelStyle.gap) || 0;
    const headerHeight = questPanel._panelHeader?.getBoundingClientRect?.().height || 24;
    const rows = [...questPanelBody.children];
    const visibleRows = rows.slice(0, 2);
    const visibleContentHeight = visibleRows.reduce(
      (height, row) => height + Math.ceil(row.getBoundingClientRect().height),
      0
    ) + Math.max(0, visibleRows.length - 1) * 6;
    const desiredHeight = Math.max(
      96,
      Math.ceil(verticalPadding + panelGap + headerHeight + Math.min(116, visibleContentHeight || 52))
    );
    questPanel._expandedHeight = desiredHeight;
    questPanel.style.height = `${desiredHeight}px`;
    window.requestAnimationFrame(applyDefaultHUDLayout);
  });
}

function closeQuestAcquiredPopup() {
  if (questAcquiredPopupTimer) {
    window.clearTimeout(questAcquiredPopupTimer);
    questAcquiredPopupTimer = null;
  }
  questAcquiredPopup?.remove();
  questAcquiredPopup = null;
}

function showQuestAcquiredPopup(quest = {}) {
  if (!uiRoot) return;
  closeQuestAcquiredPopup();

  const quality = quest.rewardQuality || quest.minimumQuality || "common";
  const qualityDef = ITEM_QUALITY_DEFS[quality] || ITEM_QUALITY_DEFS.common;
  const itemDef = getInventoryItemDefByKey(`${quest.resourceKey || "rock_sample"}:${quest.minimumQuality || "common"}`);
  const popup = document.createElement("section");
  popup.setAttribute("role", "status");
  popup.setAttribute("aria-live", "polite");
  popup.style.position = "absolute";
  popup.style.left = "50%";
  popup.style.top = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.width = "min(500px, calc(100vw - 40px))";
  popup.style.display = "grid";
  popup.style.gridTemplateColumns = "82px 1fr";
  popup.style.gap = "16px";
  popup.style.alignItems = "center";
  popup.style.padding = "20px";
  popup.style.boxSizing = "border-box";
  popup.style.border = `2px solid ${qualityDef.borderColor}`;
  popup.style.borderRadius = "16px";
  popup.style.color = "#f4fbff";
  popup.style.background = "linear-gradient(135deg, rgba(6,18,29,.98), rgba(20,44,59,.96))";
  popup.style.boxShadow = `0 22px 70px rgba(0,0,0,.68), 0 0 35px ${qualityDef.glowColor}`;
  popup.style.pointerEvents = "none";
  popup.style.zIndex = "2700";

  const iconShell = document.createElement("div");
  iconShell.style.width = "78px";
  iconShell.style.height = "78px";
  iconShell.style.display = "flex";
  iconShell.style.alignItems = "center";
  iconShell.style.justifyContent = "center";
  iconShell.style.borderRadius = "14px";
  iconShell.style.background = qualityDef.glowColor;
  const icon = document.createElement("img");
  icon.src = itemDef?.imageSrc || "";
  icon.alt = "";
  icon.style.width = "64px";
  icon.style.height = "64px";
  icon.style.objectFit = "contain";
  icon.style.imageRendering = "pixelated";
  iconShell.appendChild(icon);

  const copy = document.createElement("div");
  const eyebrow = document.createElement("div");
  eyebrow.textContent = "NEW COMMUNICATION QUEST";
  eyebrow.style.color = "#77eaff";
  eyebrow.style.fontSize = "11px";
  eyebrow.style.fontWeight = "800";
  eyebrow.style.letterSpacing = ".15em";
  const heading = document.createElement("div");
  heading.textContent = `${qualityDef.label} Quest`;
  heading.style.marginTop = "5px";
  heading.style.color = qualityDef.borderColor;
  heading.style.fontSize = "25px";
  heading.style.fontWeight = "850";
  const description = document.createElement("div");
  description.textContent =
    `Collect ${Math.max(1, Number(quest.requiredCount) || 1)} ${ITEM_QUALITY_DEFS[quest.minimumQuality]?.label || "Common"} or higher ${quest.resourceLabel || "samples"}. ` +
    `Completion awards one ${qualityDef.label.toLowerCase()} quest token.`;
  description.style.marginTop = "8px";
  description.style.color = "rgba(225,240,249,.84)";
  description.style.fontSize = "13px";
  description.style.lineHeight = "1.45";
  copy.appendChild(eyebrow);
  copy.appendChild(heading);
  copy.appendChild(description);
  popup.appendChild(iconShell);
  popup.appendChild(copy);
  uiRoot.appendChild(popup);
  questAcquiredPopup = popup;

  popup.animate(
    [
      { opacity: 0, transform: "translate(-50%, calc(-50% + 24px)) scale(.92)" },
      { opacity: 1, transform: "translate(-50%, -50%) scale(1)" }
    ],
    { duration: 320, easing: "cubic-bezier(.18,.78,.22,1)", fill: "forwards" }
  );
  questAcquiredPopupTimer = window.setTimeout(() => {
    const animation = popup.animate(
      [
        { opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
        { opacity: 0, transform: "translate(-50%, calc(-50% - 18px)) scale(.96)" }
      ],
      { duration: 300, easing: "ease-in", fill: "forwards" }
    );
    animation.finished.finally(closeQuestAcquiredPopup);
  }, 4200);
}

function createQuestTurnInUI() {
  if (!uiRoot || questTurnInOverlay) return;

  questTurnInOverlay = document.createElement("div");
  questTurnInOverlay.id = "quest-turn-in-overlay";
  questTurnInOverlay.style.position = "absolute";
  questTurnInOverlay.style.inset = "0";
  questTurnInOverlay.style.display = "none";
  questTurnInOverlay.style.alignItems = "center";
  questTurnInOverlay.style.justifyContent = "center";
  questTurnInOverlay.style.padding = "24px";
  questTurnInOverlay.style.boxSizing = "border-box";
  questTurnInOverlay.style.background = "rgba(2, 7, 14, 0.72)";
  questTurnInOverlay.style.backdropFilter = "blur(5px)";
  questTurnInOverlay.style.pointerEvents = "auto";
  questTurnInOverlay.style.zIndex = "2600";

  const dialog = document.createElement("div");
  dialog.style.width = "min(680px, calc(100vw - 48px))";
  dialog.style.maxHeight = "min(650px, calc(100vh - 48px))";
  dialog.style.display = "flex";
  dialog.style.flexDirection = "column";
  dialog.style.gap = "12px";
  dialog.style.padding = "16px";
  dialog.style.boxSizing = "border-box";
  dialog.style.border = "1px solid rgba(91, 222, 255, 0.48)";
  dialog.style.borderRadius = "12px";
  dialog.style.background = "linear-gradient(180deg, rgba(10, 24, 38, 0.98), rgba(5, 13, 23, 0.98))";
  dialog.style.boxShadow = "0 22px 70px rgba(0, 0, 0, 0.65), 0 0 28px rgba(49, 203, 240, 0.14)";
  dialog.addEventListener("click", (event) => event.stopPropagation());

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.gap = "12px";

  const heading = document.createElement("div");
  heading.textContent = "Quest Inventory Turn-In";
  heading.style.fontFamily = "Georgia, serif";
  heading.style.fontSize = "20px";
  heading.style.fontWeight = "700";
  heading.style.color = "#ffffff";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "×";
  closeButton.title = "Close";
  closeButton.style.width = "34px";
  closeButton.style.height = "34px";
  closeButton.style.border = "1px solid rgba(255,255,255,0.18)";
  closeButton.style.borderRadius = "8px";
  closeButton.style.background = "rgba(255,255,255,0.08)";
  closeButton.style.color = "#ffffff";
  closeButton.style.fontSize = "22px";
  closeButton.style.cursor = "pointer";
  closeButton.addEventListener("click", closeQuestTurnInUI);
  header.appendChild(heading);
  header.appendChild(closeButton);

  questTurnInRequirement = document.createElement("div");
  questTurnInRequirement.style.padding = "10px 12px";
  questTurnInRequirement.style.borderRadius = "8px";
  questTurnInRequirement.style.background = "rgba(58, 191, 221, 0.10)";
  questTurnInRequirement.style.color = "rgba(226, 246, 255, 0.94)";
  questTurnInRequirement.style.fontSize = "14px";

  questTurnInGrid = document.createElement("div");
  questTurnInGrid.style.display = "grid";
  questTurnInGrid.style.gridTemplateColumns = "repeat(auto-fill, minmax(132px, 1fr))";
  questTurnInGrid.style.gap = "10px";
  questTurnInGrid.style.minHeight = "150px";
  questTurnInGrid.style.maxHeight = "360px";
  questTurnInGrid.style.overflowY = "auto";
  questTurnInGrid.style.padding = "4px";

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.alignItems = "center";
  footer.style.justifyContent = "space-between";
  footer.style.gap = "12px";

  questTurnInCounter = document.createElement("div");
  questTurnInCounter.style.fontSize = "14px";
  questTurnInCounter.style.fontWeight = "700";
  questTurnInCounter.style.color = "#bfefff";

  const footerActions = document.createElement("div");
  footerActions.style.display = "flex";
  footerActions.style.alignItems = "center";
  footerActions.style.gap = "8px";

  questTurnInAbandonButton = document.createElement("button");
  questTurnInAbandonButton.type = "button";
  questTurnInAbandonButton.textContent = "Abandon";
  questTurnInAbandonButton.style.padding = "10px 14px";
  questTurnInAbandonButton.style.border = "1px solid rgba(255, 116, 116, 0.50)";
  questTurnInAbandonButton.style.borderRadius = "8px";
  questTurnInAbandonButton.style.background = "rgba(125, 36, 36, 0.62)";
  questTurnInAbandonButton.style.color = "#ffe4e4";
  questTurnInAbandonButton.style.fontWeight = "700";
  questTurnInAbandonButton.style.cursor = "pointer";
  questTurnInAbandonButton.addEventListener("click", () => {
    const quest = getActiveQuestTurnIn();
    if (!quest || questTurnInSubmitting) return;
    if (window.confirm("Abandon this quest? Its progress will be lost.")) {
      sendRoomMessage("discard_quest", { questId: quest.id });
    }
  });

  questTurnInSubmitButton = document.createElement("button");
  questTurnInSubmitButton.type = "button";
  questTurnInSubmitButton.style.minWidth = "170px";
  questTurnInSubmitButton.style.padding = "10px 16px";
  questTurnInSubmitButton.style.border = "1px solid rgba(94, 235, 164, 0.58)";
  questTurnInSubmitButton.style.borderRadius = "8px";
  questTurnInSubmitButton.style.background = "rgba(30, 132, 83, 0.72)";
  questTurnInSubmitButton.style.color = "#ffffff";
  questTurnInSubmitButton.style.fontWeight = "700";
  questTurnInSubmitButton.style.cursor = "pointer";
  questTurnInSubmitButton.addEventListener("click", submitQuestTurnIn);
  footerActions.appendChild(questTurnInAbandonButton);
  footerActions.appendChild(questTurnInSubmitButton);
  footer.appendChild(questTurnInCounter);
  footer.appendChild(footerActions);

  dialog.appendChild(header);
  dialog.appendChild(questTurnInRequirement);
  dialog.appendChild(questTurnInGrid);
  dialog.appendChild(footer);
  questTurnInOverlay.appendChild(dialog);
  questTurnInOverlay.addEventListener("click", closeQuestTurnInUI);
  uiRoot.appendChild(questTurnInOverlay);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isQuestTurnInOpen() && !questTurnInSubmitting) {
      closeQuestTurnInUI();
    }
  });
}

function getActiveQuestTurnIn() {
  return latestQuestSnapshot.quests.find((quest) => quest.id === activeQuestTurnInId) || null;
}

function isInventoryItemEligibleForQuest(itemKey, quest) {
  if (!quest) return false;
  const parsed = parseInventoryItemKey(itemKey);
  return parsed.baseKey === quest.resourceKey &&
    (ITEM_QUALITY_RANK[parsed.quality] ?? -1) >= (ITEM_QUALITY_RANK[quest.minimumQuality] ?? 0);
}

function getQuestTurnInSelectedCount() {
  return Object.values(questTurnInSelection).reduce(
    (total, quantity) => total + Math.max(0, Number(quantity) || 0),
    0
  );
}

function openQuestTurnInUI(questId) {
  const quest = latestQuestSnapshot.quests.find((entry) => entry.id === questId);
  if (!quest || quest.status === "submitting") return;
  createQuestTurnInUI();
  activeQuestTurnInId = quest.id;
  questTurnInSelection = {};
  questTurnInSubmitting = false;
  questTurnInOverlay.style.display = "flex";
  renderQuestTurnInUI();
}

function closeQuestTurnInUI() {
  if (!questTurnInOverlay || questTurnInSubmitting) return;
  questTurnInOverlay.style.display = "none";
  activeQuestTurnInId = null;
  questTurnInSelection = {};
}

function adjustQuestTurnInSelection(itemKey, delta) {
  const quest = getActiveQuestTurnIn();
  if (!quest || questTurnInSubmitting || !isInventoryItemEligibleForQuest(itemKey, quest)) return;
  const available = Math.max(0, Number(latestInventoryCounts[itemKey]) || 0);
  const current = Math.max(0, Number(questTurnInSelection[itemKey]) || 0);
  const totalSelected = getQuestTurnInSelectedCount();
  const remainingNeeded = Math.max(0, quest.requiredCount - totalSelected);
  const next = delta > 0
    ? Math.min(available, current + Math.min(delta, remainingNeeded))
    : Math.max(0, current + delta);
  if (next > 0) questTurnInSelection[itemKey] = next;
  else delete questTurnInSelection[itemKey];
  renderQuestTurnInUI();
}

function renderQuestTurnInUI() {
  if (!isQuestTurnInOpen() || !questTurnInGrid) return;
  const quest = getActiveQuestTurnIn();
  if (!quest) {
    questTurnInSubmitting = false;
    closeQuestTurnInUI();
    return;
  }

  Object.keys(questTurnInSelection).forEach((itemKey) => {
    const available = Math.max(0, Number(latestInventoryCounts[itemKey]) || 0);
    const selected = Math.min(available, Math.max(0, Number(questTurnInSelection[itemKey]) || 0));
    if (selected > 0 && isInventoryItemEligibleForQuest(itemKey, quest)) {
      questTurnInSelection[itemKey] = selected;
    } else {
      delete questTurnInSelection[itemKey];
    }
  });

  const qualityLabel = ITEM_QUALITY_DEFS[quest.minimumQuality]?.label || "Common";
  questTurnInRequirement.textContent =
    `Select ${quest.requiredCount} ${qualityLabel} or higher ${quest.resourceLabel}. ` +
    "Click an eligible item to add one; use − to remove it.";
  questTurnInGrid.innerHTML = "";

  const inventoryEntries = Object.entries(latestInventoryCounts)
    .filter(([, quantity]) => Number(quantity) > 0)
    .sort(([itemKeyA], [itemKeyB]) => {
      const a = parseInventoryItemKey(itemKeyA);
      const b = parseInventoryItemKey(itemKeyB);
      return a.baseKey.localeCompare(b.baseKey) ||
        (ITEM_QUALITY_RANK[a.quality] ?? 0) - (ITEM_QUALITY_RANK[b.quality] ?? 0);
    });

  if (!inventoryEntries.length) {
    const empty = document.createElement("div");
    empty.textContent = "Your inventory is empty.";
    empty.style.gridColumn = "1 / -1";
    empty.style.padding = "28px";
    empty.style.textAlign = "center";
    empty.style.color = "rgba(215, 232, 243, 0.68)";
    questTurnInGrid.appendChild(empty);
  }

  inventoryEntries.forEach(([itemKey, rawQuantity]) => {
    const quantity = Math.max(0, Number(rawQuantity) || 0);
    const itemDef = getInventoryItemDefByKey(itemKey);
    const parsed = parseInventoryItemKey(itemKey);
    const eligible = isInventoryItemEligibleForQuest(itemKey, quest);
    const selected = Math.max(0, Number(questTurnInSelection[itemKey]) || 0);
    const card = document.createElement("div");
    card.style.position = "relative";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.alignItems = "center";
    card.style.gap = "6px";
    card.style.padding = "10px 8px 8px";
    card.style.borderRadius = "9px";
    card.style.border = `1px solid ${eligible ? ITEM_QUALITY_DEFS[parsed.quality].borderColor : "rgba(255,255,255,0.10)"}`;
    card.style.background = eligible ? "rgba(23, 55, 71, 0.82)" : "rgba(255,255,255,0.035)";
    card.style.opacity = eligible ? "1" : "0.42";
    card.style.cursor = eligible && !questTurnInSubmitting ? "pointer" : "not-allowed";
    card.title = eligible ? "Click to add one" : "This item does not meet the quest requirement";
    card.addEventListener("click", () => adjustQuestTurnInSelection(itemKey, 1));

    const icon = document.createElement("img");
    icon.src = itemDef?.imageSrc || "";
    icon.alt = itemDef?.label || itemKey;
    icon.style.width = "48px";
    icon.style.height = "48px";
    icon.style.objectFit = "contain";
    icon.style.imageRendering = "pixelated";
    if (!itemDef?.imageSrc) icon.style.visibility = "hidden";

    const label = document.createElement("div");
    label.textContent = itemDef?.label || itemKey;
    label.style.minHeight = "28px";
    label.style.fontSize = "11px";
    label.style.fontWeight = "700";
    label.style.textAlign = "center";
    label.style.color = eligible ? "#ffffff" : "rgba(225,235,242,0.72)";

    const counts = document.createElement("div");
    counts.textContent = selected > 0 ? `${selected} selected · ${quantity} owned` : `${quantity} owned`;
    counts.style.fontSize = "10px";
    counts.style.color = selected > 0 ? "#8dffb2" : "rgba(200, 220, 233, 0.72)";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "−";
    removeButton.title = "Remove one selected item";
    removeButton.disabled = selected <= 0 || questTurnInSubmitting;
    removeButton.style.position = "absolute";
    removeButton.style.left = "5px";
    removeButton.style.top = "5px";
    removeButton.style.width = "25px";
    removeButton.style.height = "25px";
    removeButton.style.borderRadius = "999px";
    removeButton.style.border = "1px solid rgba(255,255,255,0.18)";
    removeButton.style.background = "rgba(0,0,0,0.58)";
    removeButton.style.color = "#ffffff";
    removeButton.style.cursor = selected > 0 ? "pointer" : "default";
    removeButton.style.opacity = selected > 0 ? "1" : "0";
    removeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      adjustQuestTurnInSelection(itemKey, -1);
    });

    card.appendChild(icon);
    card.appendChild(label);
    card.appendChild(counts);
    card.appendChild(removeButton);
    questTurnInGrid.appendChild(card);
  });

  const selectedCount = getQuestTurnInSelectedCount();
  const remainingCount = Math.max(0, quest.requiredCount - selectedCount);
  questTurnInCounter.textContent = `${selectedCount}/${quest.requiredCount} selected`;
  questTurnInAbandonButton.disabled = questTurnInSubmitting;
  questTurnInAbandonButton.style.opacity = questTurnInSubmitting ? "0.52" : "1";
  questTurnInAbandonButton.style.cursor = questTurnInSubmitting ? "default" : "pointer";
  questTurnInSubmitButton.disabled = questTurnInSubmitting || selectedCount !== quest.requiredCount;
  questTurnInSubmitButton.textContent = questTurnInSubmitting
    ? "Transmitting…"
    : remainingCount > 0
      ? `Add ${remainingCount} more`
      : "Complete Quest";
  questTurnInSubmitButton.style.opacity = questTurnInSubmitButton.disabled ? "0.52" : "1";
  questTurnInSubmitButton.style.cursor = questTurnInSubmitButton.disabled ? "default" : "pointer";
}

function submitQuestTurnIn() {
  const quest = getActiveQuestTurnIn();
  if (!quest || questTurnInSubmitting || getQuestTurnInSelectedCount() !== quest.requiredCount) return;
  const items = Object.entries(questTurnInSelection)
    .filter(([, quantity]) => Number(quantity) > 0)
    .map(([itemId, quantity]) => ({ itemId, quantity: Number(quantity) }));
  questTurnInSubmitting = true;
  renderQuestTurnInUI();
  if (!sendRoomMessage("complete_quest", { questId: quest.id, items })) {
    questTurnInSubmitting = false;
    renderQuestTurnInUI();
    showStatusMessage("Quest turn-in could not be sent.", false);
  }
}

function updateQuestUI(snapshot = {}) {
  latestQuestSnapshot = {
    maxQuests: Math.max(1, Number(snapshot?.maxQuests) || 5),
    quests: Array.isArray(snapshot?.quests) ? snapshot.quests : []
  };
  if (!questPanelBody) return;
  questPanelBody.innerHTML = "";
  if (questActiveSummary) {
    questActiveSummary.textContent = `${latestQuestSnapshot.quests.length}/${latestQuestSnapshot.maxQuests} active`;
  }

  if (!latestQuestSnapshot.quests.length) {
    const empty = document.createElement("div");
    empty.textContent = "Find a communication node to receive a quest.";
    empty.style.padding = "10px";
    empty.style.border = "1px dashed rgba(90, 220, 255, 0.28)";
    empty.style.borderRadius = "7px";
    empty.style.color = "rgba(210, 232, 246, 0.72)";
    empty.style.fontSize = "12px";
    questPanelBody.appendChild(empty);
    resizeQuestPanelToContent();
    return;
  }

  latestQuestSnapshot.quests.forEach((quest) => {
    const eligibleInventoryCount = Math.max(
      0,
      Number(quest.eligibleInventoryCount ?? quest.progress) || 0
    );
    const isReady = quest.status === "ready" || eligibleInventoryCount >= Number(quest.requiredCount);
    const isSubmitting = quest.status === "submitting";
    const row = document.createElement("div");
    row.setAttribute("role", "button");
    row.tabIndex = isSubmitting ? -1 : 0;
    row.style.display = "flex";
    row.style.flexDirection = "column";
    row.style.alignItems = "stretch";
    row.style.gap = "2px";
    row.style.width = "100%";
    row.style.minWidth = "0";
    row.style.boxSizing = "border-box";
    row.style.padding = "6px 8px";
    row.style.borderRadius = "7px";
    row.style.border = `1px solid ${getQualityTextColor(quest.rewardQuality)}`;
    row.style.background = isReady
      ? "rgba(35, 116, 82, 0.46)"
      : "rgba(255, 255, 255, 0.045)";
    row.style.color = "#ffffff";
    row.style.textAlign = "left";
    row.style.cursor = isSubmitting ? "wait" : "pointer";
    row.style.opacity = isSubmitting ? "0.68" : "1";
    row.title = isSubmitting ? "Quest turn-in is being transmitted" : "Click to choose inventory items";

    const title = document.createElement("div");
    const minimumQuality = ITEM_QUALITY_DEFS[quest.minimumQuality]?.label || "Common";
    const rewardQuality = ITEM_QUALITY_DEFS[quest.rewardQuality]?.label || minimumQuality;
    title.textContent = `${rewardQuality} · ${quest.requiredCount} ${minimumQuality}+ ${quest.resourceLabel || "samples"}`;
    title.style.fontSize = "11px";
    title.style.fontWeight = "700";
    title.style.whiteSpace = "nowrap";
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";

    const counter = document.createElement("div");
    counter.textContent = isSubmitting
      ? "Transmitting selected items…"
      : isReady
        ? `Ready — ${eligibleInventoryCount}/${quest.requiredCount} eligible · click to select`
        : `${eligibleInventoryCount}/${quest.requiredCount} eligible in inventory · click to view`;
    counter.style.fontSize = "10px";
    counter.style.whiteSpace = "nowrap";
    counter.style.overflow = "hidden";
    counter.style.textOverflow = "ellipsis";
    counter.style.color = isReady ? "#8dffb2" : "rgba(210, 226, 242, 0.78)";

    row.appendChild(title);
    row.appendChild(counter);
    row.addEventListener("click", () => {
      if (isSubmitting || !quest.id) return;
      openQuestTurnInUI(quest.id);
    });
    row.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && !isSubmitting) {
        event.preventDefault();
        openQuestTurnInUI(quest.id);
      }
    });
    questPanelBody.appendChild(row);
  });

  if (activeQuestTurnInId) {
    if (getActiveQuestTurnIn()) renderQuestTurnInUI();
    else {
      questTurnInSubmitting = false;
      closeQuestTurnInUI();
    }
  }
  resizeQuestPanelToContent();
}

/*
CREATE INVENTORY SLOT
---------------------
Purpose:
Builds a single dynamic inventory tile that can display any packed inventory stack.

Includes:
- item image slot
- empty fallback state
- hover highlight
- click selection support
- count badge overlay
- quality outline
*/

function createInventorySlot(index) {
  const root = document.createElement("div");
  root.className = "inventory-slot";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.alignItems = "center";
  root.style.gap = "6px";

  const tile = document.createElement("div");
  tile.className = "inventory-slot-tile";
  tile.style.position = "relative";
  tile.style.width = "52px";
  tile.style.height = "52px";
  tile.style.borderRadius = "10px";
  tile.style.border = "1px solid rgba(255, 255, 255, 0.12)";
  tile.style.background = "rgba(16, 24, 36, 0.95)";
  tile.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,0.04)";
  tile.style.display = "flex";
  tile.style.alignItems = "center";
  tile.style.justifyContent = "center";
  tile.style.overflow = "hidden";
  tile.style.cursor = "pointer";
  tile.style.transition = "transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease, opacity 120ms ease";

  const icon = document.createElement("img");
  icon.style.width = "36px";
  icon.style.height = "36px";
  icon.style.objectFit = "contain";
  icon.style.imageRendering = "pixelated";
  icon.style.pointerEvents = "none";
  icon.style.display = "none";

  const fallbackLabel = document.createElement("div");
  fallbackLabel.style.position = "absolute";
  fallbackLabel.style.left = "0";
  fallbackLabel.style.top = "0";
  fallbackLabel.style.width = "100%";
  fallbackLabel.style.height = "100%";
  fallbackLabel.style.display = "flex";
  fallbackLabel.style.alignItems = "center";
  fallbackLabel.style.justifyContent = "center";
  fallbackLabel.style.fontSize = "10px";
  fallbackLabel.style.fontWeight = "700";
  fallbackLabel.style.color = "rgba(255,255,255,0.70)";
  fallbackLabel.style.pointerEvents = "none";
  fallbackLabel.textContent = "";

  const countBadge = document.createElement("div");
  countBadge.style.position = "absolute";
  countBadge.style.right = "4px";
  countBadge.style.bottom = "3px";
  countBadge.style.minWidth = "16px";
  countBadge.style.height = "16px";
  countBadge.style.padding = "0 4px";
  countBadge.style.borderRadius = "999px";
  countBadge.style.background = "rgba(0,0,0,0.78)";
  countBadge.style.color = "#ffffff";
  countBadge.style.fontSize = "11px";
  countBadge.style.fontWeight = "700";
  countBadge.style.lineHeight = "16px";
  countBadge.style.textAlign = "center";
  countBadge.style.display = "none";
  countBadge.style.pointerEvents = "none";

  tile.addEventListener("mouseenter", () => {
    if (selectedInventoryKey === root.dataset.itemKey) return;

    tile.style.transform = "translateY(-1px)";
    tile.style.borderColor = "rgba(255, 255, 255, 0.28)";
    tile.style.boxShadow =
      "0 0 0 1px rgba(255,255,255,0.05), inset 0 0 0 1px rgba(255,255,255,0.05)";
  });

  tile.addEventListener("mouseleave", () => {
    if (selectedInventoryKey === root.dataset.itemKey) return;

    applyInventorySlotVisualState({
      tile,
      quality: root.dataset.quality || "common",
      selected: false,
      filled: root.dataset.filled === "true"
    });
  });

  tile.addEventListener("click", () => {
    const itemKey = root.dataset.itemKey || null;
    const slotId = `inventory_slot_${index}`;
    const filled = root.dataset.filled === "true";

    if (!filled) {
      selectedInventoryKey = null;
      selectedInventorySlotId = slotId;
      refreshInventorySelectionState();
      return;
    }

    const isSameSlot = selectedInventorySlotId === slotId;

    if (isSameSlot) {
      selectedInventoryKey = null;
      selectedInventorySlotId = null;
    } else {
      selectedInventoryKey = itemKey;
      selectedInventorySlotId = slotId;
    }

    refreshInventorySelectionState();
    refreshHotbarAssignments();
});

  tile.addEventListener("dblclick", (event) => {
    const itemKey = root.dataset.itemKey || null;
    if (!latestTradeSnapshot || !itemKey || root.dataset.filled !== "true") return;
    event.preventDefault();
    if (getLocalTradeParticipant()?.accepted) return;
    sendRoomMessage("trade_offer_update", {
      tradeId: latestTradeSnapshot.tradeId,
      itemId: itemKey,
      delta: 1
    });
  });

  tile.appendChild(icon);
  tile.appendChild(fallbackLabel);
  tile.appendChild(countBadge);
  root.appendChild(tile);

  return {
    root,
    tile,
    icon,
    fallbackLabel,
    countBadge,
    index,
    slotId: `inventory_slot_${index}`,
    itemKey: null,
    itemDef: null,
    isEmpty: true
  };
}

/*
INVENTORY SELECTION STATE
-------------------------
Purpose:
Refreshes visual selection state for all filled inventory slots.
*/

function refreshInventorySelectionState() {
  Object.values(inventorySlotMap).forEach((slot) => {
    if (!slot || !slot.tile) return;

    applyInventorySlotVisualState({
      tile: slot.tile,
      quality: slot.root?.dataset?.quality || "common",
      selected: selectedInventorySlotId === slot.slotId,
      filled: slot.root?.dataset?.filled === "true"
    });
    const itemKey = slot.root?.dataset?.itemKey || "";
    const owned = Math.max(0, Number(latestInventoryCounts[itemKey]) || 0);
    const fullyOffered = !!latestTradeSnapshot && itemKey &&
      getLocalTradeOfferedCount(itemKey) >= owned && owned > 0;
    slot.tile.style.opacity = fullyOffered ? "0.25" : slot.tile.style.opacity;
    slot.tile.style.filter = fullyOffered ? "grayscale(1)" : "none";
  });
  refreshInventoryDeleteButton();
}

function refreshInventoryDeleteButton() {
  if (!inventoryDeleteButton) return;
  const count = Math.max(0, Number(latestInventoryCounts[selectedInventoryKey]) || 0);
  const canDelete = !!selectedInventoryKey && count > 0;
  inventoryDeleteButton.disabled = !canDelete;
  inventoryDeleteButton.style.cursor = canDelete ? "pointer" : "default";
  inventoryDeleteButton.style.opacity = canDelete ? "1" : "0.45";
  inventoryDeleteButton.title = canDelete
    ? `Delete one ${getInventoryItemDefByKey(selectedInventoryKey)?.label || "selected item"} (${count} owned)`
    : "Select an inventory item, then delete one count";
}

function refreshAlienArtifactInventoryButton() {
  if (!inventoryArtifactButton) return;
  const count = Math.max(0, Number(latestInventoryCounts[ALIEN_ARTIFACT_ITEM_ID]) || 0);
  const eventActive = !!latestAlienArtifactSnapshot;
  const canSummon = count >= ALIEN_ARTIFACT_SUMMON_COST && !eventActive;
  inventoryArtifactButton.disabled = !canSummon;
  inventoryArtifactButton.textContent = eventActive
    ? "Signal Active"
    : `Signal ${Math.min(count, ALIEN_ARTIFACT_SUMMON_COST)}/${ALIEN_ARTIFACT_SUMMON_COST}`;
  inventoryArtifactButton.style.cursor = canSummon ? "pointer" : "default";
  inventoryArtifactButton.style.opacity = canSummon ? "1" : "0.5";
  inventoryArtifactButton.title = eventActive
    ? "An alien artifact event is already active"
    : canSummon
      ? "Consume five Alien Artifacts to trigger the global event"
      : `Collect ${Math.max(0, ALIEN_ARTIFACT_SUMMON_COST - count)} more Alien Artifact${ALIEN_ARTIFACT_SUMMON_COST - count === 1 ? "" : "s"}`;
}

/*
INVENTORY PANEL UPDATE
----------------------
Purpose:
Refreshes the 12 visible inventory slots from synced server item quantities.

Rules:
- items are packed into visible stacks
- each stack holds up to 10 units
- quality is shown as a slot outline color
*/

function updateInventoryUI(inventoryCounts = {}) {
  const visibleInventoryCounts = Object.fromEntries(
    Object.entries(inventoryCounts).filter(([itemKey]) => !isVirtualInventoryItemKey(itemKey))
  );
  const nextInventorySignature = JSON.stringify(
    Object.entries(visibleInventoryCounts).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
  );
  const inventoryChanged = nextInventorySignature !== latestInventorySignature;
  latestInventorySignature = nextInventorySignature;
  latestInventoryCounts = { ...visibleInventoryCounts };

  const stacks = getPackedInventoryStacks(visibleInventoryCounts);

  for (let i = 0; i < currentInventorySlotCount; i++) {
    const slot = inventorySlotMap[`slot_${i}`];
    renderInventorySlot(slot, stacks[i] || null);
  }

  const selectedSlot = Object.values(inventorySlotMap).find((slot) => {
    return slot?.slotId === selectedInventorySlotId;
  });

  if (!selectedSlot || selectedSlot.root?.dataset?.filled !== "true") {
    selectedInventorySlotId = null;
    selectedInventoryKey = null;
  } else {
    selectedInventoryKey = selectedSlot.root.dataset.itemKey || null;
  }

  refreshInventorySelectionState();
  refreshAlienArtifactInventoryButton();
  refreshHotbarAssignments();
  if (inventoryChanged && isQuestTurnInOpen()) renderQuestTurnInUI();
}

/*
HOTBAR UI
---------
Purpose:
Creates a draggable hotbar with show/hide toggle support.

Includes:
- drag handle header
- horizontal hotbar row
- slot assignment display
- selected slot styling
*/

function createHotbarUI() {
  hotbarPanel = createUIPanel({
    x: 215,
    y: 500,
    width: 370,
    height: 72
  });

  if (!hotbarPanel) return;

  hotbarPanel.id = "hotbar-ui";
  restoreUIPanelState(hotbarPanel);

  const hotbarBody = attachUIPanelFrame(hotbarPanel, {
    collapsible: false,
    bodyDisplay: "flex",
    bodyGap: "8px",
    showHeader: false
  });

  hotbarBody.style.flexDirection = "row";
  hotbarBody.style.alignItems = "center";
  hotbarBody.style.justifyContent = "center";

  hotbarSlotMap = {};

  for (let i = 0; i < HOTBAR_SLOT_COUNT; i++) {
    const slot = createHotbarSlot(i);
    hotbarSlotMap[i] = slot;
    hotbarBody.appendChild(slot.root);
  }

  refreshHotbarAssignments();
  refreshHotbarSelectionState();
}

/*
PROFILE PANEL UI
----------------
Purpose:
Creates a draggable, collapsible player profile panel.

Includes:
- account identity
- room/class info
- join status
- reusable info rows
*/

function createProfileUI() {
  profilePanel = createUIPanel({
    x: 820,
    y: 500,
    width: 280,
    height: 225
  });

  if (!profilePanel) return;

  profilePanel.id = "profile-ui";
  restoreUIPanelState(profilePanel);

  const panelBody = attachUIPanelFrame(profilePanel, {
    title: "Profile",
    collapsible: true,
    bodyDisplay: "flex",
    bodyGap: "8px"
  });

  const settingsButton = document.createElement("button");
  settingsButton.type = "button";
  settingsButton.textContent = "⚙";
  settingsButton.title = "Settings";
  settingsButton.style.width = "28px";
  settingsButton.style.height = "28px";
  settingsButton.style.padding = "0";
  settingsButton.style.borderRadius = "7px";
  settingsButton.style.border = "1px solid rgba(115, 218, 244, 0.35)";
  settingsButton.style.background = "rgba(29, 86, 108, 0.52)";
  settingsButton.style.color = "#dff8ff";
  settingsButton.style.fontSize = "17px";
  settingsButton.style.cursor = "pointer";
  settingsButton.addEventListener("click", openSettingsWindow);
  profilePanel._panelControls?.insertBefore(
    settingsButton,
    profilePanel._panelControls.firstChild
  );

  panelBody.style.flexDirection = "column";

  profilePanelBody = document.createElement("div");
  profilePanelBody.id = "profile-panel-body";
  profilePanelBody.style.display = "flex";
  profilePanelBody.style.flexDirection = "row";
  profilePanelBody.style.gap = "10px";
  profilePanelBody.style.alignItems = "stretch";
  profilePanelBody.style.background = "rgba(255, 255, 255, 0.05)";
  profilePanelBody.style.border = "1px solid rgba(255, 255, 255, 0.08)";
  profilePanelBody.style.borderRadius = "6px";
  profilePanelBody.style.padding = "10px";
  profilePanelBody.style.flex = "1";

  panelBody.appendChild(profilePanelBody);

  const infoColumn = document.createElement("div");
  infoColumn.id = "profile-info-column";
  infoColumn.style.display = "flex";
  infoColumn.style.flexDirection = "column";
  infoColumn.style.gap = "8px";
  infoColumn.style.flex = "1";
  infoColumn.style.minWidth = "0";

  const paperdollSection = document.createElement("div");
  paperdollSection.id = "profile-paperdoll";
  paperdollSection.style.display = "flex";
  paperdollSection.style.flexDirection = "column";
  paperdollSection.style.gap = "7px";
  paperdollSection.style.alignItems = "center";
  paperdollSection.style.justifyContent = "center";
  paperdollSection.style.background = "rgba(255, 255, 255, 0.04)";
  paperdollSection.style.border = "1px solid rgba(255, 255, 255, 0.08)";
  paperdollSection.style.borderRadius = "8px";
  paperdollSection.style.padding = "10px";
  paperdollSection.style.width = "92px";
  paperdollSection.style.minWidth = "92px";

  const paperdollPreview = document.createElement("div");
  paperdollPreview.id = "profile-paperdoll-preview";
  paperdollPreview.style.width = "82px";
  paperdollPreview.style.height = "108px";
  paperdollPreview.style.display = "flex";
  paperdollPreview.style.alignItems = "center";
  paperdollPreview.style.justifyContent = "center";
  paperdollPreview.style.background = "rgba(16, 24, 36, 0.95)";
  paperdollPreview.style.border = "1px solid rgba(255, 255, 255, 0.12)";
  paperdollPreview.style.borderRadius = "10px";
  paperdollPreview.style.color = "rgba(220, 235, 255, 0.72)";
  paperdollPreview.style.fontSize = "11px";
  paperdollPreview.style.fontWeight = "600";
  paperdollPreview.style.textTransform = "uppercase";
  paperdollPreview.style.letterSpacing = "0.04em";
  paperdollPreview.style.textAlign = "center";
  paperdollPreview.style.overflow = "hidden";
  paperdollPreview.style.position = "relative";

  paperdollSection.appendChild(paperdollPreview);
  astronautPreview?.dispose();
  astronautPreview = createAstronautPreview(paperdollPreview);

  profileContentRows = {
    name: createProfileInfoRow("Name", "Not signed in"),
    className: createProfileInfoRow("Class", "Not joined"),
    rank: createProfileInfoRow("Rank", "Recruit")
  };

  Object.values(profileContentRows).forEach((row) => {
    infoColumn.appendChild(row.root);
  });

  profilePanelBody.appendChild(infoColumn);
  profilePanelBody.appendChild(paperdollSection);

  const skillsButton = document.createElement("button");
  skillsButton.type = "button";
  skillsButton.textContent = "Skills";
  skillsButton.style.width = "100%";
  skillsButton.style.padding = "6px 4px";
  skillsButton.style.border = "1px solid rgba(81, 215, 246, 0.42)";
  skillsButton.style.borderRadius = "7px";
  skillsButton.style.background = "rgba(26, 117, 145, 0.42)";
  skillsButton.style.color = "#dff8ff";
  skillsButton.style.fontSize = "11px";
  skillsButton.style.fontWeight = "700";
  skillsButton.style.cursor = "pointer";
  skillsButton.addEventListener("click", openSkillsWindow);
  infoColumn.appendChild(skillsButton);

  createSkillsWindow();
  createSettingsWindow();

  updateProfileUI();
}

function styleDialogButton(button, color = "blue") {
  button.type = "button";
  button.style.padding = "8px 14px";
  button.style.borderRadius = "7px";
  button.style.border = color === "red"
    ? "1px solid rgba(255,115,115,.48)"
    : "1px solid rgba(91,224,255,.48)";
  button.style.background = color === "red"
    ? "rgba(135,42,42,.72)"
    : "rgba(29,111,139,.72)";
  button.style.color = "#fff";
  button.style.fontWeight = "700";
  button.style.cursor = "pointer";
}

function createSettingsWindow() {
  if (!uiRoot || settingsOverlay) return;
  settingsOverlay = document.createElement("div");
  settingsOverlay.id = "settings-overlay";
  Object.assign(settingsOverlay.style, {
    position: "absolute",
    inset: "0",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    zIndex: "2660"
  });
  const dialog = document.createElement("section");
  Object.assign(dialog.style, {
    width: "min(440px, calc(100vw - 40px))",
    padding: "18px",
    boxSizing: "border-box",
    border: "1px solid rgba(91,224,255,.48)",
    borderRadius: "12px",
    background: "rgba(7,18,29,.98)",
    boxShadow: "0 22px 65px rgba(0,0,0,.62)",
    color: "#fff",
    pointerEvents: "auto"
  });
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  const title = document.createElement("h2");
  title.textContent = "Settings";
  title.style.margin = "0";
  title.style.fontFamily = "Georgia, serif";
  const close = document.createElement("button");
  close.textContent = "×";
  styleDialogButton(close);
  close.addEventListener("click", closeSettingsWindow);
  header.append(title, close);

  const tradeRow = document.createElement("label");
  tradeRow.style.display = "flex";
  tradeRow.style.alignItems = "center";
  tradeRow.style.justifyContent = "space-between";
  tradeRow.style.gap = "16px";
  tradeRow.style.marginTop = "18px";
  tradeRow.style.padding = "14px";
  tradeRow.style.border = "1px solid rgba(255,255,255,.12)";
  tradeRow.style.borderRadius = "9px";
  tradeRow.style.background = "rgba(255,255,255,.045)";
  const copy = document.createElement("span");
  copy.innerHTML = "<strong>Allow player trades</strong><br><small>Turn this off to reject all incoming requests.</small>";
  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.id = "allow-trades-setting";
  toggle.checked = tradesEnabled;
  toggle.style.width = "22px";
  toggle.style.height = "22px";
  toggle.addEventListener("change", () => {
    tradesEnabled = toggle.checked;
    sendRoomMessage("set_trade_settings", { enabled: tradesEnabled });
  });
  tradeRow.append(copy, toggle);
  dialog.append(header, tradeRow);
  settingsOverlay.appendChild(dialog);
  uiRoot.appendChild(settingsOverlay);
}

function openSettingsWindow() {
  createSettingsWindow();
  const toggle = settingsOverlay?.querySelector?.("#allow-trades-setting");
  if (toggle) toggle.checked = tradesEnabled;
  if (settingsOverlay) settingsOverlay.style.display = "flex";
}

function closeSettingsWindow() {
  if (settingsOverlay) settingsOverlay.style.display = "none";
}

function closeOtherPlayerProfile() {
  otherPlayerProfilePanel?.remove();
  otherPlayerProfilePanel = null;
  activeOtherPlayerProfile = null;
}

function openOtherPlayerProfile(profile = {}) {
  if (!uiRoot || !profile.playerId) return;
  closeOtherPlayerProfile();
  activeOtherPlayerProfile = profile;
  const panel = document.createElement("section");
  panel.id = "other-player-profile";
  const rootRect = uiRoot.getBoundingClientRect();
  const canvasRect = game?.canvas?.getBoundingClientRect?.();
  Object.assign(panel.style, {
    position: "absolute",
    left: `${Math.max(10, (canvasRect?.left || 10) - rootRect.left + 12)}px`,
    top: `${Math.max(10, (canvasRect?.top || 10) - rootRect.top + 12)}px`,
    width: "260px",
    padding: "12px",
    boxSizing: "border-box",
    border: "1px solid rgba(91,224,255,.42)",
    borderRadius: "10px",
    background: "rgba(6,17,28,.96)",
    boxShadow: "0 16px 42px rgba(0,0,0,.55)",
    color: "#fff",
    pointerEvents: "auto",
    zIndex: "2400"
  });
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  const title = document.createElement("strong");
  title.textContent = "Player Profile";
  title.style.fontFamily = "Georgia, serif";
  const close = document.createElement("button");
  close.textContent = "×";
  styleDialogButton(close);
  close.addEventListener("click", closeOtherPlayerProfile);
  header.append(title, close);
  const info = document.createElement("div");
  info.style.display = "grid";
  info.style.gap = "7px";
  info.style.margin = "12px 0";
  info.innerHTML = `
    <div><small>NAME</small><br><strong></strong></div>
    <div><small>CLASS</small><br><span></span></div>
    <div><small>RANK</small><br><span></span></div>
  `;
  const values = info.querySelectorAll("strong, span");
  values[0].textContent = profile.name || "Player";
  values[1].textContent = profile.className || "Expedition";
  values[2].textContent = `${profile.profileRank?.label || "Recruit"} · Rank ${profile.profileRank?.level || 1}`;
  const trade = document.createElement("button");
  trade.textContent = profile.tradesEnabled === false ? "Trades Disabled" : "Trade";
  trade.disabled = profile.tradesEnabled === false || !tradesEnabled;
  trade.style.width = "100%";
  styleDialogButton(trade);
  trade.style.opacity = trade.disabled ? ".48" : "1";
  trade.addEventListener("click", () => {
    if (trade.disabled) return;
    sendRoomMessage("request_trade", { targetPlayerId: profile.playerId });
  });
  panel.append(header, info, trade);
  uiRoot.appendChild(panel);
  otherPlayerProfilePanel = panel;
}

function closeTradeRequestPrompt() {
  tradeRequestOverlay?.remove();
  tradeRequestOverlay = null;
  pendingTradeRequest = null;
}

function showTradeRequestPrompt(request = {}) {
  if (!uiRoot || !request.requestId) return;
  closeTradeRequestPrompt();
  pendingTradeRequest = request;
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "absolute", inset: "0", display: "flex", alignItems: "center",
    justifyContent: "center", pointerEvents: "none", zIndex: "2720"
  });
  const dialog = document.createElement("section");
  Object.assign(dialog.style, {
    width: "min(420px, calc(100vw - 40px))", padding: "18px", borderRadius: "12px",
    border: "1px solid rgba(91,224,255,.48)", background: "rgba(7,18,29,.98)",
    boxShadow: "0 22px 65px rgba(0,0,0,.65)", color: "#fff", pointerEvents: "auto"
  });
  const heading = document.createElement("h2");
  heading.textContent = "Trade Request";
  heading.style.marginTop = "0";
  const text = document.createElement("p");
  text.textContent = `${request.fromName || "A player"} wants to trade with you.`;
  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.justifyContent = "flex-end";
  actions.style.gap = "10px";
  const no = document.createElement("button");
  no.textContent = "No";
  styleDialogButton(no, "red");
  const yes = document.createElement("button");
  yes.textContent = "Yes";
  styleDialogButton(yes);
  no.addEventListener("click", () => {
    sendRoomMessage("respond_trade_request", { requestId: request.requestId, accepted: false });
    closeTradeRequestPrompt();
  });
  yes.addEventListener("click", () => {
    sendRoomMessage("respond_trade_request", { requestId: request.requestId, accepted: true });
    closeTradeRequestPrompt();
  });
  actions.append(no, yes);
  dialog.append(heading, text, actions);
  overlay.appendChild(dialog);
  uiRoot.appendChild(overlay);
  tradeRequestOverlay = overlay;
}

function getLocalTradeParticipant() {
  return latestTradeSnapshot?.players?.find?.((entry) => entry.playerId === myId) || null;
}

function getTradePartnerParticipant() {
  return latestTradeSnapshot?.players?.find?.((entry) => entry.playerId !== myId) || null;
}

function getLocalTradeOfferedCount(itemId) {
  const entry = getLocalTradeParticipant()?.offer?.find?.((item) => item.itemId === itemId);
  return Math.max(0, Number(entry?.quantity) || 0);
}

function renderTradeItemSlot(item, ownSide) {
  const tile = document.createElement("button");
  tile.type = "button";
  tile.title = ownSide ? "Click to return one item to your inventory" : "Offered by the other player";
  Object.assign(tile.style, {
    position: "relative", width: "58px", height: "58px", borderRadius: "10px",
    border: `2px solid ${getQualityTextColor(parseInventoryItemKey(item.itemId).quality)}`,
    background: "rgba(16,24,36,.96)", padding: "4px", cursor: ownSide ? "pointer" : "default"
  });
  const definition = getInventoryItemDefByKey(item.itemId);
  const icon = document.createElement("img");
  icon.src = definition?.imageSrc || "";
  icon.alt = definition?.label || item.itemId;
  Object.assign(icon.style, { width: "42px", height: "42px", objectFit: "contain", imageRendering: "pixelated" });
  const count = document.createElement("span");
  count.textContent = String(item.quantity);
  Object.assign(count.style, {
    position: "absolute", right: "3px", bottom: "2px", minWidth: "16px", height: "16px",
    borderRadius: "999px", background: "rgba(0,0,0,.8)", color: "#fff", fontSize: "10px", lineHeight: "16px"
  });
  tile.append(icon, count);
  if (ownSide) {
    tile.addEventListener("click", (event) => {
      event.stopPropagation();
      if (getLocalTradeParticipant()?.accepted) return;
      sendRoomMessage("trade_offer_update", {
        tradeId: latestTradeSnapshot?.tradeId,
        itemId: item.itemId,
        delta: -1
      });
    });
  }
  return tile;
}

function renderTradeWindow() {
  if (!tradeOverlay || !latestTradeSnapshot) return;
  const local = getLocalTradeParticipant();
  const partner = getTradePartnerParticipant();
  if (!local || !partner) return;
  const renderGrid = (grid, participant, ownSide) => {
    grid.innerHTML = "";
    grid.style.opacity = participant.accepted ? ".42" : "1";
    (participant.offer || []).forEach((item) => grid.appendChild(renderTradeItemSlot(item, ownSide)));
    const slotCount = Math.max(8, participant.offer?.length || 0);
    for (let index = participant.offer?.length || 0; index < slotCount; index += 1) {
      const empty = document.createElement("div");
      Object.assign(empty.style, {
        width: "58px", height: "58px", borderRadius: "10px",
        border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.025)"
      });
      grid.appendChild(empty);
    }
  };
  renderGrid(tradeOfferGrid, local, true);
  renderGrid(tradePartnerGrid, partner, false);
  tradeOfferGrid.previousElementSibling.textContent = `${local.name} — Your Offer`;
  tradePartnerGrid.previousElementSibling.textContent = `${partner.name} — Their Offer`;
  tradeStatusText.textContent = latestTradeSnapshot.phase === "confirming"
    ? "Both offers are locked. Final confirmation is required."
    : local.accepted
      ? "Your offer is accepted and locked."
      : partner.accepted
        ? `${partner.name} accepted their offer. Review yours and accept when ready.`
        : "Double-click an Inventory item, or select it and click your offer area, to add one.";
  tradeAcceptButton.disabled = !!local.accepted || latestTradeSnapshot.phase !== "offering";
  tradeAcceptButton.style.opacity = tradeAcceptButton.disabled ? ".45" : "1";
  refreshInventorySelectionState();
}

function openTradeWindow(snapshot) {
  latestTradeSnapshot = snapshot;
  closeOtherPlayerProfile();
  if (tradeOverlay) {
    renderTradeWindow();
    return;
  }
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center",
    pointerEvents: "none", zIndex: "2680"
  });
  const dialog = document.createElement("section");
  Object.assign(dialog.style, {
    width: "min(780px, calc(100vw - 36px))", padding: "16px", boxSizing: "border-box",
    border: "1px solid rgba(91,224,255,.5)", borderRadius: "13px", background: "rgba(6,17,28,.985)",
    boxShadow: "0 25px 75px rgba(0,0,0,.68)", color: "#fff", pointerEvents: "auto"
  });
  const title = document.createElement("h2");
  title.textContent = "Player Trade";
  title.style.margin = "0 0 12px";
  const columns = document.createElement("div");
  columns.style.display = "grid";
  columns.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
  columns.style.gap = "14px";
  const createSide = (ownSide) => {
    const side = document.createElement("div");
    side.style.minWidth = "0";
    const heading = document.createElement("strong");
    const grid = document.createElement("div");
    Object.assign(grid.style, {
      display: "grid", gridTemplateColumns: "repeat(4, 58px)", gap: "8px", alignContent: "start",
      minHeight: "132px", marginTop: "8px", padding: "10px", borderRadius: "9px",
      border: "1px solid rgba(255,255,255,.11)", background: "rgba(255,255,255,.035)", boxSizing: "border-box"
    });
    if (ownSide) {
      grid.style.cursor = "pointer";
      grid.addEventListener("click", () => {
        if (!selectedInventoryKey || getLocalTradeParticipant()?.accepted) return;
        sendRoomMessage("trade_offer_update", {
          tradeId: latestTradeSnapshot?.tradeId,
          itemId: selectedInventoryKey,
          delta: 1
        });
      });
      tradeOfferGrid = grid;
    } else {
      tradePartnerGrid = grid;
    }
    side.append(heading, grid);
    return side;
  };
  columns.append(createSide(true), createSide(false));
  tradeStatusText = document.createElement("div");
  tradeStatusText.style.marginTop = "12px";
  tradeStatusText.style.color = "#bfefff";
  tradeStatusText.style.fontSize = "12px";
  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.justifyContent = "flex-end";
  actions.style.gap = "10px";
  actions.style.marginTop = "12px";
  const cancel = document.createElement("button");
  cancel.textContent = "Cancel";
  styleDialogButton(cancel, "red");
  cancel.addEventListener("click", () => sendRoomMessage("trade_cancel", { tradeId: latestTradeSnapshot?.tradeId }));
  tradeAcceptButton = document.createElement("button");
  tradeAcceptButton.textContent = "Accept Offer";
  styleDialogButton(tradeAcceptButton);
  tradeAcceptButton.addEventListener("click", () => sendRoomMessage("trade_accept", { tradeId: latestTradeSnapshot?.tradeId }));
  actions.append(cancel, tradeAcceptButton);
  dialog.append(title, columns, tradeStatusText, actions);
  overlay.appendChild(dialog);
  uiRoot.appendChild(overlay);
  tradeOverlay = overlay;
  renderTradeWindow();
}

function closeTradeWindow() {
  tradeOverlay?.remove();
  tradeOverlay = null;
  tradeOfferGrid = null;
  tradePartnerGrid = null;
  tradeStatusText = null;
  tradeAcceptButton = null;
  latestTradeSnapshot = null;
  closeTradeConfirmationPrompt();
  refreshInventorySelectionState();
}

function closeTradeConfirmationPrompt() {
  tradeConfirmationOverlay?.remove();
  tradeConfirmationOverlay = null;
}

function showTradeConfirmationPrompt(data = {}) {
  if (!uiRoot || !latestTradeSnapshot) return;
  closeTradeConfirmationPrompt();
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center",
    pointerEvents: "none", zIndex: "2760"
  });
  const dialog = document.createElement("section");
  Object.assign(dialog.style, {
    width: "min(430px, calc(100vw - 40px))", padding: "18px", borderRadius: "12px",
    border: "1px solid rgba(197,149,255,.55)", background: "rgba(12,12,28,.99)",
    color: "#fff", boxShadow: "0 24px 72px rgba(0,0,0,.7)", pointerEvents: "auto"
  });
  const heading = document.createElement("h2");
  heading.textContent = "Confirm Trade";
  heading.style.marginTop = "0";
  const copy = document.createElement("p");
  copy.textContent = data.message || "Accept this final exchange?";
  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.justifyContent = "flex-end";
  actions.style.gap = "10px";
  const no = document.createElement("button");
  no.textContent = "No";
  styleDialogButton(no, "red");
  const yes = document.createElement("button");
  yes.textContent = "Yes";
  styleDialogButton(yes);
  no.addEventListener("click", () => {
    sendRoomMessage("trade_confirm", { tradeId: latestTradeSnapshot?.tradeId, accepted: false });
    closeTradeConfirmationPrompt();
  });
  yes.addEventListener("click", () => {
    sendRoomMessage("trade_confirm", { tradeId: latestTradeSnapshot?.tradeId, accepted: true });
    closeTradeConfirmationPrompt();
  });
  actions.append(no, yes);
  dialog.append(heading, copy, actions);
  overlay.appendChild(dialog);
  uiRoot.appendChild(overlay);
  tradeConfirmationOverlay = overlay;
}

function createSkillsWindow() {
  if (!uiRoot || skillsOverlay) return;
  skillsOverlay = document.createElement("div");
  skillsOverlay.id = "skills-overlay";
  skillsOverlay.style.position = "absolute";
  skillsOverlay.style.inset = "0";
  skillsOverlay.style.display = "none";
  skillsOverlay.style.alignItems = "center";
  skillsOverlay.style.justifyContent = "center";
  skillsOverlay.style.padding = "24px";
  skillsOverlay.style.boxSizing = "border-box";
  skillsOverlay.style.background = "rgba(2, 7, 14, 0.74)";
  skillsOverlay.style.backdropFilter = "blur(5px)";
  skillsOverlay.style.pointerEvents = "auto";
  skillsOverlay.style.zIndex = "2550";

  const dialog = document.createElement("div");
  dialog.style.width = "min(820px, calc(100vw - 48px))";
  dialog.style.height = "min(680px, calc(100vh - 48px))";
  dialog.style.display = "flex";
  dialog.style.flexDirection = "column";
  dialog.style.gap = "10px";
  dialog.style.padding = "16px";
  dialog.style.boxSizing = "border-box";
  dialog.style.border = "1px solid rgba(90, 220, 255, 0.46)";
  dialog.style.borderRadius = "12px";
  dialog.style.background = "linear-gradient(180deg, rgba(10, 24, 38, 0.99), rgba(5, 13, 23, 0.99))";
  dialog.style.boxShadow = "0 24px 74px rgba(0,0,0,0.68), 0 0 30px rgba(45,190,230,0.14)";
  dialog.addEventListener("click", (event) => event.stopPropagation());

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  const title = document.createElement("div");
  title.textContent = "Skills";
  title.style.fontFamily = "Georgia, serif";
  title.style.fontSize = "22px";
  title.style.fontWeight = "700";
  title.style.color = "#fff";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.style.width = "34px";
  close.style.height = "34px";
  close.style.borderRadius = "8px";
  close.style.border = "1px solid rgba(255,255,255,0.18)";
  close.style.background = "rgba(255,255,255,0.08)";
  close.style.color = "#fff";
  close.style.fontSize = "22px";
  close.style.cursor = "pointer";
  close.addEventListener("click", closeSkillsWindow);
  header.appendChild(title);
  header.appendChild(close);

  skillsTokenSummary = document.createElement("div");
  skillsTokenSummary.style.padding = "9px 12px";
  skillsTokenSummary.style.borderRadius = "8px";
  skillsTokenSummary.style.background = "rgba(51, 185, 217, 0.10)";
  skillsTokenSummary.style.color = "#c8f5ff";
  skillsTokenSummary.style.fontSize = "13px";

  const tabs = document.createElement("div");
  tabs.style.display = "grid";
  tabs.style.gridTemplateColumns = "repeat(3, 1fr)";
  tabs.style.gap = "7px";
  [
    ["skills", "Skills"],
    ["abilities", "Abilities"],
    ["specials", "Special Abilities"]
  ].forEach(([tabKey, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.skillsTab = tabKey;
    button.style.padding = "9px";
    button.style.borderRadius = "7px";
    button.style.border = "1px solid rgba(255,255,255,0.14)";
    button.style.color = "#fff";
    button.style.cursor = "pointer";
    button.addEventListener("click", () => {
      activeSkillsTab = tabKey;
      renderSkillsWindow();
    });
    tabs.appendChild(button);
  });

  skillsTabBody = document.createElement("div");
  skillsTabBody.style.flex = "1";
  skillsTabBody.style.minHeight = "0";
  skillsTabBody.style.overflowY = "auto";
  skillsTabBody.style.display = "grid";
  skillsTabBody.style.gridTemplateColumns = "repeat(auto-fit, minmax(230px, 1fr))";
  skillsTabBody.style.alignContent = "start";
  skillsTabBody.style.gap = "10px";
  skillsTabBody.style.padding = "4px";

  dialog.appendChild(header);
  dialog.appendChild(skillsTokenSummary);
  dialog.appendChild(tabs);
  dialog.appendChild(skillsTabBody);
  skillsOverlay.appendChild(dialog);
  skillsOverlay.addEventListener("click", closeSkillsWindow);
  uiRoot.appendChild(skillsOverlay);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isSkillsWindowOpen()) closeSkillsWindow();
  });
  window.setInterval(() => {
    refreshHotbarAssignments();
  }, 1000);
}

function openSkillsWindow() {
  createSkillsWindow();
  if (!skillsOverlay) return;
  skillsOverlay.style.display = "flex";
  renderSkillsWindow();
  sendRoomMessage("request_progression_snapshot");
}

function closeSkillsWindow() {
  if (skillsOverlay) skillsOverlay.style.display = "none";
}

function createSkillsCard(titleText, descriptionText = "") {
  const card = document.createElement("div");
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.gap = "7px";
  card.style.padding = "12px";
  card.style.border = "1px solid rgba(255,255,255,0.11)";
  card.style.borderRadius = "9px";
  card.style.background = "rgba(255,255,255,0.045)";
  const heading = document.createElement("div");
  heading.textContent = titleText;
  heading.style.fontSize = "15px";
  heading.style.fontWeight = "700";
  heading.style.color = "#fff";
  card.appendChild(heading);
  if (descriptionText) {
    const description = document.createElement("div");
    description.textContent = descriptionText;
    description.style.fontSize = "12px";
    description.style.color = "rgba(211,228,240,0.76)";
    card.appendChild(description);
  }
  return card;
}

function appendSkillsProgressBar(card, current, maximum, color = "#5bdcff") {
  const track = document.createElement("div");
  track.style.height = "8px";
  track.style.borderRadius = "999px";
  track.style.overflow = "hidden";
  track.style.background = "rgba(255,255,255,0.08)";
  const fill = document.createElement("div");
  fill.style.height = "100%";
  fill.style.width = `${maximum > 0 ? Math.min(100, current / maximum * 100) : 100}%`;
  fill.style.background = color;
  fill.style.boxShadow = `0 0 8px ${color}`;
  track.appendChild(fill);
  card.appendChild(track);
}

function appendProgressionResetControl(scope) {
  const resetPanel = document.createElement("div");
  resetPanel.style.gridColumn = "1 / -1";
  resetPanel.style.display = "flex";
  resetPanel.style.alignItems = "center";
  resetPanel.style.justifyContent = "space-between";
  resetPanel.style.gap = "12px";
  resetPanel.style.padding = "10px 12px";
  resetPanel.style.border = "1px solid rgba(255, 151, 92, 0.42)";
  resetPanel.style.borderRadius = "8px";
  resetPanel.style.background = "rgba(104, 45, 22, 0.28)";

  const warning = document.createElement("div");
  warning.style.color = "#ffd7bd";
  warning.style.fontSize = "12px";
  warning.textContent = scope === "abilities"
    ? "Warning: resetting Abilities refunds their spent quest tokens as common tokens. Special Abilities and Special Ability tokens are not changed."
    : "Warning: resetting Special Abilities removes active skills and inventory expansions. Their Special Ability tokens become available again; core Abilities and science levels remain.";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = scope === "abilities" ? "Reset Abilities" : "Reset Specials";
  button.style.flex = "0 0 auto";
  button.style.padding = "8px 11px";
  button.style.borderRadius = "7px";
  button.style.border = "1px solid rgba(255, 151, 92, 0.55)";
  button.style.background = "rgba(142, 55, 24, 0.62)";
  button.style.color = "#fff";
  button.style.cursor = "pointer";
  button.addEventListener("click", () => {
    sendRoomMessage("reset_progression", { scope });
  });

  resetPanel.appendChild(warning);
  resetPanel.appendChild(button);
  skillsTabBody.appendChild(resetPanel);
}

function renderSkillsWindow() {
  if (!skillsTabBody || !skillsTokenSummary) return;
  const tokenData = latestProgressionSnapshot.tokens || {};
  const breakdown = ["common", "uncommon", "rare", "epic", "legendary"]
    .map((quality) => `${quality[0].toUpperCase()}: ${Number(tokenData.byQuality?.[quality]) || 0}`)
    .join(" · ");
  skillsTokenSummary.textContent =
    `Quest Tokens: ${Number(tokenData.total) || 0} (${breakdown}) · ` +
    `Special Ability Tokens: ${Number(tokenData.specialAvailable) || 0} available / ${Number(tokenData.specialEarned) || 0} earned`;

  skillsOverlay.querySelectorAll("[data-skills-tab]").forEach((button) => {
    const selected = button.dataset.skillsTab === activeSkillsTab;
    button.style.background = selected ? "rgba(37, 151, 181, 0.68)" : "rgba(255,255,255,0.05)";
    button.style.borderColor = selected ? "rgba(91, 224, 255, 0.58)" : "rgba(255,255,255,0.14)";
  });
  skillsTabBody.innerHTML = "";

  if (activeSkillsTab === "skills") {
    (latestProgressionSnapshot.skills || []).forEach((skill) => {
      const definition = SCIENCE_SKILL_DEFS[skill.key] || { label: skill.key, resource: "samples" };
      const card = createSkillsCard(
        `${definition.label} · Rank ${skill.level}`,
        definition.rankOnly
          ? "Recover Alien Artifacts and help destroy alien structures to advance this rank. Destruction credit is shared by every player who dealt damage."
          : `Communication quests involving ${definition.resource} award 1/2/5/10/20 overall points from common through legendary.`
      );
      const progress = document.createElement("div");
      progress.textContent = skill.pointsForNextLevel > 0
        ? `${skill.pointsIntoLevel}/${skill.pointsForNextLevel} points toward the next level`
        : "Maximum rank";
      progress.style.fontSize = "12px";
      progress.style.color = "#bcecff";
      card.appendChild(progress);
      appendSkillsProgressBar(card, skill.pointsIntoLevel, skill.pointsForNextLevel || 1);
      if (definition.rankOnly) {
        const structureCounter = document.createElement("div");
        structureCounter.textContent = `Alien structures destroyed with your assistance: ${Math.max(0, Number(skill.structuresDestroyed) || 0)}`;
        structureCounter.style.fontSize = "12px";
        structureCounter.style.color = "#d9b8ff";
        structureCounter.style.fontWeight = "700";
        card.appendChild(structureCounter);
        skillsTabBody.appendChild(card);
        return;
      }
      const rarity = document.createElement("div");
      rarity.textContent = `Rarity improvement: +${Number(skill.rarityBonusPercent || 0).toFixed(3)} percentage points shifted upward`;
      rarity.style.fontSize = "11px";
      rarity.style.color = "#92ffbf";
      card.appendChild(rarity);

      const rarityHeading = document.createElement("div");
      rarityHeading.textContent = "QUEST RARITY RANKS";
      rarityHeading.style.marginTop = "4px";
      rarityHeading.style.fontSize = "10px";
      rarityHeading.style.fontWeight = "800";
      rarityHeading.style.letterSpacing = ".12em";
      rarityHeading.style.color = "rgba(214,231,243,.66)";
      card.appendChild(rarityHeading);

      const rarityProgressByQuality = Object.fromEntries(
        (skill.rarityRanks || []).map((entry) => [entry.quality, entry])
      );
      ["common", "uncommon", "rare", "epic", "legendary"].forEach((quality) => {
        const qualityDef = ITEM_QUALITY_DEFS[quality] || ITEM_QUALITY_DEFS.common;
        const progressData = rarityProgressByQuality[quality] || {
          level: 1,
          pointsIntoLevel: 0,
          pointsForNextLevel: 20
        };
        const row = document.createElement("div");
        row.style.display = "grid";
        row.style.gridTemplateColumns = "82px 68px 1fr";
        row.style.alignItems = "center";
        row.style.gap = "6px";
        row.style.fontSize = "10px";
        const qualityLabel = document.createElement("div");
        qualityLabel.textContent = qualityDef.label;
        qualityLabel.style.color = qualityDef.borderColor;
        qualityLabel.style.fontWeight = "750";
        const levelLabel = document.createElement("div");
        levelLabel.textContent = `Rank ${progressData.level}`;
        levelLabel.style.color = "#ffffff";
        const progressText = document.createElement("div");
        progressText.textContent = progressData.pointsForNextLevel > 0
          ? `${progressData.pointsIntoLevel}/${progressData.pointsForNextLevel}`
          : "Maximum";
        progressText.style.color = "rgba(216,232,242,.74)";
        row.appendChild(qualityLabel);
        row.appendChild(levelLabel);
        row.appendChild(progressText);
        card.appendChild(row);
      });
      skillsTabBody.appendChild(card);
    });
    return;
  }

  if (activeSkillsTab === "abilities") {
    const vitals = latestProgressionSnapshot.vitals || {};
    const currentStats = document.createElement("div");
    currentStats.style.gridColumn = "1 / -1";
    currentStats.style.padding = "10px";
    currentStats.style.borderRadius = "8px";
    currentStats.style.background = "rgba(62, 186, 137, 0.10)";
    currentStats.style.color = "#caffdf";
    currentStats.style.fontSize = "12px";
    currentStats.textContent =
      `Current: ${Number(vitals.maxOxygen) || 100} O₂ · ${Number(vitals.maxEnergy) || 100} energy · ` +
      `${Number(vitals.taserAttacks) || 3} taser pulses · ${(Number(vitals.taserDamageMultiplier) || 1).toFixed(1)}× damage · ` +
      `${Number(vitals.taserRangeTiles) || 5} tile range · ${Number(vitals.taserEnergyCost) || 8} energy/use`;
    skillsTabBody.appendChild(currentStats);
    appendProgressionResetControl("abilities");
    (latestProgressionSnapshot.abilities || []).forEach((ability) => {
      const definition = CORE_ABILITY_UI_DEFS[ability.key] || { label: ability.key, effect: "" };
      const card = createSkillsCard(`${definition.label} · Rank ${ability.rank}/${ability.maxRank}`, definition.effect);
      appendSkillsProgressBar(card, ability.rank, ability.maxRank, "#8dffb2");
      const button = document.createElement("button");
      button.type = "button";
      const maxed = ability.rank >= ability.maxRank;
      button.disabled = maxed || Number(tokenData.total || 0) < Number(ability.nextCost || 0);
      button.textContent = maxed ? "Maximum Rank" : `Upgrade · ${ability.nextCost} token${ability.nextCost === 1 ? "" : "s"}`;
      button.style.padding = "8px";
      button.style.borderRadius = "7px";
      button.style.border = "1px solid rgba(95,226,156,0.42)";
      button.style.background = "rgba(30,126,78,0.48)";
      button.style.color = "#fff";
      button.style.cursor = button.disabled ? "default" : "pointer";
      button.style.opacity = button.disabled ? "0.5" : "1";
      button.addEventListener("click", () => sendRoomMessage("purchase_ability", { abilityKey: ability.key }));
      card.appendChild(button);
      skillsTabBody.appendChild(card);
    });
    return;
  }

  const unlockSummary = document.createElement("div");
  unlockSummary.style.gridColumn = "1 / -1";
  unlockSummary.style.padding = "10px";
  unlockSummary.style.borderRadius = "8px";
  unlockSummary.style.background = "rgba(143, 91, 224, 0.13)";
  unlockSummary.style.color = "#eadcff";
  unlockSummary.textContent = tokenData.canUnlockSpecial
    ? `${Math.max(1, Number(tokenData.specialAvailable) || 1)} Special Ability token${Number(tokenData.specialAvailable) === 1 ? "" : "s"} available.`
    : `Complete ${Math.max(0, Number(tokenData.nextSpecialUnlockAt || 10) - Number(tokenData.completedQuests || 0))} more quest${Number(tokenData.nextSpecialUnlockAt || 10) - Number(tokenData.completedQuests || 0) === 1 ? "" : "s"} to earn the next Special Ability token.`;
  skillsTabBody.appendChild(unlockSummary);
  appendProgressionResetControl("specials");

  const specialByKey = Object.fromEntries((latestProgressionSnapshot.specials || []).map((entry) => [entry.key, entry]));
  (latestProgressionSnapshot.specials || []).forEach((special) => {
    const definition = SPECIAL_ABILITY_UI_DEFS[special.key] || { label: special.key, abbreviation: "?", description: "", active: false };
    const specialRank = Math.max(0, Number(special.rank) || (special.unlocked ? 1 : 0));
    const specialMaxRank = Math.max(1, Number(special.maxRank) || 1);
    const card = createSkillsCard(
      specialMaxRank > 1
        ? `${definition.label} · Rank ${specialRank}/${specialMaxRank}`
        : definition.label,
      definition.description
    );
    const prerequisite = special.prerequisite ? specialByKey[special.prerequisite] : null;
    const prerequisiteMet = !special.prerequisite || prerequisite?.unlocked;
    const status = document.createElement("div");
    status.style.fontSize = "11px";
    status.style.color = special.unlocked ? "#8dffb2" : "rgba(220,230,240,0.72)";
    status.textContent = specialRank >= specialMaxRank
      ? specialMaxRank > 1 ? "Maximum rank" : "Unlocked"
      : special.unlocked
        ? `Unlocked · ${specialMaxRank - specialRank} upgrade${specialMaxRank - specialRank === 1 ? "" : "s"} remaining`
      : special.prerequisite
        ? `Requires ${SPECIAL_ABILITY_UI_DEFS[special.prerequisite]?.label || special.prerequisite}`
        : "Available branch";
    card.appendChild(status);

    if (specialRank < specialMaxRank) {
      const unlock = document.createElement("button");
      unlock.type = "button";
      unlock.disabled = !tokenData.canUnlockSpecial || !prerequisiteMet;
      unlock.textContent = specialRank > 0 ? "Add Another Inventory Slot" : "Choose Special Ability";
      unlock.style.padding = "8px";
      unlock.style.borderRadius = "7px";
      unlock.style.border = "1px solid rgba(179,124,255,0.46)";
      unlock.style.background = "rgba(109,58,170,0.46)";
      unlock.style.color = "#fff";
      unlock.style.cursor = unlock.disabled ? "default" : "pointer";
      unlock.style.opacity = unlock.disabled ? "0.46" : "1";
      unlock.addEventListener("click", () => sendRoomMessage("unlock_special_ability", { abilityKey: special.key }));
      card.appendChild(unlock);
    } else if (definition.active) {
      const readyAt = Number(latestProgressionSnapshot.cooldowns?.[`${special.key === "solar_charge" ? "solarCharge" : special.key}ReadyAt`]) || 0;
      const remaining = Math.max(0, Math.ceil((readyAt - Date.now()) / 1000));
      const assignmentRow = document.createElement("div");
      assignmentRow.style.display = "flex";
      assignmentRow.style.gap = "7px";
      const slotSelect = document.createElement("select");
      slotSelect.style.flex = "1";
      slotSelect.style.padding = "8px";
      slotSelect.style.borderRadius = "7px";
      slotSelect.style.border = "1px solid rgba(87,210,244,0.44)";
      slotSelect.style.background = "rgba(9,31,43,0.96)";
      slotSelect.style.color = "#fff";
      const assignedSlot = getHotbarSlotForSpecialAbility(special.key);
      for (let slotIndex = 0; slotIndex < HOTBAR_SLOT_COUNT; slotIndex++) {
        const option = document.createElement("option");
        option.value = String(slotIndex);
        option.textContent = `Hotbar ${slotIndex + 1}`;
        slotSelect.appendChild(option);
      }
      slotSelect.value = String(assignedSlot >= 0 ? assignedSlot : 0);
      const assign = document.createElement("button");
      assign.type = "button";
      assign.textContent = assignedSlot >= 0 ? "Move" : "Assign";
      assign.style.padding = "8px";
      assign.style.borderRadius = "7px";
      assign.style.border = "1px solid rgba(87,210,244,0.44)";
      assign.style.background = "rgba(26,117,145,0.48)";
      assign.style.color = "#fff";
      assign.style.cursor = "pointer";
      assign.addEventListener("click", () => {
        assignSpecialAbilityToHotbar(special.key, Number(slotSelect.value));
        renderSkillsWindow();
      });
      assignmentRow.appendChild(slotSelect);
      assignmentRow.appendChild(assign);
      card.appendChild(assignmentRow);
      const assignmentStatus = document.createElement("div");
      assignmentStatus.style.fontSize = "11px";
      assignmentStatus.style.color = "#8feaff";
      assignmentStatus.textContent = assignedSlot >= 0
        ? `Assigned to Hotbar ${assignedSlot + 1}${remaining > 0 ? ` · ${remaining}s cooldown` : ""}`
        : remaining > 0 ? `${remaining}s cooldown` : "Not assigned";
      card.appendChild(assignmentStatus);
      if (assignedSlot >= 0) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Remove from Hotbar";
        remove.style.padding = "7px";
        remove.style.borderRadius = "7px";
        remove.style.border = "1px solid rgba(255,255,255,0.18)";
        remove.style.background = "rgba(255,255,255,0.06)";
        remove.style.color = "#dce9f2";
        remove.style.cursor = "pointer";
        remove.addEventListener("click", () => {
          removeSpecialAbilityFromHotbar(special.key);
          renderSkillsWindow();
        });
        card.appendChild(remove);
      }
    }
    skillsTabBody.appendChild(card);
  });
}

/*
PROFILE INFO ROW
----------------
Purpose:
Creates a labeled row inside the profile panel.
*/

function createProfileInfoRow(labelText, valueText) {
  const root = document.createElement("div");
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "2px";

  const label = document.createElement("div");
  label.textContent = labelText;
  label.style.fontSize = "11px";
  label.style.letterSpacing = "0.04em";
  label.style.textTransform = "uppercase";
  label.style.color = "rgba(210, 225, 245, 0.72)";

  const value = document.createElement("div");
  value.textContent = valueText;
  value.style.fontSize = "14px";
  value.style.color = "#ffffff";
  value.style.fontWeight = "600";
  value.style.wordBreak = "break-word";

  root.appendChild(label);
  root.appendChild(value);

  return { root, label, value };
}

/*
PROFILE PANEL UPDATE
--------------------
Purpose:
Refreshes profile info from current auth and room state.
*/

function updateProfileUI() {
  if (!profileContentRows.name) return;

  const displayName =
    sessionStorage.getItem("playerName") ||
    authUser?.user_metadata?.display_name ||
    authUser?.email?.split("@")?.[0] ||
    "Not signed in";

  const classDisplayName = resolvedClassName || (joined ? "Loading..." : "Not joined");
  const profileRank = latestProgressionSnapshot.profileRank || {};
  const rankDisplayName = `${profileRank.label || "Recruit"} · Lv ${Math.max(1, Number(profileRank.level) || 1)}`;

  profileContentRows.name.value.textContent = displayName;
  profileContentRows.className.value.textContent = classDisplayName;
  profileContentRows.rank.value.textContent = rankDisplayName;
  profileContentRows.rank.value.style.color = "#ffd966";
}

/*
CREATE HOTBAR SLOT
------------------
Purpose:
Build a single hotbar tile that supports quality borders, stack counts,
and selected-slot highlighting.

Includes:
- item image
- fallback text
- count badge
- slot number label
*/

function createHotbarSlot(index) {
  const root = document.createElement("div");
  root.className = "hotbar-slot";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.alignItems = "center";
  root.style.gap = "4px";

  const tile = document.createElement("div");
  tile.className = "hotbar-slot-tile";
  tile.style.position = "relative";
  tile.style.width = "52px";
  tile.style.height = "52px";
  tile.style.borderRadius = "10px";
  tile.style.border = "1px solid rgba(255, 255, 255, 0.12)";
  tile.style.background = "rgba(16, 24, 36, 0.95)";
  tile.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,0.04)";
  tile.style.display = "flex";
  tile.style.alignItems = "center";
  tile.style.justifyContent = "center";
  tile.style.overflow = "hidden";
  tile.style.transition = "transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease, opacity 120ms ease";

  const icon = document.createElement("img");
  icon.style.width = "36px";
  icon.style.height = "36px";
  icon.style.objectFit = "contain";
  icon.style.imageRendering = "pixelated";
  icon.style.pointerEvents = "none";
  icon.style.display = "none";

  const fallbackLabel = document.createElement("div");
  fallbackLabel.style.position = "absolute";
  fallbackLabel.style.left = "0";
  fallbackLabel.style.top = "0";
  fallbackLabel.style.width = "100%";
  fallbackLabel.style.height = "100%";
  fallbackLabel.style.display = "flex";
  fallbackLabel.style.alignItems = "center";
  fallbackLabel.style.justifyContent = "center";
  fallbackLabel.style.fontSize = "10px";
  fallbackLabel.style.fontWeight = "700";
  fallbackLabel.style.color = "rgba(255,255,255,0.72)";
  fallbackLabel.style.pointerEvents = "none";
  fallbackLabel.textContent = "";

  const countBadge = document.createElement("div");
  countBadge.style.position = "absolute";
  countBadge.style.right = "4px";
  countBadge.style.bottom = "3px";
  countBadge.style.minWidth = "16px";
  countBadge.style.height = "16px";
  countBadge.style.padding = "0 4px";
  countBadge.style.borderRadius = "999px";
  countBadge.style.background = "rgba(0,0,0,0.78)";
  countBadge.style.color = "#ffffff";
  countBadge.style.fontSize = "11px";
  countBadge.style.fontWeight = "700";
  countBadge.style.lineHeight = "16px";
  countBadge.style.textAlign = "center";
  countBadge.style.display = "none";
  countBadge.style.pointerEvents = "none";

  const slotLabel = document.createElement("div");
  slotLabel.textContent = String(index + 1);
  slotLabel.style.position = "absolute";
  slotLabel.style.left = "4px";
  slotLabel.style.top = "3px";
  slotLabel.style.fontSize = "10px";
  slotLabel.style.fontWeight = "700";
  slotLabel.style.color = "rgba(255,255,255,0.68)";
  slotLabel.style.pointerEvents = "none";

  tile.appendChild(icon);
  tile.appendChild(fallbackLabel);
  tile.appendChild(countBadge);
  tile.appendChild(slotLabel);
  root.appendChild(tile);

  return {
    root,
    tile,
    icon,
    fallbackLabel,
    countBadge,
    slotLabel,
    index
  };
}

/*
DYNAMIC INVENTORY HELPERS
-------------------------
Purpose:
Build a packed 12-slot inventory from synced item quantities and apply quality styling.

Includes:
- encoded item key parsing
- quality outline lookup
- 10-per-slot stack packing
- dynamic slot rendering
*/

function parseInventoryItemKey(itemKey) {
  if (!itemKey) {
    return {
      baseKey: "",
      quality: "common"
    };
  }

  const [baseKey, quality = "common"] = String(itemKey).split(":");
  return {
    baseKey,
    quality: ITEM_QUALITY_DEFS[quality] ? quality : "common"
  };
}

function getInventoryBaseItemDef(itemKey) {
  const parsed = parseInventoryItemKey(itemKey);
  return INVENTORY_ITEM_DEFS.find((item) => item.key === parsed.baseKey) || null;
}

function getInventoryItemDefByKey(itemKey) {
  const parsed = parseInventoryItemKey(itemKey);
  const baseDef = getInventoryBaseItemDef(itemKey);

  if (!baseDef) return null;

  const qualityDef = ITEM_QUALITY_DEFS[parsed.quality] || ITEM_QUALITY_DEFS.common;

  return {
    ...baseDef,
    key: itemKey,
    quality: parsed.quality,
    label: baseDef.fixedLabel ? baseDef.label : `${qualityDef.label} ${baseDef.label}`
  };
}

/*
FLOATING LOOT TEXT HELPERS
--------------------------
Purpose:
Create and update short-lived loot feedback text above the local player.

Includes:
- quality-to-text-color mapping
- local floating text creation
- per-frame fade/rise updates
*/

function getQualityTextColor(quality) {
  if (quality === "legendary") return "#daa520";
  if (quality === "epic") return "#b56cff";
  if (quality === "rare") return "#62a8ff";
  if (quality === "uncommon") return "#67c97a";
  return "#c8ced8";
}

function showFloatingLootText(itemKey) {
  if (!sceneRef || !room?.state?.players || !myId) return;
  if (!itemKey) return;

  const itemDef = getInventoryItemDefByKey(itemKey);
  const parsed = parseInventoryItemKey(itemKey);
  const me = room.state.players.get(myId);

  if (!itemDef || !me) return;
  const displayPosition = logicalWorldToDisplay(me.x, me.y);

  const glowStrengthMap = {
  common: 0,
  uncommon: 4,
  rare: 6,
  epic: 10,
  legendary: 14
};

const glowAlphaMap = {
  common: 0,
  uncommon: 0.35,
  rare: 0.45,
  epic: 0.6,
  legendary: 0.75
};

const glowStrength = glowStrengthMap[parsed.quality] || 0;
const glowAlpha = glowAlphaMap[parsed.quality] || 0;

const text = sceneRef.add.text(
  displayPosition.x,
  displayPosition.y - 56,
  itemDef.label,
  {
    color: getQualityTextColor(parsed.quality),
    fontSize: "16px",
    fontStyle: "bold",
    stroke: "#0b0f14",
    strokeThickness: 4,
    shadow: {
      offsetX: 0,
      offsetY: 0,
      color: getQualityTextColor(parsed.quality),
      blur: glowStrength,
      fill: true
    }
  }
);

text.setAlpha(1);
text.setDepth(1100);

// apply glow intensity via alpha blending
if (glowStrength > 0) {
  text.setShadow(
    0,
    0,
    getQualityTextColor(parsed.quality),
    glowStrength,
    true,
    true
  );
  text.setAlpha(1);
}

  text.setOrigin(0.5, 1);
  text.setDepth(1100);

  floatingLootTexts.push({
    text,
    startX: displayPosition.x,
    startY: displayPosition.y - 56,
    startedAt: sceneRef.time.now
  });
}

function updateFloatingLootTexts(scene) {
  if (!scene || !floatingLootTexts.length) return;

  const now = scene.time.now;

  floatingLootTexts = floatingLootTexts.filter((entry) => {
    if (!entry?.text?.active) return false;

    const elapsed = now - entry.startedAt;
    const progress = Math.max(0, Math.min(1, elapsed / FLOATING_LOOT_TEXT_DURATION_MS));

    if (progress >= 1) {
      entry.text.destroy();
      return false;
    }

    entry.text.setPosition(
      entry.startX,
      entry.startY - FLOATING_LOOT_TEXT_RISE_PX * progress
    );
    entry.text.setAlpha(1 - progress);
    if (entry.text && entry.text.active) {
  const parsed = parseInventoryItemKey(entry.text.text);
  if (parsed.quality === "legendary") {
    entry.text.setAlpha((1 - progress) * (0.9 + Math.sin(now * 0.02) * 0.1));
  }
}

    return true;
  });
}

function getPackedInventoryStacks(inventoryCounts = {}) {
  const stacks = [];

  Object.entries(inventoryCounts)
    .filter(([, count]) => Number(count) > 0)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .forEach(([itemKey, count]) => {
      let remaining = Number(count) || 0;
      const stackMax = INVENTORY_STACK_MAX;

      while (remaining > 0) {
        const stackCount = Math.min(stackMax, remaining);
        stacks.push({
          itemKey,
          count: stackCount
        });
        remaining -= stackCount;
      }
    });

  return stacks.slice(0, currentInventorySlotCount);
}

function applyInventorySlotVisualState({ tile, quality = "common", selected = false, filled = false }) {
  const qualityDef = ITEM_QUALITY_DEFS[quality] || ITEM_QUALITY_DEFS.common;

  tile.style.transform = selected ? "translateY(-1px)" : "translateY(0)";

  if (!filled) {
    tile.style.borderColor = "rgba(255, 255, 255, 0.12)";
    tile.style.boxShadow = selected
      ? "0 0 0 2px rgba(255, 230, 140, 0.45), inset 0 0 0 1px rgba(255,255,255,0.04)"
      : "inset 0 0 0 1px rgba(255,255,255,0.04)";
    tile.style.opacity = "0.72";
    return;
  }

tile.style.borderColor = "transparent";

tile.style.boxShadow = selected
  ? `
      inset 0 0 0 4px ${qualityDef.borderColor},
      0 0 0 2px rgba(255, 230, 140, 0.60),
      0 0 16px ${qualityDef.glowColor}
    `
  : `
      inset 0 0 0 4px ${qualityDef.borderColor},
      0 0 0 1px ${qualityDef.glowColor}
    `;

  tile.style.opacity = "1";
}

function renderInventorySlot(slot, stackData) {
  if (!slot || !slot.tile) return;

  if (!stackData) {
    slot.root.dataset.itemKey = "";
    slot.root.dataset.quality = "common";
    slot.root.dataset.filled = "false";
    slot.itemKey = null;
    slot.itemDef = null;
    slot.isEmpty = true;

    slot.icon.src = "";
    slot.icon.alt = "";
    slot.icon.style.display = "none";
    slot.fallbackLabel.textContent = "";
    slot.fallbackLabel.style.display = "flex";
    slot.countBadge.style.display = "none";
    slot.tile.title = "";

    applyInventorySlotVisualState({
      tile: slot.tile,
      quality: "common",
      selected: false,
      filled: false
    });
    return;
  }

  const itemDef = getInventoryItemDefByKey(stackData.itemKey);
  const parsed = parseInventoryItemKey(stackData.itemKey);

  slot.root.dataset.itemKey = stackData.itemKey;
  slot.root.dataset.quality = parsed.quality;
  slot.root.dataset.filled = "true";
  slot.itemKey = stackData.itemKey;
  slot.itemDef = itemDef;
  slot.isEmpty = false;

  if (itemDef?.imageSrc) {
    slot.icon.src = itemDef.imageSrc;
    slot.icon.alt = itemDef.label;
    slot.icon.style.display = "block";
    slot.fallbackLabel.textContent = "";
  } else {
    slot.icon.src = "";
    slot.icon.alt = "";
    slot.icon.style.display = "none";
    slot.fallbackLabel.textContent = itemDef?.label?.slice(0, 2)?.toUpperCase() || "?";
  }

  slot.fallbackLabel.style.display = "flex";
  slot.countBadge.textContent = String(stackData.count);
  slot.countBadge.style.display = stackData.count > 1 ? "block" : "none";
  slot.tile.title = itemDef?.label || stackData.itemKey;

  applyInventorySlotVisualState({
    tile: slot.tile,
    quality: parsed.quality,
    selected: selectedInventoryKey === stackData.itemKey,
    filled: true
  });
}

function getHotbarSlotForSpecialAbility(abilityKey) {
  const assignedKey = `ability:${abilityKey}`;
  for (let index = 0; index < HOTBAR_SLOT_COUNT; index++) {
    if (hotbarAssignments[index] === assignedKey) return index;
  }
  return -1;
}

function removeSpecialAbilityFromHotbar(abilityKey) {
  const assignedKey = `ability:${abilityKey}`;
  for (let index = 0; index < HOTBAR_SLOT_COUNT; index++) {
    if (hotbarAssignments[index] === assignedKey) hotbarAssignments[index] = null;
  }
  refreshHotbarAssignments();
}

function assignSpecialAbilityToHotbar(abilityKey, requestedSlotIndex) {
  const slotIndex = Math.max(0, Math.min(HOTBAR_SLOT_COUNT - 1, Math.floor(Number(requestedSlotIndex) || 0)));
  removeSpecialAbilityFromHotbar(abilityKey);
  hotbarAssignments[slotIndex] = `ability:${abilityKey}`;
  selectedHotbarIndex = slotIndex;
  refreshHotbarAssignments();
}

function getUnlockedActiveSpecial(assignedKey) {
  if (!String(assignedKey || "").startsWith("ability:")) return null;
  const abilityKey = String(assignedKey).slice("ability:".length);
  const snapshot = (latestProgressionSnapshot.specials || []).find(
    (entry) => entry.key === abilityKey && entry.active && entry.unlocked
  );
  if (!snapshot) return null;
  return { key: abilityKey, ...snapshot, ...(SPECIAL_ABILITY_UI_DEFS[abilityKey] || {}) };
}

function getSpecialAbilityCooldownRemaining(abilityKey) {
  const cooldownProperty = abilityKey === "solar_charge"
    ? "solarChargeReadyAt"
    : `${abilityKey}ReadyAt`;
  const readyAt = Number(latestProgressionSnapshot.cooldowns?.[cooldownProperty]) || 0;
  return Math.max(0, Math.ceil((readyAt - Date.now()) / 1000));
}

/*
HOTBAR ASSIGNMENT REFRESH
-------------------------
Purpose:
Refresh hotbar icons, counts, titles, and quality outlines using the same
encoded inventory item keys as the inventory panel.

Includes:
- quality item support
- live count display
- empty/depleted state handling
*/

function refreshHotbarAssignments() {
  Object.values(hotbarSlotMap).forEach((slot) => {
    if (!slot || !slot.tile) return;

    let assignedKey = hotbarAssignments[slot.index] || null;
    if (assignedKey && !String(assignedKey).startsWith("ability:")) {
      hotbarAssignments[slot.index] = null;
      assignedKey = null;
    }
    let specialAbility = getUnlockedActiveSpecial(assignedKey);
    if (assignedKey?.startsWith("ability:") && !specialAbility) {
      hotbarAssignments[slot.index] = null;
      assignedKey = null;
      specialAbility = null;
    }
    const itemDef = assignedKey ? getInventoryItemDefByKey(assignedKey) : null;
    const parsed = parseInventoryItemKey(assignedKey);
    const liveCount = assignedKey ? getInventoryCountForItemKey(assignedKey) : 0;
    const hasItem = !!specialAbility || (!!itemDef && liveCount > 0);
    slot.fallbackLabel.style.color = "rgba(255,255,255,0.72)";

    if (specialAbility) {
      slot.icon.src = "";
      slot.icon.alt = "";
      slot.icon.style.display = "none";
      slot.fallbackLabel.textContent = specialAbility.abbreviation || specialAbility.label?.slice(0, 2)?.toUpperCase() || "AB";
      slot.fallbackLabel.style.color = "#8feaff";
    } else if (hasItem && itemDef?.imageSrc) {
      slot.icon.src = itemDef.imageSrc;
      slot.icon.alt = itemDef.label;
      slot.icon.style.display = "block";
      slot.fallbackLabel.textContent = "";
    } else if (itemDef) {
      slot.icon.src = "";
      slot.icon.alt = "";
      slot.icon.style.display = "none";
      slot.fallbackLabel.textContent = itemDef.label.slice(0, 2).toUpperCase();
    } else {
      slot.icon.src = "";
      slot.icon.alt = "";
      slot.icon.style.display = "none";
      slot.fallbackLabel.textContent = "";
      slot.fallbackLabel.style.color = "rgba(255,255,255,0.72)";
    }

    if (slot.countBadge) {
      const cooldownRemaining = specialAbility
        ? getSpecialAbilityCooldownRemaining(specialAbility.key)
        : 0;
      slot.countBadge.textContent = specialAbility ? `${cooldownRemaining}s` : String(liveCount);
      slot.countBadge.style.display = specialAbility && cooldownRemaining > 0
        ? "block"
        : hasItem && liveCount > 1
          ? "block"
          : "none";
    }

    slot.tile.title = specialAbility
      ? `${slot.index + 1}: ${specialAbility.label}${getSpecialAbilityCooldownRemaining(specialAbility.key) > 0 ? ` (${getSpecialAbilityCooldownRemaining(specialAbility.key)}s)` : ""}`
      : itemDef
      ? `${slot.index + 1}: ${itemDef.label}`
      : `Hotbar Slot ${slot.index + 1}`;

    applyHotbarSlotVisualState({
      tile: slot.tile,
      quality: specialAbility ? "rare" : parsed.quality,
      selected: slot.index === selectedHotbarIndex,
      filled: hasItem
    });
  });

  refreshHotbarSelectionState();
}
/*
HOTBAR VISUAL HELPERS
---------------------
Purpose:
Apply inventory-style quality borders and counts to hotbar slots.

Includes:
- quality border styling
- item count lookup from live inventory
- encoded item key support
*/

function applyHotbarSlotVisualState({ tile, quality = "common", selected = false, filled = false }) {
  const qualityDef = ITEM_QUALITY_DEFS[quality] || ITEM_QUALITY_DEFS.common;

  tile.style.transform = selected ? "translateY(-1px)" : "translateY(0)";

  if (!filled) {
    tile.style.borderColor = "transparent";
tile.style.boxShadow = selected
  ? "0 0 0 2px rgba(255, 230, 140, 0.50)"
  : "inset 0 0 0 1px rgba(255,255,255,0.04)";
    tile.style.opacity = "0.72";
    return;
  }

  tile.style.borderColor = "transparent";

tile.style.boxShadow = selected
  ? `
      inset 0 0 0 4px ${qualityDef.borderColor},
      0 0 0 2px rgba(255, 230, 140, 0.60),
      0 0 12px ${qualityDef.glowColor}
    `
  : `
      inset 0 0 0 4px ${qualityDef.borderColor},
      0 0 0 1px ${qualityDef.glowColor}
    `;

  tile.style.opacity = "1";
}

function getInventoryCountForItemKey(itemKey) {
  return Number(latestInventoryCounts?.[itemKey]) || 0;
}

/*
HOTBAR SELECTION STATE
----------------------
Purpose:
Refreshes the selected hotbar slot visual styling.
*/

function refreshHotbarSelectionState() {
  Object.entries(hotbarSlotMap).forEach(([indexKey, slot]) => {
    if (!slot?.tile) return;

    const hotbarIndex = Number(indexKey);
    const itemKey = hotbarAssignments[hotbarIndex] || null;
    const parsed = parseInventoryItemKey(itemKey);
    const specialAbility = getUnlockedActiveSpecial(itemKey);
    const hasItem = !!specialAbility || (!!itemKey && getInventoryCountForItemKey(itemKey) > 0);

    applyHotbarSlotVisualState({
      tile: slot.tile,
      quality: specialAbility ? "rare" : parsed.quality,
      selected: hotbarIndex === selectedHotbarIndex,
      filled: hasItem
    });
  });
}

/*
joinGame()
----------
Purpose:
Connect the authenticated player to the correct class-based Colyseus room.

Flow:
1. Get the current Supabase session and access token.
2. Join the class_room using the admin class code if provided.
3. Let the server resolve the student's class automatically.
4. Store the player's session id and set up room callbacks.
5. Load the saved room layout from room_info when provided.
6. Show the chat UI after a successful join.
7. Return true on success, false on failure.
*/
async function joinGame(chosenName, classCode, mapKey = DEFAULT_MAP_KEY) {
  if (joinGameInProgress) {
    console.warn("Ignored a second join request while a connection is already being created.");
    return false;
  }
  resourceCollectionSequence?.cancel?.();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session?.access_token) {
    console.error("Missing Supabase access token");
    return false;
  }

  joinGameInProgress = true;

  const multiplayerUrl = getGameServerUrl();
  const nextClient = new Client(multiplayerUrl);
  nextClient.auth.token = session.access_token;

  try {
    const joinOptions = {
      name: chosenName,
      token: session.access_token,
      mapKey: mapKey || DEFAULT_MAP_KEY
    };

    if (classCode) {
      joinOptions.classCode = classCode;
    }

    let joinedRoom = null;
    const retryDelays = [0, 250, 600, 1200];
    for (const retryDelay of retryDelays) {
      if (retryDelay > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, retryDelay));
      }
      try {
        joinedRoom = await nextClient.joinOrCreate("class_room", joinOptions);
        break;
      } catch (error) {
        const duplicateRace = String(error?.message || error).includes("already connected");
        if (!duplicateRace || retryDelay === retryDelays[retryDelays.length - 1]) throw error;
      }
    }

    if (!joinedRoom) return false;

    Object.values(players).forEach((entry) => {
      entry.shadow?.destroy();
      entry.ring?.destroy();
      entry.container?.destroy();
      entry.label?.destroy();
    });
    players = {};
    clearRuntimeMobSprites();
    clearRuntimeCollectableSprites();

    client = nextClient;
    room = joinedRoom;
    activeMatchClassCode = classCode || "";

    myId = room.sessionId;
    joined = true;
    lastInput = {
      left: false,
      right: false,
      up: false,
      down: false,
      editorMode: false,
      speedScale: 1
    };
    lastSyncedEditorTileFrames = new Map();
    lastSyncedEditorMetadata = new Map();

    const activeRoomConnection = room;
    activeRoomConnection.onLeave((code, reason) => {
      if (room !== activeRoomConnection) return;

      joined = false;
      room = null;
      client = null;
      myId = null;
      resourceCollectionSequence?.cancel?.();
      closeQuestAcquiredPopup();
      closeTradeRequestPrompt();
      closeTradeWindow();
      closeOtherPlayerProfile();
      setOutOfOxygenWarning(false);
      lastInput = {
        left: false,
        right: false,
        up: false,
        down: false,
        editorMode: false,
        speedScale: 1
      };

      if (code === 4001) {
        appendSystemChatLine(
          "System: This account was connected in another window or computer, so this connection was closed.",
          "#ffcc88"
        );
        return;
      }

      if (!isMapTransitionInProgress) {
        appendSystemChatLine(
          `System: Room connection closed${code ? ` (${code})` : ""}${reason ? `: ${reason}` : "."} Reconnecting...`,
          "#ffcc88"
        );

        if (!roomReconnectInProgress && authUser) {
          roomReconnectInProgress = true;
          window.setTimeout(async () => {
            try {
              if (joined || room) return;
              const reconnectMapKey = currentMapKey || DEFAULT_MAP_KEY;
              const recovered = await rejoinCurrentMap(reconnectMapKey);
              if (recovered || joined) {
                appendSystemChatLine(
                  `System: Reconnected to "${currentMapKey || reconnectMapKey}".`,
                  "#7CFC00"
                );
              } else {
                appendSystemChatLine(
                  "System: Automatic reconnect failed. Reload the page to rejoin.",
                  "#ff6666"
                );
              }
            } catch (error) {
              console.error("Automatic room reconnect failed:", error);
              appendSystemChatLine(
                "System: Automatic reconnect failed. Reload the page to rejoin.",
                "#ff6666"
              );
            } finally {
              roomReconnectInProgress = false;
            }
          }, 350);
        }
      }
    });

    if (infoText) {
      infoText.setText(
        classCode
          ? `E3 Prototype Room\nClass: ${classCode}`
          : "E3 Prototype Room\nClass: Loading..."
      );
    }

if (chatWrapper) {
  chatWrapper.style.display = "flex";
}

if (tileGroupRecording) {
  finishTileGroupRecording();
}
tileEditorEnabled = false;
metadataEditorEnabled = false;
objectEditorEnabled = false;
syncTileEditorVisibility();
updateProfileUI();
lastEditorStatusMessage = "";

    room.onMessage("room_info", (data) => {
      resolvedClassCode = data.classCode || "";
      resolvedClassName = data.className || "";
      currentLayoutKey = data.layoutKey || null;
      currentMapKey = data.mapKey || DEFAULT_MAP_KEY;

      if (
        resolvedClassCode &&
        activeMatchClassCode !== resolvedClassCode &&
        !isNormalizingClassRoom
      ) {
        isNormalizingClassRoom = true;
        const normalizedMapKey = currentMapKey;
        window.setTimeout(async () => {
          try {
            const normalized = await rejoinCurrentMap(normalizedMapKey, resolvedClassCode);
            if (normalized) {
              appendSystemChatLine("System: Joined the shared class room.", "#7CFC00");
            }
          } finally {
            isNormalizingClassRoom = false;
          }
        }, 0);
      }

      if (infoText) {
        infoText.setText(`E3 Prototype Room\nClass: ${resolvedClassName} (${resolvedClassCode})`);
      }

      updateProfileUI();

      console.log("ROOM INFO LAYOUT:", data.layout);

      if (data.layout && sceneRef) {
        console.log("SERVER LAYOUT RECEIVED:", {
          baseRows: data.layout.base?.length || 0,
          baseCols: data.layout.base?.[0]?.length || 0
        });

        const expandedLayout = expandRoomLayoutToSize(
          data.layout,
          DEFAULT_ROOM_TILE_WIDTH,
          DEFAULT_ROOM_TILE_HEIGHT
        );

        const applied = applyRoomLayout(sceneRef, expandedLayout);

        if (applied) {
          appendSystemChatLine(
            `System: Loaded map "${data.mapKey || DEFAULT_MAP_KEY}" (${expandedLayout.base[0]?.length || 0} x ${expandedLayout.base.length || 0}).`,
            "#7CFC00"
          );
        } else {
          console.warn("Failed to apply expanded server room layout, keeping current layout.");
          appendSystemChatLine(
            `System: Failed to load map "${data.mapKey || DEFAULT_MAP_KEY}".`,
            "#ff6666"
          );
        }
      }

      applyTilesetMetadataRows(data.tilesetMetadata || []);
      clearRuntimeMobSprites();
      clearRuntimeCollectableSprites();
      clearAlienArtifactVisuals();
    });

    room.onMessage("interaction_result", (data) => {
      if (data && data.success === false) {
        resourceCollectionSequence?.handleFailure?.(data.message);
      }

      if (interactionResultText) {
        interactionResultText.setColor(data.success ? "#7CFC00" : "#ff6666");
        interactionResultText.setText(data.message);

        sceneRef.time.delayedCall(3000, () => {
          if (interactionResultText) {
            interactionResultText.setText("");
          }
        });
      }

      if (data?.message) {
        appendSystemChatLine(
          `System: ${data.message}`,
          data.success ? "#7CFC00" : "#ff6666"
        );
      }
    });

    room.onMessage("mob_runtime_snapshot", (data) => {
      applyRuntimeMobSnapshot(data);
    });

    room.onMessage("collectable_runtime_snapshot", (data) => {
      applyRuntimeCollectableSnapshot(data);
    });

    room.onMessage("alien_artifact_snapshot", (data) => {
      applyAlienArtifactSnapshot(data);
    });

    room.onMessage("alien_artifact_announcement", (data) => {
      if (data?.message) appendSystemChatLine(`System: ${data.message}`, "#c89cff");
    });

    room.onMessage("quest_snapshot", (data) => {
      updateQuestUI(data);
      window.requestAnimationFrame(applyDefaultHUDLayout);
    });

    room.onMessage("quest_acquired", (data) => {
      showQuestAcquiredPopup(data);
    });

    room.onMessage("achievement_awarded", (data) => {
      studentDashboard?.enqueueAchievement(data || {});
    });

    room.onMessage("mission_progress", (data) => {
      latestMissionPosition = Math.max(0, Math.min(36, Number(data?.position) || 0));
      studentDashboard?.setMissionPosition(latestMissionPosition);
    });

    room.onMessage("quest_discard_result", (data) => {
      if (data?.success && data?.questId === activeQuestTurnInId) {
        questTurnInSubmitting = false;
        closeQuestTurnInUI();
      }
      if (data?.message) showStatusMessage(data.message, data.success !== false);
    });

    room.onMessage("inventory_delete_result", (data) => {
      if (data?.message) showStatusMessage(data.message, data.success !== false);
    });

    room.onMessage("quest_turn_in_result", (data) => {
      if (data?.questId && data.questId !== activeQuestTurnInId) return;
      questTurnInSubmitting = false;
      if (data?.success) {
        closeQuestTurnInUI();
        if (data?.artifactAwarded) {
          showFloatingLootText(data.artifactItemKey || ALIEN_ARTIFACT_ITEM_ID);
          showStatusMessage("Alien Artifact recovered from the transmission reward.", true);
        }
      } else {
        renderQuestTurnInUI();
        if (data?.message) showStatusMessage(data.message, false);
      }
    });

    room.onMessage("progression_snapshot", (data) => {
      latestProgressionSnapshot = {
        ...latestProgressionSnapshot,
        ...(data || {}),
        tokens: { ...latestProgressionSnapshot.tokens, ...(data?.tokens || {}) },
        vitals: { ...latestProgressionSnapshot.vitals, ...(data?.vitals || {}) },
        cooldowns: { ...latestProgressionSnapshot.cooldowns, ...(data?.cooldowns || {}) },
        effects: { ...latestProgressionSnapshot.effects, ...(data?.effects || {}) },
        settings: { ...latestProgressionSnapshot.settings, ...(data?.settings || {}) }
      };
      tradesEnabled = latestProgressionSnapshot.settings?.tradesEnabled !== false;
      ensureInventorySlotCapacity(latestProgressionSnapshot.vitals?.inventorySlots);
      if (isSkillsWindowOpen()) renderSkillsWindow();
      refreshHotbarAssignments();
    });

    room.onMessage("progression_result", (data) => {
      if (data?.message) showStatusMessage(data.message, data.success !== false);
      if (isSkillsWindowOpen()) renderSkillsWindow();
    });

    room.onMessage("player_profile_snapshot", (data) => {
      openOtherPlayerProfile(data);
    });

    room.onMessage("trade_settings_result", (data) => {
      if (data?.success) tradesEnabled = data.tradesEnabled !== false;
      const toggle = settingsOverlay?.querySelector?.("#allow-trades-setting");
      if (toggle) toggle.checked = tradesEnabled;
      if (data?.message) showStatusMessage(data.message, data.success !== false);
    });

    room.onMessage("trade_request", (data) => {
      showTradeRequestPrompt(data);
    });

    room.onMessage("trade_snapshot", (data) => {
      openTradeWindow(data);
    });

    room.onMessage("trade_confirmation_required", (data) => {
      showTradeConfirmationPrompt(data);
    });

    room.onMessage("trade_cancelled", (data) => {
      closeTradeRequestPrompt();
      closeTradeWindow();
      if (data?.message) showStatusMessage(data.message, false);
    });

    room.onMessage("trade_completed", (data) => {
      closeTradeWindow();
      if (data?.message) showStatusMessage(data.message, true);
    });

    room.onMessage("trade_result", (data) => {
      if (data?.message) showStatusMessage(data.message, data.success !== false);
    });

      room.onMessage("ecosystem_debug_settings", (payload) => {
    showEsmLabels = !!payload?.showEsmLabels;

    if (!showEsmLabels) {
      Object.values(runtimeMobStatusTexts).forEach((text) => {
        text?.setVisible?.(false);
      });
    }
  });

    room.onMessage("loot_feedback", (data) => {
      if (!data?.itemKey) return;
      if (data.presentation === "resource_wheel") {
        resourceCollectionSequence?.receiveReward?.(data);
        return;
      }
      showFloatingLootText(data.itemKey);
    });

    room.onMessage("mob_damage_popup", (data) => {
      if (!data) return;

      const popupMapKey = data.mapKey || currentMapKey || DEFAULT_MAP_KEY;
      if (popupMapKey !== (currentMapKey || DEFAULT_MAP_KEY)) {
        return;
      }

      showFloatingMobDamageText({
        x: data.x ?? 0,
        y: data.y ?? 0,
        text: data.text || "",
        kind: data.kind || "hit"
      });
    });

    room.onMessage("alien_artifact_damage_popup", (data) => {
      if (!data) return;
      const popupMapKey = data.mapKey || currentMapKey || DEFAULT_MAP_KEY;
      if (popupMapKey !== (currentMapKey || DEFAULT_MAP_KEY)) return;
      showFloatingMobDamageText({
        x: data.x ?? 0,
        y: data.y ?? 0,
        text: data.text || "",
        kind: data.kind || "hit"
      });
    });

    room.onMessage("portal_activation", (data) => {
      const activationMapKey = data?.mapKey || DEFAULT_MAP_KEY;
      if (activationMapKey !== (currentMapKey || DEFAULT_MAP_KEY)) return;
      if (!data?.portalKey) return;

      activatingPortalKey = data.portalKey;
      activatingPortalUntil = Date.now() + Math.max(500, Number(data.durationMs) || 2500);
    });

        room.onMessage("map_transition_result", async (data) => {
      if (!data?.success) {
        activatingPortalKey = null;
        activatingPortalUntil = 0;
        appendSystemChatLine(
          `System: ${data?.message || "Map transition failed."}`,
          "#ff6666"
        );
        return;
      }

      const previousMapKey = currentMapKey || DEFAULT_MAP_KEY;
      await runMapTransitionFade(async () => {
        pendingSpawnX = data.spawnX ?? null;
        pendingSpawnY = data.spawnY ?? null;
        lastTriggeredTransitionKey = "";
        lastTriggeredTransitionAt = 0;
        setCurrentMapKey(data.toMapKey || DEFAULT_MAP_KEY);

        appendSystemChatLine(
          `System: Entering '${data.doorwayLabel || currentMapKey}'.`,
          "#7CFC00"
        );

        await rejoinCurrentMap(previousMapKey);
      });
    });

    room.onMessage("chat_result", (data) => {
      studentDashboard?.appendChat({ text: data?.message || "", kind: data?.kind || "chat" });
      if (!chatLog) return;

      const line = document.createElement("div");
      line.textContent = data.message;
      line.style.marginBottom = "4px";

      if (data.kind === "chat") {
        line.style.color = "#ffffff";
      } else if (data.kind === "success") {
        line.style.color = "#7CFC00";
      } else if (data.kind === "error") {
        line.style.color = "#ff6666";
      } else if (data.kind === "announcement") {
        line.style.color = "#ffd966";
        line.style.fontWeight = "bold";

        if (announcementText) {
          announcementText.setText(data.message);
          announcementText.setX(sceneRef.cameras.main.width / 2);
          announcementText.setY(20);
          announcementText.setVisible(true);

          if (announcementClearTimer) {
            announcementClearTimer.remove(false);
          }

          announcementClearTimer = sceneRef.time.delayedCall(5000, () => {
            if (announcementText) {
              announcementText.setText("");
              announcementText.setVisible(false);
            }
          });
        }
      } else {
        line.style.color = data.success ? "#7CFC00" : "#ff6666";
      }

      chatLog.appendChild(line);
      chatLog.scrollTop = chatLog.scrollHeight;
    });

    const callbacks = Callbacks.get(room);

    callbacks.onAdd("players", (player, id) => {
      if (players[id]) {
        players[id].shadow?.destroy();
        players[id].ring?.destroy();
        players[id].container?.destroy();
        players[id].label?.destroy();
        delete players[id];
      }

      const mapSpawnMarker = findSpawnMarkerTile();
      const mapSpawnWorldX = mapSpawnMarker ? tileToWorldX(mapSpawnMarker.tileX) + TILE_SIZE / 2 : null;
      const mapSpawnWorldY = mapSpawnMarker ? tileToWorldY(mapSpawnMarker.tileY) + TILE_SIZE / 2 : null;

      const startX =
        id === myId
          ? (pendingSpawnX ?? mapSpawnWorldX ?? (player.x ?? 100))
          : (player.x ?? 100);

      const startY =
        id === myId
          ? (pendingSpawnY ?? mapSpawnWorldY ?? (player.y ?? 100))
          : (player.y ?? 100);

      const isLocalPlayer = id === myId;

      const display = createPlayerDisplayObject(sceneRef, startX, startY, isLocalPlayer);

      const label = sceneRef.add.text(
        startX,
        startY - PLAYER_LABEL_OFFSET_Y,
        player.name || "Player",
        {
          color: "#ffffff",
          fontSize: "14px",
          backgroundColor: "rgba(10, 16, 24, 0.65)",
          padding: { left: 6, right: 6, top: 2, bottom: 2 }
        }
      );

      label.setOrigin(0.5, 0.5);
      label.setDepth(11);
      if (!isLocalPlayer) {
        label.setInteractive({ useHandCursor: true });
        label.on("pointerdown", (_pointer, _localX, _localY, event) => {
          if (tileEditorEnabled || metadataEditorEnabled || objectEditorEnabled) return;
          event?.stopPropagation?.();
          sendRoomMessage("request_player_profile", { playerId: id });
        });
      }

      players[id] = {
        shadow: display.shadow,
        ring: display.ring,
        container: display.container,
        layers: display.layers,
        label,
        lastDirection: "down",
        currentAnim: null,
        activeActionName: null,
        activeActionUntil: 0
      };

      display.container.setSize(34, 54);
      display.container.setInteractive(
        new Phaser.Geom.Rectangle(-17, -46, 34, 54),
        Phaser.Geom.Rectangle.Contains
      );
      display.container.on("pointerdown", (_pointer, _localX, _localY, event) => {
        if (id === myId || tileEditorEnabled || metadataEditorEnabled || objectEditorEnabled) return;
        event?.stopPropagation?.();
        sendRoomMessage("request_player_profile", { playerId: id });
      });

      setPlayerScreenPosition(players[id], startX, startY);
      updatePlayerSprite(sceneRef, players[id], player, id);

      if (isLocalPlayer) {
        startFollowingLocalPlayer();
        pendingSpawnX = null;
        pendingSpawnY = null;
      }
    });

    callbacks.onRemove("players", (_player, id) => {
      if (!players[id]) return;

      players[id].shadow?.destroy();
      players[id].ring?.destroy();
      players[id].container?.destroy();
      players[id].label?.destroy();
      delete players[id];
    });

    return true;
  } catch (error) {
    console.error("Failed to join room:", error);
    return false;
  } finally {
    joinGameInProgress = false;
  }
}
