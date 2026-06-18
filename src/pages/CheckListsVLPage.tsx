import { useEffect, useState } from "react";
import { Plus, X, Download, Filter, Settings, Pencil, Trash2, ClipboardCheck, Search, ListOrdered, Tag, Layers, BarChart2 } from "lucide-react";
import ExportModal, { ExportColDef } from "@/components/ExportModal";
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/charts";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/contexts/AuthContext";
import { checklistVLService } from "@/services/api";
import type { CheckListVL, FiltresCheckListVL, CheckListVLFilters } from "@/types";

const PAGE_SIZE = 10;

const EMPTY = {
  brand: "", model: "", plaque_immatriculation: "", label: "", car_group: "",
};

const STATUT_STYLES: Record<string, string> = {
  OK: "bg-emerald-500 text-white",
  NON: "bg-red-500 text-white",
  PANNE: "bg-orange-500 text-white",
  "PANNE + VT": "bg-orange-600 text-white",
  GSD: "bg-yellow-400 text-gray-900",
  ACCIDENTEE: "bg-sky-500 text-white",
  "MT NON AFFECTEE": "bg-gray-400 text-white",
};

function StatutBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-gray-300">—</span>;
  const style = STATUT_STYLES[value] ?? "bg-gray-200 text-gray-700";
  return (
    <span className={`inline-flex items-center justify-center w-full px-2 py-1 rounded text-[11px] font-bold ${style}`}>
      {value}
    </span>
  );
}

export default function CheckListsVLPage() {
  const { isViewer } = useAuth();
  const [items, setItems] = useState<CheckListVL[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [semaines, setSemaines] = useState<string[]>([]);
  const [statuts, setStatuts] = useState<string[]>([]);

  const [filtres, setFiltres] = useState<FiltresCheckListVL | null>(null);
  const [filters, setFilters] = useState<CheckListVLFilters>({});
  const [filterModal, setFilterModal] = useState(false);
  const [draft, setDraft] = useState<CheckListVLFilters>({});

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<CheckListVL | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [semainesForm, setSemainesForm] = useState<Record<string, string | null>>({});
  const [manageRow, setManageRow] = useState<CheckListVL | null>(null);

  const [search, setSearch] = useState("");
  const [showCharts, setShowCharts] = useState(false);
  const [allItems, setAllItems] = useState<CheckListVL[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);

  const load = () => {
    setLoading(true);
    checklistVLService.getAll({ ...filters, page, page_size: PAGE_SIZE })
      .then(res => { setItems(res.items); setTotal(res.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, filters]);
  useEffect(() => { checklistVLService.filtres().then(setFiltres).catch(() => {}); }, []);
  useEffect(() => { checklistVLService.semaines().then(setSemaines).catch(() => {}); }, []);
  useEffect(() => { checklistVLService.statuts().then(setStatuts).catch(() => {}); }, []);
  useEffect(() => { setPage(1); }, [filters]);

  const hasFilters = Object.keys(filters).length > 0;

  const openFilterModal = () => { setDraft(filters); setFilterModal(true); };
  const setDraftFilter = (key: keyof CheckListVLFilters, value: string) => {
    setDraft(f => {
      const next = { ...f };
      if (value) (next as any)[key] = value; else delete (next as any)[key];
      return next;
    });
  };
  const applyFilters = () => { setFilters(draft); setFilterModal(false); };
  const resetFilters = () => { setDraft({}); setFilters({}); setFilterModal(false); };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setSemainesForm({});
    setModal(true);
  };
  const openEdit = (c: CheckListVL) => {
    setEditing(c);
    setForm({
      brand: c.brand ?? "",
      model: c.model ?? "",
      plaque_immatriculation: c.plaque_immatriculation,
      label: c.label ?? "",
      car_group: c.car_group ?? "",
    });
    setSemainesForm(c.semaines ?? {});
    setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        brand: form.brand || null,
        model: form.model || null,
        plaque_immatriculation: form.plaque_immatriculation,
        label: form.label || null,
        car_group: form.car_group || null,
        semaines: semainesForm,
      };
      if (editing) {
        await checklistVLService.update(editing.id, payload);
        toast.success("Check-list mise à jour");
      } else {
        await checklistVLService.create(payload);
        toast.success("Check-list ajoutée");
      }
      setModal(false);
      load();
      checklistVLService.filtres().then(setFiltres).catch(() => {});
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  const handleDelete = async (c: CheckListVL) => {
    if (!confirm(`Supprimer la check-list de ${c.plaque_immatriculation} ?`)) return;
    try {
      await checklistVLService.remove(c.id);
      toast.success("Check-list supprimée");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  // Quick status edit
  const [quickEdit, setQuickEdit] = useState<{ item: CheckListVL; semaine: string; current: string | null } | null>(null);
  const [quickSaving, setQuickSaving] = useState(false);

  const handleQuickSave = async (newStatut: string | null) => {
    if (!quickEdit) return;
    setQuickSaving(true);
    try {
      await checklistVLService.update(quickEdit.item.id, {
        brand: quickEdit.item.brand,
        model: quickEdit.item.model,
        plaque_immatriculation: quickEdit.item.plaque_immatriculation,
        label: quickEdit.item.label,
        car_group: quickEdit.item.car_group,
        semaines: { ...(quickEdit.item.semaines ?? {}), [quickEdit.semaine]: newStatut },
      });
      toast.success("Statut mis à jour");
      setQuickEdit(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    } finally {
      setQuickSaving(false);
    }
  };

  const [showExport, setShowExport] = useState(false);
  const exportCols: ExportColDef<CheckListVL>[] = [
    { key: "brand",   header: "Brand",   value: r => r.brand ?? "" },
    { key: "model",   header: "Model",   value: r => r.model ?? "" },
    { key: "plaque",  header: "Plaque",  value: r => r.plaque_immatriculation ?? "" },
    { key: "label",   header: "Label",   value: r => r.label ?? "" },
    { key: "car_group", header: "Car Group", value: r => r.car_group ?? "" },
  ];

  const filteredItems = items.filter(c => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [c.brand, c.model, c.plaque_immatriculation, c.label, c.car_group]
      .some(v => (v ?? "").toLowerCase().includes(q));
  });

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-camublue-900">Suivi des check-lists VL</h1>
          <p className="text-gray-500 text-sm mt-0.5">Suivi hebdomadaire de l'état des véhicules légers</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => {
            setShowCharts(true);
            setLoadingCharts(true);
            checklistVLService.getAll({ page: 1, page_size: 500 })
              .then(r => setAllItems(r.items))
              .catch(() => {})
              .finally(() => setLoadingCharts(false));
          }}
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
        <KpiCard label="Véhicules (total)" value={total} icon={<ListOrdered size={20} />} bg="bg-camublue-900/10" text="text-camublue-900" />
        <KpiCard label="Marques" value={filtres?.brands?.length ?? 0} icon={<Tag size={20} />} bg="bg-emerald-100" text="text-emerald-600" />
        <KpiCard label="Car Groups" value={filtres?.car_groups?.length ?? 0} icon={<Layers size={20} />} bg="bg-amber-100" text="text-amber-600" />
        <KpiCard label="Semaines suivies" value={semaines.length} icon={<ClipboardCheck size={20} />} bg="bg-violet-100" text="text-violet-600" />
      </div>

      <div className="flex justify-center mb-6">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par plaque, marque, modèle…"
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
                  <th className="text-left px-4 py-2.5 font-semibold sticky left-0 bg-camublue-900 z-10">Brand</th>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Model</th>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Reg. №</th>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Label</th>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Car Group</th>
                  {semaines.map(s => (
                    <th key={s} className="text-center px-2 py-2.5 font-semibold whitespace-nowrap">{s.replace("SEMAINE ", "S")}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/60 cursor-pointer" onClick={() => setManageRow(c)}>
                    <td className="px-4 py-2.5 font-semibold text-gray-700 whitespace-nowrap sticky left-0 bg-white">{c.brand || "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{c.model || "—"}</td>
                    <td className="px-4 py-2.5 text-camublue-900 font-medium whitespace-nowrap">{c.plaque_immatriculation}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{c.label || "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{c.car_group || "—"}</td>
                    {semaines.map(s => (
                      <td key={s} className="px-1 py-2.5 text-center min-w-[64px]"
                        onClick={e => { e.stopPropagation(); if (!isViewer) setQuickEdit({ item: c, semaine: s, current: c.semaines?.[s] ?? null }); }}>
                        <span className={!isViewer ? "cursor-pointer hover:opacity-75 transition" : ""}>
                          <StatutBadge value={c.semaines?.[s] ?? null} />
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
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
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Marque (Brand)</label>
                <select value={draft.brand ?? ""} onChange={e => setDraftFilter("brand", e.target.value)} className="input-base">
                  <option value="">Toutes les marques</option>
                  {(filtres?.brands ?? []).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Car Group</label>
                <select value={draft.car_group ?? ""} onChange={e => setDraftFilter("car_group", e.target.value)} className="input-base">
                  <option value="">Tous les groupes</option>
                  {(filtres?.car_groups ?? []).map(g => (
                    <option key={g} value={g}>{g}</option>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><ClipboardCheck size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">{editing ? "Modifier la check-list" : "Ajouter une check-list"}</p>
              </div>
              <button onClick={() => setModal(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Brand</label>
                  <input type="text" value={form.brand}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    className="input-base" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Model</label>
                  <input type="text" value={form.model}
                    onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                    className="input-base" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Plaque d'immatriculation (Reg. №) *</label>
                  <input type="text" required value={form.plaque_immatriculation} disabled={!!editing}
                    onChange={e => setForm(f => ({ ...f, plaque_immatriculation: e.target.value }))}
                    className="input-base disabled:bg-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Label (chauffeur)</label>
                  <input type="text" value={form.label}
                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    className="input-base" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Car Group</label>
                  <input type="text" value={form.car_group}
                    onChange={e => setForm(f => ({ ...f, car_group: e.target.value }))}
                    className="input-base" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Statuts hebdomadaires</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto p-1 border border-gray-100 rounded-xl">
                  {semaines.map(s => (
                    <div key={s}>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-0.5">{s}</label>
                      <select
                        value={semainesForm[s] ?? ""}
                        onChange={e => setSemainesForm(f => ({ ...f, [s]: e.target.value || null }))}
                        className="input-base text-xs py-1.5"
                      >
                        <option value="">—</option>
                        {statuts.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-2">
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
                <p className="text-white font-bold text-sm">Gérer la check-list</p>
              </div>
              <button onClick={() => setManageRow(null)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm space-y-1">
                <p><span className="font-semibold text-gray-700">Plaque :</span> {manageRow.plaque_immatriculation}</p>
                <p><span className="font-semibold text-gray-700">Brand / Model :</span> {manageRow.brand || "—"} / {manageRow.model || "—"}</p>
                <p><span className="font-semibold text-gray-700">Label :</span> {manageRow.label || "—"}</p>
                <p><span className="font-semibold text-gray-700">Car Group :</span> {manageRow.car_group || "—"}</p>
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
      {/* ══ Modal Quick Edit Statut ═══════════════════════════════════════ */}
      {quickEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setQuickEdit(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <ClipboardCheck size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{quickEdit.semaine.replace("SEMAINE ", "S")}</p>
                  <p className="text-white/70 text-xs">{quickEdit.item.plaque_immatriculation} — {quickEdit.item.brand ?? ""} {quickEdit.item.model ?? ""}</p>
                </div>
              </div>
              <button onClick={() => setQuickEdit(null)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <X size={14} className="text-white" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-500 mb-1">Sélectionnez le statut pour cette semaine :</p>
              <div className="grid grid-cols-2 gap-2">
                {statuts.map(st => {
                  const style = STATUT_STYLES[st] ?? "bg-gray-200 text-gray-700";
                  const isActive = quickEdit.current === st;
                  return (
                    <button
                      key={st}
                      disabled={quickSaving}
                      onClick={() => handleQuickSave(st)}
                      className={`flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-bold transition ${style} ${isActive ? "ring-2 ring-offset-2 ring-camublue-900 scale-105" : "opacity-80 hover:opacity-100 hover:scale-105"} disabled:opacity-50`}
                    >
                      {isActive && <span className="mr-1.5">✓</span>}{st}
                    </button>
                  );
                })}
              </div>

              {quickEdit.current && (
                <button
                  disabled={quickSaving}
                  onClick={() => handleQuickSave(null)}
                  className="w-full mt-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-500 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Effacer le statut
                </button>
              )}

              {quickSaving && (
                <p className="text-center text-xs text-gray-400 animate-pulse">Enregistrement…</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showExport && (
        <ExportModal
          title="Exporter — Check-Lists VL"
          cols={exportCols}
          filename="CheckLists_VL"
          onClose={() => setShowExport(false)}
          fetchAll={async () => (await checklistVLService.getAll({ ...filters, page: 1, page_size: 9999 })).items}
        />
      )}

      {/* ══ Modal Graphiques ══════════════════════════════════════════════ */}
      {showCharts && (() => {
        const STATUT_COLORS: Record<string, string> = {
          OK: "#10b981", NON: "#ef4444", PANNE: "#f97316",
          "PANNE + VT": "#ea580c", GSD: "#eab308", ACCIDENTEE: "#0ea5e9",
          "MT NON AFFECTEE": "#9ca3af",
        };
        const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#10b981", "#ef4444", "#eab308"];

        // Statuts globaux (toutes semaines × tous véhicules)
        const statutCount: Record<string, number> = {};
        allItems.forEach(c => {
          Object.values(c.semaines ?? {}).forEach(v => {
            if (v) statutCount[v] = (statutCount[v] || 0) + 1;
          });
        });
        const statutData = Object.entries(statutCount)
          .sort((a, b) => b[1] - a[1])
          .map(([name, value]) => ({ name, value, color: STATUT_COLORS[name] ?? "#9ca3af" }));

        // Par marque
        const parBrand: Record<string, number> = {};
        allItems.forEach(c => { const k = c.brand || "—"; parBrand[k] = (parBrand[k] || 0) + 1; });
        const brandData = Object.entries(parBrand).sort((a, b) => b[1] - a[1])
          .map(([name, value]) => ({ name, value }));

        // Par car group
        const parGroup: Record<string, number> = {};
        allItems.forEach(c => { const k = c.car_group || "—"; parGroup[k] = (parGroup[k] || 0) + 1; });
        const groupData = Object.entries(parGroup).sort((a, b) => b[1] - a[1]).slice(0, 10)
          .map(([name, value]) => ({ name, value }));

        // Dernière semaine disponible
        const derniereSemaine = semaines.length > 0 ? semaines[semaines.length - 1] : null;
        const lastWeekCount: Record<string, number> = {};
        if (derniereSemaine) {
          allItems.forEach(c => {
            const v = c.semaines?.[derniereSemaine] ?? "—";
            lastWeekCount[v] = (lastWeekCount[v] || 0) + 1;
          });
        }
        const lastWeekData = Object.entries(lastWeekCount)
          .sort((a, b) => b[1] - a[1])
          .map(([name, value]) => ({ name, value, color: STATUT_COLORS[name] ?? "#9ca3af" }));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCharts(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><BarChart2 size={18} className="text-white" /></div>
                  <div>
                    <p className="text-white font-bold text-sm">Statistiques — Check-lists VL</p>
                    <p className="text-white/70 text-xs">{allItems.length} véhicule(s) · {semaines.length} semaine(s) suivie(s)</p>
                  </div>
                </div>
                <button onClick={() => setShowCharts(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-6 space-y-8">
                {loadingCharts ? (
                  <p className="text-center text-gray-400 py-16">Chargement des données…</p>
                ) : (
                  <>
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Barres statuts globaux */}
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm font-bold text-camublue-900 mb-1">Répartition globale des statuts</p>
                        <p className="text-xs text-gray-400 mb-4">Toutes semaines et tous véhicules confondus</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={statutData} layout="vertical" margin={{ left: 8, right: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                            <RTooltip formatter={(v: number) => [`${v} occurrence(s)`, ""]} />
                            <Bar dataKey="value" name="Occurrences" radius={[0, 4, 4, 0]}
                              label={{ position: "right", fontSize: 11, fill: "#6b7280", formatter: (v: number) => v }}>
                              {statutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Statuts dernière semaine */}
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm font-bold text-camublue-900 mb-1">
                          Statuts {derniereSemaine ? `— ${derniereSemaine}` : ""}
                        </p>
                        <p className="text-xs text-gray-400 mb-4">Répartition sur la dernière semaine disponible</p>
                        {lastWeekData.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-8">Aucune donnée disponible.</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={lastWeekData} margin={{ left: 8, right: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                              <RTooltip formatter={(v: number) => [`${v} véhicule(s)`, ""]} />
                              <Bar dataKey="value" name="Véhicules" radius={[4, 4, 0, 0]}>
                                {lastWeekData.map((d, i) => <Cell key={i} fill={d.color} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Par marque */}
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm font-bold text-camublue-900 mb-4">Véhicules par marque (Brand)</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={brandData} layout="vertical" margin={{ left: 8, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                            <RTooltip formatter={(v: number) => [`${v} véhicule(s)`, ""]} />
                            <Bar dataKey="value" name="Véhicules" radius={[0, 4, 4, 0]}>
                              {brandData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Par car group */}
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm font-bold text-camublue-900 mb-4">Véhicules par Car Group (top 10)</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={groupData} layout="vertical" margin={{ left: 8, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                            <RTooltip formatter={(v: number) => [`${v} véhicule(s)`, ""]} />
                            <Bar dataKey="value" name="Véhicules" radius={[0, 4, 4, 0]}>
                              {groupData.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
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
