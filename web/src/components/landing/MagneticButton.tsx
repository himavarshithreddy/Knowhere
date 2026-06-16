import { useRef, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  strength?: number;
};

export function MagneticButton({
  children,
  className = "",
  onClick,
  href,
  strength = 0.3,
}: Props) {
  const ref = useRef<HTMLButtonElement & HTMLAnchorElement>(null);

  const handleMove = (e: ReactMouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  };

  const handleLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  const cls = `magnetic-btn ${className}`.trim();

  if (href) {
    return (
      <a
        ref={ref}
        className={cls}
        href={href}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      className={cls}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      type="button"
    >
      {children}
    </button>
  );
}
