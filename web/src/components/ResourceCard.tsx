import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Archive, ExternalLink, FileText, Heart, Image, Link2, LoaderCircle, Lock, MoreHorizontal, NotebookPen, RotateCcw, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Category, Resource } from "@knowhere/shared";
import { ResourceMediaPreview } from "./ResourceMediaPreview";
import { VaultPinInput } from "./VaultPinInput";
import { IntentBadge } from "./IntentBadge";
import { isSocialPostUrl, resourcePreviewUrl } from "../lib/preview";
import { api } from "../lib/api";
import { relativeDate, resourceDisplayTitle } from "../lib/utils";

const icons = { link: Link2, note: NotebookPen, image: Image, pdf: FileText };
const typeLabels = { link: "Link", note: "Note", image: "Image", pdf: "Pdf" };

export function ResourceCard({ resource, category, view, mode, onOpen, onAction }: {
  resource: Resource; category?: Category; view: "grid" | "list" | "detail"; mode: string;
  onOpen: () => void; onAction: (action: string) => void;
}) {
  const navigate = useNavigate();
  const [pinPrompt, setPinPrompt] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleClick = () => {
    if (resource.locked) setPinPrompt(true);
    else onOpen();
  };

  const handleVerify = async (completedPin?: string) => {
    const finalPin = completedPin || pin;
    if (finalPin.length !== 4) { setPinError("PIN must be 4 digits."); return; }
    setVerifying(true); setPinError("");
    try {
      await api.verifyVault(finalPin);
      setPinPrompt(false);
      setPin("");
      onOpen();
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "Incorrect PIN.");
    } finally {
      setVerifying(false);
    }
  };

  const Icon = icons[resource.type];
  const previewUrl = resourcePreviewUrl(resource);
  const social = Boolean(resource.url && isSocialPostUrl(resource.url));
  const mediaClass = [
    "resource-media",
    social ? "resource-media-social" : "",
    resource.type === "pdf" ? "resource-media-pdf" : ""
  ].filter(Boolean).join(" ");

  return <>
    <AnimatePresence>
      {resource.locked && pinPrompt && (
        <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 100 }} onClick={() => { setPinPrompt(false); setPin(""); setPinError(""); }}>
          <motion.section className="detail-panel vault-modal" role="dialog" onClick={e => e.stopPropagation()} initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}>
            <button className="icon-button" style={{ position: "absolute", top: "12px", right: "12px" }} onClick={() => { setPinPrompt(false); setPin(""); setPinError(""); }}><X size={16}/></button>
            <div style={{ textAlign: "center" }}>
              <Lock size={32} style={{ margin: "0 auto 16px", color: "var(--accent)" }} />
              <h3 style={{ margin: 0, fontSize: "20px" }}>Vault Locked</h3>
              <p style={{ margin: "8px 0 0", fontSize: "14px", color: "var(--muted)" }}>Enter your 4-digit PIN to decrypt.</p>
            </div>
            
            <VaultPinInput value={pin} onChange={setPin} onComplete={handleVerify} disabled={verifying} error={!!pinError} />
            
            {verifying && <div style={{ display: "flex", justifyContent: "center", width: "100%", padding: "10px" }}><LoaderCircle className="spin" size={24} color="var(--accent)"/></div>}
            {pinError && <p className="form-error" style={{ margin: 0, textAlign: "center" }}>{pinError}</p>}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>

    <motion.article className={`resource-card ${view}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: .96 }} onClick={handleClick} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && handleClick()}
    style={resource.locked ? { borderColor: "rgba(100, 100, 255, 0.2)", position: "relative" } : undefined}>
    
    {resource.locked && <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-main)", background: "var(--bg-card)", opacity: 0.85, backdropFilter: "blur(8px)", borderRadius: "12px" }}>
      <Lock size={24} style={{ marginBottom: "8px" }}/>
      <span style={{ fontSize: "14px", fontWeight: 600 }}>Vault</span>
    </div>}

    <div className={mediaClass} style={resource.locked ? { filter: "blur(12px)", opacity: 0.3 } : undefined}>
      <ResourceMediaPreview resource={resource} previewUrl={previewUrl} />
      <span className="type-badge"><Icon size={13} /> {typeLabels[resource.type]}</span>
    </div>
    <div className="resource-copy" style={resource.locked ? { filter: "blur(6px)", opacity: 0.5, userSelect: "none" } : undefined}>
      <div className="resource-topline">
        <IntentBadge intent={resource.intentType} />
        <span className="hud-meta" style={{ marginLeft: "auto" }}>{category?.name ?? "General"}</span>
      </div>
      <h3>{resource.locked ? "Encrypted Discovery" : resourceDisplayTitle(resource)}</h3>
      <p className={view === "detail" ? "resource-description-full" : undefined}>{resource.locked ? "Classified. Requires Vault PIN to access." : resource.description}</p>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
        <span className="hud-meta" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ 
            display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", 
            backgroundColor: resource.actionStatus === "completed" ? "var(--success)" : resource.actionStatus === "in_progress" ? "var(--accent)" : "var(--muted)" 
          }} />
          {resource.actionStatus.replace("_", " ")}
        </span>
        <span className="hud-meta">{relativeDate(resource.createdAt)}</span>
      </div>

      {!resource.locked && (resource.tags ?? []).length > 0 && (
        <div className="resource-tags" onClick={e => e.stopPropagation()}>
          {(resource.tags ?? []).slice(0, 3).map(tag => (
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

      <div className="resource-actions" onClick={(e) => e.stopPropagation()}>
        {mode === "trash" ? <>
          <button onClick={() => onAction("restore")}><RotateCcw /> Restore</button>
          <button className="danger-text" onClick={() => onAction("permanent")}><Trash2 /> Delete forever</button>
        </> : <>
          <button aria-label={resource.favorite ? "Remove from favorites" : "Add to favorites"} onClick={() => onAction("favorite")}>
            <Heart fill={resource.favorite ? "currentColor" : "none"} /></button>
          <button aria-label={resource.archived ? "Unarchive" : "Archive"} onClick={() => onAction("archive")}><Archive /></button>
          {resource.url && <a href={resource.url} target="_blank" rel="noreferrer" aria-label="Open original"><ExternalLink /></a>}
          {resource.downloadUrl && (resource.type === "image" || resource.type === "pdf") && (
            <a href={resource.downloadUrl} target="_blank" rel="noreferrer" aria-label={`Open ${resource.type}`}>
              {resource.type === "pdf" ? <FileText /> : <Image />}
            </a>
          )}
          <button aria-label="Move to trash" onClick={() => onAction("trash")}><Trash2 /></button>
        </>}
      </div>
    </div>
  </motion.article>
  </>;
}
