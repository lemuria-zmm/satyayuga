/**
 * BYOK（自带 API，2026-07-11 内测付费通道·第一期）：玩家在本机配置厂商 + API Key，
 * 每次调用随请求带给代理转发（key 只存本机 localStorage、只过内存转发，服务端不落库）。
 */
export type ByokProvider = 'deepseek' | 'glm' | 'kimi';

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
  /** 可选模型列表（下拉给玩家挑；仍可手填覆盖） */
  models: string[];
  /** 领取/管理 Key 的地址（提示用） */
  keyUrl: string;
}

export const BYOK_PROVIDERS: ByokProviderMeta[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek 深度求索',
    defaultModel: 'deepseek-v4-flash',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    keyUrl: 'platform.deepseek.com',
  },
  {
    id: 'glm',
    label: '智谱 GLM',
    defaultModel: 'glm-4.6',
    models: ['glm-4.6', 'glm-4-flash', 'glm-4-plus', 'glm-5.2'],
    keyUrl: 'bigmodel.cn',
  },
  {
    id: 'kimi',
    label: 'Kimi 月之暗面',
    defaultModel: 'moonshot-v1-128k',
    models: [
      'moonshot-v1-128k',
      'moonshot-v1-32k',
      'kimi-k2.6',
      'kimi-k2.5',
      'kimi-k2.7-code',
      'kimi-k2.7-code-highspeed',
    ],
    keyUrl: 'platform.moonshot.cn',
  },
];

const LS_KEY = 'dqy_byok_v1';

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
  } catch {
    /* ignore */
  }
}

export function clearByok(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

/** 已配置自带 key → 可进入游戏（2026-07-12：只支持自定义 API，不再提供主办方额度跳过） */
export function llmAccessReady(): boolean {
  return !NEEDS_LLM_ACCESS || loadByok() !== null;
}
