import type { ActionType, GameState, LocationId, MemoryPatch, NpcId, TimeSlot } from '../types';

interface CommitMemoryInput {
  state: GameState;
  actionType: ActionType;
  renderedText: string;
  memoryPatch?: MemoryPatch;
  locationId?: LocationId;
  npcId?: NpcId;
}

export function commitMemoryPatch({
  state,
  actionType,
  renderedText,
  memoryPatch,
  locationId,
  npcId,
}: CommitMemoryInput): GameState {
  const next: GameState = structuredClone(state);

  if (memoryPatch?.storyLedgerNote) {
    next.memory.storyLedger.push({
      id: `ledger-${Date.now()}-${next.memory.storyLedger.length}`,
      day: state.time.day,
      timeSlot: state.time.timeSlot as TimeSlot,
      locationId,
      npcId,
      actionType,
      summary: memoryPatch.storyLedgerNote,
      visibleText: renderedText,
      gainedClueIds: [],
      flagsSet: [],
      createdAt: new Date().toISOString(),
    });
  }

  if (npcId && memoryPatch?.characterImpression) {
    next.memory.characterMemories[npcId].impressionOfPlayer = memoryPatch.characterImpression;
    next.memory.characterMemories[npcId].relationshipNotes.push(memoryPatch.characterImpression);
  }

  if (memoryPatch?.playerStyleTags?.length) {
    next.memory.playerStyle.tags = Array.from(new Set([...next.memory.playerStyle.tags, ...memoryPatch.playerStyleTags]));
  }

  if (memoryPatch?.clueLinks?.length) {
    for (const [from, relation, to] of memoryPatch.clueLinks) {
      next.memory.clueGraph.edges.push({
        id: `edge-${next.memory.clueGraph.edges.length}`,
        from,
        to,
        relation,
        discovered: true,
      });
    }
  }

  return next;
}

