import type { ActionType, GameState, LocationId, MemoryPatch, NpcId, TimeSlot } from '../types';
import type { SceneEntity } from '../types/llm';
import type { ClueGraphNode } from '../types/memory';

interface CommitMemoryInput {
  state: GameState;
  actionType: ActionType;
  renderedText: string;
  memoryPatch?: MemoryPatch;
  locationId?: LocationId;
  npcId?: NpcId;
  /** 档案实体（2026-07-01）：LLM 报的本段新登场事物，去重入 clueGraph.nodes */
  entities?: SceneEntity[];
}

/** 档案库归一化 key：kind + 去空白/书名号引号的 name（防「《千里江山卷》」与「千里江山卷」重复入库） */
function entityKey(kind: string, name: string): string {
  return `${kind}:${name.replace(/[《》\s“”"']/g, '')}`;
}

/**
 * 档案实体去重入库（2026-07-01）：把 LLM 报的 entities 并入 clueGraph.nodes（discovered:true）。
 * 已存在（同 kind+归一化 name）的跳过。返回新 nodes 数组 + 本次真正新增的节点（供主界面飘「新增」提示）。
 */
export function mergeDiscoveredEntities(
  nodes: ClueGraphNode[],
  entities: SceneEntity[] | undefined,
): { nodes: ClueGraphNode[]; added: ClueGraphNode[] } {
  if (!entities?.length) return { nodes, added: [] };
  const existing = new Set(nodes.map((n) => entityKey(n.kind, n.label)));
  const next = [...nodes];
  const added: ClueGraphNode[] = [];
  for (const e of entities) {
    const key = entityKey(e.kind, e.name);
    if (existing.has(key)) continue;
    existing.add(key);
    const node: ClueGraphNode = {
      id: `node-${e.kind}-${next.length}-${added.length}`,
      label: e.name,
      kind: e.kind,
      discovered: true,
      hidden: false,
      note: e.note || undefined,
    };
    next.push(node);
    added.push(node);
  }
  return { nodes: next, added };
}

export function commitMemoryPatch({
  state,
  actionType,
  renderedText,
  memoryPatch,
  locationId,
  npcId,
  entities,
}: CommitMemoryInput): GameState {
  const next: GameState = structuredClone(state);

  if (entities?.length) {
    next.memory.clueGraph.nodes = mergeDiscoveredEntities(next.memory.clueGraph.nodes, entities).nodes;
  }

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

