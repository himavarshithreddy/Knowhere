import { motion } from "framer-motion";
import { Archive, ExternalLink, FileText, Heart, Image, Link2, MoreHorizontal, NotebookPen, RotateCcw, Trash2 } from "lucide-react";
import type { Category, Resource } from "@knowhere/shared";
import { ResourceMediaPreview } from "./ResourceMediaPreview";
import { isSocialPostUrl, resourcePreviewUrl } from "../lib/preview";
import { relativeDate, resourceDisplayTitle } from "../lib/utils";

const icons = { link: Link2, note: NotebookPen, image: Image, pdf: FileText };
const typeLabels = { link: "Link", note: "Note", image: "Image", pdf: "Pdf" };

export function ResourceCard({ resource, category, view, mode, onOpen, onAction }: {
  resource: Resource; category?: Category; view: "grid" | "list" | "detail"; mode: string;
  onOpen: () => void; onAction: (action: string) => void;
}) {
  const Icon = icons[resource.type];
  const previewUrl = resourcePreviewUrl(resource);
  const social = Boolean(resource.url && isSocialPostUrl(resource.url));
  const mediaClass = [
    "resource-media",
    social ? "resource-media-social" : "",
    resource.type === "pdf" ? "resource-media-pdf" : ""
  ].filter(Boolean).join(" ");

  return <motion.article layout className={`resource-card ${view}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: .96 }} onClick={onOpen} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen()}>
    <div className={mediaClass}>
      <ResourceMediaPreview resource={resource} previewUrl={previewUrl} />
      <span className="type-badge"><Icon size={13} /> {typeLabels[resource.type]}</span>
    </div>
    <div className="resource-copy">
      <div className="resource-topline"><span className="hud-meta">{category?.name ?? "General"}</span><span className="hud-meta">{relativeDate(resource.createdAt)}</span></div>
      <h3>{resourceDisplayTitle(resource)}</h3>
      <p className={view === "detail" ? "resource-description-full" : undefined}>{resource.description}</p>
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
          <button aria-label="More options"><MoreHorizontal /></button>
        </>}
      </div>
    </div>
  </motion.article>;
}
