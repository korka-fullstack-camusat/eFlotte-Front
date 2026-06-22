import { useEffect, useState } from "react";
import { Truck, CheckCircle, Wallet, Fuel, Gauge, TrendingUp, Filter, X, Database, ListOrdered, Users, FileText, ClipboardCheck, Wrench, Building2, MapPin, Car, Tag, Layers, FileSpreadsheet, AlertOctagon, AlertTriangle, ShieldCheck } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { vehiculeService, coutService, missionChauffeurService, suiviDevisService, checklistVLService, entretienService } from "@/services/api";
import type {
  Vehicule, KpiCouts, EvolutionPoint, RepartitionPoint, VehiculeCoutPoint, FiltresCouts, CoutsFilters, PivotResult,
  MissionChauffeur, FiltresMissions, MissionsFilters,
  SuiviDevis, FiltresDevis, DevisFilters,
  CheckListVL, FiltresCheckListVL, CheckListVLFilters,
  EntretienVehicule,
} from "@/types";
import { KpiCard, MiniLineChart, DonutChart, BarRow } from "@/components/charts";

const ANNEE = 2026;

const TYPE_COUT_LABELS: Record<string, string> = {
  ASS: "Assurance",
  CARBURANT: "Carburant",
  ENT: "Entretien",
  LOCAT: "Location",
  PEA: "Péage",
  REP: "Réparation",
};

const MOIS_NOMS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function formatMois(iso: string): string {
  const [annee, mois] = iso.split("-");
  return `${MOIS_NOMS[Number(mois) - 1]} ${annee}`;
}

function aggregateCount<T>(items: T[], getKey: (item: T) => string | null | undefined): { label: string; value: number }[] {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const k = getKey(item) || "Non renseigné";
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));
}

function countDistinct<T>(items: T[], getKey: (item: T) => string | null | undefined): number {
  return new Set(items.map(getKey).filter((v): v is string => !!v)).size;
}

type SectionKey = "flottes" | "tcd" | "chauffeurs" | "devis" | "checklist" | "entretiens";

const SECTIONS: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
  { key: "flottes", label: "Données flottes", icon: <Database size={15} /> },
  { key: "tcd", label: "TCD Technique", icon: <ListOrdered size={15} /> },
  { key: "chauffeurs", label: "Chauffeurs Pôles", icon: <Users size={15} /> },
  { key: "devis", label: "Suivi des devis", icon: <FileText size={15} /> },
  { key: "checklist", label: "Check-lists VL", icon: <ClipboardCheck size={15} /> },
  { key: "entretiens", label: "Entretiens", icon: <Wrench size={15} /> },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [kpi, setKpi] = useState<KpiCouts | null>(null);
  const [evolution, setEvolution] = useState<EvolutionPoint[]>([]);
  const [repartition, setRepartition] = useState<RepartitionPoint[]>([]);
  const [parVehicule, setParVehicule] = useState<VehiculeCoutPoint[]>([]);
  const [filtres, setFiltres] = useState<FiltresCouts | null>(null);
  const [filters, setFilters] = useState<CoutsFilters>({});
  const [filterModal, setFilterModal] = useState(false);
  const [draft, setDraft] = useState<CoutsFilters>({});

  const [section, setSection] = useState<SectionKey | null>(null);
  const [pivotTypeVehicule, setPivotTypeVehicule] = useState<PivotResult | null>(null);
  const [pivotFournisseur, setPivotFournisseur] = useState<PivotResult | null>(null);
  const [pivotPlaque, setPivotPlaque] = useState<PivotResult | null>(null);
  const [pivotTypeLocation, setPivotTypeLocation] = useState<PivotResult | null>(null);

  const [missionsFiltres, setMissionsFiltres] = useState<FiltresMissions | null>(null);
  const [missionsFilters, setMissionsFilters] = useState<MissionsFilters>({});
  const [missionsDraft, setMissionsDraft] = useState<MissionsFilters>({});
  const [missions, setMissions] = useState<MissionChauffeur[] | null>(null);

  const [devisFiltres, setDevisFiltres] = useState<FiltresDevis | null>(null);
  const [devisFilters, setDevisFilters] = useState<DevisFilters>({});
  const [devisDraft, setDevisDraft] = useState<DevisFilters>({});
  const [devisItems, setDevisItems] = useState<SuiviDevis[] | null>(null);

  const [checklistFiltres, setCheckListFiltres] = useState<FiltresCheckListVL | null>(null);
  const [checklistFilters, setCheckListFilters] = useState<CheckListVLFilters>({});
  const [checklistDraft, setCheckListDraft] = useState<CheckListVLFilters>({});
  const [checklistItems, setCheckListItems] = useState<CheckListVL[] | null>(null);

  const [entretiensItems, setEntretiensItems] = useState<EntretienVehicule[] | null>(null);

  useEffect(() => {
    vehiculeService.getAll().then(setVehicules).catch(() => {});
    coutService.filtres().then(setFiltres).catch(() => {});
    missionChauffeurService.filtres().then(setMissionsFiltres).catch(() => {});
    suiviDevisService.filtres().then(setDevisFiltres).catch(() => {});
    checklistVLService.filtres().then(setCheckListFiltres).catch(() => {});
  }, []);

  useEffect(() => {
    const params: CoutsFilters = { ...filters };
    if (!params.mois) params.annee = ANNEE;
    coutService.kpi(params).then(setKpi).catch(() => {});
    coutService.evolution({ ...params, type_cout: "TOTAL" }).then(setEvolution).catch(() => {});
    coutService.repartition(params).then(setRepartition).catch(() => {});
    coutService.parVehicule({ ...params, type_cout: "TOTAL", limit: 10 }).then(setParVehicule).catch(() => {});
  }, [filters]);

  useEffect(() => {
    if (section !== "flottes" && section !== "tcd") return;
    const params: CoutsFilters = { ...filters };
    if (!params.mois) params.annee = ANNEE;
    coutService.pivot({ ...params, group_by: "type_vehicule", type_cout: "TOTAL" }).then(setPivotTypeVehicule).catch(() => {});
    if (section === "flottes") {
      coutService.pivot({ ...params, group_by: "fournisseur", type_cout: "TOTAL" }).then(setPivotFournisseur).catch(() => {});
    } else {
      coutService.pivot({ ...params, group_by: "plaque", type_cout: "TOTAL" }).then(setPivotPlaque).catch(() => {});
      coutService.pivot({ ...params, group_by: "type_location", type_cout: "TOTAL" }).then(setPivotTypeLocation).catch(() => {});
    }
  }, [section, filters]);

  useEffect(() => {
    if (section !== "chauffeurs") return;
    missionChauffeurService.getAll({ ...missionsFilters, page_size: 200 }).then(r => setMissions(r.items)).catch(() => {});
  }, [section, missionsFilters]);

  useEffect(() => {
    if (section !== "devis") return;
    suiviDevisService.getAll({ ...devisFilters, page_size: 200 }).then(r => setDevisItems(r.items)).catch(() => {});
  }, [section, devisFilters]);

  useEffect(() => {
    if (section !== "checklist") return;
    checklistVLService.getAll({ ...checklistFilters, page_size: 200 }).then(r => setCheckListItems(r.items)).catch(() => {});
  }, [section, checklistFilters]);

  useEffect(() => {
    if (section !== "entretiens" || entretiensItems) return;
    entretienService.getAll().then(setEntretiensItems).catch(() => {});
  }, [section, entretiensItems]);

  const maxVehicule = Math.max(1, ...parVehicule.map(v => v.total));

  const setDraftFilter = (key: keyof CoutsFilters, value: string) => {
    setDraft(f => {
      const next = { ...f };
      if (value) next[key] = value as any; else delete next[key];
      return next;
    });
  };
  const setMissionsDraftFilter = (key: keyof MissionsFilters, value: string) => {
    setMissionsDraft(f => {
      const next = { ...f };
      if (value) next[key] = value; else delete next[key];
      return next;
    });
  };
  const setDevisDraftFilter = (key: keyof DevisFilters, value: string) => {
    setDevisDraft(f => {
      const next = { ...f };
      if (value) next[key] = value; else delete next[key];
      return next;
    });
  };
  const setCheckListDraftFilter = (key: keyof CheckListVLFilters, value: string) => {
    setCheckListDraft(f => {
      const next = { ...f };
      if (value) next[key] = value; else delete next[key];
      return next;
    });
  };

  const openFilterModal = () => {
    if (section === "chauffeurs") setMissionsDraft(missionsFilters);
    else if (section === "devis") setDevisDraft(devisFilters);
    else if (section === "checklist") setCheckListDraft(checklistFilters);
    else setDraft(filters);
    setFilterModal(true);
  };
  const applyFilters = () => {
    if (section === "chauffeurs") setMissionsFilters(missionsDraft);
    else if (section === "devis") setDevisFilters(devisDraft);
    else if (section === "checklist") setCheckListFilters(checklistDraft);
    else setFilters(draft);
    setFilterModal(false);
  };
  const resetFilters = () => {
    if (section === "chauffeurs") { setMissionsDraft({}); setMissionsFilters({}); }
    else if (section === "devis") { setDevisDraft({}); setDevisFilters({}); }
    else if (section === "checklist") { setCheckListDraft({}); setCheckListFilters({}); }
    else { setDraft({}); setFilters({}); }
    setFilterModal(false);
  };

  const activeFiltersCount = section === "chauffeurs" ? Object.keys(missionsFilters).length
    : section === "devis" ? Object.keys(devisFilters).length
    : section === "checklist" ? Object.keys(checklistFilters).length
    : Object.keys(filters).length;
  const hasFilters = activeFiltersCount > 0;

  const handleSectionClick = (key: SectionKey) => {
    setSection(prev => (prev === key ? null : key));
  };

  const byChauffeur = missions ? aggregateCount(missions, m => m.chauffeur) : [];
  const byProjet = missions ? aggregateCount(missions, m => m.projet) : [];
  const bySousTraitant = devisItems ? aggregateCount(devisItems, d => d.sous_traitant) : [];
  const byStatutPO = devisItems ? aggregateCount(devisItems, d => d.po_emis) : [];
  const byCarGroup = checklistItems ? aggregateCount(checklistItems, c => c.car_group) : [];
  const byBrand = checklistItems ? aggregateCount(checklistItems, c => c.brand) : [];
  const entretiensStatus = entretiensItems ? [
    { label: "En retard", value: entretiensItems.filter(e => e.reste != null && Number(e.reste) < 0).length },
    { label: "À surveiller (≤ 7 500 km)", value: entretiensItems.filter(e => e.reste != null && Number(e.reste) >= 0 && Number(e.reste) <= 7500).length },
    { label: "À jour", value: entretiensItems.filter(e => e.reste != null && Number(e.reste) > 7500).length },
  ] : [];

  const tcdItems = pivotPlaque?.items ?? [];
  const tcdTotal = tcdItems.reduce((s, i) => s + i.total, 0);
  const tcdMax = tcdItems.reduce((m, i) => Math.max(m, i.total), 0);

  const missionsList = missions ?? [];
  const devisList = devisItems ?? [];
  const checklistList = checklistItems ?? [];
  const semainesCount = checklistList[0] ? Object.keys(checklistList[0].semaines ?? {}).length : 0;

  return (
    <AppLayout>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3 sticky top-0 z-20 bg-camugray-100 -mx-4 px-4 md:-mx-8 md:px-8 pt-1 pb-3">
        <div>
          <h1 className="text-2xl font-bold text-camublue-900 mb-1">Tableau de bord</h1>
          <p className="text-gray-500 text-sm">
            Bienvenue{user?.full_name ? `, ${user.full_name}` : ""} — Vue d'ensemble de la flotte {ANNEE}
          </p>
        </div>
        {section !== "entretiens" && (
          <button onClick={openFilterModal}
            className="flex items-center gap-2 px-4 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm relative">
            <Filter size={15} /><span>Filtres</span>
            {hasFilters && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Accès rapide aux statistiques par module */}
      <div className="flex flex-wrap gap-2 mb-5">
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => handleSectionClick(s.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm ${
              section === s.key
                ? "bg-camublue-900 text-white"
                : "border border-camublue-900 text-camublue-900 hover:bg-camublue-900/5"
            }`}>
            {s.icon}<span>{s.label}</span>
          </button>
        ))}
      </div>

      {!section && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
            <KpiCard label="Véhicules" value={vehicules.length} icon={<Truck size={20}/>} bg="bg-camublue-900/10" text="text-camublue-900" />
            <KpiCard label="Disponibles" value={vehicules.length} icon={<CheckCircle size={20}/>} bg="bg-emerald-100" text="text-emerald-600" />
            <KpiCard label="Coût Total Flotte (FCFA)" value={kpi?.cout_total ?? 0} icon={<Wallet size={20}/>} bg="bg-camublue-900/10" text="text-camublue-900" />
            <KpiCard label="Coût Carburant (FCFA)" value={kpi?.cout_carburant ?? 0} icon={<Fuel size={20}/>} bg="bg-amber-100" text="text-amber-600" />
            <KpiCard label="Coût Distance (km)" value={kpi?.cout_distance ?? 0} icon={<Gauge size={20}/>} bg="bg-emerald-100" text="text-emerald-600" />
            <KpiCard label="Coût / km (FCFA)" value={Math.round(kpi?.cout_par_km ?? 0)} icon={<TrendingUp size={20}/>} bg="bg-rose-100" text="text-rose-600" />
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-camublue-900 mb-4">Répartition des coûts</h2>
              {repartition.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Aucune donnée — importez le fichier Excel dans le module Coûts.</p>
              ) : (
                <DonutChart data={repartition.map(r => ({ label: TYPE_COUT_LABELS[r.type_cout] ?? r.type_cout, value: r.total }))} />
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-camublue-900 mb-3">Évolution mensuelle des coûts</h2>
              {evolution.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Aucune donnée — importez le fichier Excel dans le module Coûts.</p>
              ) : (
                <MiniLineChart points={evolution} />
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-camublue-900 mb-4">Top des véhicules coûteux</h2>
            {parVehicule.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">Aucune donnée — importez le fichier Excel dans le module Coûts.</p>
            ) : (
              <div className="space-y-3">
                {parVehicule.map((v, i) => (
                  <BarRow
                    key={v.plaque_immatriculation}
                    label={v.plaque_immatriculation}
                    value={v.total}
                    max={maxVehicule}
                    color={["bg-camublue-900", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-violet-500", "bg-cyan-500"][i % 6]}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {section === "flottes" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
            <KpiCard label="Véhicules" value={vehicules.length} icon={<Truck size={20}/>} bg="bg-camublue-900/10" text="text-camublue-900" />
            <KpiCard label="Coût Total Flotte (FCFA)" value={kpi?.cout_total ?? 0} icon={<Wallet size={20}/>} bg="bg-camublue-900/10" text="text-camublue-900" />
            <KpiCard label="Coût Carburant (FCFA)" value={kpi?.cout_carburant ?? 0} icon={<Fuel size={20}/>} bg="bg-amber-100" text="text-amber-600" />
            <KpiCard label="Coût Distance (km)" value={kpi?.cout_distance ?? 0} icon={<Gauge size={20}/>} bg="bg-emerald-100" text="text-emerald-600" />
            <KpiCard label="Coût / km (FCFA)" value={Math.round(kpi?.cout_par_km ?? 0)} icon={<TrendingUp size={20}/>} bg="bg-rose-100" text="text-rose-600" />
            <KpiCard label="Fournisseurs" value={filtres?.fournisseurs?.length ?? 0} icon={<Building2 size={20}/>} bg="bg-violet-100" text="text-violet-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-camublue-900 mb-4">Répartition par type de véhicule</h2>
              {pivotTypeVehicule && pivotTypeVehicule.items.length > 0
                ? <DonutChart data={pivotTypeVehicule.items.map(i => ({ label: i.label, value: i.total }))} />
                : <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-camublue-900 mb-4">Répartition par fournisseur</h2>
              {pivotFournisseur && pivotFournisseur.items.length > 0
                ? <DonutChart data={pivotFournisseur.items.map(i => ({ label: i.label, value: i.total }))} />
                : <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-camublue-900 mb-4">Répartition des coûts</h2>
              {repartition.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>
              ) : (
                <DonutChart data={repartition.map(r => ({ label: TYPE_COUT_LABELS[r.type_cout] ?? r.type_cout, value: r.total }))} />
              )}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-camublue-900 mb-3">Évolution mensuelle des coûts</h2>
              {evolution.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>
              ) : (
                <MiniLineChart points={evolution} />
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-camublue-900 mb-4">Top des véhicules coûteux</h2>
            {parVehicule.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {parVehicule.map((v, i) => (
                  <BarRow key={v.plaque_immatriculation} label={v.plaque_immatriculation} value={v.total} max={maxVehicule}
                    color={["bg-camublue-900", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-violet-500", "bg-cyan-500"][i % 6]} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {section === "tcd" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <KpiCard label="Lignes (plaques)" value={tcdItems.length} icon={<ListOrdered size={20}/>} bg="bg-camublue-900/10" text="text-camublue-900" />
            <KpiCard label="Total général (FCFA)" value={tcdTotal} icon={<Wallet size={20}/>} bg="bg-emerald-100" text="text-emerald-600" />
            <KpiCard label="Valeur max (FCFA)" value={tcdMax} icon={<TrendingUp size={20}/>} bg="bg-amber-100" text="text-amber-600" />
            <KpiCard label="Moyenne (FCFA)" value={tcdItems.length ? Math.round(tcdTotal / tcdItems.length) : 0} icon={<Gauge size={20}/>} bg="bg-violet-100" text="text-violet-600" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <h2 className="text-sm font-bold text-camublue-900 mb-4">Top véhicules par coût total</h2>
            {tcdItems.length > 0 ? (
              <div className="space-y-3">
                {tcdItems.slice(0, 10).map((it, i) => (
                  <BarRow key={it.label} label={it.label} value={it.total} max={Math.max(1, ...tcdItems.map(p => p.total))}
                    color={["bg-camublue-900", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-violet-500", "bg-cyan-500"][i % 6]} />
                ))}
              </div>
            ) : <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-camublue-900 mb-4">Répartition par type de location</h2>
              {pivotTypeLocation && pivotTypeLocation.items.length > 0
                ? <DonutChart data={pivotTypeLocation.items.map(i => ({ label: i.label, value: i.total }))} />
                : <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-camublue-900 mb-4">Répartition par type de véhicule</h2>
              {pivotTypeVehicule && pivotTypeVehicule.items.length > 0
                ? <DonutChart data={pivotTypeVehicule.items.map(i => ({ label: i.label, value: i.total }))} />
                : <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>}
            </div>
          </div>
        </>
      )}

      {section === "chauffeurs" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <KpiCard label="Missions" value={missionsList.length} icon={<ListOrdered size={20}/>} bg="bg-camublue-900/10" text="text-camublue-900" />
            <KpiCard label="Chauffeurs" value={countDistinct(missionsList, m => m.chauffeur)} icon={<Users size={20}/>} bg="bg-emerald-100" text="text-emerald-600" />
            <KpiCard label="Projets" value={countDistinct(missionsList, m => m.projet)} icon={<MapPin size={20}/>} bg="bg-amber-100" text="text-amber-600" />
            <KpiCard label="Plaques" value={countDistinct(missionsList, m => m.immatriculation)} icon={<Car size={20}/>} bg="bg-violet-100" text="text-violet-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-camublue-900 mb-4">Répartition par chauffeur</h2>
              {byChauffeur.length > 0 ? <DonutChart data={byChauffeur} /> : <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-camublue-900 mb-4">Répartition par projet</h2>
              {byProjet.length > 0 ? <DonutChart data={byProjet} /> : <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>}
            </div>
          </div>
        </>
      )}

      {section === "devis" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <KpiCard label="Devis" value={devisList.length} icon={<ListOrdered size={20}/>} bg="bg-camublue-900/10" text="text-camublue-900" />
            <KpiCard label="Sous-traitants" value={countDistinct(devisList, d => d.sous_traitant)} icon={<Building2 size={20}/>} bg="bg-emerald-100" text="text-emerald-600" />
            <KpiCard label="Descriptions" value={countDistinct(devisList, d => d.descriptions)} icon={<FileSpreadsheet size={20}/>} bg="bg-amber-100" text="text-amber-600" />
            <KpiCard label="Statuts PO" value={countDistinct(devisList, d => d.po_emis)} icon={<FileText size={20}/>} bg="bg-violet-100" text="text-violet-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-camublue-900 mb-4">Répartition par sous-traitant</h2>
              {bySousTraitant.length > 0 ? <DonutChart data={bySousTraitant} /> : <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-camublue-900 mb-4">Répartition par statut PO</h2>
              {byStatutPO.length > 0 ? <DonutChart data={byStatutPO} /> : <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>}
            </div>
          </div>
        </>
      )}

      {section === "checklist" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <KpiCard label="Véhicules" value={checklistList.length} icon={<ListOrdered size={20}/>} bg="bg-camublue-900/10" text="text-camublue-900" />
            <KpiCard label="Marques" value={countDistinct(checklistList, c => c.brand)} icon={<Tag size={20}/>} bg="bg-emerald-100" text="text-emerald-600" />
            <KpiCard label="Car Groups" value={countDistinct(checklistList, c => c.car_group)} icon={<Layers size={20}/>} bg="bg-amber-100" text="text-amber-600" />
            <KpiCard label="Semaines suivies" value={semainesCount} icon={<ClipboardCheck size={20}/>} bg="bg-violet-100" text="text-violet-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-camublue-900 mb-4">Répartition par car group</h2>
              {byCarGroup.length > 0 ? <DonutChart data={byCarGroup} /> : <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-camublue-900 mb-4">Répartition par marque</h2>
              {byBrand.length > 0 ? <DonutChart data={byBrand} /> : <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>}
            </div>
          </div>
        </>
      )}

      {section === "entretiens" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <KpiCard label="Véhicules suivis" value={entretiensItems?.length ?? 0} icon={<Wrench size={20}/>} bg="bg-camublue-900/10" text="text-camublue-900" />
            <KpiCard label="En retard" value={entretiensStatus[0]?.value ?? 0} icon={<AlertOctagon size={20}/>} bg="bg-red-100" text="text-red-600" />
            <KpiCard label="À surveiller (≤ 7 500 km)" value={entretiensStatus[1]?.value ?? 0} icon={<AlertTriangle size={20}/>} bg="bg-amber-100" text="text-amber-600" />
            <KpiCard label="À jour" value={entretiensStatus[2]?.value ?? 0} icon={<ShieldCheck size={20}/>} bg="bg-emerald-100" text="text-emerald-600" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-camublue-900 mb-4">État des entretiens</h2>
            {entretiensStatus.some(e => e.value > 0)
              ? <DonutChart data={entretiensStatus} colors={["#f43f5e", "#f59e0b", "#10b981"]} />
              : <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>}
          </div>
        </>
      )}

      {/* ══ Modal Filtres ══════════════════════════════════════════════════ */}
      {filterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setFilterModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Filter size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">
                  Filtres{section ? ` — ${SECTIONS.find(s => s.key === section)?.label}` : " du tableau de bord"}
                </p>
              </div>
              <button onClick={() => setFilterModal(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <div className="p-6 space-y-4">
              {section === "chauffeurs" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Plaque d'immatriculation</label>
                    <select value={missionsDraft.immatriculation ?? ""} onChange={e => setMissionsDraftFilter("immatriculation", e.target.value)} className="input-base">
                      <option value="">Toutes les plaques</option>
                      {(missionsFiltres?.immatriculations ?? []).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Chauffeur</label>
                    <select value={missionsDraft.chauffeur ?? ""} onChange={e => setMissionsDraftFilter("chauffeur", e.target.value)} className="input-base">
                      <option value="">Tous les chauffeurs</option>
                      {(missionsFiltres?.chauffeurs ?? []).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Projet</label>
                    <select value={missionsDraft.projet ?? ""} onChange={e => setMissionsDraftFilter("projet", e.target.value)} className="input-base">
                      <option value="">Tous les projets</option>
                      {(missionsFiltres?.projets ?? []).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : section === "devis" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
                    <select value={devisDraft.descriptions ?? ""} onChange={e => setDevisDraftFilter("descriptions", e.target.value)} className="input-base">
                      <option value="">Toutes les descriptions</option>
                      {(devisFiltres?.descriptions ?? []).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sous-traitant</label>
                    <select value={devisDraft.sous_traitant ?? ""} onChange={e => setDevisDraftFilter("sous_traitant", e.target.value)} className="input-base">
                      <option value="">Tous les sous-traitants</option>
                      {(devisFiltres?.sous_traitants ?? []).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Statut PO</label>
                    <select value={devisDraft.po_emis ?? ""} onChange={e => setDevisDraftFilter("po_emis", e.target.value)} className="input-base">
                      <option value="">Tous les statuts</option>
                      {(devisFiltres?.po_emis ?? []).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : section === "checklist" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Marque</label>
                    <select value={checklistDraft.brand ?? ""} onChange={e => setCheckListDraftFilter("brand", e.target.value)} className="input-base">
                      <option value="">Toutes les marques</option>
                      {(checklistFiltres?.brands ?? []).map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Car Group</label>
                    <select value={checklistDraft.car_group ?? ""} onChange={e => setCheckListDraftFilter("car_group", e.target.value)} className="input-base">
                      <option value="">Tous les car groups</option>
                      {(checklistFiltres?.car_groups ?? []).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mois</label>
                    <select value={draft.mois ?? ""} onChange={e => setDraftFilter("mois", e.target.value)} className="input-base">
                      <option value="">Tous les mois</option>
                      {(filtres?.mois ?? []).map(m => (
                        <option key={m} value={m}>{formatMois(m)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Plaque d'immatriculation</label>
                    <select value={draft.plaque ?? ""} onChange={e => setDraftFilter("plaque", e.target.value)} className="input-base">
                      <option value="">Toutes les plaques</option>
                      {(filtres?.plaques ?? []).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type de véhicule</label>
                    <select value={draft.type_vehicule ?? ""} onChange={e => setDraftFilter("type_vehicule", e.target.value)} className="input-base">
                      <option value="">Tous les types de véhicule</option>
                      {(filtres?.types_vehicule ?? []).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fournisseur</label>
                    <select value={draft.fournisseur ?? ""} onChange={e => setDraftFilter("fournisseur", e.target.value)} className="input-base">
                      <option value="">Tous les fournisseurs</option>
                      {(filtres?.fournisseurs ?? []).map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type de location</label>
                    <select value={draft.type_location ?? ""} onChange={e => setDraftFilter("type_location", e.target.value)} className="input-base">
                      <option value="">Tous les types de location</option>
                      {(filtres?.types_location ?? []).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={resetFilters} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                  Réinitialiser
                </button>
                <button type="button" onClick={applyFilters} className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">
                  Appliquer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
