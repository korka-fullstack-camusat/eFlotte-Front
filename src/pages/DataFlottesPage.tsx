import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Download, Database, Filter, Settings, Search, ListOrdered, Truck, Building2, BarChart2 } from "lucide-react";
import ExportModal, { ExportColDef } from "@/components/ExportModal";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip } from "recharts";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/charts";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/contexts/AuthContext";
import { coutService } from "@/services/api";
import type { CoutFlotte, FiltresCouts, CoutsFilters } from "@/types";

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

const EMPTY = {
  type_location: "", fournisseur: "", type_vehicule: "", plaque_immatriculation: "",
  mois: "", type_cout: "TOTAL", valeur: 0,
};

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

export default function DataFlottesPage() {
  const { isViewer } = useAuth();
  const [items, setItems] = useState<CoutFlotte[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filtres, setFiltres] = useState<FiltresCouts | null>(null);
  const [filters, setFilters] = useState<CoutsFilters & { type_cout?: string }>({});
  const [filterModal, setFilterModal] = useState(false);
  const [draft, setDraft] = useState<CoutsFilters & { type_cout?: string }>({});

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<CoutFlotte | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [manageRow, setManageRow] = useState<CoutFlotte | null>(null);

  const [search, setSearch] = useState("");
  const [showExport, setShowExport] = useState(false);

  const [showCharts, setShowCharts] = useState(false);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [chartType, setChartType] = useState<{ label: string; value: number }[]>([]);
  const [chartVeh, setChartVeh] = useState<{ label: string; value: number }[]>([]);
  const [chartFourn, setChartFourn] = useState<{ label: string; value: number }[]>([]);
  const [chartPlaque, setChartPlaque] = useState<{ label: string; value: number }[]>([]);

  const load = () => {
    setLoading(true);
    coutService.getAll({ ...filters, page, page_size: PAGE_SIZE })
      .then(res => { setItems(res.items); setTotal(res.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, filters]);
  useEffect(() => { coutService.filtres().then(setFiltres).catch(() => {}); }, []);
  useEffect(() => { setPage(1); }, [filters]);

  const openCharts = () => {
    setShowCharts(true);
    setLoadingCharts(true);
    Promise.all([
      coutService.pivot({ ...filters, group_by: "type_cout" }),
      coutService.pivot({ ...filters, group_by: "type_vehicule", type_cout: "TOTAL" }),
      coutService.pivot({ ...filters, group_by: "fournisseur", type_cout: "TOTAL" }),
      coutService.pivot({ ...filters, group_by: "plaque", type_cout: "TOTAL" }),
    ]).then(([typ, veh, fourn, pla]) => {
      setChartType(toTop(typ.items, 10, l => TYPE_COUT_LABELS[l] ?? l));
      setChartVeh(toTop(veh.items, 10));
      setChartFourn(toTop(fourn.items, 10));
      setChartPlaque(toTop(pla.items, 10));
    }).catch(() => {}).finally(() => setLoadingCharts(false));
  };

  const hasFilters = Object.keys(filters).length > 0;

  const openFilterModal = () => { setDraft(filters); setFilterModal(true); };
  const setDraftFilter = (key: keyof (CoutsFilters & { type_cout?: string }), value: string) => {
    setDraft(f => {
      const next = { ...f };
      if (value) (next as any)[key] = value; else delete (next as any)[key];
      return next;
    });
  };
  const applyFilters = () => { setFilters(draft); setFilterModal(false); };
  const resetFilters = () => { setDraft({}); setFilters({}); setFilterModal(false); };

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (c: CoutFlotte) => {
    setEditing(c);
    setForm({
      type_location: c.type_location ?? "",
      fournisseur: c.fournisseur ?? "",
      type_vehicule: c.type_vehicule ?? "",
      plaque_immatriculation: c.plaque_immatriculation,
      mois: c.mois.slice(0, 7),
      type_cout: c.type_cout,
      valeur: c.valeur,
    });
    setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        type_location: form.type_location || null,
        fournisseur: form.fournisseur || null,
        type_vehicule: form.type_vehicule || null,
        plaque_immatriculation: form.plaque_immatriculation,
        mois: `${form.mois}-01`,
        type_cout: form.type_cout,
        valeur: Number(form.valeur),
      };
      if (editing) {
        await coutService.update(editing.id, payload);
        toast.success("Ligne mise à jour");
      } else {
        await coutService.create(payload);
        toast.success("Ligne ajoutée");
      }
      setModal(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  const handleDelete = async (c: CoutFlotte) => {
    if (!confirm(`Supprimer cette ligne (${c.plaque_immatriculation} — ${formatMois(c.mois.slice(0, 7))} — ${c.type_cout}) ?`)) return;
    try {
      await coutService.remove(c.id);
      toast.success("Ligne supprimée");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  const exportCols: ExportColDef<CoutFlotte>[] = [
    { key: "type_location",       header: "Type de location",       value: r => r.type_location ?? "" },
    { key: "fournisseur",         header: "Fournisseur",             value: r => r.fournisseur ?? "" },
    { key: "type_vehicule",       header: "Type véhicule",           value: r => r.type_vehicule ?? "" },
    { key: "plaque",              header: "Plaque d'immatriculation", value: r => r.plaque_immatriculation },
    { key: "mois",                header: "Mois",                    value: r => r.mois.slice(0, 7) },
    { key: "type_cout",           header: "Type_Cout",               value: r => r.type_cout },
    { key: "valeur",              header: "Valeur",                  value: r => r.valeur },
  ];

  const filteredItems = items.filter(c => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [c.plaque_immatriculation, c.fournisseur, c.type_vehicule, c.type_location, c.type_cout]
      .some(v => (v ?? "").toLowerCase().includes(q));
  });

  const truncTick = (v: string) => v.length > 14 ? v.slice(0, 13) + "…" : v;
  const hBarHeight = (d: any[]) => Math.max(200, d.length * 32);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-camublue-900">Gestion des données flottes</h1>
          <p className="text-gray-500 text-sm mt-0.5">Données brutes des coûts de la flotte (format long)</p>
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
                {Object.keys(filters).length}
              </span>
            )}
          </button>
          <button onClick={() => setShowExport(true)}
            className="flex items-center gap-2 px-4 py-2 border border-camublue-900 text-camublue-900 hover:bg-camublue-900/5 rounded-xl text-sm font-semibold transition">
            <Download size={15} /><span>Exporter</span>
          </button>
          {!isViewer && (
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm">
              <Plus size={15} /><span>Ajouter</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Lignes (total)" value={total} icon={<ListOrdered size={20} />} bg="bg-camublue-900/10" text="text-camublue-900" />
        <KpiCard label="Plaques" value={filtres?.plaques?.length ?? 0} icon={<Truck size={20} />} bg="bg-emerald-100" text="text-emerald-600" />
        <KpiCard label="Fournisseurs" value={filtres?.fournisseurs?.length ?? 0} icon={<Building2 size={20} />} bg="bg-amber-100" text="text-amber-600" />
        <KpiCard label="Types de véhicule" value={filtres?.types_vehicule?.length ?? 0} icon={<Database size={20} />} bg="bg-violet-100" text="text-violet-600" />
      </div>

      <div className="flex justify-center mb-6">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par plaque, fournisseur, type…"
            className="input-base pl-9 w-full"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 p-6 text-center">Chargement…</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-gray-400 p-6 text-center">Aucune donnée — importez le fichier Excel.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-camublue-900 text-white text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Type de location</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Fournisseur</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Type véhicule</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Plaque</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Mois</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Type_Cout</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Valeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/60 cursor-pointer" onClick={() => setManageRow(c)}>
                    <td className="px-4 py-2.5 text-gray-600">{c.type_location || "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.fournisseur || "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.type_vehicule || "—"}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-700 whitespace-nowrap">{c.plaque_immatriculation}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{formatMois(c.mois.slice(0, 7))}</td>
                    <td className="px-4 py-2.5 text-gray-600">{TYPE_COUT_LABELS[c.type_cout] ?? c.type_cout}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-700">{c.valeur.toLocaleString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      {/* ══ Modal Graphiques ═══════════════════════════════════════════════ */}
      {showCharts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCharts(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><BarChart2 size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">Graphiques — Données Flottes</p>
              </div>
              <button onClick={() => setShowCharts(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {loadingCharts ? (
                <p className="text-sm text-gray-400 text-center py-16">Chargement des données…</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Par type de coût */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Coûts par type de coût</p>
                    <div style={{ height: hBarHeight(chartType) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartType} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                          <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10 }} tickFormatter={truncTick} />
                          <RTooltip formatter={(v: any) => [v.toLocaleString("fr-FR"), "Coût"]} />
                          <Bar dataKey="value" name="Coût" fill="#1e3a5f" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Par type de véhicule */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Coûts par type de véhicule</p>
                    <div style={{ height: hBarHeight(chartVeh) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartVeh} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
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
                    <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Coûts par fournisseur (top 10)</p>
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

                  {/* Par plaque */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Coûts par plaque (top 10)</p>
                    <div style={{ height: hBarHeight(chartPlaque) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartPlaque} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
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

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type_Cout</label>
                <select value={draft.type_cout ?? ""} onChange={e => setDraftFilter("type_cout", e.target.value)} className="input-base">
                  <option value="">Tous les types de coût</option>
                  {TYPE_COUT_OPTIONS.map(t => (
                    <option key={t} value={t}>{TYPE_COUT_LABELS[t]}</option>
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

      {/* ══ Modal Ajout/Édition ════════════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Database size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">{editing ? "Modifier la ligne" : "Ajouter une ligne"}</p>
              </div>
              <button onClick={() => setModal(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Plaque d'immatriculation *</label>
                <input type="text" required value={form.plaque_immatriculation}
                  onChange={e => setForm(f => ({ ...f, plaque_immatriculation: e.target.value }))}
                  className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mois *</label>
                <input type="month" required value={form.mois}
                  onChange={e => setForm(f => ({ ...f, mois: e.target.value }))}
                  className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type_Cout *</label>
                <select required value={form.type_cout} onChange={e => setForm(f => ({ ...f, type_cout: e.target.value }))} className="input-base">
                  {TYPE_COUT_OPTIONS.map(t => (
                    <option key={t} value={t}>{TYPE_COUT_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Valeur *</label>
                <input type="number" step="any" required value={form.valeur}
                  onChange={e => setForm(f => ({ ...f, valeur: Number(e.target.value) }))}
                  className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type de location</label>
                <input type="text" value={form.type_location}
                  onChange={e => setForm(f => ({ ...f, type_location: e.target.value }))}
                  className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fournisseur</label>
                <input type="text" value={form.fournisseur}
                  onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))}
                  className="input-base" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type véhicule</label>
                <input type="text" value={form.type_vehicule}
                  onChange={e => setForm(f => ({ ...f, type_vehicule: e.target.value }))}
                  className="input-base" />
              </div>

              <div className="sm:col-span-2 flex gap-2 mt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                  Annuler
                </button>
                <button type="submit" className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">
                  {editing ? "Enregistrer" : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Modal Gérer ════════════════════════════════════════════ */}
      {manageRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setManageRow(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Settings size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">Gérer la ligne</p>
              </div>
              <button onClick={() => setManageRow(null)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm space-y-1">
                <p><span className="font-semibold text-gray-700">Plaque :</span> {manageRow.plaque_immatriculation}</p>
                <p><span className="font-semibold text-gray-700">Mois :</span> {formatMois(manageRow.mois.slice(0, 7))}</p>
                <p><span className="font-semibold text-gray-700">Type_Cout :</span> {TYPE_COUT_LABELS[manageRow.type_cout] ?? manageRow.type_cout}</p>
                <p><span className="font-semibold text-gray-700">Valeur :</span> {manageRow.valeur.toLocaleString("fr-FR")}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { const c = manageRow; setManageRow(null); openEdit(c); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">
                  <Pencil size={14} /> Mise à jour
                </button>
                <button
                  onClick={() => { const c = manageRow; setManageRow(null); handleDelete(c); }}
                  className="flex-1 flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl py-2.5 text-sm font-semibold transition">
                  <Trash2 size={14} /> Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExport && (
        <ExportModal
          title="Exporter — Données Flottes"
          cols={exportCols}
          filename="Données_Flottes"
          onClose={() => setShowExport(false)}
          fetchAll={async () => (await coutService.getAll({ ...filters, page: 1, page_size: 9999 })).items}
        />
      )}
    </AppLayout>
  );
}
