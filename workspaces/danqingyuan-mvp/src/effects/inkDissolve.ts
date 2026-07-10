/**
 * 水墨溶解粒子（2026-07-10；07-10 改细密——按人物轮廓采样，身体化成非常细密的粒子飘散）。
 * 原生 canvas + requestAnimationFrame（无第三方依赖）。给定人物 <img>（白底，同源可采样）+ 屏幕矩形，
 * 把身体像素抽成密集的微粒（取像素本色），向上飘散、轻微扩散、缓缓淡出，如人影化进烟尘。
 * `prefers-reduced-motion` 下不应创建（调用方判断）。
 */
export interface InkDissolve {
  burst: (img: HTMLImageElement, rect: { x: number; y: number; w: number; h: number }) => void;
  destroy: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  maxLife: number;
  cr: number;
  cg: number;
  cb: number;
  gold: boolean;
}

export function createInkDissolve(container: HTMLElement): InkDissolve {
  const canvas = document.createElement('canvas');
  canvas.className = 'cc-ink-canvas';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(container.clientWidth * dpr);
    canvas.height = Math.floor(container.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const particles: Particle[] = [];
  let raf = 0;
  let last = 0;
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);

  const MAX_PARTICLES = 4200;

  function burst(img: HTMLImageElement, rect: { x: number; y: number; w: number; h: number }) {
    // 采样精度：每 ~3.2 屏幕px 一格（细密），offscreen 缩到该网格读像素
    const STEP = 3.2;
    const cols = Math.max(4, Math.round(rect.w / STEP));
    const rows = Math.max(4, Math.round(rect.h / STEP));
    let data: Uint8ClampedArray | null = null;
    try {
      const off = document.createElement('canvas');
      off.width = cols;
      off.height = rows;
      const octx = off.getContext('2d', { willReadFrequently: true })!;
      octx.drawImage(img, 0, 0, cols, rows);
      data = octx.getImageData(0, 0, cols, rows).data;
    } catch {
      data = null; // 采样失败（理论不会，同源）→ 退化为矩形随机
    }

    let budget = MAX_PARTICLES - particles.length;
    const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
    for (let gy = 0; gy < rows && budget > 0; gy++) {
      for (let gx = 0; gx < cols && budget > 0; gx++) {
        let cr = 60, cg = 70, cb = 80;
        if (data) {
          const idx = (gy * cols + gx) * 4;
          cr = data[idx];
          cg = data[idx + 1];
          cb = data[idx + 2];
          // 纯白=底，跳过；只取身体像素
          if (cr > 240 && cg > 240 && cb > 240) continue;
        }
        if (Math.random() < 0.35) continue; // 抽稀，保密集又不爆量

        // 颜色随粒子而变（渐变、不单色）：取服装本色 + 明暗抖动 + 部分向金色渐融
        const bright = rnd(0.7, 1.42);
        let pr = clamp(cr * bright);
        let pg = clamp(cg * bright);
        let pb = clamp(cb * bright);
        const goldMix = Math.random();
        if (goldMix < 0.24) {
          const m = rnd(0.2, 0.72); // 向金渐融
          pr = clamp(pr * (1 - m) + 216 * m);
          pg = clamp(pg * (1 - m) + 184 * m);
          pb = clamp(pb * (1 - m) + 116 * m);
        }
        const gold = Math.random() < 0.06; // 纯金亮点

        particles.push({
          x: rect.x + gx * STEP + rnd(-1, 1),
          y: rect.y + gy * STEP + rnd(-1, 1),
          vx: rnd(-9, 9),
          vy: rnd(-30, -8),
          r: gold ? rnd(0.6, 1.4) : rnd(0.5, 1.8),
          life: 0,
          maxLife: rnd(1.6, 3.4),
          cr: gold ? 216 : pr,
          cg: gold ? 184 : pg,
          cb: gold ? 116 : pb,
          gold,
        });
        budget--;
      }
    }
  }

  function frame(t: number) {
    if (!last) last = t;
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    ctx.clearRect(0, 0, container.clientWidth, container.clientHeight);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }
      const k = p.life / p.maxLife;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 5 * dt; // 微重力
      p.vx *= 0.985;
      p.vx += rnd(-6, 6) * dt; // 轻微湍流散开
      const alpha = Math.sin((1 - k) * Math.PI * 0.5) * (p.gold ? 0.85 : 0.7);

      if (p.gold) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(214,182,112,${alpha})`;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(${p.cr},${p.cg},${p.cb},${alpha})`;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    burst,
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.remove();
    },
  };
}
