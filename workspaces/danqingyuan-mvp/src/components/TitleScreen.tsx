import { useState } from 'react';
import {
  BYOK_PROVIDERS,
  NEEDS_LLM_ACCESS,
  llmAccessReady,
  loadByok,
  saveByok,
  type ByokProvider,
} from '../llm/byokConfig';
import { isMuted, setMuted } from '../audio/audioManager';

interface TitleScreenProps {
  /** 是否有可读取的存档 */
  hasSave: boolean;
  /** 开始游戏 → 进入开场序列（新游戏） */
  onStart: () => void;
  /** 读取存档 → 直接载入存档进入游戏 */
  onLoad: () => void;
}

/**
 * 首页主菜单（2026-07-12 明明）：泼彩标题背景 + 竖排居中三按钮
 * （开始游戏 / 读取存档 / 设置）。设置内可自定义 API Key（复用 BYOK）与音乐开关。
 * 点击按钮即用户手势，解锁后续带声播放。
 */
export function TitleScreen({ hasSave, onStart, onLoad }: TitleScreenProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [accessReady, setAccessReady] = useState(() => llmAccessReady());

  // 需要配置大模型但尚未配置 → 先引导去设置填 Key
  function guardAccess(proceed: () => void) {
    if (NEEDS_LLM_ACCESS && !accessReady) {
      setShowSettings(true);
      return;
    }
    proceed();
  }

  return (
    <main className="title-page">
      <div className="title-bg" />
      <div className="title-scrim" />

      <nav className="title-menu">
        <button className="title-btn" onClick={() => guardAccess(onStart)} type="button">
          开始游戏
        </button>
        <button
          className="title-btn"
          disabled={!hasSave}
          onClick={() => guardAccess(onLoad)}
          type="button"
        >
          读取存档
        </button>
        <button className="title-btn" onClick={() => setShowSettings(true)} type="button">
          设置
        </button>
      </nav>

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onAccessChange={() => setAccessReady(llmAccessReady())}
        />
      )}
    </main>
  );
}

interface SettingsPanelProps {
  onClose: () => void;
  /** API 配置变化后回调（刷新首页可否开始的守卫） */
  onAccessChange: () => void;
}

function SettingsPanel({ onClose, onAccessChange }: SettingsPanelProps) {
  const existing = loadByok();
  const initialProvider = existing?.provider ?? 'deepseek';
  const initialMeta = BYOK_PROVIDERS.find((p) => p.id === initialProvider)!;
  const initialCustom = !!existing?.model && !initialMeta.models.includes(existing.model);

  const [provider, setProvider] = useState<ByokProvider>(initialProvider);
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? '');
  const [modelPick, setModelPick] = useState<string>(
    initialCustom ? '__custom__' : existing?.model ?? initialMeta.defaultModel,
  );
  const [modelCustom, setModelCustom] = useState(initialCustom ? existing!.model! : '');
  const [muted, setMutedState] = useState(() => isMuted());
  const [savedTip, setSavedTip] = useState('');
  const meta = BYOK_PROVIDERS.find((p) => p.id === provider)!;
  const effectiveModel = (modelPick === '__custom__' ? modelCustom.trim() : modelPick) || meta.defaultModel;

  function pickProvider(id: ByokProvider) {
    setProvider(id);
    const m = BYOK_PROVIDERS.find((p) => p.id === id)!;
    setModelPick(m.defaultModel);
    setModelCustom('');
    setSavedTip('');
  }

  function handleSaveKey() {
    if (!apiKey.trim()) return;
    saveByok({ provider, apiKey: apiKey.trim(), model: effectiveModel });
    onAccessChange();
    setSavedTip(`已保存 · ${provider} · ${effectiveModel}`);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }

  return (
    <div className="title-modal-mask" onClick={onClose}>
      <section className="title-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="title-modal-title">设置</h2>

        {/* —— 音乐开关 —— */}
        <div className="title-set-block">
          <div className="title-set-row">
            <span className="title-set-label">音乐与音效</span>
            <button
              className={`title-switch${muted ? '' : ' title-switch--on'}`}
              onClick={toggleMute}
              type="button"
              aria-pressed={!muted}
            >
              <span className="title-switch-knob" />
              <span className="title-switch-text">{muted ? '关' : '开'}</span>
            </button>
          </div>
        </div>

        {/* —— API 配置（BYOK）—— */}
        <div className="title-set-block">
          <div className="title-set-heading">大模型 API</div>
          <p className="title-set-note">
            本作剧情、对话与批阅由大模型实时生成，需要填入你自己的 API Key 才能游玩（只存本机浏览器，随请求转发，主办方服务器不留存）。
          </p>

          <div className="la-providers">
            {BYOK_PROVIDERS.map((p) => (
              <button
                key={p.id}
                className={`la-provider${p.id === provider ? ' la-provider--on' : ''}`}
                onClick={() => pickProvider(p.id)}
                type="button"
              >
                {p.label}
              </button>
            ))}
          </div>

          <input
            className="la-input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="粘贴你的 API Key"
            autoComplete="off"
            spellCheck={false}
          />
          <select
            className="la-input title-set-select"
            value={modelPick}
            onChange={(e) => setModelPick(e.target.value)}
          >
            {meta.models.map((m) => (
              <option key={m} value={m}>
                {m}
                {m === meta.defaultModel ? '（推荐）' : ''}
              </option>
            ))}
            <option value="__custom__">自定义（手动填模型名）</option>
          </select>
          {modelPick === '__custom__' && (
            <input
              className="la-input"
              type="text"
              value={modelCustom}
              onChange={(e) => setModelCustom(e.target.value)}
              placeholder="填入模型名，例如 moonshot-v1-32k"
              spellCheck={false}
            />
          )}
          <p className="la-hint">在 {meta.keyUrl} 注册并领取 API Key。</p>

          <div className="title-set-actions">
            <button className="title-set-save" disabled={!apiKey.trim()} onClick={handleSaveKey} type="button">
              保存 Key
            </button>
          </div>
          {savedTip && <p className="title-set-tip">{savedTip}</p>}
        </div>

        <button className="title-modal-close" onClick={onClose} type="button">
          返回
        </button>
      </section>
    </div>
  );
}
