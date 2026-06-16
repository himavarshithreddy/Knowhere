import type { ReactNode } from "react";

export function WorkspaceHeaderMeta({ eyebrow, back }: { eyebrow: ReactNode; back?: ReactNode }) {
  return <div className="workspace-header-meta">
    <div className="workspace-header-meta-start">
      {back}
      <p className="eyebrow">{eyebrow}</p>
    </div>
  </div>;
}
