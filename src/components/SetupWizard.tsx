import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useGame } from "../contexts/GameContext";
import { ApiSettings, LoverProfile, PlayerProfile } from "../types/game";

interface SetupWizardProps {
  onComplete: () => void;
}

const hobbyOptions = ["看电影", "音乐", "运动", "阅读", "游戏", "旅行", "美食", "摄影"];
const traitOptions = ["傲娇", "温柔", "高冷", "阳光", "理性", "感性", "幽默"];

export const SetupWizard = ({ onComplete }: SetupWizardProps) => {
  const { state, updatePlayer, updateLover, updateApi } = useGame();
  const [step, setStep] = useState(0);
  const [player, setPlayer] = useState<PlayerProfile>(state.player);
  const [lover, setLover] = useState<LoverProfile>(state.lover);
  const [api, setApi] = useState<ApiSettings>(state.apiSettings);

  const steps = ["我的资料", "恋人设定", "API 配置"];

  const toggleTag = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const handleNext = () => {
    if (step === 0) {
      updatePlayer(player);
    }
    if (step === 1) {
      updateLover(lover);
    }
    if (step === 2) {
      updateApi(api);
      onComplete();
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="card setup">
      <div className="setup-header">
        <h2>角色设定</h2>
        <div className="step-indicator">
          {steps.map((label, index) => (
            <div key={label} className={index <= step ? "step active" : "step"}>
              {index < step ? <CheckCircle2 size={18} /> : <span>{index + 1}</span>}
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="setup-body">
        {step === 0 && (
          <div className="form-grid">
            <label>
              名字
              <input
                value={player.name}
                onChange={(event) => setPlayer({ ...player, name: event.target.value })}
                placeholder="你的名字"
              />
            </label>
            <label>
              性别
              <input
                value={player.gender}
                onChange={(event) => setPlayer({ ...player, gender: event.target.value })}
                placeholder="例如：女生"
              />
            </label>
            <label>
              MBTI
              <input
                value={player.mbti}
                onChange={(event) => setPlayer({ ...player, mbti: event.target.value })}
                placeholder="例如：INFP"
              />
            </label>
            <label>
              星座
              <input
                value={player.constellation}
                onChange={(event) => setPlayer({ ...player, constellation: event.target.value })}
                placeholder="例如：天秤座"
              />
            </label>
            <div className="tag-group">
              <p>兴趣爱好</p>
              <div className="tags">
                {hobbyOptions.map((hobby) => (
                  <button
                    key={hobby}
                    type="button"
                    className={player.hobbies.includes(hobby) ? "tag active" : "tag"}
                    onClick={() => setPlayer({ ...player, hobbies: toggleTag(player.hobbies, hobby) })}
                  >
                    {hobby}
                  </button>
                ))}
              </div>
            </div>
            <label className="full">
              特殊记忆
              <textarea
                value={player.memory}
                onChange={(event) => setPlayer({ ...player, memory: event.target.value })}
                placeholder="例如：我有一只叫豆豆的猫"
              />
            </label>
          </div>
        )}
        {step === 1 && (
          <div className="form-grid">
            <label>
              名字
              <input
                value={lover.name}
                onChange={(event) => setLover({ ...lover, name: event.target.value })}
                placeholder="恋人名字"
              />
            </label>
            <label>
              性别
              <input
                value={lover.gender}
                onChange={(event) => setLover({ ...lover, gender: event.target.value })}
                placeholder="例如：男生"
              />
            </label>
            <label>
              MBTI
              <input
                value={lover.mbti}
                onChange={(event) => setLover({ ...lover, mbti: event.target.value })}
                placeholder="例如：ENTJ"
              />
            </label>
            <label>
              星座
              <input
                value={lover.constellation}
                onChange={(event) => setLover({ ...lover, constellation: event.target.value })}
                placeholder="例如：狮子座"
              />
            </label>
            <div className="tag-group">
              <p>性格标签</p>
              <div className="tags">
                {traitOptions.map((trait) => (
                  <button
                    key={trait}
                    type="button"
                    className={lover.traits.includes(trait) ? "tag active" : "tag"}
                    onClick={() => setLover({ ...lover, traits: toggleTag(lover.traits, trait) })}
                  >
                    {trait}
                  </button>
                ))}
              </div>
            </div>
            <div className="tag-group">
              <p>兴趣爱好</p>
              <div className="tags">
                {hobbyOptions.map((hobby) => (
                  <button
                    key={hobby}
                    type="button"
                    className={lover.hobbies.includes(hobby) ? "tag active" : "tag"}
                    onClick={() => setLover({ ...lover, hobbies: toggleTag(lover.hobbies, hobby) })}
                  >
                    {hobby}
                  </button>
                ))}
              </div>
            </div>
            <label className="full">
              特殊设定
              <textarea
                value={lover.signature}
                onChange={(event) => setLover({ ...lover, signature: event.target.value })}
                placeholder="例如：他总是戴着红围巾"
              />
            </label>
          </div>
        )}
        {step === 2 && (
          <div className="form-grid">
            <label>
              提供方
              <select
                value={api.provider}
                onChange={(event) => setApi({ ...api, provider: event.target.value as ApiSettings["provider"] })}
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
              </select>
            </label>
            <label>
              API Key
              <input
                value={api.apiKey}
                onChange={(event) => setApi({ ...api, apiKey: event.target.value })}
                placeholder="sk-..."
              />
            </label>
            <label>
              Base URL
              <input
                value={api.baseUrl}
                onChange={(event) => setApi({ ...api, baseUrl: event.target.value })}
                placeholder="https://api.openai.com/v1"
              />
            </label>
            <label>
              模型
              <input
                value={api.model}
                onChange={(event) => setApi({ ...api, model: event.target.value })}
                placeholder="gpt-4o-mini"
              />
            </label>
            <p className="hint full">
              API 信息将仅存储在本地浏览器 localStorage 中。
            </p>
          </div>
        )}
      </div>
      <div className="setup-actions">
        <button type="button" className="ghost" onClick={handleBack} disabled={step === 0}>
          上一步
        </button>
        <button type="button" className="primary" onClick={handleNext}>
          {step === 2 ? "进入剧情" : "下一步"}
        </button>
      </div>
    </div>
  );
};
