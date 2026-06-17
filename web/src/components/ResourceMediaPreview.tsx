import { FileText, Link2, NotebookPen } from "lucide-react";
import type { Resource } from "@knowhere/shared";
import {
  isLinkedInPostUrl,
  isSocialPostUrl,
  isXStatusUrl,
  metadataPreviewImage,
  resourcePreviewText
} from "../lib/preview";
import { resourceDisplayTitle } from "../lib/utils";

function PdfVisual({ name }: { name?: string }) {
  return <div className="pdf-visual" aria-hidden="true">
    <div className="pdf-visual-page">
      <span className="pdf-visual-line" />
      <span className="pdf-visual-line short" />
      <span className="pdf-visual-line" />
      <span className="pdf-visual-line short" />
    </div>
    {name && <span className="pdf-visual-name">{name}</span>}
  </div>;
}

function SocialVisual({ resource, text }: { resource: Resource; text: string }) {
  const label = isXStatusUrl(resource.url) ? "X" : isLinkedInPostUrl(resource.url) ? "LinkedIn" : resource.metadata?.siteName;
  return <div className="resource-social-preview">
    {label && <span className="resource-social-label">{label}</span>}
    <p>{text}</p>
    {resource.metadata?.author && <span className="resource-social-author">{resource.metadata.author}</span>}
  </div>;
}

export function ResourceMediaPreview({ resource, previewUrl }: { resource: Resource; previewUrl?: string }) {
  const previewText = !previewUrl ? resourcePreviewText(resource) : undefined;
  const social = Boolean(resource.url && isSocialPostUrl(resource.url) && previewText);
  const title = resourceDisplayTitle(resource);

  if (resource.type === "pdf") {
    return <PdfVisual name={resource.fileName?.replace(/\.pdf$/i, "") ?? title} />;
  }

  if (previewUrl && !social) {
    return <img src={previewUrl} alt={title} loading="lazy" width="400" height="300" />;
  }

  if (social && previewText) {
    return <SocialVisual resource={resource} text={previewText} />;
  }

  if (previewText) {
    return <p className="resource-media-quote">{previewText}</p>;
  }

  if (resource.type === "note") return <NotebookPen size={30} strokeWidth={1.5} />;
  if (resource.type === "link") return <Link2 size={30} strokeWidth={1.5} />;
  return <FileText size={30} strokeWidth={1.5} />;
}

export function DetailMediaPreview({ resource }: { resource: Resource }) {
  const previewUrl = resource.type === "image"
    ? resource.downloadUrl
    : metadataPreviewImage(resource.metadata, resource.url);
  const previewText = resourcePreviewText(resource);

  if (resource.type === "pdf" && resource.downloadUrl) {
    return <div className="detail-media detail-media-pdf">
      <object
        key={resource.id}
        className="pdf-preview"
        data={`${resource.downloadUrl}#view=FitH`}
        type="application/pdf"
        title={resourceDisplayTitle(resource)}
      >
        <div className="pdf-fallback">
          <PdfVisual name={resource.fileName ?? resourceDisplayTitle(resource)} />
          <a className="button primary" href={resource.downloadUrl} target="_blank" rel="noreferrer">Open PDF</a>
        </div>
      </object>
    </div>;
  }

  if (resource.type === "image" && resource.downloadUrl) {
    return <div className="detail-media">
      <a href={resource.downloadUrl} target="_blank" rel="noreferrer" className="detail-image-link">
        <img className="detail-image" src={resource.downloadUrl} alt={resourceDisplayTitle(resource)} width="800" height="600" />
      </a>
    </div>;
  }

  if (previewUrl && !(resource.url && isSocialPostUrl(resource.url))) {
    return <div className="detail-media">
      <img className="detail-image" src={previewUrl} alt={resourceDisplayTitle(resource)} width="800" height="600" />
    </div>;
  }

  if (previewText && resource.url && isSocialPostUrl(resource.url)) {
    return <div className="detail-media detail-media-quote detail-media-social">
      <ResourceMediaPreview resource={resource} />
    </div>;
  }

  if (previewText) {
    return <div className="detail-media detail-media-quote">
      <p className="preview-quote">{previewText}</p>
    </div>;
  }

  return null;
}
