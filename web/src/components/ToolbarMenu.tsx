import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type Option = { value: string; label: string };

export function ToolbarMenu({ value, options, onChange, icon, "aria-label": ariaLabel }: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  icon?: ReactNode;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return <div className={`toolbar-menu${open ? " open" : ""}`} ref={ref}>
    <button type="button" className="toolbar-menu-trigger" aria-label={ariaLabel}
      aria-expanded={open} aria-haspopup="listbox" aria-controls={listId}
      onClick={() => setOpen((current) => !current)}>
      {icon}
      <span>{selected?.label}</span>
      <ChevronDown size={15} aria-hidden />
    </button>
    {open && <ul className="toolbar-menu-list" id={listId} role="listbox">
      {options.map((option) => <li key={option.value} role="presentation">
        <button type="button" role="option" aria-selected={option.value === value}
          className={option.value === value ? "active" : ""}
          onClick={() => { onChange(option.value); setOpen(false); }}>
          {option.label}
        </button>
      </li>)}
    </ul>}
  </div>;
}
