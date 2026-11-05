import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { demandeService } from "@/services/demandes";

/**
 * Nombre de demandes chauffeurs « nouvelles » (remontée, panne, vidange), partagé par
 * toutes les pages : une seule interrogation de l'API toutes les 30 s, quel que soit le
 * nombre de cloches affichées. Une alerte s'affiche quand une demande arrive.
 */
const INTERVALLE = 30_000;

let valeur: number | null = null;
let minuterie: number | undefined;
const abonnes = new Set<(n: number | null) => void>();

async function rafraichir() {
  try {
    const { nouvelles } = await demandeService.stats();
    if (valeur !== null && nouvelles > valeur) {
      const n = nouvelles - valeur;
      toast(`${n} nouvelle${n > 1 ? "s" : ""} demande${n > 1 ? "s" : ""} chauffeur`, { icon: "🔔", duration: 6000 });
    }
    valeur = nouvelles;
    abonnes.forEach(f => f(valeur));
  } catch {
    // réseau ou session expirée : on garde la dernière valeur connue
  }
}

/** Relit le compteur tout de suite (ex. après avoir traité une demande). */
export function rafraichirDemandesNouvelles() {
  void rafraichir();
}

export function useDemandesNouvelles(): number | null {
  const [n, setN] = useState<number | null>(valeur);
  useEffect(() => {
    abonnes.add(setN);
    if (abonnes.size === 1) {
      void rafraichir();
      minuterie = window.setInterval(rafraichir, INTERVALLE);
    }
    return () => {
      abonnes.delete(setN);
      if (abonnes.size === 0) window.clearInterval(minuterie);
    };
  }, []);
  return n;
}
