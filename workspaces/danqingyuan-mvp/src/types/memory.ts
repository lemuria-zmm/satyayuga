import type { ActionType } from './actions';
import type { LocationId, NpcId, SkillId, TimeSlot } from './core';
import type { WorldbookEntry } from './content';

export interface MemoryState {
  coreCanon: CoreCanonMemory;
  storyLedger: StoryLedgerEntry[];
  characterMemories: Record<NpcId, CharacterMemory>;
  playerStyle: PlayerStyleMemory;
  clueGraph: ClueGraphMemory;
  summaries: SummaryMemoryEntry[];
  /** 地点剧情线程（2026-06-16）：地点→上次该地最后一场的摘要，回到该地时喂 LLM 承接本地旧迹 */
  locationThreads?: Partial<Record<LocationId, string>>;
}

export interface CoreCanonMemory {
  version: string;
  worldPremise: string;
  hiddenAnchors: HiddenAnchor[];
  spoilerBoundaries: string[];
  forbiddenCanonDrifts: string[];
}

export interface HiddenAnchor {
  id: string;
  codename: string;
  privateTruth: string;
  allowedForeshadowing: string[];
  forbiddenReveals: string[];
}

export interface StoryLedgerEntry {
  id: string;
  day: number;
  timeSlot: TimeSlot;
  locationId?: LocationId;
  npcId?: NpcId;
  actionType: ActionType;
  summary: string;
  visibleText?: string;
  gainedClueIds: string[];
  flagsSet: string[];
  createdAt: string;
}

export interface CharacterMemory {
  npcId: NpcId;
  impressionOfPlayer: string;
  knownPlayerStyleTags: string[];
  knownClueIds: string[];
  avoidedTopics: string[];
  relationshipNotes: string[];
  lastSummary: string;
}

export interface PlayerStyleMemory {
  tags: string[];
  skillBias: SkillId[];
  interpretationPatterns: string[];
  notableChoices: string[];
}

export interface ClueGraphMemory {
  nodes: ClueGraphNode[];
  edges: ClueGraphEdge[];
}

export interface ClueGraphNode {
  id: string;
  label: string;
  kind: 'painting' | 'clue' | 'npc' | 'place' | 'motif' | 'item';
  discovered: boolean;
  hidden: boolean;
  /** ≤40 字一句话说明（档案库展示，2026-07-01） */
  note?: string;
}

export interface ClueGraphEdge {
  id: string;
  from: string;
  to: string;
  relation: string;
  discovered: boolean;
}

export interface SummaryMemoryEntry {
  id: string;
  kind: 'daily' | 'exam' | 'puzzle' | 'chapter';
  day: number;
  summary: string;
  relatedNpcIds: NpcId[];
  relatedClueIds: string[];
}

export interface MemoryPatch {
  characterImpression?: string;
  playerStyleTags?: string[];
  storyLedgerNote?: string;
  clueLinks?: Array<[string, string, string]>;
  summaryCandidate?: string;
}

export interface RetrievedMemoryContext {
  coreCanonExcerpt: string;
  worldbookEntries: WorldbookEntry[];
  characterMemory?: CharacterMemory;
  recentLedgerEntries: StoryLedgerEntry[];
  playerStyle: PlayerStyleMemory;
  relatedClueNodes: ClueGraphNode[];
  summaries: SummaryMemoryEntry[];
  canonWarnings: string[];
}

