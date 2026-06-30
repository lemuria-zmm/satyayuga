interface XimengBridgeProps {
  /** 「继续」推进到见希孟段 D */
  onContinue: () => void;
}

const BRIDGE_LINE = '放榜既毕，喧声渐远。你忽然想起那个总在书房独自作画的青年——这些时日，竟未曾好好与他道一句话别。';

/**
 * 引出希孟线 C 过场（2026-06-30 批二）：放榜后、好感≥知己，一句过场把玩家引向见希孟。
 * 黑场水墨基调 + 一句独白 + 「继续」。仅好感≥知己(60) 才走到这一段。
 */
export function XimengBridge({ onContinue }: XimengBridgeProps) {
  return (
    <main className="xb-page">
      <div className="xb-veil" />
      <section className="xb-center">
        <p className="xb-line">{BRIDGE_LINE}</p>
        <button className="ex-begin-btn xb-continue" onClick={onContinue} type="button">
          去寻他
        </button>
      </section>
    </main>
  );
}
