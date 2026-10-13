import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

/**
 * Année consultée sur la plateforme de gestion. Chaque fichier importé correspond à une
 * année ; l'API filtre toutes les données annuelles (listes, KPIs, graphiques, exports)
 * sur le paramètre ?annee= que l'intercepteur ci-dessous ajoute à chaque appel.
 */

const CLE = "eflotte_annee";
const ANNEE_EN_COURS = new Date().getFullYear();

// Appels non concernés : authentification, app chauffeur, liste des années, santé
const EXCLUS = ["/api/auth", "/api/inspections", "/api/annees", "/api/health"];

let anneeActive: number | null = null;

axios.interceptors.request.use(config => {
  const url = config.url ?? "";
  if (anneeActive && url.startsWith("/api/") && !EXCLUS.some(p => url.startsWith(p))
      && !/[?&]annee=/.test(url) && !(config.params && "annee" in config.params)) {
    config.params = { ...(config.params ?? {}), annee: anneeActive };
  }
  return config;
});

function lireAnnee(): number {
  try {
    const n = Number(localStorage.getItem(CLE));
    return n >= 2015 && n <= 2100 ? n : ANNEE_EN_COURS;
  } catch {
    return ANNEE_EN_COURS;
  }
}

interface AnneeContextType {
  annee: number;
  annees: number[];
  setAnnee: (a: number) => void;
  rafraichirAnnees: () => void;
}

const AnneeContext = createContext<AnneeContextType | null>(null);

export function AnneeProvider({ children }: { children: ReactNode }) {
  const { token, isChauffeur } = useAuth();
  const [annee, setAnneeState] = useState<number>(() => {
    const a = lireAnnee();
    anneeActive = a;
    return a;
  });
  const [annees, setAnnees] = useState<number[]>([ANNEE_EN_COURS]);

  // Pas de filtre d'année pour l'app chauffeur ni hors connexion
  anneeActive = token && !isChauffeur ? annee : null;

  const rafraichirAnnees = useCallback(() => {
    if (!token || isChauffeur) return;
    axios.get<number[]>("/api/annees")
      .then(({ data }) => setAnnees(Array.from(new Set([...data, ANNEE_EN_COURS])).sort((a, b) => b - a)))
      .catch(() => {});
  }, [token, isChauffeur]);
  useEffect(rafraichirAnnees, [rafraichirAnnees]);

  const setAnnee = (a: number) => {
    anneeActive = a;
    setAnneeState(a);
    try { localStorage.setItem(CLE, String(a)); } catch { /* stockage indisponible */ }
  };

  return (
    <AnneeContext.Provider value={{ annee, annees, setAnnee, rafraichirAnnees }}>
      {children}
    </AnneeContext.Provider>
  );
}

export function useAnnee() {
  const ctx = useContext(AnneeContext);
  if (!ctx) throw new Error("useAnnee doit être utilisé dans AnneeProvider");
  return ctx;
}

/** Années proposées pour un import : celles qui ont des données + l'année suivante et les 3 précédentes. */
export function anneesImport(annees: number[]): number[] {
  const set = new Set(annees);
  for (let a = ANNEE_EN_COURS + 1; a >= ANNEE_EN_COURS - 3; a--) set.add(a);
  return Array.from(set).sort((a, b) => b - a);
}
