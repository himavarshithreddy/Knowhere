import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react() as any,
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo-square.svg", "favicon.svg", "knowhere-logo-dark.svg", "knowhere-logo-light.svg"],
      manifest: {
        name: "Knowhere",
        short_name: "Knowhere",
        description: "Your private knowledge vault, floating somewhere in the universe.",
        theme_color: "#10141D",
        background_color: "#10141D",
        display: "standalone",
        icons: [
          {
            src: "logo-square.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true }
    }
  },
  test: { environment: "jsdom", globals: true, setupFiles: "./src/test/setup.ts" }
});
