import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Upload, Fuel, TrendingUp, DollarSign, Route,
  X, Search, BarChart2, Filter, Pencil, Calendar, ChevronDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip as RTooltip,
} from "recharts";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import ChartFilterBar, {
  ChartFilter, CHART_FILTER_EMPTY, applyChartFilter,
} from "@/components/ChartFilterBar";

// ── Types ────────────────────────────────────────────────────────────────────

interface CarburantRow {
  id: number;
  matricule: string;
  mois: number;
  quantite_totale: number | null;
  montant_total: number | null;
  mt_ht: number | null;
  prix_unitaire: number | null;
  type_carburant: string | null;
  distance_totale: number | null;
  distance_gps: number | null;
  car_group: string | null;
  dernier_plein: string | null;
  driver_name: string | null;
  nom_chauffeur: string | null;
  code_projet: string | null;
  num_carte: string | null;
}

interface Stats {
  total_vehicules: number;
  total_litres: number;
  total_montant: number;
  total_distance: number;
  nb_gazoil: number;
  nb_essence: number;
  litres_gazoil: number;
  litres_essence: number;
  montant_gazoil: number;
  montant_essence: number;
  top_consommateurs: Array<{ matricule: string; type_carburant: string; quantite_totale: number; car_group: string }>;
  top_couts: Array<{ matricule: string; type_carburant: string; montant_total: number; car_group: string }>;
}

interface Filtres {
  car_groups: string[];
  types_carburant: string[];
  matricules: string[];
  codes_projet: string[];
}

type EditableField = "quantite_totale" | "montant_total" | "mt_ht" | "prix_unitaire"
  | "type_carburant" | "distance_totale" | "distance_gps" | "car_group"
  | "dernier_plein" | "driver_name" | "nom_chauffeur" | "code_projet" | "num_carte";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOIS_NOMS = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR", { maximumFractionDigits: decimals });
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
}

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-gray-400 text-xs">—</span>;
  const isGazoil = type.toUpperCase() === "GAZOIL";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
      isGazoil ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-700"
    }`}>
      {type}
    </span>
  );
}

function KpiCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card px-5 py-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color ?? "bg-camublue-900/10 text-camublue-900"}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-500 uppercase tracking-wide font-medium truncate">{label}</p>
        <p className="text-xl font-extrabold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS = ["#1e3a5f","#2a5298","#3b6fc4","#5b8de0","#7aaee8","#9ec5f0","#b8d4f5","#d0e5fa","#e6f1fd","#f0f7ff"];
const truncTick = (v: string) => v.length > 14 ? v.slice(0, 13) + "…" : v;
const hBarHeight = (data: unknown[]) => Math.max(200, data.length * 36);

const FIELD_META: Record<EditableField, { label: string; type: "text" | "number" | "date" | "select" }> = {
  quantite_totale: { label: "Quantité totale (L)",  type: "number" },
  montant_total:   { label: "Montant total (FCFA)", type: "number" },
  mt_ht:           { label: "Montant HT",           type: "number" },
  prix_unitaire:   { label: "Prix unitaire",        type: "number" },
  type_carburant:  { label: "Type carburant",       type: "select" },
  distance_totale: { label: "Distance totale (km)", type: "number" },
  distance_gps:    { label: "Distance GPS",         type: "number" },
  car_group:       { label: "Pôle / CarGroup",      type: "text"   },
  dernier_plein:   { label: "Dernier plein",        type: "date"   },
  driver_name:     { label: "Driver name",          type: "text"   },
  nom_chauffeur:   { label: "Nom chauffeur",        type: "text"   },
  code_projet:     { label: "Code projet",          type: "text"   },
  num_carte:       { label: "N° carte",             type: "text"   },
};

function computeChartData(rows: CarburantRow[]) {
  const consomMap = new Map<string, number>();
  const coutMap   = new Map<string, number>();
  let litresGazoil = 0, litresEssence = 0, montantGazoil = 0, montantEssence = 0;

  for (const r of rows) {
    consomMap.set(r.matricule, (consomMap.get(r.matricule) ?? 0) + (r.quantite_totale ?? 0));
    coutMap.set(r.matricule,   (coutMap.get(r.matricule)   ?? 0) + (r.montant_total   ?? 0));
    const t = (r.type_carburant ?? "").toUpperCase();
    if (t === "GAZOIL")  { litresGazoil  += r.quantite_totale ?? 0; montantGazoil  += r.montant_total ?? 0; }
    if (t === "ESSENCE") { litresEssence += r.quantite_totale ?? 0; montantEssence += r.montant_total ?? 0; }
  }

  const consomData = [...consomMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, value]) => ({ label, value }));
  const coutData   = [...coutMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, value]) => ({ label, value }));
  const repartData = [
    { label: "Gazoil",  litres: litresGazoil,  montant: montantGazoil  },
    { label: "Essence", litres: litresEssence, montant: montantEssence },
  ];
  return { consomData, coutData, repartData };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CarburantPage() {
  const [selectedMois, setSelectedMois] = useState<number>(1);
  const [moisOpen,     setMoisOpen]     = useState(false);

  // Liste de référence : tous les matricules connus (toutes périodes confondues)
  const [allMatricules, setAllMatricules] = useState<string[]>([]);
  // Données du mois sélectionné, indexées par matricule
  const [monthData,     setMonthData]     = useState<Map<string, CarburantRow>>(new Map());

  const [stats,   setStats]   = useState<Stats | null>(null);
  const [filtres, setFiltres] = useState<Filtres | null>(null);

  const [search,   setSearch]   = useState("");
  const [carGroup, setCarGroup] = useState("");
  const [typeCarb, setTypeCarb] = useState("");
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [showCharts,  setShowCharts]  = useState(false);
  const [filterModal, setFilterModal] = useState(false);
  const [detailRow,   setDetailRow]   = useState<CarburantRow | null>(null);
  const [quickEdit,   setQuickEdit]   = useState<{ row: CarburantRow; field: EditableField; value: string } | null>(null);
  const [quickSaving, setQuickSaving] = useState(false);

  const [draftGroup, setDraftGroup] = useState("");
  const [draftType,  setDraftType]  = useState("");

  const [chartFilter,   setChartFilter]   = useState<ChartFilter>(CHART_FILTER_EMPTY);
  const [allChartRows,  setAllChartRows]  = useState<CarburantRow[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);

  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasFilters = !!(carGroup || typeCarb);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  // Charge tous les matricules connus (toutes périodes) — liste de référence fixe
  const fetchAllMatricules = async () => {
    const { data } = await axios.get("/api/carburant", { params: { page: 1, page_size: 9999 } });
    const unique = [...new Set<string>((data.items as CarburantRow[]).map(r => r.matricule))].sort();
    setAllMatricules(unique);
  };

  const fetchStats = useCallback(async () => {
    const params: Record<string, string | number> = { mois: selectedMois };
    if (carGroup) params.car_group = carGroup;
    if (typeCarb) params.type_carburant = typeCarb;
    const { data } = await axios.get("/api/carburant/stats", { params });
    setStats(data);
  }, [selectedMois, carGroup, typeCarb]);

  // Charge les données du mois sélectionné et les indexe par matricule
  const fetchMonthData = useCallback(async () => {
    const params: Record<string, string | number> = { mois: selectedMois, page: 1, page_size: 9999 };
    if (carGroup) params.car_group = carGroup;
    if (typeCarb) params.type_carburant = typeCarb;
    const { data } = await axios.get("/api/carburant", { params });
    const map = new Map<string, CarburantRow>();
    (data.items as CarburantRow[]).forEach(r => map.set(r.matricule, r));
    setMonthData(map);
  }, [selectedMois, carGroup, typeCarb]);

  const fetchFiltres = async () => {
    const { data } = await axios.get("/api/carburant/filtres");
    setFiltres(data);
  };

  // Au montage : charger la liste de référence des matricules + filtres
  useEffect(() => {
    fetchAllMatricules();
    fetchFiltres();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // À chaque changement de mois/filtres : recharger données du mois + stats
  useEffect(() => {
    setPage(1);
    fetchMonthData();
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMois, carGroup, typeCarb]);

  // Après un import : rafraîchir aussi la liste de référence
  const refreshAll = async () => {
    await Promise.all([fetchAllMatricules(), fetchMonthData(), fetchStats(), fetchFiltres()]);
  };

  // ── Vue paginée : filtre sur allMatricules + search ───────────────────────
  const filteredMatricules = allMatricules.filter(m =>
    !search || m.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages  = Math.ceil(filteredMatricules.length / pageSize);
  const pageSlice   = filteredMatricules.slice((page - 1) * pageSize, page * pageSize);
  // Lignes affichées : matricule fixe + données du mois (ou vide si absent)
  const displayRows: CarburantRow[] = pageSlice.map(m => monthData.get(m) ?? {
    id: -1, matricule: m, mois: selectedMois,
    quantite_totale: null, montant_total: null, mt_ht: null, prix_unitaire: null,
    type_carburant: null, distance_totale: null, distance_gps: null,
    car_group: null, dernier_plein: null, driver_name: null,
    nom_chauffeur: null, code_projet: null, num_carte: null,
  });

  // ── Charts modal ─────────────────────────────────────────────────────────

  const openCharts = () => {
    setShowCharts(true);
    setLoadingCharts(true);
    axios.get("/api/carburant", { params: { mois: selectedMois, page: 1, page_size: 9999 } })
      .then(({ data }) => setAllChartRows(data.items))
      .catch(() => {})
      .finally(() => setLoadingCharts(false));
  };

  const filteredChartRows = applyChartFilter(allChartRows, chartFilter, r => r.dernier_plein);
  const { consomData, coutData, repartData } = computeChartData(filteredChartRows);

  // ── Import ────────────────────────────────────────────────────────────────

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await axios.post(`/api/carburant/import?mois=${selectedMois}`, fd);
      toast.success(`Import ${MOIS_NOMS[selectedMois - 1]} : ${data.created} créés, ${data.updated} mis à jour`);
      if (data.errors?.length) {
        toast.error(`${data.errors.length} erreur(s) — voir console`, { duration: 6000 });
        console.warn("Erreurs import carburant:", data.errors);
      }
      setPage(1);
      await refreshAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur lors de l'import");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ── Quick edit ────────────────────────────────────────────────────────────

  const openQuickEdit = (row: CarburantRow, field: EditableField) => {
    const raw = row[field];
    const value = raw == null ? "" : field === "dernier_plein" ? String(raw).slice(0, 10) : String(raw);
    setQuickEdit({ row, field, value });
    setDetailRow(null);
  };

  const handleQuickSave = async () => {
    if (!quickEdit) return;
    setQuickSaving(true);
    const { row, field, value } = quickEdit;
    const meta = FIELD_META[field];
    let parsed: unknown = value || null;
    if (meta.type === "number" && value) parsed = parseFloat(value);
    try {
      const { data } = await axios.patch(`/api/carburant/${row.id}`, { [field]: parsed });
      toast.success("Mis à jour");
      setMonthData(prev => {
        const next = new Map(prev);
        next.set(row.matricule, { ...row, ...data });
        return next;
      });
      setQuickEdit(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    } finally {
      setQuickSaving(false);
    }
  };

  // ── Filtres ───────────────────────────────────────────────────────────────

  const openFilterModal = () => { setDraftGroup(carGroup); setDraftType(typeCarb); setFilterModal(true); };
  const applyFilters    = () => { setCarGroup(draftGroup); setTypeCarb(draftType); setFilterModal(false); };
  const resetFilters    = () => { setDraftGroup(""); setDraftType(""); setCarGroup(""); setTypeCarb(""); setFilterModal(false); };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="mb-8 sticky top-0 z-20 bg-camugray-100 -mx-4 px-4 md:-mx-8 md:px-8 pt-1 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-camublue-900">Suivi Carburant</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {MOIS_NOMS[selectedMois - 1]} — {filteredMatricules.length} véhicule{filteredMatricules.length !== 1 ? "s" : ""}
              {monthData.size < allMatricules.length && (
                <span className="ml-2 text-amber-500 text-xs">
                  · {monthData.size} avec données
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">

            {/* ── Sélecteur de mois ─────────────────────────────────────── */}
            <div className="relative">
              <button
                onClick={() => setMoisOpen(v => !v)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-camublue-900/40 text-camublue-900 rounded-xl text-sm font-semibold transition shadow-sm"
              >
                <Calendar size={15} />
                <span>{MOIS_NOMS[selectedMois - 1]}</span>
                <ChevronDown size={13} className={`transition-transform ${moisOpen ? "rotate-180" : ""}`} />
              </button>
              {moisOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl z-30 p-3 w-64">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold mb-2 px-1">Choisir le mois</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {MOIS_NOMS.map((nom, i) => {
                      const m = i + 1;
                      return (
                        <button
                          key={m}
                          onClick={() => { setSelectedMois(m); setMoisOpen(false); }}
                          className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition ${
                            selectedMois === m
                              ? "bg-camublue-900 text-white"
                              : "bg-gray-50 text-gray-600 hover:bg-camublue-900/10 hover:text-camublue-900"
                          }`}
                        >
                          {nom}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button onClick={openCharts}
              className="flex items-center gap-2 px-4 py-2 border border-camublue-900 text-camublue-900 hover:bg-camublue-900/5 rounded-xl text-sm font-semibold transition">
              <BarChart2 size={15} /><span>Voir graphiques</span>
            </button>
            <button onClick={openFilterModal}
              className="flex items-center gap-2 px-4 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm relative">
              <Filter size={15} /><span>Filtres</span>
              {hasFilters && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {(carGroup ? 1 : 0) + (typeCarb ? 1 : 0)}
                </span>
              )}
            </button>
            <button onClick={() => fileRef.current?.click()} disabled={importing}
              className="flex items-center gap-2 px-4 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-60">
              <Upload size={15} />
              {importing ? "Import en cours…" : `Importer — ${MOIS_NOMS[selectedMois - 1]}`}
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </div>
        </div>
      </div>

      <div className="space-y-5">

        {/* KPI Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard icon={<Fuel size={20} />} label="Total litres"
              value={`${fmt(stats.total_litres, 0)} L`}
              sub={`Gazoil : ${fmt(stats.litres_gazoil, 0)} L · Essence : ${fmt(stats.litres_essence, 0)} L`} />
            <KpiCard icon={<DollarSign size={20} />} label="Coût total"
              value={`${fmt(stats.total_montant)} FCFA`}
              sub={`Gazoil : ${fmt(stats.montant_gazoil)} · Essence : ${fmt(stats.montant_essence)}`}
              color="bg-green-50 text-green-700" />
            <KpiCard icon={<Route size={20} />} label="Distance totale"
              value={`${fmt(stats.total_distance)} km`} color="bg-amber-50 text-amber-700" />
            <KpiCard icon={<TrendingUp size={20} />} label="Véhicules"
              value={`${stats.total_vehicules}`}
              sub={`Gazoil : ${stats.nb_gazoil} · Essence : ${stats.nb_essence}`}
              color="bg-purple-50 text-purple-700" />
          </div>
        )}

        {/* Barre de recherche */}
        <div className="flex justify-center mb-6">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par matricule, chauffeur, pôle…"
              className="input-base pl-9 w-full" />
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-camublue-900 text-white text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Matricule</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Montant Total (FCFA)</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Mt HT</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Distance Totale (km)</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Distance GPS</th>
                </tr>
              </thead>
              <tbody>
                {allMatricules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-gray-400">
                      Aucun véhicule. Importez d'abord un fichier Excel.
                    </td>
                  </tr>
                ) : displayRows.map((r, i) => {
                  const hasData = monthData.has(r.matricule);
                  return (
                    <tr key={r.matricule} className={`border-t border-slate-50 hover:bg-camugray-100/60 transition ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                      <td className="px-3 py-2.5 whitespace-nowrap cursor-pointer" onClick={() => hasData ? setDetailRow(r) : undefined}>
                        <span className={`font-semibold ${hasData ? "text-camublue-900 hover:underline cursor-pointer" : "text-gray-500"}`}>
                          {r.matricule}
                        </span>
                      </td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${hasData ? "cursor-pointer hover:text-camublue-900" : "text-gray-300"}`}
                        onClick={() => hasData ? openQuickEdit(r, "montant_total") : undefined}>
                        {fmt(r.montant_total)}
                      </td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${hasData ? "text-gray-500 cursor-pointer hover:text-camublue-900" : "text-gray-300"}`}
                        onClick={() => hasData ? openQuickEdit(r, "mt_ht") : undefined}>
                        {fmt(r.mt_ht, 2)}
                      </td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${hasData ? "cursor-pointer hover:text-camublue-900" : "text-gray-300"}`}
                        onClick={() => hasData ? openQuickEdit(r, "distance_totale") : undefined}>
                        {fmt(r.distance_totale)}
                      </td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${hasData ? "text-gray-500 cursor-pointer hover:text-camublue-900" : "text-gray-300"}`}
                        onClick={() => hasData ? openQuickEdit(r, "distance_gps") : undefined}>
                        {fmt(r.distance_gps)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-gray-500">
              <span>Page {page} / {totalPages} — {filteredMatricules.length} véhicules</span>
              <div className="flex gap-2 items-center">
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 bg-white">
                  {[10,15,25,50,100].map(s => <option key={s} value={s}>{s} / page</option>)}
                </select>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition">← Préc.</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition">Suiv. →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fermer dropdown mois en cliquant ailleurs */}
      {moisOpen && <div className="fixed inset-0 z-20" onClick={() => setMoisOpen(false)} />}

      {/* ══ Modal Détail ligne ════════════════════════════════════════════════ */}
      {detailRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetailRow(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Fuel size={18} className="text-white" /></div>
                <div>
                  <p className="text-white font-bold text-sm">{detailRow.matricule}</p>
                  <p className="text-white/60 text-xs">{detailRow.car_group ?? "—"} · {MOIS_NOMS[(detailRow.mois ?? 1) - 1]}</p>
                </div>
              </div>
              <button onClick={() => setDetailRow(null)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <X size={14} className="text-white" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-2">
              <p className="text-[11px] text-gray-400 uppercase font-semibold tracking-wide mb-3">Cliquez sur un champ pour le modifier</p>
              {(Object.entries(FIELD_META) as [EditableField, typeof FIELD_META[EditableField]][]).map(([field, meta]) => {
                const rawVal = detailRow[field];
                const display = field === "dernier_plein" ? fmtDate(rawVal as string) : rawVal == null ? "—" : String(rawVal);
                return (
                  <div key={field} onClick={() => openQuickEdit(detailRow, field)}
                    className="flex items-center justify-between rounded-xl px-4 py-3 bg-gray-50 hover:bg-camublue-900/5 cursor-pointer group transition border border-transparent hover:border-camublue-900/20">
                    <span className="text-xs font-semibold text-gray-500">{meta.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-800">{display}</span>
                      <Pencil size={12} className="text-gray-300 group-hover:text-camublue-900 transition shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end shrink-0">
              <button onClick={() => setDetailRow(null)}
                className="px-5 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal Quick Edit ══════════════════════════════════════════════════ */}
      {quickEdit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setQuickEdit(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-5 py-3.5 flex items-center justify-between">
              <p className="text-white font-bold text-sm">{FIELD_META[quickEdit.field].label}</p>
              <button onClick={() => setQuickEdit(null)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <X size={14} className="text-white" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">{quickEdit.row.matricule} · {MOIS_NOMS[(quickEdit.row.mois ?? 1) - 1]}</p>
              {FIELD_META[quickEdit.field].type === "select" ? (
                <select className="input-base w-full" value={quickEdit.value}
                  onChange={e => setQuickEdit(q => q ? { ...q, value: e.target.value } : q)} autoFocus>
                  <option value="">— Sélectionner —</option>
                  <option value="GAZOIL">GAZOIL</option>
                  <option value="ESSENCE">ESSENCE</option>
                </select>
              ) : (
                <input type={FIELD_META[quickEdit.field].type} className="input-base w-full"
                  value={quickEdit.value}
                  onChange={e => setQuickEdit(q => q ? { ...q, value: e.target.value } : q)}
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") handleQuickSave(); if (e.key === "Escape") setQuickEdit(null); }} />
              )}
              <div className="flex gap-2">
                <button onClick={() => setQuickEdit(null)}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">Annuler</button>
                <button onClick={handleQuickSave} disabled={quickSaving}
                  className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-60">
                  {quickSaving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal Filtres ══════════════════════════════════════════════════════ */}
      {filterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setFilterModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Filter size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">Filtres</p>
              </div>
              <button onClick={() => setFilterModal(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <X size={14} className="text-white" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type de carburant</label>
                <select value={draftType} onChange={e => setDraftType(e.target.value)} className="input-base">
                  <option value="">Tous les types</option>
                  {(filtres?.types_carburant ?? []).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Pôle / CarGroup</label>
                <select value={draftGroup} onChange={e => setDraftGroup(e.target.value)} className="input-base">
                  <option value="">Tous les pôles</option>
                  {(filtres?.car_groups ?? []).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={resetFilters}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">Réinitialiser</button>
                <button onClick={applyFilters}
                  className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">Appliquer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal Graphiques ══════════════════════════════════════════════════ */}
      {showCharts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCharts(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-5 py-3 flex items-center gap-3 flex-wrap sticky top-0 z-10">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <BarChart2 size={16} className="text-white" />
              </div>
              <p className="text-white font-bold text-sm shrink-0">
                Graphiques — {MOIS_NOMS[selectedMois - 1]}
              </p>
              <div className="flex-1 flex justify-center">
                <ChartFilterBar filter={chartFilter} onChange={setChartFilter} />
              </div>
              <button onClick={() => setShowCharts(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition shrink-0 ml-auto">
                <X size={14} className="text-white" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {loadingCharts ? (
                <p className="text-sm text-gray-400 text-center py-16">Chargement des données…</p>
              ) : filteredChartRows.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-16">Aucune donnée pour cette période.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Top 10 consommateurs (litres)</p>
                    <div style={{ height: hBarHeight(consomData) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={consomData} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} />
                          <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 10 }} tickFormatter={truncTick} />
                          <RTooltip formatter={(v: any) => [`${fmt(v, 1)} L`, "Litres"]} />
                          <Bar dataKey="value" name="Litres" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Top 10 coûts carburant (FCFA)</p>
                    <div style={{ height: hBarHeight(coutData) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={coutData} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} />
                          <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 10 }} tickFormatter={truncTick} />
                          <RTooltip formatter={(v: any) => [`${fmt(v)} FCFA`, "Montant"]} />
                          <Bar dataKey="value" name="Montant" fill={COLORS[1]} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Répartition par type — Litres</p>
                    <div style={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={repartData} margin={{ left: 8, right: 20, top: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <RTooltip formatter={(v: any) => [`${fmt(v, 1)} L`, "Litres"]} />
                          <Bar dataKey="litres" name="Litres" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Répartition par type — Montant (FCFA)</p>
                    <div style={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={repartData} margin={{ left: 8, right: 20, top: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <RTooltip formatter={(v: any) => [`${fmt(v)} FCFA`, "Montant"]} />
                          <Bar dataKey="montant" name="Montant" fill={COLORS[3]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end sticky bottom-0 bg-white">
              <button onClick={() => setShowCharts(false)}
                className="px-5 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
