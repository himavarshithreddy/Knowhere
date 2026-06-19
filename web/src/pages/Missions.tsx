import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Target, Search, Folder, Zap } from "lucide-react";
import { useData } from "../contexts/DataContext";
import { usePageSeo } from "../hooks/usePageSeo";
import { WorkspaceHeaderMeta } from "../components/WorkspaceHeaderMeta";
import { WorkspaceHeaderActions } from "../components/WorkspaceHeaderActions";
import { MissionDetail } from "../components/MissionDetail";

const format = (date: Date, _pattern: string) => {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const isPast = (date: Date) => {
  return date.getTime() < Date.now();
};

const isToday = (date: Date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

type Tab = "active" | "planned" | "completed" | "dormant" | "all";

export function Missions() {
  const { resources, categories } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("active");

  const selectedResourceId = searchParams.get("detail");
  const selected = useMemo(() => {
    return selectedResourceId ? resources.find((r) => r.id === selectedResourceId) || null : null;
  }, [selectedResourceId, resources]);

  usePageSeo({
    title: "Missions - Knowhere",
    description: "Track your projects, ideas, and goals.",
    path: "/missions"
  });

  const missions = useMemo(() => {
    return resources.filter(r => !r.deletedAt && !r.archived && r.intentType === "mission");
  }, [resources]);

  const active = missions.filter(r => r.actionStatus === "in_progress");
  const planned = missions.filter(r => r.actionStatus === "saved");
  const completed = missions.filter(r => r.actionStatus === "completed");
  const dormant = missions.filter(r => r.actionStatus === "dormant");

  const displayed = useMemo(() => {
    switch (tab) {
      case "active": return active;
      case "planned": return planned;
      case "completed": return completed;
      case "dormant": return dormant;
      case "all": return missions;
    }
  }, [tab, active, planned, completed, dormant, missions]);

  const openDetail = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("detail", id);
      return next;
    });
  };

  const { updateResource } = useData();

  const closeDetail = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("detail");
      return next;
    });
  };

  const toggleMissionStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "in_progress" : "completed";
    updateResource(id, { actionStatus: nextStatus } as any);
  };

  return (
    <main id="main-content" className="workspace">
      <header className="workspace-header">
        <div className="workspace-header-main">
          <WorkspaceHeaderMeta eyebrow={<span className="hud-meta">Action Center</span>} />
          <h1 style={{ display: "flex", alignItems: "center", gap: "12px" }}><Target size={36} style={{ color: "var(--accent)" }} /> Missions</h1>
        </div>
        <WorkspaceHeaderActions />
      </header>

      <div className="toolbar">
        <div className="toolbar-cluster toolbar-cluster-filters" style={{ flex: 1, overflowX: "auto" }}>
          <div className="tabs browse-tabs">
            <button className={tab === "active" ? "active" : ""} onClick={() => setTab("active")}>
              Active ({active.length})
            </button>
            <button className={tab === "planned" ? "active" : ""} onClick={() => setTab("planned")}>
              Planned ({planned.length})
            </button>
            <button className={tab === "completed" ? "active" : ""} onClick={() => setTab("completed")}>
              Completed ({completed.length})
            </button>
            <button className={tab === "dormant" ? "active" : ""} onClick={() => setTab("dormant")}>
              Dormant ({dormant.length})
            </button>
            <button className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>
              All
            </button>
          </div>
        </div>
      </div>

      <div className="mission-list" style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
        <AnimatePresence>
          {displayed.map(r => {
            const isCompleted = r.actionStatus === "completed";
            const completedMilestones = (r.milestones || []).filter((m: any) => m.completed).length;
            const totalMilestones = (r.milestones || []).length;
            let dateColor = "var(--text-secondary)";
            let dateText = "";
            
            if (r.targetDate) {
              const target = new Date(r.targetDate);
              dateText = format(target, "MMM d");
              if (!isCompleted) {
                if (isPast(target) && !isToday(target)) dateColor = "var(--danger)";
                else if (isToday(target)) dateColor = "#ffd43b";
              }
            }

            return (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`mission-list-item ${isCompleted ? "completed" : ""}`}
                onClick={() => openDetail(r.id)}
              >
                <button
                  className={`mission-checkbox ${isCompleted ? "completed" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMissionStatus(r.id, r.actionStatus);
                  }}
                >
                  {isCompleted && "✓"}
                </button>
                
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ 
                    fontSize: "15px", fontWeight: 600, 
                    color: isCompleted ? "var(--muted)" : "var(--text)",
                    textDecoration: isCompleted ? "line-through" : "none" 
                  }}>
                    {r.title || "Untitled Mission"}
                  </span>
                  
                  {totalMilestones > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--muted)" }}>
                      <div style={{ width: "100px", height: "4px", background: "var(--line)", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ 
                          width: `${(completedMilestones / totalMilestones) * 100}%`, 
                          height: "100%", background: isCompleted ? "var(--success)" : "var(--accent)", 
                          transition: "width 0.3s ease" 
                        }} />
                      </div>
                      {completedMilestones}/{totalMilestones}
                    </div>
                  )}
                </div>

                {dateText && (
                  <div style={{ fontSize: "13px", fontWeight: 500, color: dateColor, display: "flex", alignItems: "center", gap: "4px" }}>
                    {dateText}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {displayed.length === 0 && (
        <div className="empty-state">
          <Target size={48} color="var(--muted)" style={{ marginBottom: "16px" }} />
          <h2>No {tab} missions</h2>
          <p>
            {tab === "active" ? "Start a project or goal from your library to track it here." : "Save projects and ideas to your vault to build your action list."}
          </p>
        </div>
      )}

      <MissionDetail resource={selected} onClose={closeDetail} />
    </main>
  );
}
