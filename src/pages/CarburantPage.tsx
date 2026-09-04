import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import {
  Upload, Fuel, TrendingUp, DollarSign, Route,
  X, Search, BarChart2, Filter, Pencil, Calendar, Plus,
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
  annee: number;
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
  conso_100: number | null;
  vehicle_type: string | null;
  dist_recommandee: number | null;
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

const THIS_YEAR = new Date().getFullYear();

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CarburantPage() {
  const [selectedMois,  setSelectedMois]  = useState<number>(new Date().getMonth() + 1);
  const [selectedAnnee, setSelectedAnnee] = useState<number>(THIS_YEAR);

  const [rows,    setRows]    = useState<CarburantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [filtres, setFiltres] = useState<Filtres | null>(null);

  // Cache en mémoire : clé = "annee-mois[-carGroup-typeCarb]"
  const cache = useRef<Map<string, CarburantRow[]>>(new Map());

  const [searchRaw, setSearchRaw] = useState("");
  const [search,    setSearch]    = useState("");
  const [carGroup,  setCarGroup]  = useState("");
  const [typeCarb,  setTypeCarb]  = useState("");
  const [page,      setPage]      = useState(1);
  const [pageSize,  setPageSize]  = useState(15);

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
  const [importModal, setImportModal] = useState(false);
  const [importMois,  setImportMois]  = useState<number>(new Date().getMonth() + 1);
  const [addModal,  setAddModal]  = useState(false);
  const [addForm,   setAddForm]   = useState({ matricule: "", mois: new Date().getMonth() + 1, type_carburant: "", quantite_totale: "", montant_total: "", distance_totale: "", car_group: "" });
  const [addSaving, setAddSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasFilters = !!(carGroup || typeCarb);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const computeStats = useCallback((data: CarburantRow[]) => {
    const gazoil  = data.filter(r => (r.type_carburant || "").toUpperCase() === "GAZOIL");
    const essence = data.filter(r => (r.type_carburant || "").toUpperCase() === "ESSENCE");
    const sum = (arr: CarburantRow[], k: keyof CarburantRow) =>
      arr.reduce((acc, r) => acc + ((r[k] as number) || 0), 0);
    const top = (arr: CarburantRow[], key: keyof CarburantRow) =>
      [...arr].sort((a, b) => ((b[key] as number) || 0) - ((a[key] as number) || 0)).slice(0, 10);
    setStats({
      total_vehicules: data.length,
      total_litres:    Math.round(sum(data, "quantite_totale") * 100) / 100,
      total_montant:   Math.round(sum(data, "montant_total")   * 100) / 100,
      total_distance:  Math.round(sum(data, "distance_totale") * 100) / 100,
      nb_gazoil:       gazoil.length,
      nb_essence:      essence.length,
      litres_gazoil:   Math.round(sum(gazoil,  "quantite_totale") * 100) / 100,
      litres_essence:  Math.round(sum(essence, "quantite_totale") * 100) / 100,
      montant_gazoil:  Math.round(sum(gazoil,  "montant_total")   * 100) / 100,
      montant_essence: Math.round(sum(essence, "montant_total")   * 100) / 100,
      top_consommateurs: top(data, "quantite_totale").map(r => ({
        matricule: r.matricule, type_carburant: r.type_carburant ?? "",
        quantite_totale: r.quantite_totale ?? 0, car_group: r.car_group ?? "",
      })),
      top_couts: top(data, "montant_total").map(r => ({
        matricule: r.matricule, type_carburant: r.type_carburant ?? "",
        montant_total: r.montant_total ?? 0, car_group: r.car_group ?? "",
      })),
    });
  }, []);

  const fetchMonthData = useCallback(async (overrideMois?: number, overrideAnnee?: number) => {
    const m = overrideMois ?? selectedMois;
    const a = overrideAnnee ?? selectedAnnee;
    const cacheKey = `${a}-${m}|${carGroup}|${typeCarb}`;

    // 1. Afficher immédiatement les données en cache (stale-while-revalidate)
    const cached = cache.current.get(cacheKey);
    if (cached) {
      setRows(cached);
      computeStats(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // 2. Revalider depuis le serveur en arrière-plan
    try {
      const params: Record<string, string | number> = { mois: m, annee: a, page: 1, page_size: 9999 };
      if (carGroup) params.car_group = carGroup;
      if (typeCarb) params.type_carburant = typeCarb;
      const { data } = await axios.get("/api/carburant", { params });
      const fetched: CarburantRow[] = data.items;
      cache.current.set(cacheKey, fetched);
      setRows(fetched);
      computeStats(fetched);
    } finally {
      setLoading(false);
    }
  }, [selectedMois, selectedAnnee, carGroup, typeCarb, computeStats]);

  const fetchFiltres = useCallback(async () => {
    const { data } = await axios.get("/api/carburant/filtres");
    setFiltres(data);
  }, []);

  // Au montage : périodes + filtres en parallèle, puis sélectionner le dernier mois en DB
  useEffect(() => {
    Promise.all([
      axios.get("/api/carburant/periodes"),
      fetchFiltres(),
    ]).then(([{ data: periodes }]) => {
      if (periodes.length > 0) {
        setSelectedMois(periodes[0].mois);
        setSelectedAnnee(periodes[0].annee);
      }
    }).catch(() => {});
  }, []); // eslint-disable-line

  useEffect(() => {
    setPage(1);
    fetchMonthData();
  }, [selectedMois, selectedAnnee, carGroup, typeCarb]); // eslint-disable-line

  // Debounce de la recherche : mise à jour 200ms après la dernière frappe
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchRaw), 200);
    return () => clearTimeout(t);
  }, [searchRaw]);

  const refreshAll = async (overrideMois?: number, overrideAnnee?: number) => {
    const m = overrideMois ?? selectedMois;
    const a = overrideAnnee ?? selectedAnnee;
    // Invalider le cache pour cette période avant de recharger
    const cacheKey = `${a}-${m}|${carGroup}|${typeCarb}`;
    cache.current.delete(cacheKey);
    await Promise.all([fetchMonthData(overrideMois, overrideAnnee), fetchFiltres()]);
  };

  // ── Filtrage local (memoïsé) + pagination ────────────────────────────────
  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.matricule.toLowerCase().includes(q) ||
      (r.driver_name    ?? "").toLowerCase().includes(q) ||
      (r.nom_chauffeur  ?? "").toLowerCase().includes(q) ||
      (r.car_group      ?? "").toLowerCase().includes(q) ||
      (r.code_projet    ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);
  const totalPages  = Math.ceil(filtered.length / pageSize);
  const displayRows = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  // ── Charts modal ─────────────────────────────────────────────────────────

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

  const openImportModal = () => {
    setImportMois(selectedMois);
    setImportModal(true);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportModal(false);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await axios.post(`/api/carburant/import?mois=${importMois}&annee=${selectedAnnee}`, fd);
      const moisImporte: number = data.mois_detecte ?? importMois;
      const anneeImportee: number = data.annee_detecte ?? selectedAnnee;
      toast.success(`Import ${MOIS_NOMS[moisImporte - 1]} ${anneeImportee} : ${data.created} créés, ${data.updated} mis à jour`);
      if (data.errors?.length) {
        toast.error(`${data.errors.length} erreur(s) — voir console`, { duration: 6000 });
        console.warn("Erreurs import carburant:", data.errors);
      }
      setSelectedMois(moisImporte);
      setSelectedAnnee(anneeImportee);
      setPage(1);
      // Passe les valeurs explicitement pour éviter la closure stale
      await refreshAll(moisImporte, anneeImportee);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur lors de l'import");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ── Ajout manuel ──────────────────────────────────────────────────────────

  const handleAddForm = async () => {
    if (!addForm.matricule.trim()) { toast.error("Matricule requis"); return; }
    setAddSaving(true);
    try {
      await axios.post("/api/carburant", {
        matricule:       addForm.matricule.trim().toUpperCase(),
        mois:            addForm.mois,
        annee:           THIS_YEAR,
        type_carburant:  addForm.type_carburant || null,
        quantite_totale: addForm.quantite_totale ? parseFloat(addForm.quantite_totale) : null,
        montant_total:   addForm.montant_total   ? parseFloat(addForm.montant_total)   : null,
        distance_totale: addForm.distance_totale ? parseFloat(addForm.distance_totale) : null,
        car_group:       addForm.car_group       || null,
      });
      toast.success("Entrée ajoutée");
      setAddModal(false);
      setSelectedMois(addForm.mois);
      await refreshAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    } finally {
      setAddSaving(false);
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
      if (row.id === -1) {
        await axios.post("/api/carburant", {
          matricule: row.matricule, mois: selectedMois, annee: selectedAnnee, [field]: parsed,
        });
        toast.success("Entrée créée");
        cache.current.delete(`${selectedAnnee}-${selectedMois}|${carGroup}|${typeCarb}`);
        await fetchMonthData();
      } else {
        const res = await axios.patch(`/api/carburant/${row.id}`, { [field]: parsed });
        const data: CarburantRow = res.data;
        toast.success("Mis à jour");
        // Mise à jour optimiste + sync cache
        setRows(prev => {
          const next = prev.map(r => r.id === data.id ? { ...r, ...data } as CarburantRow : r);
          cache.current.set(`${selectedAnnee}-${selectedMois}|${carGroup}|${typeCarb}`, next);
          return next;
        });
      }
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
              {MOIS_NOMS[selectedMois - 1]} {selectedAnnee} — {filtered.length} véhicule{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">

            {/* ── Sélecteur mois / année ────────────────────────────────── */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
              <Calendar size={15} className="text-camublue-900 shrink-0" />
              <select
                value={selectedMois}
                onChange={e => setSelectedMois(Number(e.target.value))}
                className="text-sm font-semibold text-camublue-900 bg-transparent outline-none cursor-pointer">
                {MOIS_NOMS.map((nom, i) => (
                  <option key={i + 1} value={i + 1}>{nom}</option>
                ))}
              </select>
              <select
                value={selectedAnnee}
                onChange={e => setSelectedAnnee(Number(e.target.value))}
                className="text-sm font-semibold text-camublue-900 bg-transparent outline-none cursor-pointer ml-1 border-l border-gray-200 pl-2">
                {[THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Filtre rapide ESSENCE / GAZOIL */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200 text-xs font-semibold">
              <button onClick={() => setTypeCarb(typeCarb === "GAZOIL" ? "" : "GAZOIL")}
                className={`px-3 py-2 transition ${typeCarb === "GAZOIL" ? "bg-blue-700 text-white" : "bg-white text-blue-700 hover:bg-blue-50"}`}>
                Gazoil
              </button>
              <button onClick={() => setTypeCarb(typeCarb === "ESSENCE" ? "" : "ESSENCE")}
                className={`px-3 py-2 border-l border-gray-200 transition ${typeCarb === "ESSENCE" ? "bg-orange-500 text-white" : "bg-white text-orange-600 hover:bg-orange-50"}`}>
                Essence
              </button>
            </div>

            <button onClick={openCharts}
              className="flex items-center gap-2 px-4 py-2 border border-camublue-900 text-camublue-900 hover:bg-camublue-900/5 rounded-xl text-sm font-semibold transition">
              <BarChart2 size={15} /><span>Graphiques</span>
            </button>
            <button onClick={openFilterModal}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-camublue-900/40 text-camublue-900 rounded-xl text-sm font-semibold transition shadow-sm relative">
              <Filter size={15} /><span>Filtres</span>
              {hasFilters && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {(carGroup ? 1 : 0) + (typeCarb ? 1 : 0)}
                </span>
              )}
            </button>
            <button onClick={openImportModal} disabled={importing}
              className="flex items-center gap-2 px-4 py-2 border border-camublue-900 text-camublue-900 hover:bg-camublue-900/5 rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-60">
              <Upload size={15} />
              {importing ? "Import…" : "Importer"}
            </button>
            <button onClick={() => setAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm">
              <Plus size={15} /><span>Ajouter</span>
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
            <input type="text" value={searchRaw} onChange={e => { setSearchRaw(e.target.value); setPage(1); }}
              placeholder="Rechercher par matricule, chauffeur, pôle…"
              className="input-base pl-9 w-full" />
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[62vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-camublue-900 text-white text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Matricule</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Conducteur(s)</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">BL</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Litres consommés</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Montant TTC</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Montant HT</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Dist. déclarée</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Dist. GPS</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Conso/100</th>
                  <th className="px-3 py-3 text-center font-semibold whitespace-nowrap">Fuel type</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Vehicle Type</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Car Group</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Label</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className={`border-t border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                      {Array.from({ length: 13 }).map((__, j) => (
                        <td key={j} className="px-3 py-3">
                          <div className="h-3 rounded bg-slate-200 animate-pulse" style={{ width: j === 0 ? "80px" : j === 1 ? "120px" : "60px" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-16 text-center text-gray-400">
                      Aucune donnée pour {MOIS_NOMS[selectedMois - 1]} {selectedAnnee}. Importez un fichier Excel.
                    </td>
                  </tr>
                ) : displayRows.map((r, i) => (
                  <tr key={r.id ?? r.matricule} className={`border-t border-slate-50 hover:bg-camugray-100/60 transition ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                    <td className="px-3 py-2.5 whitespace-nowrap cursor-pointer" onClick={() => setDetailRow(r)}>
                      <span className="font-semibold text-camublue-900 hover:underline">{r.matricule}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[160px] truncate"
                      title={r.driver_name ?? undefined}>
                      {r.driver_name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{r.code_projet ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums cursor-pointer hover:text-camublue-900"
                      onClick={() => openQuickEdit(r, "quantite_totale")}>
                      {fmt(r.quantite_totale, 2)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums cursor-pointer hover:text-camublue-900"
                      onClick={() => openQuickEdit(r, "montant_total")}>
                      {fmt(r.montant_total)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-500 cursor-pointer hover:text-camublue-900"
                      onClick={() => openQuickEdit(r, "mt_ht")}>
                      {fmt(r.mt_ht, 2)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums cursor-pointer hover:text-camublue-900"
                      onClick={() => openQuickEdit(r, "distance_totale")}>
                      {fmt(r.distance_totale)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-500 cursor-pointer hover:text-camublue-900"
                      onClick={() => openQuickEdit(r, "distance_gps")}>
                      {fmt(r.distance_gps)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-500 text-xs">
                      {r.conso_100 != null ? fmt(r.conso_100, 2) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <TypeBadge type={r.type_carburant} />
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{r.vehicle_type ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[180px] truncate"
                      title={r.car_group ?? undefined}>
                      {r.car_group ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[140px] truncate"
                      title={r.nom_chauffeur ?? undefined}>
                      {r.nom_chauffeur ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-gray-500">
              <span>Page {page} / {totalPages} — {filtered.length} véhicules</span>
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

      {/* ══ Modal Import — choix de la période ══════════════════════════════ */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setImportModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-5 py-3.5 flex items-center justify-between">
              <p className="text-white font-bold text-sm">Importer — Choisir la période</p>
              <button onClick={() => setImportModal(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <X size={14} className="text-white" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">Sélectionnez le mois concerné par ce fichier ({THIS_YEAR}).</p>
              <div className="grid grid-cols-3 gap-1.5">
                {MOIS_NOMS.map((nom, i) => {
                  const m = i + 1;
                  return (
                    <button key={m} onClick={() => setImportMois(m)}
                      className={`py-2 rounded-lg text-xs font-semibold transition ${importMois === m ? "bg-camublue-900 text-white" : "bg-gray-50 text-gray-600 hover:bg-camublue-900/10"}`}>
                      {nom}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => fileRef.current?.click()}
                className="w-full bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2">
                <Upload size={15} />
                Choisir le fichier — {MOIS_NOMS[importMois - 1]} {THIS_YEAR}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal Ajouter ════════════════════════════════════════════════════ */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-5 py-3.5 flex items-center justify-between">
              <p className="text-white font-bold text-sm">Ajouter une entrée carburant</p>
              <button onClick={() => setAddModal(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <X size={14} className="text-white" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Matricule *</label>
                  <input className="input-base w-full uppercase" placeholder="AA-0000-A"
                    value={addForm.matricule} onChange={e => setAddForm(f => ({ ...f, matricule: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Type carburant</label>
                  <select className="input-base w-full" value={addForm.type_carburant} onChange={e => setAddForm(f => ({ ...f, type_carburant: e.target.value }))}>
                    <option value="">— Sélectionner —</option>
                    <option value="GAZOIL">GAZOIL</option>
                    <option value="ESSENCE">ESSENCE</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mois ({THIS_YEAR})</label>
                <select className="input-base w-full" value={addForm.mois} onChange={e => setAddForm(f => ({ ...f, mois: Number(e.target.value) }))}>
                  {MOIS_NOMS.map((nom, i) => <option key={i+1} value={i+1}>{nom}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Quantité (L)</label>
                  <input type="number" className="input-base w-full" placeholder="0"
                    value={addForm.quantite_totale} onChange={e => setAddForm(f => ({ ...f, quantite_totale: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Montant (FCFA)</label>
                  <input type="number" className="input-base w-full" placeholder="0"
                    value={addForm.montant_total} onChange={e => setAddForm(f => ({ ...f, montant_total: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Distance (km)</label>
                  <input type="number" className="input-base w-full" placeholder="0"
                    value={addForm.distance_totale} onChange={e => setAddForm(f => ({ ...f, distance_totale: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Pôle / CarGroup</label>
                  <input className="input-base w-full"
                    value={addForm.car_group} onChange={e => setAddForm(f => ({ ...f, car_group: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setAddModal(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">Annuler</button>
                <button onClick={handleAddForm} disabled={addSaving}
                  className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-60">
                  {addSaving ? "Enregistrement…" : "Ajouter"}
                </button>
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
