import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";

const NOTIFICATIONS = [
  "TIME TO WORK. Complete your 'Finish AI Feature' mission.",
  "Stop procrastinating. Your 3 saved articles are waiting.",
  "You set an intent. Now execute it. Open your dashboard.",
];

export function MissionsControl() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % NOTIFICATIONS.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="landing-section missions-section" id="missions">
      <motion.div 
        className="section-header"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-68px" }}
        transition={{ duration: 0.6 }}
      >
        <span className="section-label">Intent Tracking</span>
        <h2 className="section-title">Crush Procrastination</h2>
        <p className="section-subtitle">
          Set your missions. Knowhere will send uncompromising, intense push notifications to force you into action. No more bookmark bankruptcy.
        </p>
      </motion.div>

      <div className="missions-visual" style={{ position: 'relative', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
            className="mission-notification-card"
            style={{
              backgroundColor: 'var(--color-surface, #1e222d)',
              border: '1px solid var(--color-border, #2d3342)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              maxWidth: '400px',
              width: '100%'
            }}
          >
            <div style={{ backgroundColor: 'var(--color-primary, #d89b4a)', color: '#000', borderRadius: '50%', padding: '12px', flexShrink: 0 }}>
              <Bell size={24} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted, #8a93a6)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Knowhere Push System</div>
              <div style={{ fontSize: '15px', color: 'var(--color-text, #e8dfc8)', lineHeight: 1.4 }}>{NOTIFICATIONS[index]}</div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
