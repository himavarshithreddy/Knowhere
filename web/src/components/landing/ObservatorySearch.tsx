import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";

const QUERIES = [
  "React performance patterns",
  "design inspiration board",
  "machine learning papers",
  "startup fundraising notes",
];

const RESULTS = [
  {
    title: "React Server Components Deep Dive",
    badge: "Article",
    snippet: "Saved 3 weeks ago from blog.vercel.com",
  },
  {
    title: "Component Architecture Patterns",
    badge: "YouTube",
    snippet: "Saved 2 months ago from youtube.com",
  },
  {
    title: "Performance Optimization Thread",
    badge: "X Post",
    snippet: "Saved last week from x.com",
  },
];

/** Generates deterministic positions for dots scattered inside the lens. */
function generateDots(count: number) {
  const dots: { x: number; y: number; size: number }[] = [];
  for (let i = 0; i < count; i++) {
    // Keep dots within a circle (polar → cartesian, r capped at 42% of container)
    const angle = (i / count) * Math.PI * 2 + i * 1.618;
    const r = 10 + ((i * 37 + 13) % 33);
    const x = 50 + r * Math.cos(angle);
    const y = 50 + r * Math.sin(angle);
    const size = 2 + (i % 3);
    dots.push({ x, y, size });
  }
  return dots;
}

const DOTS = generateDots(14);

const TYPING_SPEED = 65; // ms per character
const PAUSE_AFTER_QUERY = 2000;
const PAUSE_BEFORE_CLEAR = 400;

export function ObservatorySearch() {
  const [litDots, setLitDots] = useState<Set<number>>(new Set());
  const [typed, setTyped] = useState("");
  const [showResults, setShowResults] = useState(false);
  const queryIndex = useRef(0);
  const charIndex = useRef(0);
  const phase = useRef<"typing" | "pausing" | "clearing">("typing");

  // Dot illumination cycle — light up 2-3 random dots every 800ms
  useEffect(() => {
    const id = setInterval(() => {
      const next = new Set<number>();
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        next.add(Math.floor(Math.random() * DOTS.length));
      }
      setLitDots(next);
    }, 800);
    return () => clearInterval(id);
  }, []);

  // Auto-typing effect
  const tick = useCallback(() => {
    const query = QUERIES[queryIndex.current];

    if (phase.current === "typing") {
      if (charIndex.current <= query.length) {
        setTyped(query.slice(0, charIndex.current));
        charIndex.current++;

        if (charIndex.current > query.length) {
          phase.current = "pausing";
          setShowResults(true);
          return PAUSE_AFTER_QUERY;
        }
        return TYPING_SPEED;
      }
    }

    if (phase.current === "pausing") {
      phase.current = "clearing";
      setShowResults(false);
      return PAUSE_BEFORE_CLEAR;
    }

    if (phase.current === "clearing") {
      phase.current = "typing";
      charIndex.current = 0;
      queryIndex.current = (queryIndex.current + 1) % QUERIES.length;
      setTyped("");
      return TYPING_SPEED * 3;
    }

    return TYPING_SPEED;
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = tick();
      timer = setTimeout(schedule, delay);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [tick]);

  return (
    <section className="landing-section observatory-section" id="observatory">
      <motion.div
        className="section-header"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
      >
        <span className="section-label">FIND ANYTHING</span>
        <h2 className="section-title">The Observatory</h2>
        <p className="section-subtitle">
          Search by meaning, not just keywords. Find what you saved, when you
          need it.
        </p>
      </motion.div>

      <div className="observatory-visual">
        <motion.div
          className="observatory-lens"
          initial={{ scale: 0.85, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="observatory-beam" />
          {DOTS.map((dot, i) => (
            <span
              key={i}
              className={`observatory-dot${litDots.has(i) ? " lit" : ""}`}
              style={{
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                width: dot.size,
                height: dot.size,
              }}
            />
          ))}
        </motion.div>

        <motion.div
          className="observatory-search-bar"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <input
            className="observatory-input"
            value={typed}
            readOnly
            placeholder="Search your universe…"
          />
        </motion.div>

        <div className="observatory-results">
          {RESULTS.map((result, i) => (
            <motion.div
              key={result.title}
              className="observatory-result-card"
              initial={{ opacity: 0, y: 24 }}
              animate={showResults ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              transition={{ duration: 0.35, delay: i * 0.1 }}
            >
              <div className="observatory-result-header">
                <span className="observatory-result-title">{result.title}</span>
                <span className="observatory-result-badge">{result.badge}</span>
              </div>
              <span className="observatory-result-snippet">{result.snippet}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
