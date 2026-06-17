import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import { MotionConfig } from "framer-motion";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>
);
