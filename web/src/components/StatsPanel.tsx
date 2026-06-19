import { useEffect, useState } from "react";
import { Activity, CheckCircle, PieChart } from "lucide-react";
import { api } from "../lib/api";

type StatsData = {
  total: number;
  byIntent: Record<string, number>;
  byStatus: Record<string, number>;
  actionRate: number;
  completionRate: number;
  forgottenCount: number;
};

export function StatsPanel() {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    let mounted = true;
    api.getStats().then(res => {
      if (mounted) setStats(res);
    }).catch(console.error);
    return () => { mounted = false; };
  }, []);

  if (!stats) return null;

  return (
    <div className="stats-panel" style={{
      background: "var(--bg-tertiary)",
      borderRadius: "16px",
      padding: "24px",
      display: "flex",
      gap: "24px",
      flexWrap: "wrap",
      border: "1px solid var(--border)"
    }}>
      <div style={{ flex: "1 1 200px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", marginBottom: "8px" }}>
          <Activity size={16} /> Action Rate
        </div>
        <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--accent)" }}>
          {Math.round(stats.actionRate * 100)}%
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
          Of {stats.total} items have been reviewed or started.
        </p>
      </div>

      <div style={{ flex: "1 1 200px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", marginBottom: "8px" }}>
          <CheckCircle size={16} /> Completion Rate
        </div>
        <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--success)" }}>
          {Math.round(stats.completionRate * 100)}%
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
          Of missions have been achieved.
        </p>
      </div>

      <div style={{ flex: "1 1 200px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", marginBottom: "8px" }}>
          <PieChart size={16} /> Knowledge Vault
        </div>
        <div style={{ display: "flex", gap: "12px", fontSize: "14px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#4dabf7" }}></span>
            {stats.byIntent.knowledge || 0} Knowledge
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#b197fc" }}></span>
            {stats.byIntent.project || 0} Projects
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#ffd43b" }}></span>
            {stats.byIntent.idea || 0} Ideas
          </div>
        </div>
      </div>
    </div>
  );
}
