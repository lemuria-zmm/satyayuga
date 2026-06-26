/** 轻量入院转场页（拍板）：小书童立绘 + LLM 入院引文 + 「入院」按钮 */
interface AdmissionTransitionProps {
  /** null = LLM 入院引文生成中 */
  text: string | null;
  onEnter: () => void;
}

export function AdmissionTransition({ text, onEnter }: AdmissionTransitionProps) {
  return (
    <main className="adm-transition">
      <div className="adm-transition-bg" />
      <div className="adm-transition-card">
        <img alt="小书童" className="adm-transition-portrait" src="/char/char-shutong-normal.png" />
        <div className="adm-transition-body">
          <h2 className="adm-transition-title">入院 · 小书童来迎</h2>
          {text ? (
            <p className="adm-transition-text">{text}</p>
          ) : (
            <p className="adm-transition-text adm-transition-loading">院门将启，墨正落纸……</p>
          )}
          <button className="adm-transition-enter" disabled={!text} onClick={onEnter} type="button">
            随小书童入院
          </button>
        </div>
      </div>
    </main>
  );
}
