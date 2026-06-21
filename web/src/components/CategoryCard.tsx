import { ChevronRight } from "lucide-react";
import type { Category } from "@knowhere/shared";
import { categoryHue } from "../lib/utils";

export function CategoryCard({ category, count, previews, view, onOpen }: {
  category: Category; count: number; previews: string[]; view: "grid" | "list"; onOpen: () => void;
}) {
  const hue = categoryHue(category.id);
  const cover = previews[0];
  const label = count === 1 ? "1 item" : `${count} items`;

  if (view === "list") {
    return <article className="category-card list" style={{ "--category-hue": hue } as React.CSSProperties}
      onClick={onOpen} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen()}>
      <div className="category-list-thumb" aria-hidden="true">
        {cover
          ? <img src={cover} alt={`${category.name} preview`} loading="lazy" width="400" height="300" />
          : <span>{category.name.slice(0, 1).toUpperCase()}</span>}
      </div>
      <div className="category-copy">
        <h3>{category.name}</h3>
        <p>{label}</p>
      </div>
      <span className="category-chevron" aria-hidden="true"><ChevronRight size={16} /></span>
    </article>;
  }

  return <article className="category-card grid" style={{ "--category-hue": hue } as React.CSSProperties}
    onClick={onOpen} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen()}>
    <div className="category-peek" aria-hidden="true">
      {previews.length > 0 ? previews.map((src, i) => (
        <img key={i} src={src} alt={`${category.name} preview ${i + 1}`} loading="lazy" width="400" height="300" 
             style={{ 
               gridArea: "1 / 1", 
               zIndex: 10 - i, 
               transform: i === 0 ? "none" : `translate(${i * 4}px, ${i * -4}px) scale(${1 - i * 0.05})`,
               opacity: 1 - i * 0.2,
               width: "100%", height: "100%", objectFit: "cover"
             }} />
      )) : <span>{category.name.slice(0, 1).toUpperCase()}</span>}
    </div>
    <div className="category-meta">
      <h3>{category.name}</h3>
      <p>{label}</p>
    </div>
  </article>;
}
