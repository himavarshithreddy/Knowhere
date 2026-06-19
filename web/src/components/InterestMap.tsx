import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { api } from "../lib/api";

type InterestCluster = {
  topic: string;
  tags: string[];
  resourceCount: number;
  recentActivity: boolean;
};

export function InterestMap() {
  const [clusters, setClusters] = useState<InterestCluster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.getInterests().then(res => {
      if (mounted) {
        setClusters(res.interests);
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  if (loading) return null;
  if (clusters.length === 0) return null;

  return (
    <div className="interest-map">
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {clusters.map((cluster) => (
          <div key={cluster.topic} style={{
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border)",
            borderRadius: "20px",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px"
          }}>
            <span style={{ textTransform: "capitalize", fontWeight: 500 }}>{cluster.topic}</span>
            <span style={{ color: "var(--muted)", fontSize: "12px" }}>{cluster.resourceCount}</span>
            {cluster.recentActivity && (
              <span title="Recent activity">
                <Activity size={14} color="var(--success)" />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
