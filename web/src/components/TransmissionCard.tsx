import { motion } from "framer-motion";
import { CheckCircle, Clock, X } from "lucide-react";
import type { Resource } from "@knowhere/shared";
import { resourceDisplayTitle, relativeDate } from "../lib/utils";
import { IntentBadge } from "./IntentBadge";
import { useData } from "../contexts/DataContext";

type Props = {
  resource: Resource;
  reason: string;
  onOpen: () => void;
  onDismiss: () => void;
};

export function TransmissionCard({ resource, reason, onOpen, onDismiss }: Props) {
  const { updateResource } = useData();

  const handleReviewed = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateResource(resource.id, { actionStatus: "reviewed" });
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss();
  };

  return (
    <motion.div 
      className="transmission-card interactive" 
      onClick={onOpen}
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        background: "linear-gradient(145deg, rgba(30,30,40,0.8) 0%, rgba(20,20,30,0.95) 100%)",
        border: "1px solid rgba(100,100,255,0.15)",
        borderRadius: "16px",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255,255,255,0.05)"
      }}
    >
      <div style={{ position: "absolute", top: -50, right: -50, width: 100, height: 100, background: "rgba(100,100,255,0.2)", filter: "blur(40px)", borderRadius: "50%" }} />
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", position: "relative", zIndex: 1 }}>
        <div>
          <IntentBadge intent={resource.intentType} />
          <span className="hud-meta" style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginLeft: "12px" }}>
            <Clock size={12} /> Saved {relativeDate(resource.createdAt)}
          </span>
        </div>
        <button className="icon-button" onClick={handleDismiss} aria-label="Dismiss" style={{ background: "rgba(0,0,0,0.2)" }}>
          <X size={16} />
        </button>
      </div>
      
      <h3 style={{ fontSize: "18px", margin: "0 0 8px 0", position: "relative", zIndex: 1 }}>
        {resourceDisplayTitle(resource)}
      </h3>
      
      <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: "0 0 16px 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", position: "relative", zIndex: 1 }}>
        {reason}
      </p>

      <div style={{ display: "flex", gap: "8px", position: "relative", zIndex: 1 }}>
        <button className="button primary" onClick={handleReviewed} style={{ padding: "6px 12px", fontSize: "13px", height: "auto" }}>
          <CheckCircle size={14} /> Mark Reviewed
        </button>
      </div>
    </motion.div>
  );
}
