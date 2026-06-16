import { useEffect, useRef, useCallback } from "react";

/**
 * Custom futuristic cursor — a sleek spaceship-arrow SVG that
 * follows the mouse instantly with smooth state transitions.
 */
export function CustomCursor() {
  const dotRef = useRef<SVGSVGElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const visible = useRef(false);
  const hovering = useRef(false);

  const isInteractive = useCallback((el: Element | null): boolean => {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (["a", "button", "input", "textarea", "select", "label"].includes(tag)) return true;
    const style = window.getComputedStyle(el);
    if (style.cursor === "pointer") return true;
    if (el.getAttribute("role") === "button") return true;
    if (el.closest("a, button, [role='button'], label")) return true;
    return false;
  }, []);

  useEffect(() => {
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    const dot = dotRef.current;
    if (!dot) return;

    const onMouseMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (!visible.current) {
        visible.current = true;
        dot.style.opacity = "1";
      }
      dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;

      const target = document.elementFromPoint(e.clientX, e.clientY);
      const isHover = isInteractive(target);
      if (isHover !== hovering.current) {
        hovering.current = isHover;
        dot.classList.toggle("cursor-ship--hover", isHover);
      }
    };

    const onMouseDown = () => dot.classList.add("cursor-ship--click");
    const onMouseUp = () => dot.classList.remove("cursor-ship--click");
    const onMouseLeave = () => { visible.current = false; dot.style.opacity = "0"; };
    const onMouseEnter = () => { visible.current = true; dot.style.opacity = "1"; };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    document.documentElement.addEventListener("mouseenter", onMouseEnter);
    document.documentElement.classList.add("custom-cursor-active");

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
      document.documentElement.removeEventListener("mouseenter", onMouseEnter);
      document.documentElement.classList.remove("custom-cursor-active");
    };
  }, [isInteractive]);

  return (
    <svg
      ref={dotRef}
      className="cursor-ship"
      viewBox="0 0 180 250"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M -11.863 37.456 L -0.402 223.594 C 0.784 242.853 25.861 249.432 36.348 233.235 L 72.211 177.847 L 137.970 172.378 C 157.199 170.779 163.237 145.566 146.819 135.429 L -11.863 37.456 Z" 
        fill="#000" 
        opacity="0.1" 
      />
      <path 
        d="M 92.491 127.817 L 148.459 123.163 C 167.687 121.564 173.726 96.351 157.308 86.214 L 31.467 8.518 C 17.669 -0.002 0.001 10.579 0.998 26.764 L 10.087 174.379 C 11.272 193.638 36.350 200.217 46.837 184.020 L 77.361 136.878 C 80.728 131.677 86.316 128.331 92.491 127.817 Z" 
        fill="currentColor" 
      />
    </svg>
  );
}
