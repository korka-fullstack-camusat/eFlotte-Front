import { useState } from "react";
import {
  Loader2, X, History, Trash2,
  ShieldAlert, Calendar, FileSpreadsheet, FolderArchive,
  Download, CheckSquare, Square, RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import {
  coutService, missionChauffeurService, suiviDevisService,
  checklistVLService, suiviPanneService, pneumatiqueService, suiSinistreService,
  entretienService, entretienBisService,
} from "@/services/api";
// @ts-ignore
import writeXlsxFile from "write-excel-file/browser";
import JSZip from "jszip";

/* ─── Types ──────────────────────────────────────────────── */
interface ExportHistoryEntry {
  id: string; date: string; annee?: number; mois?: number;
  filename: string; totalRows: number; type: "flotte" | "sinistres" | "zip";
}
interface PeriodFilter { annee?: number; mois?: number; }
type ExportTarget = "flotte" | "sinistres" | "both";
type ExportTargetOrNull = ExportTarget | null;

/* ─── Cellules Excel ─────────────────────────────────────── */
const H = (value: string) => ({
  value, type: String,
  backgroundColor: "#1E3A5F", textColor: "#FFFFFF",
  fontWeight: "bold" as const, align: "center" as const,
});
const TITLE = (value: string) => ({
  value, type: String,
  backgroundColor: "#0D2444", textColor: "#FFFFFF",
  fontWeight: "bold" as const, align: "left" as const,
});
const D = (value: any) => ({
  value: value == null ? "" : String(value),
  type: String, textColor: "#000000", backgroundColor: "#FFFFFF",
});
const E = () => ({ value: "", type: String, backgroundColor: "#FFFFFF", textColor: "#000000" });

function autoWidth(rows: any[][], colIdx: number, header: string): number {
  const maxLen = rows.reduce((m, r) => {
    const v = r[colIdx];
    const len = v && typeof v === "object" && "value" in v ? String(v.value ?? "").length : 0;
    return Math.max(m, len);
  }, header.length);
  return Math.min(maxLen + 4, 50);
}

/* ─── Constantes ─────────────────────────────────────────── */
const MOIS_LABELS = ["","Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

/* ─── LocalStorage ───────────────────────────────────────── */
const HISTORY_KEY = "eflotte_export_history_v2";
const loadHistory = (): ExportHistoryEntry[] => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); } catch { return []; }
};
const saveHistory = (h: ExportHistoryEntry[]) =>
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 50)));

function fmtDateDisplay(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/* ═══════════════ BUILDERS ═════════════════════════════════ */

function buildDataFlottes(rows: any[]) {
  const COLS = ["TYPE DE LOCATION","Fournisseur","Type Vehicule","Plaque d'immatriculation","Mois","Type_Cout","Valeur"];
  const header = COLS.map(H);
  const data = rows.map(r => [
    D(r.type_location), D(r.fournisseur), D(r.type_vehicule),
    D(r.plaque_immatriculation), D(r.mois), D(r.type_cout), D(r.valeur),
  ]);
  const allRows = [header, ...data];
  return { data: allRows, columns: COLS.map((h, i) => ({ width: autoWidth(allRows, i, h) })), sheet: "DATA_FLOTTES" };
}

function buildChauffeurPoles(rows: any[], annee?: number) {
  const COLS = ["DATE","IMMA","CHAUFFEUR","DEMANDEUR","TELEPHONE","PROJET","DESTINATION","DATE DEPART","DATE RETOUR","COMMENTAIRES"];
  const titleRow = [TITLE(`ANNEE ${annee ?? CURRENT_YEAR}`), ...Array(COLS.length - 1).fill(E())];
  const header = COLS.map(H);
  const data = rows.map(r => [
    D(r.date?.slice(0,10)), D(r.immatriculation), D(r.chauffeur), D(r.demandeur),
    D(r.telephone), D(r.projet), D(r.destination),
    D(r.date_depart?.slice(0,10)), D(r.date_retour?.slice(0,10)), D(r.commentaires),
  ]);
  const allRows = [titleRow, header, ...data];
  return { data: allRows, columns: COLS.map((h, i) => ({ width: autoWidth(allRows, i, h) })), sheet: "CHAUFFEUR POLES" };
}

function buildSuiviDevis(rows: any[]) {
  const COLS = ["N° Devis","Description","Matricule","Sous-traitant","Valeur devis (FCFA)","Montant (FCFA)","Code SNC","PO émis","Date"];
  const header = COLS.map(H);
  const data = rows.map(r => [
    D(r.numero_devis), D(r.descriptions), D(r.matricule), D(r.sous_traitant),
    D(r.valeur_devis), D(r.montant), D(r.code_snc), D(r.po_emis), D(r.date?.slice(0,10)),
  ]);
  const allRows = [header, ...data];
  return { data: allRows, columns: COLS.map((h, i) => ({ width: autoWidth(allRows, i, h) })), sheet: "SUIVI DES DEVIS" };
}

function buildCheckListsVL(rows: any[]) {
  const semaineSet = new Set<string>();
  rows.forEach(r => r.semaines && Object.keys(r.semaines).forEach((k: string) => semaineSet.add(k)));
  const semaines = Array.from(semaineSet).sort((a, b) => {
    return (parseInt(a.replace(/\D/g, ""), 10) || 0) - (parseInt(b.replace(/\D/g, ""), 10) || 0);
  });
  const fixedCols = ["Brand","Model","Reg. №","Label","Car Group"];
  const COLS = [...fixedCols, ...semaines];
  const emptyRow1 = COLS.map(E);
  const header = COLS.map(H);
  const data = rows.map(r => [
    D(r.brand), D(r.model), D(r.plaque_immatriculation), D(r.label), D(r.car_group),
    ...semaines.map(s => D(r.semaines?.[s])),
  ]);
  const allRows = [emptyRow1, header, ...data];
  return { data: allRows, columns: COLS.map((h, i) => ({ width: autoWidth(allRows, i, h) })), sheet: "SUIVI DES CHECK LISTS VL" };
}

function buildEntretiens(rows: any[]) {
  const palierSet = new Set<string>();
  rows.forEach(r => r.paliers && Object.keys(r.paliers).forEach((k: string) => palierSet.add(k)));
  const paliers = Array.from(palierSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const fixedLeft = ["TYPE DE LOCATION","Fournisseur","Type Vehicule","Matricule","NOM"];
  const COLS = [...fixedLeft, ...paliers, "REST"];
  const titleRow1 = COLS.map((_, i) => i === 8 ? TITLE("CONTRAT D'ENTRETIEN CAMUSAT L2") : E());
  const emptyRow2 = COLS.map(E);
  const header = COLS.map((c, i) => i < 3 ? E() : H(c));
  const data = rows.map(r => [
    D(r.type_location), D(r.fournisseur), D(r.type_vehicule),
    D(r.plaque_immatriculation), D(r.nom_chauffeur),
    ...paliers.map(p => D(r.paliers?.[p])), D(r.reste),
  ]);
  const allRows = [titleRow1, emptyRow2, header, ...data];
  return { data: allRows, columns: COLS.map((h, i) => ({ width: autoWidth(allRows, i, h) })), sheet: "ENTRTIENS" };
}

function buildEntretienBis(rows: any[]) {
  const palierSet = new Set<string>();
  rows.forEach(r => r.paliers && Object.keys(r.paliers).forEach((k: string) => palierSet.add(k)));
  const paliers = Array.from(palierSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const fixedLeft = ["RT","STATUT","MODEL","Matricule","KMS DE DEPART","NOTES"];
  const COLS = [...fixedLeft, ...paliers, "REST"];
  const titleRow1 = COLS.map((_, i) => i === 8 ? TITLE("CONTRAT D'ENTRETIEN CAMUSAT L2") : E());
  const emptyRow2 = COLS.map(E);
  const header = COLS.map(H);
  const data = rows.map(r => [
    D(r.rt), D(r.statut), D(r.modele), D(r.plaque_immatriculation),
    D(r.kms_depart), D(r.notes),
    ...paliers.map(p => D(r.paliers?.[p])), D(r.reste),
  ]);
  const allRows = [titleRow1, emptyRow2, header, ...data];
  return { data: allRows, columns: COLS.map((h, i) => ({ width: autoWidth(allRows, i, h) })), sheet: "ENTRETIEN BIS" };
}

function buildSuiviPannes(rows: any[]) {
  const COLS = [
    "DATE","IMMA","NOM","GARAGE",
    "Nature de non disponibilité ou immobilisation",
    "Date d'indisponibilité","PROJET","Date de fin de réparation",
    "Site","Commentaire","Chargé des travaux","Immobilisations (jrs)",
  ];
  const header = COLS.map(H);
  const data = rows.map(r => [
    D(r.date?.slice(0,10)), D(r.immatriculation), D(r.nom), D(r.garage),
    D(r.nature_panne), D(r.date_indisponibilite?.slice(0,10)), D(r.projet),
    D(r.date_fin_reparation?.slice(0,10)), D(r.site), D(r.commentaire),
    D(""), D(r.immobilisation_jrs),
  ]);
  const allRows = [header, ...data];
  return { data: allRows, columns: COLS.map((h, i) => ({ width: autoWidth(allRows, i, h) })), sheet: "SUIVI DES PANNE" };
}

function buildPneumatiques(rows: any[]) {
  const COLS = ["IMMA","CHAUFF","Kilometrage","N PNEUS","REF","ETAT","SNC","DATE PREV","COMMENTAIRE"];
  const emptyRow1 = COLS.map(E);
  const infoRow2 = COLS.map((_, i) => i === 0 ? D("Suivi des Pneumatiques") : E());
  const header = COLS.map(H);
  const data = rows.map(r => [
    D(r.immatriculation), D(r.chauffeur), D(r.kilometrage), D(r.nb_pneus),
    D(r.ref_pneu), D(r.etat), D(r.snc), D(r.date_prevue?.slice(0,10)), D(r.commentaire),
  ]);
  const allRows = [emptyRow1, infoRow2, header, ...data];
  return { data: allRows, columns: COLS.map((h, i) => ({ width: autoWidth(allRows, i, h) })), sheet: "PNEUMATIQUE" };
}

function buildSinistres(rows: any[]) {
  const COLS = [
    "N°","DATE DE DECLARATION","CATEGORIE","BRANCHE","MATRICULE","PROPRIETE",
    "SNC","PROJET","CIRCONSTANCES DU SINISTRE","DOCUMENTATION","TRAITER",
    "STATUT DU SINISTRE","POSITION VEHICULE","LIEU IMMOBILISATION","OBSERVATIONS",
  ];
  const header = COLS.map(H);
  const data = rows.map((r, idx) => [
    D(`N°${idx + 1}`),
    D(r.date_declaration?.slice(0,10) ?? r.date_sinistre?.slice(0,10)),
    D(""), D("AUTO"),
    D(r.matricule), D(r.type_location), D(r.snc), D(r.projet),
    D(r.circonstances),
    D(r.documentation ? "1" : ""), D(r.traiter ? "1" : ""),
    D(r.statut), D(r.position_vehicule), D(r.lieu_immobilisation), D(r.observations),
  ]);
  const allRows = [header, ...data];
  return { data: allRows, columns: COLS.map((h, i) => ({ width: autoWidth(allRows, i, h) })), sheet: "DONNEES" };
}

/* ─── Helpers de téléchargement ──────────────────────────── */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

async function toBlob(sheets: any[]): Promise<Blob> {
  const res = await (writeXlsxFile as any)(sheets);
  return typeof res.toBlob === "function" ? await res.toBlob() : res;
}

/* ═══════════════════════════════════════════════════════════ */
export default function ExportPage() {
  const [showModal,       setShowModal]       = useState(false);
  const [target,         setTarget]          = useState<ExportTargetOrNull>(null);
  const [period,         setPeriod]          = useState<PeriodFilter>({});
  const [exporting,      setExporting]       = useState(false);
  const [progress,       setProgress]        = useState("");
  const [exportHistory,  setExportHistory]   = useState<ExportHistoryEntry[]>(loadHistory);
  const [detailEntry,    setDetailEntry]     = useState<ExportHistoryEntry | null>(null);
  const [redownloading,  setRedownloading]   = useState<string | null>(null);

  /* ── Chargement données ───────────────────────────────────────────────────
   * Seul /api/couts accepte annee:int en query param.
   * Les autres endpoints n'acceptent que page_size (pas de filtre date).
   * On NE passe PAS mois (backend attend date, pas entier) → 422 sinon.
   * ────────────────────────────────────────────────────────────────────── */
  async function loadFlotteData(p: PeriodFilter) {
    const [couts, missions, devis, checklists, entretiens, entretiensBis, pannes, pneumatiques] =
      await Promise.all([
        coutService.getAll({ annee: p.annee, page_size: 9999 } as any).then(r => r.items),
        missionChauffeurService.getAll({ page_size: 9999 }).then(r => r.items),
        suiviDevisService.getAll({ page_size: 9999 }).then(r => r.items),
        checklistVLService.getAll({ page_size: 9999 } as any).then(r => r.items),
        entretienService.getAll(),
        entretienBisService.getAll(),
        suiviPanneService.getAll({ page_size: 9999 }).then(r => r.items),
        pneumatiqueService.getAll({ page_size: 9999 }).then(r => r.items),
      ]);
    return { couts, missions, devis, checklists, entretiens, entretiensBis, pannes, pneumatiques,
      total: couts.length + missions.length + devis.length + checklists.length +
             entretiens.length + entretiensBis.length + pannes.length + pneumatiques.length };
  }

  async function loadSinistresData(_p: PeriodFilter) {
    const items = (await suiSinistreService.getAll({ page_size: 9999 })).items;
    return { sinistres: items, total: items.length };
  }

  /* ── Export ─── */
  const handleExport = async () => {
    setExporting(true);
    const p = period;
    const y = p.annee ?? CURRENT_YEAR;
    const dateSuffix = new Date().toISOString().slice(0, 10);
    let totalRows = 0;

    try {
      if (target === "flotte" || target === "both" as ExportTargetOrNull) {
        setProgress("Chargement des données flottes…");
        const d = await loadFlotteData(p);
        totalRows += d.total;

        setProgress("Génération du fichier Excel…");
        const blob = await toBlob([
          buildDataFlottes(d.couts),
          buildChauffeurPoles(d.missions, y),
          buildSuiviDevis(d.devis),
          buildCheckListsVL(d.checklists),
          buildEntretiens(d.entretiens),
          buildEntretienBis(d.entretiensBis),
          buildSuiviPannes(d.pannes),
          buildPneumatiques(d.pneumatiques),
        ]);

        if (target === "flotte") {
          downloadBlob(blob, `TABLEAU DE BORD FLOTTE ANNEE ${y}.xlsx`);
          pushHistory({ annee: p.annee, mois: p.mois, filename: `TABLEAU DE BORD FLOTTE ANNEE ${y}.xlsx`, totalRows, type: "flotte" });
          toast.success(`Export terminé — ${totalRows.toLocaleString("fr-FR")} lignes`);
          setShowModal(false);
          return;
        }

        // mode "both" : on garde le blob pour le ZIP
        setProgress("Chargement des données sinistres…");
        const ds = await loadSinistresData(p);
        totalRows += ds.total;

        setProgress("Génération du fichier sinistres…");
        const blob2 = await toBlob([buildSinistres(ds.sinistres)]);

        setProgress("Création du dossier ZIP…");
        const folderName = `Export_PARC-CAM_${y}${p.mois ? `_M${String(p.mois).padStart(2,"0")}` : ""}_${dateSuffix}`;
        const zip = new JSZip();
        const folder = zip.folder(folderName)!;
        folder.file(`TABLEAU DE BORD FLOTTE ANNEE ${y}.xlsx`, blob);
        folder.file(`ETAT SUIVI DES SINISTRES ${y}.xlsx`, blob2);
        const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
        downloadBlob(zipBlob, `${folderName}.zip`);
        pushHistory({ annee: p.annee, mois: p.mois, filename: `${folderName}.zip`, totalRows, type: "zip" });
        toast.success(`Export terminé — ${totalRows.toLocaleString("fr-FR")} lignes · 2 fichiers dans le ZIP`);

      } else {
        // sinistres seulement
        setProgress("Chargement des données sinistres…");
        const ds = await loadSinistresData(p);
        totalRows = ds.total;

        setProgress("Génération du fichier Excel…");
        const blob = await toBlob([buildSinistres(ds.sinistres)]);
        downloadBlob(blob, `ETAT SUIVI DES SINISTRES ${y}.xlsx`);
        pushHistory({ annee: p.annee, mois: p.mois, filename: `ETAT SUIVI DES SINISTRES ${y}.xlsx`, totalRows, type: "sinistres" });
        toast.success(`Export terminé — ${totalRows.toLocaleString("fr-FR")} lignes`);
      }

      setShowModal(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Erreur lors de l'export");
    } finally {
      setExporting(false);
      setProgress("");
    }
  };

  function pushHistory(entry: Omit<ExportHistoryEntry, "id" | "date">) {
    const newEntry: ExportHistoryEntry = { id: Date.now().toString(), date: new Date().toISOString(), ...entry };
    setExportHistory(prev => { const h = [newEntry, ...prev]; saveHistory(h); return h; });
  }

  /* ── Re-téléchargement depuis l'historique ── */
  async function handleRedownload(entry: ExportHistoryEntry) {
    setRedownloading(entry.id);
    const p: PeriodFilter = { annee: entry.annee, mois: entry.mois };
    const y = entry.annee ?? CURRENT_YEAR;
    const tgt: ExportTarget = entry.type === "zip" ? "both" : entry.type;
    try {
      if (tgt === "flotte" || tgt === "both") {
        const d = await loadFlotteData(p);
        const blob = await toBlob([
          buildDataFlottes(d.couts), buildChauffeurPoles(d.missions, y),
          buildSuiviDevis(d.devis), buildCheckListsVL(d.checklists),
          buildEntretiens(d.entretiens), buildEntretienBis(d.entretiensBis),
          buildSuiviPannes(d.pannes), buildPneumatiques(d.pneumatiques),
        ]);
        if (tgt === "flotte") { downloadBlob(blob, `TABLEAU DE BORD FLOTTE ANNEE ${y}.xlsx`); return; }

        const ds = await loadSinistresData(p);
        const blob2 = await toBlob([buildSinistres(ds.sinistres)]);
        const dateSuffix = new Date().toISOString().slice(0, 10);
        const folderName = `Export_PARC-CAM_${y}${p.mois ? `_M${String(p.mois).padStart(2,"0")}` : ""}_${dateSuffix}`;
        const zip = new JSZip();
        const folder = zip.folder(folderName)!;
        folder.file(`TABLEAU DE BORD FLOTTE ANNEE ${y}.xlsx`, blob);
        folder.file(`ETAT SUIVI DES SINISTRES ${y}.xlsx`, blob2);
        const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
        downloadBlob(zipBlob, `${folderName}.zip`);
      } else {
        const ds = await loadSinistresData(p);
        const blob = await toBlob([buildSinistres(ds.sinistres)]);
        downloadBlob(blob, `ETAT SUIVI DES SINISTRES ${y}.xlsx`);
      }
      toast.success("Fichier re-téléchargé");
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur lors du re-téléchargement");
    } finally {
      setRedownloading(null);
    }
  }

  const PERIOD_LABEL = period.annee
    ? period.mois ? `${MOIS_LABELS[period.mois]} ${period.annee}` : `Année ${period.annee}`
    : "Toutes périodes";

  const TARGET_META: Record<ExportTarget, { label: string; icon: React.ReactNode; desc: string; ext: string }> = {
    flotte:    { label: "TABLEAU DE BORD FLOTTE",     icon: <FileSpreadsheet size={20} className="text-emerald-600" />, desc: "8 feuilles : DATA, CHAUFFEURS, DEVIS, CHECK LISTS, ENTRETIENS, PANNES, PNEUMATIQUES…", ext: ".xlsx" },
    sinistres: { label: "ETAT SUIVI DES SINISTRES",   icon: <ShieldAlert size={20} className="text-rose-500" />,        desc: "1 feuille : DONNEES",                                                                    ext: ".xlsx" },
    both:      { label: "Les 2 fichiers (dossier ZIP)", icon: <FolderArchive size={20} className="text-amber-500" />,   desc: "Télécharge un dossier .zip contenant les 2 fichiers Excel",                               ext: ".zip"  },
  };

  /* ─────────────────────── RENDER ───────────────────────── */
  return (
    <AppLayout>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8 sticky top-0 z-20 bg-camugray-100 -mx-4 px-4 md:-mx-8 md:px-8 pt-1 pb-3">
        <div>
          <h1 className="text-2xl font-bold text-camublue-900">Export en masse</h1>
          <p className="text-gray-400 text-sm mt-0.5">Historique des fichiers générés</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setTarget(null); setPeriod({}); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <Download size={16} />
          Exporter
        </button>
      </div>

      {/* ── Historique ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
        {/* Barre recherche */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <History size={16} className="text-camublue-900" />
            <span className="text-sm font-bold text-camublue-900">Historique des exports</span>
            {exportHistory.length > 0 && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{exportHistory.length}</span>
            )}
          </div>
          {exportHistory.length > 0 && (
            <button
              onClick={() => { if (confirm("Effacer tout l'historique ?")) { setExportHistory([]); saveHistory([]); } }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition"
            >
              <Trash2 size={13} /> Effacer
            </button>
          )}
        </div>

        {/* Table */}
        {exportHistory.length === 0 ? (
          <div className="text-center py-20">
            <FolderArchive size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Aucun export enregistré</p>
            <p className="text-xs text-gray-300 mt-1">Cliquez sur « Exporter » pour générer votre premier fichier</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-camublue-900 text-white text-xs uppercase sticky top-0 z-10">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Date</th>
                <th className="text-left px-5 py-3 font-semibold">Fichier</th>
                <th className="text-left px-5 py-3 font-semibold">Période</th>
                <th className="text-center px-5 py-3 font-semibold">Lignes</th>
                <th className="text-center px-5 py-3 font-semibold">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {exportHistory.map(entry => {
                const periodLabel = entry.annee
                  ? entry.mois ? `${MOIS_LABELS[entry.mois]} ${entry.annee}` : `Année ${entry.annee}`
                  : "Toutes périodes";
                return (
                  <tr
                    key={entry.id}
                    onClick={() => setDetailEntry(entry)}
                    className="hover:bg-gray-50/70 cursor-pointer select-none"
                  >
                    <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDateDisplay(entry.date)}</td>
                    <td className="px-5 py-3 max-w-xs">
                      <div className="flex items-center gap-2">
                        {entry.type === "zip"
                          ? <FolderArchive size={14} className="text-amber-500 shrink-0" />
                          : entry.type === "sinistres"
                          ? <ShieldAlert size={14} className="text-rose-500 shrink-0" />
                          : <FileSpreadsheet size={14} className="text-emerald-600 shrink-0" />
                        }
                        <span className="text-xs text-gray-700 font-medium truncate" title={entry.filename}>
                          {entry.filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{periodLabel}</td>
                    <td className="px-5 py-3 text-center text-xs font-semibold text-gray-600">
                      {entry.totalRows.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        entry.type === "zip" ? "bg-amber-100 text-amber-700"
                        : entry.type === "sinistres" ? "bg-rose-100 text-rose-600"
                        : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {entry.type === "zip" ? "ZIP" : entry.type === "sinistres" ? "Sinistres" : "Flotte"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* ══════════════ MODAL EXPORT ══════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-camublue-900">Exporter des données</h2>
                <p className="text-xs text-gray-400 mt-0.5">Choisissez le fichier à télécharger</p>
              </div>
              <button onClick={() => !exporting && setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Choix du fichier */}
              <div className="space-y-2">
                {(["flotte","sinistres","both"] as ExportTarget[]).map(t => {
                  const meta = TARGET_META[t];
                  const selected = (target as string) === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setTarget(t)}
                      className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition text-left ${
                        selected ? "border-camublue-900 bg-camublue-900/5" : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-800">{meta.label}</span>
                          <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{meta.ext}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{meta.desc}</p>
                      </div>
                      <div className="shrink-0 mt-1">
                        {selected
                          ? <CheckSquare size={18} className="text-camublue-900" />
                          : <Square size={18} className="text-gray-300" />
                        }
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Filtre période — affiché seulement après sélection */}
              {target !== null && <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={14} className="text-camublue-900" />
                  <span className="text-xs font-semibold text-camublue-900">Période</span>
                  <span className="text-xs text-gray-400">— optionnel</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Année</label>
                    <select
                      value={period.annee ?? ""}
                      onChange={e => setPeriod({ annee: e.target.value ? Number(e.target.value) : undefined, mois: undefined })}
                      className="input-base text-sm w-32"
                    >
                      <option value="">Toutes</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Mois</label>
                    <select
                      value={period.mois ?? ""}
                      onChange={e => setPeriod(p => ({ ...p, mois: e.target.value ? Number(e.target.value) : undefined }))}
                      className="input-base text-sm w-32"
                      disabled={!period.annee}
                    >
                      <option value="">Tous</option>
                      {MOIS_LABELS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                  {(period.annee || period.mois) && (
                    <div className="mt-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-camublue-900 bg-camublue-900/10 px-2.5 py-1 rounded-lg">
                        <Calendar size={11} /> {PERIOD_LABEL}
                      </span>
                    </div>
                  )}
                </div>
              </div>}

              {/* Progression */}
              {exporting && progress && (
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 rounded-xl px-4 py-3">
                  <Loader2 size={15} className="animate-spin text-camublue-900 shrink-0" />
                  <span className="text-xs">{progress}</span>
                </div>
              )}
            </div>

            {/* Footer modal */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                disabled={exporting}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium transition disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                onClick={handleExport}
                disabled={exporting || target === null}
                className="flex items-center gap-2 px-5 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting
                  ? <><Loader2 size={15} className="animate-spin" /> Génération…</>
                  : <><Download size={15} /> Télécharger</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════ MODAL DÉTAIL HISTORIQUE ══════════════ */}
      {detailEntry && (() => {
        const e = detailEntry;
        const isRedl = redownloading === e.id;
        const periodLabel = e.annee
          ? e.mois ? `${MOIS_LABELS[e.mois]} ${e.annee}` : `Année ${e.annee}`
          : "Toutes périodes";
        const typeColor = e.type === "zip" ? "bg-amber-100 text-amber-700"
          : e.type === "sinistres" ? "bg-rose-100 text-rose-600"
          : "bg-emerald-100 text-emerald-700";
        const typeLabel = e.type === "zip" ? "ZIP" : e.type === "sinistres" ? "Sinistres" : "Flotte";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    e.type === "zip" ? "bg-amber-50" : e.type === "sinistres" ? "bg-rose-50" : "bg-emerald-50"
                  }`}>
                    {e.type === "zip"
                      ? <FolderArchive size={18} className="text-amber-500" />
                      : e.type === "sinistres"
                      ? <ShieldAlert size={18} className="text-rose-500" />
                      : <FileSpreadsheet size={18} className="text-emerald-600" />
                    }
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-camublue-900">Détail de l'export</h2>
                    <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${typeColor}`}>
                      {typeLabel}
                    </span>
                  </div>
                </div>
                <button onClick={() => setDetailEntry(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              {/* Corps */}
              <div className="px-6 py-5 space-y-3">
                {[
                  { label: "Fichier",          value: e.filename },
                  { label: "Généré le",        value: fmtDateDisplay(e.date) },
                  { label: "Période",          value: periodLabel },
                  { label: "Lignes exportées", value: e.totalRows.toLocaleString("fr-FR") },
                  { label: "Contenu",          value:
                      e.type === "zip"
                        ? "TABLEAU DE BORD FLOTTE (8 feuilles) + ETAT SUIVI DES SINISTRES"
                        : e.type === "sinistres"
                        ? "ETAT SUIVI DES SINISTRES — feuille DONNEES"
                        : "TABLEAU DE BORD FLOTTE — 8 feuilles (DATA, CHAUFFEURS, DEVIS, CHECK LISTS, ENTRETIENS×2, PANNES, PNEUMATIQUES)"
                  },
                ].map(row => (
                  <div key={row.label} className="flex gap-4">
                    <span className="text-xs text-gray-400 w-36 shrink-0 pt-0.5">{row.label}</span>
                    <span className="text-xs text-gray-800 font-medium leading-relaxed">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                <button
                  onClick={() => setDetailEntry(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium transition"
                >
                  Fermer
                </button>
                <button
                  onClick={() => handleRedownload(e)}
                  disabled={isRedl}
                  className="flex items-center gap-2 px-5 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRedl
                    ? <><Loader2 size={15} className="animate-spin" /> Génération…</>
                    : <><RefreshCw size={15} /> Re-télécharger</>
                  }
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </AppLayout>
  );
}
