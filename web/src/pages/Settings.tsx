import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing, Download, GripVertical, Lock, Moon, Plus, Trash2, UserRound } from "lucide-react";
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
  const { profile, categories, resources, addCategory, renameCategory, reorderCategories, removeCategory, refresh } = useData();
  const [newCategory, setNewCategory] = useState("");
  const [message, setMessage] = useState("");
  const [logoPreviewOpen, setLogoPreviewOpen] = useState(false);
  const navigate = useNavigate();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string; onConfirm: () => void; confirmLabel: string; danger?: boolean;
  }>({ open: false, title: "", description: "", onConfirm: () => {}, confirmLabel: "" });

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushStatus, setPushStatus] = useState("");

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          reg.pushManager.getSubscription().then(sub => {
            setPushEnabled(!!sub);
          });
        }
      });
    }
  }, []);

  const togglePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus("Push notifications are not supported in this browser.");
      return;
    }
    setPushStatus("Processing...");
    try {
      const reg = await navigator.serviceWorker.ready;
      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await api.unsubscribePush(sub.endpoint);
        }
        setPushEnabled(false);
        setPushStatus("Notifications disabled.");
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setPushStatus("Permission denied.");
          return;
        }
        const { publicKey } = await api.getVapidPublicKey();
        const padding = '='.repeat((4 - publicKey.length % 4) % 4);
        const base64 = (publicKey + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: outputArray
        });
        await api.subscribePush(sub);
        setPushEnabled(true);
        setPushStatus("Notifications enabled!");
      }
    } catch (err: any) {
      setPushStatus("Error: " + err.message);
    }
  };

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

  return <main id="main-content" className="workspace settings-page">
    <header className="workspace-header">
      <div className="workspace-header-main">
        <WorkspaceHeaderMeta eyebrow="Preferences and data" />
        <h1>Settings</h1>
      </div>
      <WorkspaceHeaderActions />
    </header>
    <section className="settings-section"><div className="settings-heading"><UserRound /><div><h2>Account</h2><p>Your identity and your Knowhere collection.</p></div></div>
      <div className="account-row">{user?.photoURL ? <img src={user.photoURL} alt={`${user.displayName}'s avatar`} width="40" height="40" /> : <div className="avatar">{user?.displayName?.[0]}</div>}
        <div><strong>{user?.displayName}</strong><span>{user?.email}</span></div>
        {user?.authProvider === "google"
          ? <span className="verified">Google verified</span>
          : <span className="verified coords">Coords account</span>}
      </div>
      <div className="settings-actions"><SignOutButton />
        <button className="button danger" onClick={() => {
          setConfirmDialog({
            open: true,
            title: "Delete Account",
            description: "Delete your account and every saved resource? This cannot be undone.",
            confirmLabel: "Delete account",
            danger: true,
            onConfirm: async () => {
              setConfirmDialog(prev => ({ ...prev, open: false }));
              await api.deleteAccount();
              navigate("/");
            }
          });
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
        {!category.isDefault && <button className="icon-button danger-text" aria-label={`Delete ${category.name}`} onClick={() => {
          const general = categories.find((item) => item.isDefault);
          if (general) {
            setConfirmDialog({
              open: true,
              title: `Delete ${category.name}`,
              description: `Are you sure? Its resources will move to General.`,
              confirmLabel: "Delete cluster",
              danger: true,
              onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, open: false }));
                await removeCategory(category.id, general.id);
              }
            });
          }
        }}><Trash2 /></button>}
      </div>)}</div>
    </section>
    <section className="settings-section"><div className="settings-heading"><Moon /><div><h2>Appearance</h2><p>Theme and brand assets.</p></div></div>
      <div className="setting-row"><div><strong>{theme === "dark" ? "Dark mode" : "Light mode"}</strong><span>Use the toggle in the page header to switch themes.</span></div></div>
      <div className="setting-row"><div><strong>Logo preview</strong><span>Full-screen mark for capturing a PNG favicon.</span></div>
        <button type="button" className="button secondary" onClick={() => setLogoPreviewOpen(true)}>Preview logo</button></div>
    </section>
    <section className="settings-section">
      <div className="settings-heading">
        <BellRing 
          style={{ cursor: pushEnabled ? "pointer" : "default" }}
          onClick={async () => {
            if (!pushEnabled) return;
            try {
              setPushStatus("Sending test...");
              await api.sendTestPush();
              setPushStatus("Test notification sent!");
            } catch (e: any) {
              setPushStatus("Error: " + e.message);
            }
          }}
        />
        <div>
          <h2>Notifications</h2>
          <p>Passive reminders for your vault.</p>
        </div>
      </div>
      <div className="setting-row">
        <div><strong>Push Notifications</strong><span>Receive daily reminders for forgotten items and overdue missions.</span></div>
        <button className={`button ${pushEnabled ? 'danger' : 'primary'}`} onClick={togglePush}>
          {pushEnabled ? 'Disable' : 'Enable'}
        </button>
      </div>
      {pushStatus && <p className="status-message" role="status" style={{fontSize: '13px', color: 'var(--muted)', marginTop: '8px'}}>{pushStatus}</p>}
    </section>
    <section className="settings-section"><div className="settings-heading"><Lock /><div><h2>Vault</h2><p>Manage your classified discoveries.</p></div></div>
      <div className="setting-row"><div><strong>Reset Vault PIN</strong><span>Permanently deletes all your locked discoveries. This cannot be undone.</span></div>
        <button className="button danger" disabled={!profile?.hasVaultPin} onClick={() => {
          setConfirmDialog({
            open: true,
            title: "Reset Vault PIN",
            description: "Are you absolutely sure? This will PERMANENTLY DELETE all your locked discoveries and reset your Vault PIN. This cannot be undone.",
            confirmLabel: "Reset Vault",
            danger: true,
            onConfirm: async () => {
              setConfirmDialog(p => ({ ...p, open: false }));
              await api.resetVault();
              await refresh();
            }
          });
        }}>Reset PIN</button></div>
    </section>
    <section className="settings-section"><div className="settings-heading"><Download /><div><h2>Export</h2><p>Download a portable copy of your full collection.</p></div></div>
      <div className="setting-row"><div><strong>{resources.length} discoveries</strong><span>Includes clusters, metadata, notes, and file references.</span></div>
        <div className="settings-actions"><button className="button secondary" onClick={() => exportData("json")}>Export JSON</button>
          <button className="button secondary" onClick={() => exportData("csv")}>Export CSV</button></div></div>
      {message && <p className="status-message" role="status">{message}</p>}
    </section>
    <LogoPreviewModal open={logoPreviewOpen} onClose={() => setLogoPreviewOpen(false)} />

    {confirmDialog.open && (
      <div className="modal-overlay" onClick={() => setConfirmDialog(p => ({ ...p, open: false }))} style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(6.8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'}}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{background: 'var(--surface)', padding: '24px', borderRadius: '16px', maxWidth: '400px', width: '100%', border: '1px solid var(--line)', boxShadow: 'var(--shadow)'}}>
          <h3 style={{margin: '0 0 8px 0'}}>{confirmDialog.title}</h3>
          <p style={{margin: '0 0 24px 0', color: 'var(--muted)', fontSize: '14px', lineHeight: '1.5'}}>{confirmDialog.description}</p>
          <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
            <button className="button secondary" onClick={() => setConfirmDialog(p => ({ ...p, open: false }))}>Cancel</button>
            <button className={`button ${confirmDialog.danger ? 'danger' : 'primary'}`} onClick={confirmDialog.onConfirm}>{confirmDialog.confirmLabel}</button>
          </div>
        </div>
      </div>
    )}
  </main>;
}
