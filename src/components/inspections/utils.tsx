import { AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import type { RapportResume } from "@/types";

export const TYPE_RAPPORT_LABELS: Record<string, string> = {
  INSPECTION: "Inspection",
  RESTITUTION: "Restitution",
};

export function formatDate(iso: string | null | undefined, avecHeure = false): string {
  if (!iso) return "—";
  // "YYYY-MM-DD" seul = date locale (sans décalage de fuseau)
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    ...(avecHeure ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatKm(km: number): string {
  return `${km.toLocaleString("fr-FR")} km`;
}

/** Conforme / anomalies / critique — même règle que le filtre `statut` de l'API. */
export function StatutRapport({ rapport, compact = false }: { rapport: Pick<RapportResume, "nb_non_conformes" | "nb_critiques">; compact?: boolean }) {
  if (rapport.nb_critiques > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 whitespace-nowrap">
        <AlertTriangle size={12} aria-hidden />
        {compact ? rapport.nb_critiques : `${rapport.nb_critiques} critique${rapport.nb_critiques > 1 ? "s" : ""}`}
      </span>
    );
  }
  if (rapport.nb_non_conformes > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 whitespace-nowrap">
        <AlertCircle size={12} aria-hidden />
        {compact ? rapport.nb_non_conformes : `${rapport.nb_non_conformes} anomalie${rapport.nb_non_conformes > 1 ? "s" : ""}`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 whitespace-nowrap">
      <CheckCircle2 size={12} aria-hidden /> Conforme
    </span>
  );
}
