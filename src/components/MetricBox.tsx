import type { LucideIcon } from "lucide-react";

type MetricBoxProps = {
  icon: LucideIcon;
  label: string;
  value: number;
};

export default function MetricBox({ icon: Icon, label, value }: MetricBoxProps) {
  return (
    <div className="metric">
      <div className="metric-head">
        <span className="icon-text">
          <Icon size={14} /> {label}
        </span>
        <strong>{value}</strong>
      </div>
      <div className="metric-bar">
        <i style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
