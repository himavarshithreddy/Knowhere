import { useEffect, useState } from "react";
import { Activity, CheckCircle, PieChart, AlertCircle, TrendingUp, Compass, Archive, Flame } from "lucide-react";
import { api } from "../lib/api";

type AdvancedStats = {
  savedCount: number;
  rediscoverClicks: number;
  projectsStarted: number;
  projectsCompleted: number;
  forgottenCount: number;
  dormantIdeas: number;
  activationRate: number;
  topInterests: string[];
};

export function StatsPanel() {
  const [stats, setStats] = useState<AdvancedStats | null>(null);

  useEffect(() => {
    let mounted = true;
    api.getStats().then(res => {
      if (mounted) setStats(res as any);
    }).catch(console.error);
    return () => { mounted = false; };
  }, []);

  if (!stats) return null;

  return (
    <div className="stats-panel" style={{
      background: "var(--bg-tertiary)",
      borderRadius: "16px",
      padding: "24px",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "24px",
      border: "1px solid var(--border)"
    }}>
      <div className="stat-card">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", marginBottom: "8px" }}>
          <Flame size={16} /> Activation Rate
        </div>
        <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--accent)" }}>
          {stats.activationRate}%
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
          Saved knowledge converted into action.
        </p>
      </div>

      <div className="stat-card">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", marginBottom: "8px" }}>
          <Compass size={16} /> Rediscovered
        </div>
        <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--success)" }}>
          {stats.rediscoverClicks}
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
          Old resources opened via intelligence.
        </p>
      </div>
      
      <div className="stat-card">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", marginBottom: "8px" }}>
          <CheckCircle size={16} /> Projects Completed
        </div>
        <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--text-primary)" }}>
          {stats.projectsCompleted}
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
          Total out of {stats.projectsStarted} started.
        </p>
      </div>

      <div className="stat-card">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", marginBottom: "8px" }}>
          <Archive size={16} /> Hoarded Items
        </div>
        <div style={{ display: "flex", gap: "16px", fontSize: "18px", fontWeight: "500", color: "var(--text-primary)" }}>
          <div>
             <span style={{ color: "var(--danger)" }}>{stats.forgottenCount}</span> Forgotten
          </div>
          <div>
            <span style={{ color: "var(--warning)" }}>{stats.dormantIdeas}</span> Dormant Ideas
          </div>
        </div>
      </div>
    </div>
  );
}
