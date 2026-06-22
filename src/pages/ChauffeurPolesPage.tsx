import { useEffect, useState } from "react";
import { Plus, X, Download, Filter, Pencil, Trash2, Car, Search, ListOrdered, Users, MapPin, BarChart2 } from "lucide-react";
import ExportModal, { ExportColDef } from "@/components/ExportModal";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip } from "recharts";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/charts";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/contexts/AuthContext";
import { missionChauffeurService } from "@/services/api";
import type { MissionChauffeur, FiltresMissions, MissionsFilters } from "@/types";
import ChartFilterBar, { ChartFilter, CHART_FILTER_EMPTY, applyChartFilter } from "@/components/ChartFilterBar";

const PAGE_SIZE = 10;

const EMPTY = {
  date: "", immatriculation: "", chauffeur: "", demandeur: "", telephone: "",
  projet: "", destination: "", date_depart: "", date_retour: "", commentaires: "",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [annee, mois, jour] = iso.split("-");
  return `${jour}/${mois}/${annee}`;
}

function topN(items: MissionChauffeur[], key: keyof MissionChauffeur, n = 10) {
  const counts = new Map<string, number>();
  items.forEach(m => {
    const label = (m[key] as string) || "—";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, value]) => ({ label, value }));
}

type QuickEditField = "date" | "immatriculation" | "chauffeur" | "demandeur" | "telephone" | "projet" | "destination" | "date_depart" | "date_retour" | "commentaires";

export default function ChauffeurPolesPage() {
  const { isViewer } = useAuth();
  const [items, setItems] = useState<MissionChauffeur[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [filtres, setFiltres] = useState<FiltresMissions | null>(null);
  const [filters, setFilters] = useState<MissionsFilters>({});
  const [filterModal, setFilterModal] = useState(false);
  const [draft, setDraft] = useState<MissionsFilters>({});

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<MissionChauffeur | null>(null);
  const [form, setForm] = useState(EMPTY);

  const [search, setSearch] = useState("");
  const [showExport, setShowExport] = useState(false);

  const [chartFilter, setChartFilter] = useState<ChartFilter>(CHART_FILTER_EMPTY);
  const [showCharts, setShowCharts] = useState(false);
  const [allItems, setAllItems] = useState<MissionChauffeur[]>([]);
  const [rawChartItems, setRawChartItems] = useState<MissionChauffeur[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);

  // Quick edit
  const [manageRow, setManageRow] = useState<MissionChauffeur | null>(null);

  const [quickEdit, setQuickEdit] = useState<{
    item: MissionChauffeur; field: QuickEditField; label: string;
    type: "text" | "date" | "textarea";
  } | null>(null);
  const [quickValue, setQuickValue] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  const openQuickEdit = (
    e: React.MouseEvent,
    item: MissionChauffeur,
    field: QuickEditField,
    label: string,
    type: "text" | "date" | "textarea" = "text",
  ) => {
    e.stopPropagation();
    if (isViewer) return;
    const current = item[field] != null ? String(item[field]).slice(0, 10) : "";
    setQuickEdit({ item, field, label, type });
    setQuickValue(current);
  };

  const handleQuickSave = async () => {
    if (!quickEdit) return;
    setQuickSaving(true);
    try {
      const { item, field } = quickEdit;
      const val = quickValue.trim();
      await missionChauffeurService.update(item.id, { [field]: val || null } as any);
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
    missionChauffeurService.getAll({ ...filters, page, page_size: PAGE_SIZE })
      .then(res => { setItems(res.items); setTotal(res.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const openCharts = () => {
    setShowCharts(true);
    setLoadingCharts(true);
    missionChauffeurService.getAll({ ...filters, page: 1, page_size: 9999 })
      .then(res => { setRawChartItems(res.items); setAllItems(applyChartFilter(res.items, chartFilter, r => r.date)); })
      .catch(() => {})
      .finally(() => setLoadingCharts(false));
  };

  useEffect(() => {
    if (!showCharts || rawChartItems.length === 0) return;
    setAllItems(applyChartFilter(rawChartItems, chartFilter, r => r.date));
  }, [chartFilter]);

  useEffect(() => { load(); }, [page, filters]);
  useEffect(() => { missionChauffeurService.filtres().then(setFiltres).catch(() => {}); }, []);
  useEffect(() => { setPage(1); }, [filters]);

  const hasFilters = Object.keys(filters).length > 0;

  const openFilterModal = () => { setDraft(filters); setFilterModal(true); };
  const setDraftFilter = (key: keyof MissionsFilters, value: string) => {
    setDraft(f => {
      const next = { ...f };
      if (value) (next as any)[key] = value; else delete (next as any)[key];
      return next;
    });
  };
  const applyFilters = () => { setFilters(draft); setFilterModal(false); };
  const resetFilters = () => { setDraft({}); setFilters({}); setFilterModal(false); };

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (m: MissionChauffeur) => {
    setEditing(m);
    setForm({
      date: m.date.slice(0, 10),
      immatriculation: m.immatriculation,
      chauffeur: m.chauffeur ?? "",
      demandeur: m.demandeur ?? "",
      telephone: m.telephone ?? "",
      projet: m.projet ?? "",
      destination: m.destination ?? "",
      date_depart: m.date_depart?.slice(0, 10) ?? "",
      date_retour: m.date_retour?.slice(0, 10) ?? "",
      commentaires: m.commentaires ?? "",
    });
    setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        date: form.date,
        immatriculation: form.immatriculation,
        chauffeur: form.chauffeur || null,
        demandeur: form.demandeur || null,
        telephone: form.telephone || null,
        projet: form.projet || null,
        destination: form.destination || null,
        date_depart: form.date_depart || null,
        date_retour: form.date_retour || null,
        commentaires: form.commentaires || null,
      };
      if (editing) {
        await missionChauffeurService.update(editing.id, payload);
        toast.success("Mission mise à jour");
      } else {
        await missionChauffeurService.create(payload);
        toast.success("Mission ajoutée");
      }
      setModal(false);
      load();
      missionChauffeurService.filtres().then(setFiltres).catch(() => {});
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  const handleDelete = async (m: MissionChauffeur) => {
    if (!confirm(`Supprimer cette mission (${m.immatriculation} — ${formatDate(m.date)}) ?`)) return;
    try {
      await missionChauffeurService.remove(m.id);
      toast.success("Mission supprimée");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  const exportCols: ExportColDef<MissionChauffeur>[] = [
    { key: "date",           header: "Date",             value: r => r.date?.slice(0, 10) ?? "" },
    { key: "immatriculation",header: "Immatriculation",  value: r => r.immatriculation },
    { key: "chauffeur",      header: "Chauffeur",        value: r => r.chauffeur ?? "" },
    { key: "demandeur",      header: "Demandeur",        value: r => r.demandeur ?? "" },
    { key: "telephone",      header: "Téléphone",        value: r => r.telephone ?? "" },
    { key: "projet",         header: "Projet",           value: r => r.projet ?? "" },
    { key: "destination",    header: "Destination",      value: r => r.destination ?? "" },
    { key: "date_depart",    header: "Date départ",      value: r => r.date_depart?.slice(0, 10) ?? "" },
    { key: "date_retour",    header: "Date retour",      value: r => r.date_retour?.slice(0, 10) ?? "" },
    { key: "commentaires",   header: "Commentaires",     value: r => r.commentaires ?? "" },
  ];

  const filteredItems = items.filter(m => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [m.immatriculation, m.chauffeur, m.demandeur, m.projet, m.destination]
      .some(v => (v ?? "").toLowerCase().includes(q));
  });

  const COLORS = ["#1e3a5f","#2a5298","#3b6fc4","#5b8de0","#7aaee8","#9ec5f0","#b8d4f5","#d0e5fa","#e6f1fd","#f0f7ff"];
  const truncTick = (v: string) => v.length > 14 ? v.slice(0, 13) + "…" : v;
  const hBarHeight = (data: any[]) => Math.max(200, data.length * 32);

  const editableTd = "cursor-pointer";
  const editableSpan = !isViewer ? "hover:underline hover:text-camublue-900 cursor-pointer" : "";

  return (
    <AppLayout>
      <div className="mb-8 sticky top-0 z-20 bg-camugray-100 -mx-4 px-4 md:-mx-8 md:px-8 pt-1 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-camublue-900">Chauffeurs Pôles</h1>
            <p className="text-gray-500 text-sm mt-0.5">Suivi des missions des chauffeurs des pôles</p>
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
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Missions (total)" value={total} icon={<ListOrdered size={20} />} bg="bg-camublue-900/10" text="text-camublue-900" />
        <KpiCard label="Chauffeurs" value={filtres?.chauffeurs?.length ?? 0} icon={<Users size={20} />} bg="bg-emerald-100" text="text-emerald-600" />
        <KpiCard label="Projets" value={filtres?.projets?.length ?? 0} icon={<MapPin size={20} />} bg="bg-amber-100" text="text-amber-600" />
        <KpiCard label="Plaques" value={filtres?.immatriculations?.length ?? 0} icon={<Car size={20} />} bg="bg-violet-100" text="text-violet-600" />
      </div>

      <div className="flex justify-center mb-6">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par plaque, chauffeur, projet…"
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
            <table className="w-full text-sm table-fixed">
              <thead className="bg-camublue-900 text-white text-xs uppercase sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold w-[8%]">Date</th>
                  <th className="text-left px-4 py-2.5 font-semibold w-[9%]">Imma</th>
                  <th className="text-left px-4 py-2.5 font-semibold w-[10%]">Chauffeur</th>
                  <th className="text-left px-4 py-2.5 font-semibold w-[10%]">Demandeur</th>
                  <th className="text-left px-4 py-2.5 font-semibold w-[9%]">Téléphone</th>
                  <th className="text-left px-4 py-2.5 font-semibold w-[10%]">Projet</th>
                  <th className="text-left px-4 py-2.5 font-semibold w-[12%]">Destination</th>
                  <th className="text-left px-4 py-2.5 font-semibold w-[9%]">Date départ</th>
                  <th className="text-left px-4 py-2.5 font-semibold w-[9%]">Date retour</th>
                  <th className="text-left px-4 py-2.5 font-semibold w-[14%]">Commentaires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50/60">
                    <td className={`px-4 py-2.5 text-gray-600 truncate ${editableTd}`}
                      onClick={e => openQuickEdit(e, m, "date", "Date", "date")}>
                      <span className={editableSpan}>{formatDate(m.date)}</span>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-gray-700 truncate cursor-pointer"
                      onClick={() => setManageRow(m)}>
                      <span className="hover:underline hover:text-camublue-900">{m.immatriculation}</span>
                    </td>
                    <td className={`px-4 py-2.5 text-gray-600 truncate ${editableTd}`}
                      onClick={e => openQuickEdit(e, m, "chauffeur", "Chauffeur")}>
                      <span className={editableSpan}>{m.chauffeur || "—"}</span>
                    </td>
                    <td className={`px-4 py-2.5 text-gray-600 truncate ${editableTd}`}
                      onClick={e => openQuickEdit(e, m, "demandeur", "Demandeur")}>
                      <span className={editableSpan}>{m.demandeur || "—"}</span>
                    </td>
                    <td className={`px-4 py-2.5 text-gray-600 truncate ${editableTd}`}
                      onClick={e => openQuickEdit(e, m, "telephone", "Téléphone")}>
                      <span className={editableSpan}>{m.telephone || "—"}</span>
                    </td>
                    <td className={`px-4 py-2.5 text-gray-600 truncate ${editableTd}`}
                      onClick={e => openQuickEdit(e, m, "projet", "Projet")}>
                      <span className={editableSpan}>{m.projet || "—"}</span>
                    </td>
                    <td className={`px-4 py-2.5 text-gray-600 truncate ${editableTd}`}
                      onClick={e => openQuickEdit(e, m, "destination", "Destination")}>
                      <span className={editableSpan}>{m.destination || "—"}</span>
                    </td>
                    <td className={`px-4 py-2.5 text-gray-600 truncate ${editableTd}`}
                      onClick={e => openQuickEdit(e, m, "date_depart", "Date départ", "date")}>
                      <span className={editableSpan}>{formatDate(m.date_depart)}</span>
                    </td>
                    <td className={`px-4 py-2.5 text-gray-600 truncate ${editableTd}`}
                      onClick={e => openQuickEdit(e, m, "date_retour", "Date retour", "date")}>
                      <span className={editableSpan}>{formatDate(m.date_retour)}</span>
                    </td>
                    <td className={`px-4 py-2.5 text-gray-600 max-w-xs truncate ${editableTd}`}
                      onClick={e => openQuickEdit(e, m, "commentaires", "Commentaires", "textarea")}>
                      <span className={editableSpan}>{m.commentaires || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      {/* ══ Modal Gérer (IMMA) ══════════════════════════════════════════════ */}
      {manageRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setManageRow(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Car size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">Gérer la mission</p>
              </div>
              <button onClick={() => setManageRow(null)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm space-y-1">
                <p><span className="font-semibold text-gray-700">Plaque :</span> {manageRow.immatriculation}</p>
                <p><span className="font-semibold text-gray-700">Date :</span> {formatDate(manageRow.date)}</p>
                <p><span className="font-semibold text-gray-700">Chauffeur :</span> {manageRow.chauffeur || "—"}</p>
                <p><span className="font-semibold text-gray-700">Destination :</span> {manageRow.destination || "—"}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { const m = manageRow; setManageRow(null); openEdit(m); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">
                  <Pencil size={14} /> Mise à jour
                </button>
                <button
                  onClick={() => { const m = manageRow; setManageRow(null); handleDelete(m); }}
                  className="flex-1 flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl py-2.5 text-sm font-semibold transition">
                  <Trash2 size={14} /> Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Quick Edit ══════════════════════════════════════════════════════ */}
      {quickEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setQuickEdit(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-5 py-3.5 flex items-center justify-between">
              <p className="text-white font-bold text-sm">{quickEdit.label}</p>
              <button onClick={() => setQuickEdit(null)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <X size={14} className="text-white" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">{quickEdit.item.immatriculation} — {formatDate(quickEdit.item.date)}</p>
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
                <button onClick={() => setQuickEdit(null)}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                  Annuler
                </button>
                <button onClick={handleQuickSave} disabled={quickSaving}
                  className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-60">
                  {quickSaving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal Graphiques ═══════════════════════════════════════════════ */}
      {showCharts && (() => {
        const chauffeurData = topN(allItems, "chauffeur");
        const projetData = topN(allItems, "projet");
        const immaData = topN(allItems, "immatriculation");
        const destData = topN(allItems, "destination");
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCharts(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="bg-camublue-900 px-5 py-3 flex items-center gap-3 flex-wrap sticky top-0 z-10">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <BarChart2 size={16} className="text-white" />
                </div>
                <p className="text-white font-bold text-sm shrink-0">Graphiques — Chauffeurs Pôles</p>
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
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Missions par chauffeur (top 10)</p>
                      <div style={{ height: hBarHeight(chauffeurData) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chauffeurData} layout="vertical" margin={{ left: 8, right: 30, top: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10 }} tickFormatter={truncTick} />
                            <RTooltip formatter={(v: any) => [v, "Missions"]} labelFormatter={(l: string) => l} />
                            <Bar dataKey="value" name="Missions" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Missions par projet (top 10)</p>
                      <div style={{ height: hBarHeight(projetData) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={projetData} layout="vertical" margin={{ left: 8, right: 30, top: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10 }} tickFormatter={truncTick} />
                            <RTooltip formatter={(v: any) => [v, "Missions"]} labelFormatter={(l: string) => l} />
                            <Bar dataKey="value" name="Missions" fill={COLORS[1]} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Missions par véhicule (top 10)</p>
                      <div style={{ height: hBarHeight(immaData) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={immaData} layout="vertical" margin={{ left: 8, right: 30, top: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10 }} tickFormatter={truncTick} />
                            <RTooltip formatter={(v: any) => [v, "Missions"]} labelFormatter={(l: string) => l} />
                            <Bar dataKey="value" name="Missions" fill={COLORS[2]} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-600 mb-3 text-center">Missions par destination (top 10)</p>
                      <div style={{ height: hBarHeight(destData) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={destData} layout="vertical" margin={{ left: 8, right: 30, top: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10 }} tickFormatter={truncTick} />
                            <RTooltip formatter={(v: any) => [v, "Missions"]} labelFormatter={(l: string) => l} />
                            <Bar dataKey="value" name="Missions" fill={COLORS[3]} radius={[0, 4, 4, 0]} />
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
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Plaque d'immatriculation</label>
                <select value={draft.immatriculation ?? ""} onChange={e => setDraftFilter("immatriculation", e.target.value)} className="input-base">
                  <option value="">Toutes les plaques</option>
                  {(filtres?.immatriculations ?? []).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Chauffeur</label>
                <select value={draft.chauffeur ?? ""} onChange={e => setDraftFilter("chauffeur", e.target.value)} className="input-base">
                  <option value="">Tous les chauffeurs</option>
                  {(filtres?.chauffeurs ?? []).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Projet</label>
                <select value={draft.projet ?? ""} onChange={e => setDraftFilter("projet", e.target.value)} className="input-base">
                  <option value="">Tous les projets</option>
                  {(filtres?.projets ?? []).map(p => <option key={p} value={p}>{p}</option>)}
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
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Car size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">{editing ? "Modifier la mission" : "Ajouter une mission"}</p>
              </div>
              <button onClick={() => setModal(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date *</label>
                <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Plaque d'immatriculation *</label>
                <input type="text" required value={form.immatriculation} onChange={e => setForm(f => ({ ...f, immatriculation: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Chauffeur</label>
                <input type="text" value={form.chauffeur} onChange={e => setForm(f => ({ ...f, chauffeur: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Demandeur</label>
                <input type="text" value={form.demandeur} onChange={e => setForm(f => ({ ...f, demandeur: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Téléphone</label>
                <input type="text" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Projet</label>
                <input type="text" value={form.projet} onChange={e => setForm(f => ({ ...f, projet: e.target.value }))} className="input-base" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Destination</label>
                <input type="text" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date départ</label>
                <input type="date" value={form.date_depart} onChange={e => setForm(f => ({ ...f, date_depart: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date retour</label>
                <input type="date" value={form.date_retour} onChange={e => setForm(f => ({ ...f, date_retour: e.target.value }))} className="input-base" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Commentaires</label>
                <textarea value={form.commentaires} rows={3} onChange={e => setForm(f => ({ ...f, commentaires: e.target.value }))} className="input-base" />
              </div>
              <div className="sm:col-span-2 flex gap-2 mt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">Annuler</button>
                <button type="submit" className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">{editing ? "Enregistrer" : "Ajouter"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExport && (
        <ExportModal
          title="Exporter — Chauffeurs Pôles"
          cols={exportCols}
          filename="Chauffeurs_Poles"
          onClose={() => setShowExport(false)}
          fetchAll={async () => (await missionChauffeurService.getAll({ ...filters, page: 1, page_size: 9999 })).items}
        />
      )}
    </AppLayout>
  );
}
