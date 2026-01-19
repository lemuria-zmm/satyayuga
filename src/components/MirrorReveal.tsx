import { motion } from "framer-motion";

export const MirrorReveal = ({ insight }: { insight: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="mirror-reveal"
  >
    <div className="mirror-card">
      <h3>镜像视角</h3>
      <p>{insight}</p>
      <p className="mirror-note">未来会在这里播放完整时间轴与隐藏独白。</p>
    </div>
  </motion.div>
);
