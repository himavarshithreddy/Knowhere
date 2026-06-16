import { Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

type ThemeToggleProps = {
  className?: string;
  variant?: "icon" | "sidebar" | "header";
};

export function ThemeToggle({ className = "", variant = "icon" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Light mode" : "Dark mode";

  const variantClass = variant === "sidebar"
    ? "sidebar-theme-toggle"
    : variant === "header"
      ? "header-control"
      : "theme-toggle";

  return <button
    type="button"
    className={`${variantClass}${className ? ` ${className}` : ""}`}
    onClick={toggleTheme}
    aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    title={label}
  >
    {isDark ? <Moon size={17} /> : <Sun size={17} />}
    {variant === "sidebar" && <span>{label}</span>}
  </button>;
}
