import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Plus, Pencil, Trash2, X, Users as UsersIcon, FileSpreadsheet, MessageSquare, Search, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/contexts/AuthContext";
import { userService, vehiculeService, chauffeurComptesService } from "@/services/api";
import ImportChauffeursModal from "@/components/users/ImportChauffeursModal";
import type { UserAccount, Vehicule } from "@/types";


const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  EDITOR: "Éditeur",
  HSE: "HSE",
  VIEWER: "Lecture seule",
  CHAUFFEUR: "Chauffeur (app mobile)",
};

const EMPTY = { username: "", password: "", full_name: "", email: "", role: "EDITOR", vehicule_plaque: "", filiale: "", telephone: "" };

export default function UsersPage() {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [importOuvert, setImportOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [filtreRole, setFiltreRole] = useState("");

  const load = () => {
    setLoading(true);
    userService.getAll().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { vehiculeService.getAll().then(setVehicules).catch(() => {}); }, []);

  const q = recherche.trim().toLowerCase();
  const filtres = users.filter(u =>
    (!filtreRole || u.role === filtreRole) &&
    (!q || [u.username, u.full_name, u.telephone, u.vehicule_plaque].some(v => v?.toLowerCase().includes(q))));
  const pageCount = Math.max(1, Math.ceil(filtres.length / pageSize));
  const pagedUsers = filtres.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [pageCount, page]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (u: UserAccount) => {
    setEditing(u);
    setForm({ username: u.username, password: "", full_name: u.full_name ?? "", email: u.email ?? "", role: u.role, vehicule_plaque: u.vehicule_plaque ?? "", filiale: u.filiale ?? "", telephone: u.telephone ?? "" });
    setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const payload: any = {
          full_name: form.full_name, email: form.email, role: form.role,
          vehicule_plaque: form.role === "CHAUFFEUR" ? form.vehicule_plaque : "",
          filiale: form.role === "CHAUFFEUR" ? form.filiale : "",
          telephone: form.telephone,
        };
        if (form.password) payload.password = form.password;
        await userService.update(editing.id, payload);
        toast.success("Utilisateur mis à jour");
      } else {
        await userService.create({ ...form, username: form.username.trim(), vehicule_plaque: form.role === "CHAUFFEUR" ? form.vehicule_plaque : "", filiale: form.role === "CHAUFFEUR" ? form.filiale : "" });
        toast.success("Utilisateur créé");
      }
      setModal(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erreur");
    }
  };

  const envoyerIdentifiants = async (u: UserAccount) => {
    if (!confirm(`Remettre le mot de passe initial de ${u.full_name || u.username} et lui envoyer ses identifiants par SMS${u.telephone ? ` (${u.telephone})` : ""} ?\n\nIl devra choisir un nouveau mot de passe à la connexion.`)) return;
    try {
      const r = await chauffeurComptesService.envoyerIdentifiants(u.id);
      if (r.sms === "ENVOYE") toast.success(`Identifiants envoyés par SMS à ${r.telephone}`);
      else toast(`Mot de passe remis à « ${r.mot_de_passe_initial} ». SMS non envoyé : ${r.message ?? r.sms}`, { icon: "⚠️", duration: 8000 });
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
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3 sticky top-0 z-20 bg-camugray-100 -mx-4 px-4 md:-mx-8 md:px-8 pt-1 pb-3">
        <div>
          <h1 className="text-2xl font-bold text-camublue-900">Comptes utilisateurs</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestion des accès à la plateforme</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setImportOuvert(true)}
            className="flex items-center gap-2 px-4 py-2 border border-camublue-900 text-camublue-900 hover:bg-camublue-900/5 rounded-xl text-sm font-semibold transition">
            <FileSpreadsheet size={15} /><span>Importer des chauffeurs</span>
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-xl text-sm font-semibold transition shadow-sm">
            <Plus size={15} /><span>Ajouter un utilisateur</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input type="search" value={recherche} onChange={e => { setRecherche(e.target.value); setPage(1); }}
            placeholder="Nom, identifiant, téléphone ou plaque…" aria-label="Rechercher un compte" className="input-base pl-9 w-full bg-white" />
        </div>
        <select value={filtreRole} onChange={e => { setFiltreRole(e.target.value); setPage(1); }} aria-label="Rôle" className="input-base w-auto bg-white">
          <option value="">Tous les rôles</option>
          {Object.entries(ROLE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <span className="text-xs text-gray-500">{filtres.length} compte{filtres.length > 1 ? "s" : ""}</span>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 p-6 text-center">Chargement…</p>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
            <table className="w-full text-sm">
              <thead className="bg-camublue-900 text-white text-xs uppercase sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Utilisateur</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Nom complet</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Téléphone / Email</th>
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
                    <td className="px-4 py-2.5 text-gray-600">
                      {u.telephone || (!u.email && "—")}
                      {u.email && <span className={u.telephone ? "block text-xs text-gray-400" : ""}>{u.email}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {ROLE_LABELS[u.role] ?? u.role}
                      {u.role === "CHAUFFEUR" && u.vehicule_plaque && <span className="block text-xs text-gray-400">{u.vehicule_plaque}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {u.is_active
                        ? <span className="inline-flex items-center text-emerald-600 font-semibold text-xs">Actif</span>
                        : <span className="inline-flex items-center text-red-600 font-semibold text-xs">Désactivé</span>}
                      {u.doit_changer_mdp && (
                        <span className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-amber-600" title="Doit choisir son mot de passe à la prochaine connexion">
                          <KeyRound size={11} /> 1re connexion
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {u.role === "CHAUFFEUR" && (
                          <button onClick={() => envoyerIdentifiants(u)} aria-label={`Envoyer les identifiants à ${u.username}`}
                            title="Remettre le mot de passe initial et envoyer les identifiants par SMS"
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-camublue-900 transition">
                            <MessageSquare size={14} />
                          </button>
                        )}
                        <button onClick={() => openEdit(u)} aria-label={`Modifier ${u.username}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-camublue-900 transition">
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
        <Pagination page={page} pageSize={pageSize} total={filtres.length} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} />
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
                  autoCapitalize="none" autoCorrect="off" spellCheck={false}
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
                <label htmlFor="user-tel" className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Téléphone {form.role === "CHAUFFEUR" && <span className="font-normal text-gray-400">(reçoit les identifiants par SMS)</span>}
                </label>
                <input id="user-tel" type="tel" value={form.telephone} placeholder="ex : 77 123 45 67"
                  onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rôle</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input-base">
                  <option value="ADMIN">Administrateur</option>
                  <option value="EDITOR">Éditeur</option>
                  <option value="HSE">HSE</option>
                  <option value="VIEWER">Lecture seule</option>
                  <option value="CHAUFFEUR">Chauffeur (app mobile)</option>
                </select>
                {form.role === "CHAUFFEUR" && (
                  <p className="mt-1 text-xs text-gray-500">Accès uniquement à l'application mobile de checklist véhicule.</p>
                )}
              </div>
              {form.role === "CHAUFFEUR" && (
                <div>
                  <label htmlFor="user-vehicule" className="block text-xs font-semibold text-gray-600 mb-1.5">Véhicule attribué</label>
                  <select id="user-vehicule" value={form.vehicule_plaque}
                    onChange={e => setForm(f => ({ ...f, vehicule_plaque: e.target.value }))} className="input-base">
                    <option value="">Aucun (le chauffeur choisira à chaque rapport)</option>
                    {form.vehicule_plaque && !vehicules.some(v => v.plaque_immatriculation === form.vehicule_plaque) && (
                      <option value={form.vehicule_plaque}>{form.vehicule_plaque}</option>
                    )}
                    {vehicules.map(v => (
                      <option key={v.id} value={v.plaque_immatriculation}>
                        {v.plaque_immatriculation}{v.marque || v.modele ? ` — ${[v.marque, v.modele].filter(Boolean).join(" ")}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {form.role === "CHAUFFEUR" && (
                <div>
                  <label htmlFor="user-filiale" className="block text-xs font-semibold text-gray-600 mb-1.5">Filiale *</label>
                  <input id="user-filiale" type="text" value={form.filiale} placeholder="ex : Camusat Sénégal" required
                    onChange={e => setForm(f => ({ ...f, filiale: e.target.value }))} className="input-base" />
                  <p className="mt-1 text-xs text-gray-500">
                    Véhicule et filiale sont repris dans chaque rapport : le chauffeur n'a pas à les saisir.
                  </p>
                </div>
              )}
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
      {importOuvert && <ImportChauffeursModal onClose={() => setImportOuvert(false)} onImporte={load} />}
    </AppLayout>
  );
}
