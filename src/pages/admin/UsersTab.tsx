import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Shield, ShieldOff, Loader2, AlertCircle, X, Shuffle, Users, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

interface DbUser {
  id: string;
  name: string;
  token: string;
  role: "master" | "user";
  is_active: boolean;
  commission_rate: number;
  created_at: string;
}

function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let t = "ACQ-";
  for (let i = 0; i < 6; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

export default function UsersTab() {
  const [users, setUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<DbUser | null>(null);

  const [form, setForm] = useState({ 
    name: "", 
    token: generateToken(), 
    role: "user" as "master" | "user", 
    commission_rate: "50" 
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("admin_users").select("*").order("created_at", { ascending: true });
    if (data) setUsers(data as DbUser[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleOpenEdit = (u: DbUser) => {
    setEditingUser(u);
    setForm({
      name: u.name,
      token: u.token,
      role: u.role,
      commission_rate: u.commission_rate.toString()
    });
    setCreateError(null);
    setShowModal(true);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const payload = {
      name: form.name,
      token: form.token,
      role: form.role,
      commission_rate: parseFloat(form.commission_rate) || 50,
    };

    let result;
    if (editingUser) {
      result = await supabase.from("admin_users").update(payload).eq("id", editingUser.id);
    } else {
      result = await supabase.from("admin_users").insert(payload);
    }

    if (result.error) {
      setCreateError(result.error.code === "23505" ? "Token/senha já existe. Gere outro." : result.error.message);
      setCreating(false);
      return;
    }

    setShowModal(false);
    setEditingUser(null);
    setForm({ name: "", token: generateToken(), role: "user", commission_rate: "50" });
    fetchUsers();
    setCreating(false);
  };

  const handleToggle = async (u: DbUser) => {
    setTogglingId(u.id);
    await supabase.from("admin_users").update({ is_active: !u.is_active }).eq("id", u.id);
    fetchUsers();
    setTogglingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este usuário permanentemente?")) return;
    setDeletingId(id);
    await supabase.from("admin_users").delete().eq("id", id);
    fetchUsers();
    setDeletingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Gerenciar Usuários</h2>
          <p className="text-sm text-muted-foreground">{users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => { 
          setEditingUser(null);
          setForm({ name: "", token: generateToken(), role: "user", commission_rate: "50" });
          setShowModal(true); 
          setCreateError(null); 
        }} className="bg-[#00FF9D] text-black font-bold hover:bg-[#00E58C] gap-2">
          <Plus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      <div className="bg-card/40 backdrop-blur-sm border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Nenhum usuário cadastrado.</p>
            <Button onClick={() => {
              setEditingUser(null);
              setShowModal(true);
            }} className="bg-[#00FF9D] text-black font-bold hover:bg-[#00E58C] gap-2"><Plus className="w-4 h-4" /> Criar Primeiro</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Nome", "Senha (Token)", "Role", "Comissão", "Status", "Criado em", "Ações"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={`border-b border-border/50 hover:bg-primary/5 transition-colors ${!u.is_active ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-semibold text-foreground">{u.name}</td>
                    <td className="px-4 py-3">
                      <code className="bg-secondary/60 text-primary px-2 py-1 rounded font-mono text-xs tracking-widest">{u.token}</code>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                        u.role === "master" ? "bg-[#00FF9D]/15 text-[#00FF9D]" : "bg-indigo-500/15 text-indigo-400"
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground">{u.commission_rate}%</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        u.is_active ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                      }`}>{u.is_active ? "Ativo" : "Bloqueado"}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleOpenEdit(u)} title="Editar"
                          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggle(u)} disabled={togglingId === u.id} title={u.is_active ? "Bloquear" : "Desbloquear"}
                          className="p-1.5 rounded-lg hover:bg-yellow-500/10 text-muted-foreground hover:text-yellow-400 transition-colors">
                          {togglingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : u.is_active ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        </button>
                        {u.role !== "master" && (
                          <button onClick={() => handleDelete(u.id)} disabled={deletingId === u.id} title="Excluir"
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            {deletingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-heading text-xl font-bold text-foreground">
                {editingUser ? "Editar Usuário" : "Novo Usuário"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-secondary/60 text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Nome *</label>
                <Input type="text" placeholder="Ex: João Silva" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus className="h-11 bg-secondary/50 border-border" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Senha (Token) *</label>
                <div className="flex gap-2">
                  <Input type="text" value={form.token} onChange={e => setForm(f => ({ ...f, token: e.target.value.toUpperCase() }))} required className="h-11 bg-secondary/50 border-border font-mono tracking-widest text-center flex-1" />
                  <Button type="button" variant="outline" onClick={() => setForm(f => ({ ...f, token: generateToken() }))} className="h-11 gap-2 border-border"><Shuffle className="w-4 h-4" /> Gerar</Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Role *</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as "master" | "user" }))} className="w-full h-11 bg-secondary/50 border border-border rounded-lg px-3 text-foreground outline-none">
                  <option value="user">User (vê só as próprias propostas)</option>
                  <option value="master">Master (vê tudo, acesso total)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Comissão (%)</label>
                <Input type="number" min="0" max="100" step="1" value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))} className="h-11 bg-secondary/50 border-border" />
              </div>
              {createError && (
                <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 text-sm"><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{createError}</div>
              )}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
                <Button type="submit" disabled={creating} className="flex-1 bg-[#00FF9D] text-black font-bold hover:bg-[#00E58C]">
                  {creating ? <Loader2 className="animate-spin w-4 h-4" /> : editingUser ? "Salvar Alterações" : "Criar Usuário"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
