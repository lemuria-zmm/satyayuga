/**
 * 秘阁五幕态机（2026-07-02 秘阁五幕重做）——纯函数，便于单测。
 *
 * 秘阁观《骸游图》从旧扁平两段（观画→解读）改为五幕线性演出：
 *   【一 入阁】→【二 观画】→【三 缀线】→【四 解读】→【五 揭卷】
 *
 * - 入阁：展示七日带入的线索（carried）。
 * - 观画：从画面异常里选出不安处，解锁秘阁线索（observe）。gate：≥1 异常。
 * - 缀线：把 carried + observe 线索组合选取，带入解读。gate：≥MIN_THREAD 条且跨≥2 来源。
 * - 解读：自由文 + 选取线索 → LLM 评 tier（core/partial/shallow）。
 * - 揭卷：按 tier 分档固定脚本揭示四人共创（HaiyouRevealScreen）。序列终点。
 *
 * PuzzleActState 的 act 游标是 UI 临时态（不入存档）；线索/tier 落 PuzzleState。
 */
export type PuzzleAct = 'enter' | 'observe' | 'thread' | 'interpret' | 'reveal';

/** 缀线最少选取线索数（跨≥2 来源） */
export const MIN_THREAD_CLUES = 3;
export const MIN_THREAD_SOURCES = 2;

export interface PuzzleActContext {
  /** 观画已选异常数 */
  observedAnomalyCount: number;
  /** 缀线已选线索数 */
  threadedClueCount: number;
  /** 缀线已选线索覆盖的来源数（书房/希孟/秘阁/街市） */
  threadedSourceCount: number;
}

/** 某一幕是否满足推进到下一幕的条件（gate）。 */
export function canAdvanceAct(current: PuzzleAct, ctx: PuzzleActContext): boolean {
  switch (current) {
    case 'enter':
      return true;
    case 'observe':
      return ctx.observedAnomalyCount >= 1;
    case 'thread':
      return ctx.threadedClueCount >= MIN_THREAD_CLUES && ctx.threadedSourceCount >= MIN_THREAD_SOURCES;
    case 'interpret':
      return true; // 解读的提交 gate 由自由文长度另判（canSubmit）
    case 'reveal':
      return true;
  }
}

/** 线性推进：下一幕（null = 序列终点，揭卷后关闭）。 */
export function nextAct(current: PuzzleAct): PuzzleAct | null {
  switch (current) {
    case 'enter':
      return 'observe';
    case 'observe':
      return 'thread';
    case 'thread':
      return 'interpret';
    case 'interpret':
      return 'reveal';
    case 'reveal':
      return null;
  }
}

/** 幕序号 + 标题（顶栏展示）。 */
export const ACT_LABELS: Record<PuzzleAct, string> = {
  enter: '一 · 入阁',
  observe: '二 · 观画',
  thread: '三 · 缀线',
  interpret: '四 · 解读',
  reveal: '五 · 揭卷',
};
