import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage     from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import DataFlottesPage from "@/pages/DataFlottesPage";
import TcdTechniquePage from "@/pages/TcdTechniquePage";
import ChauffeurPolesPage from "@/pages/ChauffeurPolesPage";
import SuiviDevisPage from "@/pages/SuiviDevisPage";
import CheckListsVLPage from "@/pages/CheckListsVLPage";
import EntretiensPage from "@/pages/EntretiensPage";
import EntretienBisPage from "@/pages/EntretienBisPage";
import SuiviPannePage from "@/pages/SuiviPannePage";
import PneumatiquePage from "@/pages/PneumatiquePage";
import SuiviSinistrePage from "@/pages/SuiviSinistrePage";
import ImportGlobalPage from "@/pages/ImportGlobalPage";
import UsersPage     from "@/pages/UsersPage";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/data-flottes" element={<ProtectedRoute><DataFlottesPage /></ProtectedRoute>} />
      <Route path="/tcd-technique" element={<ProtectedRoute><TcdTechniquePage /></ProtectedRoute>} />
      <Route path="/chauffeurs-poles" element={<ProtectedRoute><ChauffeurPolesPage /></ProtectedRoute>} />
      <Route path="/suivi-devis" element={<ProtectedRoute><SuiviDevisPage /></ProtectedRoute>} />
      <Route path="/checklists-vl" element={<ProtectedRoute><CheckListsVLPage /></ProtectedRoute>} />
      <Route path="/entretiens" element={<ProtectedRoute><EntretiensPage /></ProtectedRoute>} />
      <Route path="/entretiens-bis" element={<ProtectedRoute><EntretienBisPage /></ProtectedRoute>} />
      <Route path="/suivi-pannes" element={<ProtectedRoute><SuiviPannePage /></ProtectedRoute>} />
      <Route path="/pneumatiques" element={<ProtectedRoute><PneumatiquePage /></ProtectedRoute>} />
      <Route path="/suivi-sinistres" element={<ProtectedRoute><SuiviSinistrePage /></ProtectedRoute>} />
      <Route path="/import-global" element={<ProtectedRoute><ImportGlobalPage /></ProtectedRoute>} />
      <Route path="/users"     element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
