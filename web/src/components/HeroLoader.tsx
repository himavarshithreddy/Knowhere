import { motion } from "framer-motion";
import { BrandMark } from "./BrandMark";
import "./HeroLoader.css";

export function HeroLoader() {
  return (
    <div className="hero-loader-wrapper">
      
      {/* 1. Fast horizontal beam that snaps across the screen, then expands vertically to engulf it */}
      <motion.div
        className="hero-fullscreen-flash"
        initial={{ scaleX: 0, scaleY: 1, opacity: 0 }}
        animate={{ 
          scaleX: [0, 1, 1], 
          scaleY: [1, 1, 2500],
          opacity: [0, 1, 1] 
        }}
        transition={{ duration: 0.5, times: [0, 0.4, 1], ease: "easeIn" }}
      />
      
      {/* 2. Expanding Supernova Orb */}
      <motion.div 
        className="hero-loader-supernova"
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: [0, 40], opacity: [1, 1] }}
        transition={{ duration: 0.5, ease: "easeIn", delay: 0.1 }}
      />

      {/* 3. The Brand Mark slamming in, glowing aggressively */}
      <motion.div 
        initial={{ scale: 8, opacity: 0, filter: "blur(40px)" }}
        animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{ zIndex: 100 }}
      >
        <div className="hero-loader-core">
          <BrandMark compact className="hero-loader-brand" />
        </div>
      </motion.div>
    </div>
  );
}
