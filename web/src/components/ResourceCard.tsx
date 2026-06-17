import { motion } from "framer-motion";
import { useState } from "react";
import { Archive, ExternalLink, FileText, Heart, Image, Link2, LoaderCircle, Lock, MoreHorizontal, NotebookPen, RotateCcw, Trash2, X } from "lucide-react";
import type { Category, Resource } from "@knowhere/shared";
import { ResourceMediaPreview } from "./ResourceMediaPreview";
import { isSocialPostUrl, resourcePreviewUrl } from "../lib/preview";
import { api } from "../lib/api";
import { relativeDate, resourceDisplayTitle } from "../lib/utils";

const icons = { link: Link2, note: NotebookPen, image: Image, pdf: FileText };
const typeLabels = { link: "Link", note: "Note", image: "Image", pdf: "Pdf" };

export function ResourceCard({ resource, category, view, mode, onOpen, onAction }: {
  resource: Resource; category?: Category; view: "grid" | "list" | "detail"; mode: string;
  onOpen: () => void; onAction: (action: string) => void;
}) {
  const [pinPrompt, setPinPrompt] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleClick = () => {
    if (resource.locked) setPinPrompt(true);
    else onOpen();
  };

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pin.length !== 4) { setPinError("PIN must be 4 digits."); return; }
    setVerifying(true); setPinError("");
    try {
      await api.verifyVault(pin);
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

  if (resource.locked && pinPrompt) {
    return <motion.article className={`resource-card ${view} vault-locked`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "24px", background: "var(--bg-card)", border: "1px solid var(--border)", position: "relative" }}>
       <button className="icon-button" style={{ position: "absolute", top: "8px", right: "8px" }} onClick={(e) => { e.stopPropagation(); setPinPrompt(false); setPin(""); setPinError(""); }}><X size={16}/></button>
       <Lock size={24} style={{ marginBottom: "16px", color: "var(--text-muted)" }} />
       <h3 style={{ marginBottom: "16px", textAlign: "center" }}>Vault Locked</h3>
       <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }} onClick={e => e.stopPropagation()}>
         <input type="password" maxLength={4} autoFocus placeholder="PIN" value={pin} onChange={e => setPin(e.target.value)} style={{ width: "80px", textAlign: "center", letterSpacing: "4px", background: "var(--bg-input)", color: "var(--text-main)", border: "1px solid var(--border)", borderRadius: "6px", padding: "6px" }} />
         <button type="submit" className="button primary" disabled={verifying}>{verifying ? <LoaderCircle className="spin" size={16}/> : "Unlock"}</button>
         {pinError && <p className="form-error" style={{ margin: 0, fontSize: "12px" }}>{pinError}</p>}
       </form>
    </motion.article>;
  }

  return <motion.article className={`resource-card ${view}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
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
      <div className="resource-topline"><span className="hud-meta">{category?.name ?? "General"}</span><span className="hud-meta">{relativeDate(resource.createdAt)}</span></div>
      <h3>{resource.locked ? "Encrypted Discovery" : resourceDisplayTitle(resource)}</h3>
      <p className={view === "detail" ? "resource-description-full" : undefined}>{resource.locked ? "Classified. Requires Vault PIN to access." : resource.description}</p>
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
  </motion.article>;
}
