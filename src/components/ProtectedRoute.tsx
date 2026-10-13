import { Fragment } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAnnee } from "@/contexts/AnneeContext";

/**
 * `chauffeur` : route de l'app mobile chauffeur (/app…).
 * Sans : route de la plateforme de gestion. Chaque profil est renvoyé vers son espace.
 */
export default function ProtectedRoute({ children, chauffeur = false }: { children: React.ReactNode; chauffeur?: boolean }) {
  const { token, isChauffeur, user } = useAuth();
  const { annee } = useAnnee();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.doit_changer_mdp) return <Navigate to="/premiere-connexion" replace />;
  if (chauffeur && !isChauffeur) return <Navigate to="/dashboard" replace />;
  if (!chauffeur && isChauffeur) return <Navigate to="/app" replace />;
  // Plateforme : changer d'année recharge la page (et toutes ses données) avec la nouvelle année
  return chauffeur ? <>{children}</> : <Fragment key={annee}>{children}</Fragment>;
}
