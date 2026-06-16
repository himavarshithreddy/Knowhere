import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface Star {
  x: number;
  y: number;
  r: number;
}

interface Cluster {
  name: string;
  cx: number;
  cy: number;
  stars: Star[];
}

/** Deterministic star positions spread around each cluster center */
const CLUSTERS: Cluster[] = [
  {
    name: 'Projects',
    cx: 150,
    cy: 120,
    stars: [
      { x: 130, y: 95, r: 4 },
      { x: 170, y: 105, r: 3 },
      { x: 140, y: 140, r: 5 },
      { x: 175, y: 145, r: 3.5 },
    ],
  },
  {
    name: 'Knowledge',
    cx: 400,
    cy: 80,
    stars: [
      { x: 375, y: 55, r: 3 },
      { x: 415, y: 60, r: 4.5 },
      { x: 390, y: 90, r: 3.5 },
      { x: 425, y: 95, r: 3 },
      { x: 405, y: 115, r: 4 },
    ],
  },
  {
    name: 'Research',
    cx: 700,
    cy: 150,
    stars: [
      { x: 680, y: 125, r: 4 },
      { x: 720, y: 130, r: 3 },
      { x: 690, y: 165, r: 3.5 },
      { x: 725, y: 170, r: 5 },
    ],
  },
  {
    name: 'References',
    cx: 250,
    cy: 350,
    stars: [
      { x: 235, y: 330, r: 4 },
      { x: 270, y: 340, r: 3.5 },
      { x: 245, y: 370, r: 3 },
    ],
  },
  {
    name: 'Ideas',
    cx: 550,
    cy: 380,
    stars: [
      { x: 530, y: 360, r: 3 },
      { x: 570, y: 365, r: 4.5 },
      { x: 540, y: 395, r: 4 },
      { x: 575, y: 400, r: 3 },
    ],
  },
  {
    name: 'Job Applications',
    cx: 850,
    cy: 320,
    stars: [
      { x: 835, y: 300, r: 3.5 },
      { x: 870, y: 310, r: 4 },
      { x: 845, y: 340, r: 3 },
    ],
  },
];

/** Build line segments connecting all adjacent stars in a cluster */
function buildEdges(stars: Star[]): [number, number, number, number][] {
  const edges: [number, number, number, number][] = [];
  for (let i = 0; i < stars.length - 1; i++) {
    edges.push([stars[i].x, stars[i].y, stars[i + 1].x, stars[i + 1].y]);
  }
  // Close partial loops for richer visuals (connect last to first when >= 4 stars)
  if (stars.length >= 4) {
    edges.push([stars[stars.length - 1].x, stars[stars.length - 1].y, stars[0].x, stars[0].y]);
  }
  return edges;
}

export function ClustersMap() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const mapY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section
      ref={sectionRef}
      className="landing-section clusters-section"
      id="clusters"
    >
      <div className="section-header">
        <span className="section-label">ORGANIZE YOUR UNIVERSE</span>
        <h2 className="section-title">Build your clusters</h2>
        <p className="section-subtitle">
          Group discoveries into clusters — categories that map your
          knowledge universe.
        </p>
      </div>

      <motion.div className="clusters-map" style={{ y: mapY }}>
        <svg viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet">
          {CLUSTERS.map((c, ci) => {
            const edges = buildEdges(c.stars);

            return (
              <g key={c.name}>
                {/* Connecting lines */}
                {edges.map(([x1, y1, x2, y2], li) => {
                  const len = Math.hypot(x2 - x1, y2 - y1);
                  return (
                    <motion.line
                      key={`line-${ci}-${li}`}
                      className="cluster-line"
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      strokeDasharray={len}
                      initial={{ strokeDashoffset: len }}
                      whileInView={{ strokeDashoffset: 0 }}
                      viewport={{ once: true, margin: '-60px' }}
                      transition={{
                        duration: 0.3,
                        delay: ci * 0.04 + li * 0.02,
                        ease: 'easeOut',
                      }}
                    />
                  );
                })}

                {/* Stars */}
                {c.stars.map((s, si) => (
                  <motion.circle
                    key={`star-${ci}-${si}`}
                    className={`cluster-star${si === 0 ? ' cluster-star--pulse' : ''}`}
                    cx={s.x}
                    cy={s.y}
                    r={s.r}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{
                      duration: 0.2,
                      delay: ci * 0.04 + si * 0.03,
                      ease: [0.34, 1.56, 0.64, 1], // slight overshoot
                    }}
                  />
                ))}

                {/* Label */}
                <motion.text
                  className="cluster-label"
                  x={c.cx}
                  y={c.cy + 50}
                  textAnchor="middle"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.2, delay: ci * 0.04 + 0.1 }}
                >
                  {c.name}
                </motion.text>
              </g>
            );
          })}
        </svg>
      </motion.div>
    </section>
  );
}
