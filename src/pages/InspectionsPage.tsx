import { useCallback, useEffect, useState } from "react";
import {
  Smartphone, Users, CheckCircle2, Clock, AlertTriangle, BellRing, Search, X, Loader2, RefreshCw, Send,
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/charts";
import Pagination from "@/components/Pagination";
import RapportDetailModal from "@/components/inspections/RapportDetailModal";
import { StatutRapport, TYPE_RAPPORT_LABELS, formatDate, formatKm } from "@/components/inspections/utils";
import { useAuth } from "@/contexts/AuthContext";
import { inspectionService } from "@/services/inspections";
import type { RapportPage, RapportsFilters, StatsInspections, SuiviChauffeur } from "@/types";

type Onglet = "suivi" | "rapports";
type Relance = { cible: SuiviChauffeur | "retard"; message: string };

function Erreur({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-10 text-center">
      <p className="text-sm text-gray-500 mb-3">Impossible de charger les données.</p>
      <button onClick={onRetry} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-camublue-900 text-white text-sm font-semibold">
        <RefreshCw size={14} /> Réessayer
      </button>
    </div>
  );
}

export default function InspectionsPage() {
  const { isViewer } = useAuth();
  const [onglet, setOnglet] = useState<Onglet>("suivi");
  const [stats, setStats] = useState<StatsInspections | null>(null);
  const [suivi, setSuivi] = useState<SuiviChauffeur[] | null>(null);
  const [erreurSuivi, setErreurSuivi] = useState(false);
  const [detail, setDetail] = useState<number | null>(null);
  const [relance, setRelance] = useState<Relance | null>(null);
  const [envoiRelance, setEnvoiRelance] = useState(false);

  // Rapports (pagination serveur)
  const [filtres, setFiltres] = useState<RapportsFilters>({ q: "", statut: "", type_rapport: "", date_debut: "", date_fin: "" });
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [rapports, setRapports] = useState<RapportPage | null>(null);
  const [chargementRapports, setChargementRapports] = useState(false);
  const [erreurRapports, setErreurRapports] = useState(false);

  const chargerSuivi = useCallback(() => {
    setErreurSuivi(false);
    inspectionService.stats().then(setStats).catch(() => {});
    inspectionService.suivi().then(setSuivi).catch(() => setErreurSuivi(true));
  }, []);
  useEffect(chargerSuivi, [chargerSuivi]);

  const chargerRapports = useCallback(() => {
    setChargementRapports(true); setErreurRapports(false);
    inspectionService.list({ ...filtres, page, page_size: pageSize })
      .then(setRapports)
      .catch(() => setErreurRapports(true))
      .finally(() => setChargementRapports(false));
  }, [filtres, page, pageSize]);
  useEffect(() => { if (onglet === "rapports") chargerRapports(); }, [onglet, chargerRapports]);

  // Recherche : attendre la fin de la frappe
  useEffect(() => {
    const t = setTimeout(() => { setFiltres(f => (f.q === recherche ? f : { ...f, q: recherche })); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [recherche]);

  const setFiltre = (k: keyof RapportsFilters, v: string) => { setFiltres(f => ({ ...f, [k]: v })); setPage(1); };
  const filtresActifs = !!(filtres.q || filtres.statut || filtres.type_rapport || filtres.date_debut || filtres.date_fin);

  const envoyerRelance = async () => {
    if (!relance) return;
    setEnvoiRelance(true);
    try {
      if (relance.cible === "retard") {
        const { relances } = await inspectionService.relancerEnRetard(relance.message);
        toast.success(relances ? `${relances} chauffeur${relances > 1 ? "s" : ""} relancé${relances > 1 ? "s" : ""}` : "Aucun chauffeur en retard");
      } else {
        await inspectionService.relancer(relance.cible.user_id, relance.message);
        toast.success(`${relance.cible.full_name || relance.cible.username} a été relancé`);
      }
      setRelance(null);
      chargerSuivi();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur lors de la relance");
    } finally {
      setEnvoiRelance(false);
    }
  };

  const enRetard = suivi?.filter(s => !s.envoye_cette_semaine).length ?? 0;

  return (
    <AppLayout>
      <div className="mb-6 sticky top-0 z-20 bg-camugray-100 -mx-4 px-4 md:-mx-8 md:px-8 pt-1 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-camublue-900">Checklists chauffeurs</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Inspections et restitutions envoyées depuis l'application mobile
              {stats && <> · semaine du {formatDate(stats.semaine_debut)}</>}
            </p>
          </div>
          {!isViewer && enRetard > 0 && (
            <button onClick={() => setRelance({ cible: "retard", message: "" })}
              className="flex items-center gap-2 px-4 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm">
              <BellRing size={15} /><span>{enRetard > 1 ? `Relancer les ${enRetard} en retard` : "Relancer le chauffeur en retard"}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard label="Chauffeurs" value={stats?.nb_chauffeurs ?? 0} icon={<Users size={20} />} bg="bg-camublue-900/10" text="text-camublue-900" />
        <KpiCard label="À jour cette semaine" value={stats?.chauffeurs_a_jour ?? 0} icon={<CheckCircle2 size={20} />} bg="bg-emerald-100" text="text-emerald-600" />
        <KpiCard label="En retard" value={stats?.chauffeurs_en_retard ?? 0} icon={<Clock size={20} />} bg="bg-amber-100" text="text-amber-600" />
        <KpiCard label="Rapports cette semaine" value={stats?.rapports_semaine ?? 0} icon={<Smartphone size={20} />} bg="bg-violet-100" text="text-violet-600" />
        <KpiCard label="Avec point critique" value={stats?.rapports_critiques_semaine ?? 0} icon={<AlertTriangle size={20} />} bg="bg-red-100" text="text-red-600" />
      </div>

      <div role="tablist" aria-label="Vue" className="inline-flex rounded-xl bg-white p-1 ring-1 ring-gray-100 mb-4">
        {([["suivi", "Suivi de la semaine"], ["rapports", "Tous les rapports"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={onglet === k} onClick={() => setOnglet(k)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${onglet === k ? "bg-camublue-900 text-white" : "text-gray-600 hover:text-camublue-900"}`}>
            {l}
          </button>
        ))}
      </div>

      {onglet === "suivi" ? (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {erreurSuivi ? <Erreur onRetry={chargerSuivi} /> : !suivi ? (
            <p className="text-sm text-gray-400 p-6 text-center">Chargement…</p>
          ) : suivi.length === 0 ? (
            <p className="text-sm text-gray-500 p-8 text-center">
              Aucun compte chauffeur. Créez-en un dans <span className="font-semibold">Comptes utilisateurs</span> avec le rôle « Chauffeur ».
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-camublue-900 text-white text-xs uppercase">
                  <tr>
                    <th scope="col" className="text-left px-4 py-2.5 font-semibold">Chauffeur</th>
                    <th scope="col" className="text-left px-4 py-2.5 font-semibold">Véhicule</th>
                    <th scope="col" className="text-center px-4 py-2.5 font-semibold">Cette semaine</th>
                    <th scope="col" className="text-left px-4 py-2.5 font-semibold">Dernier rapport</th>
                    <th scope="col" className="text-center px-4 py-2.5 font-semibold">Rapports</th>
                    <th scope="col" className="text-left px-4 py-2.5 font-semibold">Relances en attente</th>
                    {!isViewer && <th scope="col" className="text-center px-4 py-2.5 font-semibold">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {suivi.map(s => (
                    <tr key={s.user_id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-gray-700">{s.full_name || s.username}</p>
                        {s.full_name && <p className="text-xs text-gray-400">{s.username}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{s.vehicule_plaque || "—"}</td>
                      <td className="px-4 py-2.5 text-center">
                        {s.envoye_cette_semaine
                          ? <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs"><CheckCircle2 size={13} /> Envoyée</span>
                          : <span className="inline-flex items-center gap-1 text-amber-600 font-semibold text-xs"><Clock size={13} /> En retard</span>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {s.dernier_rapport_id ? (
                          <button onClick={() => setDetail(s.dernier_rapport_id)} className="inline-flex items-center gap-2 text-camublue-900 hover:underline font-medium">
                            {formatDate(s.dernier_rapport_date)}
                            {!!s.dernier_rapport_critiques && (
                              <span className="inline-flex items-center gap-0.5 text-red-600 text-xs font-semibold"><AlertTriangle size={12} /> critique</span>
                            )}
                          </button>
                        ) : <span className="text-gray-400">Jamais</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-600">{s.nb_rapports}</td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {s.relances_en_attente > 0
                          ? <>{s.relances_en_attente} <span className="text-xs text-gray-400">· dernière le {formatDate(s.derniere_relance, true)}</span></>
                          : "—"}
                      </td>
                      {!isViewer && (
                        <td className="px-4 py-2.5 text-center">
                          {!s.envoye_cette_semaine && (
                            <button onClick={() => setRelance({ cible: s, message: "" })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-camublue-900 text-camublue-900 hover:bg-camublue-900/5 text-xs font-semibold">
                              <BellRing size={13} /> Relancer
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
              <input type="search" value={recherche} onChange={e => setRecherche(e.target.value)}
                placeholder="Chauffeur ou immatriculation…" aria-label="Rechercher" className="input-base pl-9 w-full" />
            </div>
            <select value={filtres.statut} onChange={e => setFiltre("statut", e.target.value)} className="input-base w-auto" aria-label="Statut">
              <option value="">Tous les statuts</option>
              <option value="conforme">Conformes</option>
              <option value="anomalies">Avec anomalies</option>
              <option value="critique">Avec point critique</option>
            </select>
            <select value={filtres.type_rapport} onChange={e => setFiltre("type_rapport", e.target.value)} className="input-base w-auto" aria-label="Type">
              <option value="">Inspections et restitutions</option>
              <option value="INSPECTION">Inspections</option>
              <option value="RESTITUTION">Restitutions</option>
            </select>
            <label className="text-xs text-gray-500 flex flex-col gap-1">Du
              <input type="date" value={filtres.date_debut} onChange={e => setFiltre("date_debut", e.target.value)} className="input-base w-auto" />
            </label>
            <label className="text-xs text-gray-500 flex flex-col gap-1">Au
              <input type="date" value={filtres.date_fin} onChange={e => setFiltre("date_fin", e.target.value)} className="input-base w-auto" />
            </label>
            {filtresActifs && (
              <button onClick={() => { setRecherche(""); setFiltres({ q: "", statut: "", type_rapport: "", date_debut: "", date_fin: "" }); setPage(1); }}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-red-600">
                <X size={14} /> Effacer
              </button>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            {erreurRapports ? <Erreur onRetry={chargerRapports} /> : !rapports ? (
              <p className="text-sm text-gray-400 p-6 text-center">Chargement…</p>
            ) : rapports.total === 0 ? (
              <p className="text-sm text-gray-500 p-8 text-center">
                {filtresActifs ? "Aucun rapport ne correspond à ces filtres." : "Aucun rapport envoyé pour l'instant."}
              </p>
            ) : (
              <div className={`overflow-x-auto ${chargementRapports ? "opacity-60" : ""}`} aria-busy={chargementRapports}>
                <table className="w-full text-sm">
                  <thead className="bg-camublue-900 text-white text-xs uppercase">
                    <tr>
                      <th scope="col" className="text-left px-4 py-2.5 font-semibold">Date</th>
                      <th scope="col" className="text-left px-4 py-2.5 font-semibold">Chauffeur</th>
                      <th scope="col" className="text-left px-4 py-2.5 font-semibold">Véhicule</th>
                      <th scope="col" className="text-left px-4 py-2.5 font-semibold">Type</th>
                      <th scope="col" className="text-right px-4 py-2.5 font-semibold">Kilométrage</th>
                      <th scope="col" className="text-left px-4 py-2.5 font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rapports.items.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/60 cursor-pointer" onClick={() => setDetail(r.id)}>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <button onClick={e => { e.stopPropagation(); setDetail(r.id); }} className="text-camublue-900 font-medium hover:underline">
                            {formatDate(r.created_at, true)}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">{r.nom_chauffeur}</td>
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                          <span className="font-semibold text-gray-700">{r.immatriculation}</span>
                          {(r.marque || r.modele) && <span className="text-xs text-gray-400"> · {[r.marque, r.modele].filter(Boolean).join(" ")}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{TYPE_RAPPORT_LABELS[r.type_rapport] ?? r.type_rapport}</td>
                        <td className="px-4 py-2.5 text-gray-600 text-right whitespace-nowrap">{formatKm(r.kilometrage)}</td>
                        <td className="px-4 py-2.5"><StatutRapport rapport={r} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {rapports && (
              <Pagination page={page} pageSize={pageSize} total={rapports.total} onPageChange={setPage}
                onPageSizeChange={s => { setPageSize(s); setPage(1); }} />
            )}
          </div>
        </>
      )}

      {detail !== null && <RapportDetailModal rapportId={detail} onClose={() => setDetail(null)} />}

      {relance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !envoiRelance && setRelance(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="relance-titre" className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between">
              <p id="relance-titre" className="text-white font-bold text-sm flex items-center gap-2">
                <BellRing size={16} />
                {relance.cible === "retard" ? (enRetard > 1 ? `Relancer les ${enRetard} chauffeurs en retard` : "Relancer le chauffeur en retard") : `Relancer ${relance.cible.full_name || relance.cible.username}`}
              </p>
              <button onClick={() => setRelance(null)} aria-label="Fermer" className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X size={14} className="text-white" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Un rappel s'affichera sur la page d'accueil de l'application du chauffeur, jusqu'à l'envoi de sa checklist.
              </p>
              <div>
                <label htmlFor="relance-msg" className="block text-xs font-semibold text-gray-600 mb-1.5">Message (facultatif)</label>
                <textarea id="relance-msg" rows={3} maxLength={500} value={relance.message}
                  onChange={e => setRelance(r => r && { ...r, message: e.target.value })}
                  placeholder="Merci d'envoyer votre checklist de la semaine." className="input-base" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setRelance(null)} disabled={envoiRelance}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Annuler</button>
                <button onClick={envoyerRelance} disabled={envoiRelance}
                  className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
                  {envoiRelance ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Envoyer le rappel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
