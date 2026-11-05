/** Logo Camusat + « eFlotte - Camusat » (barre latérale, connexion, accueil). */
const TAILLES = {
  sm: { logo: "w-8 h-8", texte: "text-lg" },
  md: { logo: "w-10 h-10", texte: "text-xl" },
  lg: { logo: "w-12 h-12", texte: "text-2xl" },
  xl: { logo: "w-16 h-16", texte: "text-4xl" },
} as const;

export default function Marque({ taille = "md", className = "" }: { taille?: keyof typeof TAILLES; className?: string }) {
  const t = TAILLES[taille];
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src="/camusat-logo.png" alt="" aria-hidden="true" width={256} height={256}
        className={`${t.logo} shrink-0 object-contain`} />
      <span className={`${t.texte} font-extrabold text-camublue-900 tracking-tight whitespace-nowrap`}>
        eFlotte - Camusat
      </span>
    </span>
  );
}
