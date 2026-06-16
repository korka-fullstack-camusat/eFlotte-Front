export interface Vehicule {
  id: number;
  type_location: string | null;
  fournisseur: string | null;
  type_vehicule: string | null;
  plaque_immatriculation: string;
  n_chassis: string | null;
  modele: string | null;
  couleur: string | null;
  autocollant: string | null;
  grille: string | null;
  croche: string | null;
  extincteurs: string | null;
  trousse_secours: string | null;
  peage: string | null;
  carte_carburant: string | null;
  created_at: string | null;
}

export interface CoutFlotte {
  id: number;
  type_location: string | null;
  fournisseur: string | null;
  type_vehicule: string | null;
  plaque_immatriculation: string;
  mois: string;
  type_cout: string;
  valeur: number;
}

export interface CoutFlottePage {
  items: CoutFlotte[];
  total: number;
}

export interface ImportCoutsResult {
  created: number;
  updated: number;
  errors: { ligne: number; message: string }[];
}

export interface KpiCouts {
  cout_total: number;
  cout_carburant: number;
  cout_distance: number;
  cout_par_km: number;
}

export interface FiltresCouts {
  mois: string[];
  plaques: string[];
  types_vehicule: string[];
  fournisseurs: string[];
  types_location: string[];
}

export interface PivotPoint {
  label: string;
  total: number;
}

export interface PivotResult {
  items: PivotPoint[];
  total: number;
}

export interface CoutsFilters {
  annee?: number;
  mois?: string;
  plaque?: string;
  type_vehicule?: string;
  fournisseur?: string;
  type_location?: string;
}

export interface EvolutionPoint {
  annee: number;
  mois: number;
  total: number;
}

export interface RepartitionPoint {
  type_cout: string;
  total: number;
}

export interface VehiculeCoutPoint {
  plaque_immatriculation: string;
  fournisseur: string | null;
  type_vehicule: string | null;
  total: number;
}

export interface EntretienVehicule {
  id: number;
  type_location: string | null;
  fournisseur: string | null;
  type_vehicule: string | null;
  plaque_immatriculation: string;
  nom_chauffeur: string | null;
  paliers: Record<string, number | null>;
  reste: number | null;
}

export interface ImportEntretiensResult {
  created: number;
  updated: number;
  errors: { ligne: number; message: string }[];
}

export interface EntretienBis {
  id: number;
  rt: string | null;
  statut: string | null;
  modele: string | null;
  plaque_immatriculation: string;
  kms_depart: number | null;
  notes: string | null;
  paliers: Record<string, number | null>;
  reste: number | null;
}

export interface ImportEntretienBisResult {
  created: number;
  updated: number;
  errors: { ligne: number; message: string }[];
}

export interface MissionChauffeur {
  id: number;
  date: string;
  immatriculation: string;
  chauffeur: string | null;
  demandeur: string | null;
  telephone: string | null;
  projet: string | null;
  destination: string | null;
  date_depart: string | null;
  date_retour: string | null;
  commentaires: string | null;
}

export interface MissionChauffeurPage {
  items: MissionChauffeur[];
  total: number;
}

export interface FiltresMissions {
  immatriculations: string[];
  chauffeurs: string[];
  projets: string[];
}

export interface ImportMissionsResult {
  created: number;
  updated: number;
  errors: { ligne: number; message: string }[];
}

export interface MissionsFilters {
  immatriculation?: string;
  chauffeur?: string;
  projet?: string;
}

export interface SuiviDevis {
  id: number;
  descriptions: string | null;
  numero_devis: string | null;
  valeur_devis: number | null;
  date: string | null;
  montant: number | null;
  sous_traitant: string | null;
  matricule: string | null;
  code_snc: string | null;
  po_emis: string | null;
}

export interface SuiviDevisPage {
  items: SuiviDevis[];
  total: number;
}

export interface FiltresDevis {
  descriptions: string[];
  sous_traitants: string[];
  po_emis: string[];
}

export interface ImportDevisResult {
  created: number;
  updated: number;
  errors: { ligne: number; message: string }[];
}

export interface DevisFilters {
  descriptions?: string;
  sous_traitant?: string;
  po_emis?: string;
}

export interface CheckListVL {
  id: number;
  brand: string | null;
  model: string | null;
  plaque_immatriculation: string;
  label: string | null;
  car_group: string | null;
  semaines: Record<string, string | null>;
}

export interface CheckListVLPage {
  items: CheckListVL[];
  total: number;
}

export interface FiltresCheckListVL {
  brands: string[];
  car_groups: string[];
}

export interface ImportCheckListVLResult {
  created: number;
  updated: number;
  errors: { ligne: number; message: string }[];
}

export interface CheckListVLFilters {
  brand?: string;
  car_group?: string;
}

export interface SuiviPanne {
  id: number;
  date: string | null;
  immatriculation: string;
  nom: string | null;
  garage: string | null;
  nature_panne: string | null;
  date_indisponibilite: string | null;
  projet: string | null;
  date_fin_reparation: string | null;
  site: string | null;
  immobilisation_jrs: number | null;
  commentaire: string | null;
}

export interface SuiviPannePage {
  items: SuiviPanne[];
  total: number;
}

export interface FiltresSuiviPanne {
  projets: string[];
  garages: string[];
  sites: string[];
  immatriculations: string[];
}

export interface ImportSuiviPanneResult {
  created: number;
  updated: number;
  errors: { ligne: number; message: string }[];
}

export interface PannesFilters {
  projet?: string;
  garage?: string;
  site?: string;
  immatriculation?: string;
  statut?: string;
  search?: string;
}

export interface Pneumatique {
  id: number;
  fournisseur: string | null;
  type_location: string | null;
  immatriculation: string;
  chauffeur: string | null;
  kilometrage: number | null;
  nb_pneus: number | null;
  ref_pneu: string | null;
  etat: string | null;
  snc: string | null;
  zone_intervention: string | null;
  date_prevue: string | null;
  commentaire: string | null;
}

export interface PneumatiquePage {
  items: Pneumatique[];
  total: number;
}

export interface FiltresPneumatiques {
  fournisseurs: string[];
  immatriculations: string[];
  etats: string[];
  sncs: string[];
}

export interface ImportPneumatiqueResult {
  created: number;
  updated: number;
  errors: { ligne: number; message: string }[];
}

export interface PneumatiquesFilters {
  fournisseur?: string;
  immatriculation?: string;
  etat?: string;
  snc?: string;
  search?: string;
}

export interface UserAccount {
  id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  role: string;
}
