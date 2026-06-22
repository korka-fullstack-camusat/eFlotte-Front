import { useState, useRef, useEffect } from "react";
import {
  Upload, CheckCircle2, AlertTriangle, Loader2,
  Car, DollarSign, Navigation, FileText, ClipboardCheck, Wrench,
  AlertOctagon, CircleDot, X,
  ShieldAlert, LayoutGrid, ChevronRight as ChevronRightIcon, History,
  ChevronDown, ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import AppLayout from "@/components/layout/AppLayout";

interface SectionResult {
  created: number;
  updated: number;
  errors: { ligne: number; message: string }[];
  skipped: boolean;
  skip_reason: string;
}
interface ImportResult {
  vehicules: SectionResult; couts: SectionResult; missions: SectionResult;
  devis: SectionResult; checklists: SectionResult; entretiens: SectionResult;
  entretiens_bis: SectionResult; pannes: SectionResult; pneumatiques: SectionResult;
}
interface HistoryEntry {
  id: number; created_at: string; username: string | null; filename: string | null;
  total_created: number; total_updated: number; total_errors: number;
  results: Record<string, SectionResult>;
}

const SECTIONS: { key: keyof ImportResult; label: string; sheet: string; icon: React.ReactNode; color: string }[] = [
  { key: "vehicules",      label: "Flotte globale",     sheet: "FLOTTE GLOBALE",          icon: <Car size={18} />,           color: "text-camublue-900 bg-camublue-900/10" },
  { key: "couts",          label: "Suivi des coûts",    sheet: "DATA_FLOTTES",             icon: <DollarSign size={18} />,    color: "text-emerald-700 bg-emerald-100" },
  { key: "missions",       label: "Chauffeurs & Pôles", sheet: "CHAUFFEUR POLES",          icon: <Navigation size={18} />,    color: "text-sky-700 bg-sky-100" },
  { key: "devis",          label: "Suivi des devis",    sheet: "SUIVI DES DEVIS",          icon: <FileText size={18} />,      color: "text-violet-700 bg-violet-100" },
  { key: "checklists",     label: "Check-lists VL",     sheet: "SUIVI DES CHECK LISTS VL", icon: <ClipboardCheck size={18} />,color: "text-amber-700 bg-amber-100" },
  { key: "entretiens",     label: "Entretiens",         sheet: "ENTRTIENS",                icon: <Wrench size={18} />,        color: "text-orange-700 bg-orange-100" },
  { key: "entretiens_bis", label: "Entretien BIS",      sheet: "ENTRETIEN BIS",            icon: <Wrench size={18} />,        color: "text-rose-700 bg-rose-100" },
  { key: "pannes",         label: "Suivi des pannes",   sheet: "SUIVI DES PANNE",          icon: <AlertOctagon size={18} />,  color: "text-red-700 bg-red-100" },
  { key: "pneumatiques",   label: "Pneumatiques",       sheet: "PNEUMATIQUE",              icon: <CircleDot size={18} />,     color: "text-teal-700 bg-teal-100" },
];

type ImportMode = null | "global" | "sinistres";
type Status = "idle" | "loading" | "done" | "error";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function ImportPage() {
  const [mode, setMode]     = useState<ImportMode>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [sinistreResult, setSinistreResult] = useState<{ created: number; updated: number; errors: any[] } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  useEffect(() => {
    axios.get<HistoryEntry[]>("/api/import-global/history")
      .then(r => setHistory(r.data))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("Seuls les fichiers .xlsx / .xls sont acceptés");
      return;
    }
    setFileName(file.name);
    setStatus("loading");
    setResult(null);
    setSinistreResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (mode === "sinistres") {
        const { data } = await axios.post("/api/sinistres/import", formData, { headers: { "Content-Type": "multipart/form-data" } });
        setSinistreResult(data);
        setStatus("done");
        const errors = data.errors?.length ?? 0;
        if (errors > 0) toast(`Import sinistres : ${data.created} créés, ${data.updated} MAJ — ${errors} erreur(s)`, { icon: "⚠️" });
        else toast.success(`Import sinistres : ${data.created} créés, ${data.updated} mis à jour`);
        axios.get<HistoryEntry[]>("/api/import-global/history").then(r => setHistory(r.data)).catch(() => {});
      } else {
        const { data } = await axios.post<ImportResult>("/api/import-global", formData, { headers: { "Content-Type": "multipart/form-data" } });
        setResult(data);
        setStatus("done");
        const total = Object.values(data).reduce((s, r) => s + r.created + r.updated, 0);
        const errors = Object.values(data).reduce((s, r) => s + r.errors.length, 0);
        if (errors > 0) toast(`Import terminé : ${total} enregistrements — ${errors} ligne(s) ignorée(s)`, { icon: "⚠️" });
        else toast.success(`Import terminé : ${total} enregistrements traités`);
        axios.get<HistoryEntry[]>("/api/import-global/history").then(r => setHistory(r.data)).catch(() => {});
      }
    } catch (err: any) {
      setStatus("error");
      toast.error(err?.response?.data?.detail ?? "Erreur lors de l'import");
    }
  };

  const reset = () => {
    setMode(null); setStatus("idle"); setResult(null); setSinistreResult(null); setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const totalCreated = result ? Object.values(result).reduce((s, r) => s + r.created, 0) : 0;
  const totalUpdated = result ? Object.values(result).reduce((s, r) => s + r.updated, 0) : 0;
  const totalErrors  = result ? Object.values(result).reduce((s, r) => s + r.errors.length, 0) : 0;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 sticky top-0 z-20 bg-camugray-100 pt-1 pb-3">
          <h1 className="text-2xl font-bold text-camublue-900">Import en masse</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Uploadez le fichier Excel du tableau de bord pour alimenter automatiquement toutes les rubriques
          </p>
        </div>

        {/* Étape 1 : choix du type */}
        {status === "idle" && mode === null && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => { setMode("global"); setTimeout(() => inputRef.current?.click(), 0); }}
              className="group flex items-center gap-4 p-5 border-2 border-gray-200 hover:border-camublue-900 rounded-2xl text-left transition-all hover:bg-camublue-900/5"
            >
              <div className="w-11 h-11 rounded-xl bg-camublue-900/10 group-hover:bg-camublue-900/20 flex items-center justify-center shrink-0 transition">
                <LayoutGrid size={22} className="text-camublue-900" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">Import global</p>
                <p className="text-xs text-gray-400 mt-0.5">Tableau de bord — 9 rubriques</p>
              </div>
              <ChevronRightIcon size={18} className="text-gray-300 group-hover:text-camublue-900 shrink-0 transition" />
            </button>
            <button
              onClick={() => { setMode("sinistres"); setTimeout(() => inputRef.current?.click(), 0); }}
              className="group flex items-center gap-4 p-5 border-2 border-gray-200 hover:border-rose-400 rounded-2xl text-left transition-all hover:bg-rose-50/40"
            >
              <div className="w-11 h-11 rounded-xl bg-rose-100 group-hover:bg-rose-200 flex items-center justify-center shrink-0 transition">
                <ShieldAlert size={22} className="text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">Suivi des sinistres</p>
                <p className="text-xs text-gray-400 mt-0.5">Feuille SUIVI DES ASSURANCES</p>
              </div>
              <ChevronRightIcon size={18} className="text-gray-300 group-hover:text-rose-400 shrink-0 transition" />
            </button>
          </div>
        )}

        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

        {/* En cours */}
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center gap-6 py-20">
            <Loader2 size={48} className="text-camublue-900 animate-spin" />
            <div className="text-center">
              <p className="font-semibold text-gray-700 text-base">Import en cours…</p>
              <p className="text-sm text-gray-400 mt-1">{fileName}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
              {SECTIONS.map(s => (
                <div key={s.key} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5">
                  <Loader2 size={12} className="animate-spin text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-500 truncate">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Résultats Sinistres */}
        {status === "done" && sinistreResult && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{sinistreResult.created.toLocaleString("fr-FR")}</p>
                <p className="text-xs text-emerald-700 font-medium mt-0.5">Créés</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{sinistreResult.updated.toLocaleString("fr-FR")}</p>
                <p className="text-xs text-amber-700 font-medium mt-0.5">Mis à jour</p>
              </div>
              <div className={`border rounded-2xl p-4 text-center ${sinistreResult.errors.length > 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
                <p className={`text-2xl font-bold ${sinistreResult.errors.length > 0 ? "text-red-600" : "text-gray-400"}`}>{sinistreResult.errors.length}</p>
                <p className={`text-xs font-medium mt-0.5 ${sinistreResult.errors.length > 0 ? "text-red-700" : "text-gray-500"}`}>Erreurs</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl mb-6">
              <ShieldAlert size={20} className="text-rose-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-rose-700">Import Suivi des sinistres terminé</p>
                <p className="text-xs text-rose-500 mt-0.5">Fichier : {fileName}</p>
              </div>
            </div>
            {sinistreResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-6">
                <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2"><AlertTriangle size={15} /> Lignes ignorées</p>
                <ul className="text-xs text-red-500 list-disc pl-4 space-y-0.5 max-h-40 overflow-y-auto">
                  {sinistreResult.errors.slice(0, 20).map((e: any, i: number) => <li key={i}>Ligne {e.ligne} : {e.message}</li>)}
                  {sinistreResult.errors.length > 20 && <li>…et {sinistreResult.errors.length - 20} autres</li>}
                </ul>
              </div>
            )}
            <div className="flex justify-center mb-10">
              <button onClick={reset} className="flex items-center gap-2 px-6 py-3 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm">
                <Upload size={16} /> Nouvel import
              </button>
            </div>
          </>
        )}

        {/* Résultats Global */}
        {status === "done" && result && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{totalCreated.toLocaleString("fr-FR")}</p>
                <p className="text-xs text-emerald-700 font-medium mt-0.5">Créés</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{totalUpdated.toLocaleString("fr-FR")}</p>
                <p className="text-xs text-amber-700 font-medium mt-0.5">Mis à jour</p>
              </div>
              <div className={`border rounded-2xl p-4 text-center ${totalErrors > 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
                <p className={`text-2xl font-bold ${totalErrors > 0 ? "text-red-600" : "text-gray-400"}`}>{totalErrors}</p>
                <p className={`text-xs font-medium mt-0.5 ${totalErrors > 0 ? "text-red-700" : "text-gray-500"}`}>Erreurs</p>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-6">
              <div className="overflow-x-auto overflow-y-auto max-h-[50vh]">
              <table className="w-full text-sm">
                <thead className="bg-camublue-900 text-white text-xs uppercase sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Section</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Feuille Excel</th>
                    <th className="text-center px-4 py-2.5 font-semibold">Créés</th>
                    <th className="text-center px-4 py-2.5 font-semibold">MAJ</th>
                    <th className="text-center px-4 py-2.5 font-semibold">Erreurs</th>
                    <th className="text-center px-4 py-2.5 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {SECTIONS.map(s => {
                    const r = result[s.key];
                    const isSkipped = r.skipped;
                    const hasErrors = r.errors.length > 0;
                    const total = r.created + r.updated;
                    return (
                      <tr key={s.key} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>{s.icon}</span>
                            <span className="font-medium text-gray-700">{s.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs font-mono">{s.sheet}</td>
                        <td className="px-4 py-3 text-center font-semibold text-emerald-600">{isSkipped ? "—" : r.created}</td>
                        <td className="px-4 py-3 text-center font-semibold text-amber-600">{isSkipped ? "—" : r.updated}</td>
                        <td className="px-4 py-3 text-center">
                          {isSkipped ? "—" : hasErrors ? <span className="font-semibold text-red-600">{r.errors.length}</span> : <span className="text-gray-400">0</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isSkipped ? (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full"><X size={11} /> Ignorée</span>
                          ) : hasErrors ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full"><AlertTriangle size={11} /> Partiel</span>
                          ) : total === 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">— Vide</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} /> OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>

            {totalErrors > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-6">
                <p className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2"><AlertTriangle size={15} /> Détail des lignes ignorées</p>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {SECTIONS.map(s => {
                    const r = result[s.key];
                    if (!r.errors.length) return null;
                    return (
                      <div key={s.key}>
                        <p className="text-xs font-semibold text-red-600 mb-1">{s.label}</p>
                        <ul className="text-xs text-red-500 list-disc pl-4 space-y-0.5">
                          {r.errors.slice(0, 10).map((e, i) => <li key={i}>Ligne {e.ligne} : {e.message}</li>)}
                          {r.errors.length > 10 && <li>…et {r.errors.length - 10} autres</li>}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {SECTIONS.some(s => result[s.key].skipped) && (
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-6">
                <p className="text-sm font-semibold text-gray-600 mb-2">Feuilles non trouvées dans ce fichier</p>
                <ul className="text-xs text-gray-500 list-disc pl-4 space-y-1">
                  {SECTIONS.filter(s => result[s.key].skipped).map(s => <li key={s.key}><strong>{s.label}</strong> ({s.sheet}) — {result[s.key].skip_reason}</li>)}
                </ul>
              </div>
            )}

            <div className="flex justify-center mb-10">
              <button onClick={reset} className="flex items-center gap-2 px-6 py-3 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm">
                <Upload size={16} /> Nouvel import
              </button>
            </div>
          </>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4 py-16 text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-700">L'import a échoué</p>
              <p className="text-sm text-gray-400 mt-1">Vérifiez que le fichier est le bon tableau de bord Excel.</p>
            </div>
            <button onClick={reset} className="px-5 py-2.5 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition">Nouvel import</button>
          </div>
        )}

        {/* Historique */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-4">
            <History size={18} className="text-camublue-900" />
            <h2 className="text-base font-bold text-camublue-900">Historique des imports</h2>
          </div>
          {historyLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={24} className="text-gray-300 animate-spin" /></div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">Aucun import enregistré</div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto overflow-y-auto max-h-[50vh]">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Fichier</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Utilisateur</th>
                    <th className="text-center px-4 py-2.5 font-semibold">Créés</th>
                    <th className="text-center px-4 py-2.5 font-semibold">MAJ</th>
                    <th className="text-center px-4 py-2.5 font-semibold">Erreurs</th>
                    <th className="text-center px-4 py-2.5 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map(entry => (
                    <>
                      <tr key={entry.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(entry.created_at)}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate" title={entry.filename ?? ""}>{entry.filename ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{entry.username ?? "—"}</td>
                        <td className="px-4 py-3 text-center font-semibold text-emerald-600 text-xs">{entry.total_created.toLocaleString("fr-FR")}</td>
                        <td className="px-4 py-3 text-center font-semibold text-amber-600 text-xs">{entry.total_updated.toLocaleString("fr-FR")}</td>
                        <td className="px-4 py-3 text-center text-xs">
                          {entry.total_errors > 0 ? <span className="font-semibold text-red-600">{entry.total_errors}</span> : <span className="text-gray-300">0</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)} className="text-gray-400 hover:text-camublue-900 transition">
                            {expandedRow === entry.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        </td>
                      </tr>
                      {expandedRow === entry.id && (
                        <tr key={`${entry.id}-detail`}>
                          <td colSpan={7} className="px-4 pb-4 pt-1 bg-gray-50/50">
                            <div className="grid grid-cols-3 gap-2">
                              {SECTIONS.map(s => {
                                const sr = entry.results?.[s.key];
                                if (!sr) return null;
                                return (
                                  <div key={s.key} className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2">
                                    <span className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${s.color}`}>{s.icon}</span>
                                    <span className="text-xs text-gray-600 flex-1 truncate">{s.label}</span>
                                    {sr.skipped ? <span className="text-xs text-gray-300">—</span> : (
                                      <span className="text-xs font-semibold text-gray-500">+{sr.created} / ↻{sr.updated}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
