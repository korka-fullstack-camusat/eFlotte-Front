import { useEffect, useState } from "react";
import { inspectionService } from "@/services/inspections";
import type { ChecklistModele } from "@/types";

let cache: Promise<ChecklistModele> | null = null;

/** Modèle du formulaire (sections, points, photos) — chargé une fois par session. */
export function useModele() {
  const [modele, setModele] = useState<ChecklistModele | null>(null);
  const [erreur, setErreur] = useState(false);
  useEffect(() => {
    let actif = true;
    cache ??= inspectionService.modele();
    cache
      .then(m => { if (actif) setModele(m); })
      .catch(() => { cache = null; if (actif) setErreur(true); });
    return () => { actif = false; };
  }, []);
  return { modele, erreur };
}
