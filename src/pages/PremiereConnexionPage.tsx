import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

/** Compte créé avec le mot de passe commun : le chauffeur choisit le sien avant d'accéder à l'app. */
export default function PremiereConnexionPage() {
  const { token, user, motDePasseChange, logout, isChauffeur } = useAuth();
  const navigate = useNavigate();
  const ancienConnu = (useLocation().state as { ancien?: string } | null)?.ancien ?? "";
  const [ancien, setAncien] = useState(ancienConnu);
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [voir, setVoir] = useState(false);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  if (!token) return <Navigate to="/login" replace />;
  if (!user?.doit_changer_mdp) return <Navigate to={isChauffeur ? "/app" : "/dashboard"} replace />;

  const valider = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    if (nouveau.length < 6) { setErreur("Le mot de passe doit contenir au moins 6 caractères."); return; }
    if (nouveau !== confirmation) { setErreur("Les deux mots de passe ne correspondent pas."); return; }
    setEnvoi(true);
    try {
      await axios.post("/api/auth/me/mot-de-passe", { ancien, nouveau });
      motDePasseChange();
      navigate(isChauffeur ? "/app" : "/dashboard", { replace: true });
    } catch (err: any) {
      setErreur(err?.response?.data?.detail ?? "Impossible d'enregistrer, réessayez.");
    } finally {
      setEnvoi(false);
    }
  };

  const prenom = (user.full_name || user.username).split(" ")[0];

  return (
    <div className="min-h-screen flex items-center justify-center bg-camugray-100 px-4 py-10">
      <Toaster position="top-center" />
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-card p-7">
        <div className="w-12 h-12 rounded-2xl bg-camublue-900/10 flex items-center justify-center mb-4">
          <KeyRound className="text-camublue-900" aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-camublue-900">Bienvenue {prenom}</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          Pour sécuriser votre compte, choisissez votre propre mot de passe. Vous l'utiliserez pour vos prochaines connexions.
        </p>
        <form onSubmit={valider} className="space-y-4">
          {!ancienConnu && (
            <div>
              <label htmlFor="pc-ancien" className="block text-xs font-semibold text-gray-600 mb-1.5">Mot de passe reçu par SMS</label>
              <input id="pc-ancien" type={voir ? "text" : "password"} value={ancien} onChange={e => setAncien(e.target.value)}
                autoComplete="current-password" required className="input-base min-h-[44px]" />
            </div>
          )}
          <div>
            <label htmlFor="pc-nouveau" className="block text-xs font-semibold text-gray-600 mb-1.5">Nouveau mot de passe (6 caractères min.)</label>
            <input id="pc-nouveau" type={voir ? "text" : "password"} value={nouveau} onChange={e => setNouveau(e.target.value)}
              autoComplete="new-password" required autoFocus className="input-base min-h-[44px]" />
          </div>
          <div>
            <label htmlFor="pc-confirm" className="block text-xs font-semibold text-gray-600 mb-1.5">Confirmer le mot de passe</label>
            <input id="pc-confirm" type={voir ? "text" : "password"} value={confirmation} onChange={e => setConfirmation(e.target.value)}
              autoComplete="new-password" required className="input-base min-h-[44px]" />
          </div>
          <button type="button" onClick={() => setVoir(v => !v)} className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            {voir ? <EyeOff size={14} /> : <Eye size={14} />} {voir ? "Masquer" : "Afficher"} les mots de passe
          </button>
          {erreur && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erreur}</p>}
          <button type="submit" disabled={envoi}
            className="w-full min-h-[48px] rounded-xl bg-camublue-900 hover:bg-camublue-900/90 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
            {envoi && <Loader2 size={16} className="animate-spin" />} Enregistrer et continuer
          </button>
        </form>
        <button onClick={logout} className="mt-5 w-full text-center text-xs text-gray-400 hover:text-gray-600">Se déconnecter</button>
      </div>
    </div>
  );
}
