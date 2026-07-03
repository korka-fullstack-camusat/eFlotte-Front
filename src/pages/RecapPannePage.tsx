import { useEffect, useState, useMemo, useRef } from "react";
import { Search, CheckCircle, Wrench, Ban, Car, X, Save } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/charts";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

/* ── Constantes ───────────────────────────────────────────────────── */
const MOIS_COURTS = [
  "janv", "févr", "mars", "avr", "mai", "juin",
  "juil", "août", "sept", "oct", "nov", "déc",
];
const STATUT_OPTIONS = ["En service", "En maintenance", "Immobilisé", ""];

function moisLabel(iso: string) {
  const [y, m] = iso.split("-");
  return `${MOIS_COURTS[Number(m) - 1]}-${y.slice(2)}`;
}

/* ── Types ────────────────────────────────────────────────────────── */
interface VehiculeRecap {
  id: number | null;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  chauffeur: string | null;
  type_carburant: string | null;
  car_group: string | null;
  statut_actuel: string | null;
  statuts: Record<string, string | null>;
}

interface RecapData {
  annee: number;
  mois: string[];
  vehicules: VehiculeRecap[];
  source: "import" | "computed";
  stats: { en_service: number; en_maintenance: number; immobilises: number; total: number };
}

/* ── Cellule statut ───────────────────────────────────────────────── */
function StatutBadge({ val }: { val: string | null | undefined }) {
  if (!val) return <span className="text-gray-300 text-xs">—</span>;
  if (val === "En maintenance")
    return <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 whitespace-nowrap">Maint.</span>;
  if (val === "Immobilisé" || val.toLowerCase().startsWith("immobilis"))
    return <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700 whitespace-nowrap">Immob.</span>;
  return <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 whitespace-nowrap">En service</span>;
}

/* ── Modal d'édition ──────────────────────────────────────────────── */
type EditTarget = {
  recapId: number;
  rowIdx: number;
  field: string;         // "brand"|"model"|"label"|"fuel_type"|"car_group"|"YYYY-MM"
  label: string;
  currentValue: string;
  isMois: boolean;
};

function EditModal({
  target,
  onClose,
  onSave,
}: {
  target: EditTarget;
  onClose: () => void;
  onSave: (field: string, value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(target.currentValue ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  async function handleSave() {
    setSaving(true);
    await onSave(target.field, value);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-camublue-900">Modifier — {target.label}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {target.isMois ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-camublue-900/20"
          >
            {STATUT_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt || "(vide)"}</option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-camublue-900/20"
            placeholder={`Nouvelle valeur pour ${target.label}`}
          />
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Annuler</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-camublue-900 text-white rounded-lg hover:bg-camublue-900/90 disabled:opacity-50"
          >
            <Save size={14} /> {saving ? "Sauvegarde…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Page principale ──────────────────────────────────────────────── */
export default function RecapPannePage() {
  const { isViewer } = useAuth();
  const currentYear = new Date().getFullYear();
  const [annee, setAnnee] = useState(currentYear);
  const [data, setData] = useState<RecapData | null>(null);
  const [rows, setRows] = useState<VehiculeRecap[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterFuel, setFilterFuel] = useState("");
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  useEffect(() => {
    setLoading(true);
    axios.get("/api/suivi-pannes/recap", { params: { annee } })
      .then(r => {
        setData(r.data);
        setRows(r.data.vehicules ?? []);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [annee]);

  const carGroups = useMemo(() =>
    [...new Set(rows.map(v => v.car_group).filter(Boolean))].sort() as string[],
    [rows]
  );
  const fuelTypes = useMemo(() =>
    [...new Set(rows.map(v => v.type_carburant).filter(Boolean))].sort() as string[],
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(v => {
      if (filterGroup && v.car_group !== filterGroup) return false;
      if (filterFuel && v.type_carburant !== filterFuel) return false;
      if (q && ![v.immatriculation, v.marque, v.modele, v.chauffeur, v.car_group]
        .some(f => (f ?? "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, search, filterGroup, filterFuel]);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const mois = data?.mois ?? [];

  /* ── Ouvrir l'éditeur ────────────────────────────────────────────── */
  function openEdit(rowIdx: number, field: string, label: string, currentValue: string | null, isMois: boolean) {
    if (isViewer) {
      toast.error("Accès en lecture seule");
      return;
    }
    const row = filtered[rowIdx];
    setEditTarget({ recapId: row.id ?? -1, rowIdx, field, label, currentValue: currentValue ?? "", isMois });
  }

  /* ── Sauvegarder ─────────────────────────────────────────────────── */
  async function handleSave(field: string, value: string) {
    if (!editTarget) return;
    const row = filtered[editTarget.rowIdx];
    try {
      const url = editTarget.recapId === -1
        ? `/api/suivi-pannes/recap/by-plaque/${encodeURIComponent(row.immatriculation)}`
        : `/api/suivi-pannes/recap/${editTarget.recapId}`;
      const resp = await axios.patch(url, { [field]: value });
      // Si la ligne vient d'être créée, mettre à jour l'ID en local
      if (editTarget.recapId === -1 && resp.data?.id) {
        setRows(prev => prev.map(r =>
          r.immatriculation === row.immatriculation ? { ...r, id: resp.data.id } : r
        ));
      }
      // Mise à jour locale
      setRows(prev => prev.map(r => {
        if (r.id !== editTarget.recapId) return r;
        if (editTarget.isMois) {
          return { ...r, statuts: { ...r.statuts, [field]: value || null } };
        }
        const fieldMap: Record<string, keyof VehiculeRecap> = {
          brand: "marque", model: "modele", label: "chauffeur",
          fuel_type: "type_carburant", car_group: "car_group",
        };
        const key = fieldMap[field];
        return key ? { ...r, [key]: value || null } : r;
      }));
      toast.success("Modifié avec succès");
      setEditTarget(null);
    } catch {
      toast.error("Erreur lors de la modification");
    }
  }

  /* ── Rendu ───────────────────────────────────────────────────────── */
  const canEdit = !isViewer;

  const cellClass = (editable: boolean) =>
    `px-2 py-1.5 whitespace-nowrap text-xs ${editable ? "cursor-pointer hover:bg-camublue-900/5 group" : ""}`;

  return (
    <AppLayout>
      {/* Header */}
      <div className="bg-camugray-100 -mx-4 px-4 md:-mx-8 md:px-8 pt-1 pb-3 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-camublue-900">Récap des Pannes</h1>
            <p className="text-xs text-gray-400">
              Statut mensuel par véhicule
              {data?.source === "computed" && " · calculé depuis les pannes (importez RECAP DES PANNES pour la source officielle)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Année :</label>
            <select
              value={annee}
              onChange={e => setAnnee(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-camublue-900/20"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Total véhicules"  value={data?.stats.total ?? 0}          icon={<Car size={20}/>}           bg="bg-camublue-900/10" text="text-camublue-900" />
        <KpiCard label="En service"       value={data?.stats.en_service ?? 0}      icon={<CheckCircle size={20}/>}   bg="bg-emerald-100"     text="text-emerald-600" />
        <KpiCard label="En maintenance"   value={data?.stats.en_maintenance ?? 0}  icon={<Wrench size={20}/>}        bg="bg-amber-100"       text="text-amber-600" />
        <KpiCard label="Immobilisés"      value={data?.stats.immobilises ?? 0}     icon={<Ban size={20}/>}           bg="bg-rose-100"        text="text-rose-600" />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher immatriculation, marque, label…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-camublue-900/20"
          />
        </div>
        <select
          value={filterGroup}
          onChange={e => setFilterGroup(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-camublue-900/20"
        >
          <option value="">Tous les Car Groups</option>
          {carGroups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select
          value={filterFuel}
          onChange={e => setFilterFuel(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-camublue-900/20"
        >
          <option value="">Tous les carburants</option>
          {fuelTypes.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} véhicule(s)</span>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 mb-3 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-300 inline-block" />En service</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-300 inline-block" />En maintenance</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-300 inline-block" />Immobilisé</span>
        {canEdit && <span className="ml-auto text-gray-300 italic">Cliquez sur une cellule pour la modifier</span>}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">Aucun véhicule trouvé</div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-camublue-900 text-white sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap w-8 sticky left-0 bg-camublue-900 z-20">N°</th>
                  <th className="text-left px-2 py-2.5 font-semibold whitespace-nowrap sticky left-8 bg-camublue-900 z-20">Brand</th>
                  <th className="text-left px-2 py-2.5 font-semibold whitespace-nowrap">Model</th>
                  <th className="text-left px-2 py-2.5 font-semibold whitespace-nowrap">Reg. N°</th>
                  <th className="text-left px-2 py-2.5 font-semibold whitespace-nowrap">Label</th>
                  <th className="text-left px-2 py-2.5 font-semibold whitespace-nowrap">Fuel type</th>
                  <th className="text-left px-2 py-2.5 font-semibold whitespace-nowrap max-w-[160px]">Car Group</th>
                  {mois.map(m => (
                    <th key={m} className="text-center px-2 py-2.5 font-semibold whitespace-nowrap min-w-[72px]">
                      {moisLabel(m)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((v, i) => (
                  <tr key={v.immatriculation} className="hover:bg-gray-50/50">
                    <td className="px-3 py-1.5 text-gray-400 sticky left-0 bg-white">{i + 1}</td>

                    {/* Brand */}
                    <td
                      className={`${cellClass(canEdit && !!v.id)} font-semibold text-camublue-900 sticky left-8 bg-white`}
                      onClick={() => openEdit(i, "brand", "Brand", v.marque, false)}
                    >
                      <span className="group-hover:underline">{v.marque || "—"}</span>
                    </td>

                    {/* Model */}
                    <td className={cellClass(canEdit && !!v.id)} onClick={() => openEdit(i, "model", "Model", v.modele, false)}>
                      <span className="group-hover:underline">{v.modele || "—"}</span>
                    </td>

                    {/* Reg. N° — non éditable */}
                    <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium text-camublue-900">{v.immatriculation}</td>

                    {/* Label */}
                    <td className={cellClass(canEdit && !!v.id)} onClick={() => openEdit(i, "label", "Label", v.chauffeur, false)}>
                      {v.chauffeur || "—"}
                    </td>

                    {/* Fuel type */}
                    <td className={cellClass(canEdit && !!v.id)} onClick={() => openEdit(i, "fuel_type", "Fuel type", v.type_carburant, false)}>
                      {v.type_carburant || "—"}
                    </td>

                    {/* Car Group */}
                    <td
                      className={`${cellClass(canEdit && !!v.id)} max-w-[160px] truncate`}
                      title={v.car_group ?? ""}
                      onClick={() => openEdit(i, "car_group", "Car Group", v.car_group, false)}
                    >
                      {v.car_group || "—"}
                    </td>

                    {/* Mois */}
                    {mois.map(m => (
                      <td
                        key={m}
                        className={`${cellClass(canEdit && !!v.id)} text-center`}
                        onClick={() => openEdit(i, m, moisLabel(m), v.statuts[m] ?? null, true)}
                      >
                        <StatutBadge val={v.statuts[m]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal édition */}
      {editTarget && (
        <EditModal
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSave}
        />
      )}
    </AppLayout>
  );
}
