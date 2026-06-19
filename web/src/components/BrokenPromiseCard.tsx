import { motion } from "framer-motion";
import { Archive, Play, Trash2 } from "lucide-react";
import type { Resource } from "@knowhere/shared";
import { resourceDisplayTitle } from "../lib/utils";
import { IntentBadge } from "./IntentBadge";
import { useData } from "../contexts/DataContext";

export function BrokenPromiseCard({ resource, onOpen }: { resource: Resource; onOpen: () => void }) {
  const { updateResource } = useData();

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateResource(resource.id, { actionStatus: "in_progress" });
  };

  const handleShelve = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateResource(resource.id, { actionStatus: "archived" });
  };

  const handleTrash = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateResource(resource.id, { deletedAt: new Date().toISOString() });
  };

  const daysDormant = Math.max(0, Math.floor((Date.now() - new Date(resource.lastStatusChangeAt || resource.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
  
  const targetDateStr = (resource as any).targetDate;
  const targetDate = targetDateStr ? new Date(targetDateStr) : null;
  const daysLeft = targetDate ? Math.ceil((targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
  const overdue = daysLeft !== null && daysLeft < 0;

  const opacity = Math.max(0.6, 1 - (daysDormant / 365) * 0.4); // Fades slightly over time

  return (
    <motion.div 
      className="broken-promise-card interactive" 
      onClick={onOpen}
      whileHover={{ y: -2, opacity: 1 }}
      style={{
        background: "var(--bg-card)",
        border: "1px dashed var(--border)",
        borderRadius: "12px",
        padding: "16px",
        opacity
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <IntentBadge intent={resource.intentType} />
        <span className="hud-meta">Saved {daysDormant}d ago</span>
      </div>
      
      <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "var(--text-main)" }}>{resourceDisplayTitle(resource)}</h3>
      
      {daysLeft !== null && (
        <div style={{ fontSize: "12px", color: overdue ? "var(--danger)" : daysLeft <= 7 ? "#ffd43b" : "var(--success)", fontWeight: 500, marginBottom: "12px" }}>
          {overdue ? `Overdue by ${Math.abs(daysLeft)}d` : daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <button className="button primary" onClick={handleStart} style={{ padding: "4px 10px", fontSize: "12px", height: "auto", flex: 1, justifyContent: "center" }}>
          <Play size={12} style={{ marginRight: "4px" }} /> Start
        </button>
        <button className="button secondary" onClick={handleShelve} style={{ padding: "4px", height: "auto" }} aria-label="Shelve">
          <Archive size={14} />
        </button>
        <button className="button secondary" onClick={handleTrash} style={{ padding: "4px", height: "auto", color: "var(--danger)" }} aria-label="Trash">
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}
