import type { CourseId, CurriculumState, NpcId, SkillId } from '../types';

/** 晨课课程池（2026-06-11 拍板）：山水/画理=李唐（总教习），人物=嵩，界画=择端；自由临摹无人授课 */
export interface CourseDef {
  id: CourseId;
  label: string;
  /** 授课导师（自由临摹无） */
  teacher?: NpcId;
  /** 对应画科（画理课/自由临摹为空） */
  skillId?: SkillId;
  /** 固定技能收益 */
  skillBonus?: Partial<Record<SkillId, number>>;
  /** 固定学识收益 */
  knowledgeBonus?: number;
  /** 自由临摹：玩家自选一项技能 +1 */
  freeChoice?: boolean;
  /** 模板叙述（LLM 失败时的兜底） */
  narrative: string;
}

export const COURSES: Record<CourseId, CourseDef> = {
  landscape_class: {
    id: 'landscape_class',
    label: '山水课',
    teacher: 'litang',
    skillId: 'landscape',
    skillBonus: { landscape: 1 },
    knowledgeBonus: 1,
    narrative: '李唐展开一幅范宽旧摹，指点远近高低："山有脉，水有源。看不见源头的水，不要轻易下笔。"',
  },
  figure_class: {
    id: 'figure_class',
    label: '人物课',
    teacher: 'song',
    skillId: 'figure',
    skillBonus: { figure: 1 },
    knowledgeBonus: 1,
    narrative: '嵩挂出一幅市井小品，让众人看那挑夫的肩："画人先画他的活法。肩上有多少斤两，脸上就有多少日子。"',
  },
  architecture_class: {
    id: 'architecture_class',
    label: '界画课',
    teacher: 'zeduan',
    skillId: 'architecture',
    skillBonus: { architecture: 1 },
    knowledgeBonus: 1,
    narrative: '择端以界尺压纸，演示桥梁结构："屋有法度，桥有承落。乱一笔，城就塌一角。"',
  },
  theory_class: {
    id: 'theory_class',
    label: '画理课',
    teacher: 'litang',
    knowledgeBonus: 2,
    narrative: '今日移课书房。李唐取出几册旧画论，讲"气韵"二字讲了半晌，末了只说："读画，先读画外。"',
  },
  free_copy: {
    id: 'free_copy',
    label: '自由临摹',
    freeChoice: true,
    narrative: '今日无人授课。院堂里各自铺纸，墨声沙沙，李唐偶尔踱过，看一眼，不说话。',
  },
};

export const COURSE_IDS: CourseId[] = ['landscape_class', 'figure_class', 'architecture_class', 'theory_class', 'free_copy'];

/** 可排课的日子：第 1~6 日；第 7 日固定丹青试 */
export const SCHEDULABLE_DAYS = [1, 2, 3, 4, 5, 6];

export const COURSE_BY_SKILL: Record<SkillId, CourseId> = {
  landscape: 'landscape_class',
  figure: 'figure_class',
  architecture: 'architecture_class',
};

/**
 * 课表约束（拍板）：6 格可排——本科必修 ≥3，其余两科合计 ≥2（选修），剩余自由。
 * 返回未满足的约束说明；空数组即合法。
 */
export function validateCurriculum(curriculum: CurriculumState, majorSkill: SkillId): string[] {
  const problems: string[] = [];
  const majorCourse = COURSE_BY_SKILL[majorSkill];
  let majorCount = 0;
  let electiveCount = 0;
  let filled = 0;
  for (const day of SCHEDULABLE_DAYS) {
    const courseId = curriculum[day];
    if (!courseId) continue;
    filled += 1;
    // 第一日不可排自由临摹（2026-06-25）：刚入院须正课打底，不宜外出写生
    if (day === 1 && COURSES[courseId]?.freeChoice) problems.push('第一日不可排自由临摹，请改排正课');
    if (courseId === majorCourse) majorCount += 1;
    else if (COURSES[courseId]?.skillId) electiveCount += 1;
  }
  if (filled < SCHEDULABLE_DAYS.length) problems.push(`还有 ${SCHEDULABLE_DAYS.length - filled} 日晨课未排`);
  if (majorCount < 3) problems.push(`本科（${COURSES[majorCourse].label}）须修满 3 节，现 ${majorCount} 节`);
  if (electiveCount < 2) problems.push(`其余画科选修须合计 2 节，现 ${electiveCount} 节`);
  return problems;
}

/** 考试加权（拍板）：按已修课程统计画科权重，本科保底靠前 */
export function getStudiedSkills(curriculum: CurriculumState | undefined, majorSkill: SkillId): SkillId[] {
  const counts: Record<SkillId, number> = { landscape: 0, figure: 0, architecture: 0 };
  counts[majorSkill] += 1; // 本科保底
  for (const courseId of Object.values(curriculum ?? {})) {
    const skillId = COURSES[courseId]?.skillId;
    if (skillId) counts[skillId] += 1;
  }
  return (Object.keys(counts) as SkillId[])
    .filter((skillId) => counts[skillId] > 0)
    .sort((a, b) => counts[b] - counts[a]);
}
