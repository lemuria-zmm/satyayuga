import { INITIAL_FLAGS } from '../content/flags';
import type { CharacterMemory, FamilyOrigin, GameState, NpcId, PlayerProfile, SkillState } from '../types';

const npcIds: NpcId[] = ['ximeng', 'zeduan', 'litang', 'song'];

function createCharacterMemory(npcId: NpcId): CharacterMemory {
  return {
    npcId,
    impressionOfPlayer: '尚未形成明确印象。',
    knownPlayerStyleTags: [],
    knownClueIds: [],
    avoidedTopics: [],
    relationshipNotes: [],
    lastSummary: '',
  };
}

export interface CreateGameStateOptions {
  player?: Partial<
    Pick<PlayerProfile, 'name' | 'pronounLabel' | 'styleOrigin' | 'gender' | 'age' | 'origin' | 'personality' | 'aspiration'>
  >;
}

function createInitialSkills(styleOrigin: PlayerProfile['styleOrigin']): SkillState {
  const skills: SkillState = { landscape: 10, figure: 10, architecture: 10 };
  skills[styleOrigin] = 18;
  return skills;
}

/** 出身轻微影响初始数值（拍板：小幅影响，不 gate 玩法） */
const ORIGIN_EFFECTS: Record<
  FamilyOrigin,
  { money?: number; knowledge?: number; mood?: number; architecture?: number; maxStamina?: number }
> = {
  merchant: { money: 5 },
  farming_scholar: { knowledge: 3 },
  official_branch: { money: 5, knowledge: 2, mood: -1 },
  artisan: { architecture: 2 },
  displaced: { maxStamina: 1, money: -5 },
};

export function createInitialGameState(options: CreateGameStateOptions = {}): GameState {
  const styleOrigin = options.player?.styleOrigin ?? 'landscape';
  const playerName = options.player?.name?.trim() || '新入院者';
  const origin = options.player?.origin ?? 'farming_scholar';
  const originEffect = ORIGIN_EFFECTS[origin];

  const skills = createInitialSkills(styleOrigin);
  if (originEffect.architecture) skills.architecture += originEffect.architecture;

  const maxStamina = 10 + (originEffect.maxStamina ?? 0);

  return {
    version: 1,
    saveId: `save-${Date.now()}`,
    player: {
      id: 'player',
      name: playerName,
      pronounLabel: options.player?.pronounLabel ?? '你',
      styleOrigin,
      gender: options.player?.gender ?? 'female',
      age: options.player?.age ?? 18,
      origin,
      personality: options.player?.personality?.trim() || '好奇敏锐',
      aspiration: options.player?.aspiration?.trim() || '成为画院的待诏，画出传世名作',
    },
    time: {
      day: 1,
      maxDay: 7,
      timeSlot: 'morning_class',
      stamina: 8,
      maxStamina,
      nextDayStaminaBonus: 0,
      isExamDay: false,
      narrativeCharsToday: 0,
      slotSceneCount: 0,
    },
    stats: {
      mood: Math.max(0, Math.min(10, 6 + (originEffect.mood ?? 0))),
      knowledge: Math.max(0, originEffect.knowledge ?? 0),
      // 初始钱 = 第 1 日点卯例钱（与 DAILY_ALLOWANCE 一致，2026-06-12 降为 5）+ 出身修正
      money: Math.max(0, 5 + (originEffect.money ?? 0)),
    },
    skills,
    progress: {
      rank: 'student',
      // 第 1 日教程流（拍板）：开局仅院堂；各时段由小书童引导渐次解锁；第 2 日起全开放
      unlockedLocations: ['hall'],
      triggeredEventIds: [],
      completedEventIds: [],
      flags: { ...INITIAL_FLAGS, visited_hall: true },
    },
    currentLocation: 'hall',
    relationships: {
      ximeng: {
        npcId: 'ximeng',
        hiddenAffinity: 0,
        stage: 'stranger',
        emotionState: 'distant',
        unlockedTopics: ['问画', '闲谈'],
      },
      zeduan: {
        npcId: 'zeduan',
        hiddenAffinity: 0,
        stage: 'stranger',
        emotionState: 'noticing',
        unlockedTopics: ['请教界画', '问街市'],
      },
      litang: {
        npcId: 'litang',
        hiddenAffinity: 0,
        stage: 'stranger',
        emotionState: 'silent',
        unlockedTopics: ['请教山水', '问丹青试'],
      },
      song: {
        npcId: 'song',
        hiddenAffinity: 0,
        stage: 'stranger',
        emotionState: 'noticing',
        unlockedTopics: ['请教人物', '问画中人'],
      },
    },
    puzzle: {
      discoveredAnomalyIds: [],
      collectedClueIds: [],
      interpretationHistory: [],
      unlockedPaintingIds: [],
    },
    memory: {
      coreCanon: {
        version: 'mvp-0.1',
        worldPremise: '丹青院是架空宫廷画院，玩家在此修习、应试、读画。',
        hiddenAnchors: [
          {
            id: 'cloud_rise_time',
            codename: '云起时',
            privateTruth: '希孟未来消失与画中反复出现的隐藏地点有关。',
            allowedForeshadowing: ['水路断绝', '云气升起', '留白遮蔽', '路径不合逻辑'],
            forbiddenReveals: ['希孟未来会消失', '云起时是真实地点', '云起时可拯救苍生'],
          },
        ],
        spoilerBoundaries: ['不得透露希孟未来消失', '不得透露云起时真实含义'],
        forbiddenCanonDrifts: ['现代医学解释', '超自然诅咒', '单一宫斗阴谋'],
      },
      storyLedger: [],
      characterMemories: Object.fromEntries(npcIds.map((npcId) => [npcId, createCharacterMemory(npcId)])) as GameState['memory']['characterMemories'],
      playerStyle: {
        tags: [],
        skillBias: [],
        interpretationPatterns: [],
        notableChoices: [],
      },
      clueGraph: {
        nodes: [],
        edges: [],
      },
      summaries: [],
    },
    lastRenderedText: `${playerName}站在丹青院门前。门内墨香很淡，像一场尚未落纸的雨。`,
    pendingHooks: [],
    suggestedIntents: {},
  };
}
