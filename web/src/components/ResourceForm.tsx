import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Image, Link2, LoaderCircle, NotebookPen, Plus, X } from "lucide-react";
import { allowedUploadTypes, MAX_UPLOAD_BYTES, type ExtractedMetadata, type ResourceType } from "@knowhere/shared";
import { api } from "../lib/api";
import { useData } from "../contexts/DataContext";
import { BrandMark } from "./BrandMark";
import { metadataPreviewImage, metadataPreviewText, isSocialPostUrl } from "../lib/preview";
import { ResourceMediaPreview } from "./ResourceMediaPreview";

type Props = { open: boolean; onClose: () => void; initialCategory?: string };
type PreviewStatus = "idle" | "loading" | "ready" | "error";

const options: { type: ResourceType; label: string; icon: typeof Link2 }[] = [
  { type: "link", label: "Link", icon: Link2 },
  { type: "note", label: "Note", icon: NotebookPen },
  { type: "image", label: "Image", icon: Image },
  { type: "pdf", label: "PDF", icon: FileText }
];

const isValidUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const deriveTitle = (type: ResourceType, metadata: ExtractedMetadata | undefined, body: string, description: string, file: File | null) => {
  if (type === "link") return metadata?.title?.trim() ?? "";
  if (type === "note") {
    const line = body.trim().split("\n").find((entry) => entry.trim());
    return line?.trim().slice(0, 500) ?? description.trim().slice(0, 120);
  }
  if (file) return file.name.replace(/\.[^.]+$/, "");
  return "";
};

export function ResourceForm({ open, onClose, initialCategory }: Props) {
  const { categories, resources, profile, saveResource, addCategory, uploadProgress } = useData();
  const [type, setType] = useState<ResourceType>("link");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<ExtractedMetadata>();
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle");
  const [previewedUrl, setPreviewedUrl] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [error, setError] = useState("");
  const urlRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const previewToken = useRef(0);
  const fetchedTitle = type === "link" && metadata?.title?.trim() ? metadata.title.trim() : "";
  const linkPreviewImage = type === "link" ? metadataPreviewImage(metadata, url.trim()) : undefined;
  const linkPreviewText = type === "link" ? metadataPreviewText(metadata, url.trim()) : undefined;
  const filePreviewUrl = file && (type === "image" || type === "pdf")
    ? URL.createObjectURL(file)
    : null;

  useEffect(() => {
    if (!filePreviewUrl) return;
    return () => URL.revokeObjectURL(filePreviewUrl);
  }, [filePreviewUrl]);

  useEffect(() => {
    if (open) {
      setCategoryId(initialCategory ?? profile?.preferences.lastCategoryId ?? categories[0]?.id ?? "");
      setTimeout(() => (type === "link" ? urlRef : noteRef).current?.focus(), 100);
    }
  }, [open, initialCategory, profile?.preferences.lastCategoryId, type]);

  useEffect(() => {
    if (open && !categoryId && categories[0]) {
      setCategoryId(initialCategory ?? profile?.preferences.lastCategoryId ?? categories[0].id);
    }
  }, [open, categoryId, categories, initialCategory, profile?.preferences.lastCategoryId]);

  useEffect(() => {
    if (!open) {
      setType("link"); setUrl(""); setBody(""); setDescription("");
      setFile(null); setMetadata(undefined); setPreviewStatus("idle"); setPreviewedUrl("");
      setError(""); setStatus("idle"); setCategoryName(""); setCreatingCategory(false);
      previewToken.current += 1;
    }
  }, [open]);

  useEffect(() => {
    if (!open || type !== "link") return;
    const trimmed = url.trim();
    if (!trimmed || !isValidUrl(trimmed)) {
      setMetadata(undefined);
      setPreviewStatus("idle");
      setPreviewedUrl("");
      return;
    }

    setPreviewStatus("loading");
    const token = ++previewToken.current;
    const timer = window.setTimeout(() => {
      void api.extractMetadata(trimmed)
        .then((result) => {
          if (previewToken.current !== token) return;
          setMetadata(result);
          setPreviewedUrl(trimmed);
          setPreviewStatus("ready");
        })
        .catch(() => {
          if (previewToken.current !== token) return;
          setMetadata(undefined);
          setPreviewedUrl(trimmed);
          setPreviewStatus("error");
        });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [open, type, url]);

  const selectFile = (selected?: File) => {
    if (!selected) return;
    if (!allowedUploadTypes.includes(selected.type as typeof allowedUploadTypes[number])) {
      setError("Choose a JPEG, PNG, WebP, GIF, or PDF file."); return;
    }
    if (selected.size > MAX_UPLOAD_BYTES) { setError("Files must be 25 MB or smaller."); return; }
    const nextType = selected.type === "application/pdf" ? "pdf" : "image";
    setType(nextType); setFile(selected); setError("");
  };

  const createCategory = async () => {
    const name = categoryName.trim();
    if (!name || creatingCategory) return;
    setCreatingCategory(true);
    setError("");
    try {
      setCategoryId(await addCategory(name));
      setCategoryName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create cluster.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!description.trim() || !categoryId) {
      setError("Add a description and cluster."); return;
    }
    if (type === "link" && !url.trim()) { setError("Add a URL."); return; }
    if (type === "link") {
      const duplicate = resources.find((resource) => resource.type === "link" && resource.url === url);
      if (duplicate && !confirm(duplicate.deletedAt
        ? "This URL is already in Trash. Save another copy?"
        : "You already saved this URL. Save another copy?")) return;
    }
    if ((type === "image" || type === "pdf") && !file) { setError("Choose a file."); return; }
    if (type === "note" && !body.trim()) { setError("Write your note."); return; }

    const trimmedUrl = url.trim();
    const metadataReady = type === "link" && previewedUrl === trimmedUrl && previewStatus === "ready";
    const enrichMetadataInBackground = type === "link" && Boolean(trimmedUrl) &&
      (previewStatus === "loading" || previewedUrl !== trimmedUrl || previewStatus === "error");

    setStatus("saving"); setError("");
    try {
      await saveResource({
        type,
        title: deriveTitle(type, metadataReady ? metadata : undefined, body, description, file),
        description: description.trim(),
        categoryId,
        url: type === "link" ? trimmedUrl : undefined,
        noteBody: type === "note" ? body : undefined,
        file: file ?? undefined,
        metadata: metadataReady ? metadata : undefined,
        enrichMetadataInBackground
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Your entries are still here.");
      setStatus("idle");
    }
  };

  return <AnimatePresence>
    {open && <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.form className="resource-form" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="save-title"
        initial={{ opacity: 0, y: 32, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24 }}
        transition={{ duration: .2 }}>
        <header>
          <div><p className="eyebrow">New entry</p><h2 id="save-title">Save to <BrandMark /></h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X /></button>
        </header>
        <div className="type-switch tabs" aria-label="Resource type">
          {options.map(({ type: option, label, icon: Icon }) =>
            <button key={option} type="button" className={type === option ? "active" : ""} onClick={() => setType(option)}>
              <Icon size={16} /> {label}
            </button>)}
        </div>
        <div className="form-scroll">
          {type === "link" && <div className="field"><label htmlFor="resource-url">URL</label>
            <div className="input-action url-field">
              <input id="resource-url" ref={urlRef} type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article" required />
              {previewStatus === "loading" && <span className="url-preview-status" aria-live="polite">
                <LoaderCircle className="spin" size={16} /> Fetching title
              </span>}
            </div>
          </div>}
          {(type === "image" || type === "pdf") && <label className="file-drop">
            <input type="file" accept={type === "pdf" ? "application/pdf" : "image/jpeg,image/png,image/webp,image/gif"}
              onChange={(e) => selectFile(e.target.files?.[0])} />
            {file ? <><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(1)} MB · tap to replace</span></>
              : <><Plus /><strong>Choose {type === "pdf" ? "a PDF" : "an image"}</strong><span>Maximum 25 MB</span></>}
          </label>}
          {(type === "image" || type === "pdf") && file && filePreviewUrl && <div className={`file-preview preview-card${type === "pdf" ? " preview-card-pdf" : ""}`}>
            {type === "image"
              ? <img src={filePreviewUrl} alt={file.name} />
              : <ResourceMediaPreview resource={{
                id: "draft", ownerId: "", type: "pdf", title: file.name.replace(/\.pdf$/i, ""),
                description: "", categoryId: "", fileName: file.name, favorite: false, archived: false,
                deletedAt: null, createdAt: "", updatedAt: ""
              }} />}
          </div>}
          {type === "note" && <div className="field"><label htmlFor="note-body">Note</label>
            <textarea id="note-body" ref={noteRef} value={body} onChange={(e) => setBody(e.target.value)} rows={8}
              placeholder="Write what you want to remember..." required /></div>}
          {type === "link" && fetchedTitle && <div className="field fetched-title-field">
            <span>Title</span>
            <p className="fetched-title">{fetchedTitle}</p>
          </div>}
          {metadata && type === "link" && previewStatus === "ready" && <div className={`preview-card preview-card-link${linkPreviewText && isSocialPostUrl(url.trim()) ? " preview-card-social" : ""}`}>
            <div className={`preview-card-media${linkPreviewImage ? "" : " preview-card-media-text"}`}>
              {linkPreviewImage
                ? <img src={linkPreviewImage} alt="" />
                : linkPreviewText
                  ? <p className="preview-quote">{linkPreviewText}</p>
                  : null}
            </div>
            <div className="preview-card-copy">
              <span>{metadata.siteName}</span>
              <strong>{metadata.title}</strong>
            </div>
          </div>}
          <div className="field"><label htmlFor="resource-description">Why does this belong in your archive?</label>
            <textarea id="resource-description" value={description} onChange={(e) => setDescription(e.target.value)}
              rows={4} placeholder="Context for future retrieval" required /></div>
          <div className="field"><label htmlFor="resource-category">Cluster</label>
            <select id="resource-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="">Choose a cluster</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <div className="inline-create">
              <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="New cluster"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void createCategory(); } }} />
              <button type="button" onClick={() => void createCategory()} disabled={creatingCategory || !categoryName.trim()}>
                {creatingCategory ? <LoaderCircle className="spin" size={16} /> : "Create"}
              </button>
            </div>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {uploadProgress > 0 && <div className="progress"><span style={{ width: `${uploadProgress}%` }} /></div>}
        </div>
        <footer><button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button primary" disabled={status === "saving"}>
            {status === "saving" ? <><LoaderCircle className="spin" size={17} /> Saving</> : "Log discovery"}
          </button></footer>
      </motion.form>
    </motion.div>}
  </AnimatePresence>;
}
