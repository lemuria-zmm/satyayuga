import { useEffect, useState } from 'react';
import type { GuideScript } from '../content/tutorialScripts';

interface GuideDialogueProps {
  script: GuideScript;
  onDone: () => void;
}

/**
 * 立绘对话框（固定脚本逐句点击推进；末句出按钮）。
 * 三处复用：入院导师引导 / 第 1 日小书童时段引导 / 希孟书房首场。
 */
export function GuideDialogue({ script, onDone }: GuideDialogueProps) {
  const [lineIndex, setLineIndex] = useState(0);

  // 换脚本时回到第一句
  useEffect(() => {
    setLineIndex(0);
  }, [script.id]);

  const isLast = lineIndex >= script.lines.length - 1;

  function advance() {
    if (!isLast) setLineIndex(lineIndex + 1);
  }

  return (
    <div
      className={script.sceneImage ? 'gd-overlay gd-overlay--scene' : 'gd-overlay'}
      style={script.sceneImage ? { backgroundImage: `url(${script.sceneImage})` } : undefined}
    >
      <div
        className="gd-box"
        onClick={advance}
        role={isLast ? undefined : 'button'}
      >
        {/* 立绘挂在框内左侧（2026-07-07）：右缘贴框左缘、底部与框底对齐，不再与框之间留大空 */}
        {!script.sceneImage && (
          <img alt={script.speakerName} className="gd-portrait" src={script.portrait} />
        )}
        <span className="gd-name">{script.speakerName}</span>
        <p className="gd-text" key={lineIndex}>{script.lines[lineIndex]}</p>
        {!isLast && <span className="gd-next-hint">▼</span>}
        {isLast && (
          <button
            className="gd-end-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDone();
            }}
            type="button"
          >
            {script.endButton}
          </button>
        )}
        <span className="gd-progress">
          {lineIndex + 1} / {script.lines.length}
        </span>
      </div>
    </div>
  );
}
