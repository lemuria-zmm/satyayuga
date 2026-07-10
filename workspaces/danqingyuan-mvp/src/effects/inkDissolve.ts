/**
 * 水墨溶解粒子（2026-07-10，谢幕页角色"入画"瞬间）。
 * 原生 canvas + requestAnimationFrame（无第三方依赖）：给定屏幕矩形，撒墨点/石青/金粉粒子，
 * 向上飘散、晕开、淡出，像人影化进水墨。`prefers-reduced-motion` 下不应创建（调用方判断）。
 */
export interface InkDissolve {
  burst: (rect: { x: number; y: number; w: number; h: number }) => void;
  destroy: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  grow: number;
  life: number;
  maxLife: number;
  color: [number, number, number];
  gold: boolean;
}

const INK_COLORS: [number, number, number][] = [
  [46, 58, 68], // 墨
  [38, 74, 96], // 石青
  [74, 96, 74], // 石绿
  [30, 40, 48],
];

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

  function rand(a: number, b: number) {
    // 无 Math.random 依赖限制（浏览器端可用）
    return a + Math.random() * (b - a);
  }

  function burst(rect: { x: number; y: number; w: number; h: number }) {
    const count = 150;
    for (let i = 0; i < count; i++) {
      const gold = Math.random() < 0.12;
      // 偏下（脚部/衣摆）起更多，向上飘散
      const fy = Math.pow(Math.random(), 0.7);
      particles.push({
        x: rect.x + rand(0.1, 0.9) * rect.w,
        y: rect.y + fy * rect.h,
        vx: rand(-14, 14),
        vy: rand(-46, -14),
        r: gold ? rand(1.2, 2.6) : rand(6, 20),
        grow: rand(6, 18),
        life: 0,
        maxLife: rand(1.4, 2.8),
        color: INK_COLORS[(Math.random() * INK_COLORS.length) | 0],
        gold,
      });
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
      const k = p.life / p.maxLife; // 0→1
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 6 * dt; // 微重力，飘升后回落
      p.vx *= 0.99;
      p.r += p.grow * dt;
      const alpha = Math.sin((1 - k) * Math.PI * 0.5) * (p.gold ? 0.55 : 0.32);

      if (p.gold) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,180,110,${alpha})`;
        ctx.fill();
      } else {
        ctx.globalCompositeOperation = 'source-over';
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        const [r, gg, b] = p.color;
        g.addColorStop(0, `rgba(${r},${gg},${b},${alpha})`);
        g.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
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
