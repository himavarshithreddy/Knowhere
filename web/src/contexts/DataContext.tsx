import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Category, Resource, UserPreferences, UserProfile } from "@knowhere/shared";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";

type ResourceInput = {
  type: Resource["type"]; title?: string; description: string; categoryId: string;
  url?: string; noteBody?: string; file?: File; metadata?: Resource["metadata"];
  enrichMetadataInBackground?: boolean; locked?: boolean; intentType?: string;
};
type DataState = {
  profile: UserProfile | null; categories: Category[]; resources: Resource[];
  loading: boolean; error: string; uploadProgress: number;
  refresh: () => Promise<void>;
  saveResource: (input: ResourceInput) => Promise<Resource>;
  updateResource: (id: string, patch: Partial<Resource>) => Promise<void>;
  recordView: (id: string, type?: string) => Promise<void>;
  permanentlyDelete: (resource: Resource) => Promise<void>;
  addCategory: (name: string) => Promise<string>;
  renameCategory: (id: string, name: string) => Promise<void>;
  reorderCategories: (categories: Category[]) => Promise<void>;
  removeCategory: (id: string, destinationId: string) => Promise<void>;
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const refresh = useCallback(async (options?: { background?: boolean }) => {
    if (!user) return;
    if (!options?.background) setLoading(true);
    setError("");
    try {
      const [nextProfile, nextCategories, nextResources] = await Promise.all([
        api.getProfile(),
        api.getCategories(),
        api.getResources()
      ]);
      setProfile(nextProfile);
      setCategories(nextCategories);
      setResources(nextResources);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your collection.");
    } finally {
      if (!options?.background) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setCategories([]);
      setResources([]);
      setLoading(false);
      return;
    }
    refresh();
  }, [user, refresh]);

  const saveResource = useCallback(async (input: ResourceInput) => {
    if (!user) throw new Error("User is not authenticated");
    const created = await api.createResource({
      type: input.type,
      title: input.title ?? "",
      description: input.description,
      categoryId: input.categoryId,
      url: input.url,
      noteBody: input.noteBody,
      metadata: input.metadata,
      locked: input.locked
    });
    try {
      let saved = created;
      if (input.file) {
        saved = await api.uploadFile(created.id, input.file, setUploadProgress);
      }
      setResources((prev) => [saved, ...prev]);
      if (input.enrichMetadataInBackground && input.url) {
        const resourceId = created.id;
        const linkUrl = input.url;
        void api.extractMetadata(linkUrl)
          .then((metadata) => {
            const patch: Partial<Resource> = { metadata };
            if (metadata.title?.trim()) patch.title = metadata.title.trim();
            return api.updateResource(resourceId, patch);
          })
          .then((updated) => setResources((prev) => prev.map((item) => (item.id === resourceId ? updated : item))))
          .catch(() => undefined);
      }
      await refresh({ background: true });
      return saved;
    } catch (error) {
      await api.deleteResource(created.id).catch(() => undefined);
      throw error;
    } finally {
      setUploadProgress(0);
    }
  }, [user, refresh]);

  const recordView = useCallback(async (id: string, type?: string) => {
    const { viewCount, lastViewedAt } = await api.recordView(id, type);
    setResources((prev) => prev.map((item) => 
      item.id === id ? { ...item, viewCount, lastViewedAt } : item
    ));
  }, []);

  const value = useMemo<DataState>(() => ({
    profile, categories, resources, loading, error, uploadProgress, refresh, saveResource,
    updateResource: async (id, patch) => {
      await api.updateResource(id, patch);
      await refresh({ background: true });
    },
    recordView,
    permanentlyDelete: async (resource) => {
      await api.deleteResource(resource.id);
      await refresh();
    },
    addCategory: async (name) => {
      const category = await api.createCategory(name);
      setCategories((prev) => [...prev, category].sort((a, b) => a.order - b.order));
      return category.id;
    },
    renameCategory: async (id, name) => {
      const category = await api.renameCategory(id, name);
      setCategories((prev) => prev.map((item) => (item.id === id ? category : item)));
    },
    reorderCategories: async (next) => {
      const categories = await api.reorderCategories(next.map((category) => category.id));
      setCategories(categories);
    },
    removeCategory: async (id, destinationId) => {
      await api.deleteCategory(id, destinationId);
      await refresh();
    },
    updatePreferences: async (patch) => {
      const next = await api.updateProfile({ preferences: patch });
      setProfile(next);
    },
    completeOnboarding: async () => {
      const next = await api.updateProfile({ onboardingComplete: true });
      setProfile(next);
    }
  }), [profile, categories, resources, loading, error, uploadProgress, refresh, saveResource, user]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => {
  const value = useContext(DataContext);
  if (!value) throw new Error("useData must be used inside DataProvider");
  return value;
};
