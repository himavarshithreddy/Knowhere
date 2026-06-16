import { motion } from "framer-motion";

/* Two rows of content types flowing in opposite directions */
const ROW_1 = [
  { label: "Instagram Reels", icon: "◎" },
  { label: "YouTube Videos", icon: "▶" },
  { label: "LinkedIn Posts", icon: "in" },
  { label: "Podcasts", icon: "◉" },
  { label: "Screenshots", icon: "⊞" },
  { label: "Bookmarks", icon: "◆" },
];

const ROW_2 = [
  { label: "X Posts", icon: "✕" },
  { label: "Articles", icon: "▤" },
  { label: "Websites", icon: "◈" },
  { label: "Notes", icon: "✎" },
  { label: "Ideas", icon: "✦" },
  { label: "Research Papers", icon: "◫" },
];

function MarqueeRow({
  items,
  reverse = false,
  speed = "40s",
}: {
  items: typeof ROW_1;
  reverse?: boolean;
  speed?: string;
}) {
  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className={`marquee-track ${reverse ? "marquee-track--reverse" : ""}`}>
      <div
        className="marquee-inner"
        style={{ "--marquee-speed": speed } as React.CSSProperties}
      >
        {doubled.map((item, i) => (
          <div className="marquee-chip" key={`${item.label}-${i}`}>
            <span className="marquee-chip-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="marquee-chip-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const sectionReveal = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function DiscoveriesFlow() {
  return (
    <section className="landing-section discoveries-section" id="discoveries">
      <motion.div
        className="discoveries-header"
        variants={sectionReveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-51px" }}
      >
        <span className="section-label">What you collect</span>
        <h2 className="section-title">
          Discoveries across the universe
        </h2>
        <p className="section-subtitle">
          Everything worth remembering, from every corner of the internet.
        </p>
      </motion.div>

      <div className="marquee-container">
        <div className="marquee-fade marquee-fade--left" aria-hidden="true" />
        <div className="marquee-fade marquee-fade--right" aria-hidden="true" />
        <MarqueeRow items={ROW_1} speed="35s" />
        <MarqueeRow items={ROW_2} reverse speed="42s" />
      </div>
    </section>
  );
}
