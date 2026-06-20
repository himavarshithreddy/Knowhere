import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const NARRATIVES = [
  'Nebula watches what you search and build.',
  'It automatically surfaces just-in-time discoveries from your past.',
  'Track your Knowledge Activation Rate and never hoard unused links again.',
] as const;

/** Generate evenly distributed dot positions around a ring */
function ringDots(count: number, radius: number): { x: number; y: number }[] {
  const dots: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    dots.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }
  return dots;
}

const RINGS = [
  { radius: 60, dots: ringDots(4, 60), delay: 0 },
  { radius: 120, dots: ringDots(9, 120), delay: 0.15 },
  { radius: 200, dots: ringDots(18, 200), delay: 0.3 },
] as const;

export function MemoryNebula() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  // Subtle scroll-linked scale boost for the visual
  const visualScale = useTransform(scrollYProgress, [0.2, 0.6], [0.92, 1]);

  return (
    <section
      ref={sectionRef}
      className="landing-section nebula-section"
      id="nebula"
    >
      <div className="nebula-content">
        {/* Text column */}
        <div className="nebula-text">

          <span className="section-label" style={{ display: 'block', marginBottom: '16px' }}>Nebula</span>
          <h2 className="section-title">Just-in-Time Surfacing</h2>

          {NARRATIVES.map((text, i) => (
            <motion.p
              key={i}
              className="nebula-paragraph"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-51px' }}
              transition={{
                duration: 0.6,
                delay: i * 0.15,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {text}
            </motion.p>
          ))}
        </div>

        {/* Visual column — concentric rings */}
        <motion.div className="nebula-visual" style={{ scale: visualScale }}>
          {/* Core dot */}
          <motion.span
            className="nebula-core"
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true, margin: '-51px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />

          {RINGS.map((ring, ri) => (
            <motion.div
              key={ri}
              className={`nebula-ring nebula-ring--${ri}`}
              style={{
                width: ring.radius * 2,
                height: ring.radius * 2,
              }}
              initial={{ scale: 0.3, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true, margin: '-51px' }}
              transition={{
                duration: 0.8,
                delay: ring.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {ring.dots.map((dot, di) => (
                <span
                  key={di}
                  className="nebula-dot"
                  style={{
                    // Position relative to the ring center
                    left: `calc(50% + ${dot.x}px)`,
                    top: `calc(50% + ${dot.y}px)`,
                  }}
                />
              ))}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
