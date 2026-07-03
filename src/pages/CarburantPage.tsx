import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Upload, Fuel, TrendingUp, DollarSign, Route,
  X, Search, BarChart2, Filter, Pencil,
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

// ── Calcul graphes à partir des lignes brutes ────────────────────────────────

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

  const consomData = [...consomMap.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([label, value]) => ({ label, value }));

  const coutData = [...coutMap.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([label, value]) => ({ label, value }));

  const repartData = [
    { label: "Gazoil",  litres: litresGazoil,  montant: montantGazoil  },
    { label: "Essence", litres: litresEssence, montant: montantEssence },
  ];

  return { consomData, coutData, repartData };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CarburantPage() {
  const [rows, setRows]       = useState<CarburantRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [stats, setStats]     = useState<Stats | null>(null);
  const [filtres, setFiltres] = useState<Filtres | null>(null);

  const [search, setSearch]     = useState("");
  const [carGroup, setCarGroup] = useState("");
  const [typeCarb, setTypeCarb] = useState("");
  const [page, setPage]         = useState(1);
  const PAGE_SIZE = 50;

  // Modaux
  const [showCharts,  setShowCharts]  = useState(false);
  const [filterModal, setFilterModal] = useState(false);
  const [detailRow,   setDetailRow]   = useState<CarburantRow | null>(null);
  const [quickEdit,   setQuickEdit]   = useState<{
    row: CarburantRow; field: EditableField; value: string;
  } | null>(null);
  const [quickSaving, setQuickSaving] = useState(false);

  // Draft filtres
  const [draftGroup, setDraftGroup] = useState("");
  const [draftType,  setDraftType]  = useState("");

  // Graphes
  const [chartFilter,    setChartFilter]    = useState<ChartFilter>(CHART_FILTER_EMPTY);
  const [allChartRows,   setAllChartRows]   = useState<CarburantRow[]>([]);
  const [loadingCharts,  setLoadingCharts]  = useState(false);

  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasFilters = !!(carGroup || typeCarb);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    const params: Record<string, string> = {};
    if (carGroup) params.car_group = carGroup;
    if (typeCarb) params.type_carburant = typeCarb;
    const { data } = await axios.get("/api/carburant/stats", { params });
    setStats(data);
  }, [carGroup, typeCarb]);

  const fetchRows = useCallback(async (p = page) => {
    const params: Record<string, string | number> = { page: p, page_size: PAGE_SIZE };
    if (search)   params.search    = search;
    if (carGroup) params.car_group = carGroup;
    if (typeCarb) params.type_carburant = typeCarb;
    const { data } = await axios.get("/api/carburant", { params });
    setRows(data.items);
    setTotal(data.total);
  }, [page, search, carGroup, typeCarb]);

  const fetchFiltres = async () => {
    const { data } = await axios.get("/api/carburant/filtres");
    setFiltres(data);
  };

  useEffect(() => { fetchFiltres(); }, []);

  useEffect(() => {
    setPage(1); fetchRows(1); fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, carGroup, typeCarb]);

  useEffect(() => { fetchRows(page); /* eslint-disable-next-line */ }, [page]);

  // ── Ouverture modal graphes ───────────────────────────────────────────────

  const openCharts = () => {
    setShowCharts(true);
    setLoadingCharts(true);
    axios.get("/api/carburant", { params: { page: 1, page_size: 9999 } })
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
      const { data } = await axios.post("/api/carburant/import", fd);
      toast.success(`Import terminé : ${data.created} créés, ${data.updated} mis à jour`);
      if (data.errors?.length) {
        toast.error(`${data.errors.length} erreur(s) — voir console`, { duration: 6000 });
        console.warn("Erreurs import carburant:", data.errors);
      }
      await Promise.all([fetchRows(1), fetchStats(), fetchFiltres()]);
      setPage(1);
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
    const value = raw == null ? "" : field === "dernier_plein"
      ? String(raw).slice(0, 10) : String(raw);
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
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, ...data } : r));
      setQuickEdit(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    } finally {
      setQuickSaving(false);
    }
  };

  // ── Filtres modal ─────────────────────────────────────────────────────────

  const openFilterModal = () => { setDraftGroup(carGroup); setDraftType(typeCarb); setFilterModal(true); };
  const applyFilters    = () => { setCarGroup(draftGroup); setTypeCarb(draftType); setFilterModal(false); };
  const resetFilters    = () => { setDraftGroup(""); setDraftType(""); setCarGroup(""); setTypeCarb(""); setFilterModal(false); };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-8 sticky top-0 z-20 bg-camugray-100 -mx-4 px-4 md:-mx-8 md:px-8 pt-1 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-camublue-900">Suivi Carburant</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Consommation & coûts carburant — {total} véhicule{total !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
              {importing ? "Import en cours…" : "Importer Excel"}
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

        {/* Barre de recherche centrée */}
        <div className="flex justify-center mb-6">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par matricule, chauffeur, pôle…"
              className="input-base pl-9 w-full"
            />
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-camublue-900 text-white text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Matricule</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Type</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Quantité (L)</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Montant (FCFA)</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Mt HT</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Prix Unitaire</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Distance (km)</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Distance GPS</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Pôle / CarGroup</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Dernier plein</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Chauffeur</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Code Projet</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">N° Carte</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-16 text-center text-gray-400">
                      {total === 0 ? "Aucune donnée. Importez d'abord un fichier Excel." : "Aucun résultat pour ces filtres."}
                    </td>
                  </tr>
                ) : rows.map((r, i) => (
                  <tr key={r.id} className={`border-t border-slate-50 hover:bg-camugray-100/60 transition ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                    <td className="px-3 py-2.5 whitespace-nowrap cursor-pointer" onClick={() => setDetailRow(r)}>
                      <span className="font-semibold text-camublue-900 hover:underline">{r.matricule}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap cursor-pointer" onClick={() => openQuickEdit(r, "type_carburant")}>
                      <TypeBadge type={r.type_carburant} />
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums cursor-pointer hover:text-camublue-900" onClick={() => openQuickEdit(r, "quantite_totale")}>{fmt(r.quantite_totale, 2)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums cursor-pointer hover:text-camublue-900" onClick={() => openQuickEdit(r, "montant_total")}>{fmt(r.montant_total)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-500 cursor-pointer hover:text-camublue-900" onClick={() => openQuickEdit(r, "mt_ht")}>{fmt(r.mt_ht, 2)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-500 cursor-pointer hover:text-camublue-900" onClick={() => openQuickEdit(r, "prix_unitaire")}>{fmt(r.prix_unitaire)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums cursor-pointer hover:text-camublue-900" onClick={() => openQuickEdit(r, "distance_totale")}>{fmt(r.distance_totale)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-500 cursor-pointer hover:text-camublue-900" onClick={() => openQuickEdit(r, "distance_gps")}>{fmt(r.distance_gps)}</td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[200px] truncate cursor-pointer hover:text-camublue-900" onClick={() => openQuickEdit(r, "car_group")}>{r.car_group ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600 cursor-pointer hover:text-camublue-900" onClick={() => openQuickEdit(r, "dernier_plein")}>{fmtDate(r.dernier_plein)}</td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap cursor-pointer hover:text-camublue-900" onClick={() => openQuickEdit(r, "driver_name")}>{r.driver_name || r.nom_chauffeur || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs cursor-pointer hover:text-camublue-900" onClick={() => openQuickEdit(r, "code_projet")}>{r.code_projet ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs cursor-pointer hover:text-camublue-900" onClick={() => openQuickEdit(r, "num_carte")}>{r.num_carte ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-gray-500">
              <span>Page {page} / {totalPages} — {total} véhicules</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition">← Préc.</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition">Suiv. →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ Modal Détail ligne ════════════════════════════════════════════════ */}
      {detailRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetailRow(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Fuel size={18} className="text-white" /></div>
                <div>
                  <p className="text-white font-bold text-sm">{detailRow.matricule}</p>
                  <p className="text-white/60 text-xs">{detailRow.car_group ?? "—"}</p>
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
              <p className="text-xs text-gray-500">{quickEdit.row.matricule}</p>
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
            {/* Header modal avec ChartFilterBar */}
            <div className="bg-camublue-900 px-5 py-3 flex items-center gap-3 flex-wrap sticky top-0 z-10">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <BarChart2 size={16} className="text-white" />
              </div>
              <p className="text-white font-bold text-sm shrink-0">Graphiques — Suivi Carburant</p>
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
