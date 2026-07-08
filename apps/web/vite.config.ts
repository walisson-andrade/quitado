import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Só cache de app-shell/assets estáticos + leitura offline dos dados já
      // sincronizados (IndexedDB) — sem fila de escrita offline, fora de escopo do v1.
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: { cacheName: "quitado-api-cache", networkTimeoutSeconds: 5 },
          },
        ],
      },
      manifest: {
        name: "Quitado",
        short_name: "Quitado",
        description: "Seu dinheiro, sem mistério",
        theme_color: "#0b1120",
        background_color: "#0b1120",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:3011",
        changeOrigin: true,
      },
    },
  },
});
