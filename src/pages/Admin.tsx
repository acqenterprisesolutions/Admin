import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, Plus, Eye, Trash2, Copy, Check, RefreshCw,
  FileText, Clock, TrendingUp, AlertCircle, X, Shuffle, Loader2,
  Sun, Moon, Mail, Building2, User, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo.png";

// ─── Config ──────────────────────────────────────────────────────────────────
type AdminUser = { name: string; token: string; role: "master" | "user" };

function getAdminUsers(): AdminUser[] {
  try {
    const raw = import.meta.env.VITE_ADMIN_USERS;
    if (!raw) return [];
    return JSON.parse(raw) as AdminUser[];
  } catch {
    return [];
  }
}

const ADMIN_USERS = getAdminUsers();
const AUTH_KEY = "acq_admin_auth";

// ─── Types ───────────────────────────────────────────────────────────────────
type Status = "pending" | "approved" | "revision_requested" | "expired";
type StatusFilter = "all" | Status;

interface Proposal {
  id: string;
  access_code: string;
  client_name: string;
  html_content: string;
  status: Status;
  views_count: number;
  inserted_at: string;
  expires_at: string;
  created_by: string;
  client_email: string | null;
  client_company: string | null;
  client_owner: string | null;
  client_website: string | null;
}

type NewProposalForm = {
  client_name: string;
  access_code: string;
  html_content: string;
  expires_days: number;
  client_email: string;
  client_company: string;
  client_owner: string;
  client_website: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  pending:            { label: "Pendente",   color: "#f59e0b", bg: "rgba(245,158,11,0.15)"  },
  approved:           { label: "Aprovado ✓", color: "#00FF9D", bg: "rgba(0,255,157,0.15)"   },
  revision_requested: { label: "Revisão 🔄", color: "#818cf8", bg: "rgba(129,140,248,0.15)" },
  expired:            { label: "Expirado",   color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
};

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all",                label: "Todas"     },
  { key: "pending",            label: "Pendentes" },
  { key: "approved",           label: "Aprovadas" },
  { key: "revision_requested", label: "Revisão"   },
  { key: "expired",            label: "Expiradas" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "ACQ";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function getDaysLeft(iso: string): { text: string; urgent: boolean } {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return { text: "Expirado", urgent: false };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return {
    text: days > 0 ? `${days}d ${hours}h` : `${hours}h restantes`,
    urgent: days < 2,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Admin() {
  // Auth
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);

  // Data
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");

  // Theme
  const [darkMode, setDarkMode] = useState(true);

  // Create Modal
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState<NewProposalForm>({
    client_name: "",
    access_code: generateCode(),
    html_content: "",
    expires_days: 8,
    client_email: "",
    client_company: "",
    client_owner: "",
    client_website: "",
  });

  // Row actions
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ── Theme ────────────────────────────────────────────────────────────────
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

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem(AUTH_KEY);
    if (savedToken) {
      const user = ADMIN_USERS.find(u => u.token === savedToken);
      if (user) {
        setAuthenticated(true);
        setCurrentUser(user);
      } else {
        // Token revogado — limpar
        localStorage.removeItem(AUTH_KEY);
      }
    }
    setAuthReady(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = ADMIN_USERS.find(u => u.token === password);
    if (user) {
      localStorage.setItem(AUTH_KEY, user.token);
      setAuthenticated(true);
      setCurrentUser(user);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setAuthenticated(false);
    setCurrentUser(null);
  };

  // ── Data ─────────────────────────────────────────────────────────────────
  const fetchProposals = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);

    let query = supabase
      .from("proposals")
      .select("*")
      .order("inserted_at", { ascending: false });

    // Users only see their own proposals
    if (currentUser.role === "user") {
      query = query.eq("created_by", currentUser.name);
    }

    const { data } = await query;
    if (data) setProposals(data as Proposal[]);
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    if (authenticated && currentUser) fetchProposals();
  }, [authenticated, currentUser, fetchProposals]);

  // ── Create ───────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setCreating(true);
    setCreateError(null);

    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + form.expires_days);

    const { error } = await supabase.from("proposals").insert({
      client_name:    form.client_name,
      access_code:    form.access_code.toUpperCase(),
      html_content:   form.html_content,
      expires_at:     expires_at.toISOString(),
      created_by:     currentUser.name,
      client_email:   form.client_email || null,
      client_company: form.client_company || null,
      client_owner:   form.client_owner || null,
      client_website: form.client_website || null,
    });

    if (error) {
      if (error.code === "23505") {
        setCreateError("Código já está em uso. Gere um novo.");
      } else {
        setCreateError(error.message);
      }
      setCreating(false);
      return;
    }

    setShowModal(false);
    setForm({
      client_name: "", access_code: generateCode(), html_content: "", expires_days: 8,
      client_email: "", client_company: "", client_owner: "", client_website: "",
    });
    fetchProposals();
    setCreating(false);
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handlePreview = (p: Proposal) => {
    window.open(`/proposta?code=${p.access_code}`, "_blank");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta proposta permanentemente?")) return;
    setDeletingId(id);
    await supabase.from("proposals").delete().eq("id", id);
    fetchProposals();
    setDeletingId(null);
  };

  const handleStatusUpdate = async (id: string, status: Status) => {
    setUpdatingId(id);
    await supabase.from("proposals").update({ status }).eq("id", id);
    fetchProposals();
    setUpdatingId(null);
  };

  // ── Computed ─────────────────────────────────────────────────────────────
  const filtered = proposals.filter(p => filter === "all" || p.status === filter);
  const isMaster = currentUser?.role === "master";
  const stats = {
    total:    proposals.length,
    approved: proposals.filter(p => p.status === "approved").length,
    pending:  proposals.filter(p => p.status === "pending").length,
    revision: proposals.filter(p => p.status === "revision_requested").length,
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
      </div>
    );
  }

  // ── Auth Gate ─────────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 rounded-2xl border border-primary/20 pointer-events-none" />

            <div className="flex justify-center mb-6">
              <img src={logo} alt="ACQ" className="h-10 w-auto" />
            </div>

            <div className="text-center mb-8">
              <p className="text-xs tracking-[4px] text-muted-foreground uppercase mb-2">Admin Panel</p>
              <h1 className="font-heading text-2xl font-bold text-foreground">Área Restrita</h1>
              <p className="text-sm text-muted-foreground mt-2">Insira sua senha pessoal para acessar o painel.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setAuthError(false); }}
                className={`h-12 bg-secondary/50 text-center text-lg tracking-widest ${authError ? "border-destructive" : "border-border"}`}
                autoFocus
              />
              {authError && (
                <p className="text-destructive text-sm text-center flex items-center justify-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Senha incorreta. Tente novamente.
                </p>
              )}
              <Button type="submit" className="w-full h-12 bg-[#00FF9D] text-black font-bold hover:bg-[#00E58C] shadow-[0_0_20px_rgba(0,255,157,0.3)]">
                Entrar no Admin
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Admin Dashboard ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-4">
            <img src={logo} alt="ACQ" className="h-8 w-auto" />
            <div className="h-6 w-px bg-border hidden sm:block" />
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <p className="text-sm font-heading font-bold text-foreground">Proposals Admin</p>
                {currentUser && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isMaster
                      ? "bg-[#00FF9D]/15 text-[#00FF9D]"
                      : "bg-indigo-500/15 text-indigo-400"
                  }`}>
                    {isMaster ? "Master" : "User"}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Logado como <span className="text-foreground font-medium">{currentUser?.name}</span>
                {" · "}
                {proposals.length} proposta{proposals.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-primary"
              title={darkMode ? "Modo claro" : "Modo escuro"}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={darkMode ? "moon" : "sun"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </motion.div>
              </AnimatePresence>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchProposals}
              className="text-muted-foreground hover:text-primary"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-border hidden sm:flex"
              onClick={() => window.open("/portal", "_blank")}
            >
              Ver Portal ↗
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="text-xs"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total",      value: stats.total,    color: "text-foreground", icon: FileText },
            { label: "Aprovadas",  value: stats.approved, color: "text-[#00FF9D]",  icon: Check },
            { label: "Pendentes",  value: stats.pending,  color: "text-yellow-400", icon: Clock },
            { label: "Em Revisão", value: stats.revision, color: "text-indigo-400", icon: TrendingUp },
          ].map(s => (
            <div key={s.label} className="bg-card/40 backdrop-blur-sm border border-border rounded-xl p-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-heading font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_TABS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  filter === f.key
                    ? "bg-primary text-black border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {f.label}
                {f.key !== "all" && (
                  <span className="ml-1.5 opacity-60">
                    {proposals.filter(p => p.status === f.key).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <Button
            onClick={() => { setShowModal(true); setCreateError(null); }}
            className="bg-[#00FF9D] text-black font-bold hover:bg-[#00E58C] shadow-[0_0_15px_rgba(0,255,157,0.3)] gap-2"
          >
            <Plus className="w-4 h-4" /> Nova Proposta
          </Button>
        </div>

        {/* Table */}
        <div className="bg-card/40 backdrop-blur-sm border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-primary w-8 h-8" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Nenhuma proposta encontrada.</p>
              <Button
                onClick={() => setShowModal(true)}
                className="bg-[#00FF9D] text-black font-bold hover:bg-[#00E58C] gap-2"
              >
                <Plus className="w-4 h-4" /> Criar Primeira Proposta
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-mail</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empresa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Views</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Criada</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Validade</th>
                    {isMaster && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Autor</th>}
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const { text: daysLeft, urgent } = getDaysLeft(p.expires_at);
                    const meta = STATUS_META[p.status];
                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-border/50 hover:bg-primary/5 transition-colors ${p.status === "expired" ? "opacity-50" : ""}`}
                      >
                        <td className="px-4 py-3 font-semibold text-foreground">{p.client_name}</td>
                        <td className="px-4 py-3">
                          {p.client_email ? (
                            <a
                              href={`mailto:${p.client_email}`}
                              className="text-primary hover:underline text-xs flex items-center gap-1"
                              title={p.client_email}
                            >
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate max-w-[140px]">{p.client_email}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {p.client_company || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="bg-secondary/60 text-primary px-2 py-1 rounded font-mono text-xs tracking-widest">
                              {p.access_code}
                            </code>
                            <button
                              onClick={() => handleCopyCode(p.access_code)}
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              {copiedCode === p.access_code ? <Check className="w-3.5 h-3.5 text-[#00FF9D]" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={p.status}
                            onChange={e => handleStatusUpdate(p.id, e.target.value as Status)}
                            disabled={updatingId === p.id}
                            className="text-xs font-semibold px-2 py-1 rounded-full border-0 outline-none cursor-pointer"
                            style={{ color: meta.color, background: meta.bg }}
                          >
                            {Object.entries(STATUS_META).map(([val, m]) => (
                              <option key={val} value={val} style={{ background: "#1a1a1a", color: m.color }}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-secondary/60 text-muted-foreground text-xs px-2 py-1 rounded-full">
                            {p.views_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(p.inserted_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs ${urgent ? "font-bold" : "font-normal"}`} style={{ color: urgent ? "#f59e0b" : undefined }}>
                            {daysLeft}
                          </span>
                        </td>
                        {isMaster && (
                          <td className="px-4 py-3">
                            <span className="text-xs bg-secondary/60 text-foreground px-2 py-1 rounded-full">
                              {p.created_by || "Admin"}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePreview(p)}
                              title="Visualizar proposta"
                              className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              disabled={deletingId === p.id}
                              title="Excluir proposta"
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              {deletingId === p.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Trash2 className="w-4 h-4" />
                              }
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="font-heading text-xl font-bold text-foreground">Nova Proposta</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg hover:bg-secondary/60 text-muted-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-5">
                {/* ── Section: Client Data ── */}
                <div className="space-y-4 pb-4 border-b border-border/50">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Dados do Cliente
                  </h3>

                  {/* Email — required */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" /> E-mail *
                    </label>
                    <Input
                      type="email"
                      placeholder="contato@empresa.com"
                      value={form.client_email}
                      onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))}
                      required
                      autoFocus
                      className="h-11 bg-secondary/50 border-border"
                    />
                  </div>

                  {/* Company — optional */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> Nome da empresa
                    </label>
                    <Input
                      type="text"
                      placeholder="Ex: Acme Ltda"
                      value={form.client_company}
                      onChange={e => setForm(f => ({ ...f, client_company: e.target.value }))}
                      className="h-11 bg-secondary/50 border-border"
                    />
                  </div>

                  {/* Owner — optional */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" /> Proprietário / Responsável
                    </label>
                    <Input
                      type="text"
                      placeholder="Ex: João Silva"
                      value={form.client_owner}
                      onChange={e => setForm(f => ({ ...f, client_owner: e.target.value }))}
                      className="h-11 bg-secondary/50 border-border"
                    />
                  </div>

                  {/* Website — optional */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground" /> Site
                    </label>
                    <Input
                      type="url"
                      placeholder="https://empresa.com"
                      value={form.client_website}
                      onChange={e => setForm(f => ({ ...f, client_website: e.target.value }))}
                      className="h-11 bg-secondary/50 border-border"
                    />
                  </div>
                </div>

                {/* ── Section: Proposal Details ── */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Detalhes da Proposta
                  </h3>

                  {/* Client Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Nome de exibição na proposta *</label>
                    <Input
                      type="text"
                      placeholder="Ex: João Silva — Acme Corp"
                      value={form.client_name}
                      onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                      required
                      className="h-11 bg-secondary/50 border-border"
                    />
                    <p className="text-xs text-muted-foreground">Este nome aparecerá na página da proposta vista pelo cliente.</p>
                  </div>

                  {/* Access Code */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Código de Acesso *</label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={form.access_code}
                        onChange={e => setForm(f => ({ ...f, access_code: e.target.value.toUpperCase() }))}
                        maxLength={10}
                        required
                        className="h-11 bg-secondary/50 border-border text-primary font-mono tracking-widest text-center text-lg flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setForm(f => ({ ...f, access_code: generateCode() }))}
                        className="h-11 gap-2 border-border"
                      >
                        <Shuffle className="w-4 h-4" /> Gerar
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Será enviado ao cliente para acessar a proposta.</p>
                  </div>

                  {/* Expiry */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Prazo de acesso *</label>
                    <div className="flex gap-2 flex-wrap">
                      {[3, 5, 8, 14, 30].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, expires_days: d }))}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                            form.expires_days === d
                              ? "bg-primary/20 border-primary text-primary"
                              : "bg-transparent border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Expira em {form.expires_days} dias a partir de agora.</p>
                  </div>

                  {/* HTML Content */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">HTML completo da proposta *</label>
                    <textarea
                      placeholder={"<!DOCTYPE html>\n<html>\n  <head>...</head>\n  <body>...</body>\n</html>"}
                      value={form.html_content}
                      onChange={e => setForm(f => ({ ...f, html_content: e.target.value }))}
                      required
                      rows={8}
                      className="w-full bg-secondary/50 border border-border rounded-lg p-3 text-sm text-foreground font-mono resize-y outline-none focus:border-primary/50 transition-colors"
                    />
                    <p className="text-xs text-muted-foreground">Cole o HTML completo da landing page. Será renderizado no iframe do cliente.</p>
                  </div>
                </div>

                {createError && (
                  <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {createError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-[#00FF9D] text-black font-bold hover:bg-[#00E58C]"
                  >
                    {creating ? <Loader2 className="animate-spin w-4 h-4" /> : "Criar Proposta"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
