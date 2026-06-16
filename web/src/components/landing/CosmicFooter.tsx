import { motion } from "framer-motion";

export function CosmicFooter() {
  return (
    <footer className="cosmic-footer" id="footer">
      <div className="footer-glow" aria-hidden="true" />
      <div className="footer-grid-pattern" aria-hidden="true" />

      <motion.div
        className="footer-cta-card"
        initial={{ opacity: 0, y: 36, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="footer-cta-glow" aria-hidden="true" />
        <h2 className="footer-cta-title">Ready to catalog your universe?</h2>
        <p className="footer-cta-subtitle">
          Secure your coordinates and start building your private knowledge vault today.
        </p>

        <div className="footer-cta-buttons">
          <a href="#enter" className="footer-btn footer-btn--primary">
            Get Started Free
          </a>
          <a href="#discoveries" className="footer-btn footer-btn--secondary">
            How it works
          </a>
        </div>
      </motion.div>

      <div className="footer-bottom-grid">
        <div className="footer-brand-section">
          <span className="footer-brand">
            Knowhere<span className="footer-brand-dot" aria-hidden="true" />
          </span>
          <p className="footer-tagline">
            One station. One collection. Yours alone.
          </p>
        </div>

        <div className="footer-links-section">
          <div className="footer-links-column">
            <h4>Vault</h4>
            <a href="#enter">Claim Coords</a>
            <a href="#enter">Dock Station</a>
            <a href="/recover">Recover Coords</a>
          </div>
          <div className="footer-links-column">
            <h4>Explore</h4>
            <a href="#discoveries">Discoveries</a>
            <a href="#clusters">Clusters</a>
            <a href="#observatory">Observatory</a>
          </div>
        </div>

        <div className="footer-meta-section">
          <p className="footer-copy">
            © 2026 Knowhere. A place for everything you've discovered.
          </p>
          <p className="footer-coords-stamp">SYSTEM STATUS: SECURE // OPERATIONAL</p>
        </div>
      </div>
    </footer>
  );
}
