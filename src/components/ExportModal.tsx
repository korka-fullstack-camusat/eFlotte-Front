import { useState } from "react";
import { X, Download, FileSpreadsheet } from "lucide-react";
import { exportToExcel, ExportCol } from "@/utils/exportExcel";

export interface ExportColDef<T> extends ExportCol<T> {
  key: string;
}

interface Props<T> {
  title: string;
  cols: ExportColDef<T>[];
  filename: string;
  onClose: () => void;
  fetchAll: () => Promise<T[]>;
}

export default function ExportModal<T>({ title, cols, filename, onClose, fetchAll }: Props<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set(cols.map(c => c.key)));
  const [loading, setLoading] = useState(false);

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === cols.length) setSelected(new Set());
    else setSelected(new Set(cols.map(c => c.key)));
  };

  const handleExport = async () => {
    const activeCols = cols.filter(c => selected.has(c.key));
    if (activeCols.length === 0) return;
    setLoading(true);
    try {
      const data = await fetchAll();
      await exportToExcel(data, activeCols, filename);
      onClose();
    } catch {
      // toast error handled by caller
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-white" />
            </div>
            <p className="text-white font-bold text-sm">{title}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-500">Sélectionnez les colonnes à inclure dans l'export Excel.</p>

          {/* Select all */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Colonnes</span>
            <button
              onClick={toggleAll}
              className="text-xs text-camublue-900 font-semibold hover:underline"
            >
              {selected.size === cols.length ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {cols.map(col => (
              <label
                key={col.key}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition text-sm select-none ${
                  selected.has(col.key)
                    ? "border-camublue-900 bg-camublue-900/5 text-camublue-900 font-semibold"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(col.key)}
                  onChange={() => toggle(col.key)}
                  className="accent-camublue-900 w-3.5 h-3.5 shrink-0"
                />
                <span className="truncate">{col.header}</span>
              </label>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">
              Annuler
            </button>
            <button
              onClick={handleExport}
              disabled={selected.size === 0 || loading}
              className="flex-[2] flex items-center justify-center gap-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-50"
            >
              <Download size={14} />
              {loading ? "Export en cours…" : `Exporter (${selected.size} col.)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
