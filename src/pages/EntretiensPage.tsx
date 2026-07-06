import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Wrench, Download, Filter, Settings, Search, ShieldCheck, AlertTriangle, BarChart2 } from "lucide-react";
import ExportModal, { ExportColDef } from "@/components/ExportModal";
import {
  Cell, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/charts";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/contexts/AuthContext";
import { entretienService } from "@/services/api";
import type { EntretienVehicule } from "@/types";
import ChartFilterBar, { ChartFilter, CHART_FILTER_EMPTY } from "@/components/ChartFilterBar";


const EMPTY: Partial<EntretienVehicule> = {
  type_location: "", fournisseur: "", type_vehicule: "", plaque_immatriculation: "",
  nom_chauffeur: "", paliers: {},
};

export default function EntretiensPage() {
  const { isViewer } = useAuth();
  const [entretiens, setEntretiens] = useState<EntretienVehicule[]>([]);
  const [paliers, setPaliers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<EntretienVehicule | null>(null);
  const [form, setForm] = useState<Partial<EntretienVehicule>>(EMPTY);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [manageRow, setManageRow] = useState<EntretienVehicule | null>(null);
  const [search, setSearch] = useState("");
  const [chartFilter, setChartFilter] = useState<ChartFilter>(CHART_FILTER_EMPTY);
  const [showCharts, setShowCharts] = useState(false);

  // Filtres client-side
  const [filterModal, setFilterModal] = useState(false);
  const [filters, setFilters] = useState<{ type_location?: string; fournisseur?: string; type_vehicule?: string }>({});
  const [draft, setDraft] = useState<typeof filters>({});

  const load = () => {
    setLoading(true);
    Promise.all([entretienService.getAll(), entretienService.getPaliers()])
      .then(([e, p]) => { setEntretiens(e); setPaliers(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Options dérivées des données
  const optTypes     = [...new Set(entretiens.map(e => e.type_location).filter(Boolean))] as string[];
  const optFourn     = [...new Set(entretiens.map(e => e.fournisseur).filter(Boolean))] as string[];
  const optVehicules = [...new Set(entretiens.map(e => e.type_vehicule).filter(Boolean))] as string[];

  const hasFilters = Object.keys(filters).length > 0;
  const openFilterModal = () => { setDraft(filters); setFilterModal(true); };
  const applyFilters  = () => { setFilters(draft); setFilterModal(false); };
  const resetFilters  = () => { setDraft({}); setFilters({}); setFilterModal(false); };

  const filtered = entretiens.filter(e => {
    if (filters.type_location && e.type_location !== filters.type_location) return false;
    if (filters.fournisseur   && e.fournisseur   !== filters.fournisseur)   return false;
    if (filters.type_vehicule && e.type_vehicule !== filters.type_vehicule) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [e.plaque_immatriculation, e.nom_chauffeur, e.fournisseur, e.type_vehicule, e.type_location]
      .some(v => (v ?? "").toLowerCase().includes(q));
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedEntretiens = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [pageCount, page]);
  useEffect(() => { setPage(1); }, [search, filters]);


  const openCharts = () => setShowCharts(true);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY, paliers: {} }); setModal(true); };
  const openEdit = (e: EntretienVehicule) => { setEditing(e); setForm({ ...e, paliers: { ...e.paliers } }); setModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await entretienService.update(editing.id, form);
        toast.success("Suivi d'entretien mis à jour");
      } else {
        await entretienService.create(form);
        toast.success("Suivi d'entretien ajouté");
      }
      setModal(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  const handleDelete = async (e: EntretienVehicule) => {
    if (!confirm(`Supprimer le suivi d'entretien du véhicule ${e.plaque_immatriculation} ?`)) return;
    try {
      await entretienService.remove(e.id);
      toast.success("Suivi d'entretien supprimé");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  // Quick cell edit
  const [quickEdit, setQuickEdit] = useState<{
    entry: EntretienVehicule;
    field: "palier";
    palierKm?: number;
    label: string;
    current: number | null;
  } | null>(null);
  const [quickValue, setQuickValue] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  const openQuickEdit = (
    e: React.MouseEvent,
    entry: EntretienVehicule,
    field: "palier",
    label: string,
    current: number | null,
    palierKm?: number,
  ) => {
    e.stopPropagation();
    if (isViewer) return;
    setQuickEdit({ entry, field, palierKm, label, current });
    setQuickValue(current != null ? String(current) : "");
  };

  const handleQuickSave = async () => {
    if (!quickEdit) return;
    setQuickSaving(true);
    const numVal = quickValue === "" ? null : Number(quickValue);
    try {
      const { entry, field, palierKm } = quickEdit;
      const payload: Partial<EntretienVehicule> = {
        ...entry,
        paliers: palierKm != null
          ? { ...(entry.paliers ?? {}), [String(palierKm)]: numVal }
          : entry.paliers,
      };
      await entretienService.update(entry.id, payload);
      toast.success("Valeur mise à jour");
      setQuickEdit(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    } finally {
      setQuickSaving(false);
    }
  };

  const [showExport, setShowExport] = useState(false);
  const exportCols: ExportColDef<EntretienVehicule>[] = [
    { key: "type_location",        header: "Type location", value: r => r.type_location ?? "" },
    { key: "fournisseur",          header: "Fournisseur",   value: r => r.fournisseur ?? "" },
    { key: "type_vehicule",        header: "Type véhicule", value: r => r.type_vehicule ?? "" },
    { key: "plaque_immatriculation", header: "Plaque",      value: r => r.plaque_immatriculation ?? "" },
    { key: "nom_chauffeur",        header: "Chauffeur",     value: r => r.nom_chauffeur ?? "" },
  ];

  const setPalierValue = (km: number, value: string) => {
    setForm(f => ({
      ...f,
      paliers: { ...(f.paliers ?? {}), [String(km)]: value === "" ? null : Number(value) },
    }));
  };

  return (
    <AppLayout>
      <div className="mb-8 sticky top-0 z-20 bg-camugray-100 -mx-4 px-4 md:-mx-8 md:px-8 pt-1 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-camublue-900">Entretiens — Suivi par palier kilométrique</h1>
            <p className="text-gray-500 text-sm mt-0.5">Contrat d'entretien CAMUSAT — 100 000 km ou 03 ans, intervalle 7 500 km</p>
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Véhicules suivis" value={entretiens.length} icon={<Wrench size={20} />} bg="bg-camublue-900/10" text="text-camublue-900" />
        <KpiCard label="Fournisseurs" value={[...new Set(entretiens.map(e => e.fournisseur).filter(Boolean))].length} icon={<ShieldCheck size={20} />} bg="bg-emerald-100" text="text-emerald-600" />
        <KpiCard label="Types de véhicule" value={[...new Set(entretiens.map(e => e.type_vehicule).filter(Boolean))].length} icon={<AlertTriangle size={20} />} bg="bg-amber-100" text="text-amber-600" />
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
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 p-6 text-center">Aucun suivi d'entretien trouvé.</p>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
            <table className="w-full text-sm">
              <thead className="bg-camublue-900 text-white text-xs uppercase sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Statut</th>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Fournisseur</th>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Type véhicule</th>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Plaque</th>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Chauffeur</th>
                  {paliers.map(km => (
                    <th key={km} className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">{km.toLocaleString("fr-FR")}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedEntretiens.map(e => {
                  return (
                  <tr key={e.id} className="hover:bg-gray-50/60 cursor-pointer" onClick={() => setManageRow(e)}>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {e.type_location ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{e.type_location}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{e.fournisseur || "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{e.type_vehicule || "—"}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5"><Wrench size={13} className="text-gray-400" />{e.plaque_immatriculation}</div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{e.nom_chauffeur || "—"}</td>
                    {paliers.map(km => {
                      const v = e.paliers?.[String(km)];
                      return (
                        <td key={km} className="px-1 py-1 text-right whitespace-nowrap"
                          onClick={ev => openQuickEdit(ev, e, "palier", `Palier ${km.toLocaleString("fr-FR")} km`, v != null ? Number(v) : null, km)}>
                          {v != null ? (
                            <span className={`inline-block w-full px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 font-medium ${!isViewer ? "cursor-pointer hover:ring-2 hover:ring-emerald-400 transition" : ""}`}>
                              {Number(v).toLocaleString("fr-FR")}
                            </span>
                          ) : (
                            <span className={`inline-block w-full px-2 py-1 rounded-md bg-gray-50 text-gray-300 ${!isViewer ? "cursor-pointer hover:bg-gray-100 hover:text-gray-400 transition" : ""}`}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} />
      </div>

      {/* ══ Modal Ajout/Édition ════════════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Wrench size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">{editing ? "Modifier le suivi d'entretien" : "Ajouter un suivi d'entretien"}</p>
              </div>
              <button onClick={() => setModal(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Plaque d'immatriculation *" value={form.plaque_immatriculation ?? ""} onChange={v => setForm(f => ({ ...f, plaque_immatriculation: v }))} required />
                <Field label="Type de véhicule" value={form.type_vehicule ?? ""} onChange={v => setForm(f => ({ ...f, type_vehicule: v }))} />
                <Field label="Fournisseur" value={form.fournisseur ?? ""} onChange={v => setForm(f => ({ ...f, fournisseur: v }))} />
                <Field label="Statut" value={form.type_location ?? ""} onChange={v => setForm(f => ({ ...f, type_location: v }))} />
                <Field label="Chauffeur" value={form.nom_chauffeur ?? ""} onChange={v => setForm(f => ({ ...f, nom_chauffeur: v }))} />
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Paliers (km relevés en atelier)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {paliers.map(km => (
                    <div key={km}>
                      <label className="block text-[11px] text-gray-500 mb-1">{km.toLocaleString("fr-FR")} km</label>
                      <input
                        type="number"
                        value={form.paliers?.[String(km)] ?? ""}
                        onChange={ev => setPalierValue(km, ev.target.value)}
                        className="input-base"
                      />
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

      {/* ══ Modal Filtres ══════════════════════════════════════════ */}
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
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Statut (type location)</label>
                <select value={draft.type_location ?? ""} onChange={e => setDraft(d => ({ ...d, type_location: e.target.value || undefined }))} className="input-base">
                  <option value="">Tous</option>
                  {optTypes.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fournisseur</label>
                <select value={draft.fournisseur ?? ""} onChange={e => setDraft(d => ({ ...d, fournisseur: e.target.value || undefined }))} className="input-base">
                  <option value="">Tous les fournisseurs</option>
                  {optFourn.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type de véhicule</label>
                <select value={draft.type_vehicule ?? ""} onChange={e => setDraft(d => ({ ...d, type_vehicule: e.target.value || undefined }))} className="input-base">
                  <option value="">Tous les types</option>
                  {optVehicules.map(v => <option key={v} value={v}>{v}</option>)}
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

      {/* ══ Modal Gérer ════════════════════════════════════════════ */}
      {manageRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setManageRow(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Settings size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">Gérer le suivi d'entretien</p>
              </div>
              <button onClick={() => setManageRow(null)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm space-y-1">
                <p><span className="font-semibold text-gray-700">Plaque :</span> {manageRow.plaque_immatriculation}</p>
                <p><span className="font-semibold text-gray-700">Type véhicule :</span> {manageRow.type_vehicule || "—"}</p>
                <p><span className="font-semibold text-gray-700">Fournisseur :</span> {manageRow.fournisseur || "—"}</p>
                <p><span className="font-semibold text-gray-700">Chauffeur :</span> {manageRow.nom_chauffeur || "—"}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { const e = manageRow; setManageRow(null); openEdit(e); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">
                  <Pencil size={14} /> Mise à jour
                </button>
                <button
                  onClick={() => { const e = manageRow; setManageRow(null); handleDelete(e); }}
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
            <div className="bg-camublue-900 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Wrench size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{quickEdit.label}</p>
                  <p className="text-white/70 text-xs">{quickEdit.entry.plaque_immatriculation}</p>
                </div>
              </div>
              <button onClick={() => setQuickEdit(null)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <X size={14} className="text-white" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Valeur (km)</label>
                <input
                  type="number"
                  autoFocus
                  value={quickValue}
                  onChange={e => setQuickValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleQuickSave(); if (e.key === "Escape") setQuickEdit(null); }}
                  placeholder="ex: 45000"
                  className="input-base w-full text-right text-lg font-semibold"
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
          title="Exporter — Entretiens"
          cols={exportCols}
          filename="Entretiens"
          onClose={() => setShowExport(false)}
          fetchAll={async () => entretiens}
        />
      )}

      {/* ══ Modal Graphiques ══════════════════════════════════════════════ */}
      {showCharts && (() => {
        const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];


        // Par fournisseur
        const parFourn: Record<string, number> = {};
        entretiens.forEach(e => { const k = e.fournisseur || "—"; parFourn[k] = (parFourn[k] || 0) + 1; });
        const fournData = Object.entries(parFourn)
          .sort((a, b) => b[1] - a[1])
          .map(([name, value]) => ({ name, value }));

        // Par type de véhicule
        const parType: Record<string, number> = {};
        entretiens.forEach(e => { const k = e.type_vehicule || "—"; parType[k] = (parType[k] || 0) + 1; });
        const typeData = Object.entries(parType)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, value]) => ({ name, value }));


        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCharts(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-camublue-900 px-5 py-3 flex items-center gap-3 flex-wrap sticky top-0 z-10">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <BarChart2 size={16} className="text-white" />
                </div>
                <p className="text-white font-bold text-sm shrink-0">Statistiques — Entretiens</p>
                <div className="flex-1 flex justify-center">
                  <ChartFilterBar filter={chartFilter} onChange={setChartFilter} />
                </div>
                <button onClick={() => setShowCharts(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition shrink-0 ml-auto">
                  <X size={14} className="text-white" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Par type de véhicule */}
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-sm font-bold text-camublue-900 mb-4">Véhicules par type</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={typeData} margin={{ left: 8, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <RTooltip formatter={(v: number) => [`${v} véhicule(s)`, ""]} />
                        <Bar dataKey="value" name="Véhicules" radius={[4, 4, 0, 0]}>
                          {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Par fournisseur */}
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-sm font-bold text-camublue-900 mb-4">Véhicules par fournisseur</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={fournData} layout="vertical" margin={{ left: 8, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                        <RTooltip formatter={(v: number) => [`${v} véhicule(s)`, ""]} />
                        <Bar dataKey="value" name="Véhicules" radius={[0, 4, 4, 0]}>
                          {fournData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                </div>
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

function Field({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="input-base"
      />
    </div>
  );
}
