import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Plus, Pencil, Trash2, X, Users as UsersIcon } from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/api";
import type { UserAccount } from "@/types";

const PAGE_SIZE = 10;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  EDITOR: "Éditeur",
  VIEWER: "Lecture seule",
};

const EMPTY = { username: "", password: "", full_name: "", email: "", role: "EDITOR" };

export default function UsersPage() {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [page, setPage] = useState(1);

  const load = () => {
    setLoading(true);
    userService.getAll().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const pageCount = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const pagedUsers = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [pageCount, page]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (u: UserAccount) => {
    setEditing(u);
    setForm({ username: u.username, password: "", full_name: u.full_name ?? "", email: u.email ?? "", role: u.role });
    setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const payload: any = { full_name: form.full_name, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await userService.update(editing.id, payload);
        toast.success("Utilisateur mis à jour");
      } else {
        await userService.create(form);
        toast.success("Utilisateur créé");
      }
      setModal(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  const handleDelete = async (u: UserAccount) => {
    if (!confirm(`Supprimer l'utilisateur ${u.username} ?`)) return;
    try {
      await userService.remove(u.id);
      toast.success("Utilisateur supprimé");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-camublue-900">Comptes utilisateurs</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestion des accès à la plateforme</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm">
          <Plus size={15} /><span>Ajouter un utilisateur</span>
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 p-6 text-center">Chargement…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-camublue-900 text-white text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Utilisateur</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Nom complet</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Email</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Rôle</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Statut</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5"><UsersIcon size={13} className="text-gray-400" />{u.username}</div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{u.full_name || "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600">{u.email || "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600">{ROLE_LABELS[u.role] ?? u.role}</td>
                    <td className="px-4 py-2.5 text-center">
                      {u.is_active
                        ? <span className="inline-flex items-center text-emerald-600 font-semibold text-xs">Actif</span>
                        : <span className="inline-flex items-center text-red-600 font-semibold text-xs">Désactivé</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-camublue-900 transition">
                          <Pencil size={14} />
                        </button>
                        {u.username !== currentUser?.username && (
                          <button
                            onClick={() => handleDelete(u)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={users.length} onPageChange={setPage} />
      </div>

      {/* ══ Modal Ajout/Édition ════════════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-camublue-900 px-6 py-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><UsersIcon size={18} className="text-white" /></div>
                <p className="text-white font-bold text-sm">{editing ? "Modifier l'utilisateur" : "Ajouter un utilisateur"}</p>
              </div>
              <button onClick={() => setModal(false)} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><X size={14} className="text-white" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom d'utilisateur *</label>
                <input type="text" value={form.username} disabled={!!editing} required
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="input-base disabled:opacity-60" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom complet</label>
                <input type="text" value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                <input type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rôle</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input-base">
                  <option value="ADMIN">Administrateur</option>
                  <option value="EDITOR">Éditeur</option>
                  <option value="VIEWER">Lecture seule</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  {editing ? "Nouveau mot de passe (optionnel)" : "Mot de passe *"}
                </label>
                <input type="password" value={form.password} required={!editing}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input-base" />
              </div>

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                  Annuler
                </button>
                <button type="submit" className="flex-[2] bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl py-2.5 text-sm font-semibold transition">
                  {editing ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
