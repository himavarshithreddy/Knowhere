import { BrandMark } from "./BrandMark";

export function LogoPreviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return <div className="logo-preview-backdrop" role="dialog" aria-modal="true" aria-label="Logo preview for PNG export">
    <button type="button" className="button secondary logo-preview-close" onClick={onClose}>Close preview</button>
    <div className="logo-preview-grid">
      <div className="logo-preview-panel light" aria-hidden="true">
        <BrandMark compact className="logo-preview-mark" />
      </div>
      <div className="logo-preview-panel dark" aria-hidden="true">
        <BrandMark compact className="logo-preview-mark" />
      </div>
    </div>
    <p className="logo-preview-hint">Screenshot each panel to save light and dark PNG favicons.</p>
  </div>;
}
