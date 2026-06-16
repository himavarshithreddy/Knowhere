import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AlignLeft, Grid2X2, List, Plus, Search, SlidersHorizontal } from "lucide-react";
import type { Category, Resource } from "@knowhere/shared";
import { useData } from "../contexts/DataContext";
import { searchResources, resourceDisplayTitle } from "../lib/utils";
import { resourcePreviewUrl } from "../lib/preview";
import { CategoryCard } from "../components/CategoryCard";
import { BrandMark } from "../components/BrandMark";
import { ResourceCard } from "../components/ResourceCard";
import { ResourceForm } from "../components/ResourceForm";
import { ResourceDetail } from "../components/ResourceDetail";
import { ToolbarMenu } from "../components/ToolbarMenu";
import { WorkspaceHeaderActions } from "../components/WorkspaceHeaderActions";
import { WorkspaceHeaderMeta } from "../components/WorkspaceHeaderMeta";
import { usePageSeo } from "../hooks/usePageSeo";
import { SEO } from "../lib/seo";

type BrowseMode = "categories" | "resources";

export function Library({ mode = "library" }: { mode?: "library" | "favorites" | "archive" | "trash" }) {
  const { profile, resources, categories, loading, error, updateResource, permanentlyDelete, updatePreferences } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");

  const isLibrary = mode === "library";
  const isSearching = query.trim().length > 0;

  // Derive formOpen from search parameters
  const formOpen = searchParams.get("add") === "true";

  // Derive selected resource from search parameters
  const selectedResourceId = searchParams.get("detail");
  const selected = useMemo(() => {
    return selectedResourceId ? resources.find((r) => r.id === selectedResourceId) || null : null;
  }, [selectedResourceId, resources]);

  // Derive browseMode and selectedCategoryId from search parameters
  const browseMode = (searchParams.get("browse") as BrowseMode) || "categories";
  const selectedCategoryId = isLibrary ? searchParams.get("category") : null;

  const view = profile?.preferences.view ?? "grid";
  const resourceView = view === "detail" ? "detail" : view;
  const categoryView = view === "detail" ? "grid" : view;
  const showingCategories = isLibrary && browseMode === "categories" && !selectedCategoryId && !isSearching;
  const showingCategoryResources = isLibrary && browseMode === "categories" && Boolean(selectedCategoryId) && !isSearching;

  const baseResources = useMemo(() => resources.filter((resource) => {
    if (mode === "trash") return Boolean(resource.deletedAt);
    if (resource.deletedAt) return false;
    if (mode === "favorites") return resource.favorite;
    if (mode === "archive") return resource.archived;
    return !resource.archived;
  }), [resources, mode]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const resource of baseResources) {
      counts.set(resource.categoryId, (counts.get(resource.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [baseResources]);

  const categoryPreviews = useMemo(() => {
    const previews = new Map<string, string[]>();
    const sorted = [...baseResources].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    for (const resource of sorted) {
      const url = resourcePreviewUrl(resource);
      if (!url) continue;
      const list = previews.get(resource.categoryId) ?? [];
      if (list.length < 3) {
        list.push(url);
        previews.set(resource.categoryId, list);
      }
    }
    return previews;
  }, [baseResources]);

  const effectiveCategory = (() => {
    if (isSearching) {
      if (selectedCategoryId) return selectedCategoryId;
      if (browseMode === "resources" && category !== "all") return category;
      return "all";
    }
    if (showingCategoryResources && selectedCategoryId) return selectedCategoryId;
    return category;
  })();

  const visible = useMemo(() => {
    let result = baseResources;
    if (effectiveCategory !== "all") result = result.filter((resource) => resource.categoryId === effectiveCategory);
    result = searchResources(result, query, categories);
    return [...result].sort((a, b) => {
      if (sort === "oldest") return a.createdAt.localeCompare(b.createdAt);
      if (sort === "az") return resourceDisplayTitle(a).localeCompare(resourceDisplayTitle(b));
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [baseResources, effectiveCategory, query, sort, categories]);

  const visibleCategories = useMemo(() => [...categories].sort((a, b) => {
    if (sort === "az") return a.name.localeCompare(b.name);
    return a.order - b.order;
  }), [categories, sort]);

  const categoryOptions = useMemo(() => [
    { value: "all", label: "All clusters" },
    ...categories.map((item) => ({ value: item.id, label: item.name }))
  ], [categories]);

  const sortOptions = useMemo(() => showingCategories
    ? [{ value: "newest", label: "Default order" }, { value: "az", label: "A-Z" }]
    : [{ value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }, { value: "az", label: "A-Z" }]
  , [showingCategories]);

  const selectedCategory = categories.find((item) => item.id === selectedCategoryId);
  const title = showingCategoryResources && selectedCategory
    ? selectedCategory.name
    : { library: "Discoveries", favorites: "Favorites", archive: "Archive", trash: "Trash" }[mode];

  const eyebrow = showingCategories
    ? `${visibleCategories.length} ${visibleCategories.length === 1 ? "cluster" : "clusters"}`
    : isSearching
      ? `${visible.length} ${visible.length === 1 ? "signal" : "signals"}`
      : `${visible.length} ${visible.length === 1 ? "discovery" : "discoveries"}`;

  const empty = {
    library: ["This sector is uncharted", "Log your first discovery (link, note, image, or PDF)."],
    favorites: ["No favorites yet", "Mark discoveries with the heart icon."],
    archive: ["Nothing archived", "Archived discoveries stay searchable and out of your main vault."],
    trash: ["Trash is empty", "Discarded signals remain recoverable for 30 days."]
  }[mode];

  const openForm = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("add", "true");
      return next;
    });
  };

  const closeForm = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("add");
      return next;
    }, { replace: true });
  };

  const openDetail = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("detail", id);
      return next;
    });
  };

  const closeDetail = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("detail");
      return next;
    });
  };

  const openCategory = (categoryId: string) => {
    setQuery("");
    setSort("newest");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("category", categoryId);
      next.delete("browse");
      return next;
    });
  };

  const action = async (resource: Resource, action: string) => {
    if (action === "favorite") await updateResource(resource.id, { favorite: !resource.favorite });
    if (action === "archive") await updateResource(resource.id, { archived: !resource.archived });
    if (action === "trash") await updateResource(resource.id, { deletedAt: new Date().toISOString() });
    if (action === "restore") await updateResource(resource.id, { deletedAt: null });
    if (action === "permanent" && confirm("Permanently delete this resource? This cannot be undone.")) await permanentlyDelete(resource);
  };

  const formCategory = showingCategoryResources && selectedCategoryId
    ? selectedCategoryId
    : category !== "all" ? category : undefined;

  const seo = SEO[mode === "library" ? "library" : mode];
  usePageSeo({
    title: seo.title,
    description: seo.description,
    path: `/${mode === "library" ? "library" : mode}`,
    robots: seo.robots
  });

  return <main className="workspace">
    <header className="workspace-header">
      <div className="workspace-header-main">
        <WorkspaceHeaderMeta
          eyebrow={<span className="hud-meta">{eyebrow}</span>}
          back={showingCategoryResources ? (
            <button type="button" className="library-back" onClick={() => {
              setQuery("");
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete("category");
                return next;
              });
            }}>
              ← All clusters
            </button>
          ) : undefined}
        />
        <h1>{title}</h1>
      </div>
      <WorkspaceHeaderActions />
    </header>
    <div className="toolbar">
      <div className="toolbar-cluster toolbar-cluster-primary">
        <label className="search-box toolbar-search">
          <Search />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Scan for signals..." />
        </label>
        {mode !== "trash" && <button type="button" className="button primary new-resource" onClick={openForm}>
          <span className="new-resource-icon" aria-hidden="true"><Plus size={18} strokeWidth={2.25} /></span>
          Log discovery
        </button>}
      </div>
      <div className="toolbar-cluster toolbar-cluster-filters">
        {isLibrary && (
          <div className="tabs browse-tabs">
            <button type="button" className={browseMode === "categories" ? "active" : ""}
              onClick={() => {
                setCategory("all");
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete("browse");
                  next.delete("category");
                  return next;
                });
              }}>
              Clusters
            </button>
            <button type="button" className={browseMode === "resources" ? "active" : ""}
              onClick={() => {
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set("browse", "resources");
                  next.delete("category");
                  return next;
                });
              }}>
              All discoveries
            </button>
          </div>
        )}
        {!showingCategories && (
          <ToolbarMenu aria-label="Filter by cluster" value={effectiveCategory} options={categoryOptions}
            icon={<SlidersHorizontal size={16} />}
            onChange={(next) => {
              if (showingCategoryResources) {
                setSearchParams((prev) => {
                  const nextParams = new URLSearchParams(prev);
                  if (next === "all") {
                    nextParams.delete("category");
                  } else {
                    nextParams.set("category", next);
                  }
                  return nextParams;
                });
              } else {
                setCategory(next);
              }
            }} />
        )}
        <ToolbarMenu aria-label="Sort order" value={sort} options={sortOptions} onChange={setSort} />
        <div className="icon-pair">
          <button type="button" className={view === "grid" ? "active" : ""} onClick={() => updatePreferences({ view: "grid" })} aria-label="Grid view"><Grid2X2 /></button>
          <button type="button" className={view === "list" ? "active" : ""} onClick={() => updatePreferences({ view: "list" })} aria-label="List view"><List /></button>
          {!showingCategories && (
            <button type="button" className={view === "detail" ? "active" : ""} onClick={() => updatePreferences({ view: "detail" })} aria-label="Detail view — show full descriptions"><AlignLeft /></button>
          )}
        </div>
      </div>
    </div>
    {error && <div className="error-banner">{error}</div>}
    {loading ? <div className={`resource-grid ${resourceView}`}>{ [1, 2, 3, 4, 5, 6].map((i) => <div className="skeleton-card" key={i} />) }</div>
      : showingCategories ? (
        visibleCategories.length
          ? <div className={`category-grid ${categoryView}`}>
            {visibleCategories.map((item: Category) => <CategoryCard key={item.id} category={item}
              count={categoryCounts.get(item.id) ?? 0} previews={categoryPreviews.get(item.id) ?? []}
              view={categoryView} onOpen={() => openCategory(item.id)} />)}
          </div>
          : <div className="empty-state"><div className="empty-mark"><BrandMark compact /></div>
            <h2>No clusters charted</h2>
            <p>Create a cluster in Settings, then log your first discovery.</p></div>
      ) : visible.length ? <div className={`resource-grid ${resourceView}`}><AnimatePresence>
        {visible.map((resource) => <ResourceCard key={resource.id} resource={resource}
          category={categories.find((item) => item.id === resource.categoryId)} view={resourceView} mode={mode}
          onOpen={() => mode !== "trash" && openDetail(resource.id)} onAction={(next) => action(resource, next)} />)}
      </AnimatePresence></div>
        : <div className="empty-state"><div className="empty-mark"><BrandMark compact /></div>
          <h2>{query ? `No signals for “${query}”` : showingCategoryResources ? "Nothing in this cluster" : empty[0]}</h2>
          <p>{query ? "Try another frequency or clear the active filters." : showingCategoryResources ? "Log a discovery here to fill this cluster." : empty[1]}</p>
          {mode === "library" && !query && <button className="button primary" onClick={openForm}><Plus /> Log your first discovery</button>}</div>}
    <button className="mobile-fab" onClick={openForm} aria-label="Log discovery"><Plus /></button>
    <ResourceForm open={formOpen} onClose={closeForm} initialCategory={formCategory} />
    <ResourceDetail resource={selected} categories={categories} onClose={closeDetail} />
  </main>;
}
