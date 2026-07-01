import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react() as any,
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
        type: "module"
      },
      includeAssets: ["logo-square.svg", "logo-maskable.svg", "favicon.svg", "knowhere-logo-dark.svg", "knowhere-logo-light.svg", "notification-badge.svg", "push-icon.svg"],
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
            purpose: "any"
          },
          {
            src: "logo-maskable.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable"
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
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
