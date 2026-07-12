/**
 * BYOK（自带 API，2026-07-11 内测付费通道·第一期）：玩家在本机配置厂商 + API Key，
 * 每次调用随请求带给代理转发（key 只存本机 localStorage、只过内存转发，服务端不落库）。
 */
export type ByokProvider = 'deepseek' | 'glm' | 'kimi' | 'minimax';

export interface ByokConfig {
  provider: ByokProvider;
  apiKey: string;
  /** 可选覆盖模型；空则用预设默认 */
  model?: string;
}

export interface ByokProviderMeta {
  id: ByokProvider;
  label: string;
  defaultModel: string;
  /** 领取/管理 Key 的地址（提示用） */
  keyUrl: string;
}

export const BYOK_PROVIDERS: ByokProviderMeta[] = [
  { id: 'deepseek', label: 'DeepSeek 深度求索', defaultModel: 'deepseek-chat', keyUrl: 'platform.deepseek.com' },
  { id: 'glm', label: '智谱 GLM', defaultModel: 'glm-4-flash', keyUrl: 'open.bigmodel.cn' },
  { id: 'kimi', label: 'Kimi 月之暗面', defaultModel: 'moonshot-v1-8k', keyUrl: 'platform.moonshot.cn' },
  { id: 'minimax', label: 'MiniMax', defaultModel: 'abab6.5s-chat', keyUrl: 'platform.minimaxi.com' },
];

const LS_KEY = 'dqy_byok_v1';
const LS_SKIP = 'dqy_byok_skip_v1';

/** 前端是否走代理（决定是否需要配置 LLM 接入）；否则是 mock，不需要 */
export const NEEDS_LLM_ACCESS = import.meta.env.VITE_LLM_ADAPTER === 'proxy';

export function loadByok(): ByokConfig | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as ByokConfig;
    if (!c || !c.provider || !c.apiKey) return null;
    return c;
  } catch {
    return null;
  }
}

export function saveByok(config: ByokConfig): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(config));
    localStorage.removeItem(LS_SKIP);
  } catch {
    /* ignore */
  }
}

export function clearByok(): void {
  try {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_SKIP);
  } catch {
    /* ignore */
  }
}

/** 跳过配置（用主办方默认额度，若服务端配了 key） */
export function setByokSkipped(): void {
  try {
    localStorage.setItem(LS_SKIP, '1');
  } catch {
    /* ignore */
  }
}

export function byokSkipped(): boolean {
  try {
    return localStorage.getItem(LS_SKIP) === '1';
  } catch {
    return false;
  }
}

/** 已配置自带 key 或已选择跳过 → 可进入游戏 */
export function llmAccessReady(): boolean {
  return !NEEDS_LLM_ACCESS || loadByok() !== null || byokSkipped();
}
