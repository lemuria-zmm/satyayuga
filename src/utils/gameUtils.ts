import { EVENTS } from "../gameData";
import type { Metrics, StageStats } from "../types";

const STAGE_ORDER = ["firstMeet", "ambiguous", "confession", "honeymoon", "adjustment", "stable"];

export function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function deepSet<T extends object>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const next = structuredClone(obj) as Record<string, any>;
  let node: Record<string, any> = next;
  for (let i = 0; i < keys.length - 1; i++) node = node[keys[i]];
  node[keys[keys.length - 1]] = value;
  return next as T;
}

export function computeStageStats(currentEventIndex: number): StageStats {
  const currentEvent = EVENTS[currentEventIndex] || EVENTS[EVENTS.length - 1];
  const currentStage = currentEvent ? currentEvent.stage : "stable";
  const stageIndex = STAGE_ORDER.indexOf(currentStage);
  return { stageOrder: STAGE_ORDER, currentStage, stageIndex };
}

export function computeEnding(metrics: Metrics): { key: "perfect" | "happy" | "normal" | "regret" | "sad"; score: number } {
  const score = clamp(metrics.affection * 0.4 + metrics.chemistry * 0.3 + metrics.understanding * 0.3);
  let key: "perfect" | "happy" | "normal" | "regret" | "sad" = "sad";
  if (score >= 85) key = "perfect";
  else if (score >= 70) key = "happy";
  else if (score >= 50) key = "normal";
  else if (score >= 30) key = "regret";
  return { key, score };
}
