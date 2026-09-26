import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Loader2, RefreshCw } from "lucide-react";
import ChauffeurLayout from "@/components/inspections/ChauffeurLayout";
import RapportDetailModal from "@/components/inspections/RapportDetailModal";
import RapportCarte from "@/components/inspections/RapportCarte";
import Pagination from "@/components/Pagination";
import { inspectionService } from "@/services/inspections";
import type { RapportPage } from "@/types";

const PAGE_SIZE = 10;

export default function ChauffeurHistoriquePage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RapportPage | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [detail, setDetail] = useState<number | null>(null);

  const charger = useCallback(() => {
    setChargement(true); setErreur(false);
    inspectionService.mesRapports(page, PAGE_SIZE)
      .then(setData)
      .catch(() => setErreur(true))
      .finally(() => setChargement(false));
  }, [page]);
  useEffect(charger, [charger]);

  return (
    <ChauffeurLayout>
      <div className="flex items-center gap-2 mb-4">
        <Link to="/app" aria-label="Retour à l'accueil" className="w-9 h-9 rounded-xl bg-white ring-1 ring-gray-100 flex items-center justify-center">
          <ChevronLeft size={18} className="text-camublue-900" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-camublue-900">Historique</h1>
          <p className="text-xs text-gray-500">{data ? `${data.total} rapport${data.total > 1 ? "s" : ""} envoyé${data.total > 1 ? "s" : ""}` : "Tous vos rapports envoyés"}</p>
        </div>
      </div>

      {erreur ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-600 mb-4">Impossible de charger l'historique.</p>
          <button onClick={charger} className="inline-flex items-center gap-2 rounded-xl bg-camublue-900 text-white px-4 py-2.5 text-sm font-semibold">
            <RefreshCw size={15} /> Réessayer
          </button>
        </div>
      ) : chargement && !data ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-camublue-900" aria-label="Chargement" /></div>
      ) : data && data.total === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 ring-1 ring-gray-100">
          Vous n'avez encore envoyé aucun rapport.
        </p>
      ) : data && (
        <div className={chargement ? "opacity-60 transition-opacity" : ""} aria-busy={chargement}>
          <div className="space-y-2">
            {data.items.map(r => <RapportCarte key={r.id} rapport={r} onClick={() => setDetail(r.id)} />)}
          </div>
          <div className="mt-3 rounded-2xl bg-white ring-1 ring-gray-100 overflow-hidden">
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={p => { setPage(p); window.scrollTo({ top: 0 }); }} />
          </div>
        </div>
      )}

      {detail !== null && <RapportDetailModal rapportId={detail} onClose={() => setDetail(null)} />}
    </ChauffeurLayout>
  );
}
