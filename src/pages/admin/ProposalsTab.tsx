import { useState, useEffect, useCallback } from "react";
import {
  Plus, Eye, Trash2, Copy, Check, FileText, Clock, TrendingUp,
  AlertCircle, X, Shuffle, Loader2, Mail, Building2, User, Globe, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

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
  proposal_value: number | null;
  business_type: string | null;
  city: string | null;
  state: string | null;
  service_1: string | null;
  service_2: string | null;
  service_3: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  cta_action: string | null;
  reviews_summary: string | null;
  keywords: string | null;
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
  proposal_value: string;
  business_type: string;
  city: string;
  state: string;
  service_1: string;
  service_2: string;
  service_3: string;
  primary_color: string;
  secondary_color: string;
  cta_action: string;
  reviews_summary: string;
  keywords: string;
};

interface AdminUser {
  name: string;
  role: "master" | "user";
}

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
export default function ProposalsTab({ currentUser }: { currentUser: AdminUser }) {
  const isMaster = currentUser.role === "master";

  // Data
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");

  // Master filters
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [allUsers, setAllUsers] = useState<string[]>([]);

  // Create Modal
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
    client_name: "", access_code: generateCode(), html_content: "",
    expires_days: 8, client_email: "", client_company: "",
    client_owner: "", client_website: "", proposal_value: "",
    business_type: "", city: "", state: "",
    service_1: "", service_2: "", service_3: "",
    primary_color: "#00FF9D", secondary_color: "#050505",
    cta_action: "Solicitar Orçamento", reviews_summary: "",
    keywords: "",
  });

  // Row actions
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ── Data ─────────────────────────────────────────────────────────────────
  const fetchProposals = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("proposals")
      .select("*")
      .order("inserted_at", { ascending: false });

    if (!isMaster) {
      query = query.eq("created_by", currentUser.name);
    }

    const { data } = await query;
    if (data) {
      setProposals(data as Proposal[]);
      // Extract unique users for filter dropdown
      const users = [...new Set((data as Proposal[]).map(p => p.created_by).filter(Boolean))];
      setAllUsers(users);
    }
    setLoading(false);
  }, [currentUser, isMaster]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  // ── Create ───────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + form.expires_days);

    const val = parseFloat(form.proposal_value);

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
      proposal_value: isNaN(val) ? null : val,
      business_type:  form.business_type || null,
      city:           form.city || null,
      state:          form.state || null,
      service_1:      form.service_1 || null,
      service_2:      form.service_2 || null,
      service_3:      form.service_3 || null,
      primary_color:  form.primary_color || null,
      secondary_color: form.secondary_color || null,
      cta_action:     form.cta_action || null,
      reviews_summary: form.reviews_summary || null,
      keywords:       form.keywords || null,
    });

    if (error) {
      setCreateError(error.code === "23505" ? "Código já está em uso. Gere um novo." : error.message);
      setCreating(false);
      return;
    }

    setShowModal(false);
    setForm({
      client_name: "", access_code: generateCode(), html_content: "", expires_days: 8,
      client_email: "", client_company: "", client_owner: "", client_website: "", proposal_value: "",
      business_type: "", city: "", state: "",
      service_1: "", service_2: "", service_3: "",
      primary_color: "#00FF9D", secondary_color: "#050505",
      cta_action: "Solicitar Orçamento", reviews_summary: "",
      keywords: "",
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

  const handlePreview = (p: Proposal) => window.open(`/proposta?code=${p.access_code}`, "_blank");

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
  let filtered = proposals.filter(p => filter === "all" || p.status === filter);

  // Master advanced filters
  if (isMaster && userFilter !== "all") {
    filtered = filtered.filter(p => p.created_by === userFilter);
  }
  if (dateFrom) {
    filtered = filtered.filter(p => p.inserted_at >= dateFrom);
  }
  if (dateTo) {
    const end = dateTo + "T23:59:59";
    filtered = filtered.filter(p => p.inserted_at <= end);
  }

  const negotiating = proposals.filter(p => p.status === "pending" || p.status === "revision_requested").length;
  const completed = proposals.filter(p => p.status === "approved").length;

  return (
    <div className="space-y-6">
      {/* Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: isMaster ? "Total de propostas" : "Minhas propostas", value: proposals.length, color: "text-foreground", icon: FileText },
          { label: "Em negociação",  value: negotiating, color: "text-yellow-400", icon: Clock },
          { label: "Concluídas",     value: completed,   color: "text-[#00FF9D]",  icon: TrendingUp },
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
      <div className="flex flex-col gap-4">
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

        {/* Master Advanced Filters */}
        {isMaster && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-card/30 border border-border/50 rounded-xl">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              className="bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none"
            >
              <option value="all">Todos os usuários</option>
              {allUsers.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">De:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-secondary/50 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Até:</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="bg-secondary/50 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none"
              />
            </div>
            {(userFilter !== "all" || dateFrom || dateTo) && (
              <button
                onClick={() => { setUserFilter("all"); setDateFrom(""); setDateTo(""); }}
                className="text-xs text-destructive hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
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
            <Button onClick={() => setShowModal(true)} className="bg-[#00FF9D] text-black font-bold hover:bg-[#00E58C] gap-2">
              <Plus className="w-4 h-4" /> Criar Primeira Proposta
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Cliente", "E-mail", "Empresa", "Código", "Status", "Views", "Valor", "Criada", "Validade",
                    ...(isMaster ? ["Autor"] : []), "Ações"
                  ].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const { text: daysLeft, urgent } = getDaysLeft(p.expires_at);
                  const meta = STATUS_META[p.status];
                  return (
                    <tr key={p.id} className={`border-b border-border/50 hover:bg-primary/5 transition-colors ${p.status === "expired" ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 font-semibold text-foreground">{p.client_name}</td>
                      <td className="px-4 py-3">
                        {p.client_email ? (
                          <a href={`mailto:${p.client_email}`} className="text-primary hover:underline text-xs flex items-center gap-1" title={p.client_email}>
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate max-w-[120px]">{p.client_email}</span>
                          </a>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.client_company || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="bg-secondary/60 text-primary px-2 py-1 rounded font-mono text-xs tracking-widest">{p.access_code}</code>
                          <button onClick={() => handleCopyCode(p.access_code)} className="text-muted-foreground hover:text-primary transition-colors">
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
                            <option key={val} value={val} style={{ background: "#1a1a1a", color: m.color }}>{m.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-secondary/60 text-muted-foreground text-xs px-2 py-1 rounded-full">{p.views_count}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground">
                        {p.proposal_value ? `R$ ${p.proposal_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(p.inserted_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${urgent ? "font-bold" : "font-normal"}`} style={{ color: urgent ? "#f59e0b" : undefined }}>{daysLeft}</span>
                      </td>
                      {isMaster && (
                        <td className="px-4 py-3">
                          <span className="text-xs bg-secondary/60 text-foreground px-2 py-1 rounded-full">{p.created_by || "Admin"}</span>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handlePreview(p)} title="Visualizar" className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} title="Excluir" className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            {deletingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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

      {/* ── Create Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-heading text-xl font-bold text-foreground">Nova Proposta</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-secondary/60 text-muted-foreground transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-8">
              {/* Client Data */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 mb-4">
                  <User className="w-4 h-4" /> 1. Dados do Cliente
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">E-mail *</label>
                    <Input type="email" placeholder="contato@empresa.com" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} required className="h-10 bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Nome da empresa</label>
                    <Input type="text" placeholder="Ex: Acme Ltda" value={form.client_company} onChange={e => {
                      const val = e.target.value;
                      setForm(f => ({ 
                        ...f, 
                        client_company: val,
                        client_name: f.client_name === "" ? val : f.client_name 
                      }));
                    }} className="h-10 bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Responsável</label>
                    <Input type="text" placeholder="Ex: João Silva" value={form.client_owner} onChange={e => setForm(f => ({ ...f, client_owner: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Site</label>
                    <Input type="text" placeholder="https://..." value={form.client_website} onChange={e => setForm(f => ({ ...f, client_website: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Cidade</label>
                    <Input type="text" placeholder="Ex: Goiânia" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Estado (UF)</label>
                    <Input type="text" placeholder="Ex: GO" maxLength={2} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} className="h-10 bg-secondary/30 border-border" />
                  </div>
                </div>
              </div>

              {/* Design & Concept */}
              <div className="space-y-4 pt-4 border-t border-border/30">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Palette className="w-4 h-4" /> 2. Briefing de Design
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Ramo de Atividade (TIPO)</label>
                    <Input type="text" placeholder="Ex: Clínica Odontológica, Escritório de Advocacia" value={form.business_type} onChange={e => setForm(f => ({ ...f, business_type: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                      Cor Primária <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: form.primary_color }} />
                    </label>
                    <Input type="text" placeholder="#00FF9D" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="h-10 bg-secondary/30 border-border font-mono" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                      Cor Secundária <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: form.secondary_color }} />
                    </label>
                    <Input type="text" placeholder="#050505" value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} className="h-10 bg-secondary/30 border-border font-mono" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Chamada Sugerida (CTA)</label>
                    <Input type="text" placeholder="Ex: Agendar Consulta, Solicitar Orçamento" value={form.cta_action} onChange={e => setForm(f => ({ ...f, cta_action: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Principais Serviços (Separados por vírgula)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="Serviço 1" value={form.service_1} onChange={e => setForm(f => ({ ...f, service_1: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                      <Input placeholder="Serviço 2" value={form.service_2} onChange={e => setForm(f => ({ ...f, service_2: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                      <Input placeholder="Serviço 3" value={form.service_3} onChange={e => setForm(f => ({ ...f, service_3: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Resumo de Reviews (Social Proof)</label>
                    <textarea 
                      placeholder="Ex: 5 estrelas no Google, mais de 200 clientes satisfeitos..." 
                      value={form.reviews_summary} onChange={e => setForm(f => ({ ...f, reviews_summary: e.target.value }))}
                      className="w-full bg-secondary/30 border border-border rounded-lg p-3 text-sm text-foreground outline-none focus:border-primary/50 transition-colors h-20 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Proposal & Technical */}
              <div className="space-y-4 pt-4 border-t border-border/30">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4" /> 3. Detalhes Técnicos & Valor
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Nome de exibição na proposta *</label>
                    <Input type="text" placeholder="Ex: João Silva — Acme Corp" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} required className="h-10 bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Código de Acesso *</label>
                    <div className="flex gap-2">
                      <Input type="text" value={form.access_code} onChange={e => setForm(f => ({ ...f, access_code: e.target.value.toUpperCase() }))} maxLength={10} required className="h-10 bg-secondary/30 border-border text-primary font-mono tracking-widest text-center" />
                      <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, access_code: generateCode() }))} className="h-10 border-border"><Shuffle className="w-3 h-3" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Valor do contrato (R$)</label>
                    <Input type="number" step="0.01" min="0" placeholder="5000.00" value={form.proposal_value} onChange={e => setForm(f => ({ ...f, proposal_value: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Palavras-chave (SEO)</label>
                    <Input type="text" placeholder="Ex: dentista em goiânia, implante dentario" value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Prazo de acesso</label>
                    <div className="flex gap-2 flex-wrap">
                      {[3, 5, 8, 14, 30].map(d => (
                        <button key={d} type="button" onClick={() => setForm(f => ({ ...f, expires_days: d }))}
                          className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold border transition-all ${form.expires_days === d ? "bg-primary text-black border-primary" : "bg-transparent border-border text-muted-foreground hover:border-primary/50"}`}
                        >{d}d</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">HTML completo da proposta *</label>
                    <textarea
                      placeholder={"<!DOCTYPE html>\n<html>..."}
                      value={form.html_content} onChange={e => setForm(f => ({ ...f, html_content: e.target.value }))}
                      required rows={6} className="w-full bg-secondary/30 border border-border rounded-lg p-3 text-xs text-foreground font-mono resize-y outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
              </div>

              {createError && (
                <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{createError}
                </div>
              )}

              <div className="flex gap-3 pt-6 sticky bottom-0 bg-card py-4 border-t border-border/50">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1 h-12">Cancelar</Button>
                <Button type="submit" disabled={creating} className="flex-1 h-12 bg-[#00FF9D] text-black font-bold hover:bg-[#00E58C] shadow-lg shadow-[#00FF9D]/20 transition-all active:scale-95">
                  {creating ? <Loader2 className="animate-spin w-4 h-4" /> : "Finalizar & Gerar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
