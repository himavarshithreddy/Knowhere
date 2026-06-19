import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Target, Calendar, CheckSquare } from "lucide-react";
import type { Resource } from "@knowhere/shared";
import { useData } from "../contexts/DataContext";
import { StatusProgression } from "./StatusProgression";
import { MilestoneChecklist } from "./MilestoneChecklist";

type Props = {
  resource: Resource | null;
  onClose: () => void;
};

export function MissionDetail({ resource, onClose }: Props) {
  const { updateResource } = useData();
  const [title, setTitle] = useState(resource?.title || "");

  useEffect(() => {
    if (resource) setTitle(resource.title || "");
  }, [resource]);

  if (!resource) return null;

  const persistTitle = async () => {
    if (title === resource.title) return;
    await updateResource(resource.id, { title });
  };

  return (
    <AnimatePresence>
      <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.section className="detail-panel" role="dialog" aria-modal="true"
          initial={{ x: 32, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 32, opacity: 0 }}>
          
          <header style={{ borderBottom: "1px solid var(--line)", paddingBottom: "16px", marginBottom: "24px" }}>
            <div>
              <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Target size={14} color="var(--accent)" /> Mission
              </p>
              <input 
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={persistTitle}
                onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                placeholder="Untitled Mission"
                style={{ 
                  fontSize: "20px", fontWeight: "bold", background: "transparent", 
                  border: "none", borderBottom: "1px solid transparent", color: "inherit", 
                  padding: 0, width: "100%", marginTop: "4px", outline: "none",
                  transition: "border-color 0.2s"
                }}
                onFocus={e => e.currentTarget.style.borderBottom = "1px solid var(--accent)"}
                onBlurCapture={e => e.currentTarget.style.borderBottom = "1px solid transparent"}
              />
            </div>
            <button className="icon-button" onClick={onClose} aria-label="Close"><X /></button>
          </header>

          <div className="form-scroll" style={{ display: "flex", flexDirection: "column", gap: "32px", paddingBottom: "64px" }}>
            
            {/* Status Pipeline */}
            <section>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--muted)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Target size={16} /> Progress
              </h3>
              <div style={{ background: "var(--surface)", padding: "20px", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <StatusProgression resourceId={resource.id} currentStatus={resource.actionStatus} />
              </div>
            </section>

            {/* Target Date */}
            <section>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--muted)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Calendar size={16} /> Target Date
              </h3>
              <div style={{ background: "var(--surface)", padding: "16px", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <input
                  type="date"
                  value={resource.targetDate ? resource.targetDate.slice(0, 10) : ""}
                  onChange={e => {
                    if (!e.target.value) {
                      updateResource(resource.id, { targetDate: null } as any);
                    } else {
                      // Parse correctly without timezone shift
                      const [y, m, d] = e.target.value.split("-").map(Number);
                      const localDate = new Date(y, m - 1, d);
                      updateResource(resource.id, { targetDate: localDate.toISOString() } as any);
                    }
                  }}
                  style={{
                    width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)",
                    background: "var(--bg)", color: "var(--text)", fontSize: "15px", fontFamily: "inherit"
                  }}
                />
              </div>
            </section>

            {/* Milestones Checklist */}
            <section>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--muted)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckSquare size={16} /> Milestones
              </h3>
              <MilestoneChecklist resource={resource} />
            </section>

            {/* AI Summary / Context */}
            {resource.aiDescription && (
              <section>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--muted)", marginBottom: "12px" }}>
                  AI Context
                </h3>
                <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "var(--text)" }}>
                  {resource.aiDescription}
                </p>
              </section>
            )}

            {resource.description && (
              <section>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--muted)", marginBottom: "12px" }}>
                  Your Notes
                </h3>
                <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                  {resource.description}
                </p>
              </section>
            )}

          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}
