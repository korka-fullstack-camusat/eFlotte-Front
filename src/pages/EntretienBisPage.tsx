import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Wrench, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Settings, Search, AlertOctagon, ShieldCheck, RefreshCw, BarChart2 } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/charts";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/contexts/AuthContext";
import { entretienBisService } from "@/services/api";
import type { EntretienBis, ImportEntretienBisResult } from "@/types";

const PAGE_SIZE = 10;

const EMPTY: Partial<EntretienBis> = {
  rt: "", statut: "", modele: "", plaque_immatriculation: "",
  kms_depart: null, notes: "", paliers: {}, reste: null,
};

function Field({ label, value, onChange, type = "text", required = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <input type={type} required={required} value={value} onChange={e => onChange(e.target.value)} className="input-base" />
    </div>
  );
}

export default function EntretienBisPage() {
  const { isViewer } = useAuth();
  const [entretiens, setEntretiens] = useState<EntretienBis[]>([]);
  const [paliers, setPaliers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<EntretienBis | null>(null);
  const [form, setForm] = useState<Partial<EntretienBis>>(EMPTY);

  const [importModal, setImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportEntretienBisResult | null>(null);
  const [autoCalculating, setAutoCalculating] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [page, setPage] = useState(1);
  const [manageRow, setManageRow] = useState<EntretienBis | null>(null);
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([entretienBisService.getAll(), entretienBisService.getPaliers()])
      .then(([e, p]) => { setEntretiens(e); setPaliers(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = entretiens.filter(e => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [e.plaque_immatriculation, e.rt, e.statut, e.modele, e.notes]
      .some(v => (v ?? "").toLowerCase().includes(q));
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedEntretiens = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [pageCount, page]);
  useEffect(() => { setPage(1); }, [search]);

  const enRetard = entretiens.filter(e => e.reste != null && Number(e.reste) < 0).length;
  const aSurveiller = entretiens.filter(e => e.reste != null && Number(e.reste) >= 0 && Number(e.reste) <= 7500).length;
  const aJour = entretiens.filter(e => e.reste != null && Number(e.reste) > 7500).length;

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY, paliers: {} }); setModal(true); };
  const openEdit = (e: EntretienBis) => { setEditing(e); setForm({ ...e, paliers: { ...e.paliers } }); setModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await entretienBisService.update(editing.id, form);
        toast.success("Suivi BIS mis à jour");
      } else {
        await entretienBisService.create(form);
        toast.success("Suivi BIS ajouté");
      }
      setModal(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  const handleDelete = async (e: EntretienBis) => {
    if (!confirm(`Supprimer le suivi BIS du véhicule ${e.plaque_immatriculation} ?`)) return;
    try {
      await entretienBisService.remove(e.id);
      toast.success("Suivi BIS supprimé");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await entretienBisService.importExcel(file);
      setResult(res);
      toast.success(`Import terminé : ${res.created} créés, ${res.updated} mis à jour`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur lors de l'import");
    } finally {
      setImporting(false);
    }
  };

  const handleAutoCalculer = async () => {
    setAutoCalculating(true);
    try {
      const updated = await entretienBisService.autoCalculer();
      setEntretiens(updated);
      toast.success(`Paliers recalculés pour ${updated.length} véhicule(s)`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur lors du calcul automatique");
    } finally {
      setAutoCalculating(false);
    }
  };

  const setPalierValue = (km: number, value: string) => {
    setForm(f => ({
      ...f,
      paliers: { ...(f.paliers ?? {}), [String(km)]: value === "" ? null : Number(value) },
    }));
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-camublue-900">Entretien BIS — Suivi par palier kilométrique</h1>
          <p className="text-gray-500 text-sm mt-0.5">Contrat d'entretien CAMUSAT L200 avec décanteur — 100 000 km ou 03 ans, intervalle 7 500 km</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowCharts(true)}
            className="flex items-center gap-2 px-4 py-2 border border-camublue-900 text-camublue-900 hover:bg-camublue-900/5 rounded-xl text-sm font-semibold transition">
            <BarChart2 size={15} /><span>Voir graphiques</span>
          </button>
        {!isViewer && (
          <>
            <button onClick={() => { setImportModal(true); setResult(null); }}
              className="flex items-center gap-2 px-4 py-2 border border-camublue-900 text-camublue-900 hover:bg-camublue-900/5 rounded-xl text-sm font-semibold transition">
              <Upload size={15} /><span>Importer (Excel)</span>
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm">
              <Plus size={15} /><span>Ajouter</span>
            </button>
          </>
        )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Véhicules suivis" value={entretiens.length} icon={<Wrench size={20} />} bg="bg-camublue-900/10" text="text-camublue-900" />
        <KpiCard label="En retard" value={enRetard} icon={<AlertOctagon size={20} />} bg="bg-red-100" text="text-red-600" />
        <KpiCard label="À surveiller (≤ 7 500 km)" value={aSurveiller} icon={<AlertTriangle size={20} />} bg="bg-amber-100" text="text-amber-600" />
        <KpiCard label="À jour" value={aJour} icon={<ShieldCheck size={20} />} bg="bg-emerald-100" text="text-emerald-600" />
      </div>

      <div className="flex justify-center mb-6">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par plaque, modèle, statut…"
            className="input-base pl-9 w-full"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 p-6 text-center">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 p-6 text-center">Aucun suivi BIS trouvé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-camublue-900 text-white text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">RT</th>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Statut</th>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Modèle</th>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Plaque</th>
                  <th className="text-right px-4 py-2.5 font-semibold whitespace-nowrap">Kms départ</th>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Notes</th>
                  {paliers.map(km => (
                    <th key={km} className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">
                      {km.toLocaleString("fr-FR")}
                    </th>
                  ))}
                  <th className="text-right px-4 py-2.5 font-semibold whitespace-nowrap">Reste</th>
                  {!isViewer && <th className="text-center px-4 py-2.5 font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedEntretiens.map(e => {
                  const reste = e.reste != null ? Number(e.reste) : null;
                  const resteClass =
                    reste == null ? "text-gray-600" :
                    reste < 0 ? "bg-red-100 text-red-700" :
                    reste <= 7500 ? "bg-amber-100 text-amber-700" :
                    "bg-emerald-100 text-emerald-700";
                  return (
                    <tr key={e.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {e.rt ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{e.rt}</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{e.statut || "—"}</td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{e.modele || "—"}</td>
                      <td className="px-4 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5"><Wrench size={13} className="text-gray-400" />{e.plaque_immatriculation}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600 whitespace-nowrap">
                        {e.kms_depart != null ? Number(e.kms_depart).toLocaleString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">{e.notes || "—"}</td>
                      {paliers.map(km => {
                        const v = e.paliers?.[String(km)];
                        return (
                          <td key={km} className="px-1 py-1 text-right whitespace-nowrap">
                            {v != null ? (
                              <span className="inline-block w-full px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 font-medium">
                                {Number(v).toLocaleString("fr-FR")}
                              </span>
                            ) : (
                              <span className="inline-block w-full px-2 py-1 rounded-md bg-gray-50 text-gray-300">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-1 py-1 text-right whitespace-nowrap">
                        <span className={`inline-block w-full px-2 py-1 rounded-md font-semibold ${resteClass}`}>
                          {reste != null ? reste.toLocaleString("fr-FR") : "—"}
                        </span>
                      </td>
                      {!isViewer && (
                        <td className="px-4 py-2.5 text-center">
                          <button onClick={() => setManageRow(e)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-lg text-xs font-semibold transition">
                            <Settings size={13} /> Gérer
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      </div>

      {/* ══ Modal Ajout/Édition ════════════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Wrench size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">{editing ? "Modifier le suivi BIS" : "Ajouter un suivi BIS"}</p>
              </div>
              <button onClick={() => setModal(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Plaque d'immatriculation *" value={form.plaque_immatriculation ?? ""} onChange={v => setForm(f => ({ ...f, plaque_immatriculation: v }))} required />
                <Field label="Modèle" value={form.modele ?? ""} onChange={v => setForm(f => ({ ...f, modele: v }))} />
                <Field label="RT" value={form.rt ?? ""} onChange={v => setForm(f => ({ ...f, rt: v }))} />
                <Field label="Statut" value={form.statut ?? ""} onChange={v => setForm(f => ({ ...f, statut: v }))} />
                <Field label="Kms départ" value={form.kms_depart != null ? String(form.kms_depart) : ""} onChange={v => setForm(f => ({ ...f, kms_depart: v === "" ? null : Number(v) }))} type="number" />
                <Field label="Notes" value={form.notes ?? ""} onChange={v => setForm(f => ({ ...f, notes: v }))} />
                <Field label="Reste (km)" value={form.reste != null ? String(form.reste) : ""} onChange={v => setForm(f => ({ ...f, reste: v === "" ? null : Number(v) }))} type="number" />
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

      {/* ══ Modal Import ════════════════════════════════════════════ */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !importing && setImportModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><FileSpreadsheet size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">Importer ENTRETIEN BIS (Excel)</p>
              </div>
              <button onClick={() => !importing && setImportModal(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Sélectionnez le fichier Excel contenant la feuille <strong>ENTRETIEN BIS</strong> (colonnes : RT, STATUT, MODEL, Matricule, KMS DE DEPART, NOTES, paliers 112 500 → 210 000, REST).
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

      {/* ══ Modal Gérer ════════════════════════════════════════════ */}
      {manageRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setManageRow(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Settings size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">Gérer le suivi BIS</p>
              </div>
              <button onClick={() => setManageRow(null)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm space-y-1">
                <p><span className="font-semibold text-gray-700">Plaque :</span> {manageRow.plaque_immatriculation}</p>
                <p><span className="font-semibold text-gray-700">Modèle :</span> {manageRow.modele || "—"}</p>
                <p><span className="font-semibold text-gray-700">Kms départ :</span> {manageRow.kms_depart != null ? Number(manageRow.kms_depart).toLocaleString("fr-FR") : "—"}</p>
                <p><span className="font-semibold text-gray-700">Notes :</span> {manageRow.notes || "—"}</p>
                <p><span className="font-semibold text-gray-700">Reste :</span> {manageRow.reste != null ? Number(manageRow.reste).toLocaleString("fr-FR") + " km" : "—"}</p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { const m = manageRow; setManageRow(null); openEdit(m); }}
                  className="flex items-center justify-center gap-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">
                  <Pencil size={14} /> Modifier
                </button>
                <button
                  onClick={() => { const m = manageRow; setManageRow(null); handleDelete(m); }}
                  className="flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl py-2.5 text-sm font-semibold transition">
                  <Trash2 size={14} /> Supprimer
                </button>
                <button type="button" onClick={() => setManageRow(null)}
                  className="border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ══ Modal Graphiques ══════════════════════════════════════════════ */}
      {showCharts && (() => {
        const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

        // Répartition statut kilométrique
        const statutData = [
          { name: "En retard",        value: enRetard,     color: "#ef4444" },
          { name: "À surveiller",     value: aSurveiller,  color: "#f59e0b" },
          { name: "À jour",           value: aJour,        color: "#10b981" },
        ].filter(d => d.value > 0);

        // Top 10 véhicules avec le moins de reste (les plus urgents)
        const resteData = [...entretiens]
          .filter(e => e.reste != null)
          .sort((a, b) => Number(a.reste) - Number(b.reste))
          .slice(0, 10)
          .map(e => ({ name: e.plaque_immatriculation, value: Number(e.reste) }));

        // Répartition par modèle
        const parModele: Record<string, number> = {};
        entretiens.forEach(e => { const k = e.modele || "—"; parModele[k] = (parModele[k] || 0) + 1; });
        const modeleData = Object.entries(parModele)
          .sort((a, b) => b[1] - a[1])
          .map(([name, value]) => ({ name, value }));

        // Paliers complétés par véhicule (top 10)
        const paliersData = [...entretiens]
          .map(e => ({
            name: e.plaque_immatriculation,
            value: Object.values(e.paliers ?? {}).filter(v => v != null).length,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCharts(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><BarChart2 size={18} className="text-white" /></div>
                  <div>
                    <p className="text-white font-bold text-sm">Statistiques — Entretien BIS</p>
                    <p className="text-white/70 text-xs">{entretiens.length} véhicule(s) suivi(s)</p>
                  </div>
                </div>
                <button onClick={() => setShowCharts(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-6 space-y-8">
                {/* Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Donut statut km */}
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-sm font-bold text-camublue-900 mb-4">Répartition par statut kilométrique</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={statutData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                          innerRadius={55} outerRadius={85} paddingAngle={3}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}>
                          {statutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <RTooltip formatter={(v: number) => [`${v} véhicule(s)`, ""]} />
                        <Legend iconType="circle" iconSize={10} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Répartition par modèle */}
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-sm font-bold text-camublue-900 mb-4">Véhicules par modèle</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={modeleData} margin={{ left: 8, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <RTooltip formatter={(v: number) => [`${v} véhicule(s)`, ""]} />
                        <Bar dataKey="value" name="Véhicules" radius={[4, 4, 0, 0]}>
                          {modeleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top 10 km restants (les plus urgents) */}
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-sm font-bold text-camublue-900 mb-1">Km restants — 10 plus urgents</p>
                    <p className="text-xs text-gray-400 mb-4">Les valeurs négatives indiquent un retard d'entretien</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={resteData} layout="vertical" margin={{ left: 8, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => v.toLocaleString("fr-FR")} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                        <RTooltip formatter={(v: number) => [`${v.toLocaleString("fr-FR")} km`, ""]} />
                        <Bar dataKey="value" name="Reste km" radius={[0, 4, 4, 0]}>
                          {resteData.map((d, i) => (
                            <Cell key={i} fill={d.value < 0 ? "#ef4444" : d.value <= 7500 ? "#f59e0b" : "#10b981"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Paliers complétés par véhicule */}
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-sm font-bold text-camublue-900 mb-4">Paliers complétés par véhicule (top 10)</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={paliersData} layout="vertical" margin={{ left: 8, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                        <RTooltip formatter={(v: number) => [`${v} palier(s)`, ""]} />
                        <Bar dataKey="value" name="Paliers" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                          {paliersData.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
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
