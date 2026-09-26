import { NavLink, Link } from "react-router-dom";
import { Home, History, UserRound } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

/** Mise en page de l'app chauffeur : pensée téléphone d'abord, centrée sur tablette / ordinateur. */
export default function ChauffeurLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const prenom = (user?.full_name || user?.username || "").split(" ")[0];

  const onglet = ({ isActive }: { isActive: boolean }) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold transition ${
      isActive ? "text-camublue-900" : "text-gray-400 hover:text-gray-600"
    }`;

  return (
    <div className="min-h-screen bg-camugray-100 flex flex-col">
      <header className="sticky top-0 z-30 bg-camublue-900 text-white pt-[env(safe-area-inset-top)]">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <p className="text-xl font-bold truncate">
            Bonjour {prenom} <span role="img" aria-label="salutation" className="inline-block origin-[70%_70%] animate-[wave_1.6s_ease-in-out_1] motion-reduce:animate-none">👋</span>
          </p>
          <Link to="/app/profil" aria-label="Mon profil"
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0 transition">
            <UserRound size={20} />
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pt-5 pb-28">{children}</main>

      <nav aria-label="Navigation principale"
        className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-2xl mx-auto flex">
          <NavLink to="/app" end className={onglet}><Home size={20} aria-hidden />Accueil</NavLink>
          <NavLink to="/app/historique" className={onglet}><History size={20} aria-hidden />Historique</NavLink>
          <NavLink to="/app/profil" className={onglet}><UserRound size={20} aria-hidden />Profil</NavLink>
        </div>
      </nav>

      <Toaster position="top-center" />
    </div>
  );
}
