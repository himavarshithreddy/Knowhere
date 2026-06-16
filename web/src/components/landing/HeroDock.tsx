import type { ReactNode } from "react";
import { motion } from "framer-motion";

type Props = {
  children: ReactNode;
};

const ease = [0.22, 1, 0.36, 1] as const;

const dockReveal = {
  hidden: { opacity: 0, scale: 0.92, filter: "blur(8px)" },
  show: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease, delay: 0.15 },
  },
};

const textReveal = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease, delay: 0.3 + i * 0.14 },
  }),
};

const orbitBadges = [
  "Links",
  "Videos",
  "Notes",
  "Articles",
  "Images",
  "PDFs",
  "Ideas",
  "Posts",
];

export function HeroDock({ children }: Props) {
  return (
    <div className="hero-dock-wrap">
      {/* Left column — Hero copy */}
      <div className="hero-text">
        <motion.span
          className="hero-eyebrow"
          custom={0}
          variants={textReveal}
          initial="hidden"
          animate="show"
        >
          Your private knowledge vault
        </motion.span>
        <motion.h1
          className="hero-title"
          custom={1}
          variants={textReveal}
          initial="hidden"
          animate="show"
        >
          A place for everything you've ever discovered.
        </motion.h1>
        <motion.p
          className="hero-subtitle"
          custom={2}
          variants={textReveal}
          initial="hidden"
          animate="show"
        >
          Save links, videos, posts, articles, notes, and ideas — with the
          context that makes them worth keeping. A mysterious archive floating
          somewhere in the universe.
        </motion.p>
        <motion.div
          className="hero-scroll-hint"
          custom={3}
          variants={textReveal}
          initial="hidden"
          animate="show"
        >
          <span className="hero-scroll-line" aria-hidden="true" />
          <span className="hero-scroll-label">Scroll to explore</span>
        </motion.div>
      </div>

      {/* Right column — Dock with orbit ring */}
      <div className="hero-dock-col">
        <div className="hero-orbit-ring" aria-hidden="true">
          {orbitBadges.map((label, i) => (
            <span
              key={label}
              className="hero-orbit-badge"
              style={{
                "--orbit-i": i,
                "--orbit-total": orbitBadges.length,
              } as React.CSSProperties}
            >
              {label}
            </span>
          ))}
        </div>

        <motion.div
          className="hero-dock"
          variants={dockReveal}
          initial="hidden"
          animate="show"
        >
          <div className="hero-dock-glow" aria-hidden="true" />
          <div className="hero-dock-inner">
            <p className="hero-dock-kicker">
              Enter <span className="hero-dock-brand">Knowhere</span>
              <span className="hero-dock-dot" aria-hidden="true" />
            </p>
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
