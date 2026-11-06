import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Fichier sans dépendance aux types Node (pas de path / process / __dirname) :
// il se vérifie sans erreur même sans @types/node.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const dossierSrc = decodeURIComponent(new URL("./src", import.meta.url).pathname);

// Renvois vers l'API (port 8050) : /api, et /telechargements (APK de l'application mobile)
const cible = env.VITE_PROXY_TARGET ?? "http://localhost:8050";
const proxy = {
  "/api": { target: cible, changeOrigin: true },
  "/telechargements": { target: cible, changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": dossierSrc },
  },
  server: {
    port: 5175,
    host: "0.0.0.0",
    proxy,
  },
  // « vite preview » : mêmes renvois
  preview: { port: 5175, host: "0.0.0.0", proxy },
});
