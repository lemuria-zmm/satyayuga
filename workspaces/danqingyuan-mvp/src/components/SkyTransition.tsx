import { useEffect, useRef } from 'react';

interface SkyTransitionProps {
  /** 天空图路径（public/bg-sky-*.png） */
  img: string;
  /** 时辰小字（如「晨课毕 · 日上三竿」） */
  caption: string;
  /** 展示完毕回调，父级清掉本组件（点击提前跳过或兜底自动触发，仅调一次） */
  onDone: () => void;
}

/** 兜底自动淡出时长；玩家可点击提前跳过（2026-07-09 明明拍板：点击跳过+兜底自动）。 */
const AUTO_MS = 3200;

/** 时段转场（2026-07-08 明明拍板）：场景收束、时段推进的瞬间，全屏天空图淡入停一拍再淡出。 */
export function SkyTransition({ img, caption, onDone }: SkyTransitionProps) {
  const doneRef = useRef(false);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    const t = setTimeout(finish, AUTO_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sky-transition" style={{ backgroundImage: `url(${img})` }} onClick={finish}>
      <span className="sky-transition-caption">{caption}</span>
      <span className="sky-transition-hint">点击继续</span>
    </div>
  );
}
