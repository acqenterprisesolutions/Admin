import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Plus, Trash2, Loader2, X, Users, Upload, Eye, ListFilter,
  FileSpreadsheet, ChevronRight, Circle, CheckCircle2, BarChart3,
  Tag, Search, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LeadList {
  id: string;
  title: string;
  category: string | null;
  created_by: string | null;
  created_at: string;
  total_leads: number;
}

interface Lead {
  id: string;
  list_id: string;
  business_name: string | null;
  phone: string | null;
  category: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  email: string | null;
  google_rating: number | null;
  review_count: number | null;
  potencial: "bom" | "medio" | "ruim" | null;
  proposal_id: string | null;
}

interface Assignment {
  id: string;
  list_id: string;
  user_id: string;
  admin_users?: { name: string };
}

interface DbUser {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
}

// ─── Column mapping from Excel headers ────────────────────────────────────────
const mapRowToLead = (row: Record<string, unknown>) => ({
  business_name: (row["Nome"] ?? row["Name"] ?? row["Business Name"] ?? "") as string,
  phone: (row["Número de celular"] ?? row["Phone"] ?? row["Telefone"] ?? "") as string,
  category: (row["Categoria"] ?? row["Category"] ?? "") as string,
  address: (row["Endereço"] ?? row["Address"] ?? "") as string,
  city: (row["Cidade"] ?? row["City"] ?? "") as string,
  state: (row["Estado"] ?? row["State"] ?? row["Localização"] ?? "") as string,
  website: (row["Site"] ?? row["Website"] ?? "") as string,
  email: (row["Identificação do email"] ?? row["Email"] ?? row["email"] ?? "") as string,
  google_rating: parseFloat(String(row["Avaliação"] ?? row["Rating"] ?? "0")) || null,
  review_count: parseInt(String(row["Contagem de revisões"] ?? row["Reviews"] ?? "0")) || null,
  latitude: parseFloat(String(row["latitude"] ?? row["Latitude"] ?? "0")) || null,
  longitude: parseFloat(String(row["longitude"] ?? row["Longitude"] ?? "0")) || null,
});

const PRESET_CATEGORIES = [
  { value: "healthcare", label: "Healthcare" },
  { value: "contractor", label: "Contractor & Home Services" },
  { value: "personal_care", label: "Personal Care" },
  { value: "professional", label: "Professional Services" },
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "other", label: "Other (Generic)" },
];

const potencialConfig = {
  bom:   { label: "Bom",   color: "bg-green-500/20 text-green-400 border-green-500/30" },
  medio: { label: "Médio", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  ruim:  { label: "Ruim",  color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function LeadsTab({ currentUserName }: { currentUserName: string }) {
  const [lists, setLists] = useState<LeadList[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("healthcare");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<Record<string, unknown>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Assign modal
  const [assigningList, setAssigningList] = useState<LeadList | null>(null);
  const [allUsers, setAllUsers] = useState<DbUser[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // View leads modal
  const [viewingList, setViewingList] = useState<LeadList | null>(null);
  const [viewLeads, setViewLeads] = useState<Lead[]>([]);
  const [viewSearch, setViewSearch] = useState("");
  const [viewFilter, setViewFilter] = useState<"all" | "sem_proposta" | "bom" | "medio" | "ruim">("all");
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Funnel stats per list
  const [funnelStats, setFunnelStats] = useState<Record<string, { proposals: number; approved: number }>>({});

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchLists = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("lead_lists").select("*").order("created_at", { ascending: false });
    if (data) {
      setLists(data as LeadList[]);
      // Fetch funnel stats for all lists
      const listIds = (data as LeadList[]).map(l => l.id);
      if (listIds.length > 0) {
        const { data: leadData } = await supabase
          .from("leads")
          .select("list_id, proposal_id, proposals(status)")
          .in("list_id", listIds)
          .not("proposal_id", "is", null);

        if (leadData) {
          const stats: Record<string, { proposals: number; approved: number }> = {};
          leadData.forEach((row: any) => {
            if (!stats[row.list_id]) stats[row.list_id] = { proposals: 0, approved: 0 };
            stats[row.list_id].proposals++;
            if (row.proposals?.status === "approved") stats[row.list_id].approved++;
          });
          setFunnelStats(stats);
        }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  // ── File parse ─────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
        setUploadPreview(rows.slice(0, 3));
      } catch {
        setUploadError("Não foi possível ler o arquivo. Verifique se é um .xlsx válido.");
      }
    };
    reader.readAsBinaryString(file);
  };

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle.trim()) {
      setUploadError("Informe o título e selecione o arquivo.");
      return;
    }
    setUploading(true);
    setUploadError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];

        // Insert list record
        const { data: listRow, error: listErr } = await supabase
          .from("lead_lists")
          .insert({ title: uploadTitle.trim(), category: uploadCategory, created_by: currentUserName, total_leads: rows.length })
          .select()
          .single();

        if (listErr || !listRow) throw new Error(listErr?.message ?? "Erro ao criar lista");

        // Bulk insert leads in chunks of 200
        const leads = rows.map(row => ({ ...mapRowToLead(row), list_id: listRow.id }));
        const CHUNK = 200;
        for (let i = 0; i < leads.length; i += CHUNK) {
          const { error: leadsErr } = await supabase.from("leads").insert(leads.slice(i, i + CHUNK));
          if (leadsErr) throw new Error(leadsErr.message);
        }

        setShowUpload(false);
        setUploadTitle("");
        setUploadFile(null);
        setUploadPreview([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchLists();
        setUploading(false);
      };
      reader.readAsBinaryString(uploadFile);
    } catch (err: any) {
      setUploadError(err.message);
      setUploading(false);
    }
  };

  // ── Assign ─────────────────────────────────────────────────────────────────
  const openAssign = async (list: LeadList) => {
    setAssigningList(list);
    const { data: users } = await supabase.from("admin_users").select("id,name,role,is_active").eq("is_active", true).eq("role", "user");
    const { data: existing } = await supabase.from("list_assignments").select("*,admin_users(name)").eq("list_id", list.id);
    setAllUsers((users ?? []) as DbUser[]);
    setAssignments((existing ?? []) as Assignment[]);
    const ids = new Set((existing ?? []).map((a: any) => a.user_id));
    setSelectedUserIds(ids as Set<string>);
  };

  const handleSaveAssignments = async () => {
    if (!assigningList) return;
    setSaving(true);

    const existing = new Set(assignments.map(a => a.user_id));
    const toAdd = [...selectedUserIds].filter(id => !existing.has(id));
    const toRemove = assignments.filter(a => !selectedUserIds.has(a.user_id)).map(a => a.id);

    if (toAdd.length > 0) {
      await supabase.from("list_assignments").insert(toAdd.map(uid => ({ list_id: assigningList.id, user_id: uid })));
    }
    if (toRemove.length > 0) {
      await supabase.from("list_assignments").delete().in("id", toRemove);
    }

    setAssigningList(null);
    setSaving(false);
  };

  // ── View Leads ─────────────────────────────────────────────────────────────
  const openViewLeads = async (list: LeadList) => {
    setViewingList(list);
    setLoadingLeads(true);
    setViewSearch("");
    setViewFilter("all");
    const { data } = await supabase.from("leads").select("*").eq("list_id", list.id).order("inserted_at");
    setViewLeads((data ?? []) as Lead[]);
    setLoadingLeads(false);
  };

  const filteredLeads = viewLeads.filter(l => {
    const matchSearch = !viewSearch || (l.business_name ?? "").toLowerCase().includes(viewSearch.toLowerCase())
      || (l.state ?? "").toLowerCase().includes(viewSearch.toLowerCase());
    const matchFilter =
      viewFilter === "all" ? true :
      viewFilter === "sem_proposta" ? !l.proposal_id :
      l.potencial === viewFilter;
    return matchSearch && matchFilter;
  });

  // ── Delete List ────────────────────────────────────────────────────────────
  const handleDeleteList = async (id: string) => {
    if (!confirm("Excluir esta lista e todos os seus leads?")) return;
    await supabase.from("lead_lists").delete().eq("id", id);
    fetchLists();
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" /> Listas de Leads
          </h2>
          <p className="text-sm text-muted-foreground">{lists.length} lista{lists.length !== 1 ? "s" : ""} cadastrada{lists.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => { setShowUpload(true); setUploadError(null); }} className="bg-primary text-black font-bold hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Importar Lista
        </Button>
      </div>

      {/* Lists Table */}
      <div className="bg-card/40 backdrop-blur-sm border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
        ) : lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileSpreadsheet className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma lista importada ainda.</p>
            <Button onClick={() => setShowUpload(true)} className="bg-primary text-black font-bold gap-2"><Plus className="w-4 h-4" /> Importar Primeira Lista</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Título", "Segmento", "Total Leads", "Funil", "Importado em", "Ações"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lists.map(list => {
                  const stats = funnelStats[list.id] ?? { proposals: 0, approved: 0 };
                  return (
                    <tr key={list.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">{list.title}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                          {PRESET_CATEGORIES.find(c => c.value === list.category)?.label ?? list.category ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-foreground">{list.total_leads}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-muted-foreground">{list.total_leads}</span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                          <span className="text-blue-400 font-semibold">{stats.proposals} prop.</span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                          <span className="text-green-400 font-semibold">{stats.approved} aprov.</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(list.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openViewLeads(list)} title="Ver Leads"
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => openAssign(list)} title="Atribuir Parceiros"
                            className="p-1.5 rounded-lg hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400 transition-colors">
                            <Users className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteList(list.id)} title="Excluir Lista"
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
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

      {/* ── Upload Modal ─────────────────────────────────────────────────────── */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-lg font-bold flex items-center gap-2"><Upload className="w-5 h-5 text-primary" /> Importar Lista de Leads</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowUpload(false)} className="rounded-full"><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Título da Lista *</label>
                <Input placeholder="Ex: Dentistas — Miami Q2 2025" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} className="h-10 bg-secondary/30 border-border" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Segmento Padrão</label>
                <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}
                  className="w-full h-10 bg-secondary/30 border border-border rounded-md px-3 text-sm text-foreground outline-none focus:border-primary/50">
                  {PRESET_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Arquivo Excel (.xlsx) *</label>
                <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <FileSpreadsheet className="w-10 h-10 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">{uploadFile ? uploadFile.name : "Clique para selecionar"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{uploadFile ? `${(uploadFile.size / 1024).toFixed(0)} KB` : "Formatos aceitos: .xlsx, .xls"}</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
                </label>
              </div>

              {uploadPreview.length > 0 && (
                <div className="space-y-2 p-4 bg-secondary/10 rounded-xl border border-border/50">
                  <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Pré-visualização (primeiras 3 linhas)</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] text-muted-foreground">
                      <thead><tr>{Object.keys(uploadPreview[0]).slice(0, 6).map(k => <th key={k} className="px-2 py-1 text-left font-bold truncate max-w-[100px]">{k}</th>)}</tr></thead>
                      <tbody>{uploadPreview.map((r, i) => <tr key={i} className="border-t border-border/30">{Object.values(r).slice(0, 6).map((v, j) => <td key={j} className="px-2 py-1 truncate max-w-[100px]">{String(v)}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{uploadError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowUpload(false)} className="flex-1">Cancelar</Button>
                <Button onClick={handleUpload} disabled={uploading} className="flex-1 bg-primary text-black font-bold">
                  {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importando...</> : <><Upload className="w-4 h-4 mr-2" />Importar</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Modal ─────────────────────────────────────────────────────── */}
      {assigningList && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Atribuir Parceiros</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Lista: <span className="text-foreground font-semibold">{assigningList.title}</span></p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setAssigningList(null)} className="rounded-full"><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-6 space-y-3">
              {allUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum parceiro ativo encontrado.</p>
              ) : allUsers.map(u => (
                <label key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedUserIds.has(u.id) ? "border-primary/50 bg-primary/5" : "border-border hover:bg-secondary/30"}`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedUserIds.has(u.id) ? "bg-primary border-primary" : "border-border"}`}>
                    {selectedUserIds.has(u.id) && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={selectedUserIds.has(u.id)}
                    onChange={e => setSelectedUserIds(prev => {
                      const next = new Set(prev);
                      e.target.checked ? next.add(u.id) : next.delete(u.id);
                      return next;
                    })} />
                  <span className="font-semibold text-foreground flex-1">{u.name}</span>
                  {assignments.some(a => a.user_id === u.id) && (
                    <span className="text-[9px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-bold">JÁ ATRIBUÍDO</span>
                  )}
                </label>
              ))}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setAssigningList(null)} className="flex-1">Cancelar</Button>
                <Button onClick={handleSaveAssignments} disabled={saving} className="flex-1 bg-primary text-black font-bold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Atribuições"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── View Leads Modal ─────────────────────────────────────────────────── */}
      {viewingList && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" /> {viewingList.title}
                </h2>
                <p className="text-xs text-muted-foreground">{viewLeads.length} leads importados</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewingList(null)} className="rounded-full"><X className="w-5 h-5" /></Button>
            </div>

            <div className="p-4 border-b border-border flex gap-3 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input placeholder="Buscar por nome ou estado..." value={viewSearch} onChange={e => setViewSearch(e.target.value)}
                  className="w-full h-9 bg-secondary/30 border border-border rounded-lg pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary/50" />
              </div>
              <select value={viewFilter} onChange={e => setViewFilter(e.target.value as any)}
                className="h-9 bg-secondary/30 border border-border rounded-lg px-3 text-sm text-foreground outline-none focus:border-primary/50">
                <option value="all">Todos</option>
                <option value="sem_proposta">Sem proposta</option>
                <option value="bom">Potencial: Bom</option>
                <option value="medio">Potencial: Médio</option>
                <option value="ruim">Potencial: Ruim</option>
              </select>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/20 px-3 rounded-lg border border-border">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                <span className="font-bold text-foreground">{filteredLeads.filter(l => !l.proposal_id).length}</span> sem proposta
                <span className="font-bold text-green-400 ml-1">{filteredLeads.filter(l => l.proposal_id).length}</span> com proposta
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingLeads ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border">
                      {["Nome", "Categoria", "Cidade/Estado", "Rating", "Potencial (Parceiro)", "Status"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map(lead => (
                      <tr key={lead.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground max-w-[200px] truncate">{lead.business_name ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{lead.category ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{[lead.city, lead.state].filter(Boolean).join(", ") || "—"}</td>
                        <td className="px-4 py-3">
                          {lead.google_rating ? (
                            <span className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                              ⭐ {lead.google_rating}
                              {lead.review_count ? <span className="text-muted-foreground font-normal">({lead.review_count})</span> : null}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {lead.potencial ? (
                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${potencialConfig[lead.potencial].color}`}>
                              {potencialConfig[lead.potencial].label}
                            </span>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {lead.proposal_id ? (
                            <span className="text-[10px] px-2 py-1 rounded-full font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20">Proposta Gerada</span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Circle className="w-2.5 h-2.5" /> Disponível
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredLeads.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Nenhum lead encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
