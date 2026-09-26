import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Home, History, LogOut } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

/** Mise en page de l'app chauffeur : pensée téléphone d'abord, centrée sur tablette / ordinateur. */
export default function ChauffeurLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [confirmer, setConfirmer] = useState(false);

  const onglet = ({ isActive }: { isActive: boolean }) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold transition ${
      isActive ? "text-camublue-900" : "text-gray-400 hover:text-gray-600"
    }`;

  return (
    <div className="min-h-screen bg-camugray-100 flex flex-col">
      <header className="sticky top-0 z-30 bg-camublue-900 text-white pt-[env(safe-area-inset-top)]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <span className="text-lg font-extrabold tracking-tight">P.A.R.C-CAM</span>
          <button onClick={() => setConfirmer(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-3 py-2 text-xs font-semibold"
            aria-label="Se déconnecter">
            <span className="max-w-[9rem] truncate hidden sm:inline">{user?.full_name || user?.username}</span>
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pt-5 pb-28">{children}</main>

      <nav aria-label="Navigation principale"
        className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-2xl mx-auto flex">
          <NavLink to="/app" end className={onglet}><Home size={20} aria-hidden />Accueil</NavLink>
          <NavLink to="/app/historique" className={onglet}><History size={20} aria-hidden />Historique</NavLink>
        </div>
      </nav>

      {confirmer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmer(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="deco-titre" className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs" onClick={e => e.stopPropagation()}>
            <h3 id="deco-titre" className="text-lg font-bold text-camublue-900 mb-2">Déconnexion</h3>
            <p className="mb-6 text-sm text-gray-600">Voulez-vous vraiment vous déconnecter ?</p>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium" onClick={() => setConfirmer(false)}>Annuler</button>
              <button className="px-4 py-2.5 rounded-xl bg-camublue-900 text-white text-sm font-semibold" onClick={logout}>Déconnecter</button>
            </div>
          </div>
        </div>
      )}
      <Toaster position="top-center" />
    </div>
  );
}
