import { useEffect, useRef, useState } from "react";
import { X, Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, MessageSquare, Info } from "lucide-react";
import toast from "react-hot-toast";
import { chauffeurComptesService } from "@/services/api";
import { exportToExcel } from "@/utils/exportExcel";
import type { LigneImportChauffeur, ResultatImportChauffeurs, StatutSms } from "@/types";

// Erreurs et lignes ignorées d'abord : ce sont elles qu'il faut corriger
const ORDRE = { ERREUR: 0, IGNORE: 1, CREE: 2 } as const;

const SMS_LABELS: Record<string, string> = {
  ENVOYE: "Envoyé", ECHEC: "Échec", NON_CONFIGURE: "Non configuré", SANS_NUMERO: "Sans numéro",
};

export default function ImportChauffeursModal({ onClose, onImporte }: { onClose: () => void; onImporte: () => void }) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [filiale, setFiliale] = useState("");
  const [envoyer, setEnvoyer] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<ResultatImportChauffeurs | null>(null);
  const [sms, setSms] = useState<StatutSms | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { chauffeurComptesService.statutSms().then(setSms).catch(() => {}); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !envoi) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [envoi, onClose]);

  const importer = async () => {
    if (!fichier) return;
    setEnvoi(true);
    try {
      const r = await chauffeurComptesService.importer(fichier, filiale, envoyer && !!sms?.actif);
      setResultat(r);
      if (r.crees) onImporte();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Import impossible");
    } finally {
      setEnvoi(false);
    }
  };

  const exporterIdentifiants = (r: ResultatImportChauffeurs) => {
    const crees = r.lignes.filter(l => l.statut === "CREE");
    exportToExcel<LigneImportChauffeur>(crees, [
      { header: "Nom", value: l => l.nom },
      { header: "Téléphone", value: l => l.telephone },
      { header: "Identifiant", value: l => l.username },
      { header: "Mot de passe initial", value: () => r.mot_de_passe_initial },
      { header: "Lien", value: () => r.app_url || window.location.origin },
      { header: "SMS", value: l => (l.sms ? SMS_LABELS[l.sms] : "Non demandé") },
    ], "identifiants_chauffeurs");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !envoi && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="imp-titre" onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><FileSpreadsheet size={18} className="text-white" /></div>
            <p id="imp-titre" className="text-white font-bold text-sm">Importer des comptes chauffeurs</p>
          </div>
          <button onClick={onClose} disabled={envoi} aria-label="Fermer" className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center">
            <X size={14} className="text-white" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          {!resultat ? (
            <>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Téléchargez le modèle Excel et remplissez une ligne par chauffeur.</li>
                <li>Importez le fichier : les comptes sont créés avec le mot de passe <span className="font-semibold text-gray-800">{sms?.mot_de_passe_initial ?? "initial"}</span>.</li>
                <li>Chaque chauffeur reçoit ses identifiants par SMS et choisit son mot de passe à la 1re connexion.</li>
              </ol>
              <button onClick={() => chauffeurComptesService.modele().catch(() => toast.error("Téléchargement impossible"))}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-camublue-900 text-camublue-900 hover:bg-camublue-900/5 text-sm font-semibold">
                <Download size={15} /> Télécharger le modèle Excel
              </button>

              <div>
                <p className="block text-xs font-semibold text-gray-600 mb-1.5">Fichier Excel *</p>
                <input ref={input} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                  onChange={e => setFichier(e.target.files?.[0] ?? null)} aria-label="Fichier Excel des chauffeurs" />
                <button type="button" onClick={() => input.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-gray-300 hover:border-camublue-900/50 px-4 py-6 text-sm text-gray-500 flex flex-col items-center gap-1.5">
                  <Upload size={20} className="text-camublue-900" />
                  {fichier ? <span className="font-semibold text-gray-800">{fichier.name}</span> : "Choisir le fichier (.xlsx)"}
                </button>
              </div>

              <div>
                <label htmlFor="imp-filiale" className="block text-xs font-semibold text-gray-600 mb-1.5">Filiale par défaut</label>
                <input id="imp-filiale" type="text" value={filiale} onChange={e => setFiliale(e.target.value)}
                  placeholder="ex : Camusat Sénégal" className="input-base" />
                <p className="mt-1 text-xs text-gray-500">Utilisée pour les lignes dont la colonne Filiale est vide.</p>
              </div>

              {sms && !sms.actif ? (
                <p className="flex gap-2 rounded-xl bg-amber-50 ring-1 ring-amber-200 p-3 text-sm text-amber-800">
                  <Info size={16} className="shrink-0 mt-0.5" />
                  Les SMS ne sont pas encore configurés sur le serveur (Orange SMS API). Les comptes seront créés et vous pourrez télécharger la liste des identifiants à transmettre.
                </p>
              ) : (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={envoyer} onChange={e => setEnvoyer(e.target.checked)} className="w-4 h-4 accent-camublue-900" />
                  <MessageSquare size={15} className="text-camublue-900" /> Envoyer les identifiants par SMS à chaque chauffeur
                </label>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ["Comptes créés", resultat.crees, "text-emerald-600"],
                  ["Déjà existants", resultat.ignores, "text-gray-600"],
                  ["Erreurs", resultat.erreurs, "text-red-600"],
                  ["SMS envoyés", resultat.sms_envoyes, "text-camublue-900"],
                ].map(([l, v, c]) => (
                  <div key={l as string} className="rounded-xl bg-gray-50 px-3 py-2 text-center">
                    <p className={`text-2xl font-bold ${c}`}>{v as number}</p>
                    <p className="text-xs text-gray-500">{l}</p>
                  </div>
                ))}
              </div>
              {resultat.sms_echecs > 0 && (
                <p className="text-sm text-red-700">{resultat.sms_echecs} SMS n'ont pas pu être envoyés : voir la colonne SMS. Vous pourrez les renvoyer depuis la liste des comptes.</p>
              )}
              <div className="overflow-x-auto rounded-xl border border-gray-100 max-h-[45vh]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0">
                    <tr>
                      <th scope="col" className="text-left px-3 py-2">Ligne</th>
                      <th scope="col" className="text-left px-3 py-2">Chauffeur</th>
                      <th scope="col" className="text-left px-3 py-2">Identifiant</th>
                      <th scope="col" className="text-left px-3 py-2">Résultat</th>
                      <th scope="col" className="text-left px-3 py-2">SMS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...resultat.lignes].sort((a, b) => ORDRE[a.statut] - ORDRE[b.statut] || a.ligne - b.ligne).map(l => (
                      <tr key={l.ligne}>
                        <td className="px-3 py-2 text-gray-400">{l.ligne}</td>
                        <td className="px-3 py-2">
                          <span className="font-medium text-gray-800">{l.nom || "—"}</span>
                          <span className="block text-xs text-gray-400">{l.telephone}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{l.username || "—"}</td>
                        <td className="px-3 py-2">
                          {l.statut === "CREE" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs"><CheckCircle2 size={13} /> Créé</span>
                          ) : l.statut === "IGNORE" ? (
                            <span className="text-gray-500 font-semibold text-xs">Ignoré</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs"><AlertTriangle size={13} /> Erreur</span>
                          )}
                          {l.message && <span className="block text-xs text-gray-500">{l.message}</span>}
                        </td>
                        <td className={`px-3 py-2 text-xs font-semibold ${l.sms === "ENVOYE" ? "text-emerald-600" : l.sms === "ECHEC" ? "text-red-600" : "text-gray-400"}`}>
                          {l.sms ? SMS_LABELS[l.sms] : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 px-6 py-4 flex justify-end gap-2 flex-wrap">
          {!resultat ? (
            <>
              <button onClick={onClose} disabled={envoi} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">Annuler</button>
              <button onClick={importer} disabled={!fichier || envoi}
                className="px-5 py-2.5 rounded-xl bg-camublue-900 hover:bg-camublue-900/90 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50">
                {envoi ? <><Loader2 size={15} className="animate-spin" /> Import en cours…</> : <><Upload size={15} /> Importer</>}
              </button>
            </>
          ) : (
            <>
              {resultat.crees > 0 && (
                <button onClick={() => exporterIdentifiants(resultat)}
                  className="px-4 py-2.5 rounded-xl border border-camublue-900 text-camublue-900 hover:bg-camublue-900/5 text-sm font-semibold inline-flex items-center gap-2">
                  <Download size={15} /> Télécharger les identifiants
                </button>
              )}
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-camublue-900 text-white text-sm font-semibold">Fermer</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
