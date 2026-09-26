import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * `chauffeur` : route de l'app mobile chauffeur (/app…).
 * Sans : route de la plateforme de gestion. Chaque profil est renvoyé vers son espace.
 */
export default function ProtectedRoute({ children, chauffeur = false }: { children: React.ReactNode; chauffeur?: boolean }) {
  const { token, isChauffeur } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (chauffeur && !isChauffeur) return <Navigate to="/dashboard" replace />;
  if (!chauffeur && isChauffeur) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
