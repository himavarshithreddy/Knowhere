import { memo, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Archive, Download, ExternalLink, Heart, Lock, LockOpen, Trash2, X } from "lucide-react";
import type { Category, Resource } from "@knowhere/shared";
import { useData } from "../contexts/DataContext";
import { VaultPinInput } from "./VaultPinInput";
import { DetailMediaPreview } from "./ResourceMediaPreview";
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
  if (!resource.downloadUrl || (resource.type !== "image" && resource.type !== "pdf")) return null;
  const label = resource.type === "pdf" ? "PDF" : "image";

  return <div className="detail-attachment-bar">
    <a className="button secondary" href={resource.downloadUrl} target="_blank" rel="noreferrer">
      Open {label} <ExternalLink size={15} />
    </a>
    <a className="button secondary" href={resource.downloadUrl} download={resource.fileName ?? undefined}>
      <Download size={15} /> Download
    </a>
  </div>;
}

function DetailEditor({ resource, categories, onClose }: { resource: Resource; categories: Category[]; onClose: () => void }) {
  const { updateResource, profile, refresh } = useData();
  const [description, setDescription] = useState(resource.description ?? "");
  const [saved, setSaved] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [setupPin, setSetupPin] = useState("");
  const [setupPinError, setSetupPinError] = useState("");

  useEffect(() => {
    setDescription(resource.description ?? "");
  }, [resource.id, resource.description]);

  const persist = async () => {
    if (description === resource.description) return;
    await updateResource(resource.id, { description });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
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
    <p className="eyebrow hud-meta">{resource.metadata?.siteName ?? resource.type}</p>
    <h2 id="detail-title">{resourceDisplayTitle(resource)}</h2>
    {resource.noteBody && <div className="note-body">{resource.noteBody}</div>}
    <label className="field">
      <span>Why this matters</span>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)}
        onBlur={persist} rows={4} />
      {saved && <small className="saved">Saved</small>}
    </label>
    <label className="field">
      <span>Cluster</span>
      <select value={resource.categoryId}
        onChange={(e) => updateResource(resource.id, { categoryId: e.target.value })}>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select>
    </label>
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
      </dl>
    </details>
  </>;
}

export function ResourceDetail({ resource, categories, onClose }: { resource: Resource | null; categories: Category[]; onClose: () => void }) {
  return <AnimatePresence>{resource && <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.section className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title"
      initial={{ x: 32, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 32, opacity: 0 }}>
      <header>
        <span className="type-badge">{resource.type}</span>
        <div className="detail-actions">
          {resource.url && <a className="button secondary" href={resource.url} target="_blank" rel="noreferrer">Open original <ExternalLink size={15} /></a>}
          <button className="icon-button" onClick={onClose} aria-label="Close"><X /></button>
        </div>
      </header>

      <div className="detail-scroll">
        <DetailMedia resource={resource} />
        <AttachmentActions resource={resource} />
        <div className="detail-content">
          <DetailEditor resource={resource} categories={categories} onClose={onClose} />
        </div>
      </div>
    </motion.section>
  </motion.div>}</AnimatePresence>;
}
