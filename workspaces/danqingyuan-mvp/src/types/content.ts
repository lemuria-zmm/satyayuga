import type { LlmRole, NpcId, SkillId } from './core';
import type { ActionRequirement } from './actions';

export type WorldbookEntryType =
  | 'place'
  | 'system'
  | 'rank'
  | 'skill'
  | 'painting'
  | 'item'
  | 'clue'
  | 'term'
  | 'event'
  | 'motif';

export interface WorldbookEntry {
  id: string;
  name: string;
  type: WorldbookEntryType;
  visibleDescription: string;
  hiddenDescription?: string;
  relatedNpcIds: NpcId[];
  relatedClueIds: string[];
  applicableLlmRoles: LlmRole[];
  misuseWarnings: string[];
}

export interface PaintingBible {
  id: string;
  title: string;
  visibleSummary: string;
  hiddenSummary: string;
  requiredElements: string[];
  anomalies: PaintingAnomaly[];
  clueIds: string[];
  coreThemes: string[];
  partialInterpretations: string[];
  forbiddenInterpretations: string[];
  spoilerBoundaries: string[];
}

export interface PaintingAnomaly {
  id: string;
  visibleText: string;
  relatedSkillIds: SkillId[];
  requiredSkillToNotice?: Partial<Record<SkillId, number>>;
  grantsClueId?: string;
}

export interface EventTemplate {
  id: string;
  locationId?: string;
  npcId?: NpcId;
  priority: number;
  once: boolean;
  requirements: ActionRequirement[];
  result: EventStaticResult | EventLlmResult;
}

export interface EventStaticResult {
  kind: 'static';
  text: string;
}

export interface EventLlmResult {
  kind: 'llm';
  llmRole: LlmRole;
  promptTemplateId: string;
}

