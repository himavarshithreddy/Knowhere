import { motion } from "framer-motion";
import { Archive, Lightbulb, Play, Trash2 } from "lucide-react";
import type { Resource } from "@knowhere/shared";
import { resourceDisplayTitle } from "../lib/utils";
import { IntentBadge } from "./IntentBadge";
import { useData } from "../contexts/DataContext";

export function OpportunityCard({ resource, onOpen }: { resource: Resource; onOpen: () => void }) {
  const { updateResource } = useData();

  const handleExplore = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateResource(resource.id, { actionStatus: "reviewed" });
  };

  const handleShelve = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateResource(resource.id, { actionStatus: "archived" });
  };

  const handleTrash = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateResource(resource.id, { deletedAt: new Date().toISOString() });
  };

  const daysOld = Math.max(0, Math.floor((Date.now() - new Date(resource.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <motion.div 
      className="opportunity-card interactive" 
      onClick={onOpen}
      whileHover={{ y: -2, borderColor: "rgba(255, 212, 59, 0.5)" }}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <IntentBadge intent={resource.intentType} />
        <span className="hud-meta">Saved {daysOld}d ago</span>
      </div>
      
      <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>{resourceDisplayTitle(resource)}</h3>
      
      {resource.tags && resource.tags.length > 0 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
          {resource.tags.slice(0, 3).map(tag => (
            <span key={tag} style={{ fontSize: "11px", background: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: "4px", color: "var(--text-secondary)" }}>
              {tag}
            </span>
          ))}
        </div>
      )}
      
      <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "var(--muted)" }}>Still worth exploring?</p>
      
      <div style={{ display: "flex", gap: "8px" }}>
        <button className="button primary" onClick={handleExplore} style={{ padding: "4px 10px", fontSize: "12px", height: "auto", flex: 1, justifyContent: "center", background: "rgba(255, 212, 59, 0.15)", color: "#ffd43b", border: "1px solid rgba(255, 212, 59, 0.3)" }}>
          <Lightbulb size={12} style={{ marginRight: "4px" }} /> Explore
        </button>
        <button className="button secondary" onClick={handleShelve} style={{ padding: "4px", height: "auto" }} aria-label="Park It">
          <Archive size={14} />
        </button>
        <button className="button secondary" onClick={handleTrash} style={{ padding: "4px", height: "auto", color: "var(--danger)" }} aria-label="Not Anymore">
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}
