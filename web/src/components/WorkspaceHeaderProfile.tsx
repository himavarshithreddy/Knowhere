import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { LoaderCircle, LogOut, Settings, UserRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

type PopoverPosition = { top: number; left: number };

const viewportPadding = 12;
const gap = 10;

export function WorkspaceHeaderProfile() {
  const { user, logOut } = useAuth();
  const titleId = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const width = popover?.offsetWidth ?? 280;
    const height = popover?.offsetHeight ?? 140;
    const maxLeft = window.innerWidth - viewportPadding - width;
    const maxTop = window.innerHeight - viewportPadding - height;

    let top = rect.bottom + gap;
    let left = rect.right - width;

    if (top > maxTop) top = rect.top - gap - height;
    if (top < viewportPadding) top = Math.max(viewportPadding, maxTop);
    left = Math.min(Math.max(left, viewportPadding), maxLeft);
    setPosition({ top, left });
  }, []);

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
  }, [open, updatePosition, confirmingSignOut]); // re-calculate when toggle confirming view size shifts

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        setOpen(false);
        setConfirmingSignOut(false);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      if (!loading) {
        setOpen(false);
        setConfirmingSignOut(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, loading]);

  if (!user) return null;

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await logOut();
      setOpen(false);
      setConfirmingSignOut(false);
    } finally {
      setLoading(false);
    }
  };

  const isCoordsAccount = user.authProvider === "coords" || user.authProvider === "code";

  const popover = open ? createPortal(
    <div
      ref={popoverRef}
      className="profile-popover"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      style={{ top: position.top, left: position.left }}
    >
      {confirmingSignOut ? (
        <>
          <p className="profile-popover-title" id={titleId}>Sign out of Knowhere?</p>
          <p className="enter-hint" style={{ margin: "0 0 11.9px", fontSize: "11.05px" }}>
            You will need to sign in again to access your collection.
          </p>
          <footer className="profile-popover-actions">
            <button type="button" className="button secondary" onClick={() => setConfirmingSignOut(false)} disabled={loading}>
              Cancel
            </button>
            <button type="button" className="button danger" onClick={handleSignOut} disabled={loading}>
              {loading ? <><LoaderCircle className="spin" size={15} /> Signing out…</> : "Sign out"}
            </button>
          </footer>
        </>
      ) : (
        <>
          <p className="profile-popover-title" id={titleId}>Account</p>
          <dl className="profile-popover-details">
            {isCoordsAccount ? (
              <>
                <dt>Coords</dt>
                <dd className="profile-popover-coords">{user.displayName}</dd>
              </>
            ) : (
              <>
                <dt>Name</dt>
                <dd>{user.displayName}</dd>
              </>
            )}
            <dt>Email</dt>
            <dd>{user.email || "—"}</dd>
          </dl>
          <footer className="profile-popover-actions">
            <Link to="/settings" className="button secondary" onClick={() => setOpen(false)}>
              <Settings size={15} /> Settings
            </Link>
            <button type="button" className="button secondary" onClick={() => setConfirmingSignOut(true)}>
              <LogOut size={15} /> Sign out
            </button>
          </footer>
        </>
      )}
    </div>,
    document.body
  ) : null;

  return <>
    <span className="workspace-header-profile-anchor" ref={anchorRef}>
      <button
        type="button"
        className="header-control workspace-header-profile"
        onClick={() => {
          setOpen((value) => {
            const next = !value;
            if (!next) setConfirmingSignOut(false);
            return next;
          });
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Account"
      >
        <UserRound size={18} />
      </button>
    </span>
    {popover}
  </>;
}
