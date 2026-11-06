import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// API (et Caddy) : /api, et /telechargements (APK de l'application mobile, servi par Caddy)
const cible = process.env.VITE_PROXY_TARGET ?? "http://localhost:8050";
const proxy = {
  "/api": { target: cible, changeOrigin: true },
  "/telechargements": { target: cible, changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5175,
    host: "0.0.0.0",
    proxy,
  },
  // « vite preview » : mêmes renvois
  preview: { port: 5175, host: "0.0.0.0", proxy },
});
