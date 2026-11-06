import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Car, Search, X } from "lucide-react";
import type { Vehicule } from "@/types";

/** Clé de recherche : majuscules, sans espaces ni tirets (« aa-512-ys » = « AA 512 YS »). */
const cle = (t: string) => t.toUpperCase().replace(/[^A-Z0-9]/g, "");
const libelle = (v: Vehicule) => [v.marque, v.modele].filter(Boolean).join(" ");
const MAX = 8;

/**
 * Champ de recherche d'un véhicule de la flotte (plaque, marque, modèle), à la place d'une
 * longue liste déroulante. Valeur vide = aucun véhicule attribué.
 * Clavier : ↑ ↓ pour parcourir, Entrée pour choisir, Échap pour fermer.
 */
export default function RechercheVehicule({ id, vehicules, valeur, onChange }: {
  id?: string;
  vehicules: Vehicule[];
  valeur: string;                    // plaque choisie ou ""
  onChange: (plaque: string) => void;
}) {
  const listeId = useId();
  const [texte, setTexte] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(0);
  const zone = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLInputElement>(null);

  const choisi = vehicules.find(v => v.plaque_immatriculation === valeur);

  const resultats = useMemo(() => {
    const k = cle(texte);
    const mots = texte.toLowerCase().split(/\s+/).filter(Boolean);
    const liste = !texte.trim() ? vehicules : vehicules.filter(v =>
      cle(v.plaque_immatriculation).includes(k)
      || mots.every(m => `${v.plaque_immatriculation} ${libelle(v)}`.toLowerCase().includes(m)));
    return liste.slice(0, MAX);
  }, [texte, vehicules]);

  // Clic en dehors : fermer la liste
  useEffect(() => {
    if (!ouvert) return;
    const f = (e: MouseEvent) => { if (!zone.current?.contains(e.target as Node)) setOuvert(false); };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, [ouvert]);

  const choisir = (v: Vehicule) => { onChange(v.plaque_immatriculation); setTexte(""); setOuvert(false); };
  const effacer = () => { onChange(""); setTexte(""); setOuvert(true); window.setTimeout(() => champ.current?.focus(), 0); };

  const clavier = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOuvert(true); setActif(a => Math.min(a + 1, resultats.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActif(a => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && ouvert && resultats[actif]) { e.preventDefault(); choisir(resultats[actif]); }
    else if (e.key === "Escape" && ouvert) { e.stopPropagation(); setOuvert(false); }
  };

  // Véhicule choisi : affiché comme une étiquette, avec « changer »
  if (valeur && !ouvert) {
    return (
      <div className="input-base flex items-center gap-2 !py-2">
        <Car size={16} className="text-camublue-900 shrink-0" aria-hidden />
        <span className="font-semibold text-gray-900">{valeur}</span>
        {choisi && libelle(choisi) && <span className="text-sm text-gray-500 truncate">— {libelle(choisi)}</span>}
        <button type="button" onClick={effacer} aria-label="Retirer le véhicule"
          className="ml-auto w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center">
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div ref={zone} className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden />
      <input id={id} ref={champ} type="text" value={texte} autoComplete="off"
        placeholder="Rechercher une plaque, une marque… (vide = aucun véhicule)"
        role="combobox" aria-expanded={ouvert} aria-controls={listeId} aria-autocomplete="list"
        aria-activedescendant={ouvert && resultats[actif] ? `${listeId}-${actif}` : undefined}
        onFocus={() => setOuvert(true)}
        onChange={e => { setTexte(e.target.value); setActif(0); setOuvert(true); }}
        onKeyDown={clavier}
        className="input-base !pl-9" />
      {ouvert && (
        <ul id={listeId} role="listbox"
          className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto rounded-xl bg-white shadow-lg ring-1 ring-gray-200 py-1">
          {resultats.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-gray-500">
              {vehicules.length ? `Aucun véhicule ne correspond à « ${texte.trim()} ».` : "Chargement des véhicules…"}
            </li>
          ) : resultats.map((v, i) => (
            <li key={v.id} id={`${listeId}-${i}`} role="option" aria-selected={i === actif}
              onMouseDown={e => { e.preventDefault(); choisir(v); }} onMouseEnter={() => setActif(i)}
              className={`px-3 py-2 cursor-pointer flex items-baseline gap-2 ${i === actif ? "bg-camublue-900/10" : ""}`}>
              <span className="font-semibold text-gray-900">{v.plaque_immatriculation}</span>
              {libelle(v) && <span className="text-sm text-gray-500 truncate">{libelle(v)}</span>}
            </li>
          ))}
          {vehicules.length > MAX && resultats.length === MAX && (
            <li className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100">Tapez pour affiner la recherche…</li>
          )}
        </ul>
      )}
    </div>
  );
}
