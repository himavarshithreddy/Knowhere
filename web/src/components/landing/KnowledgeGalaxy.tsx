import { useRef, useEffect, useState, useCallback } from "react";
import { motion, useInView } from "framer-motion";

const STAR_COUNT = 560;
const ARM_COUNT = 3;

const THEME_COLORS = {
  dark: ["#e8dfc8", "#d89b4a", "#6d7ea8"],
  light: ["#3a4a60", "#2e4f6d", "#6a7a5a"],
} as const;

const THEME_GLOW = {
  dark: { inner: "rgba(216, 155, 74, 0.12)", mid: "rgba(216, 155, 74, 0.04)" },
  light: { inner: "rgba(46, 79, 109, 0.10)", mid: "rgba(46, 79, 109, 0.03)" },
} as const;

type Star = {
  angle: number;
  radius: number;
  /** Index into the theme color array */
  colorIdx: number;
  size: number;
  scatter: number;
};

function generateStars(): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const arm = i % ARM_COUNT;
    const armOffset = (arm / ARM_COUNT) * Math.PI * 2;
    // Using an exponent < 1 pushes the distribution outwards so it's less packed at the center
    const t = Math.pow(Math.random(), 0.6);
    const angle = armOffset + t * Math.PI * 3;
    const radius = 20 + t * 180;
    const scatter = (Math.random() - 0.5) * 40 * (0.3 + t);
    stars.push({
      angle,
      radius,
      colorIdx: Math.floor(Math.random() * 3),
      size: 0.6 + Math.random() * 2.2,
      scatter,
    });
  }
  return stars;
}

const STARS = generateStars();

function getTheme(): "dark" | "light" {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

type Stat = {
  target: number;
  label: string;
  suffix?: string;
};

const STATS: Stat[] = [
  { target: 847, label: "discoveries" },
  { target: 12, label: "clusters" },
  { target: 1, label: "universe" },
];

function useCountUp(target: number, active: boolean, duration = 1600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (target <= 1) {
      setValue(target);
      return;
    }
    let start: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
}

export function KnowledgeGalaxy() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const rafRef = useRef(0);

  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-51px" });

  const count0 = useCountUp(STATS[0].target, statsInView);
  const count1 = useCountUp(STATS[1].target, statsInView, 1200);
  const count2 = useCountUp(STATS[2].target, statsInView, 600);
  const counts = [count0, count1, count2];

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const theme = getTheme();
    const colors = THEME_COLORS[theme];
    const glow = THEME_GLOW[theme];

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Central glow
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
    grad.addColorStop(0, glow.inner);
    grad.addColorStop(0.5, glow.mid);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const rot = rotationRef.current;
    const scale = Math.min(w, h) / 480;

    for (const star of STARS) {
      const a = star.angle + rot;
      const r = star.radius * scale;
      const sx = Math.cos(a + Math.PI / 2) * star.scatter * scale;
      const sy = Math.sin(a + Math.PI / 2) * star.scatter * scale;
      const x = cx + Math.cos(a) * r + sx;
      const y = cy + Math.sin(a) * r + sy;

      ctx.beginPath();
      ctx.arc(x, y, star.size * scale * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = colors[star.colorIdx];
      ctx.globalAlpha = 0.5 + Math.random() * 0.5;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, []);

  useEffect(() => {
    const loop = () => {
      rotationRef.current += 0.0008;
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // Resize handling
  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  return (
    <section className="landing-section galaxy-section" id="galaxy">
      <motion.div
        className="section-header"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-68px" }}
        transition={{ duration: 0.6 }}
      >

        <h2 className="section-title">Your knowledge galaxy</h2>
      </motion.div>

      <motion.div
        className="galaxy-canvas-wrap"
        initial={{ opacity: 0, scale: 0.92 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-51px" }}
        transition={{ duration: 0.8 }}
      >
        <canvas ref={canvasRef} className="galaxy-canvas" />
      </motion.div>

      <div className="galaxy-stats" ref={statsRef}>
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="galaxy-stat"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
          >
            <span className="galaxy-stat-number">{counts[i]}</span>
            <span className="galaxy-stat-label">{stat.label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
