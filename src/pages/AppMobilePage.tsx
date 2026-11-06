import { useEffect, useState } from "react";
import { Download, Smartphone, Check, Copy, ShieldCheck, Loader2 } from "lucide-react";
import Marque from "@/components/brand/Marque";

/**
 * Page publique /app : lien à partager aux chauffeurs pour télécharger l'application
 * Android (APK déposé sur le serveur dans telechargements/eflotte-camusat.apk, servi par Caddy).
 */
const APK = "/telechargements/eflotte-camusat.apk";

type Infos = { etat: "chargement" } | { etat: "absent" } | { etat: "ok"; taille: number | null; date: string | null };

const formatTaille = (o: number) => `${(o / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function AppMobilePage() {
  const [infos, setInfos] = useState<Infos>({ etat: "chargement" });
  const [copie, setCopie] = useState(false);
  const lien = `${window.location.origin}/app`;

  useEffect(() => {
    document.title = "Télécharger l'application eFlotte";
    // Taille et date de mise en ligne lues sur le fichier lui-même (sans le télécharger)
    fetch(APK, { method: "HEAD", cache: "no-store" })
      .then(r => {
        const type = r.headers.get("content-type") ?? "";
        if (!r.ok || type.includes("text/html")) return setInfos({ etat: "absent" });
        const taille = Number(r.headers.get("content-length")) || null;
        setInfos({ etat: "ok", taille, date: r.headers.get("last-modified") });
      })
      .catch(() => setInfos({ etat: "absent" }));
  }, []);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2000);
    } catch {
      window.prompt("Copiez le lien :", lien);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-camublue-900/5 to-white flex flex-col items-center px-4 py-10">
      <Marque taille="lg" className="mb-8" />

      <main className="w-full max-w-md bg-white rounded-3xl shadow-lg ring-1 ring-gray-100 p-6 sm:p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-camublue-900/10 flex items-center justify-center mb-4">
          <Smartphone size={32} className="text-camublue-900" aria-hidden />
        </div>
        <h1 className="text-2xl font-extrabold text-camublue-900">Application mobile eFlotte</h1>
        <p className="text-gray-500 text-sm mt-2">
          Checklists véhicule, demandes (remontée, panne, vidange) et notifications pour les chauffeurs Camusat.
        </p>

        {infos.etat === "absent" ? (
          <p className="mt-6 rounded-xl bg-amber-50 ring-1 ring-amber-200 text-amber-800 text-sm font-medium p-4" role="status">
            L'application n'est pas encore disponible au téléchargement. Réessayez plus tard.
          </p>
        ) : (
          <>
            <a href={APK} download="eFlotte-Camusat.apk" aria-disabled={infos.etat === "chargement"}
              className="mt-6 w-full inline-flex items-center justify-center gap-2.5 bg-camublue-900 hover:bg-camublue-900/90 text-white font-bold text-base rounded-2xl py-4 shadow-md active:scale-[0.98] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-camublue-900/30">
              {infos.etat === "chargement" ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Download size={20} aria-hidden />}
              Télécharger l'application
            </a>
            <p className="mt-2 text-xs text-gray-400">
              Android
              {infos.etat === "ok" && infos.taille ? ` · ${formatTaille(infos.taille)}` : ""}
              {infos.etat === "ok" && infos.date ? ` · mise à jour le ${formatDate(infos.date)}` : ""}
            </p>
          </>
        )}

        <ol className="mt-8 text-left text-sm text-gray-600 space-y-3">
          {[
            "Touchez « Télécharger l'application » depuis votre téléphone Android.",
            "Ouvrez le fichier téléchargé (eFlotte-Camusat.apk).",
            "Si le téléphone le demande, autorisez l'installation depuis cette source, puis touchez « Installer ».",
            "Ouvrez eFlotte et connectez-vous avec l'identifiant et le mot de passe reçus par SMS.",
          ].map((etape, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-camublue-900 text-white text-xs font-bold flex items-center justify-center" aria-hidden>{i + 1}</span>
              <span>{etape}</span>
            </li>
          ))}
        </ol>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <ShieldCheck size={14} aria-hidden /> Application interne Camusat Sénégal
        </p>
      </main>

      <div className="mt-6 w-full max-w-md flex items-center gap-2 rounded-2xl bg-white ring-1 ring-gray-100 p-2 pl-4">
        <span className="flex-1 truncate text-sm text-gray-600" title={lien}>{lien}</span>
        <button onClick={copier}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-camublue-900/10 text-camublue-900 text-sm font-semibold hover:bg-camublue-900 hover:text-white transition">
          {copie ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
          {copie ? "Lien copié" : "Copier le lien"}
        </button>
      </div>

      <p className="mt-8 text-xs text-gray-300">© 2026 eFlotte - Camusat</p>
    </div>
  );
}
