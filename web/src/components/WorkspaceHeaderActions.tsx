import { ThemeToggle } from "./ThemeToggle";
import { WorkspaceHeaderProfile } from "./WorkspaceHeaderProfile";

export function WorkspaceHeaderActions() {
  return <div className="workspace-header-actions">
    <ThemeToggle variant="header" />
    <WorkspaceHeaderProfile />
  </div>;
}
