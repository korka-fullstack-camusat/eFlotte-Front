import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <span className="text-5xl font-extrabold text-camublue-900 tracking-tight mb-8">P.A.R.C-CAM</span>

      {/* Titre */}
      <h1 className="text-4xl font-extrabold text-camublue-900 text-center">
        Gestion de Flotte
      </h1>
      <p className="text-gray-400 text-sm mt-3 text-center">
        Connectez-vous pour accéder à votre espace.
      </p>

      {/* Bouton */}
      <button
        onClick={() => navigate("/login")}
        className="mt-8 px-10 py-3.5 bg-camublue-900 text-white font-semibold text-sm rounded-xl shadow hover:bg-camublue-900/90 active:scale-95 transition-all"
      >
        Se connecter
      </button>

      {/* Footer */}
      <p className="absolute bottom-6 text-xs text-gray-300">
        © 2026 P.A.R.C-CAM — Usage interne uniquement
      </p>
    </div>
  );
}
