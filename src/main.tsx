import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import "./index.css";

if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}

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
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
