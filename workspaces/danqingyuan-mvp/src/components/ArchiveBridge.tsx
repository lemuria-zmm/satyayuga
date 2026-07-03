interface ArchiveBridgeProps {
  /** 「推门而入」：结束过场，落地秘阁 */
  onEnter: () => void;
  /** 「赴希孟画室」：好感≥知己额外解锁时，过场末尾同时提供画室入口 */
  onEnterStudio?: () => void;
}

/**
 * 秘阁引桥过场（2026-07-02；2026-07-03 承接入口）：授衔/收尾后点「继续」进此过场——
 * 授衔人散 → 发现往昔紧闭的秘阁重门虚掩着 → 推门而入。过场末尾才给探索入口（推门而入 / 赴画室），
 * 确保「授衔 → 引文 → 入秘阁按钮」的顺序（按钮不再抢在引文之前出现）。
 * 黑场水墨基调（仿 XimengBridge），三段逐次淡入。
 * 剧情合理性：祗候名分刚到 → 门为新祗候而开；"像等你来"呼应骸游图暗线（不点破）。
 */
export function ArchiveBridge({ onEnter, onEnterStudio }: ArchiveBridgeProps) {
  return (
    <main className="ab-page">
      <div className="ab-veil" />
      <section className="ab-center">
        <p className="ab-line ab-line-1">
          授衔既毕，道贺的人声渐渐散了。你捧着新得的文牒往回走，行至秘阁前的回廊，脚步忽然顿住——
        </p>
        <p className="ab-line ab-line-2">
          那扇门，开了一线。
          <br />
          入院这些时日，秘阁的重门从来落着锁。你只在墙外望过它的飞檐，听同窗压低声音说，里头封着画院不外示的旧卷。此刻门扉虚掩，一缕昏黄的灯影从门缝里漏出来，落在青砖上。
        </p>
        <p className="ab-line ab-line-3">
          守阁的老吏不见踪影。也许是新授祗候的名分到了，阁门理当为你而开；也许……只是有人忘了上锁。回廊空无一人，唯有那道门缝里的灯影，像一句没说完的话，等着你去接。
        </p>
        <div className="ab-tail">
          <button className="ex-begin-btn ab-enter" onClick={onEnter} type="button">
            推门而入
          </button>
          {onEnterStudio && (
            <button className="ex-leave-btn ab-studio" onClick={onEnterStudio} type="button">
              先赴希孟画室
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

