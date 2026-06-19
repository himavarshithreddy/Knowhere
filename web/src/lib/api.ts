import type { Category, ExtractedMetadata, Resource, UserPreferences, UserProfile } from "@knowhere/shared";

export type AuthProvider = "google" | "coords" | "code";

export type AuthUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  authProvider: AuthProvider;
};

type ResourceInput = {
  type: Resource["type"];
  title?: string;
  description: string;
  categoryId: string;
  url?: string;
  noteBody?: string;
  metadata?: Resource["metadata"];
  locked?: boolean;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Request failed.");
  return body as T;
}

async function coordsEnter(coords: string, email?: string, idToken?: string) {
  const response = await fetch("/api/auth/coords/enter", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coords, email, idToken })
  });
  const body = await response.json().catch(() => ({}));
  if (body.needsEmail) return { needsEmail: true as const };
  if (!response.ok) throw new Error(body.error ?? "Request failed.");
  return { ok: true as const, created: Boolean(body.created) };
}

export const api = {
  createSession: (idToken: string) =>
    request<{ ok: boolean }>("/api/auth/session", { method: "POST", body: JSON.stringify({ idToken }) }),
  coordsEnter,
  coordsRecoverPrepare: (email: string) =>
    request<{ ok: boolean; message: string }>("/api/auth/coords/recover/prepare", { method: "POST", body: JSON.stringify({ email }) }),
  coordsRecoverComplete: (coords: string, idToken: string) =>
    request<{ ok: boolean; coords: string }>("/api/auth/coords/recover/complete", {
      method: "POST", body: JSON.stringify({ coords, idToken })
    }),
  coordsSuggestions: (count = 4) =>
    request<{ suggestions: string[] }>(`/api/auth/coords/suggestions?count=${count}`),
  getMe: () => request<{ uid: string; displayName: string; email: string; photoURL: string | null; authProvider: AuthProvider; profile: UserProfile }>("/api/auth/me"),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  getProfile: () => request<UserProfile>("/api/me"),
  updateProfile: (patch: { preferences?: Partial<UserPreferences>; onboardingComplete?: boolean }) =>
    request<UserProfile>("/api/me", { method: "PATCH", body: JSON.stringify(patch) }),

  getCategories: () => request<Category[]>("/api/categories"),
  createCategory: (name: string) => request<Category>("/api/categories", { method: "POST", body: JSON.stringify({ name }) }),
  renameCategory: (id: string, name: string) => request<Category>(`/api/categories/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  reorderCategories: (order: string[]) => request<Category[]>("/api/categories/reorder", { method: "PATCH", body: JSON.stringify({ order }) }),
  deleteCategory: (id: string, destinationId: string) =>
    request<{ ok: boolean }>(`/api/categories/${id}`, { method: "DELETE", body: JSON.stringify({ destinationId }) }),

  getResources: (filters?: { intentType?: string; actionStatus?: string }) => {
    const params = new URLSearchParams();
    if (filters?.intentType) params.append("intentType", filters.intentType);
    if (filters?.actionStatus) params.append("actionStatus", filters.actionStatus);
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<Resource[]>(`/api/resources${query}`);
  },
  createResource: (input: ResourceInput) => request<Resource>("/api/resources", { method: "POST", body: JSON.stringify(input) }),
  updateResource: (id: string, patch: Partial<Resource>) =>
    request<Resource>(`/api/resources/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteResource: (id: string) => request<{ ok: boolean }>(`/api/resources/${id}`, { method: "DELETE" }),
  recordView: (id: string) => request<{ ok: boolean; viewCount: number; lastViewedAt: string }>(`/api/resources/${id}/view`, { method: "POST" }),

  getDashboardData: () => request<{ 
    transmissions: { resource: Resource, reason: string }[], 
    activeMissions: Resource[], 
    brokenPromises: Resource[],
    opportunities: Resource[],
    weeklyRecap: {
      newSavesThisWeek: number;
      reviewedThisWeek: number;
      projectsStarted: number;
      projectsCompleted: number;
      itemsGoneDormant: number;
      topTagsThisWeek: string[];
    };
  }>("/api/rediscovery/dashboard"),

  getInterests: () => request<{ interests: { topic: string; tags: string[]; resourceCount: number; recentActivity: boolean; }[] }>("/api/interests"),
  getRelatedResources: (id: string) => request<{ related: Resource[] }>(`/api/interests/${id}/related`),
  
  getStats: () => request<{
    total: number;
    byIntent: Record<string, number>;
    byStatus: Record<string, number>;
    actionRate: number;
    completionRate: number;
    forgottenCount: number;
  }>("/api/stats"),

  extractMetadata: (url: string) => request<ExtractedMetadata>("/api/metadata/extract", { method: "POST", body: JSON.stringify({ url }) }),
  exportLibrary: (format: "json" | "csv") => request<{ format: string; content: string }>(`/api/export?format=${format}`),
  deleteAccount: () => request<{ ok: boolean }>("/api/account", { method: "DELETE" }),

  setupVault: (pin: string) => request<{ ok: boolean }>("/api/vault/setup", { method: "POST", body: JSON.stringify({ pin }) }),
  verifyVault: (pin: string) => request<{ ok: boolean }>("/api/vault/verify", { method: "POST", body: JSON.stringify({ pin }) }),
  resetVault: () => request<{ ok: boolean }>("/api/vault/reset", { method: "POST" }),

  getVapidPublicKey: () => request<{ publicKey: string }>("/api/push/public-key"),
  subscribePush: (subscription: PushSubscription) => request<{ ok: boolean }>("/api/push/subscribe", { method: "POST", body: JSON.stringify(subscription) }),
  unsubscribePush: (endpoint: string) => request<{ ok: boolean }>("/api/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint }) }),

  uploadFile(resourceId: string, file: File, onProgress: (value: number) => void) {
    return new Promise<Resource>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const form = new FormData();
      form.append("file", file);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
      };
      xhr.onload = () => {
        try {
          const body = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(body);
          else reject(new Error(body.error ?? "Upload failed."));
        } catch {
          reject(new Error("Upload failed."));
        }
      };
      xhr.onerror = () => reject(new Error("Upload failed."));
      xhr.open("POST", `/api/resources/${resourceId}/upload`);
      xhr.withCredentials = true;
      xhr.send(form);
    });
  }
};
