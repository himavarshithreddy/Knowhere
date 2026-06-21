import { memo, useEffect, useState, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Archive, Download, ExternalLink, Heart, Lock, LockOpen, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Category, Resource, IntentType } from "@knowhere/shared";
import { useData } from "../contexts/DataContext";
import { VaultPinInput } from "./VaultPinInput";
import { DetailMediaPreview } from "./ResourceMediaPreview";
import { IntentBadge } from "./IntentBadge";
import { StatusProgression } from "./StatusProgression";
import { MilestoneChecklist } from "./MilestoneChecklist";
import { resourceDisplayTitle } from "../lib/utils";
import { api } from "../lib/api";

const DetailMedia = memo(function DetailMedia({ resource }: { resource: Resource }) {
  return <DetailMediaPreview resource={resource} />;
}, (prev, next) => prev.resource.id === next.resource.id
  && prev.resource.downloadUrl === next.resource.downloadUrl
  && prev.resource.type === next.resource.type
  && prev.resource.metadata === next.resource.metadata
  && prev.resource.url === next.resource.url);

function AttachmentActions({ resource }: { resource: Resource }) {
  const { recordView } = useData();
  if (!resource.downloadUrl || (resource.type !== "image" && resource.type !== "pdf")) return null;
  const label = resource.type === "pdf" ? "PDF" : "image";

  return <div className="detail-attachment-bar">
    <a className="button secondary" href={resource.downloadUrl} target="_blank" rel="noreferrer" onClick={() => recordView(resource.id, "use")}>
      Open {label} <ExternalLink size={15} />
    </a>
    <a className="button secondary" href={resource.downloadUrl} download={resource.fileName ?? undefined} onClick={() => recordView(resource.id, "use")}>
      <Download size={15} /> Download
    </a>
  </div>;
}

function DetailEditor({ resource, categories, onClose }: { resource: Resource; categories: Category[]; onClose: () => void }) {
  const navigate = useNavigate();
  const { updateResource, profile, refresh, recordView } = useData();
  const [description, setDescription] = useState(resource.description ?? "");
  const [saved, setSaved] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [setupPin, setSetupPin] = useState("");
  const [setupPinError, setSetupPinError] = useState("");
  const [title, setTitle] = useState(resource.title || resourceDisplayTitle(resource));
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [title]);

  useEffect(() => {
    setDescription(resource.description ?? "");
    setTitle(resource.title || resourceDisplayTitle(resource));
  }, [resource.id, resource.description, resource.title]);

  useEffect(() => {
    // Record view when opened
    recordView(resource.id).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource.id]);

  const persist = async () => {
    if (description === resource.description) return;
    await updateResource(resource.id, { description });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const persistTitle = async () => {
    if (title === (resource.title || resourceDisplayTitle(resource))) return;
    await updateResource(resource.id, { title });
  };

  const handleToggleLock = () => {
    if (!resource.locked && profile && !profile.hasVaultPin) {
      setShowPinSetup(true);
    } else {
      updateResource(resource.id, { locked: !resource.locked });
    }
  };

  const submitPinSetup = async (completedPin?: string) => {
    const finalPin = completedPin || setupPin;
    if (finalPin.length !== 4) { setSetupPinError("PIN must be exactly 4 digits."); return; }
    setSetupPinError("");
    try {
      await api.setupVault(finalPin);
      await updateResource(resource.id, { locked: true });
      setShowPinSetup(false);
      await refresh();
    } catch (e) {
      setSetupPinError(e instanceof Error ? e.message : "Failed to setup Vault.");
    }
  };

  return <>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
      <p className="eyebrow hud-meta" style={{ margin: 0 }}>{resource.metadata?.siteName ?? resource.type}</p>
      <IntentBadge intent={resource.intentType} />
    </div>
    <textarea 
      ref={textareaRef}
      id="detail-title"
      className="detail-title-input"
      value={title}
      rows={1}
      onChange={e => setTitle(e.target.value)}
      onBlur={persistTitle}
      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
      placeholder="Untitled"
      onFocus={e => e.currentTarget.style.borderBottom = "1px solid var(--accent)"}
      onBlurCapture={e => e.currentTarget.style.borderBottom = "1px solid transparent"}
    />
    {resource.noteBody && <div className="note-body">{resource.noteBody}</div>}

    {/* Clickable tags */}
    {(resource.tags ?? []).length > 0 && (
      <div className="resource-tags" style={{ marginBottom: "12px" }}>
        {(resource.tags ?? []).map(tag => (
          <button
            key={tag}
            type="button"
            className="tag-pill"
            onClick={() => navigate(`/library?tag=${encodeURIComponent(tag)}`)}
            title={`Filter by ${tag}`}
          >
            {tag}
          </button>
        ))}
      </div>
    )}
    <label className="field">
      <span>Why this matters</span>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)}
        onBlur={persist} rows={4} />
      {saved && <small className="saved">Saved</small>}
    </label>
    {(resource as any).aiDescription && (resource as any).aiDescription !== resource.description && (
      <div className="ai-description" style={{ marginTop: "-8px", marginBottom: "16px", padding: "12px", backgroundColor: "var(--bg-tertiary)", borderRadius: "8px", fontSize: "14px", color: "var(--text-secondary)", borderLeft: "2px solid rgba(168, 85, 247, 0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", fontSize: "12px", color: "var(--text-primary)", fontWeight: 500 }}>
           AI Summary
        </div>
        {(resource as any).aiDescription}
      </div>
    )}
    <div className="detail-meta-fields">
      <label className="field" style={{ flex: 1 }}>
        <span>Cluster</span>
        <select value={resource.categoryId}
          onChange={(e) => updateResource(resource.id, { categoryId: e.target.value })}>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>

      <label className="field" style={{ flex: 1 }}>
        <span>Intent</span>
        <select value={resource.intentType} onChange={e => updateResource(resource.id, { intentType: e.target.value as IntentType })}>
          <option value="unclassified">Unclassified</option>
          <option value="knowledge">Knowledge</option>
          <option value="mission">Mission</option>
        </select>
      </label>

      <label className="field" style={{ flex: 1 }}>
        <span>Status</span>
        <select value={resource.actionStatus}
          onChange={(e) => updateResource(resource.id, { actionStatus: e.target.value as any })}>
          <option value="saved">Saved</option>
          <option value="reviewed">Reviewed</option>
          <option value="in_progress">In Progress</option>
          <option value="applied">Applied</option>
          <option value="completed">Completed</option>
          <option value="dormant">Dormant</option>
          <option value="archived">Archived</option>
        </select>
      </label>
    </div>

    <div className="detail-menu">
      <button onClick={handleToggleLock}>
        {resource.locked ? <><LockOpen /> Remove from Vault</> : <><Lock /> Send to Vault</>}
      </button>
      
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showPinSetup && (
            <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 1000 }} onClick={() => setShowPinSetup(false)}>
              <motion.section className="detail-panel vault-modal" role="dialog" onClick={e => e.stopPropagation()} initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}>
                <button className="icon-button" style={{ position: "absolute", top: "12px", right: "12px" }} onClick={() => setShowPinSetup(false)}><X size={16}/></button>
                <div style={{ textAlign: "center" }}>
                  <Lock size={32} style={{ margin: "0 auto 16px", color: "var(--accent)" }} />
                  <h3 style={{ margin: 0, fontSize: "20px" }}>Create Vault PIN</h3>
                  <p style={{ margin: "8px 0 0", fontSize: "14px", color: "var(--muted)" }}>4 digits to secure your discoveries.</p>
                </div>
                <VaultPinInput value={setupPin} onChange={setSetupPin} onComplete={submitPinSetup} error={!!setupPinError} />
                <button type="button" className="button primary" onClick={() => submitPinSetup()} disabled={setupPin.length !== 4} style={{ width: "100%", height: "44px", fontSize: "15px" }}>Set PIN</button>
                {setupPinError && <p className="form-error" style={{ margin: 0, textAlign: "center" }}>{setupPinError}</p>}
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <button onClick={() => updateResource(resource.id, { favorite: !resource.favorite })}><Heart /> {resource.favorite ? "Remove favorite" : "Favorite"}</button>
      <button onClick={() => updateResource(resource.id, { archived: !resource.archived })}><Archive /> {resource.archived ? "Unarchive" : "Archive"}</button>
      <button className="danger-text" onClick={async () => {
        await updateResource(resource.id, { deletedAt: new Date().toISOString() });
        onClose();
      }}><Trash2 /> Move to Trash</button>
    </div>
    <details>
      <summary>Discovery details</summary>
      <dl>
        <dt>Created</dt><dd>{new Date(resource.createdAt).toLocaleString()}</dd>
        <dt>Updated</dt><dd>{new Date(resource.updatedAt).toLocaleString()}</dd>
        {resource.fileName && <><dt>File</dt><dd>{resource.fileName}</dd></>}
        {resource.metadata?.author && <><dt>Author</dt><dd>{resource.metadata.author}</dd></>}
        <dt>Views</dt><dd>{resource.viewCount}</dd>
        {resource.lastViewedAt && <><dt>Last Viewed</dt><dd>{new Date(resource.lastViewedAt).toLocaleString()}</dd></>}
      </dl>
    </details>
  </>;
}

function SimilarDiscoveries({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const { resources, recordView } = useData();
  const navigate = useNavigate();
  
  const similar = useMemo(() => {
    if (!resource.tags || resource.tags.length === 0) return [];
    return resources
      .filter(r => r.id !== resource.id && !r.deletedAt && !r.archived && !r.locked)
      .filter(r => r.tags?.some(t => resource.tags!.includes(t)))
      .sort((a, b) => {
        const overlapA = a.tags!.filter(t => resource.tags!.includes(t)).length;
        const overlapB = b.tags!.filter(t => resource.tags!.includes(t)).length;
        return overlapB - overlapA;
      })
      .slice(0, 3);
  }, [resource, resources]);

  if (similar.length === 0) return null;

  return (
    <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid var(--border)" }}>
      <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>Similar Discoveries</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {similar.map((r: any) => (
          <button 
            key={r.id}
            className="secondary" 
            style={{ textAlign: "left", padding: "12px", height: "auto", display: "block" }}
            onClick={() => {
              recordView(r.id, "rediscover_click");
              navigate(`/library?resource=${r.id}`);
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: "4px" }}>{r.title || r.metadata?.title || "Untitled"}</div>
            <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", gap: "8px" }}>
              <span>{r.type}</span>
              {r.tags && r.tags.length > 0 && <span>• {r.tags[0]}</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ResourceDetail({ resource, categories, onClose }: { resource: Resource | null; categories: Category[]; onClose: () => void }) {
  const { recordView } = useData();
  return <AnimatePresence>{resource && <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.section className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title"
      initial={{ x: 32, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 32, opacity: 0 }}>
      <header>
        <span className="type-badge">{resource.type}</span>
        <div className="detail-actions">
          {resource.url && <a className="button secondary" href={resource.url} target="_blank" rel="noreferrer" onClick={() => recordView(resource.id, "use")}>Open original <ExternalLink size={15} /></a>}
          <button className="icon-button" onClick={onClose} aria-label="Close"><X /></button>
        </div>
      </header>

      <div className="detail-scroll">
        <DetailMedia resource={resource} />
        <AttachmentActions resource={resource} />
        <div className="detail-content">
          <DetailEditor resource={resource} categories={categories} onClose={onClose} />
        </div>
        
        {/* Similar Discoveries */}
        <SimilarDiscoveries resource={resource} onClose={onClose} />
      </div>
    </motion.section>
  </motion.div>}</AnimatePresence>;
}
