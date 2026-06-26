export const INITIAL_FLAGS = {
  metXimeng: false,
  /** 走进书房掷点遇上希孟（待播首遇脚本；播完即清） */
  ximeng_in_library: false,
  /** 第 1 日教程流：各时段小书童引导是否已播（第 2 日起全开放时一并落真） */
  tutorial_forenoon_done: false,
  tutorial_noon_done: false,
  tutorial_afternoon_done: false,
  tutorial_evening_done: false,
  firstExamTaken: false,
  firstExamPassed: false,
  archiveEntranceHeard: false,
  archiveUnlocked: false,
  haiyouDiscovered: false,
  haiyouFirstInterpreted: false,
  noticedWaterEndCloudWeak: false,
  noticedWaterEndCloudStrong: false,
  secondScrollTeased: false,
  /** 买画材 buff（2026-06-12）：下次成长行动（晨课/写生/查证）技能或学识收益 +1，生效后清 */
  art_supplies_ready: false,
} as const;

export type InitialFlagId = keyof typeof INITIAL_FLAGS;

