import { motion } from "framer-motion";
import { ArrowRight, Calendar, Target } from "lucide-react";
import type { Resource } from "@knowhere/shared";
import { resourceDisplayTitle } from "../lib/utils";
import { IntentBadge } from "./IntentBadge";
import { useData } from "../contexts/DataContext";

export function MissionCard({ resource, onOpen }: { resource: Resource; onOpen: () => void }) {
  const { updateResource } = useData();

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateResource(resource.id, { actionStatus: "completed" });
  };

  const daysActive = Math.max(0, Math.floor((Date.now() - new Date(resource.lastStatusChangeAt || resource.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

  const daysOld = Math.max(0, Math.floor((Date.now() - new Date(resource.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
  
  const milestones = (resource as any).milestones ?? [];
  const totalMilestones = milestones.length;
  const doneMilestones = milestones.filter((m: any) => m.completed).length;
  
  const targetDateStr = (resource as any).targetDate;
  const targetDate = targetDateStr ? new Date(targetDateStr) : null;
  const daysLeft = targetDate ? Math.ceil((targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
  const overdue = daysLeft !== null && daysLeft < 0;

  return (
    <motion.div 
      className="mission-card interactive" 
      onClick={onOpen}
      whileHover={{ y: -2 }}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <IntentBadge intent={resource.intentType} />
        <span className="hud-meta" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Calendar size={12} /> {daysActive}d active
        </span>
      </div>
      
      <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>{resourceDisplayTitle(resource)}</h3>
      
      {totalMilestones > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
            <span>Progress</span>
            <span>{doneMilestones}/{totalMilestones}</span>
          </div>
          <div className="milestone-progress-bar">
            <div className="milestone-progress-fill" style={{ width: `${(doneMilestones / totalMilestones) * 100}%` }} />
          </div>
        </div>
      )}

      {daysLeft !== null && (
        <div style={{ fontSize: "12px", color: overdue ? "var(--danger)" : daysLeft <= 7 ? "#ffd43b" : "var(--success)", fontWeight: 500, marginBottom: "12px" }}>
          {overdue ? `Overdue by ${Math.abs(daysLeft)}d` : daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
        </div>
      )}

      <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "var(--muted)" }}>In progress for {daysOld} days</p>

      <div style={{ background: "var(--bg-tertiary)", borderRadius: "8px", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--accent)" }}>
          <Target size={16} /> In Progress
        </div>
        <button className="button primary" onClick={handleComplete} style={{ padding: "4px 10px", fontSize: "12px", height: "auto" }}>
          Complete <ArrowRight size={12} />
        </button>
      </div>
    </motion.div>
  );
}
