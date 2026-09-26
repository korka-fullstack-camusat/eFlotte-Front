import { useCallback, useEffect, useState } from "react";
import { Car, Mail, FileText, KeyRound, LogOut, Loader2, RefreshCw, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import ChauffeurLayout from "@/components/inspections/ChauffeurLayout";
import { useAuth } from "@/contexts/AuthContext";
import { inspectionService } from "@/services/inspections";
import type { MonEspace } from "@/types";

function initiales(nom: string) {
  return nom.split(/\s+/).filter(Boolean).slice(0, 2).map(m => m[0]!.toUpperCase()).join("");
}

export default function ChauffeurProfilPage() {
  const { logout } = useAuth();
  const [espace, setEspace] = useState<MonEspace | null>(null);
  const [erreur, setErreur] = useState(false);
  const [confirmerDeco, setConfirmerDeco] = useState(false);
  const [mdpOuvert, setMdpOuvert] = useState(false);
  const [ancien, setAncien] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [voir, setVoir] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(() => {
    setErreur(false);
    inspectionService.moi().then(setEspace).catch(() => setErreur(true));
  }, []);
  useEffect(charger, [charger]);

  const changerMotDePasse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nouveau.length < 6) { toast.error("Au moins 6 caractères"); return; }
    if (nouveau !== confirmation) { toast.error("Les deux mots de passe ne correspondent pas"); return; }
    setEnvoi(true);
    try {
      await inspectionService.changerMotDePasse(ancien, nouveau);
      toast.success("Mot de passe modifié");
      setMdpOuvert(false); setAncien(""); setNouveau(""); setConfirmation("");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur, réessayez");
    } finally {
      setEnvoi(false);
    }
  };

  const nom = espace?.full_name || espace?.username || "";

  return (
    <ChauffeurLayout>
      <h1 className="sr-only">Mon profil</h1>
      {erreur ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-600 mb-4">Impossible de charger votre profil.</p>
          <button onClick={charger} className="inline-flex items-center gap-2 rounded-xl bg-camublue-900 text-white px-4 py-2.5 text-sm font-semibold">
            <RefreshCw size={15} /> Réessayer
          </button>
        </div>
      ) : !espace ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-camublue-900" aria-label="Chargement" /></div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-camublue-900 text-white text-2xl font-bold flex items-center justify-center" aria-hidden>
              {initiales(nom)}
            </div>
            <p className="mt-3 text-lg font-bold text-gray-800">{nom}</p>
            <p className="text-sm text-gray-500">@{espace.username} · Chauffeur</p>
          </div>

          <ul className="rounded-2xl bg-white ring-1 ring-gray-100 shadow-sm divide-y divide-gray-50">
            <li className="flex items-center gap-3 px-4 py-3">
              <Car size={18} className="text-camublue-900 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Véhicule attribué</p>
                <p className="text-sm font-medium text-gray-800 truncate">
                  {espace.vehicule_plaque
                    ? <>{espace.vehicule_plaque}{espace.vehicule && (espace.vehicule.marque || espace.vehicule.modele) ? ` · ${[espace.vehicule.marque, espace.vehicule.modele].filter(Boolean).join(" ")}` : ""}</>
                    : "Aucun"}
                </p>
              </div>
            </li>
            <li className="flex items-center gap-3 px-4 py-3">
              <Mail size={18} className="text-camublue-900 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-800 truncate">{espace.email || "Non renseigné"}</p>
              </div>
            </li>
            <li className="flex items-center gap-3 px-4 py-3">
              <FileText size={18} className="text-camublue-900 shrink-0" aria-hidden />
              <div>
                <p className="text-xs text-gray-500">Rapports envoyés</p>
                <p className="text-sm font-medium text-gray-800">{espace.nb_rapports}</p>
              </div>
            </li>
          </ul>

          <div className="rounded-2xl bg-white ring-1 ring-gray-100 shadow-sm overflow-hidden">
            <button onClick={() => setMdpOuvert(o => !o)} aria-expanded={mdpOuvert}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50">
              <KeyRound size={18} className="text-camublue-900 shrink-0" aria-hidden /> Changer mon mot de passe
            </button>
            {mdpOuvert && (
              <form onSubmit={changerMotDePasse} className="px-4 pb-4 space-y-3">
                {([["mdp-ancien", "Mot de passe actuel", ancien, setAncien, "current-password"],
                   ["mdp-nouveau", "Nouveau mot de passe (6 caractères min.)", nouveau, setNouveau, "new-password"],
                   ["mdp-confirm", "Confirmer le nouveau mot de passe", confirmation, setConfirmation, "new-password"]] as const).map(([id, label, val, set, ac]) => (
                  <div key={id}>
                    <label htmlFor={id} className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                    <input id={id} type={voir ? "text" : "password"} value={val} onChange={e => set(e.target.value)}
                      autoComplete={ac} required className="input-base min-h-[44px]" />
                  </div>
                ))}
                <button type="button" onClick={() => setVoir(v => !v)} className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                  {voir ? <EyeOff size={14} /> : <Eye size={14} />} {voir ? "Masquer" : "Afficher"} les mots de passe
                </button>
                <button type="submit" disabled={envoi}
                  className="w-full min-h-[44px] rounded-xl bg-camublue-900 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
                  {envoi && <Loader2 size={15} className="animate-spin" />} Enregistrer
                </button>
              </form>
            )}
          </div>

          <button onClick={() => setConfirmerDeco(true)}
            className="w-full min-h-[48px] rounded-2xl bg-white ring-1 ring-red-100 text-red-600 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-red-50">
            <LogOut size={17} /> Se déconnecter
          </button>
        </div>
      )}

      {confirmerDeco && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmerDeco(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="deco-titre" className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs" onClick={e => e.stopPropagation()}>
            <h3 id="deco-titre" className="text-lg font-bold text-camublue-900 mb-2">Déconnexion</h3>
            <p className="mb-6 text-sm text-gray-600">Voulez-vous vraiment vous déconnecter ?</p>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium" onClick={() => setConfirmerDeco(false)}>Annuler</button>
              <button className="px-4 py-2.5 rounded-xl bg-camublue-900 text-white text-sm font-semibold" onClick={logout}>Déconnecter</button>
            </div>
          </div>
        </div>
      )}
    </ChauffeurLayout>
  );
}
