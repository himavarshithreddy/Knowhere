import { useState, useRef, useEffect } from "react";
import { Tag, X, ChevronDown } from "lucide-react";

type Props = {
  availableTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
};

export function TagFilterMenu({ availableTags, selectedTags, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = availableTags.filter(t => t.toLowerCase().includes(search.toLowerCase()));

  const toggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  if (availableTags.length === 0) return null;

  return (
    <div className="tag-filter-menu" ref={ref}>
      <button
        type="button"
        className={`button secondary tag-filter-trigger ${selectedTags.length > 0 ? "active" : ""}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label="Filter by tag"
      >
        <Tag size={15} />
        {selectedTags.length > 0 ? `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""}` : "Tags"}
        <ChevronDown size={14} style={{ marginLeft: "2px", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>

      {open && (
        <div className="tag-filter-dropdown">
          <div className="tag-filter-search">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tags..."
              className="tag-filter-search-input"
            />
          </div>

          <div className="tag-filter-list">
            {filtered.length === 0 ? (
              <p className="tag-filter-empty">No tags match</p>
            ) : (
              filtered.map(tag => (
                <label key={tag} className="tag-filter-item">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag)}
                    onChange={() => toggle(tag)}
                  />
                  <span className="tag-filter-label">{tag}</span>
                </label>
              ))
            )}
          </div>

          {selectedTags.length > 0 && (
            <div className="tag-filter-footer">
              <button type="button" className="tag-filter-clear" onClick={() => onChange([])}>
                <X size={12} /> Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
