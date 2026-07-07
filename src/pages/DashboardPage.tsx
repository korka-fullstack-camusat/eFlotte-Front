import { useEffect, useState, useMemo } from "react";
import { CheckCircle, Wallet, Fuel, BarChart2, Filter, X, Car, Wrench, Route, DollarSign, Droplets, RefreshCw } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, Cell,
} from "recharts";
import AppLayout from "@/components/layout/AppLayout";
import { vehiculeService, coutService } from "@/services/api";
import axios from "axios";
import type { Vehicule, KpiCouts, EvolutionPoint, VehiculeCoutPoint, FiltresCouts, CoutsFilters } from "@/types";
import { KpiCard, MiniLineChart, MiniBarChart, DonutChart } from "@/components/charts";

interface VehiculeStats {
  total: number; en_service: number; en_maintenance: number;
  immobilises: number; taux_disponibilite: number; essence: number; gasoil: number;
}
interface CarburantStats {
  total_vehicules: number; total_litres: number; total_montant: number;
  total_distance: number; nb_gazoil: number; nb_essence: number;
  litres_gazoil: number; litres_essence: number;
  montant_gazoil: number; montant_essence: number;
}

function normStatut(s: string | null | undefined): string {
  return (s || "").trim().toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_");
}

const MOIS_NOMS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

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
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([label, value]) => ({ label, value }));
}

const RANK_COLORS = ["#1e3a5f","#10b981","#f59e0b","#f43f5e","#8b5cf6","#06b6d4","#84cc16","#ec4899","#6366f1","#f97316"];

function TopBarChart({ items, unit, color }: { items: VehiculeCoutPoint[]; unit?: string; color?: string }) {
  if (items.length === 0) return <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>;
  const data = items.map(it => ({ name: it.plaque_immatriculation, value: it.total }));
  const fmt = (v: number) => unit === "km" ? `${v.toLocaleString("fr-FR")} km` : `${v.toLocaleString("fr-FR")} FCFA`;
  const fmtTick = (v: number) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v/1_000).toFixed(0)}k` : String(v);
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, items.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 60, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtTick} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
        <RTooltip formatter={(v: number) => [fmt(v), ""]} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}
          label={{ position: "right", fontSize: 10, fill: "#6b7280", formatter: fmtTick }}>
          {data.map((_, i) => <Cell key={i} fill={color ?? RANK_COLORS[i % RANK_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-5 bg-camublue-900 rounded-full" />
      <h2 className="text-sm font-bold text-camublue-900 uppercase tracking-wide">{children}</h2>
    </div>
  );
}

const THIS_YEAR = new Date().getFullYear();

export default function DashboardPage() {
  const [vehicules,          setVehicules]          = useState<Vehicule[]>([]);
  const [vehiculeStats,      setVehiculeStats]      = useState<VehiculeStats | null>(null);
  const [carburantStats,     setCarburantStats]     = useState<CarburantStats | null>(null);
  const [kpi,                setKpi]                = useState<KpiCouts | null>(null);
  const [evolutionCarburant, setEvolutionCarburant] = useState<EvolutionPoint[]>([]);
  const [evolutionMaint,     setEvolutionMaint]     = useState<EvolutionPoint[]>([]);
  const [evolutionRep,       setEvolutionRep]       = useState<EvolutionPoint[]>([]);
  const [topCarburant,       setTopCarburant]       = useState<VehiculeCoutPoint[]>([]);
  const [topKm,              setTopKm]              = useState<VehiculeCoutPoint[]>([]);
  const [topReparation,      setTopReparation]      = useState<VehiculeCoutPoint[]>([]);
  const [filtres,            setFiltres]            = useState<FiltresCouts | null>(null);
  const [filters,            setFilters]            = useState<CoutsFilters>({ annee: THIS_YEAR });
  const [filterModal,        setFilterModal]        = useState(false);
  const [draft,              setDraft]              = useState<CoutsFilters>({ annee: THIS_YEAR });
  const [loading,            setLoading]            = useState(false);

  // Données statiques (flotte + filtres disponibles)
  useEffect(() => {
    vehiculeService.getAll().then(setVehicules).catch(() => {});
    axios.get("/api/vehicules/stats").then(r => setVehiculeStats(r.data)).catch(() => {});
    coutService.filtres().then(setFiltres).catch(() => {});
  }, []);

  // Données filtrées — toutes les courbes et KPIs
  useEffect(() => {
    setLoading(true);
    const p: CoutsFilters = { ...filters };
    // Si aucun filtre annee/mois, défaut = année courante
    if (!p.annee && !p.mois) p.annee = THIS_YEAR;

    const carParams: Record<string, any> = {};
    if (p.mois) carParams.mois = p.mois;
    else if (p.annee) carParams.annee = p.annee;

    Promise.all([
      coutService.kpi(p).then(setKpi).catch(() => {}),
      coutService.evolution({ ...p, type_cout: "CARBURANT" }).then(setEvolutionCarburant).catch(() => {}),
      coutService.evolution({ ...p, type_cout: "ENT" }).then(setEvolutionMaint).catch(() => {}),
      coutService.evolution({ ...p, type_cout: "REP" }).then(setEvolutionRep).catch(() => {}),
      coutService.topCarburant({ annee: p.annee, mois: p.mois as any, plaque: p.plaque, type_vehicule: p.type_vehicule, fournisseur: p.fournisseur, type_location: p.type_location, limit: 10 }).then(setTopCarburant).catch(() => {}),
      coutService.parVehicule({ ...p, type_cout: "DISTANCE", limit: 10 }).then(setTopKm).catch(() => {}),
      coutService.parVehicule({ ...p, type_cout: "REP",      limit: 10 }).then(setTopReparation).catch(() => {}),
      axios.get("/api/carburant/stats", { params: carParams }).then(r => setCarburantStats(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [filters]);

  // Dérivés flotte
  const enServiceCount     = vehiculeStats?.en_service     ?? vehicules.filter(v => normStatut(v.statut) === "EN_SERVICE").length;
  const enMaintenanceCount = vehiculeStats?.en_maintenance ?? vehicules.filter(v => normStatut(v.statut) === "EN_MAINTENANCE").length;
  const immobilisesCount   = vehiculeStats?.immobilises    ?? vehicules.filter(v => normStatut(v.statut).startsWith("IMMOBILISE")).length;
  const tauxDisponibilite  = vehiculeStats?.taux_disponibilite ?? (vehicules.length > 0 ? Math.round((enServiceCount / vehicules.length) * 100) : 0);
  const totalVehicules     = vehiculeStats?.total ?? vehicules.length;
  const nonRenseigneCount  = Math.max(0, totalVehicules - enServiceCount - enMaintenanceCount - immobilisesCount);
  const repartitionStatut  = [
    { label: "En service",     value: enServiceCount },
    { label: "En maintenance", value: enMaintenanceCount },
    { label: "Immobilisés",    value: immobilisesCount },
    ...(nonRenseigneCount > 0 ? [{ label: "Non renseigné", value: nonRenseigneCount }] : []),
  ];
  const repartitionType        = aggregateCount(vehicules, v => v.type_vehicule);
  const coutMaintenanceTotal   = evolutionMaint.reduce((s, p) => s + p.total, 0);
  const coutReparationTotal    = evolutionRep.reduce((s, p) => s + p.total, 0);

  // Label période affiché dans les titres
  const periodeLabel = useMemo(() => {
    if (filters.mois) return formatMois(filters.mois as string);
    if (filters.annee) return String(filters.annee);
    return String(THIS_YEAR);
  }, [filters]);

  const hasFilters = Object.keys(filters).some(k => filters[k as keyof CoutsFilters] !== undefined && k !== "annee") || (filters.annee !== THIS_YEAR);

  const setDraftFilter = (key: keyof CoutsFilters, value: string | number | undefined) => {
    setDraft(f => {
      const next = { ...f };
      if (value !== undefined && value !== "") {
        (next as any)[key] = value;
      } else {
        delete (next as any)[key];
      }
      // Quand on choisit un mois, on clear l'année (et vice-versa)
      if (key === "mois" && value) delete next.annee;
      if (key === "annee" && value) delete next.mois;
      return next;
    });
  };

  const openFilterModal = () => { setDraft(filters); setFilterModal(true); };
  const applyFilters    = () => { setFilters(draft); setFilterModal(false); };
  const resetFilters    = () => { const d = { annee: THIS_YEAR }; setDraft(d); setFilters(d); setFilterModal(false); };

  // Années disponibles depuis les filtres, fallback sur l'année courante
  const anneesDisponibles = filtres?.annees?.length ? filtres.annees : [THIS_YEAR];
  // Mois filtrés selon l'année sélectionnée dans le draft
  const moisDisponibles = (filtres?.mois ?? []).filter(m =>
    !draft.annee || m.startsWith(String(draft.annee))
  );

  return (
    <AppLayout>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-camublue-900 to-camublue-900/85 text-white px-6 py-5 mb-5 flex items-center justify-between flex-wrap gap-4 shadow-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Car size={28} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight uppercase">
              Gestion de parc automobile — {totalVehicules} véhicule{totalVehicules > 1 ? "s" : ""}
            </h2>
            <p className="text-white/70 text-xs sm:text-sm mt-0.5">
              P.A.R.C-CAM — Logistique &amp; flotte &nbsp;·&nbsp; Période : <strong>{periodeLabel}</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {loading && (
            <div className="flex items-center gap-1.5 text-white/70 text-xs">
              <RefreshCw size={13} className="animate-spin" />
              <span>Actualisation…</span>
            </div>
          )}
          <div className="bg-white/10 rounded-xl px-4 py-2 text-right hidden sm:block">
            <p className="text-[11px] text-white/70">{new Date().toLocaleDateString("fr-FR")}</p>
            <p className="text-xs font-bold uppercase tracking-wide">Tableau de bord</p>
          </div>
          <button onClick={openFilterModal}
            className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm font-semibold transition relative">
            <Filter size={15} /><span>Filtres</span>
            {hasFilters && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">!</span>
            )}
          </button>
        </div>
      </div>

      {/* ── KPI Flotte ─────────────────────────────────────────────────── */}
      <SectionTitle>Flotte — État des véhicules</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Total véhicules"    value={totalVehicules}     icon={<Car size={20}/>}         bg="bg-camublue-900/10" text="text-camublue-900" />
        <KpiCard label="En service"         value={enServiceCount}     icon={<CheckCircle size={20}/>} bg="bg-emerald-100"     text="text-emerald-600" />
        <KpiCard label="En maintenance"     value={enMaintenanceCount} icon={<Wrench size={20}/>}      bg="bg-amber-100"       text="text-amber-600" />
        <KpiCard label="Taux disponibilité" value={tauxDisponibilite}  suffix="%" icon={<BarChart2 size={20}/>} bg="bg-camublue-900/10" text="text-camublue-900" valueColor="text-amber-600" />
      </div>

      {/* ── KPI Coûts filtrés ───────────────────────────────────────────── */}
      <SectionTitle>Coûts — {periodeLabel}</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Valeur flotte (FCFA)"   value={kpi?.cout_total      ?? 0} icon={<Wallet size={20}/>}  bg="bg-emerald-100"     text="text-emerald-600" valueColor="text-amber-600" />
        <KpiCard label="Coût carburant (FCFA)"  value={kpi?.cout_carburant  ?? 0} icon={<Fuel size={20}/>}    bg="bg-camublue-900/10" text="text-camublue-900" />
        <KpiCard label="Coût entretien (FCFA)"  value={coutMaintenanceTotal}      icon={<Wrench size={20}/>}  bg="bg-amber-100"       text="text-amber-600" valueColor="text-amber-600" />
        <KpiCard label="Coût réparation (FCFA)" value={coutReparationTotal}       icon={<Wrench size={20}/>}  bg="bg-rose-100"        text="text-rose-600"  valueColor="text-rose-600" />
      </div>

      {/* ── KPI Carburant (filtré) ──────────────────────────────────────── */}
      {carburantStats && (
        <div className="mb-5">
          <SectionTitle>Carburant — {periodeLabel}</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <KpiCard label="Véhicules suivis"  value={carburantStats.total_vehicules} icon={<Car size={20}/>}         bg="bg-camublue-900/10" text="text-camublue-900" />
            <KpiCard label="Total litres"       value={Math.round(carburantStats.total_litres)}  suffix=" L" icon={<Droplets size={20}/>} bg="bg-blue-50"     text="text-blue-700" />
            <KpiCard label="Coût total (FCFA)"  value={Math.round(carburantStats.total_montant)} icon={<DollarSign size={20}/>}  bg="bg-green-50"    text="text-green-700" />
            <KpiCard label="Distance totale"    value={Math.round(carburantStats.total_distance)} suffix=" km" icon={<Route size={20}/>}   bg="bg-amber-50"    text="text-amber-700" />
            <KpiCard label="Gazoil (L)"         value={Math.round(carburantStats.litres_gazoil)} icon={<Fuel size={20}/>}        bg="bg-camublue-900/10" text="text-camublue-900" />
            <KpiCard label="Essence (L)"        value={Math.round(carburantStats.litres_essence)} icon={<Fuel size={20}/>}       bg="bg-orange-50"   text="text-orange-600" />
          </div>
        </div>
      )}

      {/* ── Répartitions flotte ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-camublue-900 mb-4">Répartition par statut</h3>
          {repartitionStatut.every(r => r.value === 0)
            ? <p className="text-sm text-gray-400 text-center py-10">Aucune donnée — renseignez le statut des véhicules.</p>
            : <DonutChart data={repartitionStatut} colors={["#10b981","#f59e0b","#f43f5e","#9ca3af"]} />}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-camublue-900 mb-4">Répartition par type de véhicule</h3>
          {repartitionType.length === 0
            ? <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>
            : <DonutChart data={repartitionType} />}
        </div>
      </div>

      {/* ── Évolutions coûts ────────────────────────────────────────────── */}
      <SectionTitle>Évolution des coûts — {periodeLabel}</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-camublue-900 mb-3">Consommation carburant (FCFA)</h3>
          {evolutionCarburant.length === 0
            ? <p className="text-sm text-gray-400 text-center py-10">Aucune donnée pour cette période.</p>
            : <MiniBarChart points={evolutionCarburant} color="#1e3a5f" />}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-camublue-900 mb-3">Coût maintenance (FCFA)</h3>
          {evolutionMaint.length === 0
            ? <p className="text-sm text-gray-400 text-center py-10">Aucune donnée pour cette période.</p>
            : <MiniLineChart points={evolutionMaint} />}
        </div>
      </div>

      {/* ── Top 10 carburant ────────────────────────────────────────────── */}
      <SectionTitle>Top 10 Consommation Carburant — {periodeLabel}</SectionTitle>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        {topCarburant.length === 0
          ? <p className="text-sm text-gray-400 text-center py-10">Aucune donnée pour cette période.</p>
          : <TopBarChart items={topCarburant} />}
      </div>

      {/* ── Top 10 km & réparation ──────────────────────────────────────── */}
      <SectionTitle>Top 10 Performance — {periodeLabel}</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-camublue-900 mb-4">Véhicules les plus kilométrés</h3>
          {topKm.length === 0
            ? <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>
            : <TopBarChart items={topKm} unit="km" />}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-camublue-900 mb-4">Coûts de réparation (FCFA)</h3>
          {topReparation.length === 0
            ? <p className="text-sm text-gray-400 text-center py-10">Aucune donnée</p>
            : <TopBarChart items={topReparation} />}
        </div>
      </div>

      {/* ══ Modal Filtres ══════════════════════════════════════════════════ */}
      {filterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setFilterModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Filter size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">Filtres du tableau de bord</p>
              </div>
              <button onClick={() => setFilterModal(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <div className="p-6 space-y-4">
              {/* Année */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Année</label>
                <select
                  value={draft.annee ?? ""}
                  onChange={e => setDraftFilter("annee", e.target.value ? Number(e.target.value) : undefined)}
                  className="input-base"
                >
                  <option value="">Toutes les années</option>
                  {anneesDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              {/* Mois (filtré selon l'année choisie) */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mois</label>
                <select
                  value={draft.mois ?? ""}
                  onChange={e => setDraftFilter("mois", e.target.value || undefined)}
                  className="input-base"
                >
                  <option value="">Tous les mois</option>
                  {moisDisponibles.map(m => <option key={m} value={m}>{formatMois(m)}</option>)}
                </select>
              </div>

              {/* Plaque */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Plaque d'immatriculation</label>
                <select value={draft.plaque ?? ""} onChange={e => setDraftFilter("plaque", e.target.value || undefined)} className="input-base">
                  <option value="">Toutes les plaques</option>
                  {(filtres?.plaques ?? []).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Type véhicule */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type de véhicule</label>
                <select value={draft.type_vehicule ?? ""} onChange={e => setDraftFilter("type_vehicule", e.target.value || undefined)} className="input-base">
                  <option value="">Tous les types</option>
                  {(filtres?.types_vehicule ?? []).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Fournisseur */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fournisseur</label>
                <select value={draft.fournisseur ?? ""} onChange={e => setDraftFilter("fournisseur", e.target.value || undefined)} className="input-base">
                  <option value="">Tous les fournisseurs</option>
                  {(filtres?.fournisseurs ?? []).map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {/* Type location */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type de location</label>
                <select value={draft.type_location ?? ""} onChange={e => setDraftFilter("type_location", e.target.value || undefined)} className="input-base">
                  <option value="">Tous les types de location</option>
                  {(filtres?.types_location ?? []).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={resetFilters}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                  Réinitialiser
                </button>
                <button type="button" onClick={applyFilters}
                  className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">
                  Appliquer les filtres
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
