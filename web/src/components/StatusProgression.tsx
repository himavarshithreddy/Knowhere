import { motion } from "framer-motion";
import type { ActionStatus } from "@knowhere/shared";
import { useData } from "../contexts/DataContext";

type Props = {
  resourceId: string;
  currentStatus: ActionStatus;
  vertical?: boolean;
};

const pipeline: { id: ActionStatus; label: string }[] = [
  { id: "saved", label: "Saved" },
  { id: "reviewed", label: "Reviewed" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" }
];

export function StatusProgression({ resourceId, currentStatus, vertical = false }: Props) {
  const { updateResource } = useData();

  const currentIndex = pipeline.findIndex(p => p.id === currentStatus);
  const isDormant = currentStatus === "dormant";
  const isArchived = currentStatus === "archived";
  
  // If dormant or archived, we show that as a special state outside the pipeline
  const effectiveIndex = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div className={`status-progression ${vertical ? "vertical" : "horizontal"}`} style={{
      display: "flex",
      flexDirection: vertical ? "column" : "row",
      gap: "12px",
      alignItems: vertical ? "flex-start" : "center",
      width: "100%",
      position: "relative"
    }}>
      {!vertical && <div style={{ 
        position: "absolute", top: "12px", left: "12px", right: "12px", height: "2px", 
        background: "var(--line)", zIndex: 0 
      }} />}

      {pipeline.map((step, index) => {
        const isActive = index === effectiveIndex && !isDormant && !isArchived;
        const isPast = index < effectiveIndex && !isDormant && !isArchived;

        return (
          <div key={step.id} style={{ 
            display: "flex", 
            flexDirection: vertical ? "row" : "column", 
            alignItems: "center", 
            gap: "8px",
            position: "relative",
            zIndex: 1,
            flex: vertical ? "none" : 1
          }}>
            <button
              className="icon-button"
              onClick={(e) => {
                e.stopPropagation();
                updateResource(resourceId, { actionStatus: step.id });
              }}
              style={{
                width: "24px", height: "24px", padding: 0,
                borderRadius: "50%",
                background: isActive ? "var(--accent)" : isPast ? "var(--success)" : "var(--surface)",
                color: (isActive || isPast) ? "#fff" : "var(--muted)",
                border: isActive ? "2px solid var(--accent-strong)" : "2px solid var(--line)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: "bold",
                transition: "all 0.2s"
              }}
            >
              {isActive ? "•" : isPast ? "✓" : ""}
            </button>
            <span style={{ 
              fontSize: "12px", 
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "var(--text)" : "var(--muted)" 
            }}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
