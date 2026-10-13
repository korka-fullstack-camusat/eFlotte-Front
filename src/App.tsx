import { lazy, Suspense, useEffect, type ComponentType } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages chargées à la demande ; toutes sont préchargées en arrière-plan une fois
// l'application affichée, pour que la navigation suivante soit instantanée.
const prechargements: Array<() => Promise<unknown>> = [];
function page<T extends ComponentType<any>>(charger: () => Promise<{ default: T }>) {
  prechargements.push(charger);
  return lazy(charger);
}

const LoginPage          = page(() => import("@/pages/LoginPage"));
const LandingPage        = page(() => import("@/pages/LandingPage"));
const DashboardPage      = page(() => import("@/pages/DashboardPage"));
const DataFlottesPage    = page(() => import("@/pages/DataFlottesPage"));
const ChauffeurPolesPage = page(() => import("@/pages/ChauffeurPolesPage"));
const SuiviDevisPage     = page(() => import("@/pages/SuiviDevisPage"));
const CheckListsVLPage   = page(() => import("@/pages/CheckListsVLPage"));
const EntretiensPage     = page(() => import("@/pages/EntretiensPage"));
const EntretienBisPage   = page(() => import("@/pages/EntretienBisPage"));
const SuiviPannePage     = page(() => import("@/pages/SuiviPannePage"));
const PneumatiquePage    = page(() => import("@/pages/PneumatiquePage"));
const SuiviSinistrePage  = page(() => import("@/pages/SuiviSinistrePage"));
const ImportPage         = page(() => import("@/pages/ImportPage"));
const ExportPage         = page(() => import("@/pages/ExportPage"));
const UsersPage          = page(() => import("@/pages/UsersPage"));
const CarburantPage      = page(() => import("@/pages/CarburantPage"));
const RecapPannePage     = page(() => import("@/pages/RecapPannePage"));
const InspectionsPage    = page(() => import("@/pages/InspectionsPage"));
const ChauffeurHomePage       = page(() => import("@/pages/chauffeur/ChauffeurHomePage"));
const ChauffeurHistoriquePage = page(() => import("@/pages/chauffeur/ChauffeurHistoriquePage"));
const ChauffeurProfilPage     = page(() => import("@/pages/chauffeur/ChauffeurProfilPage"));
const PremiereConnexionPage   = page(() => import("@/pages/PremiereConnexionPage"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-camugray-100">
      <div className="w-8 h-8 border-3 border-camublue-900/20 border-t-camublue-900 rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    const lancer = () => prechargements.forEach(charger => charger().catch(() => {}));
    const t = window.setTimeout(lancer, 2000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/premiere-connexion" element={<PremiereConnexionPage />} />

        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/data-flottes" element={<ProtectedRoute><DataFlottesPage /></ProtectedRoute>} />
        <Route path="/chauffeurs-poles" element={<ProtectedRoute><ChauffeurPolesPage /></ProtectedRoute>} />
        <Route path="/suivi-devis" element={<ProtectedRoute><SuiviDevisPage /></ProtectedRoute>} />
        <Route path="/checklists-vl" element={<ProtectedRoute><CheckListsVLPage /></ProtectedRoute>} />
        <Route path="/entretiens" element={<ProtectedRoute><EntretiensPage /></ProtectedRoute>} />
        <Route path="/entretiens-bis" element={<ProtectedRoute><EntretienBisPage /></ProtectedRoute>} />
        <Route path="/suivi-pannes" element={<ProtectedRoute><SuiviPannePage /></ProtectedRoute>} />
        <Route path="/pneumatiques" element={<ProtectedRoute><PneumatiquePage /></ProtectedRoute>} />
        <Route path="/suivi-sinistres" element={<ProtectedRoute><SuiviSinistrePage /></ProtectedRoute>} />
        <Route path="/import-global" element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />
        <Route path="/export-global" element={<ProtectedRoute><ExportPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
        <Route path="/carburant" element={<ProtectedRoute><CarburantPage /></ProtectedRoute>} />
        <Route path="/recap-pannes" element={<ProtectedRoute><RecapPannePage /></ProtectedRoute>} />
        <Route path="/inspections" element={<ProtectedRoute><InspectionsPage /></ProtectedRoute>} />

        {/* App mobile chauffeur */}
        <Route path="/app" element={<ProtectedRoute chauffeur><ChauffeurHomePage /></ProtectedRoute>} />
        <Route path="/app/historique" element={<ProtectedRoute chauffeur><ChauffeurHistoriquePage /></ProtectedRoute>} />
        <Route path="/app/profil" element={<ProtectedRoute chauffeur><ChauffeurProfilPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
