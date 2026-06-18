import { useState } from "react";
import { X, Calendar } from "lucide-react";

export type ChartFilterMode = "mois" | "annee" | "perso";

export interface ChartFilter {
  mode: ChartFilterMode;
  annee?: number;
  mois?: number;       // 1-12
  date_debut?: string; // YYYY-MM-DD
  date_fin?: string;   // YYYY-MM-DD
}

export const CHART_FILTER_EMPTY: ChartFilter = { mode: "annee" };

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - i);
const MOIS_LABELS = ["","Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

interface Props {
  filter: ChartFilter;
  onChange: (f: ChartFilter) => void;
}

export default function ChartFilterBar({ filter, onChange }: Props) {
  /* mini-modal Personnalisé */
  const [showPerso, setShowPerso] = useState(false);
  const [draftDebut, setDraftDebut] = useState(filter.date_debut ?? "");
  const [draftFin,   setDraftFin]   = useState(filter.date_fin   ?? "");

  const setMode = (mode: ChartFilterMode) => {
    if (mode === "perso") {
      setDraftDebut(filter.date_debut ?? "");
      setDraftFin(filter.date_fin     ?? "");
      setShowPerso(true);
      return;
    }
    onChange({ mode, annee: filter.annee });
  };

  const applyPerso = () => {
    onChange({ mode: "perso", date_debut: draftDebut || undefined, date_fin: draftFin || undefined });
    setShowPerso(false);
  };

  const clearPerso = () => {
    onChange(CHART_FILTER_EMPTY);
    setShowPerso(false);
  };

  const set = (key: keyof ChartFilter, value: any) =>
    onChange({ ...filter, [key]: value || undefined });

  /* label résumé du filtre actif */
  const activeLabel = (() => {
    if (filter.mode === "perso" && (filter.date_debut || filter.date_fin)) {
      const a = filter.date_debut ? new Date(filter.date_debut).toLocaleDateString("fr-FR", { day:"2-digit", month:"short" }) : "…";
      const b = filter.date_fin   ? new Date(filter.date_fin  ).toLocaleDateString("fr-FR", { day:"2-digit", month:"short" }) : "…";
      return `${a} → ${b}`;
    }
    return null;
  })();

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Mode tabs */}
        <div className="flex items-center bg-white/20 rounded-lg p-0.5 text-xs font-medium">
          {(["mois","annee","perso"] as ChartFilterMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded-md transition whitespace-nowrap ${
                filter.mode === m
                  ? "bg-white text-camublue-900 shadow-sm font-semibold"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {m === "mois" ? "Mois" : m === "annee" ? "Année" : "Personnalisé"}
            </button>
          ))}
        </div>

        {/* Année */}
        {(filter.mode === "mois" || filter.mode === "annee") && (
          <select
            value={filter.annee ?? ""}
            onChange={e => set("annee", e.target.value ? Number(e.target.value) : undefined)}
            className="bg-white/20 border border-white/30 text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-white/50 w-24"
          >
            <option value="" className="text-gray-800">Toutes</option>
            {YEARS.map(y => <option key={y} value={y} className="text-gray-800">{y}</option>)}
          </select>
        )}

        {/* Mois */}
        {filter.mode === "mois" && (
          <select
            value={filter.mois ?? ""}
            onChange={e => set("mois", e.target.value ? Number(e.target.value) : undefined)}
            disabled={!filter.annee}
            className="bg-white/20 border border-white/30 text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-white/50 w-20 disabled:opacity-50"
          >
            <option value="" className="text-gray-800">Tous</option>
            {MOIS_LABELS.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1} className="text-gray-800">{m}</option>
            ))}
          </select>
        )}

        {/* Badge période personnalisée active */}
        {filter.mode === "perso" && activeLabel && (
          <span className="flex items-center gap-1 text-xs text-white/90 bg-white/20 border border-white/30 rounded-lg px-2 py-1">
            <Calendar size={11} /> {activeLabel}
          </span>
        )}

        {/* Reset */}
        {(filter.annee || filter.mois || filter.date_debut || filter.date_fin) && (
          <button
            onClick={() => onChange(CHART_FILTER_EMPTY)}
            className="text-white/60 hover:text-white transition"
            title="Réinitialiser"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Mini-modal Personnalisé ───────────────────────────── */}
      {showPerso && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-camublue-900" />
                <h3 className="text-sm font-bold text-camublue-900">Période personnalisée</h3>
              </div>
              <button onClick={() => setShowPerso(false)} className="p-1 hover:bg-gray-100 rounded-lg transition">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Date de début</label>
                <input
                  type="date"
                  value={draftDebut}
                  onChange={e => setDraftDebut(e.target.value)}
                  className="input-base w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Date de fin</label>
                <input
                  type="date"
                  value={draftFin}
                  min={draftDebut}
                  onChange={e => setDraftFin(e.target.value)}
                  className="input-base w-full text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
              <button
                onClick={clearPerso}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium transition"
              >
                Réinitialiser
              </button>
              <button
                onClick={applyPerso}
                disabled={!draftDebut && !draftFin}
                className="px-5 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-50"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Helper : filtre client-side par date ─────────────────── */
export function applyChartFilter<T>(
  rows: T[],
  filter: ChartFilter,
  getDate: (row: T) => string | null | undefined
): T[] {
  if (!filter.annee && !filter.date_debut && !filter.date_fin) return rows;
  return rows.filter(row => {
    const raw = getDate(row);
    if (!raw) return false;
    const d = raw.slice(0, 10);
    if (filter.mode === "annee" && filter.annee)
      return d.startsWith(String(filter.annee));
    if (filter.mode === "mois" && filter.annee) {
      if (!filter.mois) return d.startsWith(String(filter.annee));
      return d.startsWith(`${filter.annee}-${String(filter.mois).padStart(2,"0")}`);
    }
    if (filter.mode === "perso") {
      if (filter.date_debut && d < filter.date_debut) return false;
      if (filter.date_fin   && d > filter.date_fin)   return false;
      return true;
    }
    return true;
  });
}
