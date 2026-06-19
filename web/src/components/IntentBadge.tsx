import type { IntentType } from "@knowhere/shared";
import { BookOpen, Rocket, Lightbulb, Target } from "lucide-react";

type Props = {
  intent: IntentType;
  className?: string;
  onClick?: () => void;
};

const intentConfig: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  knowledge: { label: "Knowledge", bg: "var(--bg-tertiary)", color: "var(--text-secondary)", icon: <BookOpen size={13} /> },
  project: { label: "Project", bg: "rgba(168, 85, 247, 0.15)", color: "#c084fc", icon: <Rocket size={13} /> },
  idea: { label: "Idea", bg: "rgba(234, 179, 8, 0.15)", color: "#facc15", icon: <Lightbulb size={13} /> },
  goal: { label: "Goal", bg: "rgba(34, 197, 94, 0.15)", color: "#4ade80", icon: <Target size={13} /> }
};

export function IntentBadge({ intent, className = "", onClick }: Props) {
  if (intent === "unclassified") return null;
  const config = intentConfig[intent] || intentConfig.knowledge;
  
  return (
    <span 
      onClick={onClick}
      className={`intent-badge ${onClick ? "interactive" : ""} ${className}`}
      style={{
        backgroundColor: config.bg,
        color: config.color,
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: 500,
        whiteSpace: "nowrap",
        cursor: onClick ? "pointer" : "inherit"
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center" }}>{config.icon}</span>
      {config.label}
    </span>
  );
}

