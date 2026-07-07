import type { GameState } from '../types';
import { legacyWeatherWeek } from '../engine/ambience';

const SAVE_KEY = 'danqingyuan-mvp:auto-save';

/** 存档 schema 版本（最新 v17，2026-07-07 天气随机化：GameState.weatherWeek；旧档沿用固定表保玩家已见天气不变） */
const SCHEMA_VERSION = 17;

export interface SaveFile {
  saveId: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  label: string;
  gameState: GameState;
}

export function createSaveFile(gameState: GameState, existing?: SaveFile): SaveFile {
  const now = new Date().toISOString();
  return {
    saveId: existing?.saveId ?? gameState.saveId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    label: `第 ${gameState.time.day} 日 · ${gameState.player.name}`,
    gameState,
  };
}

/** v4 旧档迁移：教程视为已播完，补解锁食堂/宿舍 */
function migrateV4(saveFile: SaveFile): SaveFile {
  const gameState = saveFile.gameState;
  gameState.progress.flags = {
    ...gameState.progress.flags,
    tutorial_forenoon_done: true,
    tutorial_noon_done: true,
    tutorial_afternoon_done: true,
    tutorial_evening_done: true,
  };
  gameState.progress.unlockedLocations = Array.from(
    new Set([...gameState.progress.unlockedLocations, 'dining_hall' as const, 'dormitory' as const]),
  );
  // 落到 v5，再由 migrateV5 链式补连贯记忆字段
  return { ...saveFile, schemaVersion: 5 };
}

/** v5→v6 旧档迁移（2026-06-16）：补连贯记忆字段（均 optional，passthrough 即可） */
function migrateV5(saveFile: SaveFile): SaveFile {
  const memory = saveFile.gameState.memory;
  memory.locationThreads ??= {};
  memory.summaries ??= [];
  return { ...saveFile, schemaVersion: 6 };
}

/** v6→v7 旧档迁移（2026-06-16）：补剧情约定队列（optional，passthrough） */
function migrateV6(saveFile: SaveFile): SaveFile {
  saveFile.gameState.pendingHooks ??= [];
  return { ...saveFile, schemaVersion: 7 };
}

/** v7→v8 旧档迁移（2026-06-17）：补即时推荐意图（optional，passthrough） */
function migrateV7(saveFile: SaveFile): SaveFile {
  saveFile.gameState.suggestedIntents ??= {};
  return { ...saveFile, schemaVersion: 8 };
}

/** v8→v9 旧档迁移（2026-06-18）：补叙事时段场景计数（passthrough） */
function migrateV8(saveFile: SaveFile): SaveFile {
  saveFile.gameState.time.slotSceneCount ??= 0;
  return { ...saveFile, schemaVersion: 9 };
}

/** v9→v10 旧档迁移（2026-06-25）：补每日闲聊次数 chatsToday（per relationship，passthrough） */
function migrateV9(saveFile: SaveFile): SaveFile {
  for (const rel of Object.values(saveFile.gameState.relationships)) {
    rel.chatsToday ??= 0;
  }
  return { ...saveFile, schemaVersion: 10 };
}

/** v10→v11 旧档迁移（2026-06-26）：补对话往来历史 chatHistory + 当日好感涨幅 affinityGainedToday */
function migrateV10(saveFile: SaveFile): SaveFile {
  for (const rel of Object.values(saveFile.gameState.relationships)) {
    rel.chatHistory ??= [];
    rel.affinityGainedToday ??= 0;
  }
  return { ...saveFile, schemaVersion: 11 };
}

/** v11→v12 旧档迁移（2026-06-27 沙盒练习系统）：补当日技能涨幅 skillGainedToday */
function migrateV11(saveFile: SaveFile): SaveFile {
  saveFile.gameState.time.skillGainedToday ??= 0;
  return { ...saveFile, schemaVersion: 12 };
}

/** v12→v13 旧档迁移（2026-06-28 学识封顶）：补当日学识涨幅 knowledgeGainedToday */
function migrateV12(saveFile: SaveFile): SaveFile {
  saveFile.gameState.time.knowledgeGainedToday ??= 0;
  return { ...saveFile, schemaVersion: 13 };
}

/** v13→v14 旧档迁移（2026-06-28 丹青试结局）：ending 为可选字段，旧档无（未走到结局）即 undefined，仅升版本 */
function migrateV13(saveFile: SaveFile): SaveFile {
  return { ...saveFile, schemaVersion: 14 };
}

/** v14→v15 旧档迁移（2026-06-29 结局双入口）：旧 ending 补 unlockStudio（默认 false）；新 Rank 'zhihou' 无需迁移（仅结局时写入） */
function migrateV14(saveFile: SaveFile): SaveFile {
  const ending = saveFile.gameState.ending;
  if (ending && typeof (ending as { unlockStudio?: boolean }).unlockStudio !== 'boolean') {
    (ending as { unlockStudio: boolean }).unlockStudio = false;
  }
  return { ...saveFile, schemaVersion: 15 };
}

/**
 * v15→v16 骸游图 flag 翻译（2026-07-02 秘阁五幕重做）——纯函数，就地改传入 flags：
 * - 云起时 flag 翻译为骸游图语义：noticedWaterEndCloudStrong→haiyouThreadStrong、secondScrollTeased→haiyouDisappearanceHooked；删旧键。
 * - 补七日预收集线索幂等守卫 *Seen flag（默认 false）+ haiyouRevealed。
 * 导出供 node 单测直接验证（防 test 复刻逻辑漂移）。
 */
export function migrateHaiyouFlagsV15(flags: Record<string, boolean>): Record<string, boolean> {
  flags.haiyouThreadStrong ??= flags.noticedWaterEndCloudStrong ?? false;
  flags.haiyouDisappearanceHooked ??= flags.secondScrollTeased ?? false;
  flags.haiyouRevealed ??= false;
  flags.clueArchiveNamesSeen ??= false;
  flags.clueColophonSeen ??= false;
  flags.clueSecondScrollSeen ??= false;
  flags.clueMarketHardshipSeen ??= false;
  delete flags.noticedWaterEndCloudWeak;
  delete flags.noticedWaterEndCloudStrong;
  delete flags.secondScrollTeased;
  return flags;
}

/**
 * v15→v16 旧档迁移（2026-07-02 秘阁五幕重做）：flag 翻译（见 migrateHaiyouFlagsV15）；
 * PuzzleState.haiyouRevealTier 为可选字段，旧档无即 undefined（passthrough）。
 */
function migrateV15(saveFile: SaveFile): SaveFile {
  migrateHaiyouFlagsV15(saveFile.gameState.progress.flags as Record<string, boolean>);
  return { ...saveFile, schemaVersion: 16 };
}

/** v16→v17（2026-07-07 天气随机化）：补 weatherWeek。旧档沿用固定表——半程玩家已看过的天气不能变。 */
function migrateV16(saveFile: SaveFile): SaveFile {
  if (!saveFile.gameState.weatherWeek) {
    saveFile.gameState.weatherWeek = legacyWeatherWeek();
  }
  return { ...saveFile, schemaVersion: SCHEMA_VERSION };
}

export function saveGameState(gameState: GameState) {
  const previous = loadSaveFile();
  const saveFile = createSaveFile(gameState, previous ?? undefined);
  localStorage.setItem(SAVE_KEY, JSON.stringify(saveFile));
}

export function loadSaveFile(): SaveFile | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return null;
    }
    let parsed = JSON.parse(raw) as SaveFile;
    if (!parsed?.gameState) {
      return null;
    }
    if (parsed.schemaVersion === 4) {
      parsed = migrateV4(parsed);
    }
    if (parsed.schemaVersion === 5) {
      parsed = migrateV5(parsed);
    }
    if (parsed.schemaVersion === 6) {
      parsed = migrateV6(parsed);
    }
    if (parsed.schemaVersion === 7) {
      parsed = migrateV7(parsed);
    }
    if (parsed.schemaVersion === 8) {
      parsed = migrateV8(parsed);
    }
    if (parsed.schemaVersion === 9) {
      parsed = migrateV9(parsed);
    }
    if (parsed.schemaVersion === 10) {
      parsed = migrateV10(parsed);
    }
    if (parsed.schemaVersion === 11) {
      parsed = migrateV11(parsed);
    }
    if (parsed.schemaVersion === 12) {
      parsed = migrateV12(parsed);
    }
    if (parsed.schemaVersion === 13) {
      parsed = migrateV13(parsed);
    }
    if (parsed.schemaVersion === 14) {
      parsed = migrateV14(parsed);
    }
    if (parsed.schemaVersion === 15) {
      parsed = migrateV15(parsed);
    }
    if (parsed.schemaVersion === 16) {
      parsed = migrateV16(parsed);
    }
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSaveFile() {
  localStorage.removeItem(SAVE_KEY);
}

