import { type ReactNode, type MouseEvent, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";

type EnterPageChromeProps = {
  children: ReactNode;
  nav?: ReactNode;
};

export function EnterPageChrome({ children, nav }: EnterPageChromeProps) {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const refreshHome = (event: MouseEvent) => {
    event.preventDefault();
    navigate("/");
  };

  return (
    <div className="enter-page landing-page-chrome">
      <header className={`enter-header landing-header ${isScrolled ? "is-scrolled" : ""}`}>
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
