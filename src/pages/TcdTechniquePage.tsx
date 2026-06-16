import { useEffect, useState } from "react";
import { X, Filter, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Search, ListOrdered, Sigma, TrendingUp, BarChart2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip } from "recharts";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/charts";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/contexts/AuthContext";
import { coutService } from "@/services/api";
import type { FiltresCouts, CoutsFilters, PivotResult, ImportCoutsResult } from "@/types";

const PAGE_SIZE = 10;

const TYPE_COUT_OPTIONS = ["TOTAL", "CARBURANT", "DISTANCE", "ASS", "ENT", "LOCAT", "PEA", "REP"];

const TYPE_COUT_LABELS: Record<string, string> = {
  ASS: "Assurance",
  CARBURANT: "Carburant",
  DISTANCE: "Distance",
  ENT: "Entretien",
  LOCAT: "Location",
  PEA: "Péage",
  REP: "Réparation",
  TOTAL: "Total",
};

const MOIS_NOMS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function formatMois(iso: string): string {
  const [annee, mois] = iso.split("-");
  return `${MOIS_NOMS[Number(mois) - 1]} ${annee}`;
}

const GROUP_BY_OPTIONS: { value: string; label: string }[] = [
  { value: "plaque", label: "Plaque d'immatriculation" },
  { value: "mois", label: "Mois" },
  { value: "type_vehicule", label: "Type véhicule" },
  { value: "fournisseur", label: "Fournisseur" },
  { value: "type_location", label: "Type de location" },
  { value: "type_cout", label: "Type_Cout" },
];

function formatLabel(groupBy: string, label: string): string {
  if (label === "—") return label;
  if (groupBy === "mois") return formatMois(label.slice(0, 7));
  if (groupBy === "type_cout") return TYPE_COUT_LABELS[label] ?? label;
  return label;
}

function fmtK(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

function toTop(items: { label: string; total: number }[], n = 10, labelFn?: (l: string) => string) {
  return [...items]
    .sort((a, b) => b.total - a.total)
    .slice(0, n)
    .map(it => ({ label: labelFn ? labelFn(it.label) : it.label, value: it.total }));
}

export default function TcdTechniquePage() {
  const { isViewer } = useAuth();
  const [groupBy, setGroupBy] = useState("plaque");
  const [typeCout, setTypeCout] = useState("TOTAL");
  const [data, setData] = useState<PivotResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [filtres, setFiltres] = useState<FiltresCouts | null>(null);
  const [filters, setFilters] = useState<CoutsFilters>({});
  const [filterModal, setFilterModal] = useState(false);
  const [draft, setDraft] = useState<CoutsFilters>({});
  const [draftGroupBy, setDraftGroupBy] = useState("plaque");
  const [draftTypeCout, setDraftTypeCout] = useState("TOTAL");

  const [showCharts, setShowCharts] = useState(false);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [chartPlaque, setChartPlaque] = useState<{ label: string; value: number }[]>([]);
  const [chartType, setChartType] = useState<{ label: string; value: number }[]>([]);
  const [chartFourn, setChartFourn] = useState<{ label: string; value: number }[]>([]);
  const [chartVeh, setChartVeh] = useState<{ label: string; value: number }[]>([]);

  const [importModal, setImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportCoutsResult | null>(null);

  useEffect(() => { coutService.filtres().then(setFiltres).catch(() => {}); }, []);

  const loadPivot = () => {
    setLoading(true);
    coutService.pivot({ ...filters, group_by: groupBy, ...(groupBy === "type_cout" ? {} : { type_cout: typeCout }) })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPivot(); }, [groupBy, typeCout, filters]);

  const openCharts = () => {
    setShowCharts(true);
    setLoadingCharts(true);
    Promise.all([
      coutService.pivot({ ...filters, group_by: "plaque", type_cout: "TOTAL" }),
      coutService.pivot({ ...filters, group_by: "type_cout" }),
      coutService.pivot({ ...filters, group_by: "fournisseur", type_cout: "TOTAL" }),
      coutService.pivot({ ...filters, group_by: "type_vehicule", type_cout: "TOTAL" }),
    ]).then(([pla, typ, fourn, veh]) => {
      setChartPlaque(toTop(pla.items, 10, l => l));
      setChartType(toTop(typ.items, 10, l => TYPE_COUT_LABELS[l] ?? l));
      setChartFourn(toTop(fourn.items, 10, l => l));
      setChartVeh(toTop(veh.items, 10, l => l));
    }).catch(() => {}).finally(() => setLoadingCharts(false));
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await coutService.importExcel(file);
      setResult(res);
      toast.success(`Import terminé : ${res.created} créés, ${res.updated} mis à jour`);
      loadPivot();
      coutService.filtres().then(setFiltres).catch(() => {});
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur lors de l'import");
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => { setPage(1); }, [groupBy, typeCout, filters]);

  const hasFilters = Object.keys(filters).length > 0;

  const [search, setSearch] = useState("");
  useEffect(() => { setPage(1); }, [search]);

  const filteredItems = (data?.items ?? []).filter(it => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return formatLabel(groupBy, it.label).toLowerCase().includes(q);
  });

  const pageItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filteredTotal = filteredItems.reduce((s, it) => s + it.total, 0);
  const maxValue = filteredItems.reduce((m, it) => Math.max(m, it.total), 0);

  const openFilterModal = () => { setDraft(filters); setDraftGroupBy(groupBy); setDraftTypeCout(typeCout); setFilterModal(true); };
  const setDraftFilter = (key: keyof CoutsFilters, value: string) => {
    setDraft(f => {
      const next = { ...f };
      if (value) (next as any)[key] = value; else delete (next as any)[key];
      return next;
    });
  };
  const applyFilters = () => { setFilters(draft); setGroupBy(draftGroupBy); setTypeCout(draftTypeCout); setFilterModal(false); };
  const resetFilters = () => { setDraft({}); setFilters({}); setDraftGroupBy("plaque"); setGroupBy("plaque"); setDraftTypeCout("TOTAL"); setTypeCout("TOTAL"); setFilterModal(false); };

  const truncTick = (v: string) => v.length > 14 ? v.slice(0, 13) + "…" : v;
  const hBarHeight = (d: any[]) => Math.max(200, d.length * 32);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-camublue-900">TCD Technique</h1>
          <p className="text-gray-500 text-sm mt-0.5">Tableau croisé dynamique des coûts de la flotte</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={openCharts}
            className="flex items-center gap-2 px-4 py-2 border border-camublue-900 text-camublue-900 hover:bg-camublue-900/5 rounded-xl text-sm font-semibold transition">
            <BarChart2 size={15} /><span>Voir graphiques</span>
          </button>

          <button onClick={openFilterModal}
            className="flex items-center gap-2 px-4 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm relative">
            <Filter size={15} /><span>Filtres</span>
            {hasFilters && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                {Object.keys(filters).length}
              </span>
            )}
          </button>

          {!isViewer && (
            <button onClick={() => { setImportModal(true); setResult(null); }}
              className="flex items-center gap-2 px-4 py-2 border border-camublue-900 text-camublue-900 hover:bg-camublue-900/5 rounded-xl text-sm font-semibold transition">
              <Upload size={15} /><span>Importer</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Lignes" value={filteredItems.length} icon={<ListOrdered size={20} />} bg="bg-camublue-900/10" text="text-camublue-900" />
        <KpiCard label="Total général" value={filteredTotal} icon={<Sigma size={20} />} bg="bg-emerald-100" text="text-emerald-600" />
        <KpiCard label="Valeur max" value={maxValue} icon={<TrendingUp size={20} />} bg="bg-amber-100" text="text-amber-600" />
        <KpiCard label="Moyenne" value={filteredItems.length ? Math.round(filteredTotal / filteredItems.length) : 0} icon={<Sigma size={20} />} bg="bg-violet-100" text="text-violet-600" />
      </div>

      <div className="flex justify-center mb-6">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="input-base pl-9 w-full"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 p-6 text-center">Chargement…</p>
        ) : !data || filteredItems.length === 0 ? (
          <p className="text-sm text-gray-400 p-6 text-center">Aucune donnée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-camublue-900 text-white text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">{GROUP_BY_OPTIONS.find(o => o.value === groupBy)?.label}</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Somme de Valeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pageItems.map((it, i) => (
                  <tr key={i} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 font-semibold text-gray-700 whitespace-nowrap">{formatLabel(groupBy, it.label)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{it.total.toLocaleString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold text-gray-700">
                  <td className="px-4 py-2.5">Total général (filtré)</td>
                  <td className="px-4 py-2.5 text-right">{filteredTotal.toLocaleString("fr-FR")}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {data && filteredItems.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={filteredItems.length} onPageChange={setPage} />
        )}
      </div>

      {/* ══ Modal Graphiques ═══════════════════════════════════════════════ */}
      {showCharts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCharts(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><BarChart2 size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">Graphiques — TCD Technique</p>
              </div>
              <button onClick={() => setShowCharts(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {loadingCharts ? (
                <p className="text-sm text-gray-400 text-center py-16">Chargement des données…</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Par plaque */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Coûts totaux par plaque (top 10)</p>
                    <div style={{ height: hBarHeight(chartPlaque) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartPlaque} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                          <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10 }} tickFormatter={truncTick} />
                          <RTooltip formatter={(v: any) => [v.toLocaleString("fr-FR"), "Coût"]} />
                          <Bar dataKey="value" name="Coût" fill="#1e3a5f" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Par type de coût */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Répartition par type de coût</p>
                    <div style={{ height: hBarHeight(chartType) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartType} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                          <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10 }} tickFormatter={truncTick} />
                          <RTooltip formatter={(v: any) => [v.toLocaleString("fr-FR"), "Coût"]} />
                          <Bar dataKey="value" name="Coût" fill="#2a5298" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Par fournisseur */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Coûts totaux par fournisseur (top 10)</p>
                    <div style={{ height: hBarHeight(chartFourn) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartFourn} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                          <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10 }} tickFormatter={truncTick} />
                          <RTooltip formatter={(v: any) => [v.toLocaleString("fr-FR"), "Coût"]} />
                          <Bar dataKey="value" name="Coût" fill="#3b6fc4" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Par type de véhicule */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Coûts totaux par type véhicule</p>
                    <div style={{ height: hBarHeight(chartVeh) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartVeh} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                          <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10 }} tickFormatter={truncTick} />
                          <RTooltip formatter={(v: any) => [v.toLocaleString("fr-FR"), "Coût"]} />
                          <Bar dataKey="value" name="Coût" fill="#5b8de0" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end sticky bottom-0 bg-white">
              <button onClick={() => setShowCharts(false)}
                className="px-5 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal Filtres ══════════════════════════════════════════════════ */}
      {filterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setFilterModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Filter size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">Filtres</p>
              </div>
              <button onClick={() => setFilterModal(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Regrouper par</label>
                <select value={draftGroupBy} onChange={e => setDraftGroupBy(e.target.value)} className="input-base">
                  {GROUP_BY_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {draftGroupBy !== "type_cout" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type de coût</label>
                  <select value={draftTypeCout} onChange={e => setDraftTypeCout(e.target.value)} className="input-base">
                    {TYPE_COUT_OPTIONS.map(t => (
                      <option key={t} value={t}>{TYPE_COUT_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mois</label>
                <select value={draft.mois ?? ""} onChange={e => setDraftFilter("mois", e.target.value)} className="input-base">
                  <option value="">Tous les mois</option>
                  {(filtres?.mois ?? []).map(m => (
                    <option key={m} value={m}>{formatMois(m.slice(0, 7))}</option>
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

      {/* ══ Modal Import ════════════════════════════════════════════ */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !importing && setImportModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><FileSpreadsheet size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">Importer DATA_FLOTTES (Excel)</p>
              </div>
              <button onClick={() => !importing && setImportModal(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Sélectionnez le fichier Excel contenant la feuille <strong>DATA_FLOTTES</strong> (colonnes : Type de location, Fournisseur, Type Véhicule, Plaque d'immatriculation, Mois, Type_Cout, Valeur).
                Les lignes existantes (même plaque, mois et type de coût) sont mises à jour.
              </p>

              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-8 cursor-pointer hover:border-camublue-900/40 transition">
                <Upload size={24} className="text-camublue-900" />
                <span className="text-sm font-semibold text-gray-700">{importing ? "Import en cours…" : "Choisir un fichier .xlsx"}</span>
                <input type="file" accept=".xlsx,.xls" className="hidden" disabled={importing} onChange={handleFile} />
              </label>

              {result && (
                <div className="rounded-xl border border-gray-100 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                    <CheckCircle2 size={16} /> {result.created} créés · {result.updated} mis à jour
                  </div>
                  {result.errors.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-amber-600 text-sm font-semibold">
                        <AlertTriangle size={16} /> {result.errors.length} ligne(s) ignorée(s)
                      </div>
                      <ul className="text-xs text-gray-500 max-h-32 overflow-y-auto list-disc pl-5">
                        {result.errors.slice(0, 20).map((e, i) => (
                          <li key={i}>Ligne {e.ligne} : {e.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setImportModal(false)} disabled={importing}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
