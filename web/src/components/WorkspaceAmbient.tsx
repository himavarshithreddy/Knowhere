import { useEffect, useRef } from "react";

/* ═══════════════════════════════════
   Theme-aware palettes (matches CosmicScene)
   ═══════════════════════════════════ */
const PALETTES = {
  dark: {
    stars: "#e8dfc8",
    gold: "#d89b4a",
    nebula1: "#d89b4a",
    nebula2: "#6d7ea8",
    nebula3: "#8d9d6f",
    ring: "#e5b06a",
    starAlpha: 0.7,
    nebulaAlpha: 0.045,
    ringAlpha: 0.22,
  },
  light: {
    stars: "#3b5a72",
    gold: "#b5703a",
    nebula1: "#3b5a72",
    nebula2: "#b5703a",
    nebula3: "#4a6e48",
    ring: "#3b5a72",
    starAlpha: 0.65,
    nebulaAlpha: 0.1,
    ringAlpha: 0.25,
  },
} as const;

function getTheme(): "dark" | "light" {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

interface Star {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface NebulaBlob {
  x: number;
  y: number;
  radius: number;
  color: string;
  pulseSpeed: number;
  pulsePhase: number;
  baseAlpha: number;
}

export function WorkspaceAmbient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf: number;
    let theme = getTheme();
    let palette = PALETTES[theme];

    /* ── Responsive sizing ── */
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    /* ── Stars ── */
    const STAR_COUNT = 100;
    const stars: Star[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 0.5 + Math.random() * 1.8,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.08,
        alpha: 0.2 + Math.random() * 0.6,
        twinkleSpeed: 0.3 + Math.random() * 1.2,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }

    /* ── Nebula blobs ── */
    const createNebulae = (): NebulaBlob[] => [
      {
        x: window.innerWidth * 0.7,
        y: window.innerHeight * 0.3,
        radius: Math.min(window.innerWidth, window.innerHeight) * 0.35,
        color: palette.nebula1,
        pulseSpeed: 0.15,
        pulsePhase: 0,
        baseAlpha: palette.nebulaAlpha,
      },
      {
        x: window.innerWidth * 0.25,
        y: window.innerHeight * 0.65,
        radius: Math.min(window.innerWidth, window.innerHeight) * 0.28,
        color: palette.nebula2,
        pulseSpeed: 0.2,
        pulsePhase: Math.PI * 0.7,
        baseAlpha: palette.nebulaAlpha * 0.8,
      },
      {
        x: window.innerWidth * 0.5,
        y: window.innerHeight * 0.15,
        radius: Math.min(window.innerWidth, window.innerHeight) * 0.2,
        color: palette.nebula3,
        pulseSpeed: 0.12,
        pulsePhase: Math.PI * 1.4,
        baseAlpha: palette.nebulaAlpha * 0.6,
      },
    ];
    let nebulae = createNebulae();

    /* ── Orbital systems ── */
    let orbitTime = 0;

    /* ── Reduced motion check ── */
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    /* ── Theme observer ── */
    const observer = new MutationObserver(() => {
      const newTheme = getTheme();
      if (newTheme !== theme) {
        theme = newTheme;
        palette = PALETTES[theme];
        nebulae = createNebulae();
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    /* ── Hex to RGB helper ── */
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r},${g},${b}`;
    };

    /* ── Animation loop ── */
    let time = 0;
    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);
      time += 0.016;

      /* Nebula blobs */
      for (const blob of nebulae) {
        const pulseAlpha =
          blob.baseAlpha *
          (0.7 + 0.3 * Math.sin(time * blob.pulseSpeed + blob.pulsePhase));
        const grad = ctx.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          blob.radius
        );
        grad.addColorStop(0, `rgba(${hexToRgb(blob.color)},${pulseAlpha})`);
        grad.addColorStop(0.5, `rgba(${hexToRgb(blob.color)},${pulseAlpha * 0.4})`);
        grad.addColorStop(1, `rgba(${hexToRgb(blob.color)},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(
          blob.x - blob.radius,
          blob.y - blob.radius,
          blob.radius * 2,
          blob.radius * 2
        );
      }

      /* Orbital systems */
      if (!prefersReducedMotion) {
        orbitTime += 0.006;
      }

      const drawOrbitSystem = (
        cx: number,
        cy: number,
        rx: number,
        ry: number,
        tilt: number,
        alphaMultiplier: number,
        rings: Array<{
          scale: number;
          dash?: number[];
          dashSpeed?: number;
          bodies: Array<{
            phase: number;
            speed: number;
            size: number;
            color: string;
            glow: boolean;
          }>;
        }>
      ) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tilt);

        rings.forEach((ring) => {
          const rxScaled = rx * ring.scale;
          const ryScaled = ry * ring.scale;

          ctx.beginPath();
          ctx.ellipse(0, 0, rxScaled, ryScaled, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${hexToRgb(palette.ring)},${palette.ringAlpha * alphaMultiplier})`;
          ctx.lineWidth = ring.scale > 0.8 ? 1 : 0.6;
          
          if (ring.dash && !prefersReducedMotion) {
            ctx.setLineDash(ring.dash);
            ctx.lineDashOffset = -orbitTime * (ring.dashSpeed ?? 0) * 50;
          } else if (ring.dash) {
            ctx.setLineDash(ring.dash);
          } else {
            ctx.setLineDash([]);
          }
          ctx.stroke();

          ring.bodies.forEach((body) => {
            const angle = body.phase + orbitTime * body.speed;
            const bx = rxScaled * Math.cos(angle);
            const by = ryScaled * Math.sin(angle);

            ctx.beginPath();
            ctx.arc(bx, by, body.size, 0, Math.PI * 2);
            ctx.fillStyle = body.color;
            ctx.fill();

            if (body.glow) {
              ctx.beginPath();
              ctx.arc(bx, by, body.size * 3.5, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${hexToRgb(body.color)},0.25)`;
              ctx.fill();
            }
          });
        });

        ctx.restore();
      };

      const baseR1 = Math.min(w, h) * 0.44;
      drawOrbitSystem(
        w * 0.85,
        h * 0.32,
        baseR1,
        baseR1 * 0.32,
        0.3,
        1.1,
        [
          {
            scale: 1.0,
            dash: [4, 10],
            dashSpeed: 0.3,
            bodies: [
              { phase: 0, speed: 1.2, size: 2.2, color: palette.gold, glow: true },
              { phase: Math.PI, speed: 0.8, size: 1.6, color: palette.stars, glow: false },
            ]
          },
          {
            scale: 0.76,
            dash: [6, 14],
            dashSpeed: -0.2,
            bodies: [
              { phase: Math.PI * 0.5, speed: -1.0, size: 1.8, color: palette.stars, glow: false }
            ]
          }
        ]
      );

      const baseR2 = Math.min(w, h) * 0.28;
      drawOrbitSystem(
        w * 0.15,
        h * 0.72,
        baseR2,
        baseR2 * 0.28,
        -0.4,
        0.6,
        [
          {
            scale: 1.0,
            dash: [3, 8],
            dashSpeed: 0.15,
            bodies: [
              { phase: Math.PI * 1.2, speed: 0.6, size: 1.8, color: palette.gold, glow: true }
            ]
          },
          {
            scale: 0.6,
            bodies: []
          }
        ]
      );

      /* Stars */
      for (const star of stars) {
        if (!prefersReducedMotion) {
          star.x += star.vx;
          star.y += star.vy;

          // Wrap around edges
          if (star.x < -10) star.x = w + 10;
          if (star.x > w + 10) star.x = -10;
          if (star.y < -10) star.y = h + 10;
          if (star.y > h + 10) star.y = -10;
        }

        const twinkle =
          0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinklePhase);
        const a = star.alpha * twinkle * palette.starAlpha;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${hexToRgb(palette.stars)},${a})`;
        ctx.fill();

        // Glow for bigger stars
        if (star.r > 1.3) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.r * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${hexToRgb(palette.gold)},${a * 0.12})`;
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    const onResize = () => {
      resize();
      nebulae = createNebulae();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
