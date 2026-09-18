import { defineServer, defineRoom, Room, Client, ServerError } from "colyseus";
import { RoomState } from "./schema/RoomState";
import { Player } from "./schema/Player";
import { supabaseAdmin } from "./supabase";
import cors from "cors";
import { json } from "express";
import {
  createClassroomAuthorizationUrl,
  createClassroomState,
  decryptClassroomRefreshToken,
  encryptClassroomRefreshToken,
  exchangeClassroomAuthorizationCode,
  getGoogleProfile,
  listClassroomCourses,
  listClassroomStudents,
  refreshClassroomAccessToken,
  verifyClassroomState
} from "./googleClassroom";

type LayeredRoomLayout = {
  base: number[][];
  detail: number[][];
  overhead: number[][];
  objects: number[][];
};

type TilesetFrameMetadataRow = {
  frame_index: number;
  collision: boolean;
  animate: boolean;
  action_center: "craft" | "dig" | "mine" | "fish" | "comm" | null;
};

type MapPortalLinkDefinition = {
  fromMapKey: string;
  portalKey: string;
  toMapKey: string;
  label: string;
  spawnTileX: number;
  spawnTileY: number;
};

const MAP_PORTAL_LINKS: MapPortalLinkDefinition[] = [
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
    fromMapKey: "shop_entrance",
    portalKey: "overworld",
    toMapKey: "default_room",
    label: "Overworld",
    spawnTileX: 0,
    spawnTileY: 0
  },
  {
    fromMapKey: "room_2",
    portalKey: "overworld",
    toMapKey: "default_room",
    label: "Overworld",
    spawnTileX: 0,
    spawnTileY: 0
  },
  {
    fromMapKey: "room_3",
    portalKey: "overworld",
    toMapKey: "default_room",
    label: "Overworld",
    spawnTileX: 0,
    spawnTileY: 0
  },
  {
    fromMapKey: "cave_1_entrance",
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
    fromMapKey: "cave_3_entrance",
    portalKey: "overworld",
    toMapKey: "default_room",
    label: "Overworld",
    spawnTileX: 0,
    spawnTileY: 0
  }
];

/*
ROOM LAYOUT EXPANSION HELPER
----------------------------
Purpose:
Takes an older saved room layout and expands it into the newer larger map size
without losing the placed tiles.

Includes:
- layer padding
- safe fallback fill
- consistent size across all layers
*/

function expandLayerToSize(
  layer: number[][],
  targetWidth: number,
  targetHeight: number,
  fillValue = -1
) {
  const expanded = Array.from({ length: targetHeight }, (_, rowIndex) =>
    Array.from({ length: targetWidth }, (_, colIndex) => {
      return layer?.[rowIndex]?.[colIndex] ?? fillValue;
    })
  );

  return expanded;
}

function expandRoomLayoutToSize(
  layout: LayeredRoomLayout,
  targetWidth: number,
  targetHeight: number
): LayeredRoomLayout {
  return {
    base: expandLayerToSize(layout.base, targetWidth, targetHeight, -1),
    detail: expandLayerToSize(layout.detail, targetWidth, targetHeight, -1),
    overhead: expandLayerToSize(layout.overhead, targetWidth, targetHeight, -1),
    objects: expandLayerToSize(layout.objects ?? [], targetWidth, targetHeight, -1)
  };
}

const TILE_SIZE = 16;
const ISO_STORED_FRAME_OFFSET = 20000;
const ISO_PREVIOUS_STORED_FRAME_OFFSET = 10000;
const ISO_PREVIOUS_FRAME_COUNT = 160;
const ROOM_OFFSET_X = 40;
const ROOM_OFFSET_Y = 70;
const DEFAULT_ROOM_TILE_WIDTH = 90;
const DEFAULT_ROOM_TILE_HEIGHT = 60;
const DEFAULT_MAP_KEY = "default_room";
const ACTION_CENTER_RADIUS_TILES = 3;
const PLAYER_ACTION_FRAME_MS = 220;

const OBJECT_EMPTY = -1;
const OBJECT_SHEET_COLUMNS = 10;
const PORTAL_SPAWN_FRAME = 10;
const PLANT_RESPAWN_AREA_SIZE_PX = 128;
const PLANT_GROWTH_STAGE_COUNT = 6;
const PLANT_GROWTH_STAGE_MS = 30000;
const INVENTORY_SLOT_COUNT = 12;
const INVENTORY_STACK_MAX = 10;
const INVENTORY_EXPANSION_MAX = 4;
const COLLECTABLE_NODE_RESPAWN_MS = 60 * 1000;
const MAX_ACTIVE_QUESTS = 5;
const INCAPACITATED_MOB_DESPAWN_MS = 30 * 1000;
const MOVEMENT_OXYGEN_INTERVAL_MS = 1 * 1000;
const RESOURCE_QUESTION_OXYGEN_COST = 5;
const ALIEN_ARTIFACT_ITEM_ID = "alien_artifact";
const ALIEN_ARTIFACT_QUEST_DROP_CHANCE = 0.25;
const ALIEN_ARTIFACT_SUMMON_COST = 5;
const ALIEN_ARTIFACT_MAX_DURABILITY = 100;
const ALIEN_ARTIFACT_RESOURCE_RADIUS_TILES = 6;
const ALIEN_ARTIFACT_REGEN_INTERVAL_MS = 5_000;
const ASTROBIOLOGY_ARTIFACT_COLLECTION_POINTS = 1;
const ASTROBIOLOGY_STRUCTURE_DESTRUCTION_POINTS = 5;
function getItemStackMax(_itemId: string) {
  return INVENTORY_STACK_MAX;
}
const HERBIVORE_VISION_RADIUS_PX = 200;
const CARNIVORE_VISION_RADIUS_PX = 220;
const APEX_PREDATOR_VISION_RADIUS_PX = 260;

const CARNIVORE_ATTACK_RANGE_PX = TILE_SIZE * 2.0;
const APEX_PREDATOR_ATTACK_RANGE_PX = TILE_SIZE * 2.2;
const HERBIVORE_ATTACK_RANGE_PX = TILE_SIZE * 1.6;

const PREDATOR_ATTACK_COOLDOWN_MS = 1000;
const HERBIVORE_ATTACK_COOLDOWN_MS = 0;

const SHARED_ANIMAL_BASE_SPEED = 26;
const LOW_HEALTH_RETREAT_THRESHOLD = 0.10;

const FOOD_SOURCE_VICINITY_PX = TILE_SIZE * 3;
const FOOD_SOURCE_ABANDON_MS = 4000;
const FOOD_SOURCE_AVOID_MS = 5000;

const OFFSPRING_SPAWN_MIN_TILES = 5;
const OFFSPRING_SPAWN_MAX_TILES = 10;
const HERBIVORE_DIRECTION_CYCLE_STEPS = 6;
const HERBIVORE_EAT_PLANT_MS = 6000;
const HERBIVORE_DEATH_ROLL_INTERVAL_MS = 5 * 60 * 1000;
const HERBIVORE_DEATH_ROLL_CHANCE = 0.20;

const CARNIVORE_DEATH_ROLL_INTERVAL_MS = 5 * 60 * 1000;
const CARNIVORE_DEATH_ROLL_CHANCE = 0.20;
const APEX_PREDATOR_DEATH_ROLL_INTERVAL_MS = 10 * 60 * 1000;
const APEX_PREDATOR_DEATH_ROLL_CHANCE = 0.20;

const CARNIVORE_REPRODUCTION_PLANT_COUNTERS = 9;
const APEX_PREDATOR_REPRODUCTION_PLANT_COUNTERS = 25;

const PLAYER_PLANT_COLLECT_MS = 2000;
const ECOSYSTEM_EAT_TRANSFER_INTERVAL_MS = 1600;
const ECOSYSTEM_EAT_RANGE_PX = TILE_SIZE * 2.25;

const ECOSYSTEM_ESM_DRAIN_PER_SECOND = 0.08;
const ECOSYSTEM_WANDER_MIN_TILES = 8;
const ECOSYSTEM_WANDER_MAX_TILES = 18;
const ECOSYSTEM_WANDER_THINK_MIN_MS = 3500;
const ECOSYSTEM_WANDER_THINK_MAX_MS = 7000;

const PORTAL_FRAME_KEYS: Record<number, string> = {
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

type ItemQuality = "common" | "uncommon" | "rare" | "epic" | "legendary";

const ITEM_QUALITY_ROLLS_BY_TIER: Record<number, Array<{ quality: ItemQuality; chance: number }>> = {
  1: [
    { quality: "legendary", chance: 1 / 1000 },
    { quality: "epic", chance: 1 / 100 },
    { quality: "rare", chance: 1 / 20 },
    { quality: "uncommon", chance: 0.20 }
  ],
  2: [
    { quality: "legendary", chance: 1 / 100 },
    { quality: "epic", chance: 1 / 10 },
    { quality: "rare", chance: 1 / 5 }
  ],
  3: [
    { quality: "legendary", chance: 1 / 50 },
    { quality: "epic", chance: 1 / 5 }
  ]
};

const ITEM_QUALITY_FALLBACK_BY_TIER: Record<number, ItemQuality> = {
  1: "common",
  2: "uncommon",
  3: "rare"
};

const ITEM_QUALITY_RANK: Record<ItemQuality, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4
};

const QUEST_SKILL_POINTS_BY_QUALITY: Record<ItemQuality, number> = {
  common: 1,
  uncommon: 2,
  rare: 5,
  epic: 10,
  legendary: 20
};

type ScienceSkillKey = "geology" | "botany" | "zoology" | "chemistry" | "astrobiology";
type CoreAbilityKey =
  | "oxygen_storage"
  | "energy_storage"
  | "taser_damage"
  | "taser_range"
  | "taser_attacks";
type SpecialAbilityKey =
  | "sprint"
  | "moxie"
  | "solar_charge"
  | "oxygen_reserve"
  | "energy_reserve"
  | "geology_mastery"
  | "botany_mastery"
  | "zoology_mastery"
  | "chemistry_mastery"
  | "efficient_taser"
  | "inventory_expansion";

const SCIENCE_SKILL_KEYS: ScienceSkillKey[] = [
  "geology",
  "botany",
  "zoology",
  "chemistry",
  "astrobiology"
];
const CORE_ABILITY_DEFS: Record<CoreAbilityKey, { maxRank: number }> = {
  oxygen_storage: { maxRank: 5 },
  energy_storage: { maxRank: 5 },
  taser_damage: { maxRank: 5 },
  taser_range: { maxRank: 5 },
  taser_attacks: { maxRank: 3 }
};
const SPECIAL_ABILITY_DEFS: Record<SpecialAbilityKey, {
  active: boolean;
  prerequisite?: SpecialAbilityKey;
  maxRank?: number;
}> = {
  sprint: { active: true },
  moxie: { active: true },
  solar_charge: { active: true },
  oxygen_reserve: { active: false },
  energy_reserve: { active: false },
  geology_mastery: { active: false, prerequisite: "energy_reserve" },
  botany_mastery: { active: false, prerequisite: "moxie" },
  zoology_mastery: { active: false, prerequisite: "sprint" },
  chemistry_mastery: { active: false, prerequisite: "solar_charge" },
  efficient_taser: { active: false, prerequisite: "energy_reserve" },
  inventory_expansion: { active: false, maxRank: INVENTORY_EXPANSION_MAX }
};
const ACTIVE_SPECIAL_COOLDOWNS_MS: Partial<Record<SpecialAbilityKey, number>> = {
  sprint: 20_000,
  moxie: 60_000,
  solar_charge: 60_000
};
const PROGRESSION_ITEM_PREFIX = "progress_";
const LEGACY_TOKEN_ITEM_PREFIX = "comm_quest_token:";
const PLAYER_RUNTIME_VITALS = new Map<string, { oxygen: number; energy: number }>();
const CLASS_MISSION_PROGRESS = new Map<string, number>();
const ACTIVE_ACCOUNT_CLIENTS = new Map<string, Client>();

async function loadClassMissionPosition(classId: string) {
  const { data, error } = await supabaseAdmin
    .from("classes")
    .select("mission_position")
    .eq("class_id", classId)
    .maybeSingle();
  if (error) {
    console.warn("Mission position is using memory until the database migration is applied:", error.message);
    return CLASS_MISSION_PROGRESS.get(classId) || 0;
  }
  const position = Math.max(0, Math.min(36, Math.floor(Number(data?.mission_position) || 0)));
  CLASS_MISSION_PROGRESS.set(classId, position);
  return position;
}

async function saveClassMissionPosition(classId: string, position: number) {
  CLASS_MISSION_PROGRESS.set(classId, position);
  const { error } = await supabaseAdmin
    .from("classes")
    .update({ mission_position: position })
    .eq("class_id", classId);
  if (error) console.error("Failed to persist mission position:", error);
}

function isVirtualProgressionItemId(itemId: string) {
  return itemId.startsWith(PROGRESSION_ITEM_PREFIX) || itemId.startsWith(LEGACY_TOKEN_ITEM_PREFIX);
}

function getSkillItemId(skillKey: ScienceSkillKey) {
  return `${PROGRESSION_ITEM_PREFIX}skill_${skillKey}`;
}

function getSkillRarityItemId(skillKey: ScienceSkillKey, quality: ItemQuality) {
  return `${PROGRESSION_ITEM_PREFIX}skill_${skillKey}_${quality}`;
}

function getCoreAbilityItemId(abilityKey: CoreAbilityKey) {
  return `${PROGRESSION_ITEM_PREFIX}ability_${abilityKey}`;
}

function getSpecialAbilityItemId(abilityKey: SpecialAbilityKey) {
  return `${PROGRESSION_ITEM_PREFIX}special_${abilityKey}`;
}

function getTokensSpentItemId() {
  return `${PROGRESSION_ITEM_PREFIX}tokens_spent`;
}

function getCompletedQuestsItemId() {
  return `${PROGRESSION_ITEM_PREFIX}quests_completed`;
}

function getSpecialTokensEarnedItemId() {
  return `${PROGRESSION_ITEM_PREFIX}special_tokens_earned`;
}

function getSpecialTokenBalanceItemId() {
  return `${PROGRESSION_ITEM_PREFIX}special_tokens_available`;
}

function getSpecialTokenMigrationItemId() {
  return `${PROGRESSION_ITEM_PREFIX}special_tokens_v2_migrated`;
}

function getAstrobiologyStructureCountItemId() {
  return `${PROGRESSION_ITEM_PREFIX}astrobiology_structures_destroyed`;
}

function getTradesDisabledItemId() {
  return `${PROGRESSION_ITEM_PREFIX}setting_trades_disabled`;
}

function getSpecialTokensEarnedForQuestCount(completedQuests: number) {
  let earned = 0;
  let threshold = 10;
  const completed = Math.max(0, Math.floor(completedQuests));
  while (completed >= threshold && earned < 32) {
    earned += 1;
    threshold *= 2;
  }
  return earned;
}

function getScienceSkillForResource(baseItemKey: string): ScienceSkillKey | null {
  if (baseItemKey === "rock_sample") return "geology";
  if (baseItemKey === "plant_sample") return "botany";
  if (baseItemKey === "herbivore_specimen") return "zoology";
  if (baseItemKey === "water_sample") return "chemistry";
  return null;
}

function getScienceSkillLevelFromXp(xp: number) {
  let level = 1;
  let remaining = Math.max(0, Math.floor(xp));
  let nextLevelCost = 20;
  while (remaining >= nextLevelCost && level < 20) {
    remaining -= nextLevelCost;
    level += 1;
    nextLevelCost *= 2;
  }
  return {
    level,
    pointsIntoLevel: remaining,
    pointsForNextLevel: level >= 20 ? 0 : nextLevelCost
  };
}

function getProfileRankLabel(level: number) {
  if (level >= 20) return "Expedition Commander";
  if (level >= 17) return "Mission Commander";
  if (level >= 13) return "Principal Scientist";
  if (level >= 9) return "Expedition Scientist";
  if (level >= 6) return "Senior Specialist";
  if (level >= 4) return "Research Specialist";
  if (level >= 2) return "Field Technician";
  return "Recruit";
}

const FOOD_WEB_TARGETS: Record<string, string[]> = {
  herbivore_a: ["plant_a", "plant_b", "plant_c"],
  herbivore_b: ["plant_a", "plant_b", "plant_c"],
  herbivore_c: ["plant_d", "plant_e"],
  herbivore_d: ["plant_d", "plant_e"],

  carnivore_a: ["herbivore_a"],
  carnivore_b: ["herbivore_c", "herbivore_d"],
  carnivore_c: ["herbivore_c", "herbivore_d"],

  apex_predator_a: ["carnivore_a", "carnivore_b"],
  apex_predator_b: ["carnivore_c"]
};

function getItemQualityChancesForTier(tier: number, masterySteps = 0) {
  const table = ITEM_QUALITY_ROLLS_BY_TIER[tier] || ITEM_QUALITY_ROLLS_BY_TIER[1];
  const chanceByQuality = new Map<ItemQuality, number>();
  let assignedChance = 0;

  table.forEach((entry) => {
    chanceByQuality.set(entry.quality, entry.chance);
    assignedChance += entry.chance;
  });

  const fallbackQuality = ITEM_QUALITY_FALLBACK_BY_TIER[tier] || "common";
  chanceByQuality.set(
    fallbackQuality,
    (chanceByQuality.get(fallbackQuality) || 0) + Math.max(0, 1 - assignedChance)
  );

  // Each earned science level moves 0.1 percentage points out of the tier's
  // fallback rarity. Tier 1 uses the user's exact split: +0.059% uncommon,
  // +0.03% rare, +0.01% epic, +0.001% legendary. Higher tiers preserve their
  // rarity floor and normalize that same weighting across only higher results.
  const requestedWeights: Partial<Record<ItemQuality, number>> = {
    uncommon: 0.00059,
    rare: 0.00030,
    epic: 0.00010,
    legendary: 0.00001
  };
  const fallbackRank = ITEM_QUALITY_RANK[fallbackQuality];
  const eligibleWeights = (Object.entries(requestedWeights) as Array<[ItemQuality, number]>)
    .filter(([quality]) => ITEM_QUALITY_RANK[quality] > fallbackRank);
  const weightTotal = eligibleWeights.reduce((total, [, weight]) => total + weight, 0);
  const requestedShift = Math.max(0, Math.floor(masterySteps)) * 0.001;
  const availableFallback = Math.max(0, chanceByQuality.get(fallbackQuality) || 0);
  const appliedShift = Math.min(requestedShift, availableFallback, 0.35);
  if (appliedShift > 0 && weightTotal > 0) {
    chanceByQuality.set(fallbackQuality, availableFallback - appliedShift);
    eligibleWeights.forEach(([quality, weight]) => {
      chanceByQuality.set(
        quality,
        (chanceByQuality.get(quality) || 0) + appliedShift * (weight / weightTotal)
      );
    });
  }

  return (["common", "uncommon", "rare", "epic", "legendary"] as ItemQuality[])
    .map((quality) => ({
      quality,
      chance: chanceByQuality.get(quality) || 0
    }));
}

function rollItemQualityForTier(tier: number, masterySteps = 0): ItemQuality {
  const roll = Math.random();
  let cursor = 0;
  const chances = getItemQualityChancesForTier(tier, masterySteps)
    .slice()
    .sort((a, b) => ITEM_QUALITY_RANK[b.quality] - ITEM_QUALITY_RANK[a.quality]);
  for (const entry of chances) {
    cursor += entry.chance;
    if (roll < cursor) return entry.quality;
  }
  return ITEM_QUALITY_FALLBACK_BY_TIER[tier] || "common";
}

function buildInventoryItemId(baseItemKey: string, quality: ItemQuality) {
  return `${baseItemKey}:${quality}`;
}

function getInventoryItemLabel(baseItemKey: string, quality: ItemQuality) {
  const qualityLabel =
    quality.charAt(0).toUpperCase() + quality.slice(1);

  const baseLabelMap: Record<string, string> = {
    rock_sample: "Rock Sample",
    water_sample: "Water Sample",
    plant_sample: "Plant Sample",
    mission_badge: "Mission Badge",
    comm_quest_token: "Comm Quest Token",
    herbivore_specimen: "Animal Specimen"
  };

  return `${qualityLabel} ${baseLabelMap[baseItemKey] || baseItemKey}`;
}

/*
OBJECT SHEET ROW + TYPE HELPERS
-------------------------------
Purpose:
Classify portal/mob sheet frames on the server so portals, collectables,
and mob anchors all use the same object-layer rules.

Includes:
- sheet row/column helpers
- portal/spawn checks
- resource anchor checks
- mob anchor checks
- simple runtime anchor summaries
*/

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
const COMMUNICATION_NODE_ANCHOR_FRAME = OBJECT_ROW_PORTALS * OBJECT_SHEET_COLUMNS + 1;

const RESOURCE_OBJECT_ROWS = new Set<number>([
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

const RESOURCE_SLOT_KIND_BY_FRAME = new Map<number, ResourceKind>([
  [-101, "plant"],
  [-102, "rock"],
  [-103, "pond"],
  [-104, "communication"]
]);

type ResourcePopulationProfile = {
  kind: ResourceKind;
  tier: 1 | 2 | 3;
  count: number;
  anchorFrame: number;
  variant: string;
};

const RESOURCE_POPULATION_PROFILES: ResourcePopulationProfile[] = [
  // Four plant populations: the first two are both common, followed by one
  // uncommon and one rare population.
  { kind: "plant", tier: 1, count: 5, anchorFrame: OBJECT_ROW_LEVEL1_PLANT_A * OBJECT_SHEET_COLUMNS + 1, variant: "plant_a" },
  { kind: "plant", tier: 1, count: 5, anchorFrame: OBJECT_ROW_LEVEL1_PLANT_B * OBJECT_SHEET_COLUMNS + 1, variant: "plant_b" },
  { kind: "plant", tier: 2, count: 3, anchorFrame: OBJECT_ROW_LEVEL2_PLANT_A * OBJECT_SHEET_COLUMNS + 1, variant: "plant_uncommon" },
  { kind: "plant", tier: 3, count: 1, anchorFrame: OBJECT_ROW_LEVEL3_PLANT * OBJECT_SHEET_COLUMNS + 1, variant: "plant_rare" },
  { kind: "rock", tier: 1, count: 5, anchorFrame: OBJECT_ROW_LEVEL1_ROCK * OBJECT_SHEET_COLUMNS + 1, variant: "rock_common" },
  { kind: "rock", tier: 2, count: 3, anchorFrame: OBJECT_ROW_LEVEL2_ROCK * OBJECT_SHEET_COLUMNS + 1, variant: "rock_uncommon" },
  { kind: "rock", tier: 3, count: 1, anchorFrame: OBJECT_ROW_LEVEL3_ROCK * OBJECT_SHEET_COLUMNS + 1, variant: "rock_rare" },
  { kind: "pond", tier: 1, count: 5, anchorFrame: OBJECT_ROW_LEVEL1_POND * OBJECT_SHEET_COLUMNS + 1, variant: "pond_common" },
  { kind: "pond", tier: 2, count: 3, anchorFrame: OBJECT_ROW_LEVEL2_POND * OBJECT_SHEET_COLUMNS + 1, variant: "pond_uncommon" },
  { kind: "pond", tier: 3, count: 1, anchorFrame: OBJECT_ROW_LEVEL3_POND * OBJECT_SHEET_COLUMNS + 1, variant: "pond_rare" }
];

const MOB_OBJECT_ROWS = new Set<number>([
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

type ResourceKind = "rock" | "pond" | "plant" | "specimen" | "communication";
type MobKind = "herbivore" | "carnivore" | "apex_predator";

type RuntimeCollectionQuest = {
  id: string;
  resourceKey: "rock_sample" | "water_sample" | "plant_sample" | "herbivore_specimen";
  resourceLabel: string;
  minimumQuality: ItemQuality;
  requiredCount: number;
  progress: number;
  rewardQuality: ItemQuality;
  status: "active" | "submitting";
  createdAtEpochMs: number;
};

const PLAYER_COLLECTION_QUESTS = new Map<string, RuntimeCollectionQuest[]>();

type EcosystemMobState =
  | "idle"
  | "wander"
  | "hunt"
  | "eat"
  | "reproduce"
  | "walk"
  | "move";

type RuntimeCollectableNode = {
  id: string;
  mapKey: string;
  anchorTileX: number;
  anchorTileY: number;
  anchorFrame: number;
  kind: ResourceKind;
  tier: number;
  state: "idle" | "growing" | "ready" | "hidden" | "being_collected" | "being_eaten";
  growthStage: number;
  worldX?: number;
  worldY?: number;
  growthStartedAtEpochMs?: number;
  growthEndsAtEpochMs?: number;
  requiresAnimalDeathToRespawn?: boolean;
  pendingRespawnFromAnimalDeath?: boolean;
  spawnSlotId?: string;
  guaranteedQuality?: ItemQuality;
  oneShot?: boolean;
};

type RuntimeResourceSpawnSlot = {
  id: string;
  mapKey: string;
  kind: ResourceKind;
  tileX: number;
  tileY: number;
};

type RuntimeMobSpawnAnchor = {
  id: string;
  mapKey: string;
  anchorTileX: number;
  anchorTileY: number;
  anchorFrame: number;
  kind: MobKind;
  tier: number;
  spawnRadiusTiles: number;
  maxAlive: number;
};

type RuntimeMobEntity = {
  id: string;
  mapKey: string;
  anchorId: string;
  anchorFrame: number;
  kind: MobKind;
  tier: number;
  speciesKey: string;

  x: number;
  y: number;
  homeX: number;
  homeY: number;

  facing: "left" | "right";
  state: EcosystemMobState;
  speed: number;

  vx: number;
  vy: number;

  thinkAtEpochMs: number;

  cycleDirection: "left" | "right";
  travelMode: "straight" | "diag_up" | "diag_down" | "idle";
  travelDistancePx: number;
  travelTargetDistancePx: number;
  ignorePlantsUntilTravelPx: number;
  idleUntilEpochMs: number;

  plantCounter: number;

  bornAtEpochMs: number;
  diesAtEpochMs: number;
  nextDeathRollAtEpochMs: number;

  eatingNodeId?: string;
  eatingUntilEpochMs?: number;

  /*
  COMBAT FIELDS
  -------------
  Purpose:
  Support taser combat, stamina damage, and incapacitation state
  */

  stamina: number;
  maxStamina: number;
  incapacitated: boolean;
  incapacitatedAtEpochMs?: number;
  lastHitAtEpochMs: number;

  attackTargetId: string;
  attackTargetType: "" | "mob" | "player";
  attackWindupUntilEpochMs: number;
  attackCooldownUntilEpochMs: number;

  aggroPlayerId: string;
  aggroUntilEpochMs: number;

  hasRetaliatedThisAggro: boolean;

  speedBoostUntilEpochMs: number;
  speedBoostMultiplier: number;

  foodVicinityTargetId: string;
  foodVicinityStartedAtEpochMs: number;
  avoidFoodTargetId: string;
  avoidFoodTargetUntilEpochMs: number;

  aggroMobId: string;
  aggroMobUntilEpochMs: number;
  hasRetaliatedThisMobAggro: boolean;

  lastProgressCheckAtEpochMs: number;
  lastProgressX: number;
  lastProgressY: number;
  stuckUntilEpochMs: number;
  stuckTargetX: number;
  stuckTargetY: number;

  esm: number;
  maxEsm: number;
  eatThreshold: number;

  decisionIntervalMs: number;
  nextDecisionAt: number;

  targetId: string;

  birthEsm: number;
  reproductionRatio: number;

};

type CollectableActionName = "mine" | "fish" | "dig" | "comm";

type RuntimeCollectableSnapshot = {
  id: string;
  anchorFrame: number;
  kind: ResourceKind;
  tier: number;
  x: number;
  y: number;
  state: "idle" | "growing" | "ready" | "hidden" | "being_collected" | "being_eaten";
  growthStage: number;
};

type RuntimeAlienArtifactEvent = {
  id: string;
  mapKey: string;
  x: number;
  y: number;
  durability: number;
  maxDurability: number;
  summonerUserId: string;
  summonerName: string;
  summonedAtEpochMs: number;
  lastHealAtEpochMs: number;
};

type RuntimeTradeRequest = {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  createdAtEpochMs: number;
};

type RuntimeTradeSession = {
  id: string;
  playerIds: [string, string];
  offers: Map<string, Map<string, number>>;
  acceptedPlayerIds: Set<string>;
  confirmedPlayerIds: Set<string>;
  phase: "offering" | "confirming" | "completing";
};

function getObjectSheetRow(frameIndex: number) {
  if (!Number.isInteger(frameIndex) || frameIndex < 0) return -1;
  return Math.floor(frameIndex / OBJECT_SHEET_COLUMNS);
}

function getObjectSheetColumn(frameIndex: number) {
  if (!Number.isInteger(frameIndex) || frameIndex < 0) return -1;
  return frameIndex % OBJECT_SHEET_COLUMNS;
}

function isSpawnMarkerFrame(frameIndex: number) {
  return frameIndex === PORTAL_SPAWN_FRAME;
}

function isPortalFrame(frameIndex: number) {
  return !!PORTAL_FRAME_KEYS[frameIndex];
}

function isResourceObjectFrame(frameIndex: number) {
  return RESOURCE_OBJECT_ROWS.has(getObjectSheetRow(frameIndex));
}

function isMobObjectFrame(frameIndex: number) {
  return MOB_OBJECT_ROWS.has(getObjectSheetRow(frameIndex));
}

function getResourceKindForFrame(frameIndex: number): ResourceKind | null {
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

function getSpawnKindForActionCenter(
  action: TilesetFrameMetadataRow["action_center"]
): ResourceKind | null {
  if (action === "mine") return "rock";
  if (action === "fish") return "pond";
  if (action === "dig") return "plant";
  if (action === "comm") return "communication";
  return null;
}

function getMobKindForFrame(frameIndex: number): MobKind | null {
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

function getMobSpeciesKeyForFrame(frameIndex: number) {
  const row = getObjectSheetRow(frameIndex);

  if (row === OBJECT_ROW_LEVEL1_HERBIVORE_A) return "herbivore_a";
  if (row === OBJECT_ROW_LEVEL1_HERBIVORE_B) return "herbivore_b";
  if (row === OBJECT_ROW_LEVEL2_HERBIVORE_A) return "herbivore_c";
  if (row === OBJECT_ROW_LEVEL2_HERBIVORE_B) return "herbivore_d";

  if (row === OBJECT_ROW_LEVEL1_CARNIVORE) return "carnivore_a";
  if (row === OBJECT_ROW_LEVEL2_CARNIVORE_A) return "carnivore_b";
  if (row === OBJECT_ROW_LEVEL2_CARNIVORE_B) return "carnivore_c";

  if (row === OBJECT_ROW_LEVEL2_APEX_PREDATOR) return "apex_predator_a";
  if (row === OBJECT_ROW_LEVEL3_APEX_PREDATOR) return "apex_predator_b";

  return "unknown";
}

function getObjectTierForFrame(frameIndex: number) {
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

class ClassRoom extends Room {
  maxClients = 32;
  state = new RoomState();

  roomClassId: string | null = null;
  roomClassCode: string | null = null;
  roomClassName: string | null = null;

  currentLayoutKey: string | null = null;
  currentMapKey: string = DEFAULT_MAP_KEY;
  currentRoomLayout: LayeredRoomLayout | null = null;
  currentTilesetMetadata: TilesetFrameMetadataRow[] = [];
  playerInputSpeedScales = new Map<string, number>();
  playerInputEditorModes = new Map<string, boolean>();

  runtimeCollectableNodes: RuntimeCollectableNode[] = [];
  runtimeResourceSpawnSlots: RuntimeResourceSpawnSlot[] = [];
  runtimeMobSpawnAnchors: RuntimeMobSpawnAnchor[] = [];
  runtimeMobEntities: RuntimeMobEntity[] = [];
  activeAlienArtifact: RuntimeAlienArtifactEvent | null = null;
  alienArtifactDamageContributors = new Map<string, string>();
  alienArtifactAftermathNodes: RuntimeCollectableNode[] = [];
  alienArtifactSummonPending = false;
  tradeRequests = new Map<string, RuntimeTradeRequest>();
  tradeSessions = new Map<string, RuntimeTradeSession>();
  playerTradeSessionIds = new Map<string, string>();
  lastMobSnapshotBroadcastAt = 0;
  lastCollectableSnapshotBroadcastAt = 0;
    ecosystemTimeScale = 1;
      showEsmLabels = false;

  /*
  DYNAMIC ROOM SIZE HELPERS
  -------------------------
  Purpose:
  Resolve the active room dimensions from the currently loaded layout so the
  server can support larger maps.

  Includes:
  - room width lookup
  - room height lookup
  - world bounds lookup
  */

  getRoomTileWidth() {
    return this.currentRoomLayout?.base?.[0]?.length || DEFAULT_ROOM_TILE_WIDTH;
  }

  getRoomTileHeight() {
    return this.currentRoomLayout?.base?.length || DEFAULT_ROOM_TILE_HEIGHT;
  }

  getRoomWorldBounds() {
    const minX = ROOM_OFFSET_X;
    const minY = ROOM_OFFSET_Y;
    const maxX = ROOM_OFFSET_X + this.getRoomTileWidth() * TILE_SIZE;
    const maxY = ROOM_OFFSET_Y + this.getRoomTileHeight() * TILE_SIZE;

    return { minX, minY, maxX, maxY };
  }

  getAlienArtifactSnapshot() {
    if (!this.activeAlienArtifact) return null;
    return { ...this.activeAlienArtifact };
  }

  broadcastAlienArtifactSnapshot() {
    this.broadcast("alien_artifact_snapshot", {
      mapKey: this.currentMapKey,
      artifact: this.getAlienArtifactSnapshot()
    });
  }

  updateAlienArtifactRegeneration() {
    const artifact = this.activeAlienArtifact;
    if (!artifact) return;

    const now = Date.now();
    if (artifact.durability >= artifact.maxDurability) {
      artifact.lastHealAtEpochMs = now;
      return;
    }

    const elapsed = now - artifact.lastHealAtEpochMs;
    const recovered = Math.floor(elapsed / ALIEN_ARTIFACT_REGEN_INTERVAL_MS);
    if (recovered <= 0) return;

    const previousDurability = artifact.durability;
    artifact.durability = Math.min(artifact.maxDurability, artifact.durability + recovered);
    artifact.lastHealAtEpochMs += recovered * ALIEN_ARTIFACT_REGEN_INTERVAL_MS;

    if (previousDurability < artifact.maxDurability && artifact.durability >= artifact.maxDurability) {
      this.alienArtifactDamageContributors.clear();
      this.broadcast("alien_artifact_announcement", {
        active: true,
        message: "The alien artifact fully regenerated. Previous destruction credit was lost."
      });
    }
    this.broadcastAlienArtifactSnapshot();
  }

  findAlienArtifactSpawnPosition() {
    const origin = this.getResourceSpawnOriginTile();
    const width = this.getRoomTileWidth();
    const height = this.getRoomTileHeight();
    const minimumDistance = Math.max(12, Math.min(width, height) * 0.38);

    for (let attempt = 0; attempt < 240; attempt += 1) {
      const tileX = 3 + Math.floor(Math.random() * Math.max(1, width - 6));
      const tileY = 3 + Math.floor(Math.random() * Math.max(1, height - 6));
      if (Math.hypot(tileX - origin.tileX, tileY - origin.tileY) < minimumDistance) continue;
      const world = this.tileToWorldPosition(tileX, tileY);
      if (this.isCollisionTileAtWorldPosition(world.x, world.y)) continue;
      if (isPortalFrame(this.getObjectFrameAtTile(tileX, tileY))) continue;
      return { tileX, tileY, ...world };
    }

    const fallbackTileX = Math.max(2, width - 5);
    const fallbackTileY = Math.max(2, height - 5);
    return {
      tileX: fallbackTileX,
      tileY: fallbackTileY,
      ...this.tileToWorldPosition(fallbackTileX, fallbackTileY)
    };
  }

/*
ROOM AUTH HANDLER
-----------------
Purpose:
Verifies the Supabase token and determines which class the player is allowed
to join.

Flow:
1. Validate the Supabase token.
2. Check whether the user is the admin account.
3. If admin, allow classCode from the client and resolve it from classes.
4. If not admin, ignore client classCode and load the user's assigned class
   from class_memberships.
5. Return trusted auth data for onJoin().
*/
static async onAuth(
  token: string,
  options: { name?: string; classCode?: string; mapKey?: string }
) {
  if (!token) {
    throw new ServerError(401, "Missing auth token");
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    throw new ServerError(401, "Invalid auth token");
  }

  const user = data.user;
  const email = user.email ?? "";
  const requestedName = options?.name || "Player";

  const ADMIN_EMAIL = "mnelsen@susd.net";
  const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  /* ADMIN BRANCH */
  if (isAdmin) {
    const classCode = options?.classCode?.trim().toUpperCase();

    if (!classCode) {
      throw new ServerError(400, "Admin must enter a class code");
    }

    const { data: classRow, error: classError } = await supabaseAdmin
      .from("classes")
      .select("class_id, class_name, class_code")
      .eq("class_code", classCode)
      .single();

    if (classError || !classRow) {
      throw new ServerError(404, "Invalid class code");
    }

    console.log("ADMIN AUTH:", {
      email,
      requestedClassCode: classCode,
      resolvedClassId: classRow.class_id,
      resolvedClassCode: classRow.class_code,
      resolvedClassName: classRow.class_name
    });

    return {
      userId: user.id,
      email,
      requestedName,
      classId: classRow.class_id,
      classCode: classRow.class_code,
      className: classRow.class_name,
      missionPosition: await loadClassMissionPosition(classRow.class_id),
      isAdmin: true,
      mapKey: options?.mapKey?.trim() || DEFAULT_MAP_KEY
    };
  }

  /* STUDENT BRANCH */

  const { data: membershipRow, error: membershipError } = await supabaseAdmin
    .from("class_memberships")
    .select(`
      role,
      class_id,
      classes (
        class_id,
        class_name,
        class_code
      )
    `)
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membershipRow) {
    throw new ServerError(403, "No class membership found for this account");
  }

  const classRow = Array.isArray(membershipRow.classes)
    ? membershipRow.classes[0]
    : membershipRow.classes;

  if (!classRow) {
    throw new ServerError(403, "Assigned class could not be loaded");
  }

  console.log("STUDENT AUTH:", {
    email,
    resolvedClassId: classRow.class_id,
    resolvedClassCode: classRow.class_code,
    resolvedClassName: classRow.class_name
  });

  return {
    userId: user.id,
    email,
    requestedName,
    classId: classRow.class_id,
    classCode: classRow.class_code,
    className: classRow.class_name,
    missionPosition: await loadClassMissionPosition(classRow.class_id),
    isAdmin: false,
    mapKey: options?.mapKey?.trim() || DEFAULT_MAP_KEY
  };
}

  /*
  MOVEMENT INPUT HANDLER
  ----------------------
  Purpose:
  Applies the latest movement input flags sent from a client to that
  player's server-side state.

  Flow:
  1. Finds the player for the sending client.
  2. Updates left/right/up/down movement flags.
  */
  handleMovementInput(
    client: Client,
    message: {
      left: boolean;
      right: boolean;
      up: boolean;
      down: boolean;
      speedScale?: number;
      editorMode?: boolean;
    }
  ) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    player.left = !!message.left;
    player.right = !!message.right;
    player.up = !!message.up;
    player.down = !!message.down;
    this.playerInputSpeedScales.set(
      client.sessionId,
      Math.max(0.5, Math.min(1, Number(message.speedScale) || 1))
    );
    this.playerInputEditorModes.set(
      client.sessionId,
      !!player.isAdmin && !!message.editorMode
    );
  }

    /*
  ROOM TILE AND METADATA HELPERS
  ------------------------------
  Purpose:
  Resolve the top visible frame at a tile and look up metadata for collision
  and action-center gameplay.
  */

  worldToTilePosition(worldX: number, worldY: number) {
    const tileX = Math.floor((worldX - ROOM_OFFSET_X) / TILE_SIZE);
    const tileY = Math.floor((worldY - ROOM_OFFSET_Y) / TILE_SIZE);

    const roomWidth = this.getRoomTileWidth();
    const roomHeight = this.getRoomTileHeight();

    const inBounds =
      tileX >= 0 &&
      tileY >= 0 &&
      tileX < roomWidth &&
      tileY < roomHeight;

    if (!inBounds) return null;

    return { tileX, tileY };
  }

  getFrameMetadata(frameIndex: number) {
    const metadataFrameIndex =
      frameIndex >= ISO_STORED_FRAME_OFFSET
        ? frameIndex - ISO_STORED_FRAME_OFFSET
        : frameIndex >= ISO_PREVIOUS_STORED_FRAME_OFFSET &&
            frameIndex < ISO_PREVIOUS_STORED_FRAME_OFFSET + ISO_PREVIOUS_FRAME_COUNT
          ? frameIndex - ISO_PREVIOUS_STORED_FRAME_OFFSET
          : frameIndex;
    return (
      this.currentTilesetMetadata.find(
        (row) => row.frame_index === metadataFrameIndex
      ) || null
    );
  }

    getObjectFrameAtTile(tileX: number, tileY: number) {
    if (!this.currentRoomLayout) return OBJECT_EMPTY;

    const objectFrame = this.currentRoomLayout.objects?.[tileY]?.[tileX];
    if (Number.isInteger(objectFrame) && objectFrame >= 0) {
      return objectFrame;
    }

    return OBJECT_EMPTY;
  }

  getTopFrameAtTile(tileX: number, tileY: number) {
    if (!this.currentRoomLayout) return -1;

    // Detail is the top collision/gameplay surface. The overhead layer is
    // visual occlusion only and must not cancel a solid detail tile.
    const detailFrame = this.currentRoomLayout.detail?.[tileY]?.[tileX];
    if (Number.isInteger(detailFrame) && detailFrame >= 0) {
      return detailFrame;
    }

    const baseFrame = this.currentRoomLayout.base?.[tileY]?.[tileX];
    if (Number.isInteger(baseFrame) && baseFrame >= 0) {
      return baseFrame;
    }

    return -1;
  }

  isCollisionTileAtWorldPosition(worldX: number, worldY: number) {
    const tilePos = this.worldToTilePosition(worldX, worldY);
    if (!tilePos) return false;

    const frameIndex = this.getTopFrameAtTile(tilePos.tileX, tilePos.tileY);
    if (frameIndex < 0) return false;

    const metadata = this.getFrameMetadata(frameIndex);
    return !!metadata?.collision;
  }

  getNearestActionCenterForPlayer(player: Player) {
    const playerTile = this.worldToTilePosition(player.x, player.y);
    if (!playerTile) return null;

    let best: {
      action: "craft" | "dig" | "mine" | "fish" | "comm";
      tileX: number;
      tileY: number;
      tileDistance: number;
    } | null = null;

    const roomHeight = this.getRoomTileHeight();
    const roomWidth = this.getRoomTileWidth();

    for (let row = 0; row < roomHeight; row++) {
      for (let col = 0; col < roomWidth; col++) {
        const detailFrame = this.currentRoomLayout?.detail?.[row]?.[col];
        const baseFrame = this.currentRoomLayout?.base?.[row]?.[col];
        const metadata = [detailFrame, baseFrame]
          .filter((frameIndex) => Number.isInteger(frameIndex) && Number(frameIndex) >= 0)
          .map((frameIndex) => this.getFrameMetadata(Number(frameIndex)))
          .find((entry) => !!entry?.action_center);
        if (!metadata?.action_center) continue;
        if (getSpawnKindForActionCenter(metadata.action_center)) continue;

        const dx = col - playerTile.tileX;
        const dy = row - playerTile.tileY;
        const tileDistance = Math.sqrt(dx * dx + dy * dy);

        if (tileDistance > ACTION_CENTER_RADIUS_TILES) continue;

        if (!best || tileDistance < best.tileDistance) {
          best = {
            action: metadata.action_center,
            tileX: col,
            tileY: row,
            tileDistance
          };
        }
      }
    }

    return best;
  }

    /*
  SYNCED ACTION ANIMATION HELPERS
  -------------------------------
  Purpose:
  Compute facing direction for action centers and keep synced action
  animation state on each player.
  */

  /*
  ACTION DIRECTION NORMALIZER
  ---------------------------
  Purpose:
  Prevent server-driven action animations from using the up row.

  Rules:
  - up gets remapped to left or right
  - down/left/right remain unchanged
  */

  normalizeActionDirection(direction: string, fallbackDirection = "right") {
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

  getActionFacingDirectionTowardTile(player: Player, tileX: number, tileY: number) {
    const targetX = ROOM_OFFSET_X + tileX * TILE_SIZE + TILE_SIZE / 2;
    const targetY = ROOM_OFFSET_Y + tileY * TILE_SIZE + TILE_SIZE / 2;

    const dx = targetX - player.x;
    const dy = targetY - player.y;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX > absY) {
      return dx < 0 ? "left" : "right";
    }

    if (dy < 0) {
      return dx <= 0 ? "left" : "right";
    }

    return "down";
  }

    /*
  MAP TRANSITION HELPERS
  ----------------------
  Purpose:
  Finds whether a player is standing inside a map transition trigger and
  resolves the target map and spawn position.

  Includes:
  - trigger lookup by current map
  - tile-area containment check
  - spawn world position conversion
  */

  getMapPortalForPlayer(player: Player) {
    const playerTile = this.worldToTilePosition(player.x, player.y);
    if (!playerTile) return null;

    for (let markerY = playerTile.tileY - 2; markerY <= playerTile.tileY + 2; markerY++) {
      for (let markerX = playerTile.tileX - 2; markerX <= playerTile.tileX + 2; markerX++) {
        if (markerX < 0 || markerY < 0) continue;

        const objectFrame = this.getObjectFrameAtTile(markerX, markerY);
        if (objectFrame === OBJECT_EMPTY) continue;

        const portalKey = PORTAL_FRAME_KEYS[objectFrame];
        if (!portalKey) continue;

        const originX = markerX - 1;
        const originY = markerY - 1;

        const insideX =
          playerTile.tileX >= originX &&
          playerTile.tileX < originX + 4;

        const insideY =
          playerTile.tileY >= originY &&
          playerTile.tileY < originY + 4;

        if (!insideX || !insideY) continue;

        const portalLink = MAP_PORTAL_LINKS.find((link) => {
          return link.fromMapKey === this.currentMapKey && link.portalKey === portalKey;
        });

        if (!portalLink) continue;

        return {
          portalKey,
          tileX: markerX,
          tileY: markerY,
          originTileX: originX,
          originTileY: originY,
          width: 4,
          height: 4,
          ...portalLink
        };
      }
    }

    return null;
  }

  findSpawnMarkerTile() {
    if (!this.currentRoomLayout?.objects) return null;

    for (let row = 0; row < this.currentRoomLayout.objects.length; row++) {
      for (let col = 0; col < this.currentRoomLayout.objects[row].length; col++) {
        if (this.currentRoomLayout.objects[row][col] === PORTAL_SPAWN_FRAME) {
          return { tileX: col, tileY: row };
        }
      }
    }

    return null;
  }

  tileToWorldPosition(tileX: number, tileY: number) {
    return {
      x: ROOM_OFFSET_X + tileX * TILE_SIZE + TILE_SIZE / 2,
      y: ROOM_OFFSET_Y + tileY * TILE_SIZE + TILE_SIZE / 2
    };
  }

    /*
  RUNTIME MOB HELPERS
  -------------------
  Purpose:
  Create, simulate, and broadcast live mob clones that spawn from mob anchors.

  Includes:
  - random spawn positions around anchor markers
  - one or more live mob clones per anchor
  - idle/walk behavior
  - anchor-radius movement limits
  - room-wide snapshot broadcasts for the client renderer
  */

    getEcosystemScaledDelay(ms: number) {
    return Math.max(16, ms / Math.max(1, this.ecosystemTimeScale));
  }

  getRandomRange(min: number, max: number) {
    return min + Math.random() * (max - min);
  }

    getSafeOffsetSpawnPosition(
    originX: number,
    originY: number,
    minTiles = OFFSPRING_SPAWN_MIN_TILES,
    maxTiles = OFFSPRING_SPAWN_MAX_TILES
  ) {
    const bounds = this.getRoomWorldBounds();

    for (let attempt = 0; attempt < 24; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distancePx =
        this.getRandomRange(minTiles * TILE_SIZE, maxTiles * TILE_SIZE);

      const x = Math.max(
        bounds.minX + TILE_SIZE,
        Math.min(bounds.maxX - TILE_SIZE, originX + Math.cos(angle) * distancePx)
      );

      const y = Math.max(
        bounds.minY + TILE_SIZE,
        Math.min(bounds.maxY - TILE_SIZE, originY + Math.sin(angle) * distancePx)
      );

      if (!this.isCollisionTileAtWorldPosition(x, y)) {
        return { x, y };
      }
    }

    return this.tileToWorldPosition(
      Math.max(0, Math.floor((originX - ROOM_OFFSET_X) / TILE_SIZE)),
      Math.max(0, Math.floor((originY - ROOM_OFFSET_Y) / TILE_SIZE))
    );
  }

  setMobSpeedBoost(mob: RuntimeMobEntity, multiplier: number, durationMs: number) {
    mob.speedBoostMultiplier = multiplier;
    mob.speedBoostUntilEpochMs = Date.now() + durationMs;
  }

  getMobEffectiveSpeed(mob: RuntimeMobEntity, now: number) {
    if (now < (mob.speedBoostUntilEpochMs || 0)) {
      return mob.speed * (mob.speedBoostMultiplier || 1);
    }

    return mob.speed;
  }

  shouldAvoidFoodTarget(mob: RuntimeMobEntity, targetId: string, now: number) {
    return (
      !!targetId &&
      mob.avoidFoodTargetId === targetId &&
      now < (mob.avoidFoodTargetUntilEpochMs || 0)
    );
  }

  trackFoodTargetVicinity(
    mob: RuntimeMobEntity,
    targetId: string,
    distance: number,
    now: number,
    applies = true
  ) {
    if (!applies || !targetId || distance > FOOD_SOURCE_VICINITY_PX) {
      mob.foodVicinityTargetId = "";
      mob.foodVicinityStartedAtEpochMs = 0;
      return false;
    }

    if (mob.foodVicinityTargetId !== targetId) {
      mob.foodVicinityTargetId = targetId;
      mob.foodVicinityStartedAtEpochMs = now;
      return false;
    }

    if (now - (mob.foodVicinityStartedAtEpochMs || now) >= FOOD_SOURCE_ABANDON_MS) {
      mob.avoidFoodTargetId = targetId;
      mob.avoidFoodTargetUntilEpochMs = now + FOOD_SOURCE_AVOID_MS;
      mob.foodVicinityTargetId = "";
      mob.foodVicinityStartedAtEpochMs = 0;
      return true;
    }

    return false;
  }

  clampMobToAnchorRadius(mob: RuntimeMobEntity, radiusPx: number) {
    const dx = mob.x - mob.homeX;
    const dy = mob.y - mob.homeY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= radiusPx || distance <= 0.0001) return;

    const scale = radiusPx / distance;
    mob.x = mob.homeX + dx * scale;
    mob.y = mob.homeY + dy * scale;
  }

createRuntimeMobFromAnchor(anchor: RuntimeMobSpawnAnchor, index: number): RuntimeMobEntity {
  const anchorWorld = this.tileToWorldPosition(anchor.anchorTileX, anchor.anchorTileY);
  const bornAt = Date.now();

  const baseStamina =
    anchor.kind === "herbivore"
      ? anchor.tier === 1
        ? 30
        : anchor.tier === 2
          ? 45
          : 60
      : 50;

  const maxEsm =
    anchor.kind === "herbivore"
      ? 20
      : anchor.kind === "carnivore"
        ? 35
        : 50;

  return {
    id: `${anchor.id}:clone:${index}:${Math.floor(this.getRandomRange(1000, 999999))}`,
    mapKey: this.currentMapKey,
    anchorId: anchor.id,
    anchorFrame: anchor.anchorFrame,
    kind: anchor.kind,
tier: anchor.tier,
speciesKey: getMobSpeciesKeyForFrame(anchor.anchorFrame),

    x: anchorWorld.x,
    y: anchorWorld.y,
    homeX: anchorWorld.x,
    homeY: anchorWorld.y,

    facing: Math.random() < 0.5 ? "left" : "right",
    state: Math.random() < 0.5 ? "idle" : "wander",
    speed: SHARED_ANIMAL_BASE_SPEED,

    vx: 0,
    vy: 0,

    thinkAtEpochMs: bornAt,

    cycleDirection: Math.random() < 0.5 ? "left" : "right",
    travelMode: "straight",
    travelDistancePx: 0,
    travelTargetDistancePx: 20 * TILE_SIZE,
    ignorePlantsUntilTravelPx: 0,
    idleUntilEpochMs: 0,

    plantCounter: 0,

    bornAtEpochMs: bornAt,
    diesAtEpochMs: 0,
    nextDeathRollAtEpochMs: 0,

    eatingNodeId: "",
    eatingUntilEpochMs: 0,

    stamina: baseStamina,
    maxStamina: baseStamina,
    incapacitated: false,
    lastHitAtEpochMs: 0,

    attackTargetId: "",
    attackTargetType: "",
    attackWindupUntilEpochMs: 0,
    attackCooldownUntilEpochMs: 0,

    aggroPlayerId: "",
    aggroUntilEpochMs: 0,
    hasRetaliatedThisAggro: false,

    speedBoostUntilEpochMs: 0,
    speedBoostMultiplier: 1,

    foodVicinityTargetId: "",
    foodVicinityStartedAtEpochMs: 0,
    avoidFoodTargetId: "",
    avoidFoodTargetUntilEpochMs: 0,

    aggroMobId: "",
    aggroMobUntilEpochMs: 0,
    hasRetaliatedThisMobAggro: false,

    lastProgressCheckAtEpochMs: 0,
    lastProgressX: 0,
    lastProgressY: 0,
    stuckUntilEpochMs: 0,
    stuckTargetX: 0,
    stuckTargetY: 0,

    maxEsm,
    esm: this.getRandomRange(maxEsm * 0.5, maxEsm),

    eatThreshold:
      anchor.kind === "herbivore"
        ? 8
        : anchor.kind === "carnivore"
          ? 20
          : 28,

    decisionIntervalMs: 800,
    nextDecisionAt: bornAt + this.getRandomRange(0, 800),

    targetId: "",

    birthEsm:
      anchor.kind === "herbivore"
        ? 10
        : anchor.kind === "carnivore"
          ? 18
          : 25,

    reproductionRatio:
      anchor.kind === "herbivore"
        ? 1.2
        : anchor.kind === "carnivore"
          ? 5
          : 4
  };
}
  rebuildRuntimeMobEntitiesFromAnchors() {
    this.runtimeMobEntities = [];

    this.runtimeMobSpawnAnchors.forEach((anchor) => {
      const spawnCount = 1;

      for (let i = 0; i < spawnCount; i++) {
        this.runtimeMobEntities.push(this.createRuntimeMobFromAnchor(anchor, i));
      }
    });

    console.log("RUNTIME MOB REBUILD:", {
      mapKey: this.currentMapKey,
      anchors: this.runtimeMobSpawnAnchors.length,
      mobs: this.runtimeMobEntities.length
    });
  }

    /*
  HERBIVORE BEHAVIOR HELPERS
  --------------------------
  Purpose:
  Drive herbivore roaming, threat avoidance, plant eating, reproduction,
  aging, and plant-counter release on death.
  */

    /*
  STUCK ESCAPE HELPERS
  --------------------
  Purpose:
  Detect when a mob has stayed too close to the same spot too long and force
  a short escape move so it does not keep vibrating around prey, fear targets,
  or food targets.

  Rules:
  - applies to chase, flee, and food interactions
  - does not apply to player pursuit timeout logic
  */

  beginMobStuckWatch(mob: RuntimeMobEntity, now: number) {
    if (typeof mob.lastProgressCheckAtEpochMs !== "number") {
      mob.lastProgressCheckAtEpochMs = now;
      mob.lastProgressX = mob.x;
      mob.lastProgressY = mob.y;
      return;
    }

    if (now - mob.lastProgressCheckAtEpochMs < 4000) {
      return;
    }

    const moved = this.getDistanceBetweenPoints(
      mob.lastProgressX ?? mob.x,
      mob.lastProgressY ?? mob.y,
      mob.x,
      mob.y
    );

    if (moved <= TILE_SIZE * 1.5) {
      mob.stuckUntilEpochMs = now + 1400;
      mob.stuckTargetX = 0;
      mob.stuckTargetY = 0;

      const escape = this.getSafeOffsetSpawnPosition(mob.x, mob.y, 3, 6);
      mob.stuckTargetX = escape.x;
      mob.stuckTargetY = escape.y;
    }

    mob.lastProgressCheckAtEpochMs = now;
    mob.lastProgressX = mob.x;
    mob.lastProgressY = mob.y;
  }

  clearMobStuckWatch(mob: RuntimeMobEntity, now: number) {
    mob.lastProgressCheckAtEpochMs = now;
    mob.lastProgressX = mob.x;
    mob.lastProgressY = mob.y;
  }

  isMobInForcedEscape(mob: RuntimeMobEntity, now: number) {
    return now < (mob.stuckUntilEpochMs || 0);
  }

  updateMobForcedEscape(mob: RuntimeMobEntity, now: number, speedMultiplier = 1.15) {
    if (!this.isMobInForcedEscape(mob, now)) {
      return false;
    }

    this.setMobVelocityTowardPoint(
      mob,
      mob.stuckTargetX || mob.x,
      mob.stuckTargetY || mob.y,
      speedMultiplier
    );

    const distance = this.getDistanceBetweenPoints(
      mob.x,
      mob.y,
      mob.stuckTargetX || mob.x,
      mob.stuckTargetY || mob.y
    );

    if (distance <= TILE_SIZE || now >= (mob.stuckUntilEpochMs || 0)) {
      mob.stuckUntilEpochMs = 0;
      mob.stuckTargetX = 0;
      mob.stuckTargetY = 0;
      this.clearMobStuckWatch(mob, now);
    }

    return true;
  }

  getDistanceBetweenPoints(ax: number, ay: number, bx: number, by: number) {
    const dx = bx - ax;
    const dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }

  setMobVelocityTowardPoint(mob: RuntimeMobEntity, targetX: number, targetY: number, speedMultiplier = 1) {
    if (mob.incapacitated) {
      mob.vx = 0;
      mob.vy = 0;
      mob.state = "idle";
      return;
    }

    const dx = targetX - mob.x;
    const dy = targetY - mob.y;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
    const now = Date.now();
    const baseSpeed = this.getMobEffectiveSpeed(mob, now);

    mob.vx = (dx / distance) * baseSpeed * speedMultiplier;
    mob.vy = (dy / distance) * baseSpeed * speedMultiplier;
    mob.state = "move";
    mob.facing = mob.vx < 0 ? "left" : "right";
  }

  setMobVelocityAwayFromPoint(mob: RuntimeMobEntity, sourceX: number, sourceY: number, speedMultiplier = 1) {
    if (mob.incapacitated) {
      mob.vx = 0;
      mob.vy = 0;
      mob.state = "idle";
      return;
    }

    const dx = mob.x - sourceX;
    const dy = mob.y - sourceY;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
    const now = Date.now();
    const baseSpeed = this.getMobEffectiveSpeed(mob, now);

    mob.vx = (dx / distance) * baseSpeed * speedMultiplier;
    mob.vy = (dy / distance) * baseSpeed * speedMultiplier;
    mob.state = "move";
    mob.facing = mob.vx < 0 ? "left" : "right";
  }

  getNearestPlantForHerbivore(mob: RuntimeMobEntity) {
    let best: (RuntimeCollectableNode & { distance: number; worldX: number; worldY: number }) | null = null;

    this.runtimeCollectableNodes.forEach((node) => {
      if (node.kind !== "plant") return;
      if (node.state !== "idle") return;

      const world = this.getCollectableWorldPosition(node);
      const distance = this.getDistanceBetweenPoints(mob.x, mob.y, world.x, world.y);

      if (distance > HERBIVORE_VISION_RADIUS_PX) return;

      if (!best || distance < best.distance) {
        best = {
          ...node,
          distance,
          worldX: world.x,
          worldY: world.y
        };
      }
    });

    return best;
  }

    /*
  PREDATOR TARGET HELPERS
  -----------------------
  Purpose:
  Find the nearest valid prey or threat target for carnivores and apex predators.

  Rules:
  - carnivores chase herbivores
  - carnivores flee apex predators
  - apex predators chase herbivores and carnivores
  - players are not included yet in this step
  */

  getNearestHerbivoreForMob(mob: RuntimeMobEntity, maxDistancePx: number) {
    let best: (RuntimeMobEntity & { distance: number }) | null = null;

    this.runtimeMobEntities.forEach((other) => {
      if (other.id === mob.id) return;
      if (other.kind !== "herbivore") return;
      if (other.incapacitated) return;

      const distance = this.getDistanceBetweenPoints(mob.x, mob.y, other.x, other.y);
      if (distance > maxDistancePx) return;

      if (!best || distance < best.distance) {
        best = {
          ...other,
          distance
        };
      }
    });

    return best;
  }

  getNearestCarnivoreForMob(mob: RuntimeMobEntity, maxDistancePx: number) {
    let best: (RuntimeMobEntity & { distance: number }) | null = null;

    this.runtimeMobEntities.forEach((other) => {
      if (other.id === mob.id) return;
      if (other.kind !== "carnivore") return;
      if (other.incapacitated) return;

      const distance = this.getDistanceBetweenPoints(mob.x, mob.y, other.x, other.y);
      if (distance > maxDistancePx) return;

      if (!best || distance < best.distance) {
        best = {
          ...other,
          distance
        };
      }
    });

    return best;
  }

  getNearestApexPredatorForMob(mob: RuntimeMobEntity, maxDistancePx: number) {
    
    let best: (RuntimeMobEntity & { distance: number }) | null = null;

    this.runtimeMobEntities.forEach((other) => {
      if (other.id === mob.id) return;
      if (other.kind !== "apex_predator") return;
      if (other.incapacitated) return;

      const distance = this.getDistanceBetweenPoints(mob.x, mob.y, other.x, other.y);
      if (distance > maxDistancePx) return;

      if (!best || distance < best.distance) {
        best = {
          ...other,
          distance
        };
      }
    });

    return best;
  }

    getNearestPlayerForMob(mob: RuntimeMobEntity, maxDistancePx: number) {
    let best: {
      sessionId: string;
      x: number;
      y: number;
      distance: number;
    } | null = null;

    this.state.players.forEach((player, sessionId) => {
      const distance = this.getDistanceBetweenPoints(mob.x, mob.y, player.x, player.y);
      if (distance > maxDistancePx) return;

      if (!best || distance < best.distance) {
        best = {
          sessionId,
          x: player.x,
          y: player.y,
          distance
        };
      }
    });

    return best;
  }

  getNearestThreatForHerbivore(mob: RuntimeMobEntity) {
    let best: { x: number; y: number; distance: number } | null = null;

    this.runtimeMobEntities.forEach((other) => {
      if (other.id === mob.id) return;
      if (other.kind !== "carnivore" && other.kind !== "apex_predator") return;

      const distance = this.getDistanceBetweenPoints(mob.x, mob.y, other.x, other.y);
      if (distance > HERBIVORE_VISION_RADIUS_PX) return;

      if (!best || distance < best.distance) {
        best = {
          x: other.x,
          y: other.y,
          distance
        };
      }
    });

    this.state.players.forEach((player, sessionId) => {
      const distance = this.getDistanceBetweenPoints(mob.x, mob.y, player.x, player.y);
      if (distance > HERBIVORE_VISION_RADIUS_PX) return;

      if (!best || distance < best.distance) {
        best = {
          x: player.x,
          y: player.y,
          distance
        };
      }
    });

    return best;
  }

  getNearestFoodTargetForMob(mob: RuntimeMobEntity) {
  const allowedTargets = FOOD_WEB_TARGETS[mob.speciesKey] || [];
  if (!allowedTargets.length) return null;

  let best: (RuntimeMobEntity & { distance: number }) | null = null;

  this.runtimeMobEntities.forEach((other) => {
    if (other.id === mob.id) return;
    if (!allowedTargets.includes(other.speciesKey)) return;

    const distance = this.getDistanceBetweenPoints(
      mob.x,
      mob.y,
      other.x,
      other.y
    );

    if (!best || distance < best.distance) {
      best = {
        ...other,
        distance
      };
    }
  });

  return best;
}

  /*
  HERBIVORE TRAVEL DIRECTION HELPER
  ---------------------------------
  Purpose:
  Choose a continuous travel vector for the herbivore in its current
  left/right direction.

  Rules:
  - no idle choice while traveling
  - can move straight, diagonal up, or diagonal down
  - keeps current direction until full travel distance is reached
  */

  /*
  HERBIVORE TRAVEL SELECTION
  --------------------------
  Purpose:
  Pick one normal travel behavior for about 20 tiles.

  Options:
  - straight
  - diagonal up
  - diagonal down
  - idle for 3 seconds
  */

  chooseHerbivoreTravelBehavior(mob: RuntimeMobEntity, now: number) {
    const edgeBias = this.getHerbivoreVerticalEdgeBias(mob);

    let modes: Array<"straight" | "diag_up" | "diag_down" | "idle"> = [
      "straight",
      "diag_up",
      "diag_down",
      "idle"
    ];

    if (edgeBias.nearTop) {
      modes = ["straight", "diag_down", "diag_down", "idle"];
    } else if (edgeBias.nearBottom) {
      modes = ["straight", "diag_up", "diag_up", "idle"];
    }

    mob.travelMode = modes[Math.floor(this.getRandomRange(0, modes.length))];
    mob.travelDistancePx = 0;
    mob.travelTargetDistancePx = 20 * TILE_SIZE;

    if (mob.travelMode === "idle") {
      mob.vx = 0;
      mob.vy = 0;
      mob.state = "idle";
      mob.idleUntilEpochMs = now + 3000;
      mob.facing = mob.cycleDirection;
      return;
    }

    const movingLeft = mob.cycleDirection === "left";

    if (mob.travelMode === "straight") {
      mob.vx = (movingLeft ? -1 : 1) * mob.speed;
      mob.vy = 0;
    } else if (mob.travelMode === "diag_up") {
      mob.vx = (movingLeft ? -0.85 : 0.85) * mob.speed;
      mob.vy = -0.45 * mob.speed;
    } else {
      mob.vx = (movingLeft ? -0.85 : 0.85) * mob.speed;
      mob.vy = 0.45 * mob.speed;
    }

    mob.state = "move";
    mob.idleUntilEpochMs = 0;
    mob.facing = mob.cycleDirection;
  }

    /*
  HERBIVORE REVERSE HELPER
  ------------------------
  Purpose:
  Flip a herbivore to the opposite travel direction and immediately continue
  moving without idle.

  Used for:
  - fleeing predators
  - fleeing apex predators
  - fleeing players
  */

  /*
  HERBIVORE REVERSE DIRECTION
  ---------------------------
  Purpose:
  Reverse herbivore direction after a bump or threat.

  Modes:
  - normal reverse: brief idle, then continue
  - flee reverse: no idle, ignore plants for 20 tiles
  */

  reverseHerbivoreTravelDirection(
    mob: RuntimeMobEntity,
    now: number,
    options?: { flee?: boolean; bumpIdleMs?: number }
  ) {
    mob.cycleDirection = mob.cycleDirection === "left" ? "right" : "left";
    mob.travelDistancePx = 0;
    mob.travelTargetDistancePx = 20 * TILE_SIZE;

    if (options?.flee) {
      mob.ignorePlantsUntilTravelPx = 20 * TILE_SIZE;
      mob.idleUntilEpochMs = 0;

      const edgeBias = this.getHerbivoreVerticalEdgeBias(mob);
      const movingLeft = mob.cycleDirection === "left";

      if (edgeBias.nearTop) {
        mob.travelMode = "diag_down";
        mob.vx = (movingLeft ? -0.9 : 0.9) * mob.speed;
        mob.vy = 0.4 * mob.speed;
      } else if (edgeBias.nearBottom) {
        mob.travelMode = "diag_up";
        mob.vx = (movingLeft ? -0.9 : 0.9) * mob.speed;
        mob.vy = -0.4 * mob.speed;
      } else {
        mob.travelMode = "straight";
        mob.vx = (movingLeft ? -1 : 1) * mob.speed;
        mob.vy = 0;
      }

      mob.state = "move";
      mob.facing = mob.cycleDirection;
      return;
    }

    mob.ignorePlantsUntilTravelPx = Math.max(0, mob.ignorePlantsUntilTravelPx);
    mob.vx = 0;
    mob.vy = 0;
    mob.state = "idle";
    mob.travelMode = "idle";
    mob.idleUntilEpochMs = now + (options?.bumpIdleMs ?? 500);
    mob.facing = mob.cycleDirection;
  }

    /*
  HERBIVORE EDGE HELPERS
  ----------------------
  Purpose:
  Bias herbivore travel choices away from the top and bottom map edges so
  they do not get stuck bouncing vertically.
  */

  getHerbivoreVerticalEdgeBias(mob: RuntimeMobEntity) {
    const bounds = this.getRoomWorldBounds();
    const edgePaddingPx = TILE_SIZE * 3;

    const nearTop = mob.y <= bounds.minY + edgePaddingPx;
    const nearBottom = mob.y >= bounds.maxY - edgePaddingPx;

    return {
      nearTop,
      nearBottom
    };
  }

spawnHerbivoreOffspring(parent: RuntimeMobEntity) {
  const childSpawn = this.getSafeOffsetSpawnPosition(parent.x, parent.y);
  const childX = childSpawn.x;
  const childY = childSpawn.y;
  const bornAt = Date.now();

  this.runtimeMobEntities.push({
    id: `${parent.anchorId}:offspring:${Math.floor(this.getRandomRange(1000, 999999))}`,
    mapKey: this.currentMapKey,
    anchorId: parent.anchorId,
    anchorFrame: parent.anchorFrame,
    kind: "herbivore",
tier: parent.tier,
speciesKey: parent.speciesKey,
    x: childX,
    y: childY,
    homeX: parent.homeX,
    homeY: parent.homeY,
    facing: Math.random() < 0.5 ? "left" : "right",
    state: "idle",
    speed: parent.speed,
    vx: 0,
    vy: 0,
    thinkAtEpochMs: bornAt + Math.floor(this.getRandomRange(500, 1600)),
    cycleDirection: Math.random() < 0.5 ? "left" : "right",
    travelMode: "straight",
    travelDistancePx: 0,
    travelTargetDistancePx: 20 * TILE_SIZE,
    ignorePlantsUntilTravelPx: 0,
    idleUntilEpochMs: 0,
    plantCounter: 0,
    bornAtEpochMs: bornAt,
    diesAtEpochMs: 0,
    nextDeathRollAtEpochMs: bornAt + HERBIVORE_DEATH_ROLL_INTERVAL_MS,
    eatingNodeId: "",
    eatingUntilEpochMs: 0,
    stamina: parent.maxStamina,
    maxStamina: parent.maxStamina,
    incapacitated: false,
    lastHitAtEpochMs: 0,

    attackTargetId: "",
    attackTargetType: "",
    attackWindupUntilEpochMs: 0,
    attackCooldownUntilEpochMs: 0,

    aggroPlayerId: "",
    aggroUntilEpochMs: 0,
    hasRetaliatedThisAggro: false,

    speedBoostUntilEpochMs: 0,
    speedBoostMultiplier: 1,

    foodVicinityTargetId: "",
    foodVicinityStartedAtEpochMs: 0,
    avoidFoodTargetId: "",
    avoidFoodTargetUntilEpochMs: 0,

    aggroMobId: "",
    aggroMobUntilEpochMs: 0,
    hasRetaliatedThisMobAggro: false,

    lastProgressCheckAtEpochMs: 0,
    lastProgressX: 0,
    lastProgressY: 0,
    stuckUntilEpochMs: 0,
stuckTargetX: 0,
stuckTargetY: 0,

maxEsm: parent.maxEsm,
esm: parent.birthEsm,
eatThreshold: parent.eatThreshold,

decisionIntervalMs: parent.decisionIntervalMs,
nextDecisionAt: bornAt + this.getRandomRange(0, parent.decisionIntervalMs),

targetId: "",

birthEsm: parent.birthEsm,
reproductionRatio: parent.reproductionRatio
  } as RuntimeMobEntity);
}

  releasePlantCountersFromHerbivore(mob: RuntimeMobEntity) {
    const releaseCount = mob.plantCounter + 3;

    for (let i = 0; i < releaseCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = this.getRandomRange(0, HERBIVORE_VISION_RADIUS_PX);
      const worldX = mob.x + Math.cos(angle) * distance;
      const worldY = mob.y + Math.sin(angle) * distance;
      this.markAnimalDeathAtWorldPosition(worldX, worldY);
    }
  }

    getRandomPlantAnchorFrameByTier(tier: number) {
    const rowOptionsByTier: Record<number, number[]> = {
      1: [OBJECT_ROW_LEVEL1_PLANT_A, OBJECT_ROW_LEVEL1_PLANT_B],
      2: [OBJECT_ROW_LEVEL2_PLANT_A, OBJECT_ROW_LEVEL2_PLANT_B],
      3: [OBJECT_ROW_LEVEL3_PLANT]
    };

    const rows = rowOptionsByTier[tier] || rowOptionsByTier[1];
    const chosenRow = rows[Math.floor(this.getRandomRange(0, rows.length))];
    return chosenRow * OBJECT_SHEET_COLUMNS + OBJECT_SHEET_FIRST_CONTENT_COLUMN;
  }

  rollPlantTierForPredatorDeath() {
    const roll = Math.random();

    if (roll < 0.50) return 1;
    if (roll < 0.90) return 2;
    return 3;
  }

  spawnPlantFromAnimalDeathAt(worldX: number, worldY: number, tier: number) {
    const frame = this.getRandomPlantAnchorFrameByTier(tier);

    const node: RuntimeCollectableNode = {
      id: `${this.currentMapKey}:deathplant:${Math.floor(this.getRandomRange(1000, 999999999))}`,
      mapKey: this.currentMapKey,
      anchorTileX: Math.max(0, Math.floor((worldX - ROOM_OFFSET_X) / TILE_SIZE)),
      anchorTileY: Math.max(0, Math.floor((worldY - ROOM_OFFSET_Y) / TILE_SIZE)),
      anchorFrame: frame,
      kind: "plant",
      tier,
      state: "growing",
      growthStage: 0,
      worldX,
      worldY,
      growthStartedAtEpochMs: 0,
      growthEndsAtEpochMs: 0,
      requiresAnimalDeathToRespawn: false,
      pendingRespawnFromAnimalDeath: false
    };

    this.startPlantGrowthCycle(node);
    node.worldX = worldX;
    node.worldY = worldY;

    this.runtimeCollectableNodes.push(node);
  }

  releasePlantsFromPredatorDeath(mob: RuntimeMobEntity, releaseCount: number) {
    for (let i = 0; i < releaseCount; i++) {
      const spawnPos = this.getSafeOffsetSpawnPosition(mob.x, mob.y);
      const tier = this.rollPlantTierForPredatorDeath();

      this.spawnPlantFromAnimalDeathAt(spawnPos.x, spawnPos.y, tier);
    }

    this.broadcastRuntimeCollectableSnapshot(true);
  }

  removeMobEntityById(mobId: string) {
    this.runtimeMobEntities = this.runtimeMobEntities.filter((entry) => entry.id !== mobId);
  }

    consumeMobFoodTarget(target: RuntimeMobEntity) {
    this.incapacitateMob(target);
    this.broadcastRuntimeMobSnapshot(true);
  }

  handleHerbivoreDeath(mob: RuntimeMobEntity) {
    if (mob.incapacitated) return;
    this.releasePlantCountersFromHerbivore(mob);
    this.incapacitateMob(mob);
  }

  spawnCarnivoreOffspring(parent: RuntimeMobEntity) {
    const bornAt = Date.now();
    const childSpawn = this.getSafeOffsetSpawnPosition(parent.x, parent.y);

    this.runtimeMobEntities.push({
      id: `${parent.anchorId}:offspring:${Math.floor(this.getRandomRange(1000, 999999))}`,
      mapKey: this.currentMapKey,
      anchorId: parent.anchorId,
      anchorFrame: parent.anchorFrame,
      kind: "carnivore",
tier: parent.tier,
speciesKey: parent.speciesKey,
      x: childSpawn.x,
      y: childSpawn.y,
      homeX: parent.homeX,
      homeY: parent.homeY,
      facing: Math.random() < 0.5 ? "left" : "right",
      state: "idle",
      speed: parent.speed,
      vx: 0,
      vy: 0,
      thinkAtEpochMs: bornAt + Math.floor(this.getRandomRange(500, 1400)),
      cycleDirection: Math.random() < 0.5 ? "left" : "right",
      travelMode: "straight",
      travelDistancePx: 0,
      travelTargetDistancePx: 20 * TILE_SIZE,
      ignorePlantsUntilTravelPx: 0,
      idleUntilEpochMs: 0,
      plantCounter: 0,
      bornAtEpochMs: bornAt,
      diesAtEpochMs: 0,
      nextDeathRollAtEpochMs: bornAt + CARNIVORE_DEATH_ROLL_INTERVAL_MS,
      eatingNodeId: "",
      eatingUntilEpochMs: 0,
      stamina: parent.maxStamina,
      maxStamina: parent.maxStamina,
      incapacitated: false,
      lastHitAtEpochMs: 0,
      attackTargetId: "",
      attackTargetType: "",
      attackWindupUntilEpochMs: 0,
      attackCooldownUntilEpochMs: 0,
      aggroPlayerId: "",
      aggroUntilEpochMs: 0,
      hasRetaliatedThisAggro: false,
      speedBoostUntilEpochMs: 0,
      speedBoostMultiplier: 1,
      foodVicinityTargetId: "",
      foodVicinityStartedAtEpochMs: 0,
      avoidFoodTargetId: "",
      avoidFoodTargetUntilEpochMs: 0,
      aggroMobId: "",
      aggroMobUntilEpochMs: 0,
      hasRetaliatedThisMobAggro: false,
      lastProgressCheckAtEpochMs: 0,
      lastProgressX: 0,
      lastProgressY: 0,
      stuckUntilEpochMs: 0,
stuckTargetX: 0,
stuckTargetY: 0,

maxEsm: parent.maxEsm,
esm: parent.birthEsm,
eatThreshold: parent.eatThreshold,

decisionIntervalMs: parent.decisionIntervalMs,
nextDecisionAt: bornAt + this.getRandomRange(0, parent.decisionIntervalMs),

targetId: "",

birthEsm: parent.birthEsm,
reproductionRatio: parent.reproductionRatio
    } as RuntimeMobEntity);
  }

  spawnApexPredatorOffspring(parent: RuntimeMobEntity) {
    const bornAt = Date.now();
    const childSpawn = this.getSafeOffsetSpawnPosition(parent.x, parent.y);

    this.runtimeMobEntities.push({
      id: `${parent.anchorId}:offspring:${Math.floor(this.getRandomRange(1000, 999999))}`,
      mapKey: this.currentMapKey,
      anchorId: parent.anchorId,
      anchorFrame: parent.anchorFrame,
      kind: "apex_predator",
tier: parent.tier,
speciesKey: parent.speciesKey,
      x: childSpawn.x,
      y: childSpawn.y,
      homeX: parent.homeX,
      homeY: parent.homeY,
      facing: Math.random() < 0.5 ? "left" : "right",
      state: "idle",
      speed: parent.speed,
      vx: 0,
      vy: 0,
      thinkAtEpochMs: bornAt + Math.floor(this.getRandomRange(500, 1400)),
      cycleDirection: Math.random() < 0.5 ? "left" : "right",
      travelMode: "straight",
      travelDistancePx: 0,
      travelTargetDistancePx: 20 * TILE_SIZE,
      ignorePlantsUntilTravelPx: 0,
      idleUntilEpochMs: 0,
      plantCounter: 0,
      bornAtEpochMs: bornAt,
      diesAtEpochMs: 0,
      nextDeathRollAtEpochMs: bornAt + APEX_PREDATOR_DEATH_ROLL_INTERVAL_MS,
      eatingNodeId: "",
      eatingUntilEpochMs: 0,
      stamina: parent.maxStamina,
      maxStamina: parent.maxStamina,
      incapacitated: false,
      lastHitAtEpochMs: 0,
      attackTargetId: "",
      attackTargetType: "",
      attackWindupUntilEpochMs: 0,
      attackCooldownUntilEpochMs: 0,
      aggroPlayerId: "",
      aggroUntilEpochMs: 0,
      hasRetaliatedThisAggro: false,
      speedBoostUntilEpochMs: 0,
      speedBoostMultiplier: 1,
      foodVicinityTargetId: "",
      foodVicinityStartedAtEpochMs: 0,
      avoidFoodTargetId: "",
      avoidFoodTargetUntilEpochMs: 0,
      aggroMobId: "",
      aggroMobUntilEpochMs: 0,
      hasRetaliatedThisMobAggro: false,
      lastProgressCheckAtEpochMs: 0,
      lastProgressX: 0,
      lastProgressY: 0,
      stuckUntilEpochMs: 0,
stuckTargetX: 0,
stuckTargetY: 0,

maxEsm: parent.maxEsm,
esm: parent.birthEsm,
eatThreshold: parent.eatThreshold,

decisionIntervalMs: parent.decisionIntervalMs,
nextDecisionAt: bornAt + this.getRandomRange(0, parent.decisionIntervalMs),

targetId: "",

birthEsm: parent.birthEsm,
reproductionRatio: parent.reproductionRatio
    } as RuntimeMobEntity);
  }

  handleCarnivoreDeath(mob: RuntimeMobEntity) {
    if (mob.incapacitated) return;
    this.releasePlantsFromPredatorDeath(mob, mob.plantCounter + 9);
    this.incapacitateMob(mob);
  }

  handleApexPredatorDeath(mob: RuntimeMobEntity) {
    if (mob.incapacitated) return;
    this.releasePlantsFromPredatorDeath(mob, mob.plantCounter + 25);
    this.incapacitateMob(mob);
  }

  incapacitateMob(mob: RuntimeMobEntity) {
    if (!mob.incapacitatedAtEpochMs) {
      mob.incapacitatedAtEpochMs = Date.now();
    }
    mob.stamina = 0;
    mob.incapacitated = true;
    mob.vx = 0;
    mob.vy = 0;
    mob.state = "idle";
    mob.targetId = "";
    mob.eatingNodeId = "";
    mob.eatingUntilEpochMs = 0;
    mob.aggroPlayerId = "";
    mob.aggroUntilEpochMs = 0;
    mob.aggroMobId = "";
    mob.aggroMobUntilEpochMs = 0;
    this.clearMobAttackState(mob);
  }

    /*
  PREDATOR ATTACK HELPERS
  -----------------------
  Purpose:
  Start and resolve predator attacks against mobs or players.
  */

  isMobAttackBusy(mob: RuntimeMobEntity, now: number) {
    return !!(
      mob.attackTargetId &&
      mob.attackTargetType &&
      mob.attackWindupUntilEpochMs > now
    );
  }

  canMobStartAttack(mob: RuntimeMobEntity, now: number) {
    return now >= (mob.attackCooldownUntilEpochMs || 0) && !this.isMobAttackBusy(mob, now);
  }

  beginMobAttack(
    mob: RuntimeMobEntity,
    targetType: "mob" | "player",
    targetId: string,
    windupMs: number
  ) {
    const now = Date.now();

    mob.attackTargetType = targetType;
    mob.attackTargetId = targetId;
    mob.attackWindupUntilEpochMs = now + windupMs;
    mob.attackCooldownUntilEpochMs = now + windupMs + PREDATOR_ATTACK_COOLDOWN_MS;

    mob.vx = 0;
    mob.vy = 0;
    mob.state = "idle";

    if (targetType === "mob") {
      const target = this.runtimeMobEntities.find((entry) => entry.id === targetId);
      if (target) {
        mob.facing = target.x < mob.x ? "left" : "right";
      }
    } else if (targetType === "player") {
      const target = this.state.players.get(targetId);
      if (target) {
        mob.facing = target.x < mob.x ? "left" : "right";
      }
    }
  }

  clearMobAttackState(mob: RuntimeMobEntity) {
    mob.attackTargetType = "";
    mob.attackTargetId = "";
    mob.attackWindupUntilEpochMs = 0;
  }

  markMobAggroOnPlayer(mob: RuntimeMobEntity, playerId: string, durationMs = 12000) {
    mob.aggroPlayerId = playerId;
    mob.aggroUntilEpochMs = Date.now() + durationMs;

    if (mob.kind === "herbivore") {
      mob.hasRetaliatedThisAggro = false;
    }
  }

  markMobAggroOnMob(mob: RuntimeMobEntity, sourceMobId: string, durationMs = 5000) {
    mob.aggroMobId = sourceMobId;
    mob.aggroMobUntilEpochMs = Date.now() + durationMs;

    if (mob.kind === "herbivore") {
      mob.hasRetaliatedThisMobAggro = false;
    }
  }  

  applyDamagePopupAt(x: number, y: number, text: string, kind: "hit" | "crit" | "miss" = "hit") {
    this.broadcast("mob_damage_popup", {
      mapKey: this.currentMapKey,
      x,
      y,
      text,
      kind
    });
  }

  applyPredatorDamageToMob(attacker: RuntimeMobEntity, target: RuntimeMobEntity) {
    const profileRoll =
      attacker.kind === "apex_predator"
        ? this.rollApexPredatorAttackPulse(attacker.tier)
        : this.rollCarnivoreAttackPulse(attacker.tier);

    target.lastHitAtEpochMs = Date.now();

    if (target.kind === "herbivore" || target.kind === "carnivore") {
      this.markMobAggroOnMob(target, attacker.id, 5000);
    }    

    if (!profileRoll.hit) {
      this.applyDamagePopupAt(target.x, target.y, "miss", "miss");
      return {
        hit: false,
        crit: false,
        damage: 0
      };
    }

    target.stamina = Math.max(0, target.stamina - profileRoll.damage);

    this.applyDamagePopupAt(
      target.x,
      target.y,
      `${profileRoll.damage}`,
      profileRoll.crit ? "crit" : "hit"
    );

    if (target.stamina <= 0) {
      target.stamina = 0;

      if (attacker.kind === "carnivore" && target.kind === "herbivore") {
        attacker.plantCounter += 1;

        if (attacker.plantCounter >= CARNIVORE_REPRODUCTION_PLANT_COUNTERS) {
          attacker.plantCounter -= CARNIVORE_REPRODUCTION_PLANT_COUNTERS;
          this.spawnCarnivoreOffspring(attacker);
        }
      }

      if (
        attacker.kind === "apex_predator" &&
        (target.kind === "herbivore" || target.kind === "carnivore")
      ) {
        attacker.plantCounter += 1;

        if (attacker.plantCounter >= APEX_PREDATOR_REPRODUCTION_PLANT_COUNTERS) {
          attacker.plantCounter -= APEX_PREDATOR_REPRODUCTION_PLANT_COUNTERS;
          this.spawnApexPredatorOffspring(attacker);
        }
      }

      if (target.kind === "herbivore") {
        this.handleHerbivoreDeath(target);
        return {
          hit: true,
          crit: profileRoll.crit,
          damage: profileRoll.damage
        };
      }

      if (target.kind === "carnivore") {
        this.handleCarnivoreDeath(target);
        return {
          hit: true,
          crit: profileRoll.crit,
          damage: profileRoll.damage
        };
      }

      if (target.kind === "apex_predator") {
        this.handleApexPredatorDeath(target);
        return {
          hit: true,
          crit: profileRoll.crit,
          damage: profileRoll.damage
        };
      }

      this.incapacitateMob(target);
      return {
        hit: true,
        crit: profileRoll.crit,
        damage: profileRoll.damage
      };
    }

    return {
      hit: true,
      crit: profileRoll.crit,
      damage: profileRoll.damage
    };
  }

  applyPredatorDamageToPlayer(attacker: RuntimeMobEntity, target: Player) {
    const profileRoll =
      attacker.kind === "herbivore"
        ? this.rollHerbivoreAttackPulse(attacker.tier)
        : attacker.kind === "apex_predator"
          ? this.rollApexPredatorAttackPulse(attacker.tier)
          : this.rollCarnivoreAttackPulse(attacker.tier);

    if (!profileRoll.hit) {
      this.applyDamagePopupAt(target.x, target.y, "miss", "miss");
      return {
        hit: false,
        crit: false,
        damage: 0
      };
    }

    target.stamina = Math.max(0, target.stamina - profileRoll.damage);

    this.applyDamagePopupAt(
      target.x,
      target.y,
      `${profileRoll.damage}`,
      profileRoll.crit ? "crit" : "hit"
    );

    return {
      hit: true,
      crit: profileRoll.crit,
      damage: profileRoll.damage
    };
  }

  resolveMobAttackIfReady(mob: RuntimeMobEntity, now: number) {
    if (!mob.attackTargetId || !mob.attackTargetType) return;
    if (now < mob.attackWindupUntilEpochMs) return;

    const pulseCount =
      mob.kind === "herbivore"
        ? this.getHerbivoreAttackProfile(mob.tier).pulses
        : mob.kind === "apex_predator"
          ? this.getApexPredatorAttackProfile(mob.tier).pulses
          : this.getCarnivoreAttackProfile(mob.tier).pulses;

    if (mob.attackTargetType === "mob") {
      const target = this.runtimeMobEntities.find((entry) => entry.id === mob.attackTargetId);

      this.clearMobAttackState(mob);

      if (!target || target.id === mob.id || target.incapacitated) {
        return;
      }

      for (let i = 0; i < pulseCount; i++) {
        if (target.incapacitated) break;
        this.applyPredatorDamageToMob(mob, target);
      }

      this.broadcastRuntimeMobSnapshot(true);
      return;
    }

    if (mob.attackTargetType === "player") {
      const target = this.state.players.get(mob.attackTargetId);

      this.clearMobAttackState(mob);

      if (!target) {
        return;
      }

      for (let i = 0; i < pulseCount; i++) {
        this.applyPredatorDamageToPlayer(mob, target);
      }

      if (mob.kind === "herbivore") {
        const profile = this.getHerbivoreAttackProfile(mob.tier);
        this.setMobSpeedBoost(
          mob,
          profile.speedBoostMultiplier,
          profile.speedBoostDurationMs
        );
      }

      return;
    }  }

    /*
  PREDATOR WANDER HELPER
  ---------------------
  Purpose:
  Give carnivores and apex predators a simple fallback idle/wander behavior
  when they are not chasing or fleeing anything.

  Rules:
  - preserves anchor-radius roaming
  - uses the same think timer pattern as the previous generic movement
  */

  updatePredatorIdleWander(
    mob: RuntimeMobEntity,
    now: number,
    walkChance = 0.7,
    thinkMinMs = 900,
    thinkMaxMs = 2000,
    idleMinMs = 700,
    idleMaxMs = 1800
  ) {
    if (now < mob.thinkAtEpochMs) {
      return;
    }

    const shouldWalk = Math.random() < walkChance;

    if (shouldWalk) {
      const angle = Math.random() * Math.PI * 2;
      mob.vx = Math.cos(angle) * mob.speed;
      mob.vy = Math.sin(angle) * mob.speed;
      mob.state = "move";
      mob.facing = mob.vx < 0 ? "left" : "right";
      mob.thinkAtEpochMs = now + Math.floor(this.getRandomRange(thinkMinMs, thinkMaxMs));
    } else {
      mob.vx = 0;
      mob.vy = 0;
      mob.state = "idle";
      mob.thinkAtEpochMs = now + Math.floor(this.getRandomRange(idleMinMs, idleMaxMs));
    }
  }

    /*
  CARNIVORE AI
  ------------
  Purpose:
  Drive carnivore behavior without changing herbivore logic.

  Rules:
  - chase herbivores in vision
  - flee apex predators in vision
  - ignore players for now
  - ignore other carnivores
  - wander when no target exists
  */

updateCarnivoreMob(mob: RuntimeMobEntity, dt: number, now: number) {  if (mob.incapacitated) {
    mob.vx = 0;
    mob.vy = 0;
    mob.state = "idle";
    return;
  }

  if (this.isMobAttackBusy(mob, now)) {
    mob.vx = 0;
    mob.vy = 0;
    mob.state = "idle";
    return;
  }

  if (this.updateMobForcedEscape(mob, now, 1.18)) {
    return;
  }

  if (mob.aggroPlayerId && now >= mob.aggroUntilEpochMs) {
    mob.aggroPlayerId = "";
    mob.aggroUntilEpochMs = 0;
  }

  if (mob.aggroMobId && now >= mob.aggroMobUntilEpochMs) {
    mob.aggroMobId = "";
    mob.aggroMobUntilEpochMs = 0;
    mob.hasRetaliatedThisMobAggro = false;
  }

  if (now >= mob.nextDeathRollAtEpochMs) {
    if (Math.random() < CARNIVORE_DEATH_ROLL_CHANCE) {
      this.handleCarnivoreDeath(mob);
      return;
    }

    mob.nextDeathRollAtEpochMs += CARNIVORE_DEATH_ROLL_INTERVAL_MS;
  }

  const apexThreat = this.getNearestApexPredatorForMob(
    mob,
    CARNIVORE_VISION_RADIUS_PX
  );

  const aggroPlayer =
    mob.aggroPlayerId && now < mob.aggroUntilEpochMs
      ? this.state.players.get(mob.aggroPlayerId)
      : null;

    if (mob.aggroMobId && now >= mob.aggroMobUntilEpochMs) {
      mob.aggroMobId = "";
      mob.aggroMobUntilEpochMs = 0;
      mob.hasRetaliatedThisMobAggro = false;
    }     

  const aggroMob =
    mob.aggroMobId && now < mob.aggroMobUntilEpochMs
      ? this.runtimeMobEntities.find((entry) => entry.id === mob.aggroMobId) || null
      : null;

  if (mob.stamina <= mob.maxStamina * LOW_HEALTH_RETREAT_THRESHOLD) {
    if (aggroPlayer) {
      const playerDistance = this.getDistanceBetweenPoints(
        mob.x,
        mob.y,
        aggroPlayer.x,
        aggroPlayer.y
      );

      if (
        playerDistance <= CARNIVORE_ATTACK_RANGE_PX &&
        this.canMobStartAttack(mob, now)
      ) {
        const profile = this.getCarnivoreAttackProfile(mob.tier);
        this.beginMobAttack(mob, "player", mob.aggroPlayerId, profile.windupMs);
        return;
      }

      this.setMobVelocityAwayFromPoint(mob, aggroPlayer.x, aggroPlayer.y, 1.2);
      this.beginMobStuckWatch(mob, now);
      mob.thinkAtEpochMs = now + 180;
      return;
    }

    if (aggroMob) {
      const mobDistance = this.getDistanceBetweenPoints(
        mob.x,
        mob.y,
        aggroMob.x,
        aggroMob.y
      );

      if (
        mobDistance <= CARNIVORE_ATTACK_RANGE_PX &&
        this.canMobStartAttack(mob, now)
      ) {
        const profile = this.getCarnivoreAttackProfile(mob.tier);
        this.beginMobAttack(mob, "mob", aggroMob.id, profile.windupMs);
        return;
      }

      this.setMobVelocityAwayFromPoint(mob, aggroMob.x, aggroMob.y, 1.2);
      this.beginMobStuckWatch(mob, now);
      mob.thinkAtEpochMs = now + 180;
      return;
    }

    if (apexThreat) {
      this.setMobVelocityAwayFromPoint(mob, apexThreat.x, apexThreat.y, 1.25);
      this.beginMobStuckWatch(mob, now);
      mob.thinkAtEpochMs = now + 180;
      return;
    }
  }

  if (apexThreat) {
    this.setMobVelocityAwayFromPoint(mob, apexThreat.x, apexThreat.y, 1.2);
    this.beginMobStuckWatch(mob, now);
    mob.thinkAtEpochMs = now + 250;
    return;
  }

  if (aggroMob) {
    const mobDistance = this.getDistanceBetweenPoints(
      mob.x,
      mob.y,
      aggroMob.x,
      aggroMob.y
    );

    if (
      mobDistance <= CARNIVORE_ATTACK_RANGE_PX &&
      this.canMobStartAttack(mob, now)
    ) {
      const profile = this.getCarnivoreAttackProfile(mob.tier);
      this.beginMobAttack(mob, "mob", aggroMob.id, profile.windupMs);
      return;
    }

    this.setMobVelocityTowardPoint(mob, aggroMob.x, aggroMob.y, 1.08);
    this.beginMobStuckWatch(mob, now);
    mob.thinkAtEpochMs = now + 180;
    return;
  }

  if (aggroPlayer) {
    const playerDistance = this.getDistanceBetweenPoints(
      mob.x,
      mob.y,
      aggroPlayer.x,
      aggroPlayer.y
    );

    if (playerDistance > CARNIVORE_VISION_RADIUS_PX) {
      mob.aggroPlayerId = "";
      mob.aggroUntilEpochMs = 0;
    } else {
      if (
        playerDistance <= CARNIVORE_ATTACK_RANGE_PX &&
        this.canMobStartAttack(mob, now)
      ) {
        const profile = this.getCarnivoreAttackProfile(mob.tier);
        this.beginMobAttack(mob, "player", mob.aggroPlayerId, profile.windupMs);
        return;
      }

      this.setMobVelocityTowardPoint(mob, aggroPlayer.x, aggroPlayer.y, 1.1);
      this.beginMobStuckWatch(mob, now);
      mob.thinkAtEpochMs = now + 180;
      return;
    }
  }

  const herbivoreTarget = this.getNearestHerbivoreForMob(
    mob,
    CARNIVORE_VISION_RADIUS_PX
  );

  if (
    herbivoreTarget &&
    !this.shouldAvoidFoodTarget(mob, herbivoreTarget.id, now)
  ) {
    const shouldAbandon = this.trackFoodTargetVicinity(
      mob,
      herbivoreTarget.id,
      herbivoreTarget.distance,
      now,
      true
    );

    if (shouldAbandon) {
      this.updatePredatorIdleWander(mob, now, 0.72, 900, 1800, 700, 1500);
      return;
    }

    if (
      herbivoreTarget.distance <= CARNIVORE_ATTACK_RANGE_PX &&
      this.canMobStartAttack(mob, now)
    ) {
      const profile = this.getCarnivoreAttackProfile(mob.tier);
      this.beginMobAttack(mob, "mob", herbivoreTarget.id, profile.windupMs);
      return;
    }

    if (!this.isMobAttackBusy(mob, now)) {
      this.setMobVelocityTowardPoint(mob, herbivoreTarget.x, herbivoreTarget.y, 1.08);
      this.beginMobStuckWatch(mob, now);
      mob.thinkAtEpochMs = now + 180;
    }

    return;
  }

  mob.foodVicinityTargetId = "";
  mob.foodVicinityStartedAtEpochMs = 0;

  this.updatePredatorIdleWander(
    mob,
    now,
    0.72,
    900,
    1800,
    700,
    1500
  );
}
    /*
  APEX PREDATOR AI
  ----------------
  Purpose:
  Drive apex predator hunting behavior.

  Rules:
  - chase herbivores in vision
  - chase carnivores in vision
  - prefer the closer target
  - ignore other apex predators
  - players will be added later
  */

  updateApexPredatorMob(mob: RuntimeMobEntity, dt: number, now: number) {
    if (mob.incapacitated) {
      mob.vx = 0;
      mob.vy = 0;
      mob.state = "idle";
      return;
    }

    if (this.isMobAttackBusy(mob, now)) {
      mob.vx = 0;
      mob.vy = 0;
      mob.state = "idle";
      return;
    }

        if (this.updateMobForcedEscape(mob, now, 1.18)) {
      return;
    }

    if (now >= mob.nextDeathRollAtEpochMs) {
      if (Math.random() < APEX_PREDATOR_DEATH_ROLL_CHANCE) {
        this.handleApexPredatorDeath(mob);
        return;
      }

      mob.nextDeathRollAtEpochMs += APEX_PREDATOR_DEATH_ROLL_INTERVAL_MS;
    }

    const playerTarget = this.getNearestPlayerForMob(
      mob,
      APEX_PREDATOR_VISION_RADIUS_PX
    );

    if (mob.stamina <= mob.maxStamina * LOW_HEALTH_RETREAT_THRESHOLD && playerTarget) {
      if (
        playerTarget.distance <= APEX_PREDATOR_ATTACK_RANGE_PX &&
        this.canMobStartAttack(mob, now)
      ) {
        const profile = this.getApexPredatorAttackProfile(mob.tier);
        this.beginMobAttack(mob, "player", playerTarget.sessionId, profile.windupMs);
        return;
      }

      this.setMobVelocityAwayFromPoint(mob, playerTarget.x, playerTarget.y, 1.2);
      mob.thinkAtEpochMs = now + 160;
      return;
    }

    const herbivoreTarget = this.getNearestHerbivoreForMob(
      mob,
      APEX_PREDATOR_VISION_RADIUS_PX
    );

    const carnivoreTarget = this.getNearestCarnivoreForMob(
      mob,
      APEX_PREDATOR_VISION_RADIUS_PX
    );

    const mobCandidates = [herbivoreTarget, carnivoreTarget].filter(Boolean);
    const nearestMobTarget =
      mobCandidates.length > 0
        ? mobCandidates.sort((a, b) => a!.distance - b!.distance)[0] || null
        : null;

    const chosenTarget =
      nearestMobTarget && playerTarget
        ? nearestMobTarget.distance <= playerTarget.distance
          ? {
              type: "mob" as const,
              id: nearestMobTarget.id,
              x: nearestMobTarget.x,
              y: nearestMobTarget.y,
              distance: nearestMobTarget.distance
            }
          : {
              type: "player" as const,
              id: playerTarget.sessionId,
              x: playerTarget.x,
              y: playerTarget.y,
              distance: playerTarget.distance
            }
        : nearestMobTarget
          ? {
              type: "mob" as const,
              id: nearestMobTarget.id,
              x: nearestMobTarget.x,
              y: nearestMobTarget.y,
              distance: nearestMobTarget.distance
            }
          : playerTarget
            ? {
                type: "player" as const,
                id: playerTarget.sessionId,
                x: playerTarget.x,
                y: playerTarget.y,
                distance: playerTarget.distance
              }
            : null;

    if (
      chosenTarget &&
      chosenTarget.type === "mob" &&
      this.shouldAvoidFoodTarget(mob, chosenTarget.id, now)
    ) {
      this.updatePredatorIdleWander(
        mob,
        now,
        0.76,
        800,
        1700,
        600,
        1400
      );
      return;
    }

    if (chosenTarget) {
      const shouldAbandon =
        chosenTarget.type === "mob"
          ? this.trackFoodTargetVicinity(
              mob,
              chosenTarget.id,
              chosenTarget.distance,
              now,
              true
            )
          : false;

      if (shouldAbandon) {
        this.updatePredatorIdleWander(
          mob,
          now,
          0.76,
          800,
          1700,
          600,
          1400
        );
        return;
      }

      if (
        chosenTarget.distance <= APEX_PREDATOR_ATTACK_RANGE_PX &&
        this.canMobStartAttack(mob, now)
      ) {
        const profile = this.getApexPredatorAttackProfile(mob.tier);
        this.beginMobAttack(mob, chosenTarget.type, chosenTarget.id, profile.windupMs);
        return;
      }

      if (!this.isMobAttackBusy(mob, now)) {
        this.setMobVelocityTowardPoint(mob, chosenTarget.x, chosenTarget.y, 1.15);
        mob.thinkAtEpochMs = now + 160;
      }

      return;
    }

    mob.foodVicinityTargetId = "";
    mob.foodVicinityStartedAtEpochMs = 0;

    this.updatePredatorIdleWander(
      mob,
      now,
      0.76,
      800,
      1700,
      600,
      1400
    );
  }

  updateHerbivoreMob(mob: RuntimeMobEntity, dt: number, now: number) {
    if (mob.incapacitated) {
      mob.vx = 0;
      mob.vy = 0;
      mob.state = "idle";
      mob.eatingNodeId = "";
      mob.eatingUntilEpochMs = 0;
      return;
    }

    if (this.isMobAttackBusy(mob, now)) {
      mob.vx = 0;
      mob.vy = 0;
      mob.state = "idle";
      return;
    }

    if (mob.aggroPlayerId && now >= mob.aggroUntilEpochMs) {
      mob.aggroPlayerId = "";
      mob.aggroUntilEpochMs = 0;
      mob.hasRetaliatedThisAggro = false;
    }

    const aggroPlayer =
      mob.aggroPlayerId && now < mob.aggroUntilEpochMs
        ? this.state.players.get(mob.aggroPlayerId)
        : null;

    if (mob.aggroMobId && now >= mob.aggroMobUntilEpochMs) {
      mob.aggroMobId = "";
      mob.aggroMobUntilEpochMs = 0;
      mob.hasRetaliatedThisMobAggro = false;
    }

    const aggroMob =
      mob.aggroMobId && now < mob.aggroMobUntilEpochMs
        ? this.runtimeMobEntities.find((entry) => entry.id === mob.aggroMobId) || null
        : null;

    if (aggroPlayer) {
      const playerDistance = this.getDistanceBetweenPoints(
        mob.x,
        mob.y,
        aggroPlayer.x,
        aggroPlayer.y
      );

      if (!mob.hasRetaliatedThisAggro) {
        if (
          playerDistance <= HERBIVORE_ATTACK_RANGE_PX &&
          this.canMobStartAttack(mob, now)
        ) {
          const profile = this.getHerbivoreAttackProfile(mob.tier);
          mob.hasRetaliatedThisAggro = true;
          this.beginMobAttack(mob, "player", mob.aggroPlayerId, profile.windupMs);
          return;
        }

        this.setMobVelocityTowardPoint(mob, aggroPlayer.x, aggroPlayer.y, 1.0);
        mob.thinkAtEpochMs = now + 120;
        return;
      }

      this.setMobVelocityAwayFromPoint(mob, aggroPlayer.x, aggroPlayer.y, 1.15);
      mob.ignorePlantsUntilTravelPx = 20 * TILE_SIZE;
      mob.travelDistancePx = 0;
      mob.travelTargetDistancePx = 20 * TILE_SIZE;
      mob.state = "move";
      mob.facing = mob.vx < 0 ? "left" : "right";
    } else {
      if (now >= mob.nextDeathRollAtEpochMs) {
        if (Math.random() < HERBIVORE_DEATH_ROLL_CHANCE) {
          this.handleHerbivoreDeath(mob);
          return;
        }

        mob.nextDeathRollAtEpochMs += HERBIVORE_DEATH_ROLL_INTERVAL_MS;
      }

      const threat = this.getNearestThreatForHerbivore(mob);
      if (threat) {
        this.setMobVelocityAwayFromPoint(mob, threat.x, threat.y, 1.15);
        mob.ignorePlantsUntilTravelPx = 20 * TILE_SIZE;
        mob.travelDistancePx = 0;
        mob.travelTargetDistancePx = 20 * TILE_SIZE;
        mob.state = "move";
        mob.facing = mob.vx < 0 ? "left" : "right";
      } else if (mob.eatingNodeId && mob.eatingUntilEpochMs && mob.eatingUntilEpochMs > now) {
        mob.vx = 0;
        mob.vy = 0;
        mob.state = "idle";
      } else if (mob.eatingNodeId && mob.eatingUntilEpochMs && now >= mob.eatingUntilEpochMs) {
        const node = this.runtimeCollectableNodes.find((entry) => entry.id === mob.eatingNodeId);

        if (node && node.kind === "plant" && node.state === "being_eaten") {
          this.hidePlantNode(node);
          mob.plantCounter += 1;

          if (mob.plantCounter >= 3) {
            mob.plantCounter -= 3;
            this.spawnHerbivoreOffspring(mob);
          }

          this.broadcastRuntimeCollectableSnapshot(true);
        }

        mob.eatingNodeId = "";
        mob.eatingUntilEpochMs = 0;
        mob.vx = 0;
        mob.vy = 0;
        mob.state = "idle";
        mob.thinkAtEpochMs = now + 300;
      } else {
        const canSeekPlants = mob.ignorePlantsUntilTravelPx <= 0;
        const plant = canSeekPlants ? this.getNearestPlantForHerbivore(mob) : null;

        if (plant && !this.shouldAvoidFoodTarget(mob, plant.id, now)) {
          const shouldAbandon = this.trackFoodTargetVicinity(
            mob,
            plant.id,
            plant.distance,
            now,
            true
          );

          if (shouldAbandon) {
            mob.ignorePlantsUntilTravelPx = 20 * TILE_SIZE;
          } else if (plant.distance <= 8) {
            const liveNode = this.runtimeCollectableNodes.find((entry) => entry.id === plant.id);

            if (liveNode && liveNode.state === "idle") {
              liveNode.state = "being_eaten";
              mob.eatingNodeId = liveNode.id;
              mob.eatingUntilEpochMs = now + HERBIVORE_EAT_PLANT_MS;
              mob.vx = 0;
              mob.vy = 0;
              mob.state = "idle";
              this.broadcastRuntimeCollectableSnapshot(true);
            }
          } else {
            this.setMobVelocityTowardPoint(mob, plant.worldX, plant.worldY, 1.0);
          }
        } else {
          mob.foodVicinityTargetId = "";
          mob.foodVicinityStartedAtEpochMs = 0;

          if (mob.travelMode === "idle") {
            mob.vx = 0;
            mob.vy = 0;
            mob.state = "idle";

            if (now >= mob.idleUntilEpochMs) {
              this.chooseHerbivoreTravelBehavior(mob, now);
            }
          } else if (mob.travelDistancePx >= mob.travelTargetDistancePx) {
            this.chooseHerbivoreTravelBehavior(mob, now);
          } else if (Math.abs(mob.vx) < 0.01 && Math.abs(mob.vy) < 0.01) {
            this.chooseHerbivoreTravelBehavior(mob, now);
          }
        }
      }
    }

    let nextX = mob.x + mob.vx * dt;
    let nextY = mob.y + mob.vy * dt;

    const bounds = this.getRoomWorldBounds();
    nextX = Math.max(bounds.minX, Math.min(bounds.maxX - 1, nextX));
    nextY = Math.max(bounds.minY, Math.min(bounds.maxY - 1, nextY));

    const canMoveX = !this.isCollisionTileAtWorldPosition(nextX, mob.y);
    const canMoveY = !this.isCollisionTileAtWorldPosition(mob.x, nextY);
    const canMoveXY = !this.isCollisionTileAtWorldPosition(nextX, nextY);

    const previousX = mob.x;
    const previousY = mob.y;

    if (canMoveXY) {
      mob.x = nextX;
      mob.y = nextY;
    } else {
      if (canMoveX) mob.x = nextX;
      if (canMoveY) mob.y = nextY;

      this.reverseHerbivoreTravelDirection(mob, now, {
        flee: false,
        bumpIdleMs: 500
      });

      const edgeBias = this.getHerbivoreVerticalEdgeBias(mob);

      if (edgeBias.nearTop) {
        mob.travelMode = "diag_down";
      } else if (edgeBias.nearBottom) {
        mob.travelMode = "diag_up";
      } else {
        mob.travelMode = "straight";
      }
    }

    const movedDistance = this.getDistanceBetweenPoints(
      previousX,
      previousY,
      mob.x,
      mob.y
    );

    mob.travelDistancePx += movedDistance;

    if (mob.ignorePlantsUntilTravelPx > 0) {
      mob.ignorePlantsUntilTravelPx = Math.max(
        0,
        mob.ignorePlantsUntilTravelPx - movedDistance
      );
    }

    if (Math.abs(mob.vx) < 0.01 && Math.abs(mob.vy) < 0.01 && !mob.eatingNodeId) {
      if (aggroPlayer && mob.hasRetaliatedThisAggro) {
        this.setMobVelocityAwayFromPoint(mob, aggroPlayer.x, aggroPlayer.y, 1.15);
      } else if (aggroMob && mob.hasRetaliatedThisMobAggro) {
        this.setMobVelocityAwayFromPoint(mob, aggroMob.x, aggroMob.y, 1.15);
      } else {
        const threat = this.getNearestThreatForHerbivore(mob);
        if (threat) {
          this.setMobVelocityAwayFromPoint(mob, threat.x, threat.y, 1.15);
        } else if (mob.travelMode === "idle" && now < mob.idleUntilEpochMs) {
          mob.state = "idle";
        } else {
          this.chooseHerbivoreTravelBehavior(mob, now);
        }
      }
    }
  }

    applyEcosystemEnergyDrain(mob: RuntimeMobEntity, dt: number) {
    if (mob.state === "eat") return;

    mob.esm = Math.max(0, mob.esm - ECOSYSTEM_ESM_DRAIN_PER_SECOND * dt);

    if (mob.esm <= mob.eatThreshold) {
      mob.state = "hunt";
      mob.nextDecisionAt = Date.now() + this.getEcosystemScaledDelay(300);
    }
  }

    applyEcosystemEating(mob: RuntimeMobEntity, target: RuntimeMobEntity, dt: number) {
    const esmGain = dt / (ECOSYSTEM_EAT_TRANSFER_INTERVAL_MS / 1000);
    const available = Math.max(0, target.esm);
    const capacity = Math.max(0, mob.maxEsm - mob.esm);
    const transfer = Math.min(esmGain, available, capacity);

    mob.esm = Math.min(mob.maxEsm, mob.esm + transfer);
    target.esm = Math.max(0, target.esm - transfer);

    mob.vx = 0;
    mob.vy = 0;
    mob.state = "eat";
    mob.targetId = target.id;

    target.vx = 0;
    target.vy = 0;
    target.state = "eat";
    target.targetId = mob.id;

    if (target.esm <= 0) {
      this.consumeMobFoodTarget(target);
      mob.targetId = "";
      mob.state = "idle";
      mob.nextDecisionAt = Date.now() + this.getEcosystemScaledDelay(300);
      return;
    }

    if (mob.esm >= mob.maxEsm) {
      mob.targetId = "";
      mob.state = "idle";
      mob.nextDecisionAt = Date.now() + this.getEcosystemScaledDelay(mob.decisionIntervalMs);
    }
  }

    updateEcosystemMob(mob: RuntimeMobEntity, dt: number, now: number) {
    this.applyEcosystemEnergyDrain(mob, dt);

    if (mob.state === "idle") {
      mob.vx = 0;
      mob.vy = 0;
      return;
    }

    if (mob.state === "wander") {
      if (now >= mob.thinkAtEpochMs || Math.abs(mob.vx) < 0.01 && Math.abs(mob.vy) < 0.01) {
        const target = this.getSafeOffsetSpawnPosition(
          mob.x,
          mob.y,
          ECOSYSTEM_WANDER_MIN_TILES,
          ECOSYSTEM_WANDER_MAX_TILES
        );

        this.setMobVelocityTowardPoint(mob, target.x, target.y, 0.45);
        mob.thinkAtEpochMs =
          now +
          Math.floor(
            this.getEcosystemScaledDelay(
              this.getRandomRange(
                ECOSYSTEM_WANDER_THINK_MIN_MS,
                ECOSYSTEM_WANDER_THINK_MAX_MS
              )
            )
          );
      }

      return;
    }

    if (mob.state === "hunt") {
      const existingTarget =
        mob.targetId
          ? this.runtimeMobEntities.find((entry) => entry.id === mob.targetId) || null
          : null;

      const target =
        existingTarget &&
        FOOD_WEB_TARGETS[mob.speciesKey]?.includes(existingTarget.speciesKey)
          ? {
              ...existingTarget,
              distance: this.getDistanceBetweenPoints(
                mob.x,
                mob.y,
                existingTarget.x,
                existingTarget.y
              )
            }
          : this.getNearestFoodTargetForMob(mob);

      if (target) {
        mob.targetId = target.id;

        if (target.distance <= ECOSYSTEM_EAT_RANGE_PX) {
          this.applyEcosystemEating(mob, target, dt);
          return;
        }

        this.setMobVelocityTowardPoint(mob, target.x, target.y, 0.9);
        return;
      }

      mob.targetId = "";

      if (now >= mob.thinkAtEpochMs || Math.abs(mob.vx) < 0.01 && Math.abs(mob.vy) < 0.01) {
        const wanderTarget = this.getSafeOffsetSpawnPosition(
          mob.x,
          mob.y,
          ECOSYSTEM_WANDER_MIN_TILES,
          ECOSYSTEM_WANDER_MAX_TILES
        );

        this.setMobVelocityTowardPoint(mob, wanderTarget.x, wanderTarget.y, 0.55);
        mob.thinkAtEpochMs =
          now +
          Math.floor(
            this.getEcosystemScaledDelay(
              this.getRandomRange(
                ECOSYSTEM_WANDER_THINK_MIN_MS,
                ECOSYSTEM_WANDER_THINK_MAX_MS
              )
            )
          );
      }

      return;
    }

    if (mob.state === "eat") {
      const target = this.runtimeMobEntities.find((entry) => entry.id === mob.targetId);

      if (!target) {
        mob.targetId = "";
        mob.state = "idle";
        mob.nextDecisionAt = now + this.getEcosystemScaledDelay(300);
        return;
      }

      const mobCanEatTarget = FOOD_WEB_TARGETS[mob.speciesKey]?.includes(target.speciesKey);

      if (!mobCanEatTarget) {
        // This mob is the resource being eaten. Hold still until the consumer finishes.
        mob.vx = 0;
        mob.vy = 0;
        return;
      }

      const distance = this.getDistanceBetweenPoints(mob.x, mob.y, target.x, target.y);

      if (distance > ECOSYSTEM_EAT_RANGE_PX * 1.5) {
        mob.state = "hunt";
        target.state = "idle";
        target.targetId = "";
        return;
      }

      this.applyEcosystemEating(mob, target, dt);
      return;
    }

    if (mob.state === "reproduce") {
      mob.vx = 0;
      mob.vy = 0;
      return;
    }
  }

  updateRuntimeMobs(deltaTime: number) {
    const dt = (deltaTime * this.ecosystemTimeScale) / 1000;
    const now = Date.now();

    this.runtimeMobEntities = this.runtimeMobEntities.filter((mob) => {
      if (!mob.incapacitated) return true;
      const incapacitatedAt = mob.incapacitatedAtEpochMs || now;
      return now - incapacitatedAt < INCAPACITATED_MOB_DESPAWN_MS;
    });

    const currentMobs = [...this.runtimeMobEntities];

    currentMobs.forEach((mob) => {
      if (!this.runtimeMobEntities.find((entry) => entry.id === mob.id)) {
        return;
      }

      if (mob.incapacitated) {
        mob.vx = 0;
        mob.vy = 0;
        mob.state = "idle";
        mob.targetId = "";
        mob.eatingNodeId = "";
        mob.eatingUntilEpochMs = 0;
        mob.aggroPlayerId = "";
        mob.aggroUntilEpochMs = 0;
        mob.aggroMobId = "";
        mob.aggroMobUntilEpochMs = 0;
        return;
      }

      const isBeingEaten =
        mob.state === "eat" &&
        !!mob.targetId &&
        !!this.runtimeMobEntities.find((entry) => entry.id === mob.targetId);

      if (!isBeingEaten && now >= mob.nextDecisionAt) {
        if (mob.esm <= mob.eatThreshold) {
          mob.state = "hunt";
        } else {
          mob.state = Math.random() < 0.5 ? "idle" : "wander";
        }

        mob.nextDecisionAt = now + this.getEcosystemScaledDelay(mob.decisionIntervalMs);
      }

      this.updateEcosystemMob(mob, dt, now);

      let nextX = mob.x + mob.vx * dt;
      let nextY = mob.y + mob.vy * dt;

      const bounds = this.getRoomWorldBounds();
      nextX = Math.max(bounds.minX, Math.min(bounds.maxX - 1, nextX));
      nextY = Math.max(bounds.minY, Math.min(bounds.maxY - 1, nextY));

      const canMoveX = !this.isCollisionTileAtWorldPosition(nextX, mob.y);
      const canMoveY = !this.isCollisionTileAtWorldPosition(mob.x, nextY);
      const canMoveXY = !this.isCollisionTileAtWorldPosition(nextX, nextY);

      if (canMoveXY) {
        mob.x = nextX;
        mob.y = nextY;
      } else {
        if (canMoveX) mob.x = nextX;
        if (canMoveY) mob.y = nextY;

        mob.vx *= -1;
        mob.vy *= -1;
        mob.facing = mob.vx < 0 ? "left" : "right";
        mob.thinkAtEpochMs = now + 500;
      }

      if (Math.abs(mob.vx) < 0.01 && Math.abs(mob.vy) < 0.01) {
        mob.vx = 0;
        mob.vy = 0;
      }
    });

    this.broadcastRuntimeMobSnapshot();
  }

  broadcastRuntimeMobSnapshot(force = false) {
    const now = Date.now();

    if (!force && now - this.lastMobSnapshotBroadcastAt < 120) {
      return;
    }

    this.lastMobSnapshotBroadcastAt = now;

    const payload = {
  mapKey: this.currentMapKey,
  mobs: this.runtimeMobEntities.map((mob) => ({
    id: mob.id,
    anchorFrame: mob.anchorFrame,
    kind: mob.kind,
    tier: mob.tier,
    x: mob.x,
    y: mob.y,
    facing: mob.facing,
    state: mob.state,
    stamina: mob.stamina,
    maxStamina: mob.maxStamina,
    incapacitated: mob.incapacitated,
    plantCounter: mob.plantCounter || 0,
    esm: mob.esm,
    maxEsm: mob.maxEsm,
    eatThreshold: mob.eatThreshold,
    ecosystemState: mob.state,
    targetId: mob.targetId,
    speciesKey: mob.speciesKey,
  }))
};

    this.broadcast("mob_runtime_snapshot", payload);
  }

    /*
  OBJECT LAYER SCAN HELPERS
  -------------------------
  Purpose:
  Builds simple runtime lists for collectable anchors and mob spawn anchors
  from the painted object layer.

  Includes:
  - collectable node scan
  - mob spawn anchor scan
  - shared rebuild helper
  */

  rebuildRuntimeObjectEntities() {
    this.runtimeCollectableNodes = [];
    this.runtimeResourceSpawnSlots = [];
    this.runtimeMobSpawnAnchors = [];
    const manualResourceNodes: RuntimeCollectableNode[] = [];
    const registeredSlotKeys = new Set<string>();

    if (!this.currentRoomLayout?.objects) return;

    for (let row = 0; row < this.currentRoomLayout.objects.length; row++) {
      for (let col = 0; col < this.currentRoomLayout.objects[row].length; col++) {
        const frameIndex = this.currentRoomLayout.objects[row][col];

        if (!Number.isInteger(frameIndex)) continue;
        const slotKind = RESOURCE_SLOT_KIND_BY_FRAME.get(frameIndex);
        if (slotKind) {
          const slotKey = `${slotKind}:${col}:${row}`;
          if (registeredSlotKeys.has(slotKey)) continue;
          registeredSlotKeys.add(slotKey);
          this.runtimeResourceSpawnSlots.push({
            id: `${this.currentMapKey}:resource-slot:${slotKind}:${col}:${row}`,
            mapKey: this.currentMapKey,
            kind: slotKind,
            tileX: col,
            tileY: row
          });
          continue;
        }
        if (frameIndex < 0) continue;
        if (isSpawnMarkerFrame(frameIndex)) continue;
        if (isPortalFrame(frameIndex)) continue;

        if (isResourceObjectFrame(frameIndex)) {
          const kind = getResourceKindForFrame(frameIndex);
          const tier = getObjectTierForFrame(frameIndex);

          if (kind) {
            const node: RuntimeCollectableNode = {
              id: `${this.currentMapKey}:resource:${col}:${row}`,
              mapKey: this.currentMapKey,
              anchorTileX: col,
              anchorTileY: row,
              anchorFrame: frameIndex,
              kind,
              tier,
              state: kind === "plant" ? "idle" : "ready",
              growthStage: 5,
              worldX: undefined,
              worldY: undefined,
              growthStartedAtEpochMs: 0,
              growthEndsAtEpochMs: 0,
              requiresAnimalDeathToRespawn: kind === "plant",
              pendingRespawnFromAnimalDeath: false
            };

            manualResourceNodes.push(node);
          }

          continue;
        }

        if (isMobObjectFrame(frameIndex)) {
          const kind = getMobKindForFrame(frameIndex);
          const tier = getObjectTierForFrame(frameIndex);

          if (kind) {
            this.runtimeMobSpawnAnchors.push({
              id: `${this.currentMapKey}:mob:${col}:${row}`,
              mapKey: this.currentMapKey,
              anchorTileX: col,
              anchorTileY: row,
              anchorFrame: frameIndex,
              kind,
              tier,
              spawnRadiusTiles:
                kind === "herbivore" ||
                kind === "carnivore" ||
                kind === "apex_predator"
                  ? Math.max(this.getRoomTileWidth(), this.getRoomTileHeight())
                  : 4,
              maxAlive: kind === "apex_predator" ? 1 : kind === "carnivore" ? 2 : 3
            });
          }
        }
      }
    }

    // Metadata resource/communication tiles are permanent spawn locations.
    // They never grant items directly; live nodes are distributed across them.
    for (let row = 0; row < this.getRoomTileHeight(); row += 1) {
      for (let col = 0; col < this.getRoomTileWidth(); col += 1) {
        const detailFrame = this.currentRoomLayout.detail?.[row]?.[col];
        const baseFrame = this.currentRoomLayout.base?.[row]?.[col];
        const metadata = [detailFrame, baseFrame]
          .filter((frameIndex) => Number.isInteger(frameIndex) && Number(frameIndex) >= 0)
          .map((frameIndex) => this.getFrameMetadata(Number(frameIndex)))
          .find((entry) => !!getSpawnKindForActionCenter(entry?.action_center || null));
        const slotKind = getSpawnKindForActionCenter(metadata?.action_center || null);
        if (!slotKind) continue;

        const slotKey = `${slotKind}:${col}:${row}`;
        if (registeredSlotKeys.has(slotKey)) continue;
        registeredSlotKeys.add(slotKey);
        this.runtimeResourceSpawnSlots.push({
          id: `${this.currentMapKey}:resource-slot:${slotKind}:${col}:${row}`,
          mapKey: this.currentMapKey,
          kind: slotKind,
          tileX: col,
          tileY: row
        });
      }
    }

    this.runtimeCollectableNodes = this.runtimeResourceSpawnSlots.length
      ? this.createProceduralResourcePopulation()
      : manualResourceNodes;

    console.log("RUNTIME OBJECT ENTITY REBUILD:", {
      mapKey: this.currentMapKey,
      collectableCount: this.runtimeCollectableNodes.length,
      resourceSlotCount: this.runtimeResourceSpawnSlots.length,
      mobAnchorCount: this.runtimeMobSpawnAnchors.length
    });
  }

  getResourceSpawnOriginTile() {
    return this.findSpawnMarkerTile() || {
      tileX: Math.floor(this.getRoomTileWidth() / 2),
      tileY: Math.floor(this.getRoomTileHeight() / 2)
    };
  }

  getNormalizedResourceSlotDistance(slot: RuntimeResourceSpawnSlot) {
    const origin = this.getResourceSpawnOriginTile();
    const corners = [
      { tileX: 0, tileY: 0 },
      { tileX: this.getRoomTileWidth() - 1, tileY: 0 },
      { tileX: 0, tileY: this.getRoomTileHeight() - 1 },
      { tileX: this.getRoomTileWidth() - 1, tileY: this.getRoomTileHeight() - 1 }
    ];
    const maxDistance = Math.max(
      1,
      ...corners.map((corner) => Math.hypot(
        corner.tileX - origin.tileX,
        corner.tileY - origin.tileY
      ))
    );
    return Math.hypot(slot.tileX - origin.tileX, slot.tileY - origin.tileY) / maxDistance;
  }

  isResourceSlotInTierBand(slot: RuntimeResourceSpawnSlot, tier: number) {
    const distance = this.getNormalizedResourceSlotDistance(slot);
    if (tier <= 1) return distance <= 0.52;
    if (tier === 2) return distance >= 0.28 && distance <= 0.8;
    return distance >= 0.62;
  }

  chooseResourceSpawnSlot(
    kind: ResourceKind,
    tier: number,
    occupiedSlotIds: Set<string>
  ) {
    const available = this.runtimeResourceSpawnSlots.filter(
      (slot) => slot.kind === kind && !occupiedSlotIds.has(slot.id)
    );
    const preferred = kind === "communication"
      ? available
      : available.filter((slot) => this.isResourceSlotInTierBand(slot, tier));
    const candidates = preferred.length ? preferred : available;
    if (!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  createProceduralResourcePopulation() {
    const nodes: RuntimeCollectableNode[] = [];
    const occupiedSlotIds = new Set<string>();

    RESOURCE_POPULATION_PROFILES.forEach((profile) => {
      for (let index = 0; index < profile.count; index += 1) {
        const slot = this.chooseResourceSpawnSlot(
          profile.kind,
          profile.tier,
          occupiedSlotIds
        );
        if (!slot) break;
        occupiedSlotIds.add(slot.id);
        const node: RuntimeCollectableNode = {
          id: `${this.currentMapKey}:resource:${profile.variant}:${index}`,
          mapKey: this.currentMapKey,
          anchorTileX: slot.tileX,
          anchorTileY: slot.tileY,
          anchorFrame: profile.anchorFrame,
          kind: profile.kind,
          tier: profile.tier,
          state: profile.kind === "plant" ? "idle" : "ready",
          growthStage: 5,
          growthStartedAtEpochMs: 0,
          growthEndsAtEpochMs: 0,
          requiresAnimalDeathToRespawn: false,
          pendingRespawnFromAnimalDeath: false,
          spawnSlotId: slot.id
        };
        nodes.push(node);
      }
    });

    const communicationSlot = this.chooseResourceSpawnSlot(
      "communication",
      1,
      occupiedSlotIds
    );
    if (communicationSlot) {
      occupiedSlotIds.add(communicationSlot.id);
      nodes.push({
        id: `${this.currentMapKey}:communication:0`,
        mapKey: this.currentMapKey,
        anchorTileX: communicationSlot.tileX,
        anchorTileY: communicationSlot.tileY,
        anchorFrame: COMMUNICATION_NODE_ANCHOR_FRAME,
        kind: "communication",
        tier: 1,
        state: "ready",
        growthStage: 5,
        growthStartedAtEpochMs: 0,
        growthEndsAtEpochMs: 0,
        requiresAnimalDeathToRespawn: false,
        pendingRespawnFromAnimalDeath: false,
        spawnSlotId: communicationSlot.id
      });
    }

    return nodes;
  }

    /*
  RUNTIME COLLECTABLE HELPERS
  ---------------------------
  Purpose:
  Simulate collectable nodes, handle regrowth timing, and resolve nearby
  collectable interactions.

  Includes:
  - collectable world position lookup
  - action mapping by node kind
  - nearest node lookup
  - regrowth progression
  - snapshot broadcasts
  */

  getCollectableWorldPosition(node: RuntimeCollectableNode) {
    if (
      typeof node.worldX === "number" &&
      typeof node.worldY === "number"
    ) {
      return {
        x: node.worldX,
        y: node.worldY
      };
    }

    return this.tileToWorldPosition(node.anchorTileX, node.anchorTileY);
  }

    /*
  PLANT INSTANCE HELPERS
  ----------------------
  Purpose:
  Spawn and manage live plant instances inside the 128x128 area around a plant
  anchor marker.

  Rules:
  - anchor marker is permanent
  - live plant appears somewhere inside the 128x128 area
  - plant grows through 6 growth stages
  - after full growth, plant enters idle state
  - plant stays hidden until an animal death occurs in its area
  */

  getPlantAnchorAreaBounds(node: RuntimeCollectableNode) {
    const anchorWorld = this.tileToWorldPosition(node.anchorTileX, node.anchorTileY);
    const half = PLANT_RESPAWN_AREA_SIZE_PX / 2;

    return {
      minX: anchorWorld.x - half,
      maxX: anchorWorld.x + half,
      minY: anchorWorld.y - half,
      maxY: anchorWorld.y + half
    };
  }

  startPlantGrowthCycle(node: RuntimeCollectableNode) {
    const now = Date.now();

    node.worldX = undefined;
    node.worldY = undefined;
    node.state = "growing";
    node.growthStage = 0;
    node.growthStartedAtEpochMs = now;
    node.growthEndsAtEpochMs = now + PLANT_GROWTH_STAGE_COUNT * PLANT_GROWTH_STAGE_MS;
    node.requiresAnimalDeathToRespawn = false;
    node.pendingRespawnFromAnimalDeath = false;
  }

  relocateCollectableNode(node: RuntimeCollectableNode) {
    if (!this.runtimeResourceSpawnSlots.length) return false;
    const occupiedSlotIds = new Set(
      this.runtimeCollectableNodes
        .filter((entry) => entry.id !== node.id && !!entry.spawnSlotId)
        .map((entry) => entry.spawnSlotId as string)
    );
    if (node.spawnSlotId) occupiedSlotIds.add(node.spawnSlotId);
    const slot = this.chooseResourceSpawnSlot(node.kind, node.tier, occupiedSlotIds);
    if (!slot) return false;

    node.spawnSlotId = slot.id;
    node.anchorTileX = slot.tileX;
    node.anchorTileY = slot.tileY;
    node.worldX = undefined;
    node.worldY = undefined;
    return true;
  }

  hidePlantNode(node: RuntimeCollectableNode) {
    this.scheduleCollectableRespawn(node);
  }

  scheduleCollectableRespawn(node: RuntimeCollectableNode) {
    const now = Date.now();
    this.relocateCollectableNode(node);
    node.state = "hidden";
    node.growthStage = 0;
    node.growthStartedAtEpochMs = now;
    node.growthEndsAtEpochMs = now + COLLECTABLE_NODE_RESPAWN_MS;
    node.requiresAnimalDeathToRespawn = false;
    node.pendingRespawnFromAnimalDeath = false;
  }

  consumeCollectedNode(node: RuntimeCollectableNode) {
    if (node.oneShot) {
      this.runtimeCollectableNodes = this.runtimeCollectableNodes.filter(
        (entry) => entry.id !== node.id
      );
      this.alienArtifactAftermathNodes = this.alienArtifactAftermathNodes.filter(
        (entry) => entry.id !== node.id
      );
      return;
    }
    if (node.kind === "plant") this.hidePlantNode(node);
    else this.scheduleCollectableRespawn(node);
  }

  tryRespawnPlantsFromAnimalDeath(worldX: number, worldY: number) {
    this.runtimeCollectableNodes.forEach((node) => {
      if (node.kind !== "plant") return;
      if (!node.pendingRespawnFromAnimalDeath || node.state !== "hidden") return;

      const bounds = this.getPlantAnchorAreaBounds(node);
      const insideX = worldX >= bounds.minX && worldX <= bounds.maxX;
      const insideY = worldY >= bounds.minY && worldY <= bounds.maxY;

      if (!insideX || !insideY) return;

      this.startPlantGrowthCycle(node);
    });

    this.broadcastRuntimeCollectableSnapshot(true);
  }

  /*
  ANIMAL DEATH RESPAWN HOOK
  -------------------------
  Purpose:
  Public helper that later mob death logic can call to wake plants in the
  correct area.
  */

  markAnimalDeathAtWorldPosition(worldX: number, worldY: number) {
    this.tryRespawnPlantsFromAnimalDeath(worldX, worldY);
  }

  getCollectableActionForKind(kind: ResourceKind): CollectableActionName {
    if (kind === "rock") return "mine";
    if (kind === "pond") return "fish";
    if (kind === "communication") return "comm";
    return "dig";
  }

  getCollectableRespawnMs(_node: RuntimeCollectableNode) {
    return COLLECTABLE_NODE_RESPAWN_MS;
  }

    /*
  NEAREST MOB TARGET HELPER
  -------------------------
  Purpose:
  Finds the nearest live herbivore that can be targeted by the taser.

  Rules:
  - only herbivores
  - must not already be incapacitated
  - must be within 5 tiles
  */

  getNearestTaserTargetForPlayer(player: Player) {
    let best: (RuntimeMobEntity & { worldDistance: number }) | null = null;

    this.runtimeMobEntities.forEach((mob) => {
      const isTargetable =
        mob.kind === "herbivore" ||
        mob.kind === "carnivore" ||
        mob.kind === "apex_predator";

      if (!isTargetable) return;
      if (mob.incapacitated) return;

      const worldDistance = this.getDistanceBetweenPoints(
        player.x,
        player.y,
        mob.x,
        mob.y
      );

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
  NEAREST INCAPACITATED HERBIVORE HELPER
  -------------------------------------
  Purpose:
  Finds the nearest incapacitated mob that can be collected.

  Rules:
  - must already be incapacitated
  - must be within 3 tiles
  */

  getNearestIncapacitatedHerbivoreForPlayer(player: Player) {
    let best: (RuntimeMobEntity & { worldDistance: number }) | null = null;

    this.runtimeMobEntities.forEach((mob) => {
      if (!mob.incapacitated) return;

      const worldDistance = this.getDistanceBetweenPoints(
        player.x,
        player.y,
        mob.x,
        mob.y
      );

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

  getNearestCollectableNodeForPlayer(player: Player) {
    let best: (RuntimeCollectableNode & {
      worldX: number;
      worldY: number;
      worldDistance: number;
      action: CollectableActionName;
    }) | null = null;

    this.runtimeCollectableNodes.forEach((node) => {
      const isAvailable =
        node.kind === "plant"
          ? node.state === "idle"
          : node.state === "ready";

      if (!isAvailable) return;

      const world = this.getCollectableWorldPosition(node);
      const dx = world.x - player.x;
      const dy = world.y - player.y;
      const worldDistance = Math.sqrt(dx * dx + dy * dy);

      if (worldDistance > TILE_SIZE * 3) return;

      if (!best || worldDistance < best.worldDistance) {
        best = {
          ...node,
          worldX: world.x,
          worldY: world.y,
          worldDistance,
          action: this.getCollectableActionForKind(node.kind)
        };
      }
    });

    return best;
  }

  updateRuntimeCollectableNodes() {
    const now = Date.now();

    this.runtimeCollectableNodes.forEach((node) => {
      if (node.state === "hidden") {
        if (now >= (node.growthEndsAtEpochMs || 0)) {
          node.state = node.kind === "plant" ? "idle" : "ready";
          node.growthStage = 5;
          node.growthStartedAtEpochMs = 0;
          node.growthEndsAtEpochMs = 0;
        }
        return;
      }

      if (node.kind === "plant") {
        if (node.state !== "growing") return;

        const startedAt = node.growthStartedAtEpochMs || now;
        const elapsedMs = Math.max(0, now - startedAt);
        const stageIndex = Math.min(
          PLANT_GROWTH_STAGE_COUNT - 1,
          Math.floor(elapsedMs / PLANT_GROWTH_STAGE_MS)
        );

        node.growthStage = stageIndex;

        if (stageIndex >= PLANT_GROWTH_STAGE_COUNT - 1) {
          node.state = "idle";
          node.growthStage = PLANT_GROWTH_STAGE_COUNT - 1;
          node.growthEndsAtEpochMs = 0;
        }

        return;
      }

      if (node.state !== "growing") return;

      const growthEndsAt = node.growthEndsAtEpochMs || 0;
      const totalMs = this.getCollectableRespawnMs(node);

      if (growthEndsAt > 0) {
        const remainingMs = Math.max(0, growthEndsAt - now);
        const progress = 1 - remainingMs / totalMs;
        node.growthStage = Math.max(0, Math.min(5, Math.floor(progress * 6)));

        if (now >= growthEndsAt) {
          node.state = "ready";
          node.growthStage = 5;
          node.growthEndsAtEpochMs = 0;
        }
      }
    });
  }

    getRuntimeCollectableSnapshot(): RuntimeCollectableSnapshot[] {
    return this.runtimeCollectableNodes
      .filter((node) => node.state !== "hidden")
      .map((node) => {
        const world = this.getCollectableWorldPosition(node);

        return {
          id: node.id,
          anchorFrame: node.anchorFrame,
          kind: node.kind,
          tier: node.tier,
          x: world.x,
          y: world.y,
          state: node.state,
          growthStage: node.growthStage
        };
      });
  }

  broadcastRuntimeCollectableSnapshot(force = false) {
    const now = Date.now();

    if (!force && now - this.lastCollectableSnapshotBroadcastAt < 150) {
      return;
    }

    this.lastCollectableSnapshotBroadcastAt = now;

    this.broadcast("collectable_runtime_snapshot", {
      mapKey: this.currentMapKey,
      nodes: this.getRuntimeCollectableSnapshot()
    });
  }

  async handleSummonAlienArtifact(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    if (this.activeAlienArtifact || this.alienArtifactSummonPending) {
      client.send("interaction_result", {
        success: false,
        message: "An alien artifact event is already active in this area."
      });
      return;
    }

    const ownedArtifacts = Math.max(0, player.inventory.get(ALIEN_ARTIFACT_ITEM_ID) || 0);
    if (ownedArtifacts < ALIEN_ARTIFACT_SUMMON_COST) {
      client.send("interaction_result", {
        success: false,
        message: `You need ${ALIEN_ARTIFACT_SUMMON_COST} alien artifacts to trigger the event.`
      });
      return;
    }

    this.alienArtifactSummonPending = true;
    const spawn = this.findAlienArtifactSpawnPosition();
    try {
      await this.removeInventoryItem(player, ALIEN_ARTIFACT_ITEM_ID, ALIEN_ARTIFACT_SUMMON_COST);
      const summonedAtEpochMs = Date.now();
      this.alienArtifactDamageContributors.clear();
      this.activeAlienArtifact = {
        id: `alien-artifact:${this.currentMapKey}:${summonedAtEpochMs}`,
        mapKey: this.currentMapKey,
        x: spawn.x,
        y: spawn.y,
        durability: ALIEN_ARTIFACT_MAX_DURABILITY,
        maxDurability: ALIEN_ARTIFACT_MAX_DURABILITY,
        summonerUserId: player.userId,
        summonerName: player.name,
        summonedAtEpochMs,
        lastHealAtEpochMs: summonedAtEpochMs
      };
      this.broadcastAlienArtifactSnapshot();
      this.broadcast("alien_artifact_announcement", {
        active: true,
        message: `${player.name} detected a large alien artifact. It has appeared far from the expedition spawn.`
      });
      client.send("interaction_result", {
        success: true,
        message: "Alien event triggered. Follow your artifact compass to the signal."
      });
    } catch (error) {
      console.error("Failed to summon alien artifact:", error);
      client.send("interaction_result", {
        success: false,
        message: "The alien artifact signal could not be established. No artifacts were consumed."
      });
    } finally {
      this.alienArtifactSummonPending = false;
    }
  }

  spawnTierThreeResourcesAroundArtifact(artifact: RuntimeAlienArtifactEvent) {
    const spawned: RuntimeCollectableNode[] = [];
    const kinds: Array<Exclude<ResourceKind, "communication">> = [
      "rock",
      "plant",
      "pond",
      "specimen"
    ];
    const bounds = this.getRoomWorldBounds();
    const occupiedTiles = new Set<string>();
    const rewardRings: Array<{
      quality: ItemQuality;
      copiesPerKind: number;
      minimumRadius: number;
      maximumRadius: number;
    }> = [
      { quality: "legendary", copiesPerKind: 1, minimumRadius: 0.8, maximumRadius: 2.0 },
      { quality: "epic", copiesPerKind: 2, minimumRadius: 2.5, maximumRadius: ALIEN_ARTIFACT_RESOURCE_RADIUS_TILES }
    ];

    kinds.forEach((kind, kindIndex) => {
      const profile = RESOURCE_POPULATION_PROFILES.find(
        (entry) => entry.kind === kind && entry.tier === 3
      );
      const anchorFrame = profile?.anchorFrame ??
        (OBJECT_ROW_LEVEL3_PLANT * OBJECT_SHEET_COLUMNS + OBJECT_SHEET_FIRST_CONTENT_COLUMN);

      rewardRings.forEach((ring, ringIndex) => {
        for (let index = 0; index < ring.copiesPerKind; index += 1) {
        let candidate = {
          x: artifact.x,
          y: artifact.y,
          tileX: Math.max(0, Math.floor((artifact.x - ROOM_OFFSET_X) / TILE_SIZE)),
          tileY: Math.max(0, Math.floor((artifact.y - ROOM_OFFSET_Y) / TILE_SIZE))
        };
        for (let attempt = 0; attempt < 60; attempt += 1) {
          const slotIndex = kindIndex * 2 + index + ringIndex * kinds.length;
          const slotCount = kinds.length * Math.max(1, ring.copiesPerKind);
          const angle = (slotIndex / slotCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.48;
          const radiusTiles = ring.minimumRadius +
            Math.random() * Math.max(0.1, ring.maximumRadius - ring.minimumRadius);
          const x = Math.max(bounds.minX + TILE_SIZE, Math.min(bounds.maxX - TILE_SIZE, artifact.x + Math.cos(angle) * radiusTiles * TILE_SIZE));
          const y = Math.max(bounds.minY + TILE_SIZE, Math.min(bounds.maxY - TILE_SIZE, artifact.y + Math.sin(angle) * radiusTiles * TILE_SIZE));
          const tile = this.worldToTilePosition(x, y);
          if (!tile || this.isCollisionTileAtWorldPosition(x, y)) continue;
          const tileKey = `${tile.tileX}:${tile.tileY}`;
          if (occupiedTiles.has(tileKey)) continue;
          occupiedTiles.add(tileKey);
          candidate = { x, y, ...tile };
          break;
        }

        spawned.push({
          id: `${this.currentMapKey}:artifact-resource:${artifact.summonedAtEpochMs}:${ring.quality}:${kind}:${index}`,
          mapKey: this.currentMapKey,
          anchorTileX: candidate.tileX,
          anchorTileY: candidate.tileY,
          anchorFrame,
          kind,
          tier: 3,
          state: kind === "plant" ? "idle" : "ready",
          growthStage: 5,
          worldX: candidate.x,
          worldY: candidate.y,
          growthStartedAtEpochMs: 0,
          growthEndsAtEpochMs: 0,
          requiresAnimalDeathToRespawn: false,
          pendingRespawnFromAnimalDeath: false,
          guaranteedQuality: ring.quality,
          oneShot: true
        });
      }
      });
    });

    this.alienArtifactAftermathNodes.push(...spawned);
    this.runtimeCollectableNodes.push(...spawned);
    this.broadcastRuntimeCollectableSnapshot(true);
    return spawned.length;
  }

  async awardAlienArtifactDestructionCredit(contributors: Map<string, string>) {
    await Promise.all([...contributors].map(async ([userId, classId]) => {
      const skillItemId = getSkillItemId("astrobiology");
      const structureCountItemId = getAstrobiologyStructureCountItemId();
      const player = [...this.state.players.values()].find((entry) => entry.userId === userId);
      try {
        if (player) {
          const nextXp = this.getProgressionCount(player, skillItemId) +
            ASTROBIOLOGY_STRUCTURE_DESTRUCTION_POINTS;
          const nextStructureCount = this.getProgressionCount(player, structureCountItemId) + 1;
          await this.saveProgressionInventoryChanges(player, new Map([
            [skillItemId, nextXp],
            [structureCountItemId, nextStructureCount]
          ]));
          this.sendProgressionSnapshot(player);
          const contributorClient = this.clients.find((entry) => entry.sessionId === player.id);
          contributorClient?.send("progression_result", {
            success: true,
            message: `Alien structure destroyed: +${ASTROBIOLOGY_STRUCTURE_DESTRUCTION_POINTS} Astrobiology points.`
          });
          return;
        }

        const { data, error } = await supabaseAdmin
          .from("inventories")
          .select("item_id, quantity")
          .eq("user_id", userId)
          .eq("class_id", classId)
          .in("item_id", [skillItemId, structureCountItemId]);
        if (error) throw error;
        const previousByItemId = new Map(
          (data || []).map((row) => [row.item_id, Math.max(0, Math.floor(Number(row.quantity) || 0))])
        );
        const { error: saveError } = await supabaseAdmin.from("inventories").upsert([
          {
            user_id: userId,
            class_id: classId,
            item_id: skillItemId,
            quantity: (previousByItemId.get(skillItemId) || 0) +
              ASTROBIOLOGY_STRUCTURE_DESTRUCTION_POINTS
          },
          {
            user_id: userId,
            class_id: classId,
            item_id: structureCountItemId,
            quantity: (previousByItemId.get(structureCountItemId) || 0) + 1
          }
        ], {
          onConflict: "user_id,class_id,item_id"
        });
        if (saveError) throw saveError;
      } catch (error) {
        console.error("Failed to award alien artifact destruction credit:", error);
      }
    }));
  }

  async handleAlienArtifactCombatInteract(
    client: Client,
    message?: { action?: string; artifactId?: string }
  ) {
    const player = this.state.players.get(client.sessionId);
    const artifact = this.activeAlienArtifact;
    if (!player || !artifact) {
      client.send("interaction_result", { success: false, message: "The alien artifact is no longer active." });
      return;
    }
    if (message?.action !== "taser_artifact" || message?.artifactId !== artifact.id) {
      client.send("interaction_result", { success: false, message: "That alien artifact target is no longer valid." });
      return;
    }

    const taserProfile = this.getPlayerTaserProfile(player);
    if (this.getDistanceBetweenPoints(player.x, player.y, artifact.x, artifact.y) > TILE_SIZE * taserProfile.rangeTiles) {
      client.send("interaction_result", { success: false, message: "The selected artifact is out of range." });
      return;
    }
    if (player.health < taserProfile.energyCost) {
      client.send("interaction_result", {
        success: false,
        message: `Not enough energy. The taser requires ${taserProfile.energyCost} energy.`
      });
      return;
    }

    const now = Date.now();
    const cooldownKey = "action_taser_ready_at";
    const taserWindupMs = 1600;
    const cooldownMs = 1000;
    if ((player.stationCooldowns.get(cooldownKey) || 0) > now) {
      client.send("interaction_result", { success: false, message: "Taser is recharging. Try again soon." });
      return;
    }

    player.stationCooldowns.set(cooldownKey, now + taserWindupMs + cooldownMs);
    player.health = Math.max(0, player.health - taserProfile.energyCost);
    this.startPlayerActionAnimation(player, "taser", artifact.x < player.x ? "left" : "right", taserWindupMs);

    const pulseDelayMs = Math.floor(taserWindupMs / taserProfile.attacks);
    let totalDamage = 0;
    for (let pulseIndex = 0; pulseIndex < taserProfile.attacks; pulseIndex += 1) {
      if (pulseIndex > 0) await new Promise((resolve) => setTimeout(resolve, pulseDelayMs));
      const livePlayer = this.state.players.get(client.sessionId);
      const liveArtifact = this.activeAlienArtifact;
      if (!livePlayer || !liveArtifact || liveArtifact.id !== artifact.id) break;
      if (this.getDistanceBetweenPoints(livePlayer.x, livePlayer.y, liveArtifact.x, liveArtifact.y) > TILE_SIZE * (taserProfile.rangeTiles + 1)) break;

      const pulse = this.rollTaserBurstPulse();
      const damage = pulse.hit
        ? Math.max(1, Math.round(pulse.damage * taserProfile.damageMultiplier))
        : 0;
      if (damage > 0) {
        totalDamage += damage;
        this.alienArtifactDamageContributors.set(livePlayer.userId, livePlayer.classId);
        liveArtifact.durability = Math.max(0, liveArtifact.durability - damage);
      }
      this.broadcast("alien_artifact_damage_popup", {
        mapKey: this.currentMapKey,
        artifactId: liveArtifact.id,
        x: liveArtifact.x,
        y: liveArtifact.y,
        text: damage > 0 ? `${damage}` : "miss",
        kind: damage > 0 ? (pulse.crit ? "crit" : "hit") : "miss"
      });
      this.broadcastAlienArtifactSnapshot();
      if (liveArtifact.durability <= 0) break;
    }

    if (this.activeAlienArtifact?.id === artifact.id && this.activeAlienArtifact.durability <= 0) {
      const destroyedArtifact = this.activeAlienArtifact;
      const destructionContributors = new Map(this.alienArtifactDamageContributors);
      this.activeAlienArtifact = null;
      this.alienArtifactDamageContributors.clear();
      const spawnedCount = this.spawnTierThreeResourcesAroundArtifact(destroyedArtifact);
      this.broadcastAlienArtifactSnapshot();
      this.broadcast("alien_artifact_announcement", {
        active: false,
        message: `The alien artifact was destroyed. ${spawnedCount} tier 3 resource nodes emerged around the site.`
      });
      client.send("interaction_result", {
        success: true,
        message: `Alien artifact destroyed. ${spawnedCount} high-rarity resource nodes appeared nearby.`
      });
      await this.awardAlienArtifactDestructionCredit(destructionContributors);
      return;
    }

    client.send("interaction_result", {
      success: totalDamage > 0,
      message: totalDamage > 0
        ? `Taser burst dealt ${totalDamage} durability damage to the alien artifact.`
        : "The taser burst missed the alien artifact."
    });
  }

    /*
  MOB COMBAT INTERACTION HANDLER
  ------------------------------
  Purpose:
  Starts a taser action against the selected mob, waits for the burst,
  then applies the damage roll if the target is still valid.

  Rules:
  - taser cooldown is 1 second
  - only herbivores can be targeted
  - target must still be nearby and not incapacitated when the shot fires
  */

  async handleMobCombatInteract(
  client: Client,
  message?: {
    action?: string;
    mobId?: string;
  }
) {
  const player = this.state.players.get(client.sessionId);
  if (!player) return;

  if (message?.action !== "taser") {
    client.send("interaction_result", {
      success: false,
      message: "Unknown mob action."
    });
    return;
  }

  const taserProfile = this.getPlayerTaserProfile(player);
  const nearbyMob = this.runtimeMobEntities.find((mob) => {
    if (mob.id !== message?.mobId) return false;
    if (mob.incapacitated) return false;
    if (mob.kind !== "herbivore" && mob.kind !== "carnivore" && mob.kind !== "apex_predator") {
      return false;
    }

    const distance = this.getDistanceBetweenPoints(player.x, player.y, mob.x, mob.y);
    return distance <= TILE_SIZE * taserProfile.rangeTiles;
  });

  if (!nearbyMob) {
    client.send("interaction_result", {
      success: false,
      message: "The selected target is out of range."
    });
    return;
  }

  if (player.health < taserProfile.energyCost) {
    client.send("interaction_result", {
      success: false,
      message: `Not enough energy. The taser requires ${taserProfile.energyCost} energy.`
    });
    return;
  }

  const now = Date.now();
  const cooldownKey = "action_taser_ready_at";
  const cooldownMs = 1000;
  const taserWindupMs = 1600;

  const readyAt = player.stationCooldowns.get(cooldownKey) || 0;
  const cooldownRemaining = readyAt - now;

  if (cooldownRemaining > 0) {
    client.send("interaction_result", {
      success: false,
      message: "Taser is recharging. Try again soon."
    });
    return;
  }

  const actionDirection = nearbyMob.x < player.x ? "left" : "right";

  // Cooldown begins AFTER the full 1.6s burst finishes
  player.stationCooldowns.set(cooldownKey, now + taserWindupMs + cooldownMs);
  player.health = Math.max(0, player.health - taserProfile.energyCost);
  this.startPlayerActionAnimation(player, "taser", actionDirection, taserWindupMs);

  const pulseDelayMs = Math.floor(taserWindupMs / taserProfile.attacks);
  let totalDamage = 0;
  let hitCount = 0;
  let critCount = 0;
  let missCount = 0;

  for (let pulseIndex = 0; pulseIndex < taserProfile.attacks; pulseIndex++) {
    if (pulseIndex > 0) {
      await new Promise((resolve) => setTimeout(resolve, pulseDelayMs));
    }

    const currentPlayer = this.state.players.get(client.sessionId);
    const currentMob = this.runtimeMobEntities.find((entry) => entry.id === nearbyMob.id);

    if (!currentPlayer || !currentMob) {
      return;
    }

    if (currentMob.incapacitated) {
      break;
    }

    const currentDistance = this.getDistanceBetweenPoints(
      currentPlayer.x,
      currentPlayer.y,
      currentMob.x,
      currentMob.y
    );

    if (currentDistance > TILE_SIZE * (taserProfile.rangeTiles + 1)) {
      client.send("interaction_result", {
        success: false,
        message: "The target moved out of range."
      });
      return;
    }

    const basePulse = this.rollTaserBurstPulse();
    const pulse = {
      ...basePulse,
      damage: basePulse.hit
        ? Math.max(1, Math.round(basePulse.damage * taserProfile.damageMultiplier))
        : 0
    };
    currentMob.lastHitAtEpochMs = Date.now();

    if (!pulse.hit) {
      missCount += 1;

      this.broadcast("mob_damage_popup", {
        mapKey: this.currentMapKey,
        mobId: currentMob.id,
        x: currentMob.x,
        y: currentMob.y,
        text: "miss",
        kind: "miss"
      });

      continue;
    }

    hitCount += 1;
    totalDamage += pulse.damage;

    if (pulse.crit) {
      critCount += 1;
    }

    currentMob.stamina = Math.max(0, currentMob.stamina - pulse.damage);

    this.broadcast("mob_damage_popup", {
      mapKey: this.currentMapKey,
      mobId: currentMob.id,
      x: currentMob.x,
      y: currentMob.y,
      text: `${pulse.damage}`,
      kind: pulse.crit ? "crit" : "hit"
    });

    if (currentMob.kind === "herbivore") {
      this.markMobAggroOnPlayer(currentMob, client.sessionId, 2500);
    } else if (currentMob.kind === "carnivore") {
      this.markMobAggroOnPlayer(currentMob, client.sessionId, 12000);
    } else if (currentMob.kind === "apex_predator") {
      this.markMobAggroOnPlayer(currentMob, client.sessionId, 12000);
    }

    if (currentMob.stamina <= 0) {
      currentMob.stamina = 0;

      this.incapacitateMob(currentMob);

      break;
    }
  }

  this.broadcastRuntimeMobSnapshot(true);

  const finalMob = this.runtimeMobEntities.find((entry) => entry.id === nearbyMob.id);
  const finalPlayer = this.state.players.get(client.sessionId);

  if (!finalPlayer) {
    return;
  }

  if (finalMob?.incapacitated) {
    client.send("interaction_result", {
      success: true,
      message: `${finalPlayer.name} fired a ${taserProfile.attacks}-pulse taser burst: ${hitCount} hit(s), ${missCount} miss(es), ${critCount} crit(s), ${totalDamage} total damage. The ${finalMob.kind.replace(/_/g, " ")} is incapacitated.`
    });
    return;
  }

  if (!finalMob) {
    client.send("interaction_result", {
      success: false,
      message: "The target is no longer available."
    });
    return;
  }

  client.send("interaction_result", {
    success: hitCount > 0,
    message:
      hitCount > 0
        ? `${finalPlayer.name} fired a ${taserProfile.attacks}-pulse taser burst at the ${finalMob.kind.replace(/_/g, " ")}: ${hitCount} hit(s), ${missCount} miss(es), ${critCount} crit(s), ${totalDamage} total damage.`
        : `${finalPlayer.name} fired a ${taserProfile.attacks}-pulse taser burst and missed every shot.`
  });
}

  /*
  COLLECTABLE INTERACTION HANDLER
  -------------------------------
  Purpose:
  Grants one quality-rolled item from a nearby collectable node, then places
  that node into its regrowth state.

  Rules:
  - rock gives rock_sample
  - pond gives water_sample
  - plant gives plant_sample
  - each collect gives exactly 1 item
  - node tier affects quality probability
  */

    /*
  INCAPACITATED MOB COLLECTION HANDLER
  ------------------------------------
  Purpose:
  Lets the player collect any incapacitated mob as an animal specimen.

  Rules:
  - target must still be incapacitated
  - collection takes 6 seconds
  - moving too far cancels
  - reward is one animal specimen
  */

  async handleIncapacitatedHerbivoreCollectInteract(
    client: Client,
    message?: {
      action?: string;
      mobId?: string;
    }
  ) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    if (message?.action !== "collect_incapacitated_herbivore") {
      client.send("interaction_result", {
        success: false,
        message: "Unknown specimen collection action."
      });
      return;
    }

    const nearbyMob = this.getNearestIncapacitatedHerbivoreForPlayer(player);

    if (!nearbyMob) {
      client.send("interaction_result", {
        success: false,
        message: "No incapacitated mob is close enough to collect."
      });
      return;
    }

    if (nearbyMob.id !== message?.mobId) {
      client.send("interaction_result", {
        success: false,
        message: "That mob is no longer a valid collection target."
      });
      return;
    }

    const actionDirection =
      nearbyMob.x < player.x ? "left" : "right";

    const collectDurationMs = 6000;

    player.stationCooldowns.set("collect_incapacitated_herbivore", Date.now());
    this.startPlayerActionAnimation(player, "dig", actionDirection, collectDurationMs);

    await new Promise((resolve) => setTimeout(resolve, collectDurationMs));

    const stillPlayer = this.state.players.get(client.sessionId);
    const liveMob = this.runtimeMobEntities.find((entry) => entry.id === nearbyMob.id);

    if (!stillPlayer) {
      return;
    }

    if (!liveMob) {
      client.send("interaction_result", {
        success: false,
        message: "That incapacitated specimen has expired."
      });
      return;
    }

    if (!liveMob.incapacitated) {
      client.send("interaction_result", {
        success: false,
        message: "That mob can no longer be collected."
      });
      return;
    }

    const movedDuringCollection =
  !!stillPlayer.left ||
  !!stillPlayer.right ||
  !!stillPlayer.up ||
  !!stillPlayer.down;

if (movedDuringCollection) {
  client.send("interaction_result", {
    success: false,
    message: "Collection canceled because you moved."
  });
  return;
}

const stillDistance = this.getDistanceBetweenPoints(
  stillPlayer.x,
  stillPlayer.y,
  liveMob.x,
  liveMob.y
);

if (stillDistance > TILE_SIZE * 6) {
  client.send("interaction_result", {
    success: false,
    message: "You moved too far away from the specimen."
  });
  return;
}

    const zoologyMastery = this.getScienceMasterySteps(stillPlayer, "zoology");
    const rolledQuality = rollItemQualityForTier(liveMob.tier, zoologyMastery);

    try {
      const granted = await this.awardInventoryItem(stillPlayer, {
        baseItemKey: "herbivore_specimen",
        quality: rolledQuality,
        quantity: 1
      });

      this.removeMobEntityById(liveMob.id);
      this.broadcastRuntimeMobSnapshot(true);

      client.send("loot_feedback", {
        itemKey: granted.itemId,
        itemLabel: granted.itemLabel,
        presentation: "resource_wheel",
        resourceKind: "animal",
        resourceTier: liveMob.tier,
        quality: rolledQuality,
        cooldownMs: 2000,
        rarityChances: getItemQualityChancesForTier(liveMob.tier, zoologyMastery)
      });

      client.send("interaction_result", {
        success: true,
        message: `${stillPlayer.name} collected ${granted.itemLabel}.`
      });
    } catch (error) {
      console.error("Failed to save animal specimen:", error);

      client.send("interaction_result", {
        success: false,
        message:
          error instanceof Error && error.message === "Inventory full"
            ? "Your inventory is full."
            : "Collection succeeded, but inventory could not be saved."
      });
    }
  }

  async handleCollectableInteract(
    client: Client,
    message?: {
      action?: string;
      nodeId?: string;
    }
  ) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const nearbyNode = this.getNearestCollectableNodeForPlayer(player);

    if (!nearbyNode) {
      client.send("interaction_result", {
        success: false,
        message: "You are too far away from a collectable node."
      });
      return;
    }

    if (nearbyNode.id !== message?.nodeId) {
      client.send("interaction_result", {
        success: false,
        message: "That collectable node is no longer valid."
      });
      return;
    }

    if (nearbyNode.action !== message?.action) {
      client.send("interaction_result", {
        success: false,
        message: "That tool action does not match this resource."
      });
      return;
    }

    const liveNode = this.runtimeCollectableNodes.find(
      (entry) => entry.id === nearbyNode.id
    );
    if (!liveNode) {
      client.send("interaction_result", {
        success: false,
        message: "That collectable node is no longer available."
      });
      return;
    }

    const actionDirection = this.getActionFacingDirectionTowardTile(
      player,
      nearbyNode.anchorTileX,
      nearbyNode.anchorTileY
    );

    if (nearbyNode.kind === "communication") {
      const quest = this.createCommunicationQuest(player);
      if (!quest) {
        client.send("interaction_result", {
          success: false,
          message: `Quest log full. Complete one of your ${MAX_ACTIVE_QUESTS} active quests first.`
        });
        return;
      }

      this.startPlayerActionAnimation(player, "comm", actionDirection);
      this.scheduleCollectableRespawn(liveNode);
      this.broadcastRuntimeCollectableSnapshot(true);
      this.sendQuestSnapshot(player);
      client.send("quest_acquired", {
        id: quest.id,
        resourceKey: quest.resourceKey,
        resourceLabel: quest.resourceLabel,
        minimumQuality: quest.minimumQuality,
        requiredCount: quest.requiredCount,
        rewardQuality: quest.rewardQuality
      });
      client.send("interaction_result", {
        success: true,
        message: `New quest: collect ${quest.requiredCount} ${quest.minimumQuality} or higher ${quest.resourceLabel}.`
      });
      return;
    }

    const ACTION_REWARDS: Record<CollectableActionName, {
      baseItemKey: string;
      itemLabelBase: string;
      message: string;
      cooldownKey: string;
      cooldownMs: number;
    }> = {
      mine: {
        baseItemKey: "rock_sample",
        itemLabelBase: "Rock Sample",
        message: "mined a rock sample.",
        cooldownKey: "collect_mine",
        cooldownMs: 2000
      },
      fish: {
        baseItemKey: "water_sample",
        itemLabelBase: "Water Sample",
        message: "collected a water sample.",
        cooldownKey: "collect_fish",
        cooldownMs: 2000
      },
      dig: {
        baseItemKey: "plant_sample",
        itemLabelBase: "Plant Sample",
        message: "harvested a plant sample.",
        cooldownKey: "collect_dig",
        cooldownMs: 2000
      },
      comm: {
        baseItemKey: "",
        itemLabelBase: "",
        message: "received a transmission.",
        cooldownKey: "collect_comm",
        cooldownMs: 2000
      }
    };

    const reward = nearbyNode.kind === "specimen"
      ? {
        baseItemKey: "herbivore_specimen",
        itemLabelBase: "Alien Specimen",
        message: "recovered an alien specimen.",
        cooldownKey: "collect_specimen",
        cooldownMs: 2000
      }
      : ACTION_REWARDS[nearbyNode.action];
    const now = Date.now();
    const lastUsedAt = player.stationCooldowns.get(reward.cooldownKey) || 0;
    const cooldownRemaining = reward.cooldownMs - (now - lastUsedAt);

    if (cooldownRemaining > 0) {
      client.send("interaction_result", {
        success: false,
        message: `${nearbyNode.action} is recharging. Try again soon.`
      });
      return;
    }

    player.stationCooldowns.set(reward.cooldownKey, now);

    if (nearbyNode.kind === "plant") {
      if (liveNode.state !== "idle") {
        player.stationCooldowns.set(reward.cooldownKey, lastUsedAt);

        client.send("interaction_result", {
          success: false,
          message: "That plant is no longer available."
        });
        return;
      }

      liveNode.state = "being_collected";
      this.startPlayerActionAnimation(player, nearbyNode.action, actionDirection, PLAYER_PLANT_COLLECT_MS);
      this.broadcastRuntimeCollectableSnapshot(true);

      await new Promise((resolve) => setTimeout(resolve, PLAYER_PLANT_COLLECT_MS));

      const currentLiveNode = this.runtimeCollectableNodes.find((entry) => entry.id === nearbyNode.id);
      const stillPlayer = this.state.players.get(client.sessionId);

      if (!currentLiveNode || !stillPlayer || currentLiveNode.state !== "being_collected") {
        return;
      }

      const liveWorld = this.getCollectableWorldPosition(currentLiveNode);
      const stillDistance = this.getDistanceBetweenPoints(
        stillPlayer.x,
        stillPlayer.y,
        liveWorld.x,
        liveWorld.y
      );

      if (stillDistance > TILE_SIZE * 6) {
        currentLiveNode.state = "idle";
        this.broadcastRuntimeCollectableSnapshot(true);

        client.send("interaction_result", {
          success: false,
          message: "You moved too far away from the plant."
        });
        return;
      }

      const skillKey = getScienceSkillForResource(reward.baseItemKey);
      const masterySteps = skillKey ? this.getScienceMasterySteps(player, skillKey) : 0;
      const rolledQuality = currentLiveNode.guaranteedQuality ||
        rollItemQualityForTier(currentLiveNode.tier, masterySteps);

      try {
        const granted = await this.awardInventoryItem(player, {
          baseItemKey: reward.baseItemKey,
          quality: rolledQuality,
          quantity: 1
        });

        this.consumeCollectedNode(currentLiveNode);
        this.broadcastRuntimeCollectableSnapshot(true);

        client.send("loot_feedback", {
          itemKey: granted.itemId,
          itemLabel: granted.itemLabel,
          presentation: "resource_wheel",
          resourceKind: currentLiveNode.kind,
          resourceTier: currentLiveNode.tier,
          quality: rolledQuality,
          cooldownMs: reward.cooldownMs,
          rarityChances: currentLiveNode.guaranteedQuality
            ? [{ quality: currentLiveNode.guaranteedQuality, chance: 1 }]
            : getItemQualityChancesForTier(currentLiveNode.tier, masterySteps)
        });

        client.send("interaction_result", {
          success: true,
          message: `${player.name} ${reward.message} ${granted.itemLabel}.`
        });
      } catch (error) {
        console.error("Failed to save collectable inventory:", error);

        currentLiveNode.state = "idle";
        player.stationCooldowns.set(reward.cooldownKey, lastUsedAt);
        this.broadcastRuntimeCollectableSnapshot(true);

        client.send("interaction_result", {
          success: false,
          message:
            error instanceof Error && error.message === "Inventory full"
              ? "Your inventory is full."
              : "Collect succeeded, but inventory could not be saved."
        });
      }

      return;
    }

    this.startPlayerActionAnimation(player, nearbyNode.action, actionDirection);

    if (liveNode.state !== "ready") {
      player.stationCooldowns.set(reward.cooldownKey, lastUsedAt);
      client.send("interaction_result", {
        success: false,
        message: "That resource is already being collected."
      });
      return;
    }

    liveNode.state = "being_collected";
    this.broadcastRuntimeCollectableSnapshot(true);

    const skillKey = getScienceSkillForResource(reward.baseItemKey);
    const masterySteps = skillKey ? this.getScienceMasterySteps(player, skillKey) : 0;
    const rolledQuality = liveNode.guaranteedQuality ||
      rollItemQualityForTier(liveNode.tier, masterySteps);

    try {
      const granted = await this.awardInventoryItem(player, {
        baseItemKey: reward.baseItemKey,
        quality: rolledQuality,
        quantity: 1
      });

      this.consumeCollectedNode(liveNode);

      this.broadcastRuntimeCollectableSnapshot(true);

      client.send("loot_feedback", {
        itemKey: granted.itemId,
        itemLabel: granted.itemLabel,
        presentation: "resource_wheel",
        resourceKind: liveNode.kind,
        resourceTier: liveNode.tier,
        quality: rolledQuality,
        cooldownMs: reward.cooldownMs,
        rarityChances: liveNode.guaranteedQuality
          ? [{ quality: liveNode.guaranteedQuality, chance: 1 }]
          : getItemQualityChancesForTier(liveNode.tier, masterySteps)
      });

      client.send("interaction_result", {
        success: true,
        message: `${player.name} ${reward.message} ${granted.itemLabel}.`
      });
    } catch (error) {
      console.error("Failed to save collectable inventory:", error);

      liveNode.state = "ready";
      player.stationCooldowns.set(reward.cooldownKey, lastUsedAt);
      this.broadcastRuntimeCollectableSnapshot(true);

      client.send("interaction_result", {
        success: false,
        message:
          error instanceof Error && error.message === "Inventory full"
            ? "Your inventory is full."
            : "Collect succeeded, but inventory could not be saved."
      });
    }
  }

    /*
  PREDATOR ATTACK PROFILE HELPERS
  -------------------------------
  Purpose:
  Define windup and pulse rules for carnivore and apex predator attacks.
  */

    getHerbivoreAttackProfile(tier: number) {
    if (tier <= 1) {
      return {
        windupMs: 200,
        pulses: 1,
        speedBoostMultiplier: 1.3,
        speedBoostDurationMs: 1000
      };
    }

    return {
      windupMs: 200,
      pulses: 1,
      speedBoostMultiplier: 1.3,
      speedBoostDurationMs: 1300
    };
  }

  rollHerbivoreAttackPulse(tier: number) {
    const roll = 1 + Math.floor(Math.random() * 6);

    if (roll <= 2) {
      return { roll, hit: false, crit: false, damage: 0 };
    }

    return {
      roll,
      hit: true,
      crit: false,
      damage:
        tier <= 1
          ? 1 + Math.floor(Math.random() * 3)
          : 1 + Math.floor(Math.random() * 4)
    };
  }

  getCarnivoreAttackProfile(tier: number) {
    if (tier <= 1) {
      return {
        windupMs: 600,
        pulses: 1
      };
    }

    if (tier === 2) {
      return {
        windupMs: 1200,
        pulses: 2
      };
    }

    return {
      windupMs: 900,
      pulses: 3
    };
  }

  getApexPredatorAttackProfile(tier: number) {
    if (tier <= 2) {
      return {
        windupMs: 600,
        pulses: 4
      };
    }

    return {
      windupMs: 2100,
      pulses: 2
    };
  }

  rollCarnivoreAttackPulse(tier: number) {
    const roll = 1 + Math.floor(Math.random() * 6);

    if (tier <= 1) {
      if (roll <= 2) {
        return { roll, hit: false, crit: false, damage: 0 };
      }

      return {
        roll,
        hit: true,
        crit: false,
        damage: 1 + Math.floor(Math.random() * 4)
      };
    }

    if (roll <= 2) {
      return { roll, hit: false, crit: false, damage: 0 };
    }

    if (roll === 6) {
      return { roll, hit: true, crit: true, damage: 5 };
    }

    return {
      roll,
      hit: true,
      crit: false,
      damage: 1 + Math.floor(Math.random() * 3)
    };
  }

  rollApexPredatorAttackPulse(tier: number) {
    const roll = 1 + Math.floor(Math.random() * 6);

    if (tier <= 2) {
      if (roll <= 2) {
        return { roll, hit: false, crit: false, damage: 0 };
      }

      if (roll === 6) {
        return { roll, hit: true, crit: true, damage: 5 };
      }

      return {
        roll,
        hit: true,
        crit: false,
        damage: 1 + Math.floor(Math.random() * 3)
      };
    }

    if (roll === 1) {
      return { roll, hit: false, crit: false, damage: 0 };
    }

    if (roll === 6) {
      return { roll, hit: true, crit: true, damage: 14 };
    }

    return {
      roll,
      hit: true,
      crit: false,
      damage: 7 + Math.floor(Math.random() * 6)
    };
  }

  getActionDurationMs(actionName: string) {
    const ACTION_FRAME_COUNTS: Record<string, number> = {
      craft: 4,
      taser: 4,
      mine: 4,
      dig: 4,
      fish: 4,
      comm: 4
    };

    const frameCount = ACTION_FRAME_COUNTS[actionName] || 4;
    return frameCount * PLAYER_ACTION_FRAME_MS;
  }

    /*
  TASER DAMAGE ROLL HELPER
  ------------------------
  Purpose:
  Rolls the taser result.

  Results:
  - 1-2 = miss
  - 3-5 = 6-10 damage
  - 6 = 14 damage crit
  */

  rollTaserBurstPulse() {
    const roll = 1 + Math.floor(Math.random() * 6);

    if (roll <= 2) {
      return {
        roll,
        hit: false,
        crit: false,
        damage: 0
      };
    }

    if (roll === 6) {
      return {
        roll,
        hit: true,
        crit: true,
        damage: 5
      };
    }

    return {
      roll,
      hit: true,
      crit: false,
      damage: 1 + Math.floor(Math.random() * 3)
    };
  }

  startPlayerActionAnimation(
    player: Player,
    actionName: string,
    direction: string,
    durationOverrideMs?: number
  ) {
    player.actionName = actionName;
    player.actionDirection = direction;
    player.actionUntilEpochMs = Date.now() + (durationOverrideMs || this.getActionDurationMs(actionName));
  }

  getProgressionCount(player: Player, itemId: string) {
    return Math.max(0, Math.floor(player.inventory.get(itemId) || 0));
  }

  getCoreAbilityRank(player: Player, abilityKey: CoreAbilityKey) {
    return Math.min(
      CORE_ABILITY_DEFS[abilityKey].maxRank,
      this.getProgressionCount(player, getCoreAbilityItemId(abilityKey))
    );
  }

  hasSpecialAbility(player: Player, abilityKey: SpecialAbilityKey) {
    return this.getProgressionCount(player, getSpecialAbilityItemId(abilityKey)) > 0;
  }

  getSpecialAbilityRank(player: Player, abilityKey: SpecialAbilityKey) {
    const maximum = SPECIAL_ABILITY_DEFS[abilityKey].maxRank || 1;
    return Math.min(maximum, this.getProgressionCount(player, getSpecialAbilityItemId(abilityKey)));
  }

  getScienceSkillProgress(player: Player, skillKey: ScienceSkillKey) {
    const xp = this.getProgressionCount(player, getSkillItemId(skillKey));
    return { xp, ...getScienceSkillLevelFromXp(xp) };
  }

  getScienceSkillRarityProgress(
    player: Player,
    skillKey: ScienceSkillKey,
    quality: ItemQuality
  ) {
    const xp = this.getProgressionCount(player, getSkillRarityItemId(skillKey, quality));
    return { quality, xp, ...getScienceSkillLevelFromXp(xp) };
  }

  getPlayerProfileRank(player: Player) {
    const xp = SCIENCE_SKILL_KEYS.reduce(
      (total, key) => total + this.getScienceSkillProgress(player, key).xp,
      0
    );
    const progress = getScienceSkillLevelFromXp(xp);
    return {
      ...progress,
      xp,
      label: getProfileRankLabel(progress.level)
    };
  }

  getScienceMasterySteps(player: Player, skillKey: ScienceSkillKey) {
    const { level } = this.getScienceSkillProgress(player, skillKey);
    if (skillKey === "astrobiology") return Math.max(0, level - 1);
    const masteryKey = `${skillKey}_mastery` as SpecialAbilityKey;
    return Math.max(0, level - 1) + (this.hasSpecialAbility(player, masteryKey) ? 3 : 0);
  }

  getPlayerMaxOxygen(player: Player) {
    return 100 + this.getCoreAbilityRank(player, "oxygen_storage") * 10 +
      (this.hasSpecialAbility(player, "oxygen_reserve") ? 15 : 0);
  }

  getPlayerMaxEnergy(player: Player) {
    return 100 + this.getCoreAbilityRank(player, "energy_storage") * 10 +
      (this.hasSpecialAbility(player, "energy_reserve") ? 15 : 0);
  }

  getPlayerInventorySlotCount(player: Player) {
    return INVENTORY_SLOT_COUNT + this.getSpecialAbilityRank(player, "inventory_expansion");
  }

  getPlayerTaserProfile(player: Player) {
    const attackRank = this.getCoreAbilityRank(player, "taser_attacks");
    const damageRank = this.getCoreAbilityRank(player, "taser_damage");
    const rangeRank = this.getCoreAbilityRank(player, "taser_range");
    const efficient = this.hasSpecialAbility(player, "efficient_taser");
    return {
      attacks: 3 + attackRank,
      damageMultiplier: 1 + damageRank * 0.10,
      rangeTiles: 5 + rangeRank * 0.5,
      energyCost: Math.max(1, Math.round(8 * (efficient ? 0.8 : 1)))
    };
  }

  applyProgressionDerivedStats(player: Player, refill = false) {
    const previousMaxEnergy = Math.max(1, player.maxHealth || 100);
    const previousMaxOxygen = Math.max(1, player.maxStamina || 100);
    const nextMaxEnergy = this.getPlayerMaxEnergy(player);
    const nextMaxOxygen = this.getPlayerMaxOxygen(player);
    player.maxHealth = nextMaxEnergy;
    player.maxStamina = nextMaxOxygen;
    if (refill) {
      player.health = nextMaxEnergy;
      player.stamina = nextMaxOxygen;
    } else {
      player.health = Math.max(
        0,
        Math.min(nextMaxEnergy, player.health + (nextMaxEnergy - previousMaxEnergy))
      );
      player.stamina = Math.max(
        0,
        Math.min(nextMaxOxygen, player.stamina + (nextMaxOxygen - previousMaxOxygen))
      );
    }
  }

  getQuestTokenCounts(player: Player) {
    const byQuality = {} as Record<ItemQuality, number>;
    let total = 0;
    (["common", "uncommon", "rare", "epic", "legendary"] as ItemQuality[]).forEach((quality) => {
      const count = this.getProgressionCount(player, buildInventoryItemId("comm_quest_token", quality));
      byQuality[quality] = count;
      total += count;
    });
    return { total, byQuality };
  }

  getUnlockedSpecialAbilityCount(player: Player) {
    return (Object.keys(SPECIAL_ABILITY_DEFS) as SpecialAbilityKey[])
      .reduce((total, key) => total + this.getSpecialAbilityRank(player, key), 0);
  }

  getSpecialTokenState(player: Player) {
    const completedQuests = this.getProgressionCount(player, getCompletedQuestsItemId());
    const used = this.getUnlockedSpecialAbilityCount(player);
    const earned = Math.max(
      used,
      getSpecialTokensEarnedForQuestCount(completedQuests),
      this.getProgressionCount(player, getSpecialTokensEarnedItemId())
    );
    return {
      completedQuests,
      earned,
      used,
      available: this.getProgressionCount(player, getSpecialTokenBalanceItemId()),
      nextAt: 10 * Math.pow(2, Math.min(earned, 32))
    };
  }

  getPlayerTradesEnabled(player: Player) {
    return this.getProgressionCount(player, getTradesDisabledItemId()) === 0;
  }

  sendProgressionSnapshot(player: Player) {
    const client = this.clients.find((entry) => entry.sessionId === player.id);
    if (!client) return;
    const tokenCounts = this.getQuestTokenCounts(player);
    const tokensSpent = this.getProgressionCount(player, getTokensSpentItemId());
    const specialTokens = this.getSpecialTokenState(player);
    const taser = this.getPlayerTaserProfile(player);
    client.send("progression_snapshot", {
      skills: SCIENCE_SKILL_KEYS.map((key) => {
        const progress = this.getScienceSkillProgress(player, key);
        const masterySteps = this.getScienceMasterySteps(player, key);
        return {
          key,
          ...progress,
          structuresDestroyed: key === "astrobiology"
            ? this.getProgressionCount(player, getAstrobiologyStructureCountItemId())
            : 0,
          masterySteps,
          rarityBonusPercent: key === "astrobiology" ? 0 : masterySteps * 0.1,
          rarityRanks: key === "astrobiology"
            ? []
            : (Object.keys(ITEM_QUALITY_RANK) as ItemQuality[]).map((quality) =>
              this.getScienceSkillRarityProgress(player, key, quality)
            )
        };
      }),
      profileRank: this.getPlayerProfileRank(player),
      abilities: (Object.keys(CORE_ABILITY_DEFS) as CoreAbilityKey[]).map((key) => {
        const rank = this.getCoreAbilityRank(player, key);
        return {
          key,
          rank,
          maxRank: CORE_ABILITY_DEFS[key].maxRank,
          nextCost: rank >= CORE_ABILITY_DEFS[key].maxRank ? 0 : (rank + 1) * 5
        };
      }),
      specials: (Object.entries(SPECIAL_ABILITY_DEFS) as Array<[
        SpecialAbilityKey,
        { active: boolean; prerequisite?: SpecialAbilityKey; maxRank?: number }
      ]>).map(([key, definition]) => ({
        key,
        active: definition.active,
        prerequisite: definition.prerequisite || null,
        rank: this.getSpecialAbilityRank(player, key),
        maxRank: definition.maxRank || 1,
        unlocked: this.hasSpecialAbility(player, key)
      })),
      tokens: {
        ...tokenCounts,
        spent: tokensSpent,
        unlockedSpecialCount: specialTokens.used,
        completedQuests: specialTokens.completedQuests,
        specialEarned: specialTokens.earned,
        specialUsed: specialTokens.used,
        specialAvailable: specialTokens.available,
        nextSpecialUnlockAt: specialTokens.nextAt,
        canUnlockSpecial: specialTokens.available > 0
      },
      vitals: {
        maxOxygen: player.maxStamina,
        maxEnergy: player.maxHealth,
        taserAttacks: taser.attacks,
        taserDamageMultiplier: taser.damageMultiplier,
        taserRangeTiles: taser.rangeTiles,
        taserEnergyCost: taser.energyCost,
        inventorySlots: this.getPlayerInventorySlotCount(player)
      },
      cooldowns: {
        sprintReadyAt: player.stationCooldowns.get("special_sprint_ready_at") || 0,
        moxieReadyAt: player.stationCooldowns.get("special_moxie_ready_at") || 0,
        solarChargeReadyAt: player.stationCooldowns.get("special_solar_charge_ready_at") || 0
      },
      effects: {
        sprintUntil: player.stationCooldowns.get("special_sprint_effect_until") || 0,
        moxieUntil: player.stationCooldowns.get("special_moxie_effect_until") || 0,
        solarChargeUntil: player.stationCooldowns.get("special_solar_charge_effect_until") || 0
      },
      settings: {
        tradesEnabled: this.getPlayerTradesEnabled(player)
      }
    });
  }

  async saveProgressionInventoryChanges(player: Player, nextQuantities: Map<string, number>) {
    const rows = [...nextQuantities].map(([itemId, quantity]) => ({
      user_id: player.userId,
      class_id: player.classId,
      item_id: itemId,
      quantity: Math.max(0, Math.floor(quantity))
    }));
    const { error } = await supabaseAdmin.from("inventories").upsert(rows, {
      onConflict: "user_id,class_id,item_id"
    });
    if (error) throw error;
    nextQuantities.forEach((quantity, itemId) => {
      if (quantity > 0) player.inventory.set(itemId, Math.floor(quantity));
      else player.inventory.delete(itemId);
    });
  }

  async ensureSpecialTokenProgression(player: Player) {
    if (this.getProgressionCount(player, getSpecialTokenMigrationItemId()) > 0) return;

    const questTokens = this.getQuestTokenCounts(player).total;
    const tokensSpent = this.getProgressionCount(player, getTokensSpentItemId());
    const unlockedSpecials = this.getUnlockedSpecialAbilityCount(player);
    const completedQuests = Math.max(
      this.getProgressionCount(player, getCompletedQuestsItemId()),
      questTokens + tokensSpent
    );
    const earned = Math.max(
      unlockedSpecials,
      this.getProgressionCount(player, getSpecialTokensEarnedItemId()),
      getSpecialTokensEarnedForQuestCount(completedQuests)
    );
    const existingBalance = this.getProgressionCount(player, getSpecialTokenBalanceItemId());
    const available = Math.max(existingBalance, earned - unlockedSpecials);

    await this.saveProgressionInventoryChanges(player, new Map([
      [getCompletedQuestsItemId(), completedQuests],
      [getSpecialTokensEarnedItemId(), earned],
      [getSpecialTokenBalanceItemId(), available],
      [getSpecialTokenMigrationItemId(), 1]
    ]));
  }

  getClientForPlayerId(playerId: string) {
    return this.clients.find((entry) => entry.sessionId === playerId) || null;
  }

  handleRequestPlayerProfile(client: Client, message?: { playerId?: string }) {
    const requester = this.state.players.get(client.sessionId);
    const target = this.state.players.get(String(message?.playerId || ""));
    if (!requester || !target || target.id === requester.id) return;
    client.send("player_profile_snapshot", {
      playerId: target.id,
      name: target.name,
      className: this.roomClassName || this.roomClassCode || "Expedition",
      profileRank: this.getPlayerProfileRank(target),
      skills: SCIENCE_SKILL_KEYS.map((key) => ({
        key,
        level: this.getScienceSkillProgress(target, key).level
      })),
      tradesEnabled: this.getPlayerTradesEnabled(target)
    });
  }

  async handleSetTradeSettings(client: Client, message?: { enabled?: boolean }) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const enabled = message?.enabled !== false;
    try {
      await this.saveProgressionInventoryChanges(player, new Map([
        [getTradesDisabledItemId(), enabled ? 0 : 1]
      ]));
      this.sendProgressionSnapshot(player);
      client.send("trade_settings_result", { success: true, tradesEnabled: enabled });
      if (!enabled) this.cancelPlayerTradeActivity(player.id, "Trades were disabled.");
    } catch (error) {
      console.error("Failed to save trade settings:", error);
      client.send("trade_settings_result", {
        success: false,
        tradesEnabled: this.getPlayerTradesEnabled(player),
        message: "Trade settings could not be saved."
      });
    }
  }

  handleTradeRequest(client: Client, message?: { targetPlayerId?: string }) {
    const requester = this.state.players.get(client.sessionId);
    const target = this.state.players.get(String(message?.targetPlayerId || ""));
    if (!requester || !target || requester.id === target.id) {
      client.send("trade_result", { success: false, message: "That player is not available to trade." });
      return;
    }
    if (!this.getPlayerTradesEnabled(requester)) {
      client.send("trade_result", { success: false, message: "Enable trades in Settings first." });
      return;
    }
    if (!this.getPlayerTradesEnabled(target)) {
      client.send("trade_result", { success: false, message: `${target.name} is not accepting trades.` });
      return;
    }
    if (this.playerTradeSessionIds.has(requester.id) || this.playerTradeSessionIds.has(target.id)) {
      client.send("trade_result", { success: false, message: "One of the players is already trading." });
      return;
    }
    const existingRequest = [...this.tradeRequests.values()].find((entry) =>
      entry.fromPlayerId === requester.id ||
      entry.toPlayerId === requester.id ||
      entry.fromPlayerId === target.id ||
      entry.toPlayerId === target.id
    );
    if (existingRequest) {
      client.send("trade_result", { success: false, message: "One of the players already has a pending trade request." });
      return;
    }

    const request: RuntimeTradeRequest = {
      id: `trade-request:${Date.now()}:${Math.floor(Math.random() * 1_000_000)}`,
      fromPlayerId: requester.id,
      toPlayerId: target.id,
      createdAtEpochMs: Date.now()
    };
    this.tradeRequests.set(request.id, request);
    this.getClientForPlayerId(target.id)?.send("trade_request", {
      requestId: request.id,
      fromPlayerId: requester.id,
      fromName: requester.name
    });
    client.send("trade_result", { success: true, message: `Trade request sent to ${target.name}.` });
    this.clock.setTimeout(() => {
      if (!this.tradeRequests.has(request.id)) return;
      this.tradeRequests.delete(request.id);
      this.getClientForPlayerId(requester.id)?.send("trade_cancelled", {
        message: "Trade request expired."
      });
      this.getClientForPlayerId(target.id)?.send("trade_cancelled", {
        message: "Trade request expired."
      });
    }, 30_000);
  }

  handleTradeRequestResponse(
    client: Client,
    message?: { requestId?: string; accepted?: boolean }
  ) {
    const request = this.tradeRequests.get(String(message?.requestId || ""));
    if (!request || request.toPlayerId !== client.sessionId) return;
    this.tradeRequests.delete(request.id);
    const requester = this.state.players.get(request.fromPlayerId);
    const target = this.state.players.get(request.toPlayerId);
    if (!requester || !target || message?.accepted !== true) {
      this.getClientForPlayerId(request.fromPlayerId)?.send("trade_cancelled", {
        message: target ? `${target.name} declined the trade request.` : "The trade request expired."
      });
      client.send("trade_cancelled", { message: "Trade request declined." });
      return;
    }
    if (
      !this.getPlayerTradesEnabled(requester) ||
      !this.getPlayerTradesEnabled(target) ||
      this.playerTradeSessionIds.has(requester.id) ||
      this.playerTradeSessionIds.has(target.id)
    ) {
      client.send("trade_cancelled", { message: "The trade can no longer be started." });
      this.getClientForPlayerId(requester.id)?.send("trade_cancelled", {
        message: "The trade can no longer be started."
      });
      return;
    }

    const trade: RuntimeTradeSession = {
      id: `trade:${Date.now()}:${Math.floor(Math.random() * 1_000_000)}`,
      playerIds: [requester.id, target.id],
      offers: new Map([
        [requester.id, new Map()],
        [target.id, new Map()]
      ]),
      acceptedPlayerIds: new Set(),
      confirmedPlayerIds: new Set(),
      phase: "offering"
    };
    this.tradeSessions.set(trade.id, trade);
    this.playerTradeSessionIds.set(requester.id, trade.id);
    this.playerTradeSessionIds.set(target.id, trade.id);
    this.broadcastTradeSnapshot(trade);
  }

  getTradeForPlayer(playerId: string, tradeId?: string) {
    const activeTradeId = this.playerTradeSessionIds.get(playerId);
    if (!activeTradeId || (tradeId && activeTradeId !== tradeId)) return null;
    return this.tradeSessions.get(activeTradeId) || null;
  }

  getTradeSnapshot(trade: RuntimeTradeSession) {
    return {
      tradeId: trade.id,
      phase: trade.phase,
      players: trade.playerIds.map((playerId) => {
        const player = this.state.players.get(playerId);
        return {
          playerId,
          name: player?.name || "Player",
          accepted: trade.acceptedPlayerIds.has(playerId),
          confirmed: trade.confirmedPlayerIds.has(playerId),
          offer: [...(trade.offers.get(playerId) || new Map())]
            .filter(([, quantity]) => quantity > 0)
            .map(([itemId, quantity]) => ({ itemId, quantity }))
        };
      })
    };
  }

  broadcastTradeSnapshot(trade: RuntimeTradeSession) {
    const snapshot = this.getTradeSnapshot(trade);
    trade.playerIds.forEach((playerId) => {
      this.getClientForPlayerId(playerId)?.send("trade_snapshot", snapshot);
    });
  }

  cancelTrade(trade: RuntimeTradeSession, message: string) {
    this.tradeSessions.delete(trade.id);
    trade.playerIds.forEach((playerId) => {
      this.playerTradeSessionIds.delete(playerId);
      this.getClientForPlayerId(playerId)?.send("trade_cancelled", { message });
    });
  }

  cancelPlayerTradeActivity(playerId: string, message: string) {
    [...this.tradeRequests.values()].forEach((request) => {
      if (request.fromPlayerId !== playerId && request.toPlayerId !== playerId) return;
      this.tradeRequests.delete(request.id);
      const otherId = request.fromPlayerId === playerId ? request.toPlayerId : request.fromPlayerId;
      this.getClientForPlayerId(otherId)?.send("trade_cancelled", { message });
    });
    const trade = this.getTradeForPlayer(playerId);
    if (trade) this.cancelTrade(trade, message);
  }

  handleTradeOfferUpdate(
    client: Client,
    message?: { tradeId?: string; itemId?: string; delta?: number }
  ) {
    const player = this.state.players.get(client.sessionId);
    const trade = this.getTradeForPlayer(client.sessionId, String(message?.tradeId || ""));
    if (!player || !trade || trade.phase === "completing") return;
    if (trade.acceptedPlayerIds.has(player.id)) {
      client.send("trade_result", { success: false, message: "Unaccept your offer by waiting for the other player to change theirs, or cancel this trade." });
      return;
    }
    const itemId = String(message?.itemId || "").trim();
    const delta = Number(message?.delta) === -1 ? -1 : 1;
    if (!itemId || isVirtualProgressionItemId(itemId)) return;
    const owned = Math.max(0, player.inventory.get(itemId) || 0);
    const offer = trade.offers.get(player.id) || new Map<string, number>();
    const current = Math.max(0, offer.get(itemId) || 0);
    const next = Math.max(0, Math.min(owned, current + delta));
    if (next === current) return;
    if (next > 0) offer.set(itemId, next);
    else offer.delete(itemId);
    trade.offers.set(player.id, offer);
    trade.phase = "offering";
    trade.acceptedPlayerIds.clear();
    trade.confirmedPlayerIds.clear();
    this.broadcastTradeSnapshot(trade);
  }

  handleTradeAccept(client: Client, message?: { tradeId?: string }) {
    const trade = this.getTradeForPlayer(client.sessionId, String(message?.tradeId || ""));
    if (!trade || trade.phase === "completing") return;
    const hasOfferedItems = trade.playerIds.some((playerId) =>
      [...(trade.offers.get(playerId) || new Map()).values()].some((quantity) => quantity > 0)
    );
    if (!hasOfferedItems) {
      client.send("trade_result", { success: false, message: "Add at least one item before accepting the trade." });
      return;
    }
    trade.acceptedPlayerIds.add(client.sessionId);
    if (trade.playerIds.every((playerId) => trade.acceptedPlayerIds.has(playerId))) {
      trade.phase = "confirming";
      trade.confirmedPlayerIds.clear();
      this.broadcastTradeSnapshot(trade);
      trade.playerIds.forEach((playerId) => {
        this.getClientForPlayerId(playerId)?.send("trade_confirmation_required", {
          tradeId: trade.id,
          message: "Both offers are locked. Accept this final trade?"
        });
      });
      return;
    }
    this.broadcastTradeSnapshot(trade);
  }

  getInventoryStackUsageForQuantities(quantities: Map<string, number>) {
    let used = 0;
    quantities.forEach((quantity, itemId) => {
      if (quantity <= 0 || isVirtualProgressionItemId(itemId)) return;
      used += Math.ceil(quantity / getItemStackMax(itemId));
    });
    return used;
  }

  async completeTrade(trade: RuntimeTradeSession) {
    const first = this.state.players.get(trade.playerIds[0]);
    const second = this.state.players.get(trade.playerIds[1]);
    if (!first || !second) {
      this.cancelTrade(trade, "Trade cancelled because a player disconnected.");
      return;
    }
    trade.phase = "completing";
    const nextByPlayer = new Map<string, Map<string, number>>();
    [first, second].forEach((player) => {
      const quantities = new Map<string, number>();
      player.inventory.forEach((quantity, itemId) => quantities.set(itemId, quantity));
      nextByPlayer.set(player.id, quantities);
    });

    for (const giver of [first, second]) {
      const receiver = giver.id === first.id ? second : first;
      for (const [itemId, quantity] of trade.offers.get(giver.id) || []) {
        if (isVirtualProgressionItemId(itemId) || quantity <= 0) continue;
        const giverQuantities = nextByPlayer.get(giver.id) as Map<string, number>;
        const receiverQuantities = nextByPlayer.get(receiver.id) as Map<string, number>;
        if ((giverQuantities.get(itemId) || 0) < quantity) {
          this.cancelTrade(trade, `${giver.name} no longer has the offered items.`);
          return;
        }
        giverQuantities.set(itemId, (giverQuantities.get(itemId) || 0) - quantity);
        receiverQuantities.set(itemId, (receiverQuantities.get(itemId) || 0) + quantity);
      }
    }

    if (
      this.getInventoryStackUsageForQuantities(nextByPlayer.get(first.id) as Map<string, number>) >
        this.getPlayerInventorySlotCount(first) ||
      this.getInventoryStackUsageForQuantities(nextByPlayer.get(second.id) as Map<string, number>) >
        this.getPlayerInventorySlotCount(second)
    ) {
      this.cancelTrade(trade, "Trade cancelled because the received items would exceed inventory capacity.");
      return;
    }

    const affectedItemIds = new Set<string>();
    trade.playerIds.forEach((playerId) => {
      (trade.offers.get(playerId) || new Map()).forEach((_quantity, itemId) => affectedItemIds.add(itemId));
    });
    const rows = [first, second].flatMap((player) =>
      [...affectedItemIds].map((itemId) => ({
        user_id: player.userId,
        class_id: player.classId,
        item_id: itemId,
        quantity: Math.max(0, nextByPlayer.get(player.id)?.get(itemId) || 0)
      }))
    );

    try {
      const { error } = await supabaseAdmin.from("inventories").upsert(rows, {
        onConflict: "user_id,class_id,item_id"
      });
      if (error) throw error;
      [first, second].forEach((player) => {
        affectedItemIds.forEach((itemId) => {
          const quantity = Math.max(0, nextByPlayer.get(player.id)?.get(itemId) || 0);
          if (quantity > 0) player.inventory.set(itemId, quantity);
          else player.inventory.delete(itemId);
        });
        this.sendQuestSnapshot(player);
      });
      this.tradeSessions.delete(trade.id);
      trade.playerIds.forEach((playerId) => {
        this.playerTradeSessionIds.delete(playerId);
        this.getClientForPlayerId(playerId)?.send("trade_completed", {
          tradeId: trade.id,
          message: "Trade complete."
        });
      });
    } catch (error) {
      console.error("Failed to complete trade:", error);
      this.cancelTrade(trade, "Trade could not be saved. No items were exchanged.");
    }
  }

  async handleTradeConfirmation(
    client: Client,
    message?: { tradeId?: string; accepted?: boolean }
  ) {
    const trade = this.getTradeForPlayer(client.sessionId, String(message?.tradeId || ""));
    if (!trade || trade.phase !== "confirming") return;
    if (message?.accepted !== true) {
      this.cancelTrade(trade, "Trade cancelled at final confirmation.");
      return;
    }
    trade.confirmedPlayerIds.add(client.sessionId);
    this.broadcastTradeSnapshot(trade);
    if (trade.playerIds.every((playerId) => trade.confirmedPlayerIds.has(playerId))) {
      await this.completeTrade(trade);
    }
  }

  handleTradeCancel(client: Client, message?: { tradeId?: string }) {
    const trade = this.getTradeForPlayer(client.sessionId, String(message?.tradeId || ""));
    if (trade) this.cancelTrade(trade, "Trade cancelled.");
  }

  planQuestTokenSpend(player: Player, cost: number) {
    const tokenCounts = this.getQuestTokenCounts(player);
    if (tokenCounts.total < cost) return null;
    let remaining = cost;
    const nextQuantities = new Map<string, number>();
    (["common", "uncommon", "rare", "epic", "legendary"] as ItemQuality[]).forEach((quality) => {
      if (remaining <= 0) return;
      const itemId = buildInventoryItemId("comm_quest_token", quality);
      const current = tokenCounts.byQuality[quality];
      const used = Math.min(current, remaining);
      if (used > 0) nextQuantities.set(itemId, current - used);
      remaining -= used;
    });
    return nextQuantities;
  }

  async handlePurchaseCoreAbility(client: Client, message?: { abilityKey?: string }) {
    const player = this.state.players.get(client.sessionId);
    const abilityKey = message?.abilityKey as CoreAbilityKey;
    if (!player || !(abilityKey in CORE_ABILITY_DEFS)) return;
    const rank = this.getCoreAbilityRank(player, abilityKey);
    if (rank >= CORE_ABILITY_DEFS[abilityKey].maxRank) {
      client.send("progression_result", { success: false, message: "That ability is already at maximum rank." });
      return;
    }
    const cost = (rank + 1) * 5;
    const changes = this.planQuestTokenSpend(player, cost);
    if (!changes) {
      client.send("progression_result", { success: false, message: `You need ${cost} quest token${cost === 1 ? "" : "s"}.` });
      return;
    }
    const rankItemId = getCoreAbilityItemId(abilityKey);
    const spentItemId = getTokensSpentItemId();
    changes.set(rankItemId, rank + 1);
    changes.set(spentItemId, this.getProgressionCount(player, spentItemId) + cost);
    try {
      await this.saveProgressionInventoryChanges(player, changes);
      this.applyProgressionDerivedStats(player);
      this.sendProgressionSnapshot(player);
      client.send("progression_result", { success: true, message: `Ability upgraded to rank ${rank + 1}.` });
    } catch (error) {
      console.error("Failed to purchase ability:", error);
      client.send("progression_result", { success: false, message: "The ability upgrade could not be saved." });
    }
  }

  async handleUnlockSpecialAbility(client: Client, message?: { abilityKey?: string }) {
    const player = this.state.players.get(client.sessionId);
    const abilityKey = message?.abilityKey as SpecialAbilityKey;
    if (!player || !(abilityKey in SPECIAL_ABILITY_DEFS)) return;
    const currentRank = this.getSpecialAbilityRank(player, abilityKey);
    const maximumRank = SPECIAL_ABILITY_DEFS[abilityKey].maxRank || 1;
    if (currentRank >= maximumRank) {
      client.send("progression_result", { success: false, message: "That special ability is already unlocked." });
      return;
    }
    const definition = SPECIAL_ABILITY_DEFS[abilityKey];
    if (definition.prerequisite && !this.hasSpecialAbility(player, definition.prerequisite)) {
      client.send("progression_result", { success: false, message: "Unlock the prerequisite special ability first." });
      return;
    }
    const specialTokens = this.getSpecialTokenState(player);
    if (specialTokens.available <= 0) {
      client.send("progression_result", {
        success: false,
        message: `Complete ${Math.max(0, specialTokens.nextAt - specialTokens.completedQuests)} more quest${specialTokens.nextAt - specialTokens.completedQuests === 1 ? "" : "s"} to earn another Special Ability token.`
      });
      return;
    }
    try {
      await this.saveProgressionInventoryChanges(player, new Map([
        [getSpecialAbilityItemId(abilityKey), currentRank + 1],
        [getSpecialTokenBalanceItemId(), specialTokens.available - 1]
      ]));
      this.applyProgressionDerivedStats(player);
      this.sendProgressionSnapshot(player);
      client.send("progression_result", {
        success: true,
        message: maximumRank > 1
          ? `Special ability upgraded to rank ${currentRank + 1}/${maximumRank}.`
          : "Special ability unlocked."
      });
    } catch (error) {
      console.error("Failed to unlock special ability:", error);
      client.send("progression_result", { success: false, message: "The special ability could not be saved." });
    }
  }

  clearActiveSpecialAbilityState(player: Player) {
    [
      "special_sprint_ready_at",
      "special_moxie_ready_at",
      "special_solar_charge_ready_at",
      "special_sprint_effect_until",
      "special_moxie_effect_until",
      "special_solar_charge_effect_until"
    ].forEach((key) => player.stationCooldowns.delete(key));
  }

  async handleResetProgression(client: Client, message?: { scope?: string }) {
    const player = this.state.players.get(client.sessionId);
    const scope = message?.scope === "abilities" ? "abilities" : "specials";
    if (!player) return;

    if (scope === "specials" && this.getInventoryStackUsage(player) > INVENTORY_SLOT_COUNT) {
      client.send("progression_result", {
        success: false,
        message: `Reduce your inventory to ${INVENTORY_SLOT_COUNT} occupied slots before resetting inventory expansions.`
      });
      return;
    }

    const changes = new Map<string, number>();

    if (scope === "abilities") {
      (Object.keys(CORE_ABILITY_DEFS) as CoreAbilityKey[]).forEach((key) => {
        changes.set(getCoreAbilityItemId(key), 0);
      });
      const spentItemId = getTokensSpentItemId();
      const spentTokens = this.getProgressionCount(player, spentItemId);
      const commonTokenId = buildInventoryItemId("comm_quest_token", "common");
      changes.set(spentItemId, 0);
      changes.set(
        commonTokenId,
        this.getProgressionCount(player, commonTokenId) + spentTokens
      );
    } else {
      const refundedSpecialTokens = this.getUnlockedSpecialAbilityCount(player);
      (Object.keys(SPECIAL_ABILITY_DEFS) as SpecialAbilityKey[]).forEach((key) => {
        changes.set(getSpecialAbilityItemId(key), 0);
      });
      changes.set(
        getSpecialTokenBalanceItemId(),
        this.getProgressionCount(player, getSpecialTokenBalanceItemId()) + refundedSpecialTokens
      );
    }

    try {
      await this.saveProgressionInventoryChanges(player, changes);
      if (scope === "specials") this.clearActiveSpecialAbilityState(player);
      this.applyProgressionDerivedStats(player);
      this.sendProgressionSnapshot(player);
      client.send("progression_result", {
        success: true,
        message: scope === "abilities"
          ? "Abilities reset. Spent quest tokens were refunded as common tokens; Special Abilities were kept."
          : "Special Abilities reset. Their Special Ability tokens are available to choose again; core Abilities and science skills were kept."
      });
    } catch (error) {
      console.error("Failed to reset progression:", error);
      client.send("progression_result", {
        success: false,
        message: "The progression reset could not be saved."
      });
    }
  }

  handleUseSpecialAbility(client: Client, message?: { abilityKey?: string }) {
    const player = this.state.players.get(client.sessionId);
    const abilityKey = message?.abilityKey as SpecialAbilityKey;
    const definition = SPECIAL_ABILITY_DEFS[abilityKey];
    if (!player || !definition?.active || !this.hasSpecialAbility(player, abilityKey)) {
      client.send("progression_result", { success: false, message: "That active ability is not unlocked." });
      return;
    }
    const now = Date.now();
    const readyKey = `special_${abilityKey}_ready_at`;
    const readyAt = player.stationCooldowns.get(readyKey) || 0;
    if (readyAt > now) {
      client.send("progression_result", {
        success: false,
        message: `${Math.ceil((readyAt - now) / 1000)} seconds remain on that ability's cooldown.`
      });
      return;
    }
    player.stationCooldowns.set(readyKey, now + (ACTIVE_SPECIAL_COOLDOWNS_MS[abilityKey] || 60_000));
    if (abilityKey === "sprint") {
      player.stationCooldowns.set("special_sprint_effect_until", now + 3_000);
    } else if (abilityKey === "moxie") {
      player.stationCooldowns.set("special_moxie_effect_until", now + 5_000);
    } else if (abilityKey === "solar_charge") {
      player.stationCooldowns.set("special_solar_charge_effect_until", now + 10_000);
    }
    this.sendProgressionSnapshot(player);
    client.send("progression_result", { success: true, message: `${abilityKey.replace(/_/g, " ")} activated.` });
  }

  updatePlayerSpecialAbilityEffects(deltaTime: number) {
    const now = Date.now();
    const dt = Math.max(0, deltaTime / 1000);
    this.state.players.forEach((player) => {
      if ((player.stationCooldowns.get("special_moxie_effect_until") || 0) > now) {
        player.stamina = Math.min(player.maxStamina, player.stamina + 2 * dt);
      }
      if ((player.stationCooldowns.get("special_solar_charge_effect_until") || 0) > now) {
        player.health = Math.min(player.maxHealth, player.health + 2 * dt);
      }
    });
  }

  handleResourceQuestionAttempt(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const now = Date.now();
    const lastAttemptAt = player.stationCooldowns.get("resource_question_attempt_at") || 0;
    if (now - lastAttemptAt < 250) return;
    player.stationCooldowns.set("resource_question_attempt_at", now);
    player.stamina = Math.max(0, player.stamina - RESOURCE_QUESTION_OXYGEN_COST);
  }

  /*
  COLLECTION QUEST HELPERS
  ------------------------
  Communication nodes issue server-authoritative collection quests. The quest
  panel reports how many qualifying items are currently owned; completion uses
  an explicit, validated inventory selection at the requested rarity or higher.
  */
  getPlayerQuestStateKey(player: Player) {
    return `${player.userId}:${player.classId}`;
  }

  getPlayerCollectionQuests(player: Player) {
    const stateKey = this.getPlayerQuestStateKey(player);
    let quests = PLAYER_COLLECTION_QUESTS.get(stateKey);
    if (!quests) {
      quests = [];
      PLAYER_COLLECTION_QUESTS.set(stateKey, quests);
    }
    return quests;
  }

  sendQuestSnapshot(player: Player) {
    const client = this.clients.find((entry) => entry.sessionId === player.id);
    if (!client) return;
    client.send("quest_snapshot", {
      maxQuests: MAX_ACTIVE_QUESTS,
      quests: this.getPlayerCollectionQuests(player).map((quest) => {
        const eligibleInventoryCount = this.getQuestEligibleInventoryCount(player, quest);
        return {
          ...quest,
          progress: Math.min(quest.requiredCount, eligibleInventoryCount),
          eligibleInventoryCount,
          status:
            quest.status === "submitting"
              ? "submitting"
              : eligibleInventoryCount >= quest.requiredCount
                ? "ready"
                : "active"
        };
      })
    });
  }

  getQuestEligibleInventoryCount(player: Player, quest: RuntimeCollectionQuest) {
    let eligibleCount = 0;
    player.inventory.forEach((quantity, itemId) => {
      const [baseItemKey, qualityName] = String(itemId).split(":");
      if (baseItemKey !== quest.resourceKey) return;
      if (!(qualityName in ITEM_QUALITY_RANK)) return;
      const quality = qualityName as ItemQuality;
      if (ITEM_QUALITY_RANK[quality] < ITEM_QUALITY_RANK[quest.minimumQuality]) return;
      eligibleCount += Math.max(0, Number(quantity) || 0);
    });
    return eligibleCount;
  }

  rollQuestRewardQuality(): ItemQuality {
    const roll = Math.random();
    if (roll < 0.52) return "common";
    if (roll < 0.79) return "uncommon";
    if (roll < 0.93) return "rare";
    if (roll < 0.99) return "epic";
    return "legendary";
  }

  createCommunicationQuest(player: Player) {
    const quests = this.getPlayerCollectionQuests(player);
    if (quests.length >= MAX_ACTIVE_QUESTS) return null;

    const resourceOptions: Array<{
      key: RuntimeCollectionQuest["resourceKey"];
      label: string;
    }> = [
      { key: "rock_sample", label: "mineral samples" },
      { key: "water_sample", label: "water samples" },
      { key: "plant_sample", label: "plant samples" },
      { key: "herbivore_specimen", label: "animal specimens" }
    ];
    const resource = resourceOptions[Math.floor(Math.random() * resourceOptions.length)];
    const rewardQuality = this.rollQuestRewardQuality();
    const taskOptions: Record<ItemQuality, Array<{
      minimumQuality: ItemQuality;
      countRange: [number, number];
    }>> = {
      common: [
        { minimumQuality: "common", countRange: [3, 5] }
      ],
      uncommon: [
        { minimumQuality: "uncommon", countRange: [3, 5] },
        { minimumQuality: "common", countRange: [6, 8] },
        { minimumQuality: "rare", countRange: [1, 2] }
      ],
      rare: [
        { minimumQuality: "rare", countRange: [3, 5] },
        { minimumQuality: "uncommon", countRange: [6, 8] },
        { minimumQuality: "epic", countRange: [1, 2] }
      ],
      epic: [
        { minimumQuality: "epic", countRange: [3, 5] },
        { minimumQuality: "rare", countRange: [6, 8] },
        { minimumQuality: "legendary", countRange: [1, 2] }
      ],
      legendary: [
        { minimumQuality: "legendary", countRange: [3, 5] },
        { minimumQuality: "epic", countRange: [6, 8] }
      ]
    };
    const rewardTaskOptions = taskOptions[rewardQuality];
    const task = rewardTaskOptions[Math.floor(Math.random() * rewardTaskOptions.length)];
    const [minimumCount, maximumCount] = task.countRange;
    const requiredCount = minimumCount + Math.floor(
      Math.random() * (maximumCount - minimumCount + 1)
    );
    const quest: RuntimeCollectionQuest = {
      id: `quest:${player.userId}:${Date.now()}:${Math.floor(Math.random() * 1000000)}`,
      resourceKey: resource.key,
      resourceLabel: resource.label,
      minimumQuality: task.minimumQuality,
      requiredCount,
      progress: 0,
      rewardQuality,
      status: "active",
      createdAtEpochMs: Date.now()
    };
    quests.push(quest);
    return quest;
  }

  recordQuestCollection(
    player: Player,
    baseItemKey: string,
    _quality: ItemQuality,
    _quantity: number
  ) {
    const hasMatchingQuest = this.getPlayerCollectionQuests(player).some(
      (quest) => quest.resourceKey === baseItemKey
    );
    if (hasMatchingQuest) this.sendQuestSnapshot(player);
  }

  handleQuestDiscard(client: Client, message?: { questId?: string }) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const quests = this.getPlayerCollectionQuests(player);
    const questIndex = quests.findIndex((entry) => entry.id === message?.questId);
    const quest = questIndex >= 0 ? quests[questIndex] : null;
    if (!quest || quest.status === "submitting") {
      client.send("quest_discard_result", {
        success: false,
        questId: message?.questId || "",
        message: "That quest cannot be discarded."
      });
      return;
    }

    quests.splice(questIndex, 1);
    this.sendQuestSnapshot(player);
    client.send("quest_discard_result", {
      success: true,
      questId: quest.id,
      message: "Quest discarded."
    });
  }

  async handleQuestCompletion(
    client: Client,
    message?: {
      questId?: string;
      items?: Array<{ itemId?: string; quantity?: number }>;
    }
  ) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const quests = this.getPlayerCollectionQuests(player);
    const quest = quests.find((entry) => entry.id === message?.questId);
    if (!quest || quest.status === "submitting") {
      client.send("quest_turn_in_result", {
        success: false,
        questId: message?.questId || "",
        message: "That quest is not available for turn-in."
      });
      client.send("interaction_result", {
        success: false,
        message: "That quest is not available for turn-in."
      });
      return;
    }

    const selectedItems = new Map<string, number>();
    for (const entry of Array.isArray(message?.items) ? message.items : []) {
      const itemId = String(entry?.itemId || "").trim();
      const quantity = Number(entry?.quantity);
      if (!itemId || !Number.isInteger(quantity) || quantity <= 0) continue;
      selectedItems.set(itemId, (selectedItems.get(itemId) || 0) + quantity);
    }

    let selectedCount = 0;
    for (const [itemId, quantity] of selectedItems) {
      const [baseItemKey, qualityName] = itemId.split(":");
      const validQuality = qualityName in ITEM_QUALITY_RANK;
      const quality = validQuality ? qualityName as ItemQuality : null;
      const availableQuantity = Math.max(0, player.inventory.get(itemId) || 0);
      if (
        baseItemKey !== quest.resourceKey ||
        !quality ||
        ITEM_QUALITY_RANK[quality] < ITEM_QUALITY_RANK[quest.minimumQuality] ||
        quantity > availableQuantity
      ) {
        client.send("quest_turn_in_result", {
          success: false,
          questId: quest.id,
          message: "The selected inventory items no longer meet this quest's requirements."
        });
        return;
      }
      selectedCount += quantity;
    }

    if (selectedCount !== quest.requiredCount) {
      client.send("quest_turn_in_result", {
        success: false,
        questId: quest.id,
        message: `Select exactly ${quest.requiredCount} eligible items.`
      });
      return;
    }

    const tokenItemId = buildInventoryItemId("comm_quest_token", quest.rewardQuality);
    const nextInventory = new Map<string, number>();
    player.inventory.forEach((quantity, itemId) => {
      nextInventory.set(itemId, Math.max(0, Number(quantity) || 0));
    });
    selectedItems.forEach((quantity, itemId) => {
      nextInventory.set(itemId, Math.max(0, (nextInventory.get(itemId) || 0) - quantity));
    });
    nextInventory.set(tokenItemId, (nextInventory.get(tokenItemId) || 0) + 1);
    const scienceSkillKey = getScienceSkillForResource(quest.resourceKey);
    const skillItemId = scienceSkillKey ? getSkillItemId(scienceSkillKey) : null;
    const skillRarityItemId = scienceSkillKey
      ? getSkillRarityItemId(scienceSkillKey, quest.rewardQuality)
      : null;
    const skillPoints = QUEST_SKILL_POINTS_BY_QUALITY[quest.rewardQuality];
    if (skillItemId) {
      nextInventory.set(skillItemId, (nextInventory.get(skillItemId) || 0) + skillPoints);
    }
    if (skillRarityItemId) {
      nextInventory.set(
        skillRarityItemId,
        (nextInventory.get(skillRarityItemId) || 0) + 1
      );
    }
    const completedQuestsItemId = getCompletedQuestsItemId();
    const previousCompletedQuests = this.getProgressionCount(player, completedQuestsItemId);
    const nextCompletedQuests = previousCompletedQuests + 1;
    const specialTokensEarnedItemId = getSpecialTokensEarnedItemId();
    const specialTokenBalanceItemId = getSpecialTokenBalanceItemId();
    const previousSpecialTokensEarned = Math.max(
      this.getProgressionCount(player, specialTokensEarnedItemId),
      getSpecialTokensEarnedForQuestCount(previousCompletedQuests),
      this.getUnlockedSpecialAbilityCount(player)
    );
    const nextSpecialTokensEarned = Math.max(
      previousSpecialTokensEarned,
      getSpecialTokensEarnedForQuestCount(nextCompletedQuests)
    );
    const awardedSpecialTokenCount = nextSpecialTokensEarned - previousSpecialTokensEarned;
    const awardedSpecialToken = awardedSpecialTokenCount > 0;
    nextInventory.set(completedQuestsItemId, nextCompletedQuests);
    nextInventory.set(specialTokensEarnedItemId, nextSpecialTokensEarned);
    nextInventory.set(
      specialTokenBalanceItemId,
      (nextInventory.get(specialTokenBalanceItemId) || 0) + awardedSpecialTokenCount
    );

    let awardedAlienArtifact = Math.random() < ALIEN_ARTIFACT_QUEST_DROP_CHANCE;
    if (awardedAlienArtifact) {
      nextInventory.set(
        ALIEN_ARTIFACT_ITEM_ID,
        (nextInventory.get(ALIEN_ARTIFACT_ITEM_ID) || 0) + 1
      );
    }

    const countResultingStacks = () => {
      let count = 0;
      nextInventory.forEach((quantity, itemId) => {
        if (quantity <= 0 || isVirtualProgressionItemId(itemId)) return;
        count += Math.ceil(quantity / getItemStackMax(itemId));
      });
      return count;
    };
    let resultingStackCount = countResultingStacks();
    if (awardedAlienArtifact && resultingStackCount > this.getPlayerInventorySlotCount(player)) {
      awardedAlienArtifact = false;
      nextInventory.set(
        ALIEN_ARTIFACT_ITEM_ID,
        Math.max(0, (nextInventory.get(ALIEN_ARTIFACT_ITEM_ID) || 0) - 1)
      );
      resultingStackCount = countResultingStacks();
    }
    if (resultingStackCount > this.getPlayerInventorySlotCount(player)) {
      client.send("quest_turn_in_result", {
        success: false,
        questId: quest.id,
        message: "There is not enough inventory space for the quest token."
      });
      return;
    }

    const astrobiologySkillItemId = awardedAlienArtifact
      ? getSkillItemId("astrobiology")
      : null;
    if (astrobiologySkillItemId) {
      nextInventory.set(
        astrobiologySkillItemId,
        (nextInventory.get(astrobiologySkillItemId) || 0) +
          ASTROBIOLOGY_ARTIFACT_COLLECTION_POINTS
      );
    }

    quest.status = "submitting";
    this.sendQuestSnapshot(player);

    try {
      const changedItemIds = new Set<string>([
        ...selectedItems.keys(),
        tokenItemId,
        ...(skillItemId ? [skillItemId] : []),
        ...(skillRarityItemId ? [skillRarityItemId] : []),
        completedQuestsItemId,
        specialTokensEarnedItemId,
        specialTokenBalanceItemId,
        ...(astrobiologySkillItemId ? [astrobiologySkillItemId] : []),
        ...(awardedAlienArtifact ? [ALIEN_ARTIFACT_ITEM_ID] : [])
      ]);
      const inventoryRows = [...changedItemIds].map((itemId) => ({
        user_id: player.userId,
        class_id: player.classId,
        item_id: itemId,
        quantity: Math.max(0, nextInventory.get(itemId) || 0)
      }));
      const { error } = await supabaseAdmin.from("inventories").upsert(inventoryRows, {
        onConflict: "user_id,class_id,item_id"
      });
      if (error) throw error;

      changedItemIds.forEach((itemId) => {
        const quantity = Math.max(0, nextInventory.get(itemId) || 0);
        if (quantity > 0) player.inventory.set(itemId, quantity);
        else player.inventory.delete(itemId);
      });

      quests.splice(quests.indexOf(quest), 1);
      this.sendQuestSnapshot(player);
      this.sendProgressionSnapshot(player);
      client.send("quest_turn_in_result", {
        success: true,
        questId: quest.id,
        itemKey: tokenItemId,
        artifactAwarded: awardedAlienArtifact,
        artifactItemKey: awardedAlienArtifact ? ALIEN_ARTIFACT_ITEM_ID : "",
        message: `Quest complete. Received one ${quest.rewardQuality} quest token${scienceSkillKey ? ` and ${skillPoints} ${scienceSkillKey} point${skillPoints === 1 ? "" : "s"}` : ""}${awardedSpecialToken ? " and one Special Ability token" : ""}${awardedAlienArtifact ? `, one Alien Artifact, and ${ASTROBIOLOGY_ARTIFACT_COLLECTION_POINTS} Astrobiology point` : ""}.`
      });
      client.send("interaction_result", {
        success: true,
        message: `Quest transmitted. Received one ${quest.rewardQuality} quest token${scienceSkillKey ? ` and ${skillPoints} ${scienceSkillKey} point${skillPoints === 1 ? "" : "s"}` : ""}${awardedSpecialToken ? " and one Special Ability token" : ""}${awardedAlienArtifact ? `, one Alien Artifact, and ${ASTROBIOLOGY_ARTIFACT_COLLECTION_POINTS} Astrobiology point` : ""}.`
      });
    } catch (error) {
      quest.status = "active";
      this.sendQuestSnapshot(player);
      client.send("quest_turn_in_result", {
        success: false,
        questId: quest.id,
        message: "The quest items could not be transmitted. Nothing was removed."
      });
    }
  }

    /*
  INVENTORY REWARD HELPERS
  ------------------------
  Purpose:
  Enforce 12-slot inventory capacity with 10-per-stack rules on the server.

  Rules:
  - each unique item_id can span multiple stacks
  - each stack holds max 10
  - total stack count across all items cannot exceed 12
  - if no space exists, collection fails
  */

  getInventoryStackUsage(player: Player) {
    let usedStacks = 0;

    player.inventory.forEach((quantity, itemId) => {
      const count = Math.max(0, Number(quantity) || 0);
      if (count <= 0 || isVirtualProgressionItemId(itemId)) return;

      const stackMax = getItemStackMax(itemId);
      usedStacks += Math.ceil(count / stackMax);
    });

    return usedStacks;
  }

  canAddInventoryItem(
    player: Player,
    itemId: string,
    quantity: number
  ) {
    if (quantity <= 0) return true;
    if (isVirtualProgressionItemId(itemId)) return true;

    const stackMax = getItemStackMax(itemId);
    const currentCount = Math.max(0, player.inventory.get(itemId) || 0);
    const currentStacksForItem = currentCount > 0
      ? Math.ceil(currentCount / stackMax)
      : 0;

    const nextCount = currentCount + quantity;
    const nextStacksForItem = Math.ceil(nextCount / stackMax);

    const additionalStacksNeeded = nextStacksForItem - currentStacksForItem;
    const usedStacks = this.getInventoryStackUsage(player);

    return usedStacks + additionalStacksNeeded <= this.getPlayerInventorySlotCount(player);
  }

  async saveSingleInventoryItem(
    player: Player,
    itemId: string,
    quantity: number
  ) {
    if (quantity <= 0) {
      player.inventory.delete(itemId);

      const { error } = await supabaseAdmin
        .from("inventories")
        .delete()
        .eq("user_id", player.userId)
        .eq("class_id", player.classId)
        .eq("item_id", itemId);

      if (error) {
        throw error;
      }

      return;
    }

    player.inventory.set(itemId, quantity);

    const { error } = await supabaseAdmin.from("inventories").upsert({
      user_id: player.userId,
      class_id: player.classId,
      item_id: itemId,
      quantity
    });

    if (error) {
      throw error;
    }
  }

  async awardInventoryItem(
    player: Player,
    {
      baseItemKey,
      quality,
      quantity
    }: {
      baseItemKey: string;
      quality: ItemQuality;
      quantity: number;
    }
  ) {
    const itemId = buildInventoryItemId(baseItemKey, quality);

    if (!this.canAddInventoryItem(player, itemId, quantity)) {
      throw new Error("Inventory full");
    }

    const currentCount = player.inventory.get(itemId) || 0;
    const nextCount = currentCount + quantity;

    try {
      await this.saveSingleInventoryItem(player, itemId, nextCount);
    } catch (error) {
      if (currentCount <= 0) {
        player.inventory.delete(itemId);
      } else {
        player.inventory.set(itemId, currentCount);
      }

      throw error;
    }

    this.recordQuestCollection(player, baseItemKey, quality, quantity);

    return {
      itemId,
      itemLabel: getInventoryItemLabel(baseItemKey, quality)
    };
  }

  async removeInventoryItem(
    player: Player,
    itemId: string,
    quantity: number
  ) {
    const currentCount = Math.max(0, player.inventory.get(itemId) || 0);

    if (currentCount < quantity || quantity <= 0) {
      throw new Error("Not enough items");
    }

    const nextCount = currentCount - quantity;

    try {
      await this.saveSingleInventoryItem(player, itemId, nextCount);
    } catch (error) {
      player.inventory.set(itemId, currentCount);
      throw error;
    }

    this.sendQuestSnapshot(player);

    return {
      itemId,
      quantityRemoved: quantity,
      quantityRemaining: nextCount
    };
  }

  async handleInventoryItemDelete(client: Client, message?: { itemId?: string }) {
    const player = this.state.players.get(client.sessionId);
    const itemId = String(message?.itemId || "").trim();
    if (!player || !itemId || isVirtualProgressionItemId(itemId)) {
      client.send("inventory_delete_result", {
        success: false,
        itemId,
        message: "That inventory item cannot be deleted."
      });
      return;
    }

    try {
      const result = await this.removeInventoryItem(player, itemId, 1);
      client.send("inventory_delete_result", {
        success: true,
        ...result,
        message: "Deleted one inventory item."
      });
    } catch (error) {
      client.send("inventory_delete_result", {
        success: false,
        itemId,
        message: "That item is no longer available to delete."
      });
    }
  }

  clearExpiredPlayerActionAnimations() {
    const now = Date.now();

    this.state.players.forEach((player) => {
      if (player.actionUntilEpochMs > 0 && now >= player.actionUntilEpochMs) {
        player.actionName = "";
        player.actionDirection = "";
        player.actionUntilEpochMs = 0;
      }
    });
  }

  /*
  ROOM CREATE HANDLER
  -------------------
  Purpose:
  Sets up room message handlers and starts the movement simulation loop.

  Flow:
  1. Routes movement input to the movement input handler.
  2. Routes chat messages to the chat/admin command handler.
  3. Routes station interactions to the station interaction handler.
  4. Allows admin layout saves for the current room.
  5. Starts the player movement simulation loop.
  */
  onCreate(options: { mapKey?: string } = {}) {
    this.currentMapKey = options.mapKey?.trim() || DEFAULT_MAP_KEY;
    console.log("ClassRoom created", { mapKey: this.currentMapKey });

    this.onMessage(
      "input",
      (
        client,
        message: {
          left: boolean;
          right: boolean;
          up: boolean;
          down: boolean;
          speedScale?: number;
          editorMode?: boolean;
        }
      ) => {
        this.handleMovementInput(client, message);
      }
    );

    this.onMessage("chat", async (client, message: { text?: string }) => {
      await this.handleChatMessage(client, message);
    });

    this.onMessage("complete_quest", async (
      client,
      message: {
        questId?: string;
        items?: Array<{ itemId?: string; quantity?: number }>;
      }
    ) => {
      await this.handleQuestCompletion(client, message);
    });

    this.onMessage("discard_quest", (client, message: { questId?: string }) => {
      this.handleQuestDiscard(client, message);
    });

    this.onMessage("delete_inventory_item", async (client, message: { itemId?: string }) => {
      await this.handleInventoryItemDelete(client, message);
    });

    this.onMessage("summon_alien_artifact", async (client) => {
      await this.handleSummonAlienArtifact(client);
    });

    this.onMessage("request_player_profile", (client, message: { playerId?: string }) => {
      this.handleRequestPlayerProfile(client, message);
    });

    this.onMessage("set_trade_settings", async (client, message: { enabled?: boolean }) => {
      await this.handleSetTradeSettings(client, message);
    });

    this.onMessage("request_trade", (client, message: { targetPlayerId?: string }) => {
      this.handleTradeRequest(client, message);
    });

    this.onMessage("respond_trade_request", (
      client,
      message: { requestId?: string; accepted?: boolean }
    ) => {
      this.handleTradeRequestResponse(client, message);
    });

    this.onMessage("trade_offer_update", (
      client,
      message: { tradeId?: string; itemId?: string; delta?: number }
    ) => {
      this.handleTradeOfferUpdate(client, message);
    });

    this.onMessage("trade_accept", (client, message: { tradeId?: string }) => {
      this.handleTradeAccept(client, message);
    });

    this.onMessage("trade_confirm", async (
      client,
      message: { tradeId?: string; accepted?: boolean }
    ) => {
      await this.handleTradeConfirmation(client, message);
    });

    this.onMessage("trade_cancel", (client, message: { tradeId?: string }) => {
      this.handleTradeCancel(client, message);
    });

    this.onMessage("purchase_ability", async (client, message: { abilityKey?: string }) => {
      await this.handlePurchaseCoreAbility(client, message);
    });

    this.onMessage("unlock_special_ability", async (client, message: { abilityKey?: string }) => {
      await this.handleUnlockSpecialAbility(client, message);
    });

    this.onMessage("use_special_ability", (client, message: { abilityKey?: string }) => {
      this.handleUseSpecialAbility(client, message);
    });

    this.onMessage("request_progression_snapshot", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) this.sendProgressionSnapshot(player);
    });

    this.onMessage("resource_question_attempt", (client) => {
      this.handleResourceQuestionAttempt(client);
    });

    this.onMessage("set_mission_progress", (client, message: { position?: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.isAdmin) return;
      const position = Math.max(0, Math.min(36, Math.floor(Number(message?.position) || 0)));
      void saveClassMissionPosition(player.classId, position);
      this.broadcast("mission_progress", { position });
    });

    this.onMessage("set_learning_lab_context", (client, message: { unit?: string; chapter?: string; sphere?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const sphere = String(message?.sphere || "");
      if (!["Geosphere", "Atmosphere", "Hydrosphere", "Biosphere"].includes(sphere)) return;
      player.stationCooldowns.set(`learning_lab_sphere:${sphere}`, Date.now());
      client.send("interaction_result", { success: true, message: `${sphere} study expedition selected.` });
    });

    this.onMessage("request_learning_lab_quest", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const now = Date.now();
      const readyAt = player.stationCooldowns.get("learning_lab_quest_ready_at") || 0;
      if (readyAt > now) {
        client.send("interaction_result", { success: false, message: `Quest uplink recharging. Try again in ${Math.ceil((readyAt - now) / 1000)} seconds.` });
        return;
      }
      const quest = this.createCommunicationQuest(player);
      if (!quest) {
        client.send("interaction_result", { success: false, message: `Quest log full. Complete one of your ${MAX_ACTIVE_QUESTS} active quests first.` });
        return;
      }
      player.stationCooldowns.set("learning_lab_quest_ready_at", now + COLLECTABLE_NODE_RESPAWN_MS);
      this.sendQuestSnapshot(player);
      client.send("quest_acquired", quest);
      client.send("interaction_result", { success: true, message: `New quest: collect ${quest.requiredCount} ${quest.minimumQuality} or higher ${quest.resourceLabel}.` });
    });

    this.onMessage("complete_study_question", async (client, message: { sphere?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const now = Date.now();
      const lastAwardAt = player.stationCooldowns.get("study_question_award_at") || 0;
      if (now - lastAwardAt < 1000) return;
      player.stationCooldowns.set("study_question_award_at", now);
      const sphere = String(message?.sphere || "");
      const weightedResources: Record<string, string[]> = {
        Geosphere: ["rock_sample", "rock_sample", "rock_sample", "rock_sample", "plant_sample", "plant_sample", "plant_sample", "plant_sample", "water_sample", "herbivore_specimen"],
        Atmosphere: ["herbivore_specimen", "herbivore_specimen", "herbivore_specimen", "herbivore_specimen", "water_sample", "water_sample", "water_sample", "water_sample", "plant_sample", "rock_sample"],
        Hydrosphere: ["water_sample", "water_sample", "water_sample", "water_sample", "plant_sample", "plant_sample", "plant_sample", "plant_sample", "rock_sample", "herbivore_specimen"],
        Biosphere: ["plant_sample", "plant_sample", "plant_sample", "plant_sample", "herbivore_specimen", "herbivore_specimen", "herbivore_specimen", "herbivore_specimen", "water_sample", "rock_sample"]
      };
      const resourcePool = weightedResources[sphere];
      if (!resourcePool) return;
      const baseItemKey = resourcePool[Math.floor(Math.random() * resourcePool.length)];
      const skillKey = getScienceSkillForResource(baseItemKey);
      const masterySteps = skillKey ? this.getScienceMasterySteps(player, skillKey) : 0;
      const quality = rollItemQualityForTier(1, masterySteps);
      try {
        const granted = await this.awardInventoryItem(player, { baseItemKey, quality, quantity: 1 });
        client.send("loot_feedback", {
          itemKey: granted.itemId,
          itemLabel: granted.itemLabel,
          quality,
          resourceTier: 1,
          rarityChances: getItemQualityChancesForTier(1, masterySteps)
        });
        client.send("interaction_result", { success: true, message: `Correct answer: ${granted.itemLabel} added to inventory.` });
        this.sendQuestSnapshot(player);
      } catch (error) {
        client.send("interaction_result", { success: false, message: error instanceof Error ? error.message : "Could not award the study sample." });
      }
    });

    this.onMessage("reset_progression", async (client, message: { scope?: string }) => {
      await this.handleResetProgression(client, message);
    });

    this.onMessage(
  "interact",
  async (
    client,
    message?: {
      source?: string;
      action?: string;
      tileX?: number;
      tileY?: number;
      nodeId?: string;
      mobId?: string;
      artifactId?: string;
      selectedItemKey?: string;
    }
  ) => {
    if (message?.source === "action_center") {
      await this.handleActionCenterInteract(client, message);
      return;
    }

    if (message?.source === "collectable") {
      await this.handleCollectableInteract(client, message);
      return;
    }

    if (message?.source === "mob") {
  if (message?.action === "taser") {
    await this.handleMobCombatInteract(client, message);
    return;
  }

  if (message?.action === "collect_incapacitated_herbivore") {
    await this.handleIncapacitatedHerbivoreCollectInteract(client, message);
    return;
  }
}

    if (message?.source === "alien_artifact") {
      await this.handleAlienArtifactCombatInteract(client, message);
      return;
    }
  }
);
    this.onMessage(
      "save_layout",
      async (
        client,
        message: {
          base?: number[][];
          detail?: number[][];
          overhead?: number[][];
          objects?: number[][];
          metadata?: TilesetFrameMetadataRow[];
        }
      ) => {
        await this.handleSaveLayoutMessage(client, message);
      }
    );

    this.onMessage(
      "editor_tile_update",
      (
        client,
        message: {
          layer?: "base" | "detail" | "overhead" | "objects";
          tileX?: number;
          tileY?: number;
          frame?: number;
        }
      ) => {
        this.handleEditorTileUpdate(client, message);
      }
    );

    this.onMessage(
      "editor_metadata_update",
      (
        client,
        message: {
          frame_index?: number;
          collision?: boolean;
          animate?: boolean;
          action_center?: "craft" | "dig" | "mine" | "fish" | "comm" | null;
        }
      ) => {
        this.handleEditorMetadataUpdate(client, message);
      }
    );

    this.onMessage("request_map_transition", async (client) => {
      try {
        await this.handleRequestMapTransition(client);
      } catch (error) {
        console.error("Map transition request failed:", error);
        client.send("map_transition_result", {
          success: false,
          message: "The portal could not complete the map transition."
        });
      }
    });

    this.setSimulationInterval((deltaTime) => {
      this.updatePlayerSpecialAbilityEffects(deltaTime);
      this.updateAlienArtifactRegeneration();
      this.simulatePlayerMovement(deltaTime);
      this.updateRuntimeMobs(deltaTime);
      this.updateRuntimeCollectableNodes();
      this.broadcastRuntimeMobSnapshot();
      this.broadcastRuntimeCollectableSnapshot();
    });
  }

    /*
  MOVEMENT SIMULATION HANDLER
  ---------------------------
  Purpose:
  Updates player positions using server-authoritative movement each tick.

  Flow:
  1. Reads each player's movement flags.
  2. Calculates movement direction and diagonal normalization.
  3. Applies movement based on speed and delta time.
  4. Clamps players inside the room bounds.
  */
  simulatePlayerMovement(deltaTime: number) {
    const speed = 180;
    const dt = deltaTime / 1000;

    this.clearExpiredPlayerActionAnimations();

    this.state.players.forEach((player, sessionId) => {
      const previousX = player.x;
      const previousY = player.y;
      let dx = 0;
      let dy = 0;

      if (player.left) dx -= 1;
      if (player.right) dx += 1;
      if (player.up) dy -= 1;
      if (player.down) dy += 1;

      if (dx !== 0 && dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
      }

      const speedScale = this.playerInputSpeedScales.get(sessionId) ?? 1;
      const editorMode =
        !!player.isAdmin && !!this.playerInputEditorModes.get(sessionId);
      const editorSpeedMultiplier = editorMode ? 1.18 : 1;
      const oxygenMultiplier = player.stamina <= 0 ? 0.25 : 1;
      const sprintMultiplier =
        (player.stationCooldowns.get("special_sprint_effect_until") || 0) > Date.now()
          ? 1.3
          : 1;
      const movementMultiplier = oxygenMultiplier * sprintMultiplier;
      const nextX = player.x + dx * speed * speedScale * editorSpeedMultiplier * movementMultiplier * dt;
      const nextY = player.y + dy * speed * speedScale * editorSpeedMultiplier * movementMultiplier * dt;

      const bounds = this.getRoomWorldBounds();

      const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX - 1, nextX));
      const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY - 1, nextY));

      const canMoveX =
        editorMode || !this.isCollisionTileAtWorldPosition(clampedX, player.y);
      const canMoveY =
        editorMode || !this.isCollisionTileAtWorldPosition(player.x, clampedY);
      const canMoveXY =
        editorMode || !this.isCollisionTileAtWorldPosition(clampedX, clampedY);

      if (canMoveXY) {
        player.x = clampedX;
        player.y = clampedY;
      } else {
        if (canMoveX) {
          player.x = clampedX;
        }

        if (canMoveY) {
          player.y = clampedY;
        }
      }

      const movedDistance = this.getDistanceBetweenPoints(previousX, previousY, player.x, player.y);
      const oxygenDrainKey = "movement_oxygen_next_at";
      const now = Date.now();
      if (!editorMode && movedDistance > 0.01) {
        const nextDrainAt = player.stationCooldowns.get(oxygenDrainKey) || (now + MOVEMENT_OXYGEN_INTERVAL_MS);
        if (!player.stationCooldowns.has(oxygenDrainKey)) {
          player.stationCooldowns.set(oxygenDrainKey, nextDrainAt);
        } else if (now >= nextDrainAt) {
          player.stamina = Math.max(0, player.stamina - 1);
          player.stationCooldowns.set(oxygenDrainKey, now + MOVEMENT_OXYGEN_INTERVAL_MS);
        }
      } else {
        player.stationCooldowns.delete(oxygenDrainKey);
      }
    });
  }

  /*
  ACTION CENTER INTERACTION HANDLER
  ---------------------------------
  Purpose:
  Processes metadata-driven action center interactions and awards the correct
  item to the player's class-based inventory.

  Flow:
  1. Finds the player who sent the interact message.
  2. Validates the nearest action center and action payload.
  3. Checks the cooldown for that action.
  4. Starts the cooldown immediately to block spam.
  5. Increases the correct inventory item count.
  6. Saves the updated item count to Supabase.
  7. Reverts cooldown and inventory if the save fails.
  8. Sends a success or failure result back to the client.
  */
  async handleActionCenterInteract(
    client: Client,
    message: {
      action?: string;
      tileX?: number;
      tileY?: number;
      selectedItemKey?: string;
    }
  ) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const nearbyActionCenter = this.getNearestActionCenterForPlayer(player);

    if (!nearbyActionCenter) {
      client.send("interaction_result", {
        success: false,
        message: "You are too far away from an action center."
      });
      return;
    }

    if (
      nearbyActionCenter.tileX !== message?.tileX ||
      nearbyActionCenter.tileY !== message?.tileY ||
      nearbyActionCenter.action !== message?.action
    ) {
      client.send("interaction_result", {
        success: false,
        message: "That action center is no longer valid."
      });
      return;
    }

    const action = nearbyActionCenter.action;

    if (action === "mine" || action === "dig" || action === "fish" || action === "comm") {
      client.send("interaction_result", {
        success: false,
        message:
          action === "comm"
            ? "This tile is a communication spawn location. Wait for an active communication node."
            : "This tile is a resource spawn location. Harvest the live node when one appears."
      });
      return;
    }

    const actionDirection = this.getActionFacingDirectionTowardTile(
      player,
      nearbyActionCenter.tileX,
      nearbyActionCenter.tileY
    );

    const ACTION_REWARDS: Record<string, {
      baseItemKey: string;
      message: string;
      cooldownKey: string;
      cooldownMs: number;
      useQualityRoll: boolean;
      tier: number;
    }> = {
      craft: {
        baseItemKey: "",
        message: "crafted using one selected item.",
        cooldownKey: "action_craft",
        cooldownMs: 3000,
        useQualityRoll: false,
        tier: 1
      },
      mine: {
        baseItemKey: "rock_sample",
        message: "mined a rock sample.",
        cooldownKey: "action_mine",
        cooldownMs: 3000,
        useQualityRoll: true,
        tier: 1
      },
      dig: {
        baseItemKey: "plant_sample",
        message: "dug up a plant sample.",
        cooldownKey: "action_dig",
        cooldownMs: 3000,
        useQualityRoll: true,
        tier: 1
      },
      fish: {
        baseItemKey: "water_sample",
        message: "collected a water sample.",
        cooldownKey: "action_fish",
        cooldownMs: 3000,
        useQualityRoll: true,
        tier: 1
      },
      comm: {
        baseItemKey: "mission_badge",
        message: "completed a communication task.",
        cooldownKey: "action_comm",
        cooldownMs: 3000,
        useQualityRoll: false,
        tier: 1
      }
    };

    const reward = ACTION_REWARDS[action];

    if (!reward) {
      client.send("interaction_result", {
        success: false,
        message: `Unknown action: ${action}`
      });
      return;
    }

    const now = Date.now();
    const lastUsedAt = player.stationCooldowns.get(reward.cooldownKey) || 0;
    const cooldownRemaining = reward.cooldownMs - (now - lastUsedAt);

    if (cooldownRemaining > 0) {
      const seconds = Math.ceil(cooldownRemaining / 1000);

      client.send("interaction_result", {
        success: false,
        message: `${action} is recharging. Try again in ${seconds}s.`
      });
      return;
    }

    player.stationCooldowns.set(reward.cooldownKey, now);
    this.startPlayerActionAnimation(player, action, actionDirection);

    if (action === "craft") {
      const selectedItemKey = message?.selectedItemKey?.trim();

      if (!selectedItemKey) {
        player.stationCooldowns.set(reward.cooldownKey, lastUsedAt);

        client.send("interaction_result", {
          success: false,
          message: "Select an inventory item before crafting."
        });
        return;
      }

      const selectedCount = player.inventory.get(selectedItemKey) || 0;

      if (selectedCount <= 0) {
        player.stationCooldowns.set(reward.cooldownKey, lastUsedAt);

        client.send("interaction_result", {
          success: false,
          message: "That selected item is no longer in your inventory."
        });
        return;
      }

      const [selectedBaseItemKey, selectedQualityName] = selectedItemKey.split(":");
      const rechargeItems = new Set([
        "rock_sample",
        "water_sample",
        "plant_sample",
        "herbivore_specimen"
      ]);
      if (!rechargeItems.has(selectedBaseItemKey) || !(selectedQualityName in ITEM_QUALITY_RANK)) {
        player.stationCooldowns.set(reward.cooldownKey, lastUsedAt);
        client.send("interaction_result", {
          success: false,
          message: "Select a mineral, water, plant, or animal specimen to recharge."
        });
        return;
      }

      if (player.stamina >= player.maxStamina && player.health >= player.maxHealth) {
        player.stationCooldowns.set(reward.cooldownKey, lastUsedAt);
        client.send("interaction_result", {
          success: false,
          message: "Oxygen and energy storage are already full."
        });
        return;
      }

      const rechargeByQuality: Record<ItemQuality, number> = {
        common: 10,
        uncommon: 25,
        rare: 50,
        epic: 75,
        legendary: 100
      };
      const rechargeAmount = rechargeByQuality[selectedQualityName as ItemQuality];

      try {
        await this.removeInventoryItem(player, selectedItemKey, 1);

        player.stamina = Math.min(player.maxStamina, player.stamina + rechargeAmount);
        player.health = Math.min(player.maxHealth, player.health + rechargeAmount);

        client.send("interaction_result", {
          success: true,
          message: `${player.name} converted one ${selectedQualityName} specimen into ${rechargeAmount} oxygen and ${rechargeAmount} energy.`
        });
      } catch (error) {
        console.error("Failed to remove crafted item:", error);

        player.stationCooldowns.set(reward.cooldownKey, lastUsedAt);

        client.send("interaction_result", {
          success: false,
          message: "Crafting could not remove the selected item."
        });
      }

      return;
    }

    const rewardSkillKey = getScienceSkillForResource(reward.baseItemKey);
    const rewardMasterySteps = rewardSkillKey
      ? this.getScienceMasterySteps(player, rewardSkillKey)
      : 0;
    const rolledQuality: ItemQuality =
      reward.useQualityRoll
        ? rollItemQualityForTier(reward.tier, rewardMasterySteps)
        : "common";

    try {
      const granted = await this.awardInventoryItem(player, {
        baseItemKey: reward.baseItemKey,
        quality: rolledQuality,
        quantity: 1
      });

      const isResourceCollectionAction =
        action === "mine" || action === "dig" || action === "fish";
      const resourceKind =
        action === "mine"
          ? "rock"
          : action === "fish"
            ? "pond"
            : "plant";

      client.send("loot_feedback", {
        itemKey: granted.itemId,
        itemLabel: granted.itemLabel,
        ...(isResourceCollectionAction
          ? {
              presentation: "resource_wheel",
              resourceKind,
              resourceTier: reward.tier,
              quality: rolledQuality,
              cooldownMs: reward.cooldownMs,
              rarityChances: getItemQualityChancesForTier(reward.tier, rewardMasterySteps)
            }
          : {})
      });

      client.send("interaction_result", {
        success: true,
        message: `${player.name} ${reward.message} ${granted.itemLabel}.`
      });
    } catch (error) {
      console.error("Failed to save inventory:", error);

      player.stationCooldowns.set(reward.cooldownKey, lastUsedAt);

      client.send("interaction_result", {
        success: false,
        message:
          error instanceof Error && error.message === "Inventory full"
            ? "Your inventory is full."
            : "Action succeeded, but inventory could not be saved."
      });
    }
  }

  /*
  CHAT MESSAGE HANDLER
  --------------------
  Purpose:
  Processes player chat messages and routes slash commands to the admin
  command handler.

  Flow:
  1. Reads the player's message text.
  2. Broadcasts normal chat messages to everyone in the room.
  3. Rejects slash commands for non-admin users.
  4. Routes admin commands to handleAdminCommand().
  */
  async handleChatMessage(client: Client, message: { text?: string }) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const text = message?.text?.trim();
    if (!text) return;

    const isAdmin = this.isAdminPlayer(player);

    if (!text.startsWith("/")) {
      const payload = {
        success: true,
        kind: "chat",
        message: `${player.name}: ${text}`
      };

      this.clients.forEach((roomClient) => {
        roomClient.send("chat_result", payload);
      });

      return;
    }

    if (!isAdmin) {
      client.send("chat_result", {
        success: false,
        kind: "error",
        message: "Only the admin account can use commands."
      });
      return;
    }

    await this.handleAdminCommand(client, player, text);
  }

  /*
  ADMIN PLAYER CHECK
  ------------------
  Purpose:
  Determines whether a player can use teacher/admin chat commands.

  Returns:
  - true if the player's authenticated join marked them as admin
  - false otherwise
  */
  isAdminPlayer(player: Player) {
    return !!player.isAdmin;
  }

  /*
  ADMIN COMMAND HANDLER
  ---------------------
  Purpose:
  Handles teacher/admin slash commands for managing students and classes.

  Supported commands:
  - /helpadmin
  - /announce message
  - /liststudents
  - /listclasses
  - /getclass studentprefix
  - /setclass studentprefix E3P1
  - /clearclass studentprefix
  */
  async handleAdminCommand(client: Client, player: Player, text: string) {
    const parts = text.split(/\s+/);
    const command = parts[0].toLowerCase();

    if (command === "/helpadmin") {
      client.send("chat_result", {
        success: true,
        kind: "success",
        message:
          "Admin shortcuts: T Tiles | Y Metadata | U Objects | K Save | Metadata tools: F6 Collision, F7 Layer (1 Base/2 Detail/3 Overhead/0 Clear), F8 Animate, F9 Action (1 Craft/2 Dig/3 Mine/4 Fish/5 Communicate/0 Clear). Commands: /helpadmin | /ecospeed 1-60 | /showesm | /announce message | /liststudents | /listclasses | /getclass studentprefix | /setclass studentprefix E3P1 | /clearclass studentprefix"
      });
      return;
    }

        if (command === "/showesm") {
      this.showEsmLabels = !this.showEsmLabels;

      this.broadcast("ecosystem_debug_settings", {
        showEsmLabels: this.showEsmLabels
      });

      client.send("chat_result", {
        success: true,
        kind: "success",
        message: `ESM labels ${this.showEsmLabels ? "ON" : "OFF"}.`
      });

      return;
    }

        if (command === "/ecospeed") {
      const requestedScale = Number(parts[1]);
      const safeScale = Math.max(1, Math.min(60, requestedScale || 1));

      this.ecosystemTimeScale = safeScale;

      client.send("chat_result", {
        success: true,
        kind: "success",
        message: `Ecosystem speed set to ${safeScale}x.`
      });

      return;
    }

    if (command === "/announce") {
      const announcementText = text.slice("/announce".length).trim();

      if (!announcementText) {
        client.send("chat_result", {
          success: false,
          kind: "error",
          message: "Usage: /announce message"
        });
        return;
      }

      const payload = {
        success: true,
        kind: "announcement",
        message: `📢 Teacher Announcement: ${announcementText}`
      };

      this.clients.forEach((roomClient) => {
        roomClient.send("chat_result", payload);
      });

      return;
    }

    if (command === "/liststudents") {
      const { data: profileRows, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("display_name")
        .order("display_name", { ascending: true })
        .limit(25);

      if (profileError || !profileRows?.length) {
        client.send("chat_result", {
          success: false,
          kind: "error",
          message: "No student profiles were found."
        });
        return;
      }

      const studentNames = profileRows
        .map((row) => row.display_name)
        .filter(Boolean)
        .join(", ");

      client.send("chat_result", {
        success: true,
        kind: "success",
        message: `Students: ${studentNames}`
      });

      return;
    }

    if (command === "/listclasses") {
      const { data: classRows, error: classError } = await supabaseAdmin
        .from("classes")
        .select("class_code, class_name")
        .order("class_code", { ascending: true });

      if (classError || !classRows?.length) {
        client.send("chat_result", {
          success: false,
          kind: "error",
          message: "No classes were found."
        });
        return;
      }

      const classList = classRows
        .map((row) => `${row.class_code} = ${row.class_name}`)
        .join(", ");

      client.send("chat_result", {
        success: true,
        kind: "success",
        message: `Classes: ${classList}`
      });

      return;
    }

    if (command === "/getclass") {
      const studentKey = parts[1]?.trim().toLowerCase();

      if (!studentKey) {
        client.send("chat_result", {
          success: false,
          kind: "error",
          message: "Usage: /getclass studentemailprefix"
        });
        return;
      }

      const matchedProfile = await this.findStudentProfileByKey(studentKey);

      if (!matchedProfile) {
        client.send("chat_result", {
          success: false,
          kind: "error",
          message: `Student "${studentKey}" was not found.`
        });
        return;
      }

      const currentClass = await this.getStudentAssignedClass(matchedProfile.user_id);

      if (!currentClass) {
        client.send("chat_result", {
          success: true,
          kind: "success",
          message: `${matchedProfile.display_name} has no class assigned.`
        });
        return;
      }

      client.send("chat_result", {
        success: true,
        kind: "success",
        message: `${matchedProfile.display_name} is assigned to ${currentClass.class_name} (${currentClass.class_code}).`
      });

      return;
    }

    if (command === "/setclass") {
      const studentKey = parts[1]?.trim().toLowerCase();
      const classCode = parts[2]?.trim().toUpperCase();

      if (!studentKey || !classCode) {
        client.send("chat_result", {
          success: false,
          kind: "error",
          message: "Usage: /setclass studentemailprefix E3P1"
        });
        return;
      }

      const matchedProfile = await this.findStudentProfileByKey(studentKey);

      if (!matchedProfile) {
        client.send("chat_result", {
          success: false,
          kind: "error",
          message: `Student "${studentKey}" was not found.`
        });
        return;
      }

      const classRow = await this.findClassByCode(classCode);

      if (!classRow) {
        client.send("chat_result", {
          success: false,
          kind: "error",
          message: `Class code "${classCode}" was not found.`
        });
        return;
      }

      const previousClass = await this.getStudentAssignedClass(matchedProfile.user_id);

      const previousClassLabel = previousClass
        ? `${previousClass.class_name} (${previousClass.class_code})`
        : "no class";

      const newClassLabel = `${classRow.class_name} (${classRow.class_code})`;

      if (previousClass?.class_id === classRow.class_id) {
        client.send("chat_result", {
          success: true,
          kind: "success",
          message: `${matchedProfile.display_name} is already assigned to ${newClassLabel}.`
        });
        return;
      }

      const assignmentSucceeded = await this.assignStudentToClass(
        matchedProfile.user_id,
        classRow.class_id
      );

      if (!assignmentSucceeded) {
        client.send("chat_result", {
          success: false,
          kind: "error",
          message: "Could not assign the student to that class."
        });
        return;
      }

      client.send("chat_result", {
        success: true,
        kind: "success",
        message: `${matchedProfile.display_name} moved from ${previousClassLabel} to ${newClassLabel}.`
      });

      console.log("ADMIN SET CLASS:", {
        adminUserId: player.userId,
        studentUserId: matchedProfile.user_id,
        studentName: matchedProfile.display_name,
        previousClass: previousClassLabel,
        newClass: newClassLabel
      });

      return;
    }

    if (command === "/clearclass") {
      const studentKey = parts[1]?.trim().toLowerCase();

      if (!studentKey) {
        client.send("chat_result", {
          success: false,
          kind: "error",
          message: "Usage: /clearclass studentemailprefix"
        });
        return;
      }

      const matchedProfile = await this.findStudentProfileByKey(studentKey);

      if (!matchedProfile) {
        client.send("chat_result", {
          success: false,
          kind: "error",
          message: `Student "${studentKey}" was not found.`
        });
        return;
      }

      const previousClass = await this.getStudentAssignedClass(matchedProfile.user_id);

      if (!previousClass) {
        client.send("chat_result", {
          success: true,
          kind: "success",
          message: `${matchedProfile.display_name} already has no class assigned.`
        });
        return;
      }

      const { error: deleteError } = await supabaseAdmin
        .from("class_memberships")
        .delete()
        .eq("user_id", matchedProfile.user_id);

      if (deleteError) {
        client.send("chat_result", {
          success: false,
          kind: "error",
          message: "Could not clear the student's class assignment."
        });
        return;
      }

      const previousClassLabel = `${previousClass.class_name} (${previousClass.class_code})`;

      client.send("chat_result", {
        success: true,
        kind: "success",
        message: `${matchedProfile.display_name} was removed from ${previousClassLabel}.`
      });

      console.log("ADMIN CLEAR CLASS:", {
        adminUserId: player.userId,
        studentUserId: matchedProfile.user_id,
        studentName: matchedProfile.display_name,
        removedClass: previousClassLabel
      });

      return;
    }

    client.send("chat_result", {
      success: false,
      kind: "error",
      message: `Unknown command: ${command}. Try /helpadmin`
    });
  }

    /*
  STUDENT CLASS ASSIGNMENT WRITER
  -------------------------------
  Purpose:
  Replaces any existing class assignment for a student with a new class.

  Returns:
  - true if the assignment succeeded
  - false if the assignment failed
  */
  async assignStudentToClass(userId: string, classId: string) {
    const { error: deleteError } = await supabaseAdmin
      .from("class_memberships")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      return false;
    }

    const { error: insertError } = await supabaseAdmin
      .from("class_memberships")
      .insert({
        user_id: userId,
        class_id: classId,
        role: "student"
      });

    if (insertError) {
      return false;
    }

    return true;
  }

    /*
  STUDENT PROFILE LOOKUP
  ----------------------
  Purpose:
  Finds a student profile by the display name key used in admin chat
  commands, such as an email prefix.

  Returns:
  - the matching profile row if found
  - null if not found
  */
  async findStudentProfileByKey(studentKey: string) {
    const { data: profileRows, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name")
      .limit(100);

    if (profileError || !profileRows?.length) {
      return null;
    }

    const matchedProfile = profileRows.find((row) => {
      const displayName = (row.display_name || "").toLowerCase().trim();
      return displayName === studentKey;
    });

    return matchedProfile || null;
  }

    /*
  STUDENT CLASS LOOKUP
  --------------------
  Purpose:
  Finds the class currently assigned to a student user.

  Returns:
  - the assigned class row if found
  - null if the student has no class assignment
  */
  async getStudentAssignedClass(userId: string) {
    const { data: membershipRows, error: membershipError } = await supabaseAdmin
      .from("class_memberships")
      .select(`
        class_id,
        classes (
          class_id,
          class_code,
          class_name
        )
      `)
      .eq("user_id", userId);

    if (membershipError || !membershipRows?.length) {
      return null;
    }

    const membership = membershipRows[0];
    const classRow = Array.isArray(membership?.classes)
      ? membership.classes[0]
      : membership?.classes || null;

    return classRow || null;
  }

  /*
  CLASS LOOKUP BY CODE
  --------------------
  Purpose:
  Finds a class row using a class code such as E3P1.

  Returns:
  - the matching class row if found
  - null if not found
  */
  async findClassByCode(classCode: string) {
    const { data: classRow, error: classError } = await supabaseAdmin
      .from("classes")
      .select("class_id, class_code, class_name")
      .eq("class_code", classCode)
      .single();

    if (classError || !classRow) {
      return null;
    }

    return classRow;
  }

  /*
  ROOM JOIN HANDLER
  -----------------
  Purpose:
  Creates the player using trusted auth data from onAuth() and loads the
  correct class-based inventory and room layout.

  Flow:
  1. Block duplicate joins for the same account.
  2. Lock the room to a single class.
  3. Load the saved display name from Supabase.
  4. Load inventory using both user_id and class_id.
  5. Load the room layout for this class, with fallback to default_room.
  6. Spawn the player into the room.
  7. Send room info and layout back to the client.
  */
  async onJoin(
    client: Client,
    options: { name?: string; classCode?: string },
    auth: {
      userId: string;
      email: string;
      requestedName: string;
      classId: string;
      classCode: string;
      className: string;
      missionPosition: number;
      isAdmin: boolean;
      mapKey: string;
    }
  ) {
    const duplicate = [...this.state.players.values()].find(
      (p) => p.userId === auth.userId
    );

    if (duplicate) {
      const staleClient = this.clients.find((entry) => entry.sessionId === duplicate.id);
      this.state.players.delete(duplicate.id);
      staleClient?.leave(4001, "Connection replaced by a newer session");
      console.warn("Replaced stale account connection:", {
        userId: auth.userId,
        previousSessionId: duplicate.id,
        nextSessionId: client.sessionId
      });
    }

    if (!this.roomClassId) {
      this.roomClassId = auth.classId;
      this.roomClassCode = auth.classCode;
      this.roomClassName = auth.className;
    } else if (this.roomClassId !== auth.classId) {
      throw new ServerError(403, "This room belongs to a different class");
    }

    const previousAccountClient = ACTIVE_ACCOUNT_CLIENTS.get(auth.userId);
    if (previousAccountClient && previousAccountClient !== client) {
      console.warn("Closing duplicate account connection:", {
        userId: auth.userId,
        previousSessionId: previousAccountClient.sessionId,
        nextSessionId: client.sessionId
      });
      previousAccountClient.leave(4001, "Account connected from another session");
    }
    ACTIVE_ACCOUNT_CLIENTS.set(auth.userId, client);

    console.log("ROOM JOIN:", {
      roomClassId: this.roomClassId,
      roomClassCode: this.roomClassCode,
      roomClassName: this.roomClassName,
      joiningUserId: auth.userId,
      joiningClassId: auth.classId,
      joiningClassCode: auth.classCode
    });

    const spawnPoints = [
      { x: 120, y: 120 },
      { x: 220, y: 120 },
      { x: 320, y: 120 },
      { x: 420, y: 120 },
      { x: 520, y: 120 },
      { x: 120, y: 220 },
      { x: 220, y: 220 },
      { x: 320, y: 220 },
      { x: 420, y: 220 },
      { x: 520, y: 220 }
    ];

    const spawn = spawnPoints[this.clients.length % spawnPoints.length];

    const { data: profileRows } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("user_id", auth.userId)
      .limit(1);

    const savedName =
      profileRows?.[0]?.display_name ||
      auth.requestedName ||
      "Player";

    await supabaseAdmin.from("profiles").upsert({
      user_id: auth.userId,
      display_name: savedName
    });

    const { data: inventoryRows, error: inventoryError } = await supabaseAdmin
      .from("inventories")
      .select("item_id, quantity")
      .eq("user_id", auth.userId)
      .eq("class_id", auth.classId);

    console.log("LOAD INVENTORY:", {
      userId: auth.userId,
      classId: auth.classId,
      rows: inventoryRows ?? []
    });

    if (inventoryError) {
      console.error("Failed to load inventory:", inventoryError);
    }

    this.currentMapKey = auth.mapKey || DEFAULT_MAP_KEY;

    const loadedLayout = await this.loadRoomLayoutForClass(
      auth.classId,
      auth.classCode,
      this.currentMapKey
    );

    this.currentLayoutKey = loadedLayout.layoutKey;
    this.currentMapKey = loadedLayout.layoutKey;
    this.currentRoomLayout = expandRoomLayoutToSize(
      loadedLayout.layout,
      DEFAULT_ROOM_TILE_WIDTH,
      DEFAULT_ROOM_TILE_HEIGHT
    );

    if (!this.currentTilesetMetadata.length) {
      this.currentTilesetMetadata = await this.loadTilesetFrameMetadata();
    }

    this.rebuildRuntimeObjectEntities();
    this.runtimeCollectableNodes.push(
      ...this.alienArtifactAftermathNodes.filter(
        (node) => node.mapKey === this.currentMapKey && !this.runtimeCollectableNodes.some((entry) => entry.id === node.id)
      )
    );
    this.rebuildRuntimeMobEntitiesFromAnchors();

    console.log("Loaded and expanded server layout:", {
      layoutKey: this.currentLayoutKey,
      mapKey: this.currentMapKey,
      width: this.currentRoomLayout.base[0]?.length || 0,
      height: this.currentRoomLayout.base.length,
      collectableCount: this.runtimeCollectableNodes.length,
      mobAnchorCount: this.runtimeMobSpawnAnchors.length,
      liveMobCount: this.runtimeMobEntities.length
    });

    const spawnMarkerTile = this.findSpawnMarkerTile();
    const spawnMarkerWorld = spawnMarkerTile
      ? this.tileToWorldPosition(spawnMarkerTile.tileX, spawnMarkerTile.tileY)
      : null;

    const player = new Player();
player.id = client.sessionId;
player.userId = auth.userId;
player.classId = auth.classId;
player.isAdmin = auth.isAdmin;
player.name = savedName;
player.x = spawnMarkerWorld?.x ?? spawn.x;
player.y = spawnMarkerWorld?.y ?? spawn.y;
player.stamina = 100;
player.maxStamina = 100;
player.health = 100;
player.maxHealth = 100;

    for (const row of inventoryRows || []) {
      player.inventory.set(row.item_id, row.quantity);
    }

    try {
      await this.ensureSpecialTokenProgression(player);
    } catch (error) {
      console.error("Failed to migrate Special Ability token progress:", error);
    }

    this.applyProgressionDerivedStats(player, true);
    const runtimeVitalsKey = `${player.userId}:${player.classId}`;
    const savedRuntimeVitals = PLAYER_RUNTIME_VITALS.get(runtimeVitalsKey);
    if (savedRuntimeVitals) {
      player.stamina = Math.max(0, Math.min(player.maxStamina, savedRuntimeVitals.oxygen));
      player.health = Math.max(0, Math.min(player.maxHealth, savedRuntimeVitals.energy));
    }

    this.state.players.set(client.sessionId, player);

    console.log("SENDING ROOM INFO:", {
      layoutKey: this.currentLayoutKey,
      baseRows: this.currentRoomLayout?.base?.length || 0,
      baseCols: this.currentRoomLayout?.base?.[0]?.length || 0
    });

    client.send("room_info", {
      classId: auth.classId,
      classCode: auth.classCode,
      className: auth.className,
      layoutKey: this.currentLayoutKey,
      mapKey: this.currentMapKey,
      layout: this.currentRoomLayout,
      tilesetMetadata: this.currentTilesetMetadata
    });

    client.send("mob_runtime_snapshot", {
  mapKey: this.currentMapKey,
  mobs: this.runtimeMobEntities.map((mob) => ({
    id: mob.id,
    anchorFrame: mob.anchorFrame,
    kind: mob.kind,
    tier: mob.tier,
    x: mob.x,
    y: mob.y,
    facing: mob.facing,
    state: mob.state,
    stamina: mob.stamina,
    maxStamina: mob.maxStamina,
    incapacitated: mob.incapacitated,
    plantCounter: mob.plantCounter || 0,
    esm: mob.esm,
    maxEsm: mob.maxEsm,
    eatThreshold: mob.eatThreshold,
    ecosystemState: mob.state,
    targetId: mob.targetId,
    speciesKey: mob.speciesKey,
  }))
});

    client.send("collectable_runtime_snapshot", {
      mapKey: this.currentMapKey,
      nodes: this.getRuntimeCollectableSnapshot()
    });
    client.send("alien_artifact_snapshot", {
      mapKey: this.currentMapKey,
      artifact: this.getAlienArtifactSnapshot()
    });
    this.sendQuestSnapshot(player);
    this.sendProgressionSnapshot(player);
    client.send("mission_progress", { position: auth.missionPosition || 0 });

    console.log("Player joined:", {
      name: player.name,
      userId: player.userId,
      classId: auth.classId,
      classCode: auth.classCode,
      className: auth.className,
      isAdmin: player.isAdmin,
      layoutKey: this.currentLayoutKey
    });
  }

    /*
  ROOM LAYOUT HELPERS
  -------------------
  Purpose:
  Load and save layered room layouts from Supabase.

  Notes:
  - class-specific layouts use layout_key like class_E3P1
  - default_room is used as a fallback
  */

  getGlobalLayoutKey() {
    return this.currentMapKey || DEFAULT_MAP_KEY;
  }

  isValidLayerMap(value: unknown): value is number[][] {
    return (
      Array.isArray(value) &&
      value.every(
        (row) =>
          Array.isArray(row) &&
          row.every((cell) => Number.isInteger(cell))
      )
    );
  }

  isValidRoomLayout(value: unknown): value is LayeredRoomLayout {
    if (!value || typeof value !== "object") return false;

    const layout = value as LayeredRoomLayout;

    if (
      !this.isValidLayerMap(layout.base) ||
      !this.isValidLayerMap(layout.detail) ||
      !this.isValidLayerMap(layout.overhead) ||
      (
        layout.objects !== undefined &&
        !this.isValidLayerMap(layout.objects)
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
      layout.objects ??
      Array.from({ length: height }, () =>
        Array.from({ length: width }, () => -1)
      );

    const isSameSize = (layer: number[][]) =>
      layer.length === height &&
      layer.every((row) => Array.isArray(row) && row.length === width);

    return (
      isSameSize(layout.base) &&
      isSameSize(layout.detail) &&
      isSameSize(layout.overhead) &&
      isSameSize(objectLayer)
    );
  }

  async loadRoomLayoutRow(layoutKey: string) {
    const { data, error } = await supabaseAdmin
      .from("room_layouts")
      .select("layout_key, base_layer, detail_layer, overhead_layer, object_layer")
      .eq("layout_key", layoutKey)
      .single();

    if (error || !data) {
      console.error("Failed to load room layout row:", {
        layoutKey,
        error
      });
      return null;
    }

    const baseLayer = data.base_layer ?? [];
    const detailLayer = data.detail_layer ?? [];
    const overheadLayer = data.overhead_layer ?? [];

    const height = Array.isArray(baseLayer) ? baseLayer.length : 0;
    const width = Array.isArray(baseLayer) && baseLayer[0] ? baseLayer[0].length : 0;

    const emptyObjectLayer = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => -1)
    );

    const layout: LayeredRoomLayout = {
      base: baseLayer,
      detail: detailLayer,
      overhead: overheadLayer,
      objects: data.object_layer ?? emptyObjectLayer
    };

    if (!this.isValidRoomLayout(layout)) {
      console.error("Invalid room layout data for key:", layoutKey);
      return null;
    }

    return {
      layoutKey: data.layout_key as string,
      layout
    };
  }

  async loadRoomLayoutForClass(_classId: string, _classCode: string, mapKey = DEFAULT_MAP_KEY) {
    const layoutRow = await this.loadRoomLayoutRow(mapKey);
    if (layoutRow) {
      console.log("Loaded room layout:", {
        layoutKey: layoutRow.layoutKey
      });

      return layoutRow;
    }

    const createEmptyLayer = () =>
      Array.from({ length: DEFAULT_ROOM_TILE_HEIGHT }, () =>
        Array.from({ length: DEFAULT_ROOM_TILE_WIDTH }, () => -1)
      );

    const fallbackLayout: LayeredRoomLayout = {
      base: createEmptyLayer(),
      detail: createEmptyLayer(),
      overhead: createEmptyLayer(),
      objects: createEmptyLayer()
    };

    console.warn("No room layout found, using sized fallback:", {
      mapKey
    });

    return {
      layoutKey: mapKey,
      layout: fallbackLayout
    };
  }
    async loadTilesetFrameMetadata() {
    const { data, error } = await supabaseAdmin
      .from("tileset_frame_metadata")
      .select("frame_index, collision, animate, action_center")
      .order("frame_index", { ascending: true });

    if (error || !data) {
      console.error("Failed to load tileset frame metadata:", error);
      return [];
    }

    return data as TilesetFrameMetadataRow[];
  }

  async saveRoomLayoutForClass(
    classId: string,
    _classCode: string,
    layout: LayeredRoomLayout
  ) {
    const layoutKey = this.getGlobalLayoutKey();

    const { error } = await supabaseAdmin
      .from("room_layouts")
      .upsert({
        layout_key: layoutKey,
        class_id: classId,
        layout_name: layoutKey,
        base_layer: layout.base,
        detail_layer: layout.detail,
        overhead_layer: layout.overhead,
        object_layer: layout.objects
      }, {
        onConflict: "layout_key"
      });

    if (error) {
      throw error;
    }

    this.currentLayoutKey = layoutKey;
    this.currentRoomLayout = layout;
  }

    /*
  MAP TRANSITION REQUEST HANDLER
  ------------------------------
  Purpose:
  Validates whether the player is inside a transition zone and tells the
  client which map to join next.

  Notes:
  - this first version only sends the next map and spawn point
  - the client will rejoin into the new map
  */

  async handleRequestMapTransition(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const portal = this.getMapPortalForPlayer(player);

    if (!portal) {
      client.send("map_transition_result", {
        success: false,
        message: "No usable portal is in range."
      });
      return;
    }

    this.broadcast("portal_activation", {
      mapKey: this.currentMapKey,
      portalKey: portal.portalKey,
      doorwayLabel: portal.label,
      activatedBy: client.sessionId,
      durationMs: 2500
    });

    const destinationLayoutRow = await this.loadRoomLayoutForClass(
      this.roomClassId || "",
      this.roomClassCode || "",
      portal.toMapKey
    );

    const destinationLayout = expandRoomLayoutToSize(
      destinationLayoutRow.layout,
      DEFAULT_ROOM_TILE_WIDTH,
      DEFAULT_ROOM_TILE_HEIGHT
    );

    const spawnMarkerTile = (() => {
      for (let row = 0; row < destinationLayout.objects.length; row++) {
        for (let col = 0; col < destinationLayout.objects[row].length; col++) {
          if (destinationLayout.objects[row][col] === PORTAL_SPAWN_FRAME) {
            return { tileX: col, tileY: row };
          }
        }
      }
      return null;
    })();

    const spawnTileX = spawnMarkerTile?.tileX ?? portal.spawnTileX;
    const spawnTileY = spawnMarkerTile?.tileY ?? portal.spawnTileY;

    const spawnWorld = this.tileToWorldPosition(spawnTileX, spawnTileY);

    client.send("map_transition_result", {
      success: true,
      doorwayId: `${portal.fromMapKey}:${portal.portalKey}:${portal.tileX}:${portal.tileY}`,
      doorwayLabel: portal.label,
      portalKey: portal.portalKey,
      toMapKey: portal.toMapKey,
      spawnTileX,
      spawnTileY,
      spawnX: spawnWorld.x,
      spawnY: spawnWorld.y
    });
  }

  async handleSaveLayoutMessage(
    client: Client,
    message: {
      base?: number[][];
      detail?: number[][];
      overhead?: number[][];
      objects?: number[][];
      metadata?: TilesetFrameMetadataRow[];
    }
  ) {
    const player = this.state.players.get(client.sessionId);

    if (!player || !player.isAdmin) {
      client.send("chat_result", {
        kind: "error",
        success: false,
        message: "Only the admin can save the room layout."
      });
      return;
    }

    if (!this.roomClassId || !this.roomClassCode) {
      client.send("chat_result", {
        kind: "error",
        success: false,
        message: "Room class is not initialized."
      });
      return;
    }

    const layout: LayeredRoomLayout = {
      base: message.base ?? [],
      detail: message.detail ?? [],
      overhead: message.overhead ?? [],
      objects: message.objects ?? []
    };

    if (!this.isValidRoomLayout(layout)) {
      client.send("chat_result", {
        kind: "error",
        success: false,
        message: "Invalid room layout data."
      });
      return;
    }

    try {
      await this.saveRoomLayoutForClass(
        this.roomClassId,
        this.roomClassCode,
        layout
      );

      const metadataRows = Array.isArray(message.metadata)
        ? message.metadata
          .filter((row) => Number.isInteger(row?.frame_index) && row.frame_index >= 0)
          .map((row) => ({
            frame_index: row.frame_index,
            collision: !!row.collision,
            animate: !!row.animate,
            action_center: ["craft", "dig", "mine", "fish", "comm"].includes(
              String(row.action_center || "")
            )
              ? row.action_center
              : null
          }))
        : null;
      if (metadataRows) {
        const { error: deleteMetadataError } = await supabaseAdmin
          .from("tileset_frame_metadata")
          .delete()
          .gte("frame_index", 0);
        if (deleteMetadataError) throw deleteMetadataError;
        if (metadataRows.length > 0) {
          const { error: saveMetadataError } = await supabaseAdmin
            .from("tileset_frame_metadata")
            .upsert(metadataRows, { onConflict: "frame_index" });
          if (saveMetadataError) throw saveMetadataError;
        }
      }

      this.currentRoomLayout = layout;
      this.currentTilesetMetadata = await this.loadTilesetFrameMetadata();
      this.rebuildRuntimeObjectEntities();
      this.rebuildRuntimeMobEntitiesFromAnchors();
      this.broadcastRuntimeCollectableSnapshot(true);
      this.broadcastRuntimeMobSnapshot(true);

      client.send("chat_result", {
        kind: "success",
        success: true,
        message: "Saved global room layout."
      });
    } catch (error) {
      console.error("Failed to save room layout:", error);

      client.send("chat_result", {
        kind: "error",
        success: false,
        message: "Failed to save room layout."
      });
    }
  }

  handleEditorTileUpdate(
    client: Client,
    message: {
      layer?: "base" | "detail" | "overhead" | "objects";
      tileX?: number;
      tileY?: number;
      frame?: number;
    }
  ) {
    const player = this.state.players.get(client.sessionId);
    if (!player?.isAdmin) return;

    const layerName = message?.layer;
    const tileX = message?.tileX;
    const tileY = message?.tileY;
    const frame = message?.frame;
    if (
      layerName !== "base" &&
      layerName !== "detail" &&
      layerName !== "overhead" &&
      layerName !== "objects"
    ) return;
    if (
      !Number.isInteger(tileX) ||
      !Number.isInteger(tileY) ||
      !Number.isInteger(frame) ||
      (frame as number) < -1
    ) return;

    const layerMap = this.currentRoomLayout?.[layerName];
    const row = layerMap?.[tileY as number];
    if (!row || row[tileX as number] === undefined) return;

    row[tileX as number] = frame as number;

    if (layerName === "objects") {
      this.rebuildRuntimeObjectEntities();
      this.rebuildRuntimeMobEntitiesFromAnchors();
      this.broadcastRuntimeCollectableSnapshot(true);
      this.broadcastRuntimeMobSnapshot(true);
    }
  }

  handleEditorMetadataUpdate(
    client: Client,
    message: {
      frame_index?: number;
      collision?: boolean;
      animate?: boolean;
      action_center?: "craft" | "dig" | "mine" | "fish" | "comm" | null;
    }
  ) {
    const player = this.state.players.get(client.sessionId);
    if (!player?.isAdmin) return;

    const frameIndex = message?.frame_index;
    if (!Number.isInteger(frameIndex) || (frameIndex as number) < 0) return;

    const validActions = new Set(["craft", "dig", "mine", "fish", "comm"]);
    const actionCenter =
      message.action_center && validActions.has(message.action_center)
        ? message.action_center
        : null;
    const metadata: TilesetFrameMetadataRow = {
      frame_index: frameIndex as number,
      collision: !!message.collision,
      animate: !!message.animate,
      action_center: actionCenter
    };
    const existingIndex = this.currentTilesetMetadata.findIndex(
      (entry) => entry.frame_index === metadata.frame_index
    );

    if (!metadata.collision && !metadata.animate && !metadata.action_center) {
      if (existingIndex >= 0) this.currentTilesetMetadata.splice(existingIndex, 1);
      return;
    }

    if (existingIndex >= 0) {
      this.currentTilesetMetadata[existingIndex] = metadata;
    } else {
      this.currentTilesetMetadata.push(metadata);
    }
  }

  /*
  ROOM LEAVE HANDLER
  ------------------
  Purpose:
  Removes the player from room state when they disconnect.
  */
  onLeave(client: Client) {
    this.playerInputSpeedScales.delete(client.sessionId);
    this.playerInputEditorModes.delete(client.sessionId);
    this.cancelPlayerTradeActivity(client.sessionId, "Trade cancelled because a player disconnected.");
    const player = this.state.players.get(client.sessionId);
    if (player) {
      if (ACTIVE_ACCOUNT_CLIENTS.get(player.userId) === client) {
        ACTIVE_ACCOUNT_CLIENTS.delete(player.userId);
      }
      PLAYER_RUNTIME_VITALS.set(`${player.userId}:${player.classId}`, {
        oxygen: player.stamina,
        energy: player.health
      });
    }
    this.state.players.delete(client.sessionId);
    console.log("Player left:", client.sessionId);
  }
}

const server = defineServer({
  rooms: {
    class_room: defineRoom(ClassRoom).filterBy(["classCode", "mapKey"]),
  },
  express: (app) => {
    app.use(json({ limit: "32kb" }));
    const configuredOrigins = String(process.env.CLIENT_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    const localOrigins = ["http://localhost:8080", "http://127.0.0.1:8080"];
    app.use(cors({
      origin(origin, callback) {
        if (!origin || localOrigins.includes(origin) || configuredOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Origin is not allowed"));
      }
    }));
    app.get("/health", (_request, response) => {
      response.json({ ok: true, service: "e3-multiplayer" });
    });
    const authenticateTeacherRequest = async (request: any, response: any) => {
      const authorization = String(request.headers.authorization || "");
      const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
      if (!token) {
        response.status(401).json({ error: "Missing access token" });
        return null;
      }
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
      const email = authData?.user?.email || "";
      if (authError || !authData?.user) {
        response.status(401).json({ error: "Invalid access token" });
        return null;
      }
      if (email.toLowerCase() !== "mnelsen@susd.net") {
        response.status(403).json({ error: "Teacher access required" });
        return null;
      }
      return authData.user;
    };
    app.get("/api/classes", async (request, response) => {
      const teacher = await authenticateTeacherRequest(request, response);
      if (!teacher) return;
      const { data: classes, error } = await supabaseAdmin
        .from("classes")
        .select("class_id, class_code, class_name")
        .order("class_name", { ascending: true });
      if (error) {
        console.error("Failed to list teacher classes:", error);
        response.status(500).json({ error: "Could not load classes" });
        return;
      }
      response.json({
        classes: (classes || []).map((entry) => ({
          id: entry.class_id,
          code: entry.class_code,
          name: entry.class_name || entry.class_code
        }))
      });
    });
    const listAuthUsersByEmail = async () => {
      const byEmail = new Map<string, any>();
      const byId = new Map<string, any>();
      let page = 1;
      while (true) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        for (const user of data.users || []) {
          byId.set(user.id, user);
          if (user.email) byEmail.set(user.email.toLowerCase(), user);
        }
        if ((data.users || []).length < 1000) break;
        page += 1;
      }
      return { byEmail, byId };
    };
    app.get("/api/classes/:classId/students", async (request, response) => {
      const teacher = await authenticateTeacherRequest(request, response);
      if (!teacher) return;
      try {
        const classId = String(request.params.classId || "");
        const { data: classRow, error: classError } = await supabaseAdmin.from("classes").select("class_id, class_code, class_name, google_course_id").eq("class_id", classId).single();
        if (classError || !classRow) {
          response.status(404).json({ error: "Class not found" });
          return;
        }
        const [{ data: memberships, error: membershipError }, authUsers] = await Promise.all([
          supabaseAdmin.from("class_memberships").select("user_id, role").eq("class_id", classId).eq("role", "student"),
          listAuthUsersByEmail()
        ]);
        if (membershipError) throw membershipError;
        const memberIds = (memberships || []).map((entry) => entry.user_id);
        const profileMap = new Map<string, any>();
        if (memberIds.length) {
          const { data: profiles, error: profileError } = await supabaseAdmin.from("profiles").select("user_id, display_name").in("user_id", memberIds);
          if (profileError) throw profileError;
          for (const profile of profiles || []) profileMap.set(profile.user_id, profile);
        }
        const rows = new Map<string, any>();
        if (classRow.google_course_id) {
          const { data: roster, error: rosterError } = await supabaseAdmin.from("google_classroom_roster").select("google_user_id, email, display_name").eq("google_course_id", classRow.google_course_id).order("display_name", { ascending: true });
          if (rosterError) throw rosterError;
          for (const entry of roster || []) {
            const email = String(entry.email || "").toLowerCase();
            const user = email ? authUsers.byEmail.get(email) : null;
            rows.set(email || `google:${entry.google_user_id}`, { userId: user?.id || null, email: entry.email || null, displayName: entry.display_name || user?.user_metadata?.display_name || email || "Classroom student", source: "google", inClass: !!user && memberIds.includes(user.id) });
          }
        }
        for (const membership of memberships || []) {
          const user = authUsers.byId.get(membership.user_id);
          const email = String(user?.email || "").toLowerCase();
          const existing = rows.get(email || `user:${membership.user_id}`);
          rows.set(email || `user:${membership.user_id}`, { ...existing, userId: membership.user_id, email: user?.email || existing?.email || null, displayName: profileMap.get(membership.user_id)?.display_name || user?.user_metadata?.display_name || existing?.displayName || email || "Student", source: existing?.source || "manual", inClass: true });
        }
        response.json({ class: { id: classRow.class_id, code: classRow.class_code, name: classRow.class_name || classRow.class_code }, students: Array.from(rows.values()).sort((a, b) => a.displayName.localeCompare(b.displayName)) });
      } catch (error) {
        console.error("Failed to list class students:", error);
        response.status(500).json({ error: error instanceof Error ? error.message : "Could not load students" });
      }
    });
    app.post("/api/classes/:classId/students", async (request, response) => {
      const teacher = await authenticateTeacherRequest(request, response);
      if (!teacher) return;
      try {
        const classId = String(request.params.classId || "");
        const email = String(request.body?.email || "").trim().toLowerCase();
        const displayName = String(request.body?.displayName || "").trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) {
          response.status(400).json({ error: "Enter a valid student email address." });
          return;
        }
        const { data: classRow } = await supabaseAdmin.from("classes").select("class_id").eq("class_id", classId).maybeSingle();
        if (!classRow) {
          response.status(404).json({ error: "Class not found" });
          return;
        }
        const authUsers = await listAuthUsersByEmail();
        let user = authUsers.byEmail.get(email);
        let invited = false;
        if (!user) {
          const redirectTo = configuredOrigins[0] || "https://e3-expedition.onrender.com";
          const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo, data: displayName ? { display_name: displayName } : undefined });
          if (error) throw error;
          user = data.user;
          invited = true;
        }
        if (!user) throw new Error("The student account could not be created.");
        if (displayName) await supabaseAdmin.from("profiles").upsert({ user_id: user.id, display_name: displayName }, { onConflict: "user_id" });
        const { error: membershipError } = await supabaseAdmin.from("class_memberships").upsert({ user_id: user.id, class_id: classId, role: "student" }, { onConflict: "user_id" });
        if (membershipError) throw membershipError;
        response.json({ success: true, invited, userId: user.id, email });
      } catch (error) {
        console.error("Failed to add class student:", error);
        response.status(500).json({ error: error instanceof Error ? error.message : "Could not add student" });
      }
    });
    app.delete("/api/classes/:classId/students/:userId", async (request, response) => {
      const teacher = await authenticateTeacherRequest(request, response);
      if (!teacher) return;
      const { error } = await supabaseAdmin.from("class_memberships").delete().eq("class_id", String(request.params.classId || "")).eq("user_id", String(request.params.userId || ""));
      if (error) {
        response.status(500).json({ error: "Could not remove student from this class" });
        return;
      }
      response.json({ success: true });
    });
    app.get("/api/classes/:classId/students/:userId/stats", async (request, response) => {
      const teacher = await authenticateTeacherRequest(request, response);
      if (!teacher) return;
      try {
        const classId = String(request.params.classId || "");
        const userId = String(request.params.userId || "");
        const { data: membership } = await supabaseAdmin.from("class_memberships").select("user_id").eq("class_id", classId).eq("user_id", userId).maybeSingle();
        if (!membership) {
          response.status(404).json({ error: "Student is not in this class" });
          return;
        }
        const [{ data: profile }, { data: inventory }, authUsers] = await Promise.all([
          supabaseAdmin.from("profiles").select("display_name").eq("user_id", userId).maybeSingle(),
          supabaseAdmin.from("inventories").select("item_id, quantity").eq("user_id", userId).eq("class_id", classId),
          listAuthUsersByEmail()
        ]);
        const user = authUsers.byId.get(userId);
        response.json({ student: { userId, email: user?.email || null, displayName: profile?.display_name || user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Student", online: ACTIVE_ACCOUNT_CLIENTS.has(userId), inventoryTypes: (inventory || []).filter((item) => Number(item.quantity) > 0).length, inventoryItems: (inventory || []).reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0) } });
      } catch (error) {
        response.status(500).json({ error: error instanceof Error ? error.message : "Could not load student overview" });
      }
    });
    app.get("/api/google/classroom/status", async (request, response) => {
      const teacher = await authenticateTeacherRequest(request, response);
      if (!teacher) return;
      const configured = !!(process.env.GOOGLE_CLASSROOM_CLIENT_ID && process.env.GOOGLE_CLASSROOM_CLIENT_SECRET && process.env.GOOGLE_CLASSROOM_REDIRECT_URI);
      if (!configured) {
        response.json({ configured: false, connected: false });
        return;
      }
      const { data } = await supabaseAdmin
        .from("google_classroom_connections")
        .select("google_email, connected_at, updated_at")
        .eq("teacher_user_id", teacher.id)
        .maybeSingle();
      response.json({ configured: true, connected: !!data, email: data?.google_email || null, connectedAt: data?.connected_at || null, updatedAt: data?.updated_at || null });
    });
    app.get("/api/google/classroom/authorization-url", async (request, response) => {
      const teacher = await authenticateTeacherRequest(request, response);
      if (!teacher) return;
      try {
        response.json({ url: createClassroomAuthorizationUrl(createClassroomState(teacher.id)) });
      } catch (error) {
        response.status(503).json({ error: error instanceof Error ? error.message : "Google Classroom is not configured" });
      }
    });
    app.get("/auth/google/classroom/callback", async (request, response) => {
      const frontendUrl = configuredOrigins[0] || "https://e3-expedition.onrender.com";
      try {
        if (request.query.error) throw new Error(String(request.query.error));
        const state = verifyClassroomState(String(request.query.state || ""));
        const tokens = await exchangeClassroomAuthorizationCode(String(request.query.code || ""));
        const existing = await supabaseAdmin.from("google_classroom_connections").select("refresh_token_ciphertext").eq("teacher_user_id", state.userId).maybeSingle();
        const encryptedRefreshToken = tokens.refresh_token
          ? encryptClassroomRefreshToken(tokens.refresh_token)
          : existing.data?.refresh_token_ciphertext;
        if (!encryptedRefreshToken) throw new Error("Google did not return a refresh token. Revoke the app grant and connect again.");
        const profile = await getGoogleProfile(tokens.access_token);
        const { error } = await supabaseAdmin.from("google_classroom_connections").upsert({
          teacher_user_id: state.userId,
          google_email: profile.email || null,
          refresh_token_ciphertext: encryptedRefreshToken,
          updated_at: new Date().toISOString()
        });
        if (error) throw error;
        response.redirect(`${frontendUrl}/?classroom=connected`);
      } catch (error) {
        console.error("Google Classroom callback failed:", error);
        response.redirect(`${frontendUrl}/?classroom=error`);
      }
    });
    app.post("/api/google/classroom/sync", async (request, response) => {
      const teacher = await authenticateTeacherRequest(request, response);
      if (!teacher) return;
      try {
        const { data: connection, error: connectionError } = await supabaseAdmin
          .from("google_classroom_connections")
          .select("refresh_token_ciphertext")
          .eq("teacher_user_id", teacher.id)
          .single();
        if (connectionError || !connection) {
          response.status(409).json({ error: "Connect Google Classroom before synchronizing." });
          return;
        }
        const refreshToken = decryptClassroomRefreshToken(connection.refresh_token_ciphertext);
        const access = await refreshClassroomAccessToken(refreshToken);
        const courses: Array<{ id: string; name: string; section?: string }> = [];
        let coursePage = "";
        do {
          const page = await listClassroomCourses(access.access_token, coursePage);
          courses.push(...(page.courses || []));
          coursePage = page.nextPageToken || "";
        } while (coursePage);
        const authUsersByEmail = new Map<string, string>();
        let authPage = 1;
        while (true) {
          const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({ page: authPage, perPage: 1000 });
          if (authUsersError) throw authUsersError;
          for (const user of authUsers.users || []) {
            if (user.email) authUsersByEmail.set(user.email.toLowerCase(), user.id);
          }
          if ((authUsers.users || []).length < 1000) break;
          authPage += 1;
        }
        let rosterCount = 0;
        let matchedStudents = 0;
        for (const course of courses) {
          const classCode = `GC${String(course.id).replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`;
          const { data: classRow, error: classError } = await supabaseAdmin.from("classes").upsert({
            google_course_id: course.id,
            class_code: classCode,
            class_name: course.section ? `${course.name} · ${course.section}` : course.name,
            classroom_synced_at: new Date().toISOString()
          }, { onConflict: "google_course_id" }).select("class_id").single();
          if (classError || !classRow) throw classError || new Error("Class import failed.");
          let studentPage = "";
          do {
            const page = await listClassroomStudents(access.access_token, course.id, studentPage);
            for (const student of page.students || []) {
              const email = student.profile?.emailAddress?.toLowerCase() || null;
              await supabaseAdmin.from("google_classroom_roster").upsert({
                google_course_id: course.id,
                google_user_id: student.userId,
                email,
                display_name: student.profile?.name?.fullName || null,
                synced_at: new Date().toISOString()
              }, { onConflict: "google_course_id,google_user_id" });
              rosterCount += 1;
              if (!email) continue;
              const matchedUserId = authUsersByEmail.get(email);
              if (matchedUserId) {
                const membership = await supabaseAdmin.from("class_memberships").upsert({ user_id: matchedUserId, class_id: classRow.class_id, role: "student" }, { onConflict: "user_id" });
                if (!membership.error) matchedStudents += 1;
              }
            }
            studentPage = page.nextPageToken || "";
          } while (studentPage);
        }
        await supabaseAdmin.from("google_classroom_connections").update({ updated_at: new Date().toISOString() }).eq("teacher_user_id", teacher.id);
        response.json({ success: true, courses: courses.length, rosterEntries: rosterCount, matchedStudents });
      } catch (error) {
        console.error("Google Classroom synchronization failed:", error);
        response.status(500).json({ error: error instanceof Error ? error.message : "Google Classroom synchronization failed" });
      }
    });
  }
});

const serverPort = Math.max(1, Number(process.env.PORT) || 2567);
server.listen(serverPort);
console.log(`Colyseus server running on port ${serverPort}`);
