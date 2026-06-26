import { useMemo } from 'react';
import { LOCATIONS } from '../content/locations';
import { TIME_SLOT_ORDER } from '../types/core';
import type { StoryLedgerEntry, SummaryMemoryEntry, TimeSlot } from '../types';

interface ArchiveScreenProps {
  ledger: StoryLedgerEntry[];
  summaries: SummaryMemoryEntry[];
  onClose: () => void;
}

const timeSlotLabels: Record<TimeSlot, string> = {
  morning_class: '晨课',
  forenoon: '上午',
  noon: '午间',
  afternoon: '下午',
  evening: '晚间',
};

/**
 * 画案手记（2026-06-16）：阅读档案，按 日×时段 编年列出所有场景全文（storyLedger.visibleText），
 * 每日页眉显示当日小结提要（summaries）。纯只读回看，复用现有记忆数据。
 */
export function ArchiveScreen({ ledger, summaries, onClose }: ArchiveScreenProps) {
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

  return (
    <main className="arc-page">
      <header className="arc-top-bar">
        <span className="arc-title">画案手记</span>
        <button className="arc-close-btn" onClick={onClose} type="button">合卷</button>
      </header>

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
    </main>
  );
}
