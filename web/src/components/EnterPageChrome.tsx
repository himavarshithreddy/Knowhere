import type { ReactNode, MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";

type EnterPageChromeProps = {
  children: ReactNode;
  nav?: ReactNode;
};

export function EnterPageChrome({ children, nav }: EnterPageChromeProps) {
  const navigate = useNavigate();
  const refreshHome = (event: MouseEvent) => {
    event.preventDefault();
    navigate("/");
  };

  return (
    <div className="enter-page landing-page-chrome">
      <header className="enter-header landing-header">
        <a
          href="/"
          className="enter-header-brand"
          onClick={refreshHome}
          aria-label="Knowhere home"
        >
          <BrandMark />
        </a>
        <div className="enter-header-actions">
          {nav && <nav className="enter-nav">{nav}</nav>}
          <ThemeToggle />
        </div>
      </header>
      {children}
    </div>
  );
}
