import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, BellRing, CheckCircle2, Clock, Car, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import ChauffeurLayout from "@/components/inspections/ChauffeurLayout";
import NouveauRapportModal from "@/components/inspections/NouveauRapportModal";
import RapportDetailModal from "@/components/inspections/RapportDetailModal";
import RapportCarte from "@/components/inspections/RapportCarte";
import { formatDate } from "@/components/inspections/utils";
import { inspectionService } from "@/services/inspections";
import type { MonEspace } from "@/types";

export default function ChauffeurHomePage() {
  const [espace, setEspace] = useState<MonEspace | null>(null);
  const [erreur, setErreur] = useState(false);
  const [nouveau, setNouveau] = useState(false);
  const [detail, setDetail] = useState<number | null>(null);

  const charger = useCallback(() => {
    setErreur(false);
    inspectionService.moi().then(setEspace).catch(() => setErreur(true));
  }, []);
  useEffect(charger, [charger]);

  const prenom = (espace?.full_name || espace?.username || "").split(" ")[0];

  return (
    <ChauffeurLayout>
      {erreur ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-600 mb-4">Impossible de charger votre espace. Vérifiez votre connexion.</p>
          <button onClick={charger} className="inline-flex items-center gap-2 rounded-xl bg-camublue-900 text-white px-4 py-2.5 text-sm font-semibold">
            <RefreshCw size={15} /> Réessayer
          </button>
        </div>
      ) : !espace ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-camublue-900" aria-label="Chargement" /></div>
      ) : (
        <div className="space-y-5">
          <section>
            <h1 className="text-2xl font-bold text-camublue-900">Bonjour {prenom}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Bienvenue sur votre espace. Faites l'inspection de votre véhicule et envoyez votre checklist chaque semaine.
            </p>
          </section>

          {espace.relances.length > 0 && !espace.envoye_cette_semaine && (
            <div role="alert" className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4 flex gap-3">
              <BellRing size={20} className="text-amber-600 shrink-0 mt-0.5" aria-hidden />
              <div className="text-sm">
                <p className="font-semibold text-amber-800">Rappel : votre checklist est attendue</p>
                {espace.relances.slice(0, 2).map(r => (
                  <p key={r.id} className="text-amber-800/90 mt-1">
                    {r.message || "Merci d'envoyer votre checklist de la semaine."}
                    <span className="block text-xs text-amber-700/80">
                      {r.envoye_par ? `${r.envoye_par} · ` : ""}{formatDate(r.created_at, true)}
                    </span>
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`rounded-2xl p-4 ring-1 flex items-center gap-3 ${espace.envoye_cette_semaine ? "bg-emerald-50 ring-emerald-200" : "bg-white ring-gray-100 shadow-sm"}`}>
              {espace.envoye_cette_semaine
                ? <CheckCircle2 size={26} className="text-emerald-600 shrink-0" aria-hidden />
                : <Clock size={26} className="text-amber-500 shrink-0" aria-hidden />}
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {espace.envoye_cette_semaine ? "Checklist de la semaine envoyée" : "Checklist de la semaine à faire"}
                </p>
                <p className="text-xs text-gray-500">
                  {espace.dernier_rapport ? `Dernier envoi : ${formatDate(espace.dernier_rapport.created_at)}` : "Aucun envoi pour l'instant"}
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-100 shadow-sm flex items-center gap-3">
              <Car size={26} className="text-camublue-900 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Mon véhicule</p>
                {espace.vehicule_plaque ? (
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {espace.vehicule_plaque}
                    {espace.vehicule && (espace.vehicule.marque || espace.vehicule.modele) && (
                      <span className="font-normal text-gray-500"> · {[espace.vehicule.marque, espace.vehicule.modele].filter(Boolean).join(" ")}</span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">Aucun véhicule attribué</p>
                )}
              </div>
            </div>
          </div>

          <button onClick={() => setNouveau(true)}
            className="w-full min-h-[56px] rounded-2xl bg-camublue-900 hover:bg-camublue-900/90 text-white font-semibold shadow-sm inline-flex items-center justify-center gap-2 active:scale-[0.99] transition">
            <Plus size={20} /> Nouveau rapport
          </button>

          <section aria-labelledby="derniers-titre">
            <div className="flex items-center justify-between mb-2">
              <h2 id="derniers-titre" className="text-sm font-bold text-camublue-900">Derniers rapports envoyés</h2>
              {espace.derniers_rapports.length > 0 && (
                <Link to="/app/historique" className="inline-flex items-center gap-0.5 text-sm font-semibold text-camublue-900 hover:underline">
                  Voir plus <ChevronRight size={15} />
                </Link>
              )}
            </div>
            {espace.derniers_rapports.length === 0 ? (
              <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 ring-1 ring-gray-100">
                Vous n'avez encore envoyé aucun rapport.
              </p>
            ) : (
              <div className="space-y-2">
                {espace.derniers_rapports.map(r => <RapportCarte key={r.id} rapport={r} onClick={() => setDetail(r.id)} />)}
              </div>
            )}
          </section>
        </div>
      )}

      {nouveau && espace && (
        <NouveauRapportModal
          espace={espace}
          onClose={() => setNouveau(false)}
          onEnvoye={r => { setNouveau(false); charger(); setDetail(r.id); }}
        />
      )}
      {detail !== null && <RapportDetailModal rapportId={detail} onClose={() => setDetail(null)} />}
    </ChauffeurLayout>
  );
}
