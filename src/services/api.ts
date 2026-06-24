import axios from "axios";

if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}

import type {
  Vehicule, UserAccount, CoutFlotte, CoutFlottePage, ImportCoutsResult,
  KpiCouts, EvolutionPoint, RepartitionPoint, VehiculeCoutPoint,
  EntretienVehicule, ImportEntretiensResult, EntretienBis, ImportEntretienBisResult, FiltresCouts, CoutsFilters, PivotResult,
  MissionChauffeur, MissionChauffeurPage, FiltresMissions, MissionsFilters, ImportMissionsResult,
  SuiviDevis, SuiviDevisPage, FiltresDevis, DevisFilters, ImportDevisResult,
  CheckListVL, CheckListVLPage, FiltresCheckListVL, CheckListVLFilters, ImportCheckListVLResult,
  SuiviPanne, SuiviPannePage, FiltresSuiviPanne, PannesFilters, ImportSuiviPanneResult,
  Pneumatique, PneumatiquePage, FiltresPneumatiques, PneumatiquesFilters, ImportPneumatiqueResult,
  SuiviSinistre, SuiviSinistrePage, SinistresFilters, ImportSinistreResult,
} from "@/types";





export const vehiculeService = {
  getAll: async (): Promise<Vehicule[]> => {
    const { data } = await axios.get("/api/vehicules");
    return data;
  },
  create: async (payload: Partial<Vehicule>): Promise<Vehicule> => {
    const { data } = await axios.post("/api/vehicules", payload);
    return data;
  },
  update: async (id: number, payload: Partial<Vehicule>): Promise<Vehicule> => {
    const { data } = await axios.patch(`/api/vehicules/${id}`, payload);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await axios.delete(`/api/vehicules/${id}`);
  },
};

export const coutService = {
  getAll: async (params?: CoutsFilters & { type_cout?: string; page?: number; page_size?: number }): Promise<CoutFlottePage> => {
    const { data } = await axios.get("/api/couts", { params });
    return data;
  },
  create: async (payload: Partial<CoutFlotte>): Promise<CoutFlotte> => {
    const { data } = await axios.post("/api/couts", payload);
    return data;
  },
  update: async (id: number, payload: Partial<CoutFlotte>): Promise<CoutFlotte> => {
    const { data } = await axios.patch(`/api/couts/${id}`, payload);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await axios.delete(`/api/couts/${id}`);
  },
  kpi: async (filters?: CoutsFilters): Promise<KpiCouts> => {
    const { data } = await axios.get("/api/couts/kpi", { params: filters });
    return data;
  },
  evolution: async (params?: CoutsFilters & { type_cout?: string }): Promise<EvolutionPoint[]> => {
    const { data } = await axios.get("/api/couts/evolution", { params });
    return data;
  },
  repartition: async (filters?: CoutsFilters): Promise<RepartitionPoint[]> => {
    const { data } = await axios.get("/api/couts/repartition", { params: filters });
    return data;
  },
  parVehicule: async (params?: CoutsFilters & { type_cout?: string; limit?: number }): Promise<VehiculeCoutPoint[]> => {
    const { data } = await axios.get("/api/couts/par-vehicule", { params });
    return data;
  },
  topCarburant: async (params: { type_carburant: "ESSENCE" | "GASOIL"; annee?: number; mois?: string; limit?: number }): Promise<VehiculeCoutPoint[]> => {
    const { data } = await axios.get("/api/couts/top-carburant", { params });
    return data;
  },
  filtres: async (): Promise<FiltresCouts> => {
    const { data } = await axios.get("/api/couts/filtres");
    return data;
  },
  pivot: async (params: CoutsFilters & { group_by: string; type_cout?: string }): Promise<PivotResult> => {
    const { data } = await axios.get("/api/couts/pivot", { params });
    return data;
  },
  importExcel: async (file: File): Promise<ImportCoutsResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axios.post("/api/couts/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};

export const entretienService = {
  getAll: async (): Promise<EntretienVehicule[]> => {
    const { data } = await axios.get("/api/entretiens");
    return data;
  },
  getPaliers: async (): Promise<number[]> => {
    const { data } = await axios.get("/api/entretiens/paliers");
    return data;
  },
  create: async (payload: Partial<EntretienVehicule>): Promise<EntretienVehicule> => {
    const { data } = await axios.post("/api/entretiens", payload);
    return data;
  },
  update: async (id: number, payload: Partial<EntretienVehicule>): Promise<EntretienVehicule> => {
    const { data } = await axios.patch(`/api/entretiens/${id}`, payload);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await axios.delete(`/api/entretiens/${id}`);
  },
  importExcel: async (file: File): Promise<ImportEntretiensResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axios.post("/api/entretiens/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};

export const entretienBisService = {
  getAll: async (): Promise<EntretienBis[]> => {
    const { data } = await axios.get("/api/entretiens-bis");
    return data;
  },
  getPaliers: async (): Promise<number[]> => {
    const { data } = await axios.get("/api/entretiens-bis/paliers");
    return data;
  },
  create: async (payload: Partial<EntretienBis>): Promise<EntretienBis> => {
    const { data } = await axios.post("/api/entretiens-bis", payload);
    return data;
  },
  update: async (id: number, payload: Partial<EntretienBis>): Promise<EntretienBis> => {
    const { data } = await axios.patch(`/api/entretiens-bis/${id}`, payload);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await axios.delete(`/api/entretiens-bis/${id}`);
  },
  importExcel: async (file: File): Promise<ImportEntretienBisResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axios.post("/api/entretiens-bis/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  autoCalculer: async (): Promise<EntretienBis[]> => {
    const { data } = await axios.post("/api/entretiens-bis/auto-calculer");
    return data;
  },
};

export const missionChauffeurService = {
  getAll: async (params?: MissionsFilters & { page?: number; page_size?: number }): Promise<MissionChauffeurPage> => {
    const { data } = await axios.get("/api/missions-chauffeur", { params });
    return data;
  },
  create: async (payload: Partial<MissionChauffeur>): Promise<MissionChauffeur> => {
    const { data } = await axios.post("/api/missions-chauffeur", payload);
    return data;
  },
  update: async (id: number, payload: Partial<MissionChauffeur>): Promise<MissionChauffeur> => {
    const { data } = await axios.patch(`/api/missions-chauffeur/${id}`, payload);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await axios.delete(`/api/missions-chauffeur/${id}`);
  },
  filtres: async (): Promise<FiltresMissions> => {
    const { data } = await axios.get("/api/missions-chauffeur/filtres");
    return data;
  },
  importExcel: async (file: File): Promise<ImportMissionsResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axios.post("/api/missions-chauffeur/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};

export const suiviDevisService = {
  getAll: async (params?: DevisFilters & { page?: number; page_size?: number }): Promise<SuiviDevisPage> => {
    const { data } = await axios.get("/api/suivi-devis", { params });
    return data;
  },
  create: async (payload: Partial<SuiviDevis>): Promise<SuiviDevis> => {
    const { data } = await axios.post("/api/suivi-devis", payload);
    return data;
  },
  update: async (id: number, payload: Partial<SuiviDevis>): Promise<SuiviDevis> => {
    const { data } = await axios.patch(`/api/suivi-devis/${id}`, payload);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await axios.delete(`/api/suivi-devis/${id}`);
  },
  filtres: async (): Promise<FiltresDevis> => {
    const { data } = await axios.get("/api/suivi-devis/filtres");
    return data;
  },
  importExcel: async (file: File): Promise<ImportDevisResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axios.post("/api/suivi-devis/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};

export const checklistVLService = {
  getAll: async (params?: CheckListVLFilters & { page?: number; page_size?: number }): Promise<CheckListVLPage> => {
    const { data } = await axios.get("/api/checklists-vl", { params });
    return data;
  },
  create: async (payload: Partial<CheckListVL>): Promise<CheckListVL> => {
    const { data } = await axios.post("/api/checklists-vl", payload);
    return data;
  },
  update: async (id: number, payload: Partial<CheckListVL>): Promise<CheckListVL> => {
    const { data } = await axios.patch(`/api/checklists-vl/${id}`, payload);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await axios.delete(`/api/checklists-vl/${id}`);
  },
  filtres: async (): Promise<FiltresCheckListVL> => {
    const { data } = await axios.get("/api/checklists-vl/filtres");
    return data;
  },
  semaines: async (): Promise<string[]> => {
    const { data } = await axios.get("/api/checklists-vl/semaines");
    return data;
  },
  statuts: async (): Promise<string[]> => {
    const { data } = await axios.get("/api/checklists-vl/statuts");
    return data;
  },
  importExcel: async (file: File): Promise<ImportCheckListVLResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axios.post("/api/checklists-vl/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};

export const suiviPanneService = {
  getAll: async (params?: PannesFilters & { page?: number; page_size?: number }): Promise<SuiviPannePage> => {
    const { data } = await axios.get("/api/suivi-pannes", { params });
    return data;
  },
  create: async (payload: Partial<SuiviPanne>): Promise<SuiviPanne> => {
    const { data } = await axios.post("/api/suivi-pannes", payload);
    return data;
  },
  update: async (id: number, payload: Partial<SuiviPanne>): Promise<SuiviPanne> => {
    const { data } = await axios.patch(`/api/suivi-pannes/${id}`, payload);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await axios.delete(`/api/suivi-pannes/${id}`);
  },
  filtres: async (): Promise<FiltresSuiviPanne> => {
    const { data } = await axios.get("/api/suivi-pannes/filtres");
    return data;
  },
  importExcel: async (file: File): Promise<ImportSuiviPanneResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axios.post("/api/suivi-pannes/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};

export const suiSinistreService = {
  getAll: async (params?: SinistresFilters): Promise<SuiviSinistrePage> => {
    const { data } = await axios.get("/api/sinistres", { params });
    return data;
  },
  create: async (payload: Partial<SuiviSinistre>): Promise<SuiviSinistre> => {
    const { data } = await axios.post("/api/sinistres", payload);
    return data;
  },
  update: async (id: number, payload: Partial<SuiviSinistre>): Promise<SuiviSinistre> => {
    const { data } = await axios.put(`/api/sinistres/${id}`, payload);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await axios.delete(`/api/sinistres/${id}`);
  },
  importExcel: async (file: File): Promise<ImportSinistreResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axios.post("/api/sinistres/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};

export const pneumatiqueService = {
  getAll: async (params?: PneumatiquesFilters & { page?: number; page_size?: number }): Promise<PneumatiquePage> => {
    const { data } = await axios.get("/api/pneumatiques", { params });
    return data;
  },
  create: async (payload: Partial<Pneumatique>): Promise<Pneumatique> => {
    const { data } = await axios.post("/api/pneumatiques", payload);
    return data;
  },
  update: async (id: number, payload: Partial<Pneumatique>): Promise<Pneumatique> => {
    const { data } = await axios.patch(`/api/pneumatiques/${id}`, payload);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await axios.delete(`/api/pneumatiques/${id}`);
  },
  filtres: async (): Promise<FiltresPneumatiques> => {
    const { data } = await axios.get("/api/pneumatiques/filtres");
    return data;
  },
  importExcel: async (file: File): Promise<ImportPneumatiqueResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await axios.post("/api/pneumatiques/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};

export const userService = {
  getAll: async (): Promise<UserAccount[]> => {
    const { data } = await axios.get("/api/auth/users");
    return data;
  },
  create: async (payload: { username: string; password: string; full_name?: string; email?: string; role: string }): Promise<UserAccount> => {
    const { data } = await axios.post("/api/auth/users", payload);
    return data;
  },
  update: async (id: number, payload: Partial<UserAccount> & { password?: string }): Promise<UserAccount> => {
    const { data } = await axios.patch(`/api/auth/users/${id}`, payload);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await axios.delete(`/api/auth/users/${id}`);
  },
};
