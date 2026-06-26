import { useMemo, useState } from 'react';
import { COURSES, COURSE_BY_SKILL, COURSE_IDS, SCHEDULABLE_DAYS, validateCurriculum } from '../content/courses';
import type { CourseId, CurriculumState, SkillId } from '../types';

interface SchedulePlannerProps {
  majorSkill: SkillId;
  onConfirm: (curriculum: CurriculumState) => void;
}

const SKILL_LABELS: Record<SkillId, string> = {
  landscape: '山水',
  figure: '人物',
  architecture: '界画',
};

/** 课表自填页（拍板）：晨课 7 格，第 7 日固定丹青试；本科必修 ≥3、其余画科选修合计 ≥2 */
export function SchedulePlanner({ majorSkill, onConfirm }: SchedulePlannerProps) {
  const [curriculum, setCurriculum] = useState<CurriculumState>({});
  const majorCourse = COURSE_BY_SKILL[majorSkill];
  const problems = useMemo(() => validateCurriculum(curriculum, majorSkill), [curriculum, majorSkill]);
  const canConfirm = problems.length === 0;

  function setCourse(day: number, courseId: CourseId) {
    setCurriculum((prev) => ({ ...prev, [day]: courseId }));
  }

  return (
    <div className="planner-backdrop">
      <div className="planner-card">
        <h2 className="planner-title">自填课表</h2>
        <p className="planner-sub">
          李唐为总教习，每日晨课一节。你的本科是<strong>{SKILL_LABELS[majorSkill]}</strong>：本科须修满 3
          节，其余画科选修合计 2 节，剩余 1 节自便。第七日为丹青试，不可更改。
        </p>
        <div className="planner-grid">
          {SCHEDULABLE_DAYS.map((day) => (
            <div key={day} className="planner-row">
              <span className="planner-day">第{day}日</span>
              <div className="planner-options">
                {COURSE_IDS.map((courseId) => {
                  const course = COURSES[courseId];
                  // 第一日不可排自由临摹（2026-06-25）：刚入院就外出写生违和，第一日须正课打底
                  if (day === 1 && course.freeChoice) return null;
                  const selected = curriculum[day] === courseId;
                  const isMajor = courseId === majorCourse;
                  return (
                    <button
                      key={courseId}
                      type="button"
                      className={`planner-chip${selected ? ' planner-chip--selected' : ''}${isMajor ? ' planner-chip--major' : ''}`}
                      onClick={() => setCourse(day, courseId)}
                    >
                      {course.label}
                      {isMajor ? '·本科' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="planner-row planner-row--locked">
            <span className="planner-day">第7日</span>
            <div className="planner-options">
              <span className="planner-chip planner-chip--locked">丹青试（李唐监考）</span>
            </div>
          </div>
        </div>
        {problems.length > 0 ? (
          <ul className="planner-problems">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        ) : (
          <p className="planner-ok">课表已合院规，可呈总教习过目。</p>
        )}
        <button type="button" className="planner-confirm" disabled={!canConfirm} onClick={() => onConfirm(curriculum)}>
          呈上课表
        </button>
      </div>
    </div>
  );
}
