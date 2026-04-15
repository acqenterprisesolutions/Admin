import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, AlertCircle, Loader2, Sun, Moon, 
  FileText, Users, DollarSign, Sparkles, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo.png";

// Tabs
import ProposalsTab from "./admin/ProposalsTab";
import UsersTab from "./admin/UsersTab";
import BillingTab from "./admin/BillingTab";
import ScriptsTab from "./admin/ScriptsTab";

// ─── Config ──────────────────────────────────────────────────────────────────
type AdminUser = { 
  id?: string;
  name: string; 
  token: string; 
  role: "master" | "user";
  is_active?: boolean;
};

const AUTH_KEY = "acq_admin_auth";

// ─── Component ───────────────────────────────────────────────────────────────
export default function Admin() {
  // Auth
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<"proposals" | "billing" | "users" | "scripts">("proposals");

  // Theme
  const [darkMode, setDarkMode] = useState(true);

  // ── Theme Initialization ──────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("acq_admin_theme");
    const isDark = saved ? saved === "dark" : true;
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("acq_admin_theme", next ? "dark" : "light");
  };

  // ── Auth Logic ────────────────────────────────────────────────────────────
  const validateUser = async (token: string): Promise<AdminUser | null> => {
    try {
      // 1. Check Database First
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("token", token)
        .eq("is_active", true)
        .single();

      if (data && !error) return data as AdminUser;

      // 2. Fallback to Env Vars (JSON)
      const rawEnv = import.meta.env.VITE_ADMIN_USERS;
      if (rawEnv) {
        const envUsers = JSON.parse(rawEnv) as AdminUser[];
        const match = envUsers.find(u => u.token === token);
        if (match) return match;
      }
    } catch (err) {
      console.error("Auth validation error:", err);
    }
    return null;
  };

  useEffect(() => {
    const checkSavedSession = async () => {
      const savedToken = localStorage.getItem(AUTH_KEY);
      if (savedToken) {
        const user = await validateUser(savedToken);
        if (user) {
          setAuthenticated(true);
          setCurrentUser(user);
        } else {
          localStorage.removeItem(AUTH_KEY);
        }
      }
      setAuthReady(true);
    };
    checkSavedSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setAuthError(false);

    const user = await validateUser(password);
    if (user) {
      localStorage.setItem(AUTH_KEY, user.token);
      setAuthenticated(true);
      setCurrentUser(user);
    } else {
      setAuthError(true);
    }
    setLoggingIn(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setAuthenticated(false);
    setCurrentUser(null);
  };

  // ── Loading State ────────────────────────────────────────────────────────
  if (!authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
      </div>
    );
  }

  // ── Login Screen ─────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl">
            <div className="flex justify-center mb-6">
              <img src={logo} alt="ACQ" className="h-10 w-auto" />
            </div>

            <div className="text-center mb-8">
              <p className="text-xs tracking-[4px] text-muted-foreground uppercase mb-2">Admin Panel</p>
              <h1 className="font-heading text-2xl font-bold text-foreground">Acesso Restrito</h1>
              <p className="text-sm text-muted-foreground mt-2">Identifique-se com sua senha do sistema.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setAuthError(false); }}
                className={`h-12 bg-secondary/50 text-center text-lg tracking-widest ${authError ? "border-destructive animate-shake" : "border-border"}`}
                autoFocus
              />
              {authError && (
                <p className="text-destructive text-sm text-center flex items-center justify-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Senha inválida ou acesso bloqueado.
                </p>
              )}
              <Button 
                type="submit" 
                disabled={loggingIn}
                className="w-full h-12 bg-[#00FF9D] text-black font-bold hover:bg-[#00E58C] shadow-lg disabled:opacity-50"
              >
                {loggingIn ? <Loader2 className="animate-spin w-5 h-5" /> : "Acessar Painel"}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main Dashboard ───────────────────────────────────────────────────────
  const isMaster = currentUser?.role === "master";

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <img src={logo} alt="ACQ" className="h-8 w-auto cursor-pointer" onClick={() => setActiveTab("proposals")} />
            <div className="h-6 w-px bg-border hidden sm:block" />
            <div className="hidden lg:block text-xs">
              <p className="font-bold text-foreground">{currentUser?.name}</p>
              <p className="text-muted-foreground uppercase tracking-tighter">{currentUser?.role}</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-secondary/30 p-1 rounded-xl border border-border/50">
            <TabButton 
              active={activeTab === "proposals"} 
              onClick={() => setActiveTab("proposals")} 
              icon={<FileText className="w-4 h-4" />}
              label="Propostas" 
            />
            {isMaster && (
              <>
                <TabButton 
                  active={activeTab === "billing"} 
                  onClick={() => setActiveTab("billing")} 
                  icon={<DollarSign className="w-4 h-4" />}
                  label="Faturamento" 
                />
                <TabButton 
                  active={activeTab === "users"} 
                  onClick={() => setActiveTab("users")} 
                  icon={<Users className="w-4 h-4" />}
                  label="Usuários" 
                />
              </>
            )}
            <TabButton 
              active={activeTab === "scripts"} 
              onClick={() => setActiveTab("scripts")} 
              icon={<Sparkles className="w-4 h-4" />}
              label="Scripts" 
            />
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-primary transition-all rounded-full w-9 h-9 p-0"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex border-border h-9"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4 sm:mr-2" />
              <span className="hidden lg:inline">Recarregar</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              className="h-9 font-bold"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-border bg-card/80 flex items-center justify-around p-2">
            <TabButton 
              active={activeTab === "proposals"} 
              onClick={() => setActiveTab("proposals")} 
              icon={<FileText className="w-4 h-4" />}
              compact
            />
            {isMaster && (
              <>
                <TabButton 
                  active={activeTab === "billing"} 
                  onClick={() => setActiveTab("billing")} 
                  icon={<DollarSign className="w-4 h-4" />}
                  compact
                />
                <TabButton 
                  active={activeTab === "users"} 
                  onClick={() => setActiveTab("users")} 
                  icon={<Users className="w-4 h-4" />}
                  compact
                />
              </>
            )}
            <TabButton 
              active={activeTab === "scripts"} 
              onClick={() => setActiveTab("scripts")} 
              icon={<Sparkles className="w-4 h-4" />}
              compact
            />
        </div>
      </header>

      <main className="container py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "proposals" && <ProposalsTab currentUser={currentUser!} />}
          {activeTab === "billing" && isMaster && <BillingTab />}
          {activeTab === "users" && isMaster && <UsersTab />}
          {activeTab === "scripts" && <ScriptsTab currentUser={currentUser!} />}
        </motion.div>
      </main>
    </div>
  );
}

function TabButton({ 
  active, 
  onClick, 
  icon, 
  label, 
  compact 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label?: string;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
        active 
          ? "bg-primary text-primary-foreground shadow-lg scale-105" 
          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
      }`}
    >
      {icon}
      {!compact && label && <span>{label}</span>}
    </button>
  );
}
