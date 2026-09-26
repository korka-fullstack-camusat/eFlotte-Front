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
  marque: string | null;
  annee: number | null;
  statut: string | null;
  type_carburant: string | null;
  chauffeur: string | null;
  kilometrage: number | null;
  dernier_service: string | null;
  prochaine_vidange: string | null;
  localisation: string | null;
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
  annees: number[];
  mois: string[];
  plaques: string[];
  types_vehicule: string[];
  fournisseurs: string[];
  types_location: string[];
  types_cout: string[];
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
  motif: string | null;
  destination: string | null;  // rétrocompat
  heure_debut: string | null;  // "HH:MM:SS"
  heure_fin: string | null;
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
  statut: string | null;  // EN_COURS | REPARE | A_CONFIRMER
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

export interface SuiviSinistre {
  id: number;
  date_sinistre: string | null;
  date_declaration: string | null;
  type_location: string | null;
  matricule: string | null;
  nom_chauffeur: string | null;
  snc: string | null;
  projet: string | null;
  circonstances: string | null;
  statut: string | null;
  montant_indemnite: number | null;
  date_reglement: string | null;
  observations: string | null;
  dossier_suivi_par: string | null;
  position_vehicule: string | null;
  suivi_dossier_interne: string | null;
  lieu_immobilisation: string | null;
  documentation: boolean | null;
  traiter: boolean | null;
}

export interface SuiviSinistrePage {
  items: SuiviSinistre[];
  total: number;
}

export interface SinistresFilters {
  search?: string;
  statut?: string;
  type_location?: string;
  circonstances?: string;
  page?: number;
  page_size?: number;
}

export interface ImportSinistreResult {
  created: number;
  updated: number;
  errors: { ligne: number; message: string }[];
}

export interface UserAccount {
  id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  role: string;
  vehicule_plaque: string | null;
  filiale: string | null;
}

// ── Checklists mobiles (inspection / restitution) ────────────────────────────

export type TypeReponse = "OUI_NON" | "NIVEAU" | "ETAT";

export interface ChecklistModele {
  types_reponse: Record<TypeReponse, { options: { valeur: string; libelle: string }[]; negative: string }>;
  sections: {
    cle: string;
    titre: string;
    question: string;
    type: TypeReponse;
    items: { cle: string; libelle: string; critique: boolean }[];
  }[];
  photos: { position: string; libelle: string }[];
  types_rapport: { valeur: string; libelle: string }[];
}

export interface ReponseItem {
  valeur: string;
  commentaire?: string | null;
}

export interface ReponsesRapport {
  items: Record<string, ReponseItem>;
  autres: Record<string, string>;
}

export interface RapportResume {
  id: number;
  user_id: number | null;
  type_rapport: string;
  date_rapport: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  nom_chauffeur: string;
  kilometrage: number;
  nb_non_conformes: number;
  nb_critiques: number;
  created_at: string;
}

export interface RapportDetail extends RapportResume {
  filiale: string | null;
  visite_technique: string | null;
  reponses: ReponsesRapport;
  commentaires: string | null;
  nom_instructeur: string | null;
  signature: string | null;
  photos: string[];
}

export interface RapportPage {
  items: RapportResume[];
  total: number;
}

export interface VehiculeMini {
  plaque_immatriculation: string;
  marque: string | null;
  modele: string | null;
  kilometrage: number | null;
  /** Dernière visite technique relevée dans un rapport précédent */
  visite_technique: string | null;
}

export interface RelanceChecklist {
  id: number;
  envoye_par: string | null;
  message: string | null;
  created_at: string;
}

export interface MonEspace {
  username: string;
  full_name: string | null;
  email: string | null;
  nb_rapports: number;
  vehicule: VehiculeMini | null;
  vehicule_plaque: string | null;
  filiale: string | null;
  envoye_cette_semaine: boolean;
  dernier_rapport: RapportResume | null;
  derniers_rapports: RapportResume[];
  relances: RelanceChecklist[];
  filiale_precedente: string | null;
}

export interface SuiviChauffeur {
  user_id: number;
  username: string;
  full_name: string | null;
  vehicule_plaque: string | null;
  envoye_cette_semaine: boolean;
  dernier_rapport_id: number | null;
  dernier_rapport_date: string | null;
  dernier_rapport_critiques: number | null;
  nb_rapports: number;
  relances_en_attente: number;
  derniere_relance: string | null;
}

export interface StatsInspections {
  semaine_debut: string;
  nb_chauffeurs: number;
  chauffeurs_a_jour: number;
  chauffeurs_en_retard: number;
  rapports_semaine: number;
  rapports_critiques_semaine: number;
}

export interface RapportsFilters {
  q?: string;
  statut?: "conforme" | "anomalies" | "critique" | "";
  type_rapport?: string;
  date_debut?: string;
  date_fin?: string;
}

export interface NouveauRapportPayload {
  type_rapport: string;
  immatriculation: string;
  kilometrage: number;
  /** Envoyés seulement au premier rapport, quand le compte ne les a pas encore */
  filiale?: string;
  visite_technique: string | null;
  reponses: ReponsesRapport;
  commentaires: string;
  nom_instructeur: string;
  signature: string;
}
