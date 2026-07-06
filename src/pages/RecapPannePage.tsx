import { useEffect, useState, useMemo } from "react";
import {
  Search, Filter, Car, CheckCircle, Wrench, Ban, X, Save, BarChart2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, Cell,
} from "recharts";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/charts";
import { useAuth } from "@/contexts/AuthContext";
import ChartFilterBar, { ChartFilter, CHART_FILTER_EMPTY } from "@/components/ChartFilterBar";
import axios from "axios";

/* ── Helpers ─────────────────────────────────────────────────────── */
const MOIS_COURTS = [
  "janv", "févr", "mars", "avr", "mai", "juin",
  "juil", "août", "sept", "oct", "nov", "déc",
];

function isoMois(year: number) {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}
function moisLabel(iso: string) {
  const m = Number(iso.split("-")[1]);
  const y = iso.split("-")[0].slice(2);
  return `${MOIS_COURTS[m - 1]}-${y}`;
}

function normStatut(s: string | null | undefined) {
  if (!s) return "";
  const u = s.toUpperCase().replace(/[ÉÈÊË]/g, "E").replace(/\s+/g, "_").replace(/-/g, "_");
  return u;
}

const STATUT_OPTIONS = ["En service", "En maintenance", "Immobilisé"];

const STATUT_STYLES: Record<string, string> = {
  "En service":    "bg-emerald-500 text-white",
  "En maintenance":"bg-amber-500 text-white",
  "Immobilisé":    "bg-rose-500 text-white",
};
const STATUT_COLORS: Record<string, string> = {
  "En service":    "#10b981",
  "En maintenance":"#f59e0b",
  "Immobilisé":    "#f43f5e",
};
const CHART_COLORS = ["#1e3a5f","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f97316","#10b981","#ef4444","#eab308","#06b6d4"];

function StatutBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-gray-300">—</span>;
  const style = STATUT_STYLES[value] ?? "bg-gray-200 text-gray-700";
  const label = value === "En maintenance" ? "Maint." : value === "Immobilisé" ? "Immob." : "En service";
  return (
    <span className={`inline-flex items-center justify-center w-full px-1 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${style}`}>
      {label}
    </span>
  );
}

/* ── Types ────────────────────────────────────────────────────────── */
interface VehiculeRecap {
  id: number | null;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  chauffeur: string | null;
  type_carburant: string | null;
  car_group: string | null;
  statut_actuel: string | null;
  statuts: Record<string, string | null>;
}

interface RecapData {
  annee: number;
  mois: string[];
  vehicules: VehiculeRecap[];
  source: "import" | "computed";
  stats: { en_service: number; en_maintenance: number; immobilises: number; total: number };
}

type QuickEdit = {
  rowImmat: string;
  rowId: number | null;
  fieldKey: string;
  label: string;
  current: string;
  isFixed: boolean;
};

/* ── Modal édition rapide ─────────────────────────────────────────── */
function QuickEditModal({ qe, onClose, onSave }: {
  qe: QuickEdit;
  onClose: () => void;
  onSave: (fieldKey: string, value: string) => Promise<void>;
}) {
  const [val, setVal] = useState(qe.current ?? "");
  const [saving, setSaving] = useState(false);
  async function save() { setSaving(true); await onSave(qe.fieldKey, val); setSaving(false); }
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-camublue-900">Modifier — <span className="font-normal text-gray-500">{qe.label}</span></p>
          <button onClick={onClose}><X size={16} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        {qe.isFixed ? (
          <input autoFocus value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && save()}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-camublue-900/20" />
        ) : (
          <select autoFocus value={val} onChange={e => setVal(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-camublue-900/20">
            <option value="">(vide)</option>
            {STATUT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Annuler</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-camublue-900 text-white rounded-lg hover:bg-camublue-900/90 disabled:opacity-50">
            <Save size={13} /> {saving ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Graphiques ───────────────────────────────────────────────────── */
function ChartsModal({
  rows, mois, annee, chartFilter, onChangeFilter, onClose,
}: {
  rows: VehiculeRecap[];
  mois: string[];
  annee: number;
  chartFilter: ChartFilter;
  onChangeFilter: (f: ChartFilter) => void;
  onClose: () => void;
}) {
  /* Mois filtrés selon le ChartFilter */
  const filteredMois = useMemo(() => {
    const { mode, annee: fa, mois: fm, date_debut, date_fin } = chartFilter;
    return mois.filter(m => {
      if (mode === "annee") {
        if (!fa) return true;
        return m.startsWith(String(fa));
      }
      if (mode === "mois" && fa) {
        if (!fm) return m.startsWith(String(fa));
        return m === `${fa}-${String(fm).padStart(2, "0")}`;
      }
      if (mode === "perso") {
        // Compare month strings as "YYYY-MM" against date boundaries
        const mStart = m + "-01";
        if (date_debut && mStart < date_debut.slice(0, 8) + "01") return false;
        if (date_fin   && mStart > date_fin.slice(0, 8)   + "01") return false;
        return true;
      }
      return true;
    });
  }, [mois, chartFilter]);

  /* Label période affichée */
  const periodeLabel = useMemo(() => {
    if (filteredMois.length === 0) return "Aucun mois sélectionné";
    if (filteredMois.length === mois.length) return `Tous les mois de ${annee}`;
    if (filteredMois.length === 1) return moisLabel(filteredMois[0]);
    return `${moisLabel(filteredMois[0])} → ${moisLabel(filteredMois[filteredMois.length - 1])}`;
  }, [filteredMois, mois, annee]);

  /* 1. Répartition statuts sur les mois filtrés (ou mois actuel si 1 seul) */
  const isSingleMois = filteredMois.length === 1;
  const statutsMois: Record<string, number> = {};
  rows.forEach(v => {
    filteredMois.forEach(m => {
      const s = v.statuts[m];
      if (s) statutsMois[s] = (statutsMois[s] || 0) + 1;
    });
  });
  const statMoisData = Object.entries(statutsMois)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value, color: STATUT_COLORS[name] ?? "#9ca3af" }));

  /* 2. Évolution mensuelle — nombre de véhicules par statut par mois filtré */
  const evolutionData = filteredMois.map(m => {
    const counts: Record<string, number> = { mois: Number(m.split("-")[1]) };
    rows.forEach(v => {
      const s = v.statuts[m];
      if (s) counts[s] = (counts[s] || 0) + 1;
    });
    return { name: moisLabel(m), ...counts };
  });

  /* 3. Par marque */
  const parBrand: Record<string, number> = {};
  rows.forEach(v => { const k = v.marque || "—"; parBrand[k] = (parBrand[k] || 0) + 1; });
  const brandData = Object.entries(parBrand).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  /* 4. Par Car Group */
  const parGroup: Record<string, number> = {};
  rows.forEach(v => { const k = v.car_group || "—"; parGroup[k] = (parGroup[k] || 0) + 1; });
  const groupData = Object.entries(parGroup).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-camublue-900 px-5 py-3 flex items-center gap-3 sticky top-0 z-10 flex-wrap">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <BarChart2 size={16} className="text-white" />
          </div>
          <p className="text-white font-bold text-sm shrink-0">Statistiques — Récap des Pannes</p>
          <div className="flex-1 flex justify-center min-w-0">
            <ChartFilterBar filter={chartFilter} onChange={onChangeFilter} />
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition shrink-0 ml-auto">
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Statuts sur la période filtrée */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-sm font-bold text-camublue-900 mb-1">
                {isSingleMois ? "Statuts du mois sélectionné" : "Répartition des statuts"}
              </p>
              <p className="text-xs text-gray-400 mb-4">{periodeLabel}</p>
              {statMoisData.length === 0
                ? <p className="text-xs text-gray-400 text-center py-8">Aucune donnée pour cette période.</p>
                : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={statMoisData} margin={{ left: 8, right: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <RTooltip formatter={(v: number) => [`${v} occurrence(s)`, ""]} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {statMoisData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </div>

            {/* Évolution mensuelle */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-sm font-bold text-camublue-900 mb-1">Évolution mensuelle des statuts</p>
              <p className="text-xs text-gray-400 mb-4">{periodeLabel}</p>
              {evolutionData.length === 0
                ? <p className="text-xs text-gray-400 text-center py-8">Aucun mois dans la période.</p>
                : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={evolutionData} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <RTooltip />
                      {STATUT_OPTIONS.map(s => (
                        <Bar key={s} dataKey={s} stackId="a" fill={STATUT_COLORS[s] ?? "#9ca3af"}
                          radius={s === "Immobilisé" ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Par marque */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-sm font-bold text-camublue-900 mb-4">Véhicules par marque (Brand)</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={brandData} layout="vertical" margin={{ left: 8, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <RTooltip formatter={(v: number) => [`${v} véhicule(s)`, ""]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}
                    label={{ position: "right", fontSize: 11, fill: "#6b7280", formatter: (v: number) => v }}>
                    {brandData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Par Car Group */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-sm font-bold text-camublue-900 mb-4">Véhicules par Car Group</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={groupData} layout="vertical" margin={{ left: 8, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
                  <RTooltip formatter={(v: number) => [`${v} véhicule(s)`, ""]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}
                    label={{ position: "right", fontSize: 11, fill: "#6b7280", formatter: (v: number) => v }}>
                    {groupData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page principale ──────────────────────────────────────────────── */
export default function RecapPannePage() {
  const { isViewer } = useAuth();
  const currentYear = new Date().getFullYear();

  const [annee, setAnnee]             = useState(currentYear);
  const [data, setData]               = useState<RecapData | null>(null);
  const [rows, setRows]               = useState<VehiculeRecap[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filterModal, setFilterModal] = useState(false);
  const [filterGroup, setFilterGroup] = useState("");
  const [filterFuel, setFilterFuel]   = useState("");
  const [draftGroup, setDraftGroup]   = useState("");
  const [draftFuel, setDraftFuel]     = useState("");
  const [quickEdit, setQuickEdit]     = useState<QuickEdit | null>(null);
  const [showCharts, setShowCharts]   = useState(false);
  const [chartFilter, setChartFilter] = useState<ChartFilter>({ ...CHART_FILTER_EMPTY, annee, mode: "annee" });

  const mois = useMemo(() => isoMois(annee), [annee]);

  useEffect(() => {
    setLoading(true);
    setChartFilter({ ...CHART_FILTER_EMPTY, annee, mode: "annee" });
    axios.get("/api/suivi-pannes/recap", { params: { annee } })
      .then(r => { setData(r.data); setRows(r.data.vehicules ?? []); })
      .catch(() => { setData(null); setRows([]); })
      .finally(() => setLoading(false));
  }, [annee]);

  const carGroups = useMemo(() =>
    [...new Set(rows.map(v => v.car_group).filter(Boolean))].sort() as string[], [rows]);
  const fuelTypes = useMemo(() =>
    [...new Set(rows.map(v => v.type_carburant).filter(Boolean))].sort() as string[], [rows]);

  /* Lignes filtrées */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(v => {
      if (filterGroup && v.car_group !== filterGroup) return false;
      if (filterFuel && v.type_carburant !== filterFuel) return false;
      if (q && ![v.immatriculation, v.marque, v.modele, v.chauffeur, v.car_group]
        .some(f => (f ?? "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, search, filterGroup, filterFuel]);

  /* KPIs dynamiques basés sur les lignes filtrées */
  const kpiTotal       = filtered.length;
  const kpiEnService   = filtered.filter(v => normStatut(v.statut_actuel) === "EN_SERVICE").length;
  const kpiMaintenance = filtered.filter(v => normStatut(v.statut_actuel) === "EN_MAINTENANCE").length;
  const kpiImmobilises = filtered.filter(v => normStatut(v.statut_actuel).startsWith("IMMOBILIS")).length;

  const hasFilters = !!(filterGroup || filterFuel);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  /* Ouvrir éditeur */
  function openEdit(v: VehiculeRecap, fieldKey: string, label: string, current: string | null, isFixed: boolean) {
    if (isViewer) return;
    setQuickEdit({ rowImmat: v.immatriculation, rowId: v.id, fieldKey, label, current: current ?? "", isFixed });
  }

  /* Sauvegarder */
  async function handleSave(fieldKey: string, value: string) {
    if (!quickEdit) return;
    const plaque = quickEdit.rowImmat;
    const id     = quickEdit.rowId;
    try {
      const url = id != null
        ? `/api/suivi-pannes/recap/${id}`
        : `/api/suivi-pannes/recap/by-plaque/${encodeURIComponent(plaque)}`;
      const resp = await axios.patch(url, { [fieldKey]: value });
      const newId = resp.data?.id ?? id;

      setRows(prev => prev.map(r => {
        if (r.immatriculation !== plaque) return r;
        if (quickEdit.isFixed) {
          const MAP: Record<string, keyof VehiculeRecap> = {
            brand: "marque", model: "modele", label: "chauffeur",
            fuel_type: "type_carburant", car_group: "car_group",
          };
          const k = MAP[fieldKey];
          return { ...r, id: newId, ...(k ? { [k]: value || null } : {}) };
        }
        return { ...r, id: newId, statuts: { ...r.statuts, [fieldKey]: value || null } };
      }));

      toast.success("Modifié");
      setQuickEdit(null);
    } catch {
      toast.error("Erreur lors de la modification");
    }
  }

  /* ── Rendu ─────────────────────────────────────────────────────── */
  return (
    <AppLayout>
      {/* ── Header ── */}
      <div className="mb-8 sticky top-0 z-20 bg-camugray-100 -mx-4 px-4 md:-mx-8 md:px-8 pt-1 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-camublue-900">Récap des Pannes</h1>
            <p className="text-gray-500 text-sm mt-0.5">Suivi mensuel du statut de chaque véhicule</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={annee} onChange={e => setAnnee(Number(e.target.value))}
              className="px-3 py-2 border border-camublue-900 text-camublue-900 rounded-xl text-sm font-semibold bg-white focus:outline-none">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <button onClick={() => setShowCharts(true)}
              className="flex items-center gap-2 px-4 py-2 border border-camublue-900 text-camublue-900 hover:bg-camublue-900/5 rounded-xl text-sm font-semibold transition">
              <BarChart2 size={15} /><span>Voir graphiques</span>
            </button>

            <button onClick={() => { setDraftGroup(filterGroup); setDraftFuel(filterFuel); setFilterModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm relative">
              <Filter size={15} /><span>Filtres</span>
              {hasFilters && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {(filterGroup ? 1 : 0) + (filterFuel ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI dynamiques ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total véhicules"  value={kpiTotal}       icon={<Car size={20}/>}         bg="bg-camublue-900/10" text="text-camublue-900" />
        <KpiCard label="En service"       value={kpiEnService}   icon={<CheckCircle size={20}/>} bg="bg-emerald-100"     text="text-emerald-600" />
        <KpiCard label="En maintenance"   value={kpiMaintenance} icon={<Wrench size={20}/>}      bg="bg-amber-100"       text="text-amber-600" />
        <KpiCard label="Immobilisés"      value={kpiImmobilises} icon={<Ban size={20}/>}         bg="bg-rose-100"        text="text-rose-600" />
      </div>

      {/* ── Recherche centrée ── */}
      <div className="flex justify-center mb-6">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par plaque, marque, label…"
            className="input-base pl-9 w-full" />
        </div>
      </div>

      {/* ── Tableau ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 p-6 text-center">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 p-6 text-center">Aucun véhicule trouvé.</p>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
            <table className="w-full text-sm">
              <thead className="bg-camublue-900 text-white text-xs uppercase sticky top-0 z-20">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap sticky left-0 bg-camublue-900 z-30">Brand</th>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Model</th>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Reg. N°</th>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Label</th>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Fuel type</th>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Car Group</th>
                  {mois.map(m => (
                    <th key={m} className="text-center px-2 py-2.5 font-semibold whitespace-nowrap min-w-[72px]">
                      {moisLabel(m)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(v => (
                  <tr key={v.immatriculation} className="hover:bg-gray-50/60">
                    <td onClick={() => !isViewer && openEdit(v, "brand", "Brand", v.marque, true)}
                      className={`px-4 py-2.5 font-semibold text-gray-700 whitespace-nowrap sticky left-0 bg-white ${!isViewer ? "cursor-pointer hover:text-camublue-900" : ""}`}>
                      {v.marque || "—"}
                    </td>
                    <td onClick={() => !isViewer && openEdit(v, "model", "Model", v.modele, true)}
                      className={`px-4 py-2.5 text-gray-600 whitespace-nowrap ${!isViewer ? "cursor-pointer hover:text-camublue-900" : ""}`}>
                      {v.modele || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-camublue-900 font-medium whitespace-nowrap">
                      {v.immatriculation}
                    </td>
                    <td onClick={() => !isViewer && openEdit(v, "label", "Label", v.chauffeur, true)}
                      className={`px-4 py-2.5 text-gray-600 whitespace-nowrap ${!isViewer ? "cursor-pointer hover:text-camublue-900" : ""}`}>
                      {v.chauffeur || "—"}
                    </td>
                    <td onClick={() => !isViewer && openEdit(v, "fuel_type", "Fuel type", v.type_carburant, true)}
                      className={`px-4 py-2.5 text-gray-600 whitespace-nowrap ${!isViewer ? "cursor-pointer hover:text-camublue-900" : ""}`}>
                      {v.type_carburant || "—"}
                    </td>
                    <td onClick={() => !isViewer && openEdit(v, "car_group", "Car Group", v.car_group, true)}
                      title={v.car_group ?? ""}
                      className={`px-4 py-2.5 text-gray-600 whitespace-nowrap max-w-[180px] truncate ${!isViewer ? "cursor-pointer hover:text-camublue-900" : ""}`}>
                      {v.car_group || "—"}
                    </td>
                    {mois.map(m => (
                      <td key={m}
                        onClick={() => !isViewer && openEdit(v, m, moisLabel(m), v.statuts[m] ?? null, false)}
                        className={`px-1 py-2.5 text-center min-w-[72px] ${!isViewer ? "cursor-pointer hover:opacity-75 transition" : ""}`}>
                        <StatutBadge value={v.statuts[m]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal filtres ── */}
      {filterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setFilterModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-camublue-900">Filtres</h3>
              <button onClick={() => setFilterModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Car Group</label>
                <select value={draftGroup} onChange={e => setDraftGroup(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-camublue-900/20">
                  <option value="">Tous</option>
                  {carGroups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Fuel type</label>
                <select value={draftFuel} onChange={e => setDraftFuel(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-camublue-900/20">
                  <option value="">Tous</option>
                  {fuelTypes.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => { setDraftGroup(""); setDraftFuel(""); setFilterGroup(""); setFilterFuel(""); setFilterModal(false); }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Réinitialiser
              </button>
              <button
                onClick={() => { setFilterGroup(draftGroup); setFilterFuel(draftFuel); setFilterModal(false); }}
                className="flex-1 px-4 py-2 bg-camublue-900 text-white rounded-xl text-sm font-semibold hover:bg-camublue-900/90">
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal graphiques ── */}
      {showCharts && (
        <ChartsModal
          rows={filtered}
          mois={mois}
          annee={annee}
          chartFilter={chartFilter}
          onChangeFilter={setChartFilter}
          onClose={() => setShowCharts(false)}
        />
      )}

      {/* ── Modal édition rapide ── */}
      {quickEdit && (
        <QuickEditModal qe={quickEdit} onClose={() => setQuickEdit(null)} onSave={handleSave} />
      )}
    </AppLayout>
  );
}
