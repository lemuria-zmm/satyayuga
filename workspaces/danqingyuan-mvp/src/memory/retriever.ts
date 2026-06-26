import { WORLDBOOK_ENTRIES } from '../content/worldbook';
import type { GameState, LlmRole, NpcId, RetrievedMemoryContext } from '../types';

export function buildMemoryContext(state: GameState, role: LlmRole, npcId?: NpcId): RetrievedMemoryContext {
  const relatedWorldbook = WORLDBOOK_ENTRIES.filter((entry) => entry.applicableLlmRoles.includes(role));

  return {
    coreCanonExcerpt: state.memory.coreCanon.worldPremise,
    worldbookEntries: relatedWorldbook,
    characterMemory: npcId ? state.memory.characterMemories[npcId] : undefined,
    recentLedgerEntries: state.memory.storyLedger.slice(-3),
    playerStyle: state.memory.playerStyle,
    relatedClueNodes: state.memory.clueGraph.nodes.filter((node) => node.discovered),
    summaries: state.memory.summaries.slice(-2),
    canonWarnings: state.memory.coreCanon.spoilerBoundaries,
  };
}

