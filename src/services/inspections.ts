import axios from "axios";
import type {
  ChecklistModele, MonEspace, NouveauRapportPayload, RapportDetail, RapportPage,
  RapportsFilters, RelanceChecklist, StatsInspections, SuiviChauffeur, VehiculeMini,
} from "@/types";

const BASE = "/api/inspections";

export const inspectionService = {
  // ── Commun ──
  modele: async (): Promise<ChecklistModele> => (await axios.get(`${BASE}/modele`)).data,
  get: async (id: number): Promise<RapportDetail> => (await axios.get(`${BASE}/rapports/${id}`)).data,
  /** Photo en blob : les <img> ne peuvent pas envoyer le jeton d'authentification. */
  photo: async (id: number, position: string): Promise<Blob> =>
    (await axios.get(`${BASE}/rapports/${id}/photos/${position}`, { responseType: "blob" })).data,

  // ── App chauffeur ──
  moi: async (): Promise<MonEspace> => (await axios.get(`${BASE}/moi`)).data,
  vehicules: async (): Promise<VehiculeMini[]> => (await axios.get(`${BASE}/vehicules`)).data,
  mesRapports: async (page: number, page_size: number): Promise<RapportPage> =>
    (await axios.get(`${BASE}/mes-rapports`, { params: { page, page_size } })).data,
  envoyer: async (payload: NouveauRapportPayload, photos: Record<string, Blob>): Promise<RapportDetail> => {
    const form = new FormData();
    form.append("data", JSON.stringify(payload));
    for (const [position, blob] of Object.entries(photos)) {
      form.append(`photo_${position}`, blob, `${position}.jpg`);
    }
    return (await axios.post(`${BASE}/rapports`, form)).data;
  },

  // ── Plateforme ──
  stats: async (): Promise<StatsInspections> => (await axios.get(`${BASE}/stats`)).data,
  suivi: async (): Promise<SuiviChauffeur[]> => (await axios.get(`${BASE}/suivi`)).data,
  list: async (filters: RapportsFilters & { page: number; page_size: number }): Promise<RapportPage> => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v != null));
    return (await axios.get(`${BASE}/rapports`, { params })).data;
  },
  relancer: async (user_id: number, message?: string): Promise<RelanceChecklist> =>
    (await axios.post(`${BASE}/relances`, { user_id, message })).data,
  relancerEnRetard: async (message?: string): Promise<{ relances: number }> =>
    (await axios.post(`${BASE}/relances/en-retard`, { message })).data,
};
