import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useDemandesNouvelles } from "./useDemandesNouvelles";

/** Cloche de notification : demandes chauffeurs en attente de traitement. */
export default function ClocheDemandes({ className = "", onClick }: { className?: string; onClick?: () => void }) {
  const n = useDemandesNouvelles() ?? 0;
  const libelle = n
    ? `${n} nouvelle${n > 1 ? "s" : ""} demande${n > 1 ? "s" : ""} chauffeur`
    : "Aucune nouvelle demande chauffeur";
  return (
    <Link to="/demandes" onClick={onClick} aria-label={libelle} title={libelle} data-testid="cloche-demandes"
      className={`relative inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white text-camublue-900 ring-1 ring-gray-200 shadow-sm hover:bg-camublue-900/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-camublue-900 ${className}`}>
      <Bell size={19} aria-hidden />
      {n > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold leading-5 text-center ring-2 ring-white" aria-hidden>
          {n > 99 ? "99+" : n}
        </span>
      )}
    </Link>
  );
}
