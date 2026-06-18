import { useState } from "react";
import {
  Download, Loader2, CheckCircle2, X, History, Search, Trash2,
  DollarSign, Navigation, FileText, ClipboardCheck, Wrench,
  AlertOctagon, CircleDot, ShieldAlert, Calendar, Package, FileSpreadsheet,
  FolderArchive,
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

/* ─── Types ──────────────────────────────────────────────────────── */
interface ExportHistoryEntry {
  id: string; date: string; annee?: number; mois?: number;
  filename: string; totalRows: number;
}
interface PeriodFilter { annee?: number; mois?: number; }

/* ─── Helpers cellules ───────────────────────────────────────────── */
const H = (value: string) => ({
  value, type: String,
  backgroundColor: "#1E3A5F", color: "#FFFFFF",
  fontWeight: "bold" as const, align: "center" as const,
});
const D = (value: any) => ({
  value: value == null ? "" : String(value),
  type: String, color: "#000000", backgroundColor: "#FFFFFF",
});
const colW = (rows: any[][], colIdx: number, header: string) =>
  Math.min(Math.max(header.length + 4, ...rows.map(r => String(r[colIdx] ?? "").length + 2)), 45);

/* ─── Constantes période ─────────────────────────────────────────── */
const MOIS_LABELS = ["","Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

/* ─── LocalStorage ───────────────────────────────────────────────── */
const HISTORY_KEY = "eflotte_export_history_v2";
const loadHistory = (): ExportHistoryEntry[] => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); } catch { return []; }
};
const saveHistory = (h: ExportHistoryEntry[]) =>
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 50)));

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/* ═══════════════ Générateurs de feuilles Excel ══════════════════ */

function buildDataFlottes(rows: any[]) {
  const COLS = [
    "TYPE DE LOCATION","Fournisseur","Type Vehicule","Plaque d'immatriculation","Mois","Type_Cout","Valeur"
  ];
  const header = COLS.map(H);
  const data = rows.map(r => [
    D(r.type_location), D(r.fournisseur), D(r.type_vehicule), D(r.plaque_immatriculation),
    D(r.mois), D(r.type_cout), D(r.valeur),
  ]);
  const columns = COLS.map((h, i) => ({ width: colW(data.map(r => r.map((c: any) => c.value)), i, h) }));
  return { data: [header, ...data], columns, sheet: "DATA_FLOTTES" };
}

function buildChauffeurPoles(rows: any[]) {
  const COLS = ["DATE","IMMA","CHAUFFEUR","DEMANDEUR","TELEPHONE","PROJET","DESTINATION","DATE DEPART","DATE RETOUR","COMMENTAIRES"];
  const header = COLS.map(H);
  const data = rows.map(r => [
    D(r.date?.slice(0,10)), D(r.immatriculation), D(r.chauffeur), D(r.demandeur),
    D(r.telephone), D(r.projet), D(r.destination),
    D(r.date_depart?.slice(0,10)), D(r.date_retour?.slice(0,10)), D(r.commentaires),
  ]);
  const columns = COLS.map((h, i) => ({ width: colW(data.map(r => r.map((c: any) => c.value)), i, h) }));
  return { data: [header, ...data], columns, sheet: "CHAUFFEUR POLES" };
}

function buildCheckListsVL(rows: any[]) {
  // Collect all semaine keys sorted numerically
  const semaineKeys = new Set<string>();
  rows.forEach(r => r.semaines && Object.keys(r.semaines).forEach((k: string) => semaineKeys.add(k)));
  const semaines = Array.from(semaineKeys).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ""));
    const nb = parseInt(b.replace(/\D/g, ""));
    return na - nb;
  });

  const fixedCols = ["Brand","Model","Reg. №","Label","Car Group"];
  const COLS = [...fixedCols, ...semaines];
  const header = COLS.map(H);
  const data = rows.map(r => {
    const fixed = [D(r.brand), D(r.model), D(r.plaque_immatriculation), D(r.label), D(r.car_group)];
    const sems = semaines.map(s => D(r.semaines?.[s] ?? ""));
    return [...fixed, ...sems];
  });
  const columns = COLS.map((h, i) => ({ width: colW(data.map(r => r.map((c: any) => c.value)), i, h) }));
  return { data: [header, ...data], columns, sheet: "SUIVI DES CHECK LISTS VL" };
}

function buildEntretiens(rows: any[]) {
  // Collect all palier keys sorted numerically
  const palierKeys = new Set<string>();
  rows.forEach(r => r.paliers && Object.keys(r.paliers).forEach((k: string) => palierKeys.add(k)));
  const paliers = Array.from(palierKeys).sort((a, b) => parseInt(a) - parseInt(b));

  const fixedCols = ["TYPE DE LOCATION","Fournisseur","Type Vehicule","Matricule","NOM"];
  const COLS = [...fixedCols, ...paliers, "REST"];
  const header = COLS.map(H);
  const data = rows.map(r => {
    const fixed = [
      D(r.type_location), D(r.fournisseur), D(r.type_vehicule),
      D(r.plaque_immatriculation), D(r.nom_chauffeur),
    ];
    const pals = paliers.map(p => D(r.paliers?.[p] ?? ""));
    return [...fixed, ...pals, D(r.reste)];
  });
  const columns = COLS.map((h, i) => ({ width: colW(data.map(r => r.map((c: any) => c.value)), i, h) }));
  return { data: [header, ...data], columns, sheet: "ENTRTIENS" };
}

function buildEntretienBis(rows: any[]) {
  const palierKeys = new Set<string>();
  rows.forEach(r => r.paliers && Object.keys(r.paliers).forEach((k: string) => palierKeys.add(k)));
  const paliers = Array.from(palierKeys).sort((a, b) => parseInt(a) - parseInt(b));

  const fixedCols = ["RT","STATUT","MODEL","Matricule","KMS DE DEPART","NOTES"];
  const COLS = [...fixedCols, ...paliers, "REST"];
  const header = COLS.map(H);
  const data = rows.map(r => {
    const fixed = [
      D(r.rt), D(r.statut), D(r.modele),
      D(r.plaque_immatriculation), D(r.kms_depart), D(r.notes),
    ];
    const pals = paliers.map(p => D(r.paliers?.[p] ?? ""));
    return [...fixed, ...pals, D(r.reste)];
  });
  const columns = COLS.map((h, i) => ({ width: colW(data.map(r => r.map((c: any) => c.value)), i, h) }));
  return { data: [header, ...data], columns, sheet: "ENTRETIEN BIS" };
}

function buildSuiviPannes(rows: any[]) {
  const COLS = [
    "DATE","IMMA","NOM","GARAGE",
    "Nature de non disponibilité","Date d'indisponibilité","PROJET",
    "Date de fin de réparation","Site","Commentaire","Immobilisations (jrs)"
  ];
  const header = COLS.map(H);
  const data = rows.map(r => [
    D(r.date?.slice(0,10)), D(r.immatriculation), D(r.nom), D(r.garage),
    D(r.nature_panne), D(r.date_indisponibilite?.slice(0,10)), D(r.projet),
    D(r.date_fin_reparation?.slice(0,10)), D(r.site), D(r.commentaire),
    D(r.immobilisation_jrs),
  ]);
  const columns = COLS.map((h, i) => ({ width: colW(data.map(r => r.map((c: any) => c.value)), i, h) }));
  return { data: [header, ...data], columns, sheet: "SUIVI DES PANNE" };
}

function buildPneumatiques(rows: any[]) {
  const COLS = [
    "IMMA","CHAUFF","Kilometrage","N PNEUS","REF","ETAT","SNC","DATE PREV","COMMENTAIRE"
  ];
  const header = COLS.map(H);
  const data = rows.map(r => [
    D(r.immatriculation), D(r.chauffeur), D(r.kilometrage), D(r.nb_pneus),
    D(r.ref_pneu), D(r.etat), D(r.snc), D(r.date_prevue?.slice(0,10)), D(r.commentaire),
  ]);
  const columns = COLS.map((h, i) => ({ width: colW(data.map(r => r.map((c: any) => c.value)), i, h) }));
  return { data: [header, ...data], columns, sheet: "PNEUMATIQUE" };
}

function buildSuiviDevis(rows: any[]) {
  const COLS = [
    "N° Devis","Description","Matricule","Sous-traitant","Valeur devis","Montant","Code SNC","PO émis","Date"
  ];
  const header = COLS.map(H);
  const data = rows.map(r => [
    D(r.numero_devis), D(r.descriptions), D(r.matricule), D(r.sous_traitant),
    D(r.valeur_devis), D(r.montant), D(r.code_snc), D(r.po_emis),
    D(r.date?.slice(0,10)),
  ]);
  const columns = COLS.map((h, i) => ({ width: colW(data.map(r => r.map((c: any) => c.value)), i, h) }));
  return { data: [header, ...data], columns, sheet: "SUIVI DES DEVIS" };
}

function buildSinistres(rows: any[]) {
  const COLS = [
    "N°","DATE DE DECLARATION","CATEGORIE","BRANCHE","MATRICULE","PROPRIETE",
    "SNC","PROJET","CIRCONSTANCES DU SINISTRE","DOCUMENTATION","TRAITER",
    "STATUT DU SINISTRE","POSITION VEHICULE","LIEU IMMOBILISATION","OBSERVATIONS"
  ];
  const header = COLS.map(H);
  const data = rows.map((r, idx) => [
    D(`N°${idx + 1}`),
    D(r.date_declaration?.slice(0,10) ?? r.date_sinistre?.slice(0,10)),
    D(""), // CATEGORIE — not in DB
    D("AUTO"),
    D(r.matricule),
    D(r.type_location),
    D(r.snc),
    D(r.projet),
    D(r.circonstances),
    D(r.documentation ? "1" : ""),
    D(r.traiter ? "1" : ""),
    D(r.statut),
    D(r.position_vehicule),
    D(r.lieu_immobilisation),
    D(r.observations),
  ]);
  const columns = COLS.map((h, i) => ({ width: colW(data.map(r => r.map((c: any) => c.value)), i, h) }));
  return { data: [header, ...data], columns, sheet: "DONNEES" };
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function ExportPage() {
  const [period, setPeriod]           = useState<PeriodFilter>({});
  const [exporting, setExporting]     = useState(false);
  const [progress, setProgress]       = useState("");
  const [exportHistory, setExportHistory] = useState<ExportHistoryEntry[]>(loadHistory);
  const [historySearch, setHistorySearch] = useState("");

  /* ── Export principal ── */
  const handleExport = async () => {
    setExporting(true);
    let totalRows = 0;
    try {
      const p = period;

      // ── Fichier 1 : TABLEAU DE BORD FLOTTE ──────────────────────
      setProgress("Chargement : Données flottes…");
      const couts = (await coutService.getAll({ annee: p.annee, mois: p.mois, page_size: 9999 })).items;
      totalRows += couts.length;

      setProgress("Chargement : Chauffeurs Pôles…");
      const missions = (await missionChauffeurService.getAll({ annee: p.annee as any, mois: p.mois as any, page_size: 9999 })).items;
      totalRows += missions.length;

      setProgress("Chargement : Check-lists VL…");
      const checklists = (await checklistVLService.getAll({ annee: p.annee as any, page_size: 9999 })).items;
      totalRows += checklists.length;

      setProgress("Chargement : Entretiens…");
      const entretiens = await entretienService.getAll();
      totalRows += entretiens.length;

      setProgress("Chargement : Entretien BIS…");
      const entretiensBis = await entretienBisService.getAll();
      totalRows += entretiensBis.length;

      setProgress("Chargement : Suivi des pannes…");
      const pannes = (await suiviPanneService.getAll({ annee: p.annee as any, mois: p.mois as any, page_size: 9999 })).items;
      totalRows += pannes.length;

      setProgress("Chargement : Pneumatiques…");
      const pneumatiques = (await pneumatiqueService.getAll({ page_size: 9999 })).items;
      totalRows += pneumatiques.length;

      setProgress("Chargement : Suivi des devis…");
      const devis = (await suiviDevisService.getAll({ annee: p.annee as any, mois: p.mois as any, page_size: 9999 })).items;
      totalRows += devis.length;

      // ── Fichier 2 : SINISTRES ────────────────────────────────────
      setProgress("Chargement : Suivi sinistres…");
      const sinistres = (await suiSinistreService.getAll({ annee: p.annee as any, mois: p.mois as any, page_size: 9999 } as any)).items;
      totalRows += sinistres.length;

      // ── Génération Excel ─────────────────────────────────────────
      setProgress("Génération du fichier Tableau de bord…");
      const file1Sheets = [
        buildDataFlottes(couts),
        buildChauffeurPoles(missions),
        buildSuiviDevis(devis),
        buildCheckListsVL(checklists),
        buildEntretiens(entretiens),
        buildEntretienBis(entretiensBis),
        buildSuiviPannes(pannes),
        buildPneumatiques(pneumatiques),
      ];
      const blob1 = await (writeXlsxFile as any)(file1Sheets);

      setProgress("Génération du fichier Sinistres…");
      const file2Sheets = [buildSinistres(sinistres)];
      const blob2 = await (writeXlsxFile as any)(file2Sheets);

      // ── Création du ZIP ──────────────────────────────────────────
      setProgress("Création du dossier ZIP…");
      const periodLabel = p.annee
        ? `_${p.annee}${p.mois ? "_M" + String(p.mois).padStart(2, "0") : ""}`
        : "";
      const dateStr = new Date().toISOString().slice(0, 10);
      const folderName = `Export_eFlotte${periodLabel}_${dateStr}`;

      const zip = new JSZip();
      const folder = zip.folder(folderName)!;
      folder.file(`TABLEAU DE BORD FLOTTE ANNEE ${p.annee ?? CURRENT_YEAR}.xlsx`, blob1);
      folder.file(`ETAT SUIVI DES SINISTRES ${p.annee ?? CURRENT_YEAR}.xlsx`, blob2);

      const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });

      // ── Téléchargement ───────────────────────────────────────────
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      // ── Historique ───────────────────────────────────────────────
      const entry: ExportHistoryEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        annee: p.annee,
        mois: p.mois,
        filename: `${folderName}.zip`,
        totalRows,
      };
      const newHistory = [entry, ...exportHistory];
      setExportHistory(newHistory);
      saveHistory(newHistory);

      toast.success(`Export terminé — ${totalRows.toLocaleString("fr-FR")} lignes dans 2 fichiers`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Erreur lors de l'export");
    } finally {
      setExporting(false);
      setProgress("");
    }
  };

  const filteredHistory = exportHistory.filter(e =>
    !historySearch.trim() ||
    e.filename.toLowerCase().includes(historySearch.toLowerCase()) ||
    (e.annee && String(e.annee).includes(historySearch))
  );

  const clearHistory = () => {
    if (!confirm("Effacer tout l'historique des exports ?")) return;
    setExportHistory([]); saveHistory([]);
  };

  /* ═══════════════════════════ RENDER ══════════════════════════════ */
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-camublue-900">Export en masse</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Génère un dossier ZIP contenant 2 fichiers Excel au format exact du tableau de bord
          </p>
        </div>

        {/* Aperçu des 2 fichiers générés */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white border-2 border-camublue-900/20 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <FileSpreadsheet size={18} className="text-emerald-700" />
              </div>
              <p className="font-bold text-gray-800 text-sm">Tableau de bord Flotte</p>
            </div>
            <ul className="space-y-1 text-xs text-gray-500">
              {["DATA_FLOTTES","CHAUFFEUR POLES","SUIVI DES DEVIS","SUIVI DES CHECK LISTS VL","ENTRTIENS","ENTRETIEN BIS","SUIVI DES PANNE","PNEUMATIQUE"].map(s => (
                <li key={s} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-camublue-900/30 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border-2 border-rose-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <ShieldAlert size={18} className="text-rose-600" />
              </div>
              <p className="font-bold text-gray-800 text-sm">Etat Suivi des Sinistres</p>
            </div>
            <ul className="space-y-1 text-xs text-gray-500">
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-rose-300 shrink-0" />
                DONNEES
              </li>
            </ul>
          </div>
        </div>

        {/* Filtre par période */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={17} className="text-camublue-900" />
            <h2 className="text-sm font-bold text-camublue-900">Période</h2>
            <span className="text-xs text-gray-400 ml-1">— optionnel, laissez vide pour tout exporter</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Année</label>
              <select
                value={period.annee ?? ""}
                onChange={e => setPeriod(p => ({
                  annee: e.target.value ? Number(e.target.value) : undefined,
                  mois: e.target.value ? p.mois : undefined,
                }))}
                className="input-base w-36"
              >
                <option value="">Toutes</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Mois</label>
              <select
                value={period.mois ?? ""}
                onChange={e => setPeriod(p => ({ ...p, mois: e.target.value ? Number(e.target.value) : undefined }))}
                className="input-base w-36"
                disabled={!period.annee}
              >
                <option value="">Tous</option>
                {MOIS_LABELS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            {(period.annee || period.mois) && (
              <>
                <div className="mt-5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-camublue-900 bg-camublue-900/10 px-3 py-1.5 rounded-lg">
                    <Calendar size={12} />
                    {period.mois ? `${MOIS_LABELS[period.mois]} ${period.annee}` : `Année ${period.annee}`}
                  </span>
                </div>
                <button onClick={() => setPeriod({})} className="mt-5 text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition">
                  <X size={13} /> Réinitialiser
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bouton export */}
        <div className="flex items-center gap-4 mb-10 flex-wrap">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-8 py-3 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <FolderArchive size={16} />}
            {exporting ? "Export en cours…" : "Exporter (ZIP avec 2 fichiers)"}
          </button>
          {exporting && progress && (
            <p className="text-sm text-gray-400 animate-pulse">{progress}</p>
          )}
        </div>

        {/* Historique */}
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <History size={18} className="text-camublue-900" />
              <h2 className="text-base font-bold text-camublue-900">Historique des exports</h2>
              {exportHistory.length > 0 && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{exportHistory.length}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {exportHistory.length > 0 && (
                <button onClick={clearHistory} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition">
                  <Trash2 size={13} /> Effacer
                </button>
              )}
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="input-base pl-8 text-sm w-52"
                />
              </div>
            </div>
          </div>

          {exportHistory.length === 0 ? (
            <div className="text-center py-14 bg-gray-50 rounded-2xl border border-gray-100">
              <FolderArchive size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Aucun export enregistré pour le moment</p>
              <p className="text-xs text-gray-300 mt-1">L'historique est conservé dans votre navigateur</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <p className="text-center py-10 text-sm text-gray-400">Aucun résultat pour « {historySearch} »</p>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-camublue-900 text-white text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Fichier ZIP</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Période</th>
                    <th className="text-center px-4 py-2.5 font-semibold">Total lignes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredHistory.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(entry.date)}</td>
                      <td className="px-4 py-3 max-w-[240px]">
                        <div className="flex items-center gap-1.5">
                          <FolderArchive size={13} className="text-amber-500 shrink-0" />
                          <span className="text-xs text-gray-700 font-medium truncate" title={entry.filename}>{entry.filename}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {entry.annee
                          ? entry.mois ? `${MOIS_LABELS[entry.mois]} ${entry.annee}` : `Année ${entry.annee}`
                          : "Toutes périodes"
                        }
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-semibold text-gray-600">
                        {entry.totalRows.toLocaleString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
