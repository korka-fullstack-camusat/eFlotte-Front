import { useEffect, useState } from "react";
import { Plus, X, Download, Filter, Settings, Pencil, Trash2, FileText, Search, ListOrdered, Building2, ClipboardList, BarChart2 } from "lucide-react";
import ExportModal, { ExportColDef } from "@/components/ExportModal";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, Cell, PieChart, Pie, Legend,
} from "recharts";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/charts";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/contexts/AuthContext";
import { suiviDevisService } from "@/services/api";
import type { SuiviDevis, FiltresDevis, DevisFilters } from "@/types";
import ChartFilterBar, { ChartFilter, CHART_FILTER_EMPTY, applyChartFilter } from "@/components/ChartFilterBar";

const PAGE_SIZE = 10;

const EMPTY = {
  descriptions: "", numero_devis: "", valeur_devis: "", date: "", montant: "",
  sous_traitant: "", matricule: "", code_snc: "", po_emis: "",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [annee, mois, jour] = iso.split("-");
  return `${jour}/${mois}/${annee}`;
}

function formatMontant(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return `${v.toLocaleString("fr-FR")} CFA`;
}

const GROUP_BY_OPTIONS: { value: keyof SuiviDevis; label: string }[] = [
  { value: "sous_traitant", label: "Sous-traitant / Suppliers" },
  { value: "descriptions", label: "Description" },
  { value: "po_emis", label: "PO Emis" },
  { value: "code_snc", label: "Code SNC" },
];

export default function SuiviDevisPage() {
  const { isViewer } = useAuth();
  const [items, setItems] = useState<SuiviDevis[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [filtres, setFiltres] = useState<FiltresDevis | null>(null);
  const [filters, setFilters] = useState<DevisFilters>({});
  const [filterModal, setFilterModal] = useState(false);
  const [draft, setDraft] = useState<DevisFilters>({});

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<SuiviDevis | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [manageRow, setManageRow] = useState<SuiviDevis | null>(null);

  const [search, setSearch] = useState("");

  const [chartFilter, setChartFilter] = useState<ChartFilter>(CHART_FILTER_EMPTY);

  const [showCharts, setShowCharts] = useState(false);
  const [chartItems, setChartItems] = useState<SuiviDevis[]>([]);
  const [rawChartItems, setRawChartItems] = useState<SuiviDevis[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);

  const load = () => {
    setLoading(true);
    suiviDevisService.getAll({ ...filters, page, page_size: PAGE_SIZE })
      .then(res => { setItems(res.items); setTotal(res.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, filters]);
  useEffect(() => { suiviDevisService.filtres().then(setFiltres).catch(() => {}); }, []);
  useEffect(() => { setPage(1); }, [filters]);

  const hasFilters = Object.keys(filters).length > 0;

  const openCharts = () => {
    setShowCharts(true);
    setLoadingCharts(true);
    suiviDevisService.getAll({ page: 1, page_size: 9999 })
      .then(res => { setRawChartItems(res.items); setChartItems(applyChartFilter(res.items, chartFilter, r => r.date)); })
      .catch(() => {})
      .finally(() => setLoadingCharts(false));
  };

  useEffect(() => {
    if (!showCharts || rawChartItems.length === 0) return;
    setChartItems(applyChartFilter(rawChartItems, chartFilter, r => r.date));
  }, [chartFilter]);

  const openFilterModal = () => { setDraft(filters); setFilterModal(true); };
  const setDraftFilter = (key: keyof DevisFilters, value: string) => {
    setDraft(f => {
      const next = { ...f };
      if (value) (next as any)[key] = value; else delete (next as any)[key];
      return next;
    });
  };
  const applyFilters = () => { setFilters(draft); setFilterModal(false); };
  const resetFilters = () => { setDraft({}); setFilters({}); setFilterModal(false); };

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (d: SuiviDevis) => {
    setEditing(d);
    setForm({
      descriptions: d.descriptions ?? "",
      numero_devis: d.numero_devis ?? "",
      valeur_devis: d.valeur_devis?.toString() ?? "",
      date: d.date?.slice(0, 10) ?? "",
      montant: d.montant?.toString() ?? "",
      sous_traitant: d.sous_traitant ?? "",
      matricule: d.matricule ?? "",
      code_snc: d.code_snc ?? "",
      po_emis: d.po_emis ?? "",
    });
    setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        descriptions: form.descriptions || null,
        numero_devis: form.numero_devis || null,
        valeur_devis: form.valeur_devis ? Number(form.valeur_devis) : null,
        date: form.date || null,
        montant: form.montant ? Number(form.montant) : null,
        sous_traitant: form.sous_traitant || null,
        matricule: form.matricule || null,
        code_snc: form.code_snc || null,
        po_emis: form.po_emis || null,
      };
      if (editing) {
        await suiviDevisService.update(editing.id, payload);
        toast.success("Devis mis à jour");
      } else {
        await suiviDevisService.create(payload);
        toast.success("Devis ajouté");
      }
      setModal(false);
      load();
      suiviDevisService.filtres().then(setFiltres).catch(() => {});
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  const handleDelete = async (d: SuiviDevis) => {
    if (!confirm(`Supprimer ce devis (${d.numero_devis ?? d.descriptions ?? "—"}) ?`)) return;
    try {
      await suiviDevisService.remove(d.id);
      toast.success("Devis supprimé");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  // ── Quick Edit ─────────────────────────────────────────────────────────
  type QuickEditField = "numero_devis" | "valeur_devis" | "date" | "montant" | "sous_traitant" | "matricule" | "code_snc" | "po_emis";
  const [quickEdit, setQuickEdit] = useState<{
    item: SuiviDevis; field: QuickEditField; label: string; type: "text" | "number" | "date";
  } | null>(null);
  const [quickValue, setQuickValue] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  const openQuickEdit = (
    e: React.MouseEvent, item: SuiviDevis,
    field: QuickEditField, label: string, type: "text" | "number" | "date" = "text",
  ) => {
    e.stopPropagation();
    if (isViewer) return;
    const raw = item[field];
    const cur = raw != null ? String(raw).slice(0, 10) : "";
    setQuickEdit({ item, field, label, type });
    setQuickValue(cur);
  };

  const handleQuickSave = async () => {
    if (!quickEdit) return;
    setQuickSaving(true);
    const { item, field, type } = quickEdit;
    const payload: any = {
      [field]: quickValue === "" ? null : (type === "number" ? Number(quickValue) : quickValue),
    };
    try {
      await suiviDevisService.update(item.id, payload);
      toast.success("Mis à jour");
      setQuickEdit(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    } finally {
      setQuickSaving(false);
    }
  };

  const [showExport, setShowExport] = useState(false);
  const exportCols: ExportColDef<SuiviDevis>[] = [
    { key: "descriptions",  header: "Descriptions",           value: r => r.descriptions ?? "" },
    { key: "numero_devis",  header: "N° Devis",               value: r => r.numero_devis ?? "" },
    { key: "valeur_devis",  header: "Valeur devis",            value: r => r.valeur_devis ?? "" },
    { key: "date",          header: "Date",                    value: r => r.date?.slice(0, 10) ?? "" },
    { key: "montant",       header: "Montant",                 value: r => r.montant ?? "" },
    { key: "sous_traitant", header: "Sous-traitant/Suppliers", value: r => r.sous_traitant ?? "" },
    { key: "matricule",     header: "Matricule",               value: r => r.matricule ?? "" },
    { key: "code_snc",      header: "Code SNC",                value: r => r.code_snc ?? "" },
    { key: "po_emis",       header: "PO Emis",                 value: r => r.po_emis ?? "" },
  ];

  const filteredItems = items.filter(d => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [d.descriptions, d.numero_devis, d.sous_traitant, d.matricule, d.code_snc, d.po_emis]
      .some(v => (v ?? "").toLowerCase().includes(q));
  });


  return (
    <AppLayout>
      <div className="mb-8 sticky top-0 z-20 bg-camugray-100 -mx-4 px-4 md:-mx-8 md:px-8 pt-1 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-camublue-900">Suivi des devis</h1>
            <p className="text-gray-500 text-sm mt-0.5">Suivi des devis, montants et PO de la flotte</p>
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
        <KpiCard label="Devis (total)" value={total} icon={<ListOrdered size={20} />} bg="bg-camublue-900/10" text="text-camublue-900" />
        <KpiCard label="Sous-traitants" value={filtres?.sous_traitants?.length ?? 0} icon={<Building2 size={20} />} bg="bg-emerald-100" text="text-emerald-600" />
        <KpiCard label="Descriptions" value={filtres?.descriptions?.length ?? 0} icon={<FileText size={20} />} bg="bg-amber-100" text="text-amber-600" />
        <KpiCard label="Statuts PO" value={filtres?.po_emis?.length ?? 0} icon={<ClipboardList size={20} />} bg="bg-violet-100" text="text-violet-600" />
      </div>

      <div className="flex justify-center mb-6">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par devis, sous-traitant, matricule…"
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
                  <th className="text-left px-4 py-2.5 font-semibold">Descriptions</th>
                  <th className="text-left px-4 py-2.5 font-semibold">N° Devis</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Valeur devis</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Montant</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Sous-traitant/Suppliers</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Matricule</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Code SNC</th>
                  <th className="text-left px-4 py-2.5 font-semibold">PO Emis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map(d => {
                  const qTd = "px-4 py-2.5 text-gray-600 whitespace-nowrap";
                  const qSpan = !isViewer ? "cursor-pointer hover:text-camublue-900 hover:underline transition" : "";
                  return (
                  <tr key={d.id} className="hover:bg-gray-50/60">
                    {/* Descriptions — ouvre modal Gérer */}
                    <td className="px-4 py-2.5 font-semibold text-gray-700 whitespace-nowrap cursor-pointer"
                      onClick={() => setManageRow(d)}>
                      <span className="hover:underline hover:text-camublue-900">{d.descriptions || "—"}</span>
                    </td>
                    <td className={qTd} onClick={e => openQuickEdit(e, d, "numero_devis", "N° Devis")}>
                      <span className={qSpan}>{d.numero_devis || "—"}</span>
                    </td>
                    <td className={qTd} onClick={e => openQuickEdit(e, d, "valeur_devis", "Valeur devis (HTVA)", "number")}>
                      <span className={qSpan}>{formatMontant(d.valeur_devis)}</span>
                    </td>
                    <td className={qTd} onClick={e => openQuickEdit(e, d, "date", "Date", "date")}>
                      <span className={qSpan}>{formatDate(d.date)}</span>
                    </td>
                    <td className={qTd} onClick={e => openQuickEdit(e, d, "montant", "Montant", "number")}>
                      <span className={qSpan}>{formatMontant(d.montant)}</span>
                    </td>
                    <td className={qTd} onClick={e => openQuickEdit(e, d, "sous_traitant", "Sous-traitant / Suppliers")}>
                      <span className={qSpan}>{d.sous_traitant || "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-camublue-900 font-medium whitespace-nowrap"
                      onClick={e => openQuickEdit(e, d, "matricule", "Matricule")}>
                      <span className={qSpan}>{d.matricule || "—"}</span>
                    </td>
                    <td className={qTd} onClick={e => openQuickEdit(e, d, "code_snc", "Code SNC")}>
                      <span className={qSpan}>{d.code_snc || "—"}</span>
                    </td>
                    <td className={qTd} onClick={e => openQuickEdit(e, d, "po_emis", "PO Emis")}>
                      <span className={qSpan}>{d.po_emis || "—"}</span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

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
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
                <select value={draft.descriptions ?? ""} onChange={e => setDraftFilter("descriptions", e.target.value)} className="input-base">
                  <option value="">Toutes les descriptions</option>
                  {(filtres?.descriptions ?? []).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sous-traitant / Suppliers</label>
                <select value={draft.sous_traitant ?? ""} onChange={e => setDraftFilter("sous_traitant", e.target.value)} className="input-base">
                  <option value="">Tous les sous-traitants</option>
                  {(filtres?.sous_traitants ?? []).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">PO Emis</label>
                <select value={draft.po_emis ?? ""} onChange={e => setDraftFilter("po_emis", e.target.value)} className="input-base">
                  <option value="">Tous les statuts PO</option>
                  {(filtres?.po_emis ?? []).map(p => (
                    <option key={p} value={p}>{p}</option>
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
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><FileText size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">{editing ? "Modifier le devis" : "Ajouter un devis"}</p>
              </div>
              <button onClick={() => setModal(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
                <input type="text" value={form.descriptions}
                  onChange={e => setForm(f => ({ ...f, descriptions: e.target.value }))}
                  className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">N° Devis</label>
                <input type="text" value={form.numero_devis}
                  onChange={e => setForm(f => ({ ...f, numero_devis: e.target.value }))}
                  className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Valeur devis (HTVA)</label>
                <input type="number" step="any" value={form.valeur_devis}
                  onChange={e => setForm(f => ({ ...f, valeur_devis: e.target.value }))}
                  className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Montant</label>
                <input type="number" step="any" value={form.montant}
                  onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                  className="input-base" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sous-traitant / Suppliers</label>
                <input type="text" value={form.sous_traitant}
                  onChange={e => setForm(f => ({ ...f, sous_traitant: e.target.value }))}
                  className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Matricule</label>
                <input type="text" value={form.matricule}
                  onChange={e => setForm(f => ({ ...f, matricule: e.target.value }))}
                  className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Code SNC</label>
                <input type="text" value={form.code_snc}
                  onChange={e => setForm(f => ({ ...f, code_snc: e.target.value }))}
                  className="input-base" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">PO Emis</label>
                <input type="text" value={form.po_emis}
                  onChange={e => setForm(f => ({ ...f, po_emis: e.target.value }))}
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
                <p className="text-white font-bold text-sm">Gérer le devis</p>
              </div>
              <button onClick={() => setManageRow(null)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm space-y-1">
                <p><span className="font-semibold text-gray-700">Description :</span> {manageRow.descriptions || "—"}</p>
                <p><span className="font-semibold text-gray-700">N° Devis :</span> {manageRow.numero_devis || "—"}</p>
                <p><span className="font-semibold text-gray-700">Matricule :</span> {manageRow.matricule || "—"}</p>
                <p><span className="font-semibold text-gray-700">Montant :</span> {formatMontant(manageRow.montant)}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { const d = manageRow; setManageRow(null); openEdit(d); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">
                  <Pencil size={14} /> Mise à jour
                </button>
                <button
                  onClick={() => { const d = manageRow; setManageRow(null); handleDelete(d); }}
                  className="flex-1 flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl py-2.5 text-sm font-semibold transition">
                  <Trash2 size={14} /> Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ══ Modal Quick Edit ══════════════════════════════════════════════ */}
      {quickEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setQuickEdit(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-sm">{quickEdit.label}</p>
                <p className="text-white/70 text-xs">{quickEdit.item.descriptions || quickEdit.item.numero_devis || "—"}</p>
              </div>
              <button onClick={() => setQuickEdit(null)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <X size={14} className="text-white" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nouvelle valeur</label>
                <input
                  autoFocus
                  type={quickEdit.type}
                  value={quickValue}
                  onChange={e => setQuickValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleQuickSave(); if (e.key === "Escape") setQuickEdit(null); }}
                  className="input-base w-full"
                  placeholder={quickEdit.type === "number" ? "ex: 150000" : ""}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setQuickEdit(null)}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                  Annuler
                </button>
                <button onClick={handleQuickSave} disabled={quickSaving}
                  className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-50">
                  {quickSaving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExport && (
        <ExportModal
          title="Exporter — Suivi Devis"
          cols={exportCols}
          filename="Suivi_Devis"
          onClose={() => setShowExport(false)}
          fetchAll={async () => (await suiviDevisService.getAll({ ...filters, page: 1, page_size: 9999 })).items}
        />
      )}

      {/* ══ Modal Graphiques ══════════════════════════════════════════════ */}
      {showCharts && (() => {
        const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#10b981", "#ef4444", "#eab308", "#0ea5e9"];

        const fmt = (v: number) => `${v.toLocaleString("fr-FR")} CFA`;

        // Montants par sous-traitant (top 8)
        const soustMap: Record<string, number> = {};
        chartItems.forEach(d => { const k = d.sous_traitant || "—"; soustMap[k] = (soustMap[k] || 0) + (d.montant ?? 0); });
        const soustData = Object.entries(soustMap).sort((a, b) => b[1] - a[1]).slice(0, 8)
          .map(([name, value]) => ({ name, value }));

        // Montants par description (top 8)
        const descMap: Record<string, number> = {};
        chartItems.forEach(d => { const k = d.descriptions || "—"; descMap[k] = (descMap[k] || 0) + (d.montant ?? 0); });
        const descData = Object.entries(descMap).sort((a, b) => b[1] - a[1]).slice(0, 8)
          .map(([name, value]) => ({ name, value }));

        // Répartition PO Emis (donut)
        const poMap: Record<string, number> = {};
        chartItems.forEach(d => { const k = d.po_emis || "—"; poMap[k] = (poMap[k] || 0) + 1; });
        const poData = Object.entries(poMap).sort((a, b) => b[1] - a[1])
          .map(([name, value]) => ({ name, value }));

        // Top 8 matricules par montant
        const matricMap: Record<string, number> = {};
        chartItems.forEach(d => { if (d.matricule) matricMap[d.matricule] = (matricMap[d.matricule] || 0) + (d.montant ?? 0); });
        const matricData = Object.entries(matricMap).sort((a, b) => b[1] - a[1]).slice(0, 8)
          .map(([name, value]) => ({ name, value }));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCharts(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-camublue-900 px-5 py-3 flex items-center gap-3 flex-wrap sticky top-0 z-10">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <BarChart2 size={16} className="text-white" />
                </div>
                <p className="text-white font-bold text-sm shrink-0">Statistiques — Suivi des Devis</p>
                <div className="flex-1 flex justify-center">
                  <ChartFilterBar filter={chartFilter} onChange={setChartFilter} />
                </div>
                <button onClick={() => setShowCharts(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition shrink-0 ml-auto">
                  <X size={14} className="text-white" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-6 space-y-8">
                {loadingCharts ? (
                  <p className="text-center text-gray-400 py-16">Chargement des données…</p>
                ) : (
                  <>
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Montants par sous-traitant */}
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm font-bold text-camublue-900 mb-4">Montants par sous-traitant (top 8)</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={soustData} layout="vertical" margin={{ left: 8, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                            <RTooltip formatter={(v: number) => [fmt(v), ""]} />
                            <Bar dataKey="value" name="Montant" radius={[0, 4, 4, 0]}>
                              {soustData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Répartition PO Emis */}
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm font-bold text-camublue-900 mb-4">Répartition par statut PO Emis</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={poData.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                            <RTooltip formatter={(v: number) => [`${v} devis`, ""]} />
                            <Bar dataKey="value" name="Devis" radius={[0, 4, 4, 0]}
                              label={{ position: "right", fontSize: 11, fill: "#6b7280" }}>
                              {poData.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Montants par description */}
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm font-bold text-camublue-900 mb-4">Montants par description (top 8)</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={descData} layout="vertical" margin={{ left: 8, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                            <RTooltip formatter={(v: number) => [fmt(v), ""]} />
                            <Bar dataKey="value" name="Montant" radius={[0, 4, 4, 0]}>
                              {descData.map((_, i) => <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Montants par matricule */}
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm font-bold text-camublue-900 mb-4">Montants par matricule (top 8)</p>
                        {matricData.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-8">Aucune donnée disponible.</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={Math.max(220, matricData.length * 32)}>
                            <BarChart data={matricData} layout="vertical" margin={{ left: 8, right: 50 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                              <YAxis type="category" dataKey="name" width={110}
                                tick={({ x, y, payload }) => (
                                  <text x={x} y={y} dy={4} textAnchor="end" fontSize={10} fill="#6b7280">
                                    {String(payload.value).length > 14 ? String(payload.value).slice(0, 14) + "…" : payload.value}
                                  </text>
                                )}
                              />
                              <RTooltip formatter={(v: number) => [fmt(v), ""]} labelFormatter={(l) => String(l)} />
                              <Bar dataKey="value" name="Montant" radius={[0, 4, 4, 0]}
                                label={{ position: "right", fontSize: 10, fill: "#6b7280", formatter: (v: number) => `${(v/1000).toFixed(0)}k` }}>
                                {matricData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex justify-end">
                <button onClick={() => setShowCharts(false)}
                  className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </AppLayout>
  );
}
