import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Ghost, LoaderCircle, Sparkles, Target, Plus, Lightbulb, LayoutDashboard, Map, Compass } from "lucide-react";
import type { Resource } from "@knowhere/shared";
import { api } from "../lib/api";
import { useData } from "../contexts/DataContext";
import { usePageSeo } from "../hooks/usePageSeo";
import { WorkspaceHeaderMeta } from "../components/WorkspaceHeaderMeta";
import { WorkspaceHeaderActions } from "../components/WorkspaceHeaderActions";
import { TransmissionCard } from "../components/TransmissionCard";
import { MissionCard } from "../components/MissionCard";
import { BrokenPromiseCard } from "../components/BrokenPromiseCard";
import { OpportunityCard } from "../components/OpportunityCard";
import { ResourceDetail } from "../components/ResourceDetail";
import { ResourceForm } from "../components/ResourceForm";
import { InterestMap } from "../components/InterestMap";
import { IntelligencePanel, type IntelligenceData } from "../components/IntelligencePanel";

type DashboardData = {
  transmissions: { resource: Resource; reason: string }[];
  activeMissions: Resource[];
  brokenPromises: Resource[];
  opportunities: Resource[];
  weeklyRecap: {
    newSavesThisWeek: number;
    reviewedThisWeek: number;
    projectsStarted: number;
    projectsCompleted: number;
    itemsGoneDormant: number;
    topTagsThisWeek: string[];
  };
  intelligence?: IntelligenceData;
};

export function Dashboard() {
  const { categories, resources } = useData();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);

  const openForm = () => setFormOpen(true);
  const closeForm = () => setFormOpen(false);

  // We still rely on global resources array for the detail view so updates reflect
  const selectedResourceId = searchParams.get("detail");
  const selected = useMemo(() => {
    return selectedResourceId ? resources.find((r) => r.id === selectedResourceId) || null : null;
  }, [selectedResourceId, resources]);

  usePageSeo({
    title: "Dashboard - Knowhere",
    description: "Your memory system dashboard.",
    path: "/dashboard"
  });

  useEffect(() => {
    let mounted = true;
    api.getDashboardData().then(res => {
      if (mounted) {
        setData(res);
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [resources]); // Re-fetch when global resources change (like status updates)

  const openDetail = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("detail", id);
      return next;
    });
  };

  const closeDetail = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("detail");
      return next;
    });
  };

  const dismissTransmission = (id: string) => {
    // Optimistic removal for now
    if (data) {
      setData({
        ...data,
        transmissions: data.transmissions.filter(t => t.resource.id !== id)
      });
    }
  };

  return (
    <main id="main-content" className="workspace dashboard-workspace">
      <header className="workspace-header">
        <div className="workspace-header-main">
          <WorkspaceHeaderMeta eyebrow={<span className="hud-meta">Memory System</span>} />
          <h1 style={{ display: "flex", alignItems: "center", gap: "12px" }}><LayoutDashboard size={36} style={{ color: "var(--accent)" }} /> Dashboard</h1>
        </div>
        <WorkspaceHeaderActions />
      </header>

      <div className="dashboard-scroll" style={{ padding: "0 0 64px" }}>
        {loading && !data ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "64px" }}>
            <LoaderCircle className="spin" size={32} color="var(--accent)" />
          </div>
        ) : data && (
          <div style={{ display: "flex", flexDirection: "column", gap: "48px", maxWidth: "1200px", margin: "0 auto" }}>
            
            {data.intelligence && <IntelligencePanel data={data.intelligence} />}

            {/* Transmissions */}
            {data.transmissions.length > 0 && (
              <section>
                <h2 style={{ fontSize: "22px", display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <Sparkles size={24} color="var(--accent)" /> Transmissions from Knowhere
                </h2>
                <p style={{ color: "var(--muted)", marginBottom: "24px", marginTop: "-8px", fontSize: "14px" }}>
                  Signals from your past self that might be relevant today.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
                  <AnimatePresence>
                    {data.transmissions.map((t) => (
                      <TransmissionCard 
                        key={t.resource.id} 
                        resource={t.resource} 
                        reason={t.reason} 
                        onOpen={() => openDetail(t.resource.id)}
                        onDismiss={() => dismissTransmission(t.resource.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Interest Map */}
            <section>
              <h2 style={{ fontSize: "22px", display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <Map size={24} color="var(--accent)" /> Interest Map
              </h2>
              <InterestMap />
            </section>

            {/* Active Missions */}
            <section>
              <h2 style={{ fontSize: "22px", display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <Target size={24} color="var(--accent)" /> Active Missions
              </h2>
              {data.activeMissions.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                  {data.activeMissions.map((m) => (
                    <MissionCard key={m.id} resource={m} onOpen={() => openDetail(m.id)} />
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: "32px", minHeight: "auto", background: "var(--bg-tertiary)", borderRadius: "12px", border: "1px dashed var(--border)" }}>
                  <p style={{ margin: 0, color: "var(--muted)" }}>No active missions. Start a project or goal from your library.</p>
                </div>
              )}
            </section>

            {/* Broken Promises */}
            {data.brokenPromises.length > 0 && (
              <section>
                <h2 style={{ fontSize: "22px", display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <Ghost size={24} color="var(--danger)" /> Broken Promises
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                  {data.brokenPromises.map((p) => (
                    <BrokenPromiseCard key={p.id} resource={p} onOpen={() => openDetail(p.id)} />
                  ))}
                </div>
              </section>
            )}

            {/* Opportunities */}
            {data.opportunities.length > 0 && (
              <section>
                <h2 style={{ fontSize: "22px", display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <Lightbulb size={24} color="#ffd43b" /> Opportunities
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                  {data.opportunities.map((o) => (
                    <OpportunityCard key={o.id} resource={o} onOpen={() => openDetail(o.id)} />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </div>

      <ResourceDetail resource={selected} categories={categories} onClose={closeDetail} />
      
      {formOpen && <ResourceForm open={formOpen} onClose={closeForm} initialCategory={categories.find((c) => c.isDefault)?.id || ""} />}
      <button className="global-fab" onClick={openForm} aria-label="Log discovery"><Plus /></button>
    </main>
  );
}
