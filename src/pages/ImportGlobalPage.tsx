import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2,
  Car, DollarSign, Navigation, FileText, ClipboardCheck, Wrench,
  AlertOctagon, CircleDot, X, History, ChevronDown, ChevronUp,
  ShieldAlert, LayoutGrid, ChevronRight as ChevronRightIcon,
  Download, Search, Package, Calendar, Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import AppLayout from "@/components/layout/AppLayout";
import {
  coutService, missionChauffeurService, suiviDevisService,
  checklistVLService, suiviPanneService, pneumatiqueService, suiSinistreService,
  entretienService, entretienBisService,
} from "@/services/api";
// @ts-ignore
import writeXlsxFile from "write-excel-file/browser";

/* ─────────────────────────── Types Import ─────────────────────────── */
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

/* ─────────────────────────── Types Export ─────────────────────────── */
interface ExportHistoryEntry {
  id: string;
  date: string;
  modules: string[];
  annee?: number;
  mois?: number;
  filename: string;
  totalRows: number;
}

interface PeriodFilter { annee?: number; mois?: number; }

/* ─────────────────────────── Config sections ──────────────────────── */
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

/* ── Modules exportables avec leurs colonnes ── */
const MOIS_LABELS = ["","Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

const EXPORT_MODULES: {
  key: string; label: string; icon: React.ReactNode; color: string;
  fetchAll: (p: PeriodFilter) => Promise<any[]>;
  cols: { header: string; value: (r: any) => any }[];
}[] = [
  {
    key: "data_flottes", label: "Données flottes", icon: <DollarSign size={16} />, color: "text-emerald-700 bg-emerald-100",
    fetchAll: async (p) => (await coutService.getAll({
      annee: p.annee,
      mois: p.annee && p.mois ? `${p.annee}-${String(p.mois).padStart(2, "0")}` : undefined,
      page_size: 9999,
    })).items,
    cols: [
      { header: "Immatriculation",   value: r => r.immatriculation ?? "" },
      { header: "Type",              value: r => r.type_vehicule ?? "" },
      { header: "Marque",            value: r => r.marque ?? "" },
      { header: "Mois",              value: r => r.mois ?? "" },
      { header: "Année",             value: r => r.annee ?? "" },
      { header: "Type coût",         value: r => r.type_cout ?? "" },
      { header: "Montant (FCFA)",    value: r => r.montant ?? "" },
      { header: "Fournisseur",       value: r => r.fournisseur ?? "" },
      { header: "N° Facture",        value: r => r.numero_facture ?? "" },
      { header: "Date opération",    value: r => r.date_operation?.slice(0,10) ?? "" },
      { header: "SNC",               value: r => r.snc ?? "" },
      { header: "Commentaire",       value: r => r.commentaire ?? "" },
    ],
  },
  {
    key: "missions", label: "Chauffeurs Pôles", icon: <Navigation size={16} />, color: "text-sky-700 bg-sky-100",
    fetchAll: async (_p) => (await missionChauffeurService.getAll({ page_size: 9999 })).items,
    cols: [
      { header: "Immatriculation", value: r => r.immatriculation ?? "" },
      { header: "Chauffeur",       value: r => r.chauffeur ?? "" },
      { header: "Pôle",            value: r => r.pole ?? "" },
      { header: "Mission",         value: r => r.mission ?? "" },
      { header: "Date",            value: r => r.date?.slice(0,10) ?? "" },
      { header: "Mois",            value: r => r.mois ?? "" },
      { header: "Année",           value: r => r.annee ?? "" },
      { header: "SNC",             value: r => r.snc ?? "" },
      { header: "Commentaire",     value: r => r.commentaire ?? "" },
    ],
  },
  {
    key: "devis", label: "Suivi des devis", icon: <FileText size={16} />, color: "text-violet-700 bg-violet-100",
    fetchAll: async (_p) => (await suiviDevisService.getAll({ page_size: 9999 })).items,
    cols: [
      { header: "Immatriculation", value: r => r.immatriculation ?? "" },
      { header: "N° Devis",        value: r => r.numero_devis ?? "" },
      { header: "Objet",           value: r => r.objet ?? "" },
      { header: "Fournisseur",     value: r => r.fournisseur ?? "" },
      { header: "Montant (FCFA)",  value: r => r.montant ?? "" },
      { header: "Statut",          value: r => r.statut ?? "" },
      { header: "Date devis",      value: r => r.date_devis?.slice(0,10) ?? "" },
      { header: "Date réponse",    value: r => r.date_reponse?.slice(0,10) ?? "" },
      { header: "SNC",             value: r => r.snc ?? "" },
      { header: "Commentaire",     value: r => r.commentaire ?? "" },
    ],
  },
  {
    key: "checklists", label: "Check-lists VL", icon: <ClipboardCheck size={16} />, color: "text-amber-700 bg-amber-100",
    fetchAll: async (p) => {
      const res = await checklistVLService.getAll({ page_size: 9999 });
      return res.items;
    },
    cols: [
      { header: "Immatriculation", value: r => r.immatriculation ?? "" },
      { header: "Chauffeur",       value: r => r.chauffeur ?? "" },
      { header: "Année",           value: r => r.annee ?? "" },
      { header: "Semaine",         value: r => r.semaine ?? "" },
      { header: "Statut",          value: r => r.statut ?? "" },
      { header: "SNC",             value: r => r.snc ?? "" },
    ],
  },
  {
    key: "entretiens", label: "Entretiens", icon: <Wrench size={16} />, color: "text-orange-700 bg-orange-100",
    fetchAll: async (_p) => await entretienService.getAll(),
    cols: [
      { header: "Immatriculation",    value: r => r.immatriculation ?? "" },
      { header: "Marque",             value: r => r.marque ?? "" },
      { header: "Km actuel",          value: r => r.km_actuel ?? "" },
      { header: "Date der. entretien",value: r => r.date_dernier_entretien?.slice(0,10) ?? "" },
      { header: "Palier 1 (km)",      value: r => r.palier_1_km ?? "" },
      { header: "Palier 2 (km)",      value: r => r.palier_2_km ?? "" },
      { header: "Palier 3 (km)",      value: r => r.palier_3_km ?? "" },
      { header: "Reste (km)",         value: r => r.reste_km ?? "" },
      { header: "SNC",                value: r => r.snc ?? "" },
    ],
  },
  {
    key: "entretiens_bis", label: "Entretien BIS", icon: <Wrench size={16} />, color: "text-rose-700 bg-rose-100",
    fetchAll: async (_p) => await entretienBisService.getAll(),
    cols: [
      { header: "Immatriculation",    value: r => r.immatriculation ?? "" },
      { header: "Marque",             value: r => r.marque ?? "" },
      { header: "Km actuel",          value: r => r.km_actuel ?? "" },
      { header: "Kms départ",         value: r => r.kms_depart ?? "" },
      { header: "Date der. entretien",value: r => r.date_dernier_entretien?.slice(0,10) ?? "" },
      { header: "Palier 1 (km)",      value: r => r.palier_1_km ?? "" },
      { header: "Palier 2 (km)",      value: r => r.palier_2_km ?? "" },
      { header: "Palier 3 (km)",      value: r => r.palier_3_km ?? "" },
      { header: "Reste (km)",         value: r => r.reste_km ?? "" },
      { header: "Notes",              value: r => r.notes ?? "" },
      { header: "SNC",                value: r => r.snc ?? "" },
    ],
  },
  {
    key: "pannes", label: "Suivi des pannes", icon: <AlertOctagon size={16} />, color: "text-red-700 bg-red-100",
    fetchAll: async (_p) => (await suiviPanneService.getAll({ page_size: 9999 })).items,
    cols: [
      { header: "Immatriculation", value: r => r.immatriculation ?? "" },
      { header: "Nature panne",    value: r => r.nature_panne ?? "" },
      { header: "Description",     value: r => r.description ?? "" },
      { header: "Date panne",      value: r => r.date_panne?.slice(0,10) ?? "" },
      { header: "Date résolution", value: r => r.date_resolution?.slice(0,10) ?? "" },
      { header: "Statut",          value: r => r.statut ?? "" },
      { header: "Coût (FCFA)",     value: r => r.cout ?? "" },
      { header: "SNC",             value: r => r.snc ?? "" },
      { header: "Commentaire",     value: r => r.commentaire ?? "" },
    ],
  },
  {
    key: "pneumatiques", label: "Pneumatiques", icon: <CircleDot size={16} />, color: "text-teal-700 bg-teal-100",
    fetchAll: async (_p) => (await pneumatiqueService.getAll({ page_size: 9999 })).items,
    cols: [
      { header: "Fournisseur",       value: r => r.fournisseur ?? "" },
      { header: "Type",              value: r => r.type_location ?? "" },
      { header: "Immatriculation",   value: r => r.immatriculation ?? "" },
      { header: "Chauffeur",         value: r => r.chauffeur ?? "" },
      { header: "Kilométrage",       value: r => r.kilometrage ?? "" },
      { header: "N° Pneus",          value: r => r.nb_pneus ?? "" },
      { header: "Réf. pneu",         value: r => r.ref_pneu ?? "" },
      { header: "État",              value: r => r.etat ?? "" },
      { header: "SNC",               value: r => r.snc ?? "" },
      { header: "Zone intervention", value: r => r.zone_intervention ?? "" },
      { header: "Date prévue",       value: r => r.date_prevue?.slice(0,10) ?? "" },
      { header: "Commentaire",       value: r => r.commentaire ?? "" },
    ],
  },
  {
    key: "sinistres", label: "Suivi sinistres", icon: <ShieldAlert size={16} />, color: "text-pink-700 bg-pink-100",
    fetchAll: async (_p) => (await suiSinistreService.getAll({ page_size: 9999 })).items,
    cols: [
      { header: "Immatriculation", value: r => r.immatriculation ?? "" },
      { header: "Nature sinistre", value: r => r.nature_sinistre ?? "" },
      { header: "Date sinistre",   value: r => r.date_sinistre?.slice(0,10) ?? "" },
      { header: "Statut",          value: r => r.statut ?? "" },
      { header: "Montant déclaré", value: r => r.montant_declare ?? "" },
      { header: "Montant reçu",    value: r => r.montant_recu ?? "" },
      { header: "SNC",             value: r => r.snc ?? "" },
      { header: "Commentaire",     value: r => r.commentaire ?? "" },
    ],
  },
];

const EXPORT_HISTORY_KEY = "eflotte_export_history";
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

function loadExportHistory(): ExportHistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(EXPORT_HISTORY_KEY) ?? "[]"); } catch { return []; }
}
function saveExportHistory(h: ExportHistoryEntry[]) {
  localStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(h.slice(0, 50)));
}

/* ─────────────────────────── Helpers ──────────────────────────────── */
type ImportMode = null | "global" | "sinistres";
type Status = "idle" | "loading" | "done" | "error";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function makeHeaderCell(value: string) {
  return { value, type: String, backgroundColor: "#1E3A5F", color: "#FFFFFF", fontWeight: "bold" as const, align: "center" as const };
}
function makeDataCell(value: any) {
  return { value: value == null ? "" : String(value), type: String, color: "#000000", backgroundColor: "#FFFFFF" };
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function ImportGlobalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: "import" | "export" = tabParam === "export" ? "export" : "import";
  const setActiveTab = (t: "import" | "export") => setSearchParams({ tab: t });

  /* ── Import state ── */
  const [mode, setMode]       = useState<ImportMode>(null);
  const [status, setStatus]   = useState<Status>("idle");
  const [result, setResult]   = useState<ImportResult | null>(null);
  const [sinistreResult, setSinistreResult] = useState<{ created: number; updated: number; errors: any[] } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  /* ── Export state ── */
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(EXPORT_MODULES.map(m => m.key))
  );
  const [period, setPeriod] = useState<PeriodFilter>({});
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>("");
  const [exportHistory, setExportHistory] = useState<ExportHistoryEntry[]>(loadExportHistory);
  const [historySearch, setHistorySearch] = useState("");

  useEffect(() => {
    axios.get<HistoryEntry[]>("/api/import-global/history")
      .then(r => setHistory(r.data))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  /* ── Import handlers ── */
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

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setMode(null); setStatus("idle"); setResult(null); setSinistreResult(null); setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const totalCreated = result ? Object.values(result).reduce((s, r) => s + r.created, 0) : 0;
  const totalUpdated = result ? Object.values(result).reduce((s, r) => s + r.updated, 0) : 0;
  const totalErrors  = result ? Object.values(result).reduce((s, r) => s + r.errors.length, 0) : 0;

  /* ── Export handler ── */
  const handleExport = async () => {
    const modules = EXPORT_MODULES.filter(m => selectedModules.has(m.key));
    if (modules.length === 0) { toast.error("Sélectionnez au moins un module"); return; }

    setExporting(true);
    const sheets: any[][] = [];
    const sheetNames: string[] = [];
    const sheetCols: any[][] = [];
    let totalRows = 0;

    try {
      for (const mod of modules) {
        setExportProgress(`Chargement : ${mod.label}…`);
        const rows = await mod.fetchAll(period);
        totalRows += rows.length;

        const headerRow = mod.cols.map(c => makeHeaderCell(c.header));
        const dataRows = rows.map(row => mod.cols.map(c => makeDataCell(c.value(row))));
        sheets.push([headerRow, ...dataRows]);
        sheetNames.push(mod.label);
        sheetCols.push(mod.cols.map(c => ({
          width: Math.min(Math.max(c.header.length + 4, ...rows.map((r: any) => String(c.value(r) ?? "").length + 2)), 45),
        })));
      }

      setExportProgress("Génération du fichier Excel…");
      const periodLabel = period.annee
        ? `_${period.annee}${period.mois ? "_M" + String(period.mois).padStart(2, "0") : ""}`
        : "";
      const filename = `Export_PARC-CAM${periodLabel}_${new Date().toISOString().slice(0,10)}`;

      const result = await (writeXlsxFile as any)(sheets, { sheets: sheetNames, columns: sheetCols });
      await result.toFile(`${filename}.xlsx`);

      // Save to history
      const entry: ExportHistoryEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        modules: modules.map(m => m.label),
        annee: period.annee,
        mois: period.mois,
        filename: `${filename}.xlsx`,
        totalRows,
      };
      const newHistory = [entry, ...exportHistory];
      setExportHistory(newHistory);
      saveExportHistory(newHistory);

      toast.success(`Export terminé — ${totalRows.toLocaleString("fr-FR")} lignes`);
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur lors de l'export");
    } finally {
      setExporting(false);
      setExportProgress("");
    }
  };

  const toggleModule = (key: string) => {
    setSelectedModules(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const filteredExportHistory = exportHistory.filter(e =>
    !historySearch.trim() ||
    e.filename.toLowerCase().includes(historySearch.toLowerCase()) ||
    e.modules.some(m => m.toLowerCase().includes(historySearch.toLowerCase())) ||
    (e.annee && String(e.annee).includes(historySearch))
  );

  /* ═══════════════════════════════════════════ RENDER ══════════════ */
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="mb-6 sticky top-0 z-20 bg-camugray-100 pt-1 pb-3">
          <h1 className="text-2xl font-bold text-camublue-900">Import / Export global</h1>
          <p className="text-gray-500 text-sm mt-0.5">Importez ou exportez toutes les données du tableau de bord</p>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-8 w-fit">
          <button
            onClick={() => setActiveTab("import")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "import"
                ? "bg-white text-camublue-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Upload size={16} /> Import en masse
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "export"
                ? "bg-white text-camublue-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Download size={16} /> Export en masse
          </button>
        </div>

        {/* ══════════════════════ ONGLET IMPORT ══════════════════════ */}
        {activeTab === "import" && (
          <>
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

            {/* Historique imports */}
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
                                        <span className={`w-6 h-6 rounded flex items-center justify-center shrink-0 text-[11px] ${s.color}`}>{s.icon}</span>
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
          </>
        )}

        {/* ══════════════════════ ONGLET EXPORT ══════════════════════ */}
        {activeTab === "export" && (
          <>
            {/* Filtre par période */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={17} className="text-camublue-900" />
                <h2 className="text-sm font-bold text-camublue-900">Période</h2>
                <span className="text-xs text-gray-400 ml-1">(optionnel — laissez vide pour tout exporter)</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={period.annee ?? ""}
                  onChange={e => setPeriod(p => ({ ...p, annee: e.target.value ? Number(e.target.value) : undefined, mois: e.target.value ? p.mois : undefined }))}
                  className="input-base w-36"
                >
                  <option value="">Toutes années</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                  value={period.mois ?? ""}
                  onChange={e => setPeriod(p => ({ ...p, mois: e.target.value ? Number(e.target.value) : undefined }))}
                  className="input-base w-36"
                  disabled={!period.annee}
                >
                  <option value="">Tous les mois</option>
                  {MOIS_LABELS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
                {(period.annee || period.mois) && (
                  <button onClick={() => setPeriod({})} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition">
                    <X size={13} /> Réinitialiser
                  </button>
                )}
                {period.annee && (
                  <span className="text-xs font-semibold text-camublue-900 bg-camublue-900/10 px-3 py-1.5 rounded-lg">
                    {period.mois ? `${MOIS_LABELS[period.mois]} ${period.annee}` : `Année ${period.annee}`}
                  </span>
                )}
              </div>
            </div>

            {/* Sélection des modules */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package size={17} className="text-camublue-900" />
                  <h2 className="text-sm font-bold text-camublue-900">Modules à exporter</h2>
                  <span className="text-xs text-gray-400">({selectedModules.size}/{EXPORT_MODULES.length} sélectionnés)</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedModules(new Set(EXPORT_MODULES.map(m => m.key)))}
                    className="text-xs text-camublue-900 hover:underline font-medium">Tout sélectionner</button>
                  <span className="text-gray-300">·</span>
                  <button onClick={() => setSelectedModules(new Set())}
                    className="text-xs text-gray-400 hover:text-gray-600 hover:underline">Tout désélectionner</button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {EXPORT_MODULES.map(mod => {
                  const checked = selectedModules.has(mod.key);
                  return (
                    <button
                      key={mod.key}
                      onClick={() => toggleModule(mod.key)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        checked
                          ? "border-camublue-900 bg-camublue-900/5"
                          : "border-gray-100 hover:border-gray-200 bg-gray-50"
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${mod.color}`}>{mod.icon}</span>
                      <span className={`text-sm font-medium flex-1 ${checked ? "text-camublue-900" : "text-gray-500"}`}>{mod.label}</span>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        checked ? "bg-camublue-900 border-camublue-900" : "border-gray-300 bg-white"
                      }`}>
                        {checked && <CheckCircle2 size={10} className="text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bouton export */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={handleExport}
                disabled={exporting || selectedModules.size === 0}
                className="flex items-center gap-2 px-8 py-3 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {exporting ? "Export en cours…" : `Exporter ${selectedModules.size > 0 ? `(${selectedModules.size} module${selectedModules.size > 1 ? "s" : ""})` : ""}`}
              </button>
              {exporting && exportProgress && (
                <p className="text-sm text-gray-500 animate-pulse">{exportProgress}</p>
              )}
            </div>

            {/* Historique des exports */}
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <History size={18} className="text-camublue-900" />
                  <h2 className="text-base font-bold text-camublue-900">Historique des exports</h2>
                  {exportHistory.length > 0 && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{exportHistory.length}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {exportHistory.length > 0 && (
                    <button
                      onClick={() => { if (confirm("Effacer tout l'historique ?")) { setExportHistory([]); saveExportHistory([]); } }}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition"
                    >
                      <Trash2 size={13} /> Effacer
                    </button>
                  )}
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={e => setHistorySearch(e.target.value)}
                      placeholder="Rechercher…"
                      className="input-base pl-8 text-sm w-48"
                    />
                  </div>
                </div>
              </div>

              {exportHistory.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400 bg-gray-50 rounded-2xl border border-gray-100">
                  <Download size={32} className="text-gray-200 mx-auto mb-3" />
                  Aucun export enregistré dans cette session
                </div>
              ) : filteredExportHistory.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-400">Aucun résultat pour « {historySearch} »</div>
              ) : (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto overflow-y-auto max-h-[50vh]">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase sticky top-0 z-10">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Fichier</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Période</th>
                        <th className="text-center px-4 py-2.5 font-semibold">Modules</th>
                        <th className="text-center px-4 py-2.5 font-semibold">Lignes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredExportHistory.map(entry => (
                        <tr key={entry.id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(entry.date)}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 font-medium max-w-[220px] truncate" title={entry.filename}>
                            <div className="flex items-center gap-1.5">
                              <FileSpreadsheet size={13} className="text-emerald-500 shrink-0" />
                              {entry.filename}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {entry.annee
                              ? entry.mois
                                ? `${MOIS_LABELS[entry.mois]} ${entry.annee}`
                                : `Année ${entry.annee}`
                              : "Toutes périodes"
                            }
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {entry.modules.slice(0, 3).map(m => (
                                <span key={m} className="text-[10px] bg-camublue-900/10 text-camublue-900 px-1.5 py-0.5 rounded-full font-medium">{m}</span>
                              ))}
                              {entry.modules.length > 3 && (
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">+{entry.modules.length - 3}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-semibold text-gray-600">
                            {entry.totalRows.toLocaleString("fr-FR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
