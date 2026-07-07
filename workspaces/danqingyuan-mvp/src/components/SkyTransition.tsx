import { useEffect } from 'react';

interface SkyTransitionProps {
  /** 天空图路径（public/bg-sky-*.png） */
  img: string;
  /** 时辰小字（如「晨课毕 · 日上三竿」） */
  caption: string;
  /** 展示完毕（约 1.8s）回调，父级清掉本组件 */
  onDone: () => void;
}

/** 时段转场（2026-07-08 明明拍板）：场景收束、时段推进的瞬间，全屏天空图淡入停一拍再淡出。 */
export function SkyTransition({ img, caption, onDone }: SkyTransitionProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="sky-transition" style={{ backgroundImage: `url(${img})` }}>
      <span className="sky-transition-caption">{caption}</span>
    </div>
  );
}
