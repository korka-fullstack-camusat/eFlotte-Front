import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState("");

  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
      navigate("/dashboard");
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Identifiants incorrects ou erreur réseau.";
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-camugray-100 px-4 py-12">
      <Toaster position="top-right" />

      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-8 flex flex-col items-center relative">

          <img
            src="/logo-camusat.png"
            alt="Camusat"
            className="h-12 mb-6 object-contain"
          />

          <h1 className="text-xl font-bold text-slate-800 mb-1 text-center">Connexion</h1>
          <p className="text-sm text-slate-400 mb-7 text-center">Accédez à la gestion de la flotte</p>

          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Nom d'utilisateur
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="ex : admin"
                required autoFocus
                className="input-base"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-base pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm font-medium bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition shadow-sm disabled:opacity-60"
            >
              {loading ? "Connexion en cours…" : "Se connecter"}
            </button>
          </form>

          <footer className="mt-8 text-slate-300 text-xs text-center">
            © {new Date().getFullYear()} Camusat Sénégal — eFlotte
          </footer>
        </div>
      </div>
    </div>
  );
}
