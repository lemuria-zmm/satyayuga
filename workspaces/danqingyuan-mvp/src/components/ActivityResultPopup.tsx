import type { ValidatedStatePatch } from '../types';
import { buildSettlementLines } from './settlementLines';

export interface ActivityResult {
  /** 弹窗场景图（食物/活动，约 1:1） */
  image: string;
  /** 行动名（如「馎饦汤面」「蹴鞠」） */
  label: string;
  /** 本次数值变化 */
  patch: ValidatedStatePatch;
}

interface ActivityResultPopupProps {
  result: ActivityResult;
  onDone: () => void;
}

/**
 * 午餐 / 市集夜娱结算弹窗（2026-07-09）：中心浮出场景图 + 体力/心情等增减 + 继续。
 * 机械行动（无 LLM），点背景或按钮关闭。
 */
export function ActivityResultPopup({ result, onDone }: ActivityResultPopupProps) {
  const lines = buildSettlementLines(result.patch);
  return (
    <div className="activity-result-overlay" onClick={onDone}>
      <div className="activity-result-card" onClick={(e) => e.stopPropagation()}>
        <img className="activity-result-img" src={result.image} alt={result.label} />
        <div className="activity-result-label">{result.label}</div>
        {lines.length > 0 && (
          <div className="activity-result-lines">
            {lines.map((line) => (
              <span
                key={line}
                className={`activity-result-line ${line.includes('-') ? 'neg' : 'pos'}`}
              >
                {line}
              </span>
            ))}
          </div>
        )}
        <button className="activity-result-btn" type="button" onClick={onDone}>
          继续
        </button>
      </div>
    </div>
  );
}
