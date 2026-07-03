import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  X,
  Menu,
  Users,
  LogOut,
  User,
  Wrench,
  Database,
  Navigation,
  FileText,
  ClipboardCheck,
  AlertTriangle,
  CircleDot,
  UploadCloud,
  Upload,
  Download,
  ShieldAlert,
  ChevronRight,
  Car,
  Palette,
  Fuel,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

type NavGroup = {
  group: string;
  icon: React.ReactNode;
  children: NavItem[];
};

type NavEntry = NavItem | NavGroup;

const isGroup = (e: NavEntry): e is NavGroup => "group" in e;

const navEntries: NavEntry[] = [
  { label: "Tableau de bord", path: "/dashboard",     icon: <LayoutDashboard size={20} /> },
  {
    group: "Import / Export",
    icon: <UploadCloud size={20} />,
    children: [
      { label: "Import en masse", path: "/import-global", icon: <Upload size={16} /> },
      { label: "Export en masse", path: "/export-global", icon: <Download size={16} /> },
    ],
  },
  {
    group: "Flotte & Véhicules",
    icon: <Car size={20} />,
    children: [
      { label: "Données flottes",  path: "/data-flottes",    icon: <Database size={16} /> },
      { label: "Carburant",        path: "/carburant",        icon: <Fuel size={16} /> },
      { label: "Chauffeurs Pôles", path: "/chauffeurs-poles", icon: <Navigation size={16} /> },
      { label: "Check-lists VL",   path: "/checklists-vl",   icon: <ClipboardCheck size={16} /> },
      { label: "Pneumatiques",     path: "/pneumatiques",    icon: <CircleDot size={16} /> },
    ],
  },
  {
    group: "Gestion Entretiens",
    icon: <Wrench size={20} />,
    children: [
      { label: "Entretiens",    path: "/entretiens",     icon: <Wrench size={16} /> },
      { label: "Entretien BIS", path: "/entretiens-bis", icon: <Wrench size={16} /> },
    ],
  },
  {
    group: "Gestion des suivis",
    icon: <FileText size={20} />,
    children: [
      { label: "Suivi des devis",  path: "/suivi-devis",     icon: <FileText size={16} /> },
      { label: "Suivi des Pannes", path: "/suivi-pannes",    icon: <AlertTriangle size={16} /> },
      { label: "Récap des Pannes", path: "/recap-pannes",   icon: <AlertTriangle size={16} /> },
      { label: "Suivi sinistres",  path: "/suivi-sinistres", icon: <ShieldAlert size={16} /> },
    ],
  },
];

const adminNavItem: NavItem = { label: "Comptes utilisateurs", path: "/users", icon: <Users size={20} /> };

function NavLink({ item, onClose }: { item: NavItem; onClose?: () => void }) {
  const location = useLocation();
  const isActive = location.pathname === item.path;
  return (
    <Link
      to={item.path}
      onClick={onClose}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-150 ${
        isActive
          ? "bg-camublue-900 text-white shadow-sm"
          : "text-gray-700 hover:bg-camublue-900/10 hover:text-camublue-900"
      }`}
    >
      <span className="shrink-0">{item.icon}</span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavGroupComp({ group, onClose }: { group: NavGroup; onClose?: () => void }) {
  const location = useLocation();
  const isChildActive = group.children.some(c => location.pathname === c.path);
  const [open, setOpen] = useState(isChildActive);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-150 ${
          isChildActive
            ? "bg-camublue-900/10 text-camublue-900"
            : "text-gray-700 hover:bg-camublue-900/10 hover:text-camublue-900"
        }`}
      >
        <span className="shrink-0">{group.icon}</span>
        <span className="flex-1 truncate text-left">{group.group}</span>
        <ChevronRight
          size={15}
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-camublue-900/20 pl-3">
          {group.children.map(child => (
            <NavLink key={child.path} item={child} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  );
}

const PRESET_COLORS = ["#003c71", "#0f766e", "#7c2d12", "#4c1d95", "#831843", "#14532d", "#1e293b"];

function ThemePicker() {
  const { color, setColor } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(color);

  useEffect(() => { if (open) setDraft(color); }, [open, color]);

  return (
    <div className="px-4 py-3 border-t border-gray-100">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-gray-700 hover:bg-camublue-900/10 hover:text-camublue-900 transition-all text-sm"
      >
        <Palette size={18} className="shrink-0" />
        <span className="flex-1 truncate text-left">Couleur de l'interface</span>
        <span
          className="w-4 h-4 rounded-full border border-gray-200 shrink-0"
          style={{ backgroundColor: color }}
        />
      </button>

      {open && (
        <div className="mt-2 px-2 py-3 bg-camugray-100 rounded-lg space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setDraft(c)}
                className={`w-7 h-7 rounded-full border-2 transition ${draft === c ? "border-camublue-900 scale-110" : "border-white"}`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
            <input
              type="color"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="w-7 h-7 rounded-full border-2 border-white cursor-pointer p-0 overflow-hidden"
              title="Couleur personnalisée"
            />
          </div>
          <button
            onClick={() => { setColor(draft); setOpen(false); }}
            className="w-full bg-camublue-900 hover:bg-camublue-900/90 text-white rounded-lg py-2 text-xs font-semibold transition"
          >
            Valider
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileOpen,      setMobileOpen]      = useState(false);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const entries: NavEntry[] = user?.role === "ADMIN" ? [...navEntries, adminNavItem] : navEntries;

  const SidebarFooter = () => (
    <div className="px-4 py-4 border-t border-gray-100">
      <button
        onClick={() => setShowLogoutModal(true)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-lg w-full text-left text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all text-sm font-medium"
      >
        <div className="w-7 h-7 rounded-full bg-camublue-900/10 flex items-center justify-center shrink-0">
          <User size={14} className="text-camublue-900" />
        </div>
        <span className="flex-1 truncate">{user?.full_name || user?.username}</span>
        <LogOut size={15} className="shrink-0 text-gray-400" />
      </button>
    </div>
  );

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <>
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {entries.map((entry, i) =>
          isGroup(entry)
            ? <NavGroupComp key={i} group={entry} onClose={onClose} />
            : <NavLink key={entry.path} item={entry} onClose={onClose} />
        )}
      </nav>
      <ThemePicker />
      <SidebarFooter />
    </>
  );

  return (
    <>
      {/* Burger mobile */}
      <button
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-white shadow-md border"
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={20} className="text-camublue-900" />
      </button>

      {/* Overlay mobile */}
      <div
        className={`fixed z-40 inset-0 bg-black/40 transition-opacity ${mobileOpen ? "block md:hidden" : "hidden"}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar Desktop */}
      <aside className="bg-white shadow-md w-72 h-screen sticky top-0 hidden md:flex md:flex-col border-r overflow-y-auto">
        <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-center shrink-0">
          <span className="text-2xl font-extrabold text-camublue-900 tracking-tight">P.A.R.C-CAM</span>
        </div>
        <SidebarContent />
      </aside>

      {/* Sidebar Mobile */}
      <aside
        className={`fixed z-50 top-0 left-0 h-full w-72 bg-white shadow-md border-r transition-transform duration-300 flex flex-col ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:hidden`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
          <span className="text-xl font-extrabold text-camublue-900 tracking-tight">P.A.R.C-CAM</span>
          <button onClick={() => setMobileOpen(false)}>
            <X size={24} className="text-camublue-900" />
          </button>
        </div>
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* ── Modal déconnexion ─────────────────────────────────────────── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
            <h3 className="text-lg font-bold text-camublue-900 mb-2">Déconnexion</h3>
            <p className="mb-6 text-sm text-gray-600">Voulez-vous vraiment vous déconnecter ?</p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition text-sm font-medium"
                onClick={() => setShowLogoutModal(false)}
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-camublue-900 text-white hover:bg-camublue-900/90 transition text-sm font-semibold"
                onClick={logout}
              >
                Déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
