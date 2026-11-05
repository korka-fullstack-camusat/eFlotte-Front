import { useCallback, useEffect, useState } from "react";
import {
  Inbox, ArrowUpFromLine, Wrench, Droplets, Search, X, Loader2, RefreshCw, Phone, MapPin, Gauge, UserCog, Mail, CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/contexts/AuthContext";
import { demandeService } from "@/services/demandes";
import { rafraichirDemandesNouvelles, useDemandesNouvelles } from "@/components/demandes/useDemandesNouvelles";
import type { DemandePage, DemandeVehicule, NatureDemande, StatsDemandes, StatutDemande } from "@/types";

const NATURES: Record<NatureDemande, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  REMONTEE: { label: "Remontée", icon: <ArrowUpFromLine size={20} />, bg: "bg-sky-100",    text: "text-sky-700" },
  PANNE:    { label: "Panne",    icon: <Wrench size={20} />,          bg: "bg-red-100",    text: "text-red-600" },
  VIDANGE:  { label: "Vidange",  icon: <Droplets size={20} />,        bg: "bg-amber-100",  text: "text-amber-700" },
};

const STATUTS: Record<StatutDemande, { label: string; classe: string }> = {
  NOUVELLE: { label: "Nouvelle", classe: "bg-red-50 text-red-700 ring-red-200" },
  EN_COURS: { label: "En cours", classe: "bg-amber-50 text-amber-700 ring-amber-200" },
  TRAITEE:  { label: "Traitée",  classe: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

const formatDateHeure = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const formatKm = (km: number) => `${km.toLocaleString("fr-FR")} km`;

function BadgeStatut({ statut }: { statut: StatutDemande }) {
  const s = STATUTS[statut] ?? { label: statut, classe: "bg-gray-50 text-gray-600 ring-gray-200" };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ring-1 whitespace-nowrap ${s.classe}`}>{s.label}</span>;
}

function CarteNature({ nature, stats, active, onClick }: {
  nature: NatureDemande; stats: StatsDemandes | null; active: boolean; onClick: () => void;
}) {
  const n = NATURES[nature];
  const c = stats?.par_nature?.[nature];
  const total = c ? c.NOUVELLE + c.EN_COURS + c.TRAITEE : null;
  return (
    <button onClick={onClick} aria-pressed={active}
      className={`text-left bg-white rounded-2xl p-4 shadow-sm ring-1 transition hover:shadow-md ${active ? "ring-2 ring-camublue-900" : "ring-gray-100"}`}>
      <div className="flex items-center gap-3">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${n.bg} ${n.text}`} aria-hidden>{n.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-600">{n.label}</p>
          <p className="text-2xl font-bold text-camublue-900">{total ?? "—"}</p>
        </div>
        {!!c?.NOUVELLE && (
          <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold">{c.NOUVELLE} nouvelle{c.NOUVELLE > 1 ? "s" : ""}</span>
        )}
      </div>
      {c && <p className="mt-2 text-xs text-gray-500">{c.EN_COURS} en cours · {c.TRAITEE} traitée{c.TRAITEE > 1 ? "s" : ""}</p>}
    </button>
  );
}

function ModalDemande({ demande, lectureSeule, onClose, onMaj }: {
  demande: DemandeVehicule; lectureSeule: boolean; onClose: () => void; onMaj: (d: DemandeVehicule) => void;
}) {
  const [statut, setStatut] = useState<StatutDemande>(demande.statut === "NOUVELLE" ? "EN_COURS" : demande.statut);
  const [commentaire, setCommentaire] = useState(demande.commentaire ?? "");
  const [envoi, setEnvoi] = useState(false);
  const nature = NATURES[demande.nature];

  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === "Escape" && !envoi) onClose(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onClose, envoi]);

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      const d = await demandeService.maj(demande.id, statut, commentaire);
      toast.success(`Demande ${STATUTS[statut].label.toLowerCase()} · le chauffeur est prévenu dans son application`);
      onMaj(d);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur lors de la mise à jour");
    } finally {
      setEnvoi(false);
    }
  };

  const Ligne = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-2">
      <span className="text-camublue-900 mt-0.5" aria-hidden>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-800 break-words">{children}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !envoi && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="demande-titre" className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between sticky top-0">
          <p id="demande-titre" className="text-white font-bold text-sm flex items-center gap-2">
            {nature?.icon} Demande {nature?.label.toLowerCase() ?? demande.nature} — {demande.immatriculation}
          </p>
          <button onClick={onClose} aria-label="Fermer" className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center">
            <X size={14} className="text-white" />
          </button>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <BadgeStatut statut={demande.statut} />
            <span className="text-xs text-gray-500">Reçue le {formatDateHeure(demande.created_at)}</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-4 divide-y sm:divide-y-0 divide-gray-50">
            <Ligne icon={<Gauge size={16} />} label="Kilométrage actuel">{formatKm(demande.kilometrage)}</Ligne>
            <Ligne icon={<MapPin size={16} />} label="Position">{demande.position}</Ligne>
            <Ligne icon={<UserCog size={16} />} label="Technicien">{demande.technicien}</Ligne>
            <Ligne icon={<Phone size={16} />} label={`Chauffeur · ${demande.nom_chauffeur}`}>
              {demande.telephone ? <a href={`tel:${demande.telephone}`} className="text-camublue-900 hover:underline">{demande.telephone}</a> : "—"}
            </Ligne>
          </div>
          <p className="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
            <Mail size={13} aria-hidden />
            {demande.email_alerte_at ? `Alerte e-mail envoyée le ${formatDateHeure(demande.email_alerte_at)}` : "Alerte e-mail non envoyée"}
          </p>
          {demande.traitee_par && (
            <p className="mt-1 text-xs text-gray-500">Dernière mise à jour par {demande.traitee_par} le {formatDateHeure(demande.updated_at)}</p>
          )}

          {lectureSeule ? (
            demande.commentaire && <p className="mt-4 text-sm bg-gray-50 rounded-xl p-3 text-gray-700">{demande.commentaire}</p>
          ) : (
            <div className="mt-5 space-y-4 border-t border-gray-100 pt-4">
              <fieldset>
                <legend className="block text-xs font-semibold text-gray-600 mb-1.5">Statut</legend>
                <div className="flex gap-2" role="radiogroup">
                  {(Object.keys(STATUTS) as StatutDemande[]).map(s => (
                    <button key={s} role="radio" aria-checked={statut === s} onClick={() => setStatut(s)}
                      className={`flex-1 rounded-xl py-2 text-sm font-semibold ring-1 transition ${statut === s ? "bg-camublue-900 text-white ring-camublue-900" : "bg-white text-gray-600 ring-gray-200 hover:ring-camublue-900"}`}>
                      {STATUTS[s].label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="demande-commentaire" className="block text-xs font-semibold text-gray-600 mb-1.5">Commentaire pour le chauffeur (facultatif)</label>
                <textarea id="demande-commentaire" rows={3} maxLength={1000} value={commentaire} onChange={e => setCommentaire(e.target.value)}
                  placeholder="Ex. : rendez-vous au garage demain à 9 h" className="input-base" />
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} disabled={envoi} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Annuler</button>
                <button onClick={enregistrer} disabled={envoi}
                  className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
                  {envoi ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DemandesPage() {
  const { isViewer } = useAuth();
  const nouvelles = useDemandesNouvelles();
  const [stats, setStats] = useState<StatsDemandes | null>(null);
  const [nature, setNature] = useState<NatureDemande | "">("");
  const [statut, setStatut] = useState<StatutDemande | "">("");
  const [recherche, setRecherche] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [donnees, setDonnees] = useState<DemandePage | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [ouverte, setOuverte] = useState<DemandeVehicule | null>(null);

  // Recherche : on attend la fin de la saisie
  useEffect(() => {
    const t = window.setTimeout(() => { setQ(recherche.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(t);
  }, [recherche]);

  const charger = useCallback(() => {
    setChargement(true); setErreur(false);
    demandeService.stats().then(setStats).catch(() => {});
    demandeService.list({ nature, statut, q, page, page_size: pageSize })
      .then(setDonnees)
      .catch(() => setErreur(true))
      .finally(() => setChargement(false));
  }, [nature, statut, q, page, pageSize]);
  useEffect(charger, [charger]);

  // Une demande arrive pendant que la page est ouverte : on recharge la liste
  useEffect(() => {
    if (nouvelles !== null && stats && nouvelles !== stats.nouvelles) charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nouvelles]);

  const choisirNature = (n: NatureDemande) => { setNature(v => (v === n ? "" : n)); setPage(1); };
  const filtresActifs = !!(nature || statut || q);

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-camublue-900 flex items-center gap-2"><Inbox size={24} aria-hidden /> Demandes chauffeurs</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Remontées, pannes et vidanges signalées depuis l'application mobile
            {stats && <> · {stats.nouvelles ? <strong className="text-red-600">{stats.nouvelles} à traiter</strong> : "aucune en attente"}</>}
          </p>
        </div>
        <button onClick={() => { charger(); rafraichirDemandesNouvelles(); }} disabled={chargement}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white ring-1 ring-gray-200 text-sm font-semibold text-camublue-900 hover:bg-camublue-900/10 disabled:opacity-60">
          <RefreshCw size={15} className={chargement ? "animate-spin" : ""} aria-hidden /> Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {(Object.keys(NATURES) as NatureDemande[]).map(n => (
          <CarteNature key={n} nature={n} stats={stats} active={nature === n} onClick={() => choisirNature(n)} />
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-gray-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <input value={recherche} onChange={e => setRecherche(e.target.value)} aria-label="Rechercher"
              placeholder="Immatriculation, chauffeur, technicien, position…" className="input-base !pl-9" />
          </div>
          <select value={nature} onChange={e => { setNature(e.target.value as NatureDemande | ""); setPage(1); }} aria-label="Nature" className="input-base !w-auto">
            <option value="">Toutes les natures</option>
            {(Object.keys(NATURES) as NatureDemande[]).map(n => <option key={n} value={n}>{NATURES[n].label}</option>)}
          </select>
          <select value={statut} onChange={e => { setStatut(e.target.value as StatutDemande | ""); setPage(1); }} aria-label="Statut" className="input-base !w-auto">
            <option value="">Tous les statuts</option>
            {(Object.keys(STATUTS) as StatutDemande[]).map(s => <option key={s} value={s}>{STATUTS[s].label}</option>)}
          </select>
          {filtresActifs && (
            <button onClick={() => { setNature(""); setStatut(""); setRecherche(""); setQ(""); setPage(1); }}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 px-2"><X size={14} /> Effacer</button>
          )}
        </div>

        {erreur ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-500 mb-3">Impossible de charger les demandes.</p>
            <button onClick={charger} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-camublue-900 text-white text-sm font-semibold">
              <RefreshCw size={14} /> Réessayer
            </button>
          </div>
        ) : !donnees ? (
          <p className="text-sm text-gray-400 p-6 text-center">Chargement…</p>
        ) : donnees.items.length === 0 ? (
          <p className="text-sm text-gray-500 p-8 text-center">
            {filtresActifs ? "Aucune demande ne correspond à ces filtres." : "Aucune demande pour le moment. Les chauffeurs les envoient depuis l'onglet « Demandes » de l'application."}
          </p>
        ) : (
          <div className={`overflow-x-auto transition-opacity ${chargement ? "opacity-60" : ""}`}>
            <table className="w-full text-sm">
              <thead className="bg-camublue-900 text-white text-xs uppercase">
                <tr>
                  <th scope="col" className="text-left px-4 py-2.5 font-semibold">Reçue le</th>
                  <th scope="col" className="text-left px-4 py-2.5 font-semibold">Nature</th>
                  <th scope="col" className="text-left px-4 py-2.5 font-semibold">Véhicule</th>
                  <th scope="col" className="text-left px-4 py-2.5 font-semibold">Position</th>
                  <th scope="col" className="text-left px-4 py-2.5 font-semibold">Technicien</th>
                  <th scope="col" className="text-left px-4 py-2.5 font-semibold">Chauffeur</th>
                  <th scope="col" className="text-left px-4 py-2.5 font-semibold">Statut</th>
                  <th scope="col" className="text-center px-4 py-2.5 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {donnees.items.map(d => {
                  const n = NATURES[d.nature];
                  return (
                    <tr key={d.id} className={`hover:bg-gray-50/60 ${d.statut === "NOUVELLE" ? "bg-red-50/40" : ""}`}>
                      <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">{formatDateHeure(d.created_at)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 font-semibold ${n?.text ?? ""}`}>
                          <span className="[&>svg]:w-4 [&>svg]:h-4" aria-hidden>{n?.icon}</span>{n?.label ?? d.nature}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <p className="font-semibold text-gray-800">{d.immatriculation}</p>
                        <p className="text-xs text-gray-400">{formatKm(d.kilometrage)}</p>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 max-w-[200px] truncate" title={d.position}>{d.position}</td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{d.technicien}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <p className="font-medium text-gray-700">{d.nom_chauffeur}</p>
                        {d.telephone && <p className="text-xs text-gray-400">{d.telephone}</p>}
                      </td>
                      <td className="px-4 py-2.5"><BadgeStatut statut={d.statut} /></td>
                      <td className="px-4 py-2.5 text-center">
                        <button onClick={() => setOuverte(d)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-camublue-900/10 text-camublue-900 hover:bg-camublue-900 hover:text-white transition whitespace-nowrap">
                          {isViewer ? "Voir" : d.statut === "NOUVELLE" ? "Traiter" : "Ouvrir"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {donnees && (
          <Pagination page={page} pageSize={pageSize} total={donnees.total} onPageChange={setPage}
            onPageSizeChange={s => { setPageSize(s); setPage(1); }} />
        )}
      </div>

      {ouverte && (
        <ModalDemande demande={ouverte} lectureSeule={isViewer} onClose={() => setOuverte(null)}
          onMaj={() => { setOuverte(null); charger(); rafraichirDemandesNouvelles(); }} />
      )}
    </AppLayout>
  );
}
