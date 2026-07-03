import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";

const LoginPage          = lazy(() => import("@/pages/LoginPage"));
const LandingPage        = lazy(() => import("@/pages/LandingPage"));
const DashboardPage      = lazy(() => import("@/pages/DashboardPage"));
const DataFlottesPage    = lazy(() => import("@/pages/DataFlottesPage"));
const ChauffeurPolesPage = lazy(() => import("@/pages/ChauffeurPolesPage"));
const SuiviDevisPage     = lazy(() => import("@/pages/SuiviDevisPage"));
const CheckListsVLPage   = lazy(() => import("@/pages/CheckListsVLPage"));
const EntretiensPage     = lazy(() => import("@/pages/EntretiensPage"));
const EntretienBisPage   = lazy(() => import("@/pages/EntretienBisPage"));
const SuiviPannePage     = lazy(() => import("@/pages/SuiviPannePage"));
const PneumatiquePage    = lazy(() => import("@/pages/PneumatiquePage"));
const SuiviSinistrePage  = lazy(() => import("@/pages/SuiviSinistrePage"));
const ImportPage         = lazy(() => import("@/pages/ImportPage"));
const ExportPage         = lazy(() => import("@/pages/ExportPage"));
const UsersPage          = lazy(() => import("@/pages/UsersPage"));
const CarburantPage      = lazy(() => import("@/pages/CarburantPage"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-camugray-100">
      <div className="w-8 h-8 border-3 border-camublue-900/20 border-t-camublue-900 rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
