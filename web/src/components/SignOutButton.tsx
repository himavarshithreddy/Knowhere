import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

type PopoverPosition = { top: number; left: number };

const viewportPadding = 12;
const gap = 10;

export function SignOutButton({ variant = "button" }: { variant?: "button" | "icon" }) {
  const { logOut } = useAuth();
  const titleId = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const width = popover?.offsetWidth ?? 240;
    const height = popover?.offsetHeight ?? 96;
    const maxLeft = window.innerWidth - viewportPadding - width;
    const maxTop = window.innerHeight - viewportPadding - height;

    let top = variant === "icon" ? rect.top - gap - height : rect.bottom + gap;
    let left = variant === "icon" ? rect.right - width : rect.left;

    if (top < viewportPadding) {
      top = rect.bottom + gap;
    }
    if (top > maxTop) {
      top = Math.max(viewportPadding, maxTop);
    }

    left = Math.min(Math.max(left, viewportPadding), maxLeft);
    setPosition({ top, left });
  }, [variant]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const frame = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      if (!loading) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, loading]);

  const confirm = async () => {
    setLoading(true);
    try {
      await logOut();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const popover = open ? createPortal(
    <div
      ref={popoverRef}
      className="sign-out-popover"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      style={{ top: position.top, left: position.left }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <p className="sign-out-popover-title" id={titleId}>Sign out of Knowhere?</p>
      <footer className="sign-out-popover-actions">
        <button type="button" className="button secondary" onClick={() => setOpen(false)} disabled={loading}>Cancel</button>
        <button type="button" className="button danger" onClick={() => void confirm()} disabled={loading}>
          {loading ? <><LoaderCircle className="spin" size={15} /> Signing out…</> : <><LogOut size={15} /> Sign out</>}
        </button>
      </footer>
    </div>,
    document.body
  ) : null;

  return <>
    <span className="sign-out-anchor" ref={anchorRef}>
      {variant === "icon"
        ? <button
            type="button"
            className="sign-out-trigger"
            onClick={() => setOpen((value) => !value)}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Sign out"
            aria-expanded={open}
            aria-haspopup="dialog"
          ><LogOut /></button>
        : <button
            type="button"
            className="button secondary"
            onClick={() => setOpen((value) => !value)}
            onPointerDown={(e) => e.stopPropagation()}
            aria-expanded={open}
            aria-haspopup="dialog"
          ><LogOut /> Sign out</button>}
    </span>
    {popover}
  </>;
}
