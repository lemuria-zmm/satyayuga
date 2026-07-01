import { useMemo, useState } from 'react';
import { LOCATIONS } from '../content/locations';
import { TIME_SLOT_ORDER } from '../types/core';
import type { StoryLedgerEntry, SummaryMemoryEntry, TimeSlot } from '../types';
import type { ClueGraphNode } from '../types/memory';

interface ArchiveScreenProps {
  ledger: StoryLedgerEntry[];
  summaries: SummaryMemoryEntry[];
  /** 档案库节点（2026-07-01）：LLM 抽取的人物/线索/道具/地点，去重入 clueGraph */
  entities?: ClueGraphNode[];
  onClose: () => void;
}

const timeSlotLabels: Record<TimeSlot, string> = {
  morning_class: '晨课',
  forenoon: '上午',
  noon: '午间',
  afternoon: '下午',
  evening: '晚间',
};

/** 档案分类（2026-07-01）：按 kind 分组展示的顺序与中文名 */
const ARCHIVE_GROUPS: { kind: ClueGraphNode['kind']; label: string }[] = [
  { kind: 'npc', label: '人物' },
  { kind: 'clue', label: '线索' },
  { kind: 'item', label: '道具' },
  { kind: 'place', label: '地点' },
  { kind: 'painting', label: '画作' },
  { kind: 'motif', label: '母题' },
];

/**
 * 画案手记（2026-06-16；2026-07-01 加档案库分区）：两页签——
 * ①记事：按 日×时段 编年列出场景全文（storyLedger.visibleText）+ 当日提要；
 * ②档案：按类别列出已发现的人物/线索/道具/地点（clueGraph.nodes）。
 */
export function ArchiveScreen({ ledger, summaries, entities = [], onClose }: ArchiveScreenProps) {
  const [tab, setTab] = useState<'chronicle' | 'dossier'>('chronicle');
  const days = useMemo(() => {
    const byDay = new Map<number, StoryLedgerEntry[]>();
    for (const entry of ledger) {
      const list = byDay.get(entry.day) ?? [];
      list.push(entry);
      byDay.set(entry.day, list);
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([day, entries]) => ({
        day,
        digest: summaries.filter((s) => s.day === day).map((s) => s.summary).join('；'),
        entries: [...entries].sort(
          (x, y) => TIME_SLOT_ORDER.indexOf(x.timeSlot) - TIME_SLOT_ORDER.indexOf(y.timeSlot),
        ),
      }));
  }, [ledger, summaries]);

  const groups = useMemo(
    () =>
      ARCHIVE_GROUPS.map((g) => ({
        ...g,
        items: entities.filter((e) => e.kind === g.kind && e.discovered),
      })).filter((g) => g.items.length > 0),
    [entities],
  );
  const dossierEmpty = groups.length === 0;

  return (
    <main className="arc-page">
      <header className="arc-top-bar">
        <span className="arc-title">画案手记</span>
        <div className="arc-tabs">
          <button className={`arc-tab ${tab === 'chronicle' ? 'active' : ''}`} onClick={() => setTab('chronicle')} type="button">记事</button>
          <button className={`arc-tab ${tab === 'dossier' ? 'active' : ''}`} onClick={() => setTab('dossier')} type="button">档案</button>
        </div>
        <button className="arc-close-btn" onClick={onClose} type="button">合卷</button>
      </header>

      {tab === 'dossier' ? (
        <div className="arc-scroll">
          {dossierEmpty && <p className="arc-empty">画案上还没有记下什么人、什么物。多走动、多留心便有了。</p>}
          {groups.map((g) => (
            <section className="arc-dossier-group" key={g.kind}>
              <h2 className="arc-dossier-title">{g.label}<span className="arc-dossier-count">{g.items.length}</span></h2>
              <div className="arc-dossier-list">
                {g.items.map((e) => (
                  <article className={`arc-dossier-card arc-dossier-${e.kind}`} key={e.id}>
                    <strong className="arc-dossier-name">{e.label}</strong>
                    {e.note && <p className="arc-dossier-note">{e.note}</p>}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
      <div className="arc-scroll">
        {days.length === 0 && <p className="arc-empty">尚无记述。画案上还是一片空白。</p>}
        {days.map(({ day, digest, entries }) => (
          <section className="arc-day" key={day}>
            <h2 className="arc-day-title">第 {day} 日</h2>
            {digest && <p className="arc-day-digest">{digest}</p>}
            {entries.map((entry) => (
              <article className="arc-entry" key={entry.id}>
                <div className="arc-entry-head">
                  <span className="arc-entry-slot">{timeSlotLabels[entry.timeSlot]}</span>
                  {entry.locationId && (
                    <span className="arc-entry-loc">{LOCATIONS[entry.locationId]?.name ?? ''}</span>
                  )}
                </div>
                <p className="arc-entry-text">{entry.visibleText || entry.summary}</p>
              </article>
            ))}
          </section>
        ))}
      </div>
      )}
    </main>
  );
}
