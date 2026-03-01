import { motion } from "framer-motion";
import type { SetupData } from "../types";

type SetupScreenProps = {
  t: (path: string) => any;
  tr: (zh: string, en: string) => string;
  setup: SetupData;
  setupStep: number;
  updateSetupField: (path: string, value: string) => void;
  toggleTag: (path: string, value: string) => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function SetupScreen({
  t,
  tr,
  setup,
  setupStep,
  updateSetupField,
  toggleTag,
  onPrev,
  onNext,
}: SetupScreenProps) {
  const genderOptions = t("genders") as string[];

  const renderTags = (items: string[], selected: string[], path: string) => (
    <div className="tags">
      {items.map((tag) => (
        <button type="button" key={tag} className={selected.includes(tag) ? "active" : ""} onClick={() => toggleTag(path, tag)}>
          {tag}
        </button>
      ))}
    </div>
  );

  return (
    <motion.section className="card setup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2>{t("setupTitle")}</h2>
      <div className="step-line">
        <span className={setupStep === 0 ? "active" : ""}>{t("step1")}</span>
        <span className={setupStep === 1 ? "active" : ""}>{t("step2")}</span>
        <span className={setupStep === 2 ? "active" : ""}>{t("step3")}</span>
      </div>

      {setupStep === 0 && (
        <>
          <div className="grid-two">
            <div className="field">
              <label>{t("name")}</label>
              <input value={setup.me.name} onChange={(e) => updateSetupField("me.name", e.target.value)} />
            </div>
            <div className="field">
              <label>{t("gender")}</label>
              <select value={setup.me.gender} onChange={(e) => updateSetupField("me.gender", e.target.value)}>
                {genderOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("mbti")}</label>
              <input value={setup.me.mbti} placeholder="INFP" onChange={(e) => updateSetupField("me.mbti", e.target.value)} />
            </div>
            <div className="field">
              <label>{t("star")}</label>
              <input value={setup.me.star} placeholder="Pisces" onChange={(e) => updateSetupField("me.star", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>{t("hobbies")}</label>
            {renderTags(t("hobbyTags") as string[], setup.me.hobbies, "me.hobbies")}
          </div>
          <div className="field">
            <label>{t("specialMemory")}</label>
            <textarea
              rows={2}
              value={setup.me.specialMemory}
              placeholder={tr("我有一只叫豆豆的猫", "I have a cat named Doudou")}
              onChange={(e) => updateSetupField("me.specialMemory", e.target.value)}
            />
          </div>
        </>
      )}

      {setupStep === 1 && (
        <>
          <div className="grid-two">
            <div className="field">
              <label>{t("name")}</label>
              <input value={setup.lover.name} onChange={(e) => updateSetupField("lover.name", e.target.value)} />
            </div>
            <div className="field">
              <label>{t("gender")}</label>
              <select value={setup.lover.gender} onChange={(e) => updateSetupField("lover.gender", e.target.value)}>
                {genderOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("mbti")}</label>
              <input value={setup.lover.mbti} placeholder="ENFJ" onChange={(e) => updateSetupField("lover.mbti", e.target.value)} />
            </div>
            <div className="field">
              <label>{t("star")}</label>
              <input value={setup.lover.star} placeholder="Libra" onChange={(e) => updateSetupField("lover.star", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>{t("traits")}</label>
            {renderTags(t("traitTags") as string[], setup.lover.traits, "lover.traits")}
          </div>
          <div className="field">
            <label>{t("hobbies")}</label>
            {renderTags(t("hobbyTags") as string[], setup.lover.hobbies, "lover.hobbies")}
          </div>
          <div className="field">
            <label>{t("specialSetting")}</label>
            <textarea
              rows={2}
              value={setup.lover.specialSetting}
              placeholder={tr("她总是戴着红围巾", "She always wears a red scarf")}
              onChange={(e) => updateSetupField("lover.specialSetting", e.target.value)}
            />
          </div>
        </>
      )}

      {setupStep === 2 && (
        <>
          <div className="grid-two">
            <div className="field">
              <label>{t("provider")}</label>
              <select value={setup.api.provider} onChange={(e) => updateSetupField("api.provider", e.target.value)}>
                <option value="none">{t("noAi")}</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
            <div className="field">
              <label>{t("model")}</label>
              <input value={setup.api.model} onChange={(e) => updateSetupField("api.model", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>{t("apiKey")}</label>
            <input type="password" value={setup.api.apiKey} placeholder="sk-..." onChange={(e) => updateSetupField("api.apiKey", e.target.value)} />
          </div>
          <div className="note">{t("saveApiNote")}</div>
        </>
      )}

      <div className="preview-grid">
        <div className="preview-card">
          <h4>{t("mine")}</h4>
          <p>
            {t("name")}: {setup.me.name || tr("未填写", "N/A")}
          </p>
          <p>
            {t("mbti")}: {setup.me.mbti || "-"}
          </p>
          <p>
            {t("hobbies")}: {(setup.me.hobbies || []).join(" / ") || "-"}
          </p>
        </div>
        <div className="preview-card">
          <h4>{t("lover")}</h4>
          <p>
            {t("name")}: {setup.lover.name || tr("未填写", "N/A")}
          </p>
          <p>
            {t("mbti")}: {setup.lover.mbti || "-"}
          </p>
          <p>
            {t("traits")}: {(setup.lover.traits || []).join(" / ") || "-"}
          </p>
        </div>
      </div>

      <div className="hero-actions" style={{ justifyContent: "flex-end" }}>
        <button className="btn ghost" disabled={setupStep === 0} onClick={onPrev}>
          {t("prev")}
        </button>
        <button className="btn" onClick={onNext}>
          {setupStep === 2 ? t("beginGame") : t("next")}
        </button>
      </div>
    </motion.section>
  );
}
