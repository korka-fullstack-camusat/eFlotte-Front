import { useEffect, useState } from "react";
import { Plus, X, Download, Filter, Settings, Pencil, Trash2, Search, ListOrdered, Gauge, CircleDot, BarChart2 } from "lucide-react";
import ExportModal, { ExportColDef } from "@/components/ExportModal";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, Cell } from "recharts";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/charts";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/contexts/AuthContext";
import { pneumatiqueService } from "@/services/api";
import type { Pneumatique, FiltresPneumatiques, PneumatiquesFilters } from "@/types";
import ChartFilterBar, { ChartFilter, CHART_FILTER_EMPTY, applyChartFilter } from "@/components/ChartFilterBar";


const EMPTY = {
  fournisseur: "", type_location: "", immatriculation: "", chauffeur: "", kilometrage: "",
  nb_pneus: "", ref_pneu: "", etat: "", snc: "", zone_intervention: "",
  date_prevue: "", commentaire: "",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [annee, mois, jour] = iso.split("-");
  return `${jour}/${mois}/${annee}`;
}

const ETAT_COLORS: Record<string, string> = {
  "Usés": "#ef4444",
  "USÉS": "#ef4444",
  "Bon": "#10b981",
  "BON": "#10b981",
  "Neuf": "#3b82f6",
  "NEUF": "#3b82f6",
};

const CHART_COLORS = ["#1e3a5f","#2a5298","#3b6fc4","#5b8de0","#7aaee8","#9ec5f0","#b8d4f5","#d0e5fa","#e6f1fd","#0d2444"];

export default function PneumatiquePage() {
  const { isViewer } = useAuth();
  const [items, setItems] = useState<Pneumatique[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [filtres, setFiltres] = useState<FiltresPneumatiques | null>(null);
  const [filters, setFilters] = useState<PneumatiquesFilters>({});
  const [filterModal, setFilterModal] = useState(false);
  const [draft, setDraft] = useState<PneumatiquesFilters>({});

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Pneumatique | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [manageRow, setManageRow] = useState<Pneumatique | null>(null);

  const [search, setSearch] = useState("");

  const [chartFilter, setChartFilter] = useState<ChartFilter>(CHART_FILTER_EMPTY);

  const [showCharts, setShowCharts] = useState(false);
  const [allItems, setAllItems] = useState<Pneumatique[]>([]);
  const [rawChartItems, setRawChartItems] = useState<Pneumatique[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);

  type QuickEditField = "fournisseur" | "type_location" | "chauffeur" | "kilometrage" | "nb_pneus" | "ref_pneu" | "etat" | "snc" | "zone_intervention" | "date_prevue" | "commentaire";
  const [quickEdit, setQuickEdit] = useState<{ item: Pneumatique; field: QuickEditField; label: string; type: "text" | "number" | "date" | "textarea"; current: string } | null>(null);
  const [quickValue, setQuickValue] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  const openQuickEdit = (e: React.MouseEvent, item: Pneumatique, field: QuickEditField, label: string, type: "text" | "number" | "date" | "textarea") => {
    e.stopPropagation();
    if (isViewer) return;
    const current = item[field] != null ? String(item[field]) : "";
    setQuickEdit({ item, field, label, type, current });
    setQuickValue(current);
  };

  const handleQuickSave = async () => {
    if (!quickEdit) return;
    setQuickSaving(true);
    try {
      const { item, field, type } = quickEdit;
      const val = quickValue.trim();
      const payload: any = {
        [field]: val === "" ? null : type === "number" ? Number(val) : val,
      };
      await pneumatiqueService.update(item.id, payload);
      toast.success("Mis à jour");
      setQuickEdit(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    } finally {
      setQuickSaving(false);
    }
  };

  const load = () => {
    setLoading(true);
    pneumatiqueService.getAll({ ...filters, page, page_size: pageSize })
      .then(res => { setItems(res.items); setTotal(res.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const openCharts = () => {
    setShowCharts(true);
    setLoadingCharts(true);
    pneumatiqueService.getAll({ ...filters, page: 1, page_size: 9999 })
      .then(res => { setRawChartItems(res.items); setAllItems(applyChartFilter(res.items, chartFilter, r => r.date_prevue)); })
      .catch(() => {})
      .finally(() => setLoadingCharts(false));
  };

  useEffect(() => {
    if (!showCharts || rawChartItems.length === 0) return;
    setAllItems(applyChartFilter(rawChartItems, chartFilter, r => r.date_prevue));
  }, [chartFilter]);

  useEffect(() => { load(); }, [page, filters, pageSize]);
  useEffect(() => { pneumatiqueService.filtres().then(setFiltres).catch(() => {}); }, []);
  useEffect(() => { setPage(1); }, [filters]);

  const hasFilters = Object.keys(filters).length > 0;

  const openFilterModal = () => { setDraft(filters); setFilterModal(true); };
  const setDraftFilter = (key: keyof PneumatiquesFilters, value: string) => {
    setDraft(f => {
      const next = { ...f };
      if (value) (next as any)[key] = value; else delete (next as any)[key];
      return next;
    });
  };
  const applyFilters = () => { setFilters(draft); setFilterModal(false); };
  const resetFilters = () => { setDraft({}); setFilters({}); setFilterModal(false); };

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (p: Pneumatique) => {
    setEditing(p);
    setForm({
      fournisseur: p.fournisseur ?? "",
      type_location: p.type_location ?? "",
      immatriculation: p.immatriculation,
      chauffeur: p.chauffeur ?? "",
      kilometrage: p.kilometrage != null ? String(p.kilometrage) : "",
      nb_pneus: p.nb_pneus != null ? String(p.nb_pneus) : "",
      ref_pneu: p.ref_pneu ?? "",
      etat: p.etat ?? "",
      snc: p.snc ?? "",
      zone_intervention: p.zone_intervention ?? "",
      date_prevue: p.date_prevue?.slice(0, 10) ?? "",
      commentaire: p.commentaire ?? "",
    });
    setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        fournisseur: form.fournisseur || null,
        type_location: form.type_location || null,
        immatriculation: form.immatriculation,
        chauffeur: form.chauffeur || null,
        kilometrage: form.kilometrage ? Number(form.kilometrage) : null,
        nb_pneus: form.nb_pneus ? Number(form.nb_pneus) : null,
        ref_pneu: form.ref_pneu || null,
        etat: form.etat || null,
        snc: form.snc || null,
        zone_intervention: form.zone_intervention || null,
        date_prevue: form.date_prevue || null,
        commentaire: form.commentaire || null,
      };
      if (editing) {
        await pneumatiqueService.update(editing.id, payload);
        toast.success("Pneumatique mis à jour");
      } else {
        await pneumatiqueService.create(payload);
        toast.success("Pneumatique ajouté");
      }
      setModal(false);
      load();
      pneumatiqueService.filtres().then(setFiltres).catch(() => {});
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  const handleDelete = async (p: Pneumatique) => {
    if (!confirm(`Supprimer le pneumatique (${p.immatriculation}) ?`)) return;
    try {
      await pneumatiqueService.remove(p.id);
      toast.success("Supprimé");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  const [showExport, setShowExport] = useState(false);
  const exportCols: ExportColDef<Pneumatique>[] = [
    { key: "fournisseur",      header: "Fournisseur",        value: r => r.fournisseur ?? "" },
    { key: "type_location",    header: "Type location",      value: r => r.type_location ?? "" },
    { key: "immatriculation",  header: "Immatriculation",    value: r => r.immatriculation ?? "" },
    { key: "chauffeur",        header: "Chauffeur",          value: r => r.chauffeur ?? "" },
    { key: "kilometrage",      header: "Kilométrage",        value: r => r.kilometrage ?? "" },
    { key: "nb_pneus",         header: "N° Pneus",           value: r => r.nb_pneus ?? "" },
    { key: "ref_pneu",         header: "Réf. Pneu",          value: r => r.ref_pneu ?? "" },
    { key: "etat",             header: "État",               value: r => r.etat ?? "" },
    { key: "snc",              header: "SNC",                value: r => r.snc ?? "" },
    { key: "zone_intervention",header: "Zone intervention",  value: r => r.zone_intervention ?? "" },
    { key: "date_prevue",      header: "Date prévue",        value: r => r.date_prevue?.slice(0, 10) ?? "" },
    { key: "commentaire",      header: "Commentaire",        value: r => r.commentaire ?? "" },
  ];

  const filteredItems = items.filter(p => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [p.immatriculation, p.chauffeur, p.fournisseur, p.ref_pneu, p.etat, p.snc, p.zone_intervention]
      .some(v => (v ?? "").toLowerCase().includes(q));
  });

  // Chart computations
  const topN = (key: keyof Pneumatique, n = 10) => {
    const counts = new Map<string, number>();
    allItems.forEach(p => {
      const label = (p[key] as string) || "—";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([label, value]) => ({ label, value }));
  };

  const truncTick = (v: string) => v.length > 15 ? v.slice(0, 14) + "…" : v;
  const hBarHeight = (d: any[]) => Math.max(180, d.length * 34);

  return (
    <AppLayout>
      <div className="mb-8 sticky top-0 z-20 bg-camugray-100 -mx-4 px-4 md:-mx-8 md:px-8 pt-1 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-camublue-900">Pneumatiques</h1>
            <p className="text-gray-500 text-sm mt-0.5">Suivi de l'état et du renouvellement des pneus</p>
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
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Véhicules (total)" value={total} icon={<ListOrdered size={20} />} bg="bg-camublue-900/10" text="text-camublue-900" />
        <KpiCard label="Fournisseurs" value={filtres?.fournisseurs?.length ?? 0} icon={<CircleDot size={20} />} bg="bg-emerald-100" text="text-emerald-600" />
        <KpiCard label="Réf. pneus" value={filtres?.sncs?.length ?? 0} icon={<Gauge size={20} />} bg="bg-amber-100" text="text-amber-600" />
        <KpiCard label="États distincts" value={filtres?.etats?.length ?? 0} icon={<CircleDot size={20} />} bg="bg-violet-100" text="text-violet-600" />
      </div>

      <div className="flex justify-center mb-6">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par plaque, chauffeur, fournisseur…"
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
          <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
            <table className="w-full text-sm">
              <thead className="bg-camublue-900 text-white text-xs uppercase sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Fournisseur</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Type</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Imma</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Chauffeur</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Km</th>
                  <th className="text-center px-4 py-2.5 font-semibold">N° Pneus</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Réf.</th>
                  <th className="text-left px-4 py-2.5 font-semibold">État</th>
                  <th className="text-left px-4 py-2.5 font-semibold">SNC</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Zone</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Date prév.</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Commentaire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/60 cursor-pointer" onClick={() => setManageRow(p)}>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap"
                      onClick={e => openQuickEdit(e, p, "fournisseur", "Fournisseur", "text")}>
                      <span className={!isViewer ? "hover:underline hover:text-camublue-900 cursor-pointer" : ""}>{p.fournisseur || "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap"
                      onClick={e => openQuickEdit(e, p, "type_location", "Type location", "text")}>
                      {p.type_location ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-camublue-900/10 text-camublue-900 ${!isViewer ? "hover:ring-1 hover:ring-camublue-900 cursor-pointer" : ""}`}>
                          {p.type_location}
                        </span>
                      ) : <span className={!isViewer ? "hover:underline hover:text-camublue-900 cursor-pointer" : ""}>—</span>}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-gray-700 whitespace-nowrap">{p.immatriculation}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap"
                      onClick={e => openQuickEdit(e, p, "chauffeur", "Chauffeur", "text")}>
                      <span className={!isViewer ? "hover:underline hover:text-camublue-900 cursor-pointer" : ""}>{p.chauffeur || "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600 whitespace-nowrap"
                      onClick={e => openQuickEdit(e, p, "kilometrage", "Kilométrage", "number")}>
                      <span className={!isViewer ? "hover:underline hover:text-camublue-900 cursor-pointer" : ""}>
                        {p.kilometrage != null ? p.kilometrage.toLocaleString("fr-FR") : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-gray-600"
                      onClick={e => openQuickEdit(e, p, "nb_pneus", "N° Pneus", "number")}>
                      <span className={!isViewer ? "hover:underline hover:text-camublue-900 cursor-pointer" : ""}>{p.nb_pneus ?? "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap text-xs"
                      onClick={e => openQuickEdit(e, p, "ref_pneu", "Référence pneu", "text")}>
                      <span className={!isViewer ? "hover:underline hover:text-camublue-900 cursor-pointer" : ""}>{p.ref_pneu || "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap"
                      onClick={e => openQuickEdit(e, p, "etat", "État", "text")}>
                      {p.etat ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${!isViewer ? "cursor-pointer hover:ring-1 hover:ring-offset-1" : ""}`}
                          style={{
                            background: ETAT_COLORS[p.etat] ? ETAT_COLORS[p.etat] + "22" : "#f3f4f6",
                            color: ETAT_COLORS[p.etat] ?? "#374151",
                          }}>
                          {p.etat}
                        </span>
                      ) : <span className={!isViewer ? "hover:underline hover:text-camublue-900 cursor-pointer" : ""}>—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap"
                      onClick={e => openQuickEdit(e, p, "snc", "SNC", "text")}>
                      <span className={!isViewer ? "hover:underline hover:text-camublue-900 cursor-pointer" : ""}>{p.snc || "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap"
                      onClick={e => openQuickEdit(e, p, "zone_intervention", "Zone d'intervention", "text")}>
                      <span className={!isViewer ? "hover:underline hover:text-camublue-900 cursor-pointer" : ""}>{p.zone_intervention || "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap"
                      onClick={e => openQuickEdit(e, p, "date_prevue", "Date prévue", "date")}>
                      <span className={!isViewer ? "hover:underline hover:text-camublue-900 cursor-pointer" : ""}>{formatDate(p.date_prevue)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 max-w-[180px] truncate"
                      onClick={e => openQuickEdit(e, p, "commentaire", "Commentaire", "textarea")}>
                      <span className={!isViewer ? "hover:underline hover:text-camublue-900 cursor-pointer" : ""}>{p.commentaire || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} />
      </div>

      {showExport && (
        <ExportModal
          title="Exporter — Pneumatiques"
          cols={exportCols}
          filename="Pneumatiques"
          onClose={() => setShowExport(false)}
          fetchAll={async () => (await pneumatiqueService.getAll({ ...filters, page: 1, page_size: 9999 })).items}
        />
      )}

      {/* ══ Modal Graphiques ═══════════════════════════════════════════════ */}
      {showCharts && (() => {
        const etatData = topN("etat");
        const fournData = topN("fournisseur");
        const sncData = topN("snc");
        const zoneData = topN("zone_intervention");
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCharts(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="bg-camublue-900 px-5 py-3 flex items-center gap-3 flex-wrap sticky top-0 z-10">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <BarChart2 size={16} className="text-white" />
                </div>
                <p className="text-white font-bold text-sm shrink-0">Graphiques — Pneumatiques</p>
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
                ) : allItems.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-16">Aucune donnée disponible.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Par état */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Répartition par état</p>
                      <div style={{ height: hBarHeight(etatData) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={etatData} layout="vertical" margin={{ left: 8, right: 30, top: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10 }} tickFormatter={truncTick} />
                            <RTooltip formatter={(v: any) => [v, "Véhicules"]} />
                            <Bar dataKey="value" name="Véhicules" radius={[0, 4, 4, 0]}>
                              {etatData.map((entry, i) => (
                                <Cell key={i} fill={ETAT_COLORS[entry.label] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Par fournisseur */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Véhicules par fournisseur</p>
                      <div style={{ height: hBarHeight(fournData) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={fournData} layout="vertical" margin={{ left: 8, right: 30, top: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 10 }} tickFormatter={truncTick} />
                            <RTooltip formatter={(v: any) => [v, "Véhicules"]} />
                            <Bar dataKey="value" name="Véhicules" fill="#2a5298" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Par SNC */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Répartition par SNC</p>
                      <div style={{ height: hBarHeight(sncData) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sncData} layout="vertical" margin={{ left: 8, right: 30, top: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10 }} tickFormatter={truncTick} />
                            <RTooltip formatter={(v: any) => [v, "Véhicules"]} />
                            <Bar dataKey="value" name="Véhicules" fill="#3b6fc4" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Par zone d'intervention */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Par zone d'intervention (top 10)</p>
                      <div style={{ height: hBarHeight(zoneData) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={zoneData} layout="vertical" margin={{ left: 8, right: 30, top: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 10 }} tickFormatter={truncTick} />
                            <RTooltip formatter={(v: any) => [v, "Véhicules"]} />
                            <Bar dataKey="value" name="Véhicules" fill="#5b8de0" radius={[0, 4, 4, 0]} />
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
        );
      })()}

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
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fournisseur</label>
                <select value={draft.fournisseur ?? ""} onChange={e => setDraftFilter("fournisseur", e.target.value)} className="input-base">
                  <option value="">Tous les fournisseurs</option>
                  {(filtres?.fournisseurs ?? []).map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Plaque d'immatriculation</label>
                <select value={draft.immatriculation ?? ""} onChange={e => setDraftFilter("immatriculation", e.target.value)} className="input-base">
                  <option value="">Toutes les plaques</option>
                  {(filtres?.immatriculations ?? []).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">État</label>
                <select value={draft.etat ?? ""} onChange={e => setDraftFilter("etat", e.target.value)} className="input-base">
                  <option value="">Tous les états</option>
                  {(filtres?.etats ?? []).map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">SNC</label>
                <select value={draft.snc ?? ""} onChange={e => setDraftFilter("snc", e.target.value)} className="input-base">
                  <option value="">Tous les SNC</option>
                  {(filtres?.sncs ?? []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={resetFilters} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">Réinitialiser</button>
                <button type="button" onClick={applyFilters} className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">Appliquer</button>
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
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><CircleDot size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">{editing ? "Modifier" : "Ajouter un pneumatique"}</p>
              </div>
              <button onClick={() => setModal(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fournisseur</label>
                <input type="text" value={form.fournisseur} onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type (CAMUSAT / LLD…)</label>
                <input type="text" value={form.type_location} onChange={e => setForm(f => ({ ...f, type_location: e.target.value }))} className="input-base" placeholder="CAMUSAT, LLD, AUTORENT…" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Immatriculation *</label>
                <input type="text" required value={form.immatriculation} onChange={e => setForm(f => ({ ...f, immatriculation: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Chauffeur</label>
                <input type="text" value={form.chauffeur} onChange={e => setForm(f => ({ ...f, chauffeur: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Kilométrage</label>
                <input type="number" value={form.kilometrage} onChange={e => setForm(f => ({ ...f, kilometrage: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">N° Pneus</label>
                <input type="number" value={form.nb_pneus} onChange={e => setForm(f => ({ ...f, nb_pneus: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Référence pneu</label>
                <input type="text" value={form.ref_pneu} onChange={e => setForm(f => ({ ...f, ref_pneu: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">État</label>
                <input type="text" value={form.etat} onChange={e => setForm(f => ({ ...f, etat: e.target.value }))} className="input-base" placeholder="Usés, Bon, Neuf…" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">SNC</label>
                <input type="text" value={form.snc} onChange={e => setForm(f => ({ ...f, snc: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Zone d'intervention</label>
                <input type="text" value={form.zone_intervention} onChange={e => setForm(f => ({ ...f, zone_intervention: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date prévue</label>
                <input type="date" value={form.date_prevue} onChange={e => setForm(f => ({ ...f, date_prevue: e.target.value }))} className="input-base" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Commentaire</label>
                <textarea rows={2} value={form.commentaire} onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))} className="input-base" />
              </div>
              <div className="sm:col-span-2 flex gap-2 mt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">Annuler</button>
                <button type="submit" className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">{editing ? "Enregistrer" : "Ajouter"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Quick Edit ══════════════════════════════════════════════════════ */}
      {quickEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setQuickEdit(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-5 py-3.5 flex items-center justify-between">
              <p className="text-white font-bold text-sm">{quickEdit.label}</p>
              <button onClick={() => setQuickEdit(null)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">{quickEdit.item.immatriculation}</p>
              {quickEdit.type === "textarea" ? (
                <textarea
                  rows={3}
                  className="input-base w-full"
                  value={quickValue}
                  onChange={e => setQuickValue(e.target.value)}
                  autoFocus
                />
              ) : (
                <input
                  type={quickEdit.type}
                  className="input-base w-full"
                  value={quickValue}
                  onChange={e => setQuickValue(e.target.value)}
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") handleQuickSave(); if (e.key === "Escape") setQuickEdit(null); }}
                />
              )}
              <div className="flex gap-2">
                <button onClick={() => setQuickEdit(null)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">Annuler</button>
                <button onClick={handleQuickSave} disabled={quickSaving}
                  className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-60">
                  {quickSaving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal Gérer ═════════════════════════════════════════════════════ */}
      {manageRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setManageRow(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Settings size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">Gérer le pneumatique</p>
              </div>
              <button onClick={() => setManageRow(null)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm space-y-1">
                <p><span className="font-semibold text-gray-700">Plaque :</span> {manageRow.immatriculation}</p>
                <p><span className="font-semibold text-gray-700">Fournisseur :</span> {manageRow.fournisseur || "—"}</p>
                <p><span className="font-semibold text-gray-700">État :</span> {manageRow.etat || "—"}</p>
                <p><span className="font-semibold text-gray-700">Réf. :</span> {manageRow.ref_pneu || "—"}</p>
                <p><span className="font-semibold text-gray-700">Date prév. :</span> {formatDate(manageRow.date_prevue)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { const p = manageRow; setManageRow(null); openEdit(p); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">
                  <Pencil size={14} /> Mise à jour
                </button>
                <button onClick={() => { const p = manageRow; setManageRow(null); handleDelete(p); }}
                  className="flex-1 flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl py-2.5 text-sm font-semibold transition">
                  <Trash2 size={14} /> Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
