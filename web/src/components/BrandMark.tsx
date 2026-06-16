type BrandMarkProps = {
  className?: string;
  /** Show only the logo asset (sidebar collapse, loaders, empty states). */
  compact?: boolean;
};

export function BrandMark({ className = "", compact = false }: BrandMarkProps) {
  const markClass = `brand-mark${compact ? " compact" : ""}${className ? ` ${className}` : ""}`;

  if (compact) {
    return <svg className={markClass} viewBox="0 0 21 20" role="img" aria-label="Knowhere" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="20" fontSize="20" fontFamily="Nippo, system-ui, sans-serif" fontWeight="700" letterSpacing="-0.04em" fill="currentColor">K</text>
      <circle className="brand-mark-svg-dot" cx="17.3" cy="17.5" r="2.5" />
    </svg>;
  }

  return <span className={markClass}>
    <span className="brand-mark-text">Knowhere</span>
    <span className="brand-mark-dot" aria-hidden="true" />
  </span>;
}
