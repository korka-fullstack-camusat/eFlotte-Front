import axios from "axios";
import type { DemandePage, DemandeVehicule, StatsDemandes, StatutDemande } from "@/types";

const BASE = "/api/demandes";

export const demandeService = {
  list: async (filtres: { nature?: string; statut?: string; q?: string; page: number; page_size: number }): Promise<DemandePage> => {
    const params = Object.fromEntries(Object.entries(filtres).filter(([, v]) => v !== "" && v != null));
    return (await axios.get(BASE, { params })).data;
  },
  stats: async (): Promise<StatsDemandes> => (await axios.get(`${BASE}/stats`)).data,
  maj: async (id: number, statut: StatutDemande, commentaire?: string): Promise<DemandeVehicule> =>
    (await axios.patch(`${BASE}/${id}`, { statut, commentaire })).data,
};
