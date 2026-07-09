/**
 * 开场 BGM 单例（2026-07-09）：片头视频结束后、穿越引语+入院名录阶段低音量循环，避免骤静。
 * 仅开场用；不做全局音频系统（留后续轮）。自动播放被浏览器拒绝时静默兜底。
 */
let el: HTMLAudioElement | null = null;

/** 低音量循环播放开场配乐（需在用户手势后调用才能出声）。 */
export function playOpeningBgm(volume = 0.28) {
  if (typeof Audio === 'undefined') return;
  if (!el) {
    el = new Audio('/opening-bgm.mp3');
    el.loop = true;
    el.preload = 'auto';
  }
  el.volume = volume;
  void el.play().catch(() => {
    /* 自动播放被拒：静默兜底，不影响流程 */
  });
}

/** 停止并释放（进入游戏主循环后调用）。 */
export function stopOpeningBgm() {
  if (!el) return;
  el.pause();
  el.currentTime = 0;
}
