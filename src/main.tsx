import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { AnneeProvider } from "./contexts/AnneeContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { invalidateAll } from "./lib/apiCache";
import "./index.css";

if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}

// Toute modification (import, ajout, édition, suppression, connexion) rend les données
// gardées en cache obsolètes : on les oublie pour ne jamais réafficher d'anciens chiffres
axios.interceptors.response.use(res => {
  const methode = (res.config.method ?? "get").toLowerCase();
  if (methode !== "get" && methode !== "head") invalidateAll();
  return res;
});

// Garde le backend Render éveillé (évite le cold start de 30s sur le free tier)
function startKeepAlive() {
  const ping = () => axios.get("/api/health").catch(() => {});
  ping(); // ping immédiat au démarrage
  setInterval(ping, 14 * 60 * 1000); // toutes les 14 minutes
}
startKeepAlive();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AnneeProvider>
            <App />
          </AnneeProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
