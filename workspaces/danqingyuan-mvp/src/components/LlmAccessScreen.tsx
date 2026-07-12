import { useState } from 'react';
import {
  BYOK_PROVIDERS,
  loadByok,
  saveByok,
  setByokSkipped,
  type ByokProvider,
} from '../llm/byokConfig';

interface LlmAccessScreenProps {
  /** 配置完成/跳过 → 进入游戏 */
  onReady: () => void;
}

/**
 * LLM 接入配置（2026-07-11 内测付费通道·第一期 BYOK）：
 * 玩家选厂商 + 填自己的 API Key（只存本机、随请求转发、服务端不留存）；或跳过用主办方额度。
 */
export function LlmAccessScreen({ onReady }: LlmAccessScreenProps) {
  const existing = loadByok();
  const [provider, setProvider] = useState<ByokProvider>(existing?.provider ?? 'deepseek');
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? '');
  const [model, setModel] = useState(existing?.model ?? '');
  const meta = BYOK_PROVIDERS.find((p) => p.id === provider)!;

  function handleSave() {
    if (!apiKey.trim()) return;
    saveByok({ provider, apiKey: apiKey.trim(), model: model.trim() || undefined });
    onReady();
  }

  function handleSkip() {
    setByokSkipped();
    onReady();
  }

  return (
    <main className="la-page">
      <div className="la-veil" />
      <section className="la-card">
        <h1 className="la-title">接入画院</h1>
        <p className="la-intro">
          本作的剧情、对话与批阅由大模型实时生成，需要一个大模型 API。
          <br />
          选一家、填入你自己的 API Key 即可开始。
          <span className="la-note">（Key 只保存在你本机浏览器，随请求直连转发，主办方服务器不会留存。）</span>
        </p>

        <label className="la-label">选择厂商</label>
        <div className="la-providers">
          {BYOK_PROVIDERS.map((p) => (
            <button
              key={p.id}
              className={`la-provider${p.id === provider ? ' la-provider--on' : ''}`}
              onClick={() => setProvider(p.id)}
              type="button"
            >
              {p.label}
            </button>
          ))}
        </div>

        <label className="la-label">API Key</label>
        <input
          className="la-input"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="粘贴你的 API Key"
          autoComplete="off"
          spellCheck={false}
        />

        <label className="la-label">模型（可留空用默认 {meta.defaultModel}）</label>
        <input
          className="la-input"
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={meta.defaultModel}
          spellCheck={false}
        />

        <p className="la-hint">在 {meta.keyUrl} 注册并领取 API Key。</p>

        <button className="la-start" disabled={!apiKey.trim()} onClick={handleSave} type="button">
          保存并进入
        </button>
        <button className="la-skip" onClick={handleSkip} type="button">
          暂用主办方额度 · 直接进入
        </button>
      </section>
    </main>
  );
}
