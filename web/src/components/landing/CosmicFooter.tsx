import { motion } from "framer-motion";

export function CosmicFooter() {
  return (
    <footer className="cosmic-footer" id="footer">
      <div className="footer-glow" aria-hidden="true" />
      <div className="footer-grid-pattern" aria-hidden="true" />

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
            <br />
            developed by <a href="https://github.com/himavarshithreddy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>Himavarshith Reddy</a>
          </p>
          <p className="footer-coords-stamp">SYSTEM STATUS: SECURE // OPERATIONAL</p>
        </div>
      </div>
    </footer>
  );
}
