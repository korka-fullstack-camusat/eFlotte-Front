import { ChevronRight } from "lucide-react";
import type { RapportResume } from "@/types";
import { StatutRapport, TYPE_RAPPORT_LABELS, formatDate, formatKm } from "./utils";

export default function RapportCarte({ rapport, onClick }: { rapport: RapportResume; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full text-left rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 hover:ring-camublue-900/30 transition flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-800">{rapport.immatriculation}</span>
          <StatutRapport rapport={rapport} />
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {TYPE_RAPPORT_LABELS[rapport.type_rapport] ?? rapport.type_rapport} · {formatDate(rapport.created_at, true)} · {formatKm(rapport.kilometrage)}
        </p>
      </div>
      <ChevronRight size={18} className="text-gray-300 shrink-0" aria-hidden />
    </button>
  );
}
