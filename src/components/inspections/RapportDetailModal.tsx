import { useEffect, useState } from "react";
import { X, ClipboardCheck, AlertTriangle, ImageOff, Loader2 } from "lucide-react";
import { inspectionService } from "@/services/inspections";
import type { ChecklistModele, RapportDetail } from "@/types";
import { useModele } from "./useModele";
import { StatutRapport, TYPE_RAPPORT_LABELS, formatDate, formatKm } from "./utils";

function Photo({ rapportId, position, libelle }: { rapportId: number; position: string; libelle: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [erreur, setErreur] = useState(false);
  useEffect(() => {
    let objectUrl: string | null = null;
    inspectionService.photo(rapportId, position)
      .then(blob => { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); })
      .catch(() => setErreur(true));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [rapportId, position]);

  return (
    <figure className="space-y-1">
      <div className="aspect-[4/3] rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="block w-full h-full" aria-label={`Agrandir la photo : ${libelle}`}>
            <img src={url} alt={libelle} className="w-full h-full object-cover" />
          </a>
        ) : erreur ? (
          <ImageOff size={20} className="text-gray-400" aria-label="Photo indisponible" />
        ) : (
          <Loader2 size={18} className="animate-spin text-gray-400" aria-label="Chargement" />
        )}
      </div>
      <figcaption className="text-xs text-gray-500 text-center">{libelle}</figcaption>
    </figure>
  );
}

function Contenu({ rapport, modele }: { rapport: RapportDetail; modele: ChecklistModele }) {
  const libelleValeur = (type: keyof ChecklistModele["types_reponse"], v: string) =>
    modele.types_reponse[type].options.find(o => o.valeur === v)?.libelle ?? v;

  const anomalies = modele.sections.flatMap(s =>
    s.items
      .filter(i => rapport.reponses.items[i.cle]?.valeur === modele.types_reponse[s.type].negative)
      .map(i => ({ ...i, section: s.titre, commentaire: rapport.reponses.items[i.cle]?.commentaire }))
  ).sort((a, b) => Number(b.critique) - Number(a.critique));

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        {[
          ["Type", TYPE_RAPPORT_LABELS[rapport.type_rapport] ?? rapport.type_rapport],
          ["Date", formatDate(rapport.created_at, true)],
          ["Chauffeur", rapport.nom_chauffeur],
          ["Immatriculation", rapport.immatriculation],
          ["Véhicule", [rapport.marque, rapport.modele].filter(Boolean).join(" ") || "—"],
          ["Kilométrage", formatKm(rapport.kilometrage)],
          ["Visite technique", formatDate(rapport.visite_technique)],
          ["Filiale", rapport.filiale || "—"],
          ...(rapport.nom_instructeur ? [["Instructeur", rapport.nom_instructeur]] : []),
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-gray-50 px-3 py-2">
            <dt className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">{k}</dt>
            <dd className="font-medium text-gray-800 break-words">{v}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="anomalies-titre">
        <h3 id="anomalies-titre" className="text-sm font-bold text-camublue-900 mb-2 flex items-center gap-2">
          Anomalies <StatutRapport rapport={rapport} />
        </h3>
        {anomalies.length === 0 ? (
          <p className="text-sm text-gray-500">Tous les points sont conformes.</p>
        ) : (
          <ul className="space-y-2">
            {anomalies.map(a => (
              <li key={a.cle} className={`rounded-xl px-3 py-2 text-sm ring-1 ${a.critique ? "bg-red-50 ring-red-200" : "bg-amber-50 ring-amber-200"}`}>
                <div className="flex items-center gap-2 font-semibold text-gray-800">
                  {a.critique && <AlertTriangle size={14} className="text-red-600 shrink-0" aria-label="Point critique" />}
                  {a.libelle}
                </div>
                <p className="text-xs text-gray-500">{a.section}</p>
                {a.commentaire && <p className="text-gray-600 mt-0.5">{a.commentaire}</p>}
              </li>
            ))}
          </ul>
        )}
        {rapport.nb_critiques > 0 && (
          <p className="mt-2 text-xs text-red-700">
            Point critique non conforme : le formulaire prévoit l'immobilisation immédiate du véhicule.
          </p>
        )}
      </section>

      <section aria-labelledby="photos-titre">
        <h3 id="photos-titre" className="text-sm font-bold text-camublue-900 mb-2">Photos</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {modele.photos.filter(p => rapport.photos.includes(p.position)).map(p => (
            <Photo key={p.position} rapportId={rapport.id} position={p.position} libelle={p.libelle} />
          ))}
        </div>
      </section>

      <section aria-labelledby="detail-titre">
        <h3 id="detail-titre" className="text-sm font-bold text-camublue-900 mb-2">Détail de la checklist</h3>
        <div className="space-y-3">
          {modele.sections.map(s => (
            <details key={s.cle} className="rounded-xl border border-gray-100 bg-white group">
              <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-gray-700">{s.titre}</summary>
              <ul className="divide-y divide-gray-50 px-3 pb-2">
                {s.items.map(i => {
                  const rep = rapport.reponses.items[i.cle];
                  const nc = rep?.valeur === modele.types_reponse[s.type].negative;
                  return (
                    <li key={i.cle} className="py-1.5 text-sm flex items-start justify-between gap-3">
                      <span className="text-gray-700">
                        {i.libelle}
                        {i.critique && <span className="ml-1 text-[10px] font-bold text-red-600 uppercase">critique</span>}
                        {rep?.commentaire && <span className="block text-xs text-gray-500">{rep.commentaire}</span>}
                      </span>
                      <span className={`shrink-0 font-semibold ${nc ? "text-red-600" : "text-emerald-600"}`}>
                        {rep ? libelleValeur(s.type, rep.valeur) : "—"}
                      </span>
                    </li>
                  );
                })}
                {rapport.reponses.autres?.[s.cle] && (
                  <li className="py-1.5 text-sm text-gray-700"><span className="font-medium">Autres :</span> {rapport.reponses.autres[s.cle]}</li>
                )}
              </ul>
            </details>
          ))}
        </div>
      </section>

      {rapport.commentaires && (
        <section>
          <h3 className="text-sm font-bold text-camublue-900 mb-1">Commentaires</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">{rapport.commentaires}</p>
        </section>
      )}

      {rapport.signature && (
        <section>
          <h3 className="text-sm font-bold text-camublue-900 mb-1">Signature du conducteur</h3>
          <img src={rapport.signature} alt={`Signature de ${rapport.nom_chauffeur}`} className="h-24 rounded-xl border border-gray-100 bg-white" />
        </section>
      )}
    </div>
  );
}

export default function RapportDetailModal({ rapportId, onClose }: { rapportId: number; onClose: () => void }) {
  const { modele, erreur: erreurModele } = useModele();
  const [rapport, setRapport] = useState<RapportDetail | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    setRapport(null); setErreur(false);
    inspectionService.get(rapportId).then(setRapport).catch(() => setErreur(true));
  }, [rapportId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-labelledby="rapport-titre"
        className="bg-white w-full sm:max-w-2xl h-[92vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-camublue-900 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><ClipboardCheck size={18} className="text-white" /></div>
            <div className="min-w-0">
              <p id="rapport-titre" className="text-white font-bold text-sm truncate">
                Checklist {rapport ? `— ${rapport.immatriculation}` : ""}
              </p>
              {rapport && <p className="text-white/70 text-xs">{formatDate(rapport.created_at, true)}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
            <X size={16} className="text-white" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          {erreur || erreurModele ? (
            <p className="text-sm text-red-600 text-center py-10">Impossible de charger ce rapport.</p>
          ) : !rapport || !modele ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-camublue-900" aria-label="Chargement" /></div>
          ) : (
            <Contenu rapport={rapport} modele={modele} />
          )}
        </div>
      </div>
    </div>
  );
}
