import { useMemo, type MouseEvent } from "react";
import { BrandMark } from "./BrandMark";
import { NavLink, useLocation } from "react-router-dom";
import { Archive, BookOpen, Compass, Heart, Settings, Target, Trash2 } from "lucide-react";
import { useData } from "../contexts/DataContext";

const libraryCategoryId = (search: string) => new URLSearchParams(search).get("category");

export function Sidebar() {
  const { categories, refresh } = useData();
  const { pathname, search } = useLocation();
  const activeCategoryId = pathname === "/library" ? libraryCategoryId(search) : null;
  const collectionActive = pathname === "/library" && !activeCategoryId;

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.order - b.order),
    [categories]
  );

  const refreshHome = (event: MouseEvent) => {
    if (pathname === "/dashboard") {
      event.preventDefault();
      void refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return <aside className="sidebar">
    <NavLink to="/" className="brand" aria-label="Knowhere home">
      <BrandMark />
    </NavLink>

    <nav className="sidebar-nav">
      <NavLink to="/dashboard" onClick={refreshHome}>
        <Compass /> <span>Dashboard</span>
      </NavLink>
      <NavLink to="/missions">
        <Target /> <span>Missions</span>
      </NavLink>
      <NavLink to="/library" className={collectionActive ? "active" : undefined}>
        <BookOpen /> <span>Library</span>
      </NavLink>
      <NavLink to="/favorites"><Heart /> <span>Favorites</span></NavLink>

      {sortedCategories.length > 0 && <div className="sidebar-categories">
        {sortedCategories.map((category) => <NavLink key={category.id} to={`/library?category=${category.id}`}
          className={activeCategoryId === category.id ? "active" : undefined}>
          <span>{category.name}</span>
        </NavLink>)}
      </div>}
      <div className="sidebar-tail">
        <NavLink to="/archive"><Archive /> <span>Archive</span></NavLink>
        <NavLink to="/trash"><Trash2 /> <span>Trash</span></NavLink>
        <NavLink to="/settings"><Settings /> <span>Settings</span></NavLink>
      </div>
    </nav>
  </aside>;
}
