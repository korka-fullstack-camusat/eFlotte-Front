import { useEffect, useState, useCallback } from "react";
import ExportModal, { ExportColDef } from "@/components/ExportModal";
import {
  Plus, Pencil, Trash2, X, Download, Search, Filter,
  AlertTriangle, CheckCircle2, Clock, ShieldAlert, Settings, BarChart2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
  Tooltip as RTooltip, PieChart, Pie, Legend, ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/charts";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/contexts/AuthContext";
import { suiSinistreService } from "@/services/api";
import type { SuiviSinistre, SinistresFilters } from "@/types";
import ChartFilterBar, { ChartFilter, CHART_FILTER_EMPTY, applyChartFilter } from "@/components/ChartFilterBar";

const PAGE_SIZE = 10;

const EMPTY: Partial<SuiviSinistre> = {
  date_sinistre: null, date_declaration: null, type_location: "",
  matricule: "", nom_chauffeur: "", snc: "", projet: "",
  circonstances: "", statut: "", montant_indemnite: null,
  date_reglement: null, observations: "", dossier_suivi_par: "",
  position_vehicule: "", suivi_dossier_interne: "", lieu_immobilisation: "",
  documentation: false, traiter: false,
};

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("fr-FR"); } catch { return d; }
}

function fmtMoney(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("fr-FR") + " FCFA";
}

function StatutBadge({ statut }: { statut: string | null }) {
  const s = (statut ?? "").toLowerCase();
  if (s.includes("clotur")) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
      <CheckCircle2 size={11} /> Clôturé
    </span>
  );
  if (s.includes("instruction")) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
      <Clock size={11} /> Instruction
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
      {statut ?? "—"}
    </span>
  );
}

function CircBadge({ v }: { v: string | null }) {
  if (!v) return <span className="text-gray-400">—</span>;
  const key = v.toLowerCase();
  if (key.includes("accident")) return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">{v}</span>
  );
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">{v}</span>
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

function FieldSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { val: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="input-base w-full">
        {options.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
      </select>
    </div>
  );
}

export default function SuiviSinistrePage() {
  const { isViewer } = useAuth();

  const [items, setItems]     = useState<SuiviSinistre[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);

  const [page, setPage]     = useState(1);
  const [filters, setFilters] = useState<SinistresFilters>({});
  const [search, setSearch]   = useState("");
  const [showFilters, setShowFilters]   = useState(false);
  const [draftFilters, setDraftFilters] = useState<SinistresFilters>({});

  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<SuiviSinistre | null>(null);
  const [form, setForm]       = useState<Partial<SuiviSinistre>>(EMPTY);
  const [manageRow, setManageRow] = useState<SuiviSinistre | null>(null);


  const [chartFilter, setChartFilter] = useState<ChartFilter>(CHART_FILTER_EMPTY);

  const [showCharts, setShowCharts]       = useState(false);
  const [allSinistres, setAllSinistres]   = useState<SuiviSinistre[]>([]);
  const [rawChartItems, setRawChartItems] = useState<SuiviSinistre[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    suiSinistreService.getAll({ ...filters, search: search || undefined, page, page_size: PAGE_SIZE })
      .then(r => { setItems(r.items); setTotal(r.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters, search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filters, search]);

  // KPIs (sur la page courante)
  const nbInstruction = items.filter(i => (i.statut ?? "").toLowerCase().includes("instruction")).length;
  const nbCloture     = items.filter(i => (i.statut ?? "").toLowerCase().includes("clotur")).length;
  const totalMontant  = items.reduce((s, i) => s + (i.montant_indemnite ?? 0), 0);

  const openCharts = () => {
    setShowCharts(true);
    setLoadingCharts(true);
    suiSinistreService.getAll({ page: 1, page_size: 9999 })
      .then(r => { setRawChartItems(r.items); setAllSinistres(applyChartFilter(r.items, chartFilter, x => x.date_sinistre)); })
      .catch(() => {})
      .finally(() => setLoadingCharts(false));
  };

  useEffect(() => {
    if (!showCharts || rawChartItems.length === 0) return;
    setAllSinistres(applyChartFilter(rawChartItems, chartFilter, x => x.date_sinistre));
  }, [chartFilter]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setModal(true); };
  const openEdit   = (s: SuiviSinistre) => { setEditing(s); setForm({ ...s }); setModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      date_sinistre:    form.date_sinistre    || null,
      date_declaration: form.date_declaration || null,
      date_reglement:   form.date_reglement   || null,
    };
    try {
      if (editing) {
        await suiSinistreService.update(editing.id, payload);
        toast.success("Sinistre mis à jour");
      } else {
        await suiSinistreService.create(payload);
        toast.success("Sinistre ajouté");
      }
      setModal(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  const handleDelete = async (s: SuiviSinistre) => {
    if (!confirm(`Supprimer ce sinistre (${s.matricule}) ?`)) return;
    try {
      await suiSinistreService.remove(s.id);
      toast.success("Supprimé");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  const [showExport, setShowExport] = useState(false);
  const exportCols: ExportColDef<SuiviSinistre>[] = [
    { key: "date_sinistre",       header: "Date sinistre",       value: r => r.date_sinistre?.slice(0, 10) ?? "" },
    { key: "date_declaration",    header: "Date déclaration",    value: r => r.date_declaration?.slice(0, 10) ?? "" },
    { key: "type_location",       header: "Propriété",           value: r => r.type_location ?? "" },
    { key: "matricule",           header: "Matricule",           value: r => r.matricule ?? "" },
    { key: "nom_chauffeur",       header: "Chauffeur",           value: r => r.nom_chauffeur ?? "" },
    { key: "snc",                 header: "SNC",                 value: r => r.snc ?? "" },
    { key: "projet",              header: "Projet",              value: r => r.projet ?? "" },
    { key: "circonstances",       header: "Circonstances",       value: r => r.circonstances ?? "" },
    { key: "statut",              header: "Statut",              value: r => r.statut ?? "" },
    { key: "montant_indemnite",   header: "Montant HT",          value: r => r.montant_indemnite ?? "" },
    { key: "date_reglement",      header: "Date règlement",      value: r => r.date_reglement?.slice(0, 10) ?? "" },
    { key: "dossier_suivi_par",   header: "Suivi par",           value: r => r.dossier_suivi_par ?? "" },
    { key: "lieu_immobilisation", header: "Lieu immobilisation", value: r => r.lieu_immobilisation ?? "" },
  ];

  const applyFilters = () => { setFilters(draftFilters); setShowFilters(false); };
  const resetFilters = () => { setDraftFilters({}); setFilters({}); setShowFilters(false); };
  const hasActiveFilters = Object.values(filters).some(v => v && v !== "");

  const sf = (k: keyof SuiviSinistre, v: string) =>
    setForm(f => ({ ...f, [k]: v || null }));

  return (
    <AppLayout>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-camublue-900">Suivi des sinistres</h1>
            <p className="text-gray-500 text-sm mt-0.5">Sinistres automobile — déclarations &amp; suivi assurance</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={openCharts}
              className="flex items-center gap-2 px-4 py-2 border border-camublue-900 text-camublue-900 hover:bg-camublue-900/5 rounded-xl text-sm font-semibold transition">
              <BarChart2 size={15} /> Voir graphiques
            </button>
            <button onClick={() => { setDraftFilters(filters); setShowFilters(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm relative">
              <Filter size={15} /> Filtres
              {hasActiveFilters && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {Object.values(filters).filter(v => v && v !== "").length}
                </span>
              )}
            </button>
            <button onClick={() => setShowExport(true)}
              className="flex items-center gap-2 px-4 py-2 border border-camublue-900 text-camublue-900 hover:bg-camublue-900/5 rounded-xl text-sm font-semibold transition">
              <Download size={15} /> Exporter
            </button>
            {!isViewer && (
              <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm">
                <Plus size={15} /> Ajouter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total sinistres" value={total}         icon={<ShieldAlert size={20} />} bg="bg-camublue-900/10" text="text-camublue-900" />
        <KpiCard label="En instruction"  value={nbInstruction} icon={<Clock size={20} />}       bg="bg-amber-100"       text="text-amber-600" />
        <KpiCard label="Clôturés (page)" value={nbCloture}     icon={<CheckCircle2 size={20} />} bg="bg-emerald-100"    text="text-emerald-600" />
        <KpiCard
          label="Total indemnités (page)"
          value={totalMontant}
          suffix=" FCFA"
          icon={<AlertTriangle size={20} />}
          bg="bg-blue-100"
          text="text-blue-600"
        />
      </div>

      {/* ── Recherche ───────────────────────────────────────────────────── */}
      <div className="flex justify-center mb-6">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher matricule, chauffeur, SNC, lieu…"
            className="input-base pl-9 w-full" />
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 p-6 text-center">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400 p-6 text-center">Aucun sinistre trouvé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-camublue-900 text-white text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Date sinistre</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Date déclaration</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Propriété</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Matricule</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Chauffeur</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">SNC</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Projet</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Circonstances</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Statut</th>
                  <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Montant HT</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Date règlement</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Suivi par</th>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Lieu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/60 transition cursor-pointer" onClick={() => setManageRow(s)}>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{fmt(s.date_sinistre)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{fmt(s.date_declaration)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {s.type_location
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-camublue-900/10 text-camublue-900">{s.type_location}</span>
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-gray-800">{s.matricule || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{s.nom_chauffeur || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{s.snc || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {s.projet
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-camublue-900/10 text-camublue-900">{s.projet}</span>
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap"><CircBadge v={s.circonstances} /></td>
                    <td className="px-3 py-2.5 whitespace-nowrap"><StatutBadge statut={s.statut} /></td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right font-semibold text-gray-700">{fmtMoney(s.montant_indemnite)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{fmt(s.date_reglement)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{s.dossier_suivi_par || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{s.lieu_immobilisation || "—"}</td>
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
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Statut</label>
                <select value={draftFilters.statut ?? ""} onChange={e => setDraftFilters(d => ({ ...d, statut: e.target.value || undefined }))} className="input-base w-full">
                  <option value="">Tous</option>
                  <option value="Instruction">Instruction</option>
                  <option value="cloturé">Clôturé</option>
                  <option value="dossier transmis">Dossier transmis</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Propriété</label>
                <select value={draftFilters.type_location ?? ""} onChange={e => setDraftFilters(d => ({ ...d, type_location: e.target.value || undefined }))} className="input-base w-full">
                  <option value="">Toutes</option>
                  <option>CAMUSAT</option>
                  <option>AUTORENT</option>
                  <option>LLD</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Circonstances</label>
                <select value={draftFilters.circonstances ?? ""} onChange={e => setDraftFilters(d => ({ ...d, circonstances: e.target.value || undefined }))} className="input-base w-full">
                  <option value="">Toutes</option>
                  <option>INCIDENT</option>
                  <option>ACCIDENT</option>
                </select>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={resetFilters} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">Réinitialiser</button>
                <button onClick={applyFilters} className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">Appliquer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal Ajout / Édition ══════════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><ShieldAlert size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">{editing ? "Modifier le sinistre" : "Ajouter un sinistre"}</p>
              </div>
              <button onClick={() => setModal(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Date sinistre"    type="date" value={form.date_sinistre ?? ""}    onChange={v => sf("date_sinistre", v)} />
                <Field label="Date déclaration" type="date" value={form.date_declaration ?? ""} onChange={v => sf("date_declaration", v)} />
                <FieldSelect label="Propriété (LCD/LLD/CAMUSAT)" value={form.type_location ?? ""}
                  onChange={v => sf("type_location", v)}
                  options={[{val:"",label:"— Sélectionner —"},{val:"CAMUSAT",label:"CAMUSAT"},{val:"AUTORENT",label:"AUTORENT"},{val:"LLD",label:"LLD"},{val:"LCD",label:"LCD"}]} />
                <Field label="Matricule *" required value={form.matricule ?? ""} onChange={v => sf("matricule", v)} />
                <Field label="Nom chauffeur"  value={form.nom_chauffeur ?? ""}  onChange={v => sf("nom_chauffeur", v)} />
                <Field label="SNC"            value={form.snc ?? ""}            onChange={v => sf("snc", v)} />
                <Field label="Projet"         value={form.projet ?? ""}         onChange={v => sf("projet", v)} />
                <FieldSelect label="Circonstances" value={form.circonstances ?? ""} onChange={v => sf("circonstances", v)}
                  options={[{val:"",label:"— Sélectionner —"},{val:"INCIDENT",label:"INCIDENT"},{val:"ACCIDENT",label:"ACCIDENT"}]} />
                <FieldSelect label="Statut" value={form.statut ?? ""} onChange={v => sf("statut", v)}
                  options={[{val:"",label:"— Sélectionner —"},{val:"Instruction",label:"Instruction"},{val:"cloturé",label:"Clôturé"},{val:"dossier transmis",label:"Dossier transmis"}]} />
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Montant indemnité HT (FCFA)</label>
                  <input type="number" min="0" value={form.montant_indemnite ?? ""}
                    onChange={e => setForm(f => ({ ...f, montant_indemnite: e.target.value === "" ? null : Number(e.target.value) }))}
                    className="input-base" placeholder="—" />
                </div>
                <Field label="Date règlement" type="date" value={form.date_reglement ?? ""} onChange={v => sf("date_reglement", v)} />
                <Field label="Dossier suivi par"       value={form.dossier_suivi_par ?? ""}     onChange={v => sf("dossier_suivi_par", v)} />
                <Field label="Position véhicule"       value={form.position_vehicule ?? ""}     onChange={v => sf("position_vehicule", v)} />
                <Field label="Suivi dossier en interne" value={form.suivi_dossier_interne ?? ""} onChange={v => sf("suivi_dossier_interne", v)} />
                <Field label="Lieu d'immobilisation"   value={form.lieu_immobilisation ?? ""}   onChange={v => sf("lieu_immobilisation", v)} />
              </div>
              <Field label="Observations" as="textarea" value={form.observations ?? ""} onChange={v => sf("observations", v)} />
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={form.documentation ?? false}
                    onChange={e => setForm(f => ({ ...f, documentation: e.target.checked }))}
                    className="w-4 h-4 accent-camublue-900" />
                  Documentation
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={form.traiter ?? false}
                    onChange={e => setForm(f => ({ ...f, traiter: e.target.checked }))}
                    className="w-4 h-4 accent-camublue-900" />
                  Traiter
                </label>
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">Annuler</button>
                <button type="submit"
                  className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">
                  {editing ? "Enregistrer" : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Modal Gérer ═══════════════════════════════════════════════════ */}
      {manageRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setManageRow(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Settings size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">Gérer le sinistre</p>
              </div>
              <button onClick={() => setManageRow(null)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm space-y-1">
                <p><span className="font-semibold text-gray-700">Matricule :</span> {manageRow.matricule || "—"}</p>
                <p><span className="font-semibold text-gray-700">Chauffeur :</span> {manageRow.nom_chauffeur || "—"}</p>
                <p><span className="font-semibold text-gray-700">Circonstances :</span> <CircBadge v={manageRow.circonstances} /></p>
                <p><span className="font-semibold text-gray-700">Statut :</span> <StatutBadge statut={manageRow.statut} /></p>
                <p><span className="font-semibold text-gray-700">Montant :</span> {fmtMoney(manageRow.montant_indemnite)}</p>
                <p><span className="font-semibold text-gray-700">Observations :</span> {manageRow.observations || "—"}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { const r = manageRow; setManageRow(null); openEdit(r); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">
                  <Pencil size={14} /> Mise à jour
                </button>
                <button onClick={() => { const r = manageRow; setManageRow(null); handleDelete(r); }}
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
          title="Exporter — Suivi des sinistres"
          cols={exportCols}
          filename="Suivi_Sinistres"
          onClose={() => setShowExport(false)}
          fetchAll={async () => (await suiSinistreService.getAll({ ...filters, page: 1, page_size: 9999 })).items}
        />
      )}

      {/* ══ Modal Graphiques ══════════════════════════════════════════════ */}
      {showCharts && (() => {
        const COLORS = ["#1e3a6e","#10b981","#ef4444","#f59e0b","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f97316"];

        const clotureCount    = allSinistres.filter(s => (s.statut ?? "").toLowerCase().includes("clotur")).length;
        const instructCount   = allSinistres.filter(s => (s.statut ?? "").toLowerCase().includes("instruction")).length;
        const autreCount      = allSinistres.length - clotureCount - instructCount;
        const statutData = [
          { name: "Clôturé",     value: clotureCount },
          { name: "Instruction", value: instructCount },
          { name: "Autre",       value: autreCount },
        ].filter(d => d.value > 0);

        const accidentCount = allSinistres.filter(s => (s.circonstances ?? "").toLowerCase().includes("accident")).length;
        const incidentCount = allSinistres.filter(s => (s.circonstances ?? "").toLowerCase().includes("incident")).length;
        const circData = [
          { name: "Accident", value: accidentCount },
          { name: "Incident", value: incidentCount },
        ].filter(d => d.value > 0);

        const parProjet: Record<string, number> = {};
        allSinistres.forEach(s => { const k = s.projet || "—"; parProjet[k] = (parProjet[k] || 0) + 1; });
        const projetData = Object.entries(parProjet).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));

        const parType: Record<string, number> = {};
        allSinistres.forEach(s => { const k = s.type_location || "—"; parType[k] = (parType[k] || 0) + 1; });
        const typeData = Object.entries(parType).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCharts(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="bg-camublue-900 px-5 py-3 flex items-center gap-3 flex-wrap sticky top-0 z-10">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <BarChart2 size={16} className="text-white" />
                </div>
                <p className="text-white font-bold text-sm shrink-0">Statistiques — Suivi des sinistres</p>
                <div className="flex-1 flex justify-center">
                  <ChartFilterBar filter={chartFilter} onChange={setChartFilter} />
                </div>
                <button onClick={() => setShowCharts(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition shrink-0 ml-auto">
                  <X size={14} className="text-white" />
                </button>
              </div>
              <div className="overflow-y-auto p-6 space-y-8">
                {loadingCharts ? (
                  <p className="text-center text-gray-400 py-16">Chargement des données…</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm font-bold text-camublue-900 mb-4">Répartition par statut</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={statutData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                              innerRadius={55} outerRadius={85} paddingAngle={3}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                              {statutData.map((_, i) => <Cell key={i} fill={["#10b981","#f59e0b","#6b7280"][i % 3]} />)}
                            </Pie>
                            <RTooltip formatter={(v: number) => [`${v} sinistre(s)`, ""]} />
                            <Legend iconType="circle" iconSize={10} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm font-bold text-camublue-900 mb-4">Accident vs Incident</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={circData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                              innerRadius={55} outerRadius={85} paddingAngle={3}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                              {circData.map((_, i) => <Cell key={i} fill={["#ef4444","#f97316"][i % 2]} />)}
                            </Pie>
                            <RTooltip formatter={(v: number) => [`${v} sinistre(s)`, ""]} />
                            <Legend iconType="circle" iconSize={10} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm font-bold text-camublue-900 mb-4">Sinistres par projet (top 10)</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={projetData} layout="vertical" margin={{ left: 8, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                            <RTooltip formatter={(v: number) => [`${v} sinistre(s)`, ""]} />
                            <Bar dataKey="value" name="Sinistres" radius={[0, 4, 4, 0]}>
                              {projetData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm font-bold text-camublue-900 mb-4">Sinistres par propriété</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={typeData} layout="vertical" margin={{ left: 8, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                            <RTooltip formatter={(v: number) => [`${v} sinistre(s)`, ""]} />
                            <Bar dataKey="value" name="Sinistres" radius={[0, 4, 4, 0]}>
                              {typeData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex justify-end">
                <button onClick={() => setShowCharts(false)}
                  className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition">Fermer</button>
              </div>
            </div>
          </div>
        );
      })()}
    </AppLayout>
  );
}
