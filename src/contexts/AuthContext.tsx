import { createContext, useContext, useState, type ReactNode } from "react";
import axios from "axios";

interface AuthUser {
  username: string;
  full_name: string | null;
  role: string;
}

interface AuthContextType {
  user:     AuthUser | null;
  token:    string | null;
  login:    (username: string, password: string) => Promise<void>;
  logout:   () => void;
  loading:  boolean;
  isViewer: boolean;
  isAdmin:  boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "eflotte_token";
const USER_KEY  = "eflotte_user";

// Posé de façon synchrone (et non dans un useEffect) : les pages enfants
// lancent leurs requêtes dans leurs propres effets, qui s'exécutent AVANT
// ceux du provider — elles partaient sans jeton et recevaient des 401.
function setAuthHeader(token: string | null) {
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common["Authorization"];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [token,   setToken]   = useState<string | null>(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    setAuthHeader(saved);
    return saved;
  });
  const [loading, setLoading] = useState(false);


  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append("username", username);
      form.append("password", password);

      const { data } = await axios.post("/api/auth/login", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const authUser: AuthUser = { username: data.username, full_name: data.full_name, role: data.role ?? "EDITOR" };
      setAuthHeader(data.access_token);
      setToken(data.access_token);
      setUser(authUser);
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuthHeader(null);
  };

  const isViewer = user?.role === "VIEWER";
  const isAdmin  = user?.role === "ADMIN";

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, isViewer, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
