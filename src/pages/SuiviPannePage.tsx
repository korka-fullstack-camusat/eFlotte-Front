// Suivi des Pannes — feuille SUIVI DES PANNE
import { useEffect, useState, useCallback } from "react";
import ExportModal, { ExportColDef } from "@/components/ExportModal";
import {
  Plus, Pencil, Trash2, X, Download, Search, Filter,
  AlertTriangle, CheckCircle2, Clock, Wrench, Settings, BarChart2,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/charts";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/contexts/AuthContext";
import { suiviPanneService } from "@/services/api";
import type { SuiviPanne, FiltresSuiviPanne, PannesFilters } from "@/types";

const PAGE_SIZE = 10;

const EMPTY: Partial<SuiviPanne> = {
  date: "", immatriculation: "", nom: "", garage: "",
  nature_panne: "", date_indisponibilite: "", projet: "",
  date_fin_reparation: "", site: "", immobilisation_jrs: null, commentaire: "",
};

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("fr-FR"); } catch { return d; }
}

function StatutBadge({ panne }: { panne: SuiviPanne }) {
  if (panne.date_fin_reparation) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
        <CheckCircle2 size={11} /> Réparé
      </span>
    );
  }
  const nature = (panne.nature_panne ?? "").toUpperCase();
  if (nature.includes("CONFIRM") || nature === "0A CONFIRMER") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        <Clock size={11} /> À confirmer
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
      <AlertTriangle size={11} /> En cours
    </span>
  );
}


function Field({ label, value, onChange, type = "text", required = false, as: As = "input" }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; as?: "input" | "textarea";
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      {As === "textarea"
        ? <textarea rows={2} value={value} onChange={e => onChange(e.target.value)} className="input-base w-full" />
        : <input type={type} required={required} value={value} onChange={e => onChange(e.target.value)} className="input-base" />
      }
    </div>
  );
}

export default function SuiviPannePage() {
  const { isViewer } = useAuth();

  const [items, setItems] = useState<SuiviPanne[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtres, setFiltres] = useState<FiltresSuiviPanne>({ projets: [], garages: [], sites: [], immatriculations: [] });

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<PannesFilters>({});
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilters, setDraftFilters] = useState<PannesFilters>({});

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<SuiviPanne | null>(null);
  const [form, setForm] = useState<Partial<SuiviPanne>>(EMPTY);
  const [manageRow, setManageRow] = useState<SuiviPanne | null>(null);


  const [showCharts, setShowCharts] = useState(false);
  const [allPannes, setAllPannes] = useState<SuiviPanne[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    suiviPanneService.getAll({ ...filters, search: search || undefined, page, page_size: PAGE_SIZE })
      .then(r => { setItems(r.items); setTotal(r.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters, search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    suiviPanneService.filtres().then(setFiltres).catch(() => {});
  }, []);
  useEffect(() => { setPage(1); }, [filters, search]);

  const repares = items.filter(p => p.date_fin_reparation).length;
  const enCours = items.filter(p => !p.date_fin_reparation).length;

  const openCharts = () => {
    setShowCharts(true);
    setLoadingCharts(true);
    suiviPanneService.getAll({ page: 1, page_size: 500 })
      .then(r => setAllPannes(r.items))
      .catch(() => {})
      .finally(() => setLoadingCharts(false));
  };

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setModal(true); };
  const openEdit = (p: SuiviPanne) => { setEditing(p); setForm({ ...p }); setModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      date: form.date || null,
      date_indisponibilite: form.date_indisponibilite || null,
      date_fin_reparation: form.date_fin_reparation || null,
    };
    try {
      if (editing) {
        await suiviPanneService.update(editing.id, payload);
        toast.success("Panne mise à jour");
      } else {
        await suiviPanneService.create(payload);
        toast.success("Panne ajoutée");
      }
      setModal(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  const handleDelete = async (p: SuiviPanne) => {
    if (!confirm(`Supprimer cette panne (${p.immatriculation}) ?`)) return;
    try {
      await suiviPanneService.remove(p.id);
      toast.success("Supprimé");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  const [showExport, setShowExport] = useState(false);
  const exportCols: ExportColDef<SuiviPanne>[] = [
    { key: "date",                  header: "Date",                 value: r => r.date?.slice(0, 10) ?? "" },
    { key: "immatriculation",       header: "Plaque",               value: r => r.immatriculation ?? "" },
    { key: "nom",                   header: "Chauffeur",            value: r => r.nom ?? "" },
    { key: "garage",                header: "Garage",               value: r => r.garage ?? "" },
    { key: "nature_panne",          header: "Nature de la panne",   value: r => r.nature_panne ?? "" },
    { key: "date_indisponibilite",  header: "Date indisponibilité", value: r => r.date_indisponibilite?.slice(0, 10) ?? "" },
    { key: "projet",                header: "Projet",               value: r => r.projet ?? "" },
    { key: "date_fin_reparation",   header: "Fin réparation",       value: r => r.date_fin_reparation?.slice(0, 10) ?? "" },
    { key: "site",                  header: "Site",                 value: r => r.site ?? "" },
    { key: "immobilisation_jrs",    header: "Immobilisation (jrs)", value: r => r.immobilisation_jrs ?? "" },
    { key: "commentaire",           header: "Commentaire",          value: r => r.commentaire ?? "" },
  ];

  const applyFilters = () => { setFilters(draftFilters); setShowFilters(false); };
  const resetFilters = () => { setDraftFilters({}); setFilters({}); setShowFilters(false); };
  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <AppLayout>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-camublue-900">Suivi des Pannes</h1>
          <p className="text-gray-500 text-sm mt-0.5">Non disponibilités et pannes — feuille SUIVI DES PANNE</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
            <button onClick={openCharts}
              className="flex items-center gap-2 px-4 py-2 border border-camublue-900 text-camublue-900 hover:bg-camublue-900/5 rounded-xl text-sm font-semibold transition">
              <BarChart2 size={15} /><span>Voir graphiques</span>
            </button>
            <button onClick={() => { setDraftFilters(filters); setShowFilters(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm relative">
              <Filter size={15} /><span>Filtres</span>
              {hasActiveFilters && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {Object.values(filters).filter(Boolean).length}
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

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total pannes" value={total} icon={<Wrench size={20} />} bg="bg-camublue-900/10" text="text-camublue-900" />
        <KpiCard label="En cours" value={enCours} icon={<AlertTriangle size={20} />} bg="bg-red-100" text="text-red-600" />
        <KpiCard label="Réparés (page)" value={repares} icon={<CheckCircle2 size={20} />} bg="bg-emerald-100" text="text-emerald-600" />
        <KpiCard label="À confirmer" value={items.filter(p => !p.date_fin_reparation && (p.nature_panne ?? "").toUpperCase().includes("CONFIRM")).length} icon={<Clock size={20} />} bg="bg-amber-100" text="text-amber-600" />
      </div>

      {/* ── Search (centré) ────────────────────────────────────────────── */}
      <div className="flex justify-center mb-6">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par plaque, chauffeur, nature, projet…"
            className="input-base pl-9 w-full" />
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 p-6 text-center">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400 p-6 text-center">Aucune panne trouvée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-camublue-900 text-white text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Date</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Plaque</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Chauffeur</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Garage</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap max-w-[240px]">Nature de la panne</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Date indisp.</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Projet</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Fin réparation</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Site</th>
                  <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Immo. (jrs)</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/60 transition cursor-pointer" onClick={() => setManageRow(p)}>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{fmt(p.date)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-gray-800">{p.immatriculation}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{p.nom || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{p.garage || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-700 max-w-[240px] truncate" title={p.nature_panne ?? ""}>{p.nature_panne || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{fmt(p.date_indisponibilite)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {p.projet
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-camublue-900/10 text-camublue-900">{p.projet}</span>
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{fmt(p.date_fin_reparation)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{p.site || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right font-semibold text-gray-700">
                      {p.immobilisation_jrs != null ? p.immobilisation_jrs : "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap"><StatutBadge panne={p} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      {/* ══ Modal Filtres ══════════════════════════════════════════════════ */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowFilters(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Filter size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">Filtres</p>
              </div>
              <button onClick={() => setShowFilters(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>
            <div className="p-6 space-y-4">
              {([
                ["Projet", "projet", filtres.projets],
                ["Garage", "garage", filtres.garages],
                ["Site", "site", filtres.sites],
                ["Plaque", "immatriculation", filtres.immatriculations],
              ] as [string, keyof PannesFilters, string[]][]).map(([label, key, opts]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                  <select value={(draftFilters[key] as string) ?? ""}
                    onChange={e => setDraftFilters(d => ({ ...d, [key]: e.target.value || undefined }))}
                    className="input-base w-full">
                    <option value="">Tous</option>
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Statut</label>
                <select value={(draftFilters.statut as string) ?? ""}
                  onChange={e => setDraftFilters(d => ({ ...d, statut: e.target.value || undefined }))}
                  className="input-base w-full">
                  <option value="">Tous</option>
                  <option value="repare">Réparé</option>
                  <option value="en_cours">En cours</option>
                </select>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={resetFilters}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                  Réinitialiser
                </button>
                <button onClick={applyFilters}
                  className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">
                  Appliquer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal Ajout / Édition ══════════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Wrench size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">{editing ? "Modifier la panne" : "Ajouter une panne"}</p>
              </div>
              <button onClick={() => setModal(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Date" type="date" value={form.date ?? ""} onChange={v => setForm(p => ({ ...p, date: v }))} />
                <Field label="Plaque (IMMA) *" required value={form.immatriculation ?? ""} onChange={v => setForm(p => ({ ...p, immatriculation: v }))} />
                <Field label="Chauffeur (NOM)" value={form.nom ?? ""} onChange={v => setForm(p => ({ ...p, nom: v }))} />
                <Field label="Garage" value={form.garage ?? ""} onChange={v => setForm(p => ({ ...p, garage: v }))} />
                <Field label="Projet" value={form.projet ?? ""} onChange={v => setForm(p => ({ ...p, projet: v }))} />
                <Field label="Site" value={form.site ?? ""} onChange={v => setForm(p => ({ ...p, site: v }))} />
                <Field label="Date d'indisponibilité" type="date" value={form.date_indisponibilite ?? ""} onChange={v => setForm(p => ({ ...p, date_indisponibilite: v }))} />
                <Field label="Date de fin de réparation" type="date" value={form.date_fin_reparation ?? ""} onChange={v => setForm(p => ({ ...p, date_fin_reparation: v }))} />
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Immobilisation (jrs)</label>
                  <input type="number" step="0.5" min="0" value={form.immobilisation_jrs ?? ""}
                    onChange={e => setForm(p => ({ ...p, immobilisation_jrs: e.target.value === "" ? null : Number(e.target.value) }))}
                    className="input-base" placeholder="—" />
                </div>
              </div>
              <Field label="Nature de la panne / non disponibilité" as="textarea" value={form.nature_panne ?? ""} onChange={v => setForm(p => ({ ...p, nature_panne: v }))} />
              <Field label="Commentaire" as="textarea" value={form.commentaire ?? ""} onChange={v => setForm(p => ({ ...p, commentaire: v }))} />
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">
                  {editing ? "Enregistrer" : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Modal Gérer ══════════════════════════════════════════════════ */}
      {manageRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setManageRow(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Settings size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">Gérer la panne</p>
              </div>
              <button onClick={() => setManageRow(null)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm space-y-1">
                <p><span className="font-semibold text-gray-700">Plaque :</span> {manageRow.immatriculation}</p>
                <p><span className="font-semibold text-gray-700">Chauffeur :</span> {manageRow.nom || "—"}</p>
                <p><span className="font-semibold text-gray-700">Projet :</span> {manageRow.projet || "—"}</p>
                <p><span className="font-semibold text-gray-700">Nature :</span> {manageRow.nature_panne || "—"}</p>
                <p><span className="font-semibold text-gray-700">Immobilisation :</span> {manageRow.immobilisation_jrs != null ? `${manageRow.immobilisation_jrs} jrs` : "—"}</p>
                <p><span className="font-semibold text-gray-700">Statut :</span> <StatutBadge panne={manageRow} /></p>
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

      {showExport && (
        <ExportModal
          title="Exporter — Suivi des Pannes"
          cols={exportCols}
          filename="Suivi_Pannes"
          onClose={() => setShowExport(false)}
          fetchAll={async () => (await suiviPanneService.getAll({ ...filters, page: 1, page_size: 9999 })).items}
        />
      )}

      {/* ══ Modal Graphiques ══════════════════════════════════════════════ */}
      {showCharts && (() => {
        const COLORS = ["#ef4444", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

        // Statut
        const repareCount   = allPannes.filter(p => p.date_fin_reparation).length;
        const confirmerCount = allPannes.filter(p => !p.date_fin_reparation && (p.nature_panne ?? "").toUpperCase().includes("CONFIRM")).length;
        const enCoursCount  = allPannes.filter(p => !p.date_fin_reparation && !(p.nature_panne ?? "").toUpperCase().includes("CONFIRM")).length;
        const statutData = [
          { name: "En cours",    value: enCoursCount },
          { name: "Réparé",      value: repareCount },
          { name: "À confirmer", value: confirmerCount },
        ].filter(d => d.value > 0);

        // Par projet
        const parProjet: Record<string, number> = {};
        allPannes.forEach(p => { const k = p.projet || "—"; parProjet[k] = (parProjet[k] || 0) + 1; });
        const projetData = Object.entries(parProjet).sort((a, b) => b[1] - a[1]).slice(0, 10)
          .map(([name, value]) => ({ name, value }));

        // Par garage
        const parGarage: Record<string, number> = {};
        allPannes.forEach(p => { const k = p.garage || "—"; parGarage[k] = (parGarage[k] || 0) + 1; });
        const garageData = Object.entries(parGarage).sort((a, b) => b[1] - a[1]).slice(0, 10)
          .map(([name, value]) => ({ name, value }));

        // Immobilisation par véhicule (top 10)
        const immoMap: Record<string, number> = {};
        allPannes.forEach(p => {
          if (p.immobilisation_jrs != null) {
            immoMap[p.immatriculation] = (immoMap[p.immatriculation] || 0) + p.immobilisation_jrs;
          }
        });
        const immoData = Object.entries(immoMap).sort((a, b) => b[1] - a[1]).slice(0, 10)
          .map(([name, value]) => ({ name, value }));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCharts(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><BarChart2 size={18} className="text-white" /></div>
                  <div>
                    <p className="text-white font-bold text-sm">Statistiques — Suivi des Pannes</p>
                    <p className="text-white/70 text-xs">{allPannes.length} pannes au total</p>
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
                    {/* Row 1 : Statut + Par projet */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Donut statut */}
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm font-bold text-camublue-900 mb-4">Répartition par statut</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={statutData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                              innerRadius={55} outerRadius={85} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}>
                              {statutData.map((_, i) => (
                                <Cell key={i} fill={["#ef4444","#10b981","#f59e0b"][i % 3]} />
                              ))}
                            </Pie>
                            <RTooltip formatter={(v: number) => [`${v} panne(s)`, ""]} />
                            <Legend iconType="circle" iconSize={10} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Pannes par projet */}
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm font-bold text-camublue-900 mb-4">Pannes par projet (top 10)</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={projetData} layout="vertical" margin={{ left: 8, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                            <RTooltip formatter={(v: number) => [`${v} panne(s)`, ""]} />
                            <Bar dataKey="value" name="Pannes" radius={[0, 4, 4, 0]}>
                              {projetData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Row 2 : Par garage + Immobilisation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Pannes par garage */}
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm font-bold text-camublue-900 mb-4">Pannes par garage (top 10)</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={garageData} layout="vertical" margin={{ left: 8, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                            <RTooltip formatter={(v: number) => [`${v} panne(s)`, ""]} />
                            <Bar dataKey="value" name="Pannes" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                              {garageData.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Immobilisation par véhicule */}
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm font-bold text-camublue-900 mb-4">
                          Immobilisation totale par véhicule — jrs (top 10)
                        </p>
                        {immoData.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-8">Aucune donnée d'immobilisation disponible.</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={immoData} layout="vertical" margin={{ left: 8, right: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 11 }} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                              <RTooltip formatter={(v: number) => [`${v} jrs`, ""]} />
                              <Bar dataKey="value" name="Jours" radius={[0, 4, 4, 0]}>
                                {immoData.map((_, i) => <Cell key={i} fill={COLORS[(i + 5) % COLORS.length]} />)}
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
