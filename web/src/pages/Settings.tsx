import { useState } from "react";
import { Download, GripVertical, Moon, Plus, Trash2, UserRound } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { SignOutButton } from "../components/SignOutButton";
import { WorkspaceHeaderActions } from "../components/WorkspaceHeaderActions";
import { WorkspaceHeaderMeta } from "../components/WorkspaceHeaderMeta";
import { LogoPreviewModal } from "../components/LogoPreviewModal";
import { useTheme } from "../contexts/ThemeContext";
import { usePageSeo } from "../hooks/usePageSeo";
import { SEO } from "../lib/seo";

export function Settings() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { categories, resources, addCategory, renameCategory, reorderCategories, removeCategory } = useData();
  const [newCategory, setNewCategory] = useState("");
  const [message, setMessage] = useState("");
  const [logoPreviewOpen, setLogoPreviewOpen] = useState(false);

  usePageSeo({
    title: SEO.settings.title,
    description: SEO.settings.description,
    path: "/settings",
    robots: SEO.settings.robots
  });

  const exportData = async (format: "json" | "csv") => {
    setMessage("Preparing export...");
    try {
      const result = await api.exportLibrary(format);
      const blob = new Blob([result.content], { type: format === "json" ? "application/json" : "text/csv" });
      const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(blob);
      anchor.download = `knowhere-export-${new Date().toISOString().slice(0,10)}.${format}`; anchor.click();
      URL.revokeObjectURL(anchor.href); setMessage("Export downloaded.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Export failed."); }
  };

  return <main className="workspace settings-page">
    <header className="workspace-header">
      <div className="workspace-header-main">
        <WorkspaceHeaderMeta eyebrow="Preferences and data" />
        <h1>Settings</h1>
      </div>
      <WorkspaceHeaderActions />
    </header>
    <section className="settings-section"><div className="settings-heading"><UserRound /><div><h2>Account</h2><p>Your identity and your Knowhere collection.</p></div></div>
      <div className="account-row">{user?.photoURL ? <img src={user.photoURL} alt="" /> : <div className="avatar">{user?.displayName?.[0]}</div>}
        <div><strong>{user?.displayName}</strong><span>{user?.email}</span></div>
        {user?.authProvider === "google"
          ? <span className="verified">Google verified</span>
          : <span className="verified coords">Coords account</span>}
      </div>
      <div className="settings-actions"><SignOutButton />
        <button className="button danger" onClick={async () => {
          if (!confirm("Delete your account and every saved resource? This cannot be undone.")) return;
          await api.deleteAccount();
          window.location.href = "/";
        }}><Trash2 /> Delete account</button></div>
    </section>
    <section className="settings-section"><div className="settings-heading"><GripVertical /><div><h2>Clusters</h2><p>Create, rename, reorder, and manage your clusters.</p></div></div>
      <div className="category-create"><input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New cluster name" />
        <button className="button primary" onClick={async () => { if (newCategory.trim()) { await addCategory(newCategory); setNewCategory(""); } }}><Plus /> Create</button></div>
      <div className="category-list">{categories.map((category, index) => <div className="category-row" key={category.id}>
        <GripVertical className="drag-icon" />
        <input defaultValue={category.name} disabled={category.isDefault} onBlur={(e) => e.target.value !== category.name && renameCategory(category.id, e.target.value)} />
        <span className="hud-meta">{resources.filter((resource) => resource.categoryId === category.id).length} discoveries</span>
        <div className="reorder-buttons"><button disabled={index === 0} onClick={() => {
          const next = [...categories]; [next[index-1], next[index]] = [next[index], next[index-1]]; reorderCategories(next);
        }}>↑</button><button disabled={index === categories.length-1} onClick={() => {
          const next = [...categories]; [next[index+1], next[index]] = [next[index], next[index+1]]; reorderCategories(next);
        }}>↓</button></div>
        {!category.isDefault && <button className="icon-button danger-text" aria-label={`Delete ${category.name}`} onClick={async () => {
          const general = categories.find((item) => item.isDefault);
          if (general && confirm(`Delete ${category.name}? Its resources will move to General.`)) await removeCategory(category.id, general.id);
        }}><Trash2 /></button>}
      </div>)}</div>
    </section>
    <section className="settings-section"><div className="settings-heading"><Moon /><div><h2>Appearance</h2><p>Theme and brand assets.</p></div></div>
      <div className="setting-row"><div><strong>{theme === "dark" ? "Dark mode" : "Light mode"}</strong><span>Use the toggle in the page header to switch themes.</span></div></div>
      <div className="setting-row"><div><strong>Logo preview</strong><span>Full-screen mark for capturing a PNG favicon.</span></div>
        <button type="button" className="button secondary" onClick={() => setLogoPreviewOpen(true)}>Preview logo</button></div>
    </section>
    <section className="settings-section"><div className="settings-heading"><Download /><div><h2>Export</h2><p>Download a portable copy of your full collection.</p></div></div>
      <div className="setting-row"><div><strong>{resources.length} discoveries</strong><span>Includes clusters, metadata, notes, and file references.</span></div>
        <div className="settings-actions"><button className="button secondary" onClick={() => exportData("json")}>Export JSON</button>
          <button className="button secondary" onClick={() => exportData("csv")}>Export CSV</button></div></div>
      {message && <p className="status-message" role="status">{message}</p>}
    </section>
    <LogoPreviewModal open={logoPreviewOpen} onClose={() => setLogoPreviewOpen(false)} />
  </main>;
}
