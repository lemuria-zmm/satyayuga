/**
 * 全局音频（2026-07-10 明明：接入音乐+环境声，全场景不遗漏）。
 * 两条声道：bgm（背景乐，按场景切，交叉淡入淡出）+ ambient（环境声，仅日常：晨/午鸟鸣、雨天雨声）。
 * 浏览器要求用户手势后才能出声——开场 gate 点击已解锁；此后 play() 正常。被拒时静默兜底。
 */
type Channel = {
  el: HTMLAudioElement | null;
  src: string | null;
  fade: number | null;
  /** 最近一次请求的目标音量（静音时用于恢复） */
  baseVolume: number;
};

const bgm: Channel = { el: null, src: null, fade: null, baseVolume: 0.34 };
const ambient: Channel = { el: null, src: null, fade: null, baseVolume: 0.22 };

/** 全局静音（设置里的音乐开关，2026-07-12 明明）。持久到本机，尊重玩家选择。 */
const MUTE_KEY = 'dqy_audio_muted_v1';
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();

function ensure(ch: Channel): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  if (!ch.el) {
    ch.el = new Audio();
    ch.el.loop = true;
    ch.el.preload = 'auto';
  }
  return ch.el;
}

function fadeTo(ch: Channel, target: number, ms: number, onDone?: () => void) {
  const el = ch.el;
  if (!el) return;
  if (ch.fade) {
    window.clearInterval(ch.fade);
    ch.fade = null;
  }
  const from = el.volume;
  const steps = Math.max(1, Math.round(ms / 40));
  let i = 0;
  ch.fade = window.setInterval(() => {
    i++;
    const v = from + (target - from) * (i / steps);
    el.volume = Math.max(0, Math.min(1, v));
    if (i >= steps) {
      window.clearInterval(ch.fade!);
      ch.fade = null;
      onDone?.();
    }
  }, 40);
}

function switchTrack(ch: Channel, src: string | null, volume: number) {
  ch.baseVolume = volume;
  if (ch.src === src) return; // 同曲不重启
  ch.src = src;
  const el = ensure(ch);
  if (!el) return;
  if (!src) {
    fadeTo(ch, 0, 500, () => el.pause());
    return;
  }
  // 交叉淡化：淡出旧曲 → 切源 → 淡入新曲（静音时淡到 0、静默播放，取消静音即可恢复）
  const start = () => {
    el.src = src;
    el.volume = 0;
    void el.play().catch(() => {
      /* 自动播放被拒：静默兜底 */
    });
    fadeTo(ch, muted ? 0 : volume, 700, () => {
      if (muted) el.pause();
    });
  };
  if (el.src && !el.paused) fadeTo(ch, 0, 320, start);
  else start();
}

/** 切换背景乐（同曲不重启）。src=null 淡出停止。 */
export function playBgm(src: string | null, volume = 0.34) {
  switchTrack(bgm, src, volume);
}

/** 切换环境声（同曲不重启）。src=null 淡出停止（离开日常/进考试等）。 */
export function playAmbient(src: string | null, volume = 0.22) {
  switchTrack(ambient, src, volume);
}

/** 全停（一般不需要——各场景切曲即可；保留以备用）。 */
export function stopAllAudio() {
  switchTrack(bgm, null, 0);
  switchTrack(ambient, null, 0);
}

/** 是否已静音（设置面板音乐开关读它）。 */
export function isMuted(): boolean {
  return muted;
}

/** 设置静音（设置面板音乐开关）。静音→两声道淡出并暂停；取消→恢复当前曲各自音量。 */
export function setMuted(next: boolean) {
  muted = next;
  try {
    localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  } catch {
    /* ignore */
  }
  for (const ch of [bgm, ambient]) {
    if (!ch.el || !ch.src) continue;
    if (!next && ch.el.paused) {
      void ch.el.play().catch(() => {
        /* 需用户手势——设置面板的点击已是手势 */
      });
    }
    fadeTo(ch, next ? 0 : ch.baseVolume, 400, () => {
      if (next) ch.el?.pause();
    });
  }
}
