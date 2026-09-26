import { NavLink, Link } from "react-router-dom";
import { Home, History, UserRound, Car } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

/** Mise en page de l'app chauffeur : pensée téléphone d'abord, centrée sur tablette / ordinateur. */
export default function ChauffeurLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const nom = user?.full_name || user?.username || "";
  const prenom = nom.split(" ")[0];
  const initiales = nom.split(/\s+/).filter(Boolean).slice(0, 2).map(m => m[0]!.toUpperCase()).join("");
  const aujourdhui = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const onglet = ({ isActive }: { isActive: boolean }) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold transition ${
      isActive ? "text-camublue-900" : "text-gray-400 hover:text-gray-600"
    }`;

  return (
    <div className="min-h-screen bg-camugray-100 flex flex-col">
      {/* Barre de marque (reste visible au défilement) */}
      <header className="sticky top-0 z-30 bg-camublue-900 text-white pt-[env(safe-area-inset-top)]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0" aria-hidden>
              <Car size={18} className="text-camublue-900" />
            </div>
            <p className="truncate text-base leading-none">
              <span className="font-extrabold tracking-tight">eFlotte</span>
              <span className="mx-1.5 text-white/40">—</span>
              <span className="font-semibold tracking-[0.12em] text-white/85">CAMUSAT</span>
            </p>
          </div>
          <Link to="/app/profil" aria-label="Mon profil"
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 ring-1 ring-white/25 flex items-center justify-center shrink-0 text-xs font-bold transition">
            {initiales || <UserRound size={18} />}
          </Link>
        </div>
      </header>

      {/* Salutation */}
      <div className="bg-camublue-900 text-white rounded-b-3xl shadow-sm">
        <div className="max-w-2xl mx-auto px-4 pt-2 pb-6">
          <p className="text-2xl font-bold truncate">
            Bonjour {prenom} <span role="img" aria-label="salutation" className="inline-block origin-[70%_70%] animate-[wave_1.6s_ease-in-out_1] motion-reduce:animate-none">👋</span>
          </p>
          <p className="text-sm text-white/70 first-letter:uppercase">{aujourdhui}</p>
        </div>
      </div>

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
