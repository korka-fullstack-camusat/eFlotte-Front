import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Smartphone, Users, CheckCircle2, Clock, AlertTriangle, BellRing, Search, X, Loader2, RefreshCw, Send, CalendarRange,
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/charts";
import Pagination from "@/components/Pagination";
import RapportDetailModal from "@/components/inspections/RapportDetailModal";
import { StatutRapport, formatDate, formatKm } from "@/components/inspections/utils";
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

const nomChauffeur = (c: SuiviChauffeur) => c.full_name || c.username;

function sansAccents(t: string) {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Recherche d'un chauffeur avec suggestions (nom, identifiant ou plaque). */
function RechercheChauffeur({
  chauffeurs, selection, onSelect,
}: {
  chauffeurs: SuiviChauffeur[] | null;
  selection: SuiviChauffeur | null;
  onSelect: (c: SuiviChauffeur | null) => void;
}) {
  const [texte, setTexte] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(0);
  const listeId = useId();
  const boite = useRef<HTMLDivElement>(null);

  useEffect(() => { setTexte(selection ? nomChauffeur(selection) : ""); }, [selection]);
  useEffect(() => {
    const clic = (e: MouseEvent) => { if (!boite.current?.contains(e.target as Node)) setOuvert(false); };
    document.addEventListener("mousedown", clic);
    return () => document.removeEventListener("mousedown", clic);
  }, []);

  const q = sansAccents(texte.trim());
  const resultats = (chauffeurs ?? [])
    .filter(c => !q || [c.full_name, c.username, c.vehicule_plaque].some(v => v && sansAccents(v).includes(q)))
    .slice(0, 8);

  const choisir = (c: SuiviChauffeur) => { onSelect(c); setOuvert(false); };

  const clavier = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOuvert(true); setActif(i => Math.min(i + 1, resultats.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActif(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && ouvert && resultats[actif]) { e.preventDefault(); choisir(resultats[actif]); }
    else if (e.key === "Escape") setOuvert(false);
  };

  return (
    <div ref={boite} className="relative w-full sm:w-80">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden />
      <input
        type="text" role="combobox" aria-expanded={ouvert} aria-controls={listeId} aria-autocomplete="list"
        aria-activedescendant={ouvert && resultats[actif] ? `${listeId}-${resultats[actif].user_id}` : undefined}
        aria-label="Rechercher un chauffeur"
        value={texte}
        onChange={e => { setTexte(e.target.value); setOuvert(true); setActif(0); if (selection) onSelect(null); }}
        onFocus={() => setOuvert(true)}
        onKeyDown={clavier}
        placeholder="Rechercher un chauffeur…"
        className="input-base pl-9 pr-9 w-full bg-white"
      />
      {texte && (
        <button type="button" onClick={() => { setTexte(""); onSelect(null); }} aria-label="Effacer la recherche"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md text-gray-400 hover:text-gray-600 flex items-center justify-center">
          <X size={14} />
        </button>
      )}
      {ouvert && (
        <ul id={listeId} role="listbox"
          className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto rounded-xl bg-white shadow-lg ring-1 ring-gray-100 py-1">
          {!chauffeurs ? (
            <li className="px-3 py-2 text-sm text-gray-400">Chargement…</li>
          ) : resultats.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400">Aucun chauffeur trouvé</li>
          ) : resultats.map((c, i) => (
            <li key={c.user_id} id={`${listeId}-${c.user_id}`} role="option" aria-selected={i === actif}
              onMouseDown={e => { e.preventDefault(); choisir(c); }} onMouseEnter={() => setActif(i)}
              className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-3 text-sm ${i === actif ? "bg-camublue-900/5" : ""}`}>
              <span className="min-w-0">
                <span className="block font-semibold text-gray-800 truncate">{nomChauffeur(c)}</span>
                <span className="block text-xs text-gray-400 truncate">{c.username}{c.vehicule_plaque ? ` · ${c.vehicule_plaque}` : ""}</span>
              </span>
              <span className="shrink-0 text-xs text-gray-500">{c.nb_rapports} rapport{c.nb_rapports > 1 ? "s" : ""}</span>
            </li>
          ))}
        </ul>
      )}
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
  const [filtres, setFiltres] = useState<RapportsFilters>({ statut: "", date_debut: "", date_fin: "" });
  const [chauffeur, setChauffeur] = useState<SuiviChauffeur | null>(null);
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
    inspectionService.list({ ...filtres, user_id: chauffeur?.user_id, page, page_size: pageSize })
      .then(setRapports)
      .catch(() => setErreurRapports(true))
      .finally(() => setChargementRapports(false));
  }, [filtres, chauffeur, page, pageSize]);
  useEffect(() => { if (onglet === "rapports") chargerRapports(); }, [onglet, chargerRapports]);

  const setFiltre = (k: keyof RapportsFilters, v: string) => { setFiltres(f => ({ ...f, [k]: v })); setPage(1); };
  // Chauffeur ou période : on bascule sur la liste des rapports
  const choisirChauffeur = (c: SuiviChauffeur | null) => { setChauffeur(c); setPage(1); if (c) setOnglet("rapports"); };
  const setPeriode = (k: "date_debut" | "date_fin", v: string) => { setFiltre(k, v); if (v) setOnglet("rapports"); };
  const periodeActive = !!(filtres.date_debut || filtres.date_fin);
  const filtresActifs = !!(chauffeur || filtres.statut || periodeActive);

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
        <div className="flex items-center justify-between flex-wrap xl:flex-nowrap gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-camublue-900">Checklists chauffeurs</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Checklists véhicule envoyées depuis l'application mobile
              {stats && <> · semaine du {formatDate(stats.semaine_debut)}</>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap xl:shrink-0">
            <div role="tablist" aria-label="Vue" className="inline-flex rounded-xl bg-white p-1 ring-1 ring-gray-100 shadow-sm">
              {([["suivi", "Suivi de la semaine"], ["rapports", "Tous les rapports"]] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={onglet === k} onClick={() => setOnglet(k)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${onglet === k ? "bg-camublue-900 text-white" : "text-gray-600 hover:text-camublue-900"}`}>
                  {l}
                </button>
              ))}
            </div>
            {!isViewer && enRetard > 0 && (
              <button onClick={() => setRelance({ cible: "retard", message: "" })}
                className="flex items-center gap-2 px-4 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm">
                <BellRing size={15} /><span>{enRetard > 1 ? `Relancer les ${enRetard} en retard` : "Relancer le chauffeur en retard"}</span>
              </button>
            )}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard label="Chauffeurs" value={stats?.nb_chauffeurs ?? 0} icon={<Users size={20} />} bg="bg-camublue-900/10" text="text-camublue-900" />
        <KpiCard label="À jour cette semaine" value={stats?.chauffeurs_a_jour ?? 0} icon={<CheckCircle2 size={20} />} bg="bg-emerald-100" text="text-emerald-600" />
        <KpiCard label="En retard" value={stats?.chauffeurs_en_retard ?? 0} icon={<Clock size={20} />} bg="bg-amber-100" text="text-amber-600" />
        <KpiCard label="Rapports cette semaine" value={stats?.rapports_semaine ?? 0} icon={<Smartphone size={20} />} bg="bg-violet-100" text="text-violet-600" />
        <KpiCard label="Avec point critique" value={stats?.rapports_critiques_semaine ?? 0} icon={<AlertTriangle size={20} />} bg="bg-red-100" text="text-red-600" />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        <RechercheChauffeur chauffeurs={suivi} selection={chauffeur} onSelect={choisirChauffeur} />
        <div className="flex items-center gap-2 rounded-xl bg-white ring-1 ring-gray-100 shadow-sm px-3 py-1.5" role="group" aria-label="Période">
          <CalendarRange size={16} className="text-camublue-900 shrink-0" aria-hidden />
          <label className="flex items-center gap-1.5 text-xs text-gray-500">Du
            <input type="date" value={filtres.date_debut} max={filtres.date_fin || undefined}
              onChange={e => setPeriode("date_debut", e.target.value)} className="text-sm text-gray-700 bg-transparent outline-none" />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-500">au
            <input type="date" value={filtres.date_fin} min={filtres.date_debut || undefined}
              onChange={e => setPeriode("date_fin", e.target.value)} className="text-sm text-gray-700 bg-transparent outline-none" />
          </label>
          {periodeActive && (
            <button onClick={() => { setFiltres(f => ({ ...f, date_debut: "", date_fin: "" })); setPage(1); }}
              aria-label="Effacer la période" className="w-6 h-6 rounded-md text-gray-400 hover:text-red-600 flex items-center justify-center">
              <X size={14} />
            </button>
          )}
        </div>
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
                        <button onClick={() => choisirChauffeur(s)} title="Voir tous ses rapports"
                          className="font-semibold text-gray-700 hover:text-camublue-900 hover:underline text-left">
                          {s.full_name || s.username}
                        </button>
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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-sm text-gray-600">
              {rapports ? <><span className="font-semibold text-gray-800">{rapports.total}</span> rapport{rapports.total > 1 ? "s" : ""}</> : "Rapports"}
              {chauffeur && <> envoyé{rapports && rapports.total > 1 ? "s" : ""} par <span className="font-semibold text-camublue-900">{nomChauffeur(chauffeur)}</span></>}
              {filtres.date_debut && <> du {formatDate(filtres.date_debut)}</>}
              {filtres.date_fin && <> au {formatDate(filtres.date_fin)}</>}
            </p>
            <div className="flex items-center gap-2">
              <select value={filtres.statut} onChange={e => setFiltre("statut", e.target.value)} className="input-base w-auto bg-white" aria-label="Statut">
                <option value="">Tous les statuts</option>
                <option value="conforme">Conformes</option>
                <option value="anomalies">Avec anomalies</option>
                <option value="critique">Avec point critique</option>
              </select>
              {filtresActifs && (
                <button onClick={() => { setChauffeur(null); setFiltres({ statut: "", date_debut: "", date_fin: "" }); setPage(1); }}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-red-600">
                  <X size={14} /> Tout effacer
                </button>
              )}
            </div>
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
