import { useState, useEffect } from "react";
import { 
  Copy, Check, Mail, Sparkles, MessageSquare, 
  ExternalLink, ChevronDown, FileText, Send, User, 
  Building2, MapPin, Palette, Zap, Loader2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";

interface Proposal {
  id: string;
  access_code: string;
  client_name: string;
  client_company: string | null;
  client_owner: string | null;
  client_email: string | null;
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

interface Template {
  id: string;
  key: string;
  title: string;
  subject: string | null;
  body: string;
}

export default function ScriptsTab({ currentUser }: { currentUser: { name: string; role: string } }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // States for editable content
  const [editablePrompt, setEditablePrompt] = useState("");
  const [editableScripts, setEditableScripts] = useState<Record<string, { subject: string; body: string }>>({});

  // Master Settings Modal
  const [showSettings, setShowSettings] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, tRes] = await Promise.all([
      supabase.from("proposals").select("*").order("inserted_at", { ascending: false }),
      supabase.from("email_templates").select("*").order("key", { ascending: true })
    ]);

    if (pRes.data) {
      let userProposals = pRes.data as unknown as Proposal[];
      if (currentUser.role !== "master") {
        userProposals = userProposals.filter(p => (p as unknown as { created_by: string }).created_by === currentUser.name);
      }
      setProposals(userProposals);
    }
    if (tRes.data) setTemplates(tRes.data as Template[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const selected = proposals.find(p => p.id === selectedId);

  // Replacement logic
  const replaceTags = (text: string, p: Proposal) => {
    if (!text) return "";
    return text
      .replaceAll("{TIPO}", p.business_type || "[TIPO]")
      .replaceAll("{BUSINESS_TYPE}", p.business_type || "[TIPO]")
      .replaceAll("{NOME}", p.client_company || p.client_name || "[NOME]")
      .replaceAll("{CLIENT_COMPANY}", p.client_company || p.client_name || "[NOME]")
      .replaceAll("{CIDADE}", p.city || "[CIDADE]")
      .replaceAll("{CITY}", p.city || "[CIDADE]")
      .replaceAll("{ESTADO}", p.state || "[ESTADO]")
      .replaceAll("{SERVICO_1}", p.service_1 || "[SERVIÇO 1]")
      .replaceAll("{SERVICO_2}", p.service_2 || "[SERVIÇO 2]")
      .replaceAll("{SERVICO_3}", p.service_3 || "[SERVIÇO 3]")
      .replaceAll("{COR_1}", p.primary_color || "[COR PRIMÁRIA]")
      .replaceAll("{COR_2}", p.secondary_color || "[COR SECUNDÁRIA]")
      .replaceAll("{CTA}", p.cta_action || "[AÇÃO]")
      .replaceAll("{REVIEWS}", p.reviews_summary || "[REVIEWS]")
      .replaceAll("{EMAIL}", p.client_email || "[EMAIL]")
      .replaceAll("{KEYWORDS}", p.keywords || "[KEYWORDS]")
      .replaceAll("{CLIENT_OWNER}", p.client_owner || p.client_name || "[NOME]")
      .replaceAll("{LINK_DEMO}", `${window.location.origin}/proposta?code=${p.access_code}`)
      .replaceAll("{ACCESS_CODE}", p.access_code)
      .replaceAll("{PROPOSAL_VALUE}", p.proposal_value?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00")
      .replaceAll("{ADMIN_NAME}", currentUser.name);
  };

  useEffect(() => {
    if (selected && templates.length > 0) {
      const promptTmpl = templates.find(t => t.key === "lovable_prompt");
      setEditablePrompt(promptTmpl ? replaceTags(promptTmpl.body, selected) : "");

      const scripts: Record<string, { subject: string; body: string }> = {};
      templates.filter(t => t.key !== "lovable_prompt").forEach(t => {
        scripts[t.key] = {
          subject: replaceTags(t.subject || "", selected),
          body: replaceTags(t.body, selected)
        };
      });
      setEditableScripts(scripts);
    }
  }, [selected, templates]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Seletor */}
      <div className="bg-card/40 backdrop-blur-sm border border-border rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-heading text-2xl font-bold text-foreground">Scripts de Prospecção</h2>
            <p className="text-sm text-muted-foreground">Selecione uma proposta e edite o script como desejar.</p>
          </div>
          <div className="flex items-center gap-3">
            {currentUser.role === "master" && (
              <Button 
                variant="outline" 
                onClick={() => setShowSettings(true)}
                className="border-border hover:bg-secondary/50 group"
              >
                <Zap className="w-4 h-4 mr-2 text-yellow-400 group-hover:animate-pulse" />
                Base de Scripts
              </Button>
            )}
            <div className="min-w-[280px]">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full h-11 bg-secondary/50 border border-border rounded-xl px-4 text-sm text-foreground outline-none focus:border-primary/50 transition-all font-medium"
              >
                <option value="">Selecione um cliente...</option>
                {proposals.map(p => (
                  <option key={p.id} value={p.id}>{p.client_name} ({p.client_company || "Sem Empresa"})</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {!selected ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-3xl opacity-50">
          <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground font-medium">Selecione uma proposta acima para ver os scripts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Lovable Prompt Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-heading font-bold text-lg">Prompt Lovable</h3>
            </div>
            
            <div className="relative group">
              <div className="absolute top-4 right-4 z-10">
                <Button 
                  size="sm"
                  onClick={() => handleCopy(editablePrompt, "prompt")}
                  className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 backdrop-blur-md rounded-lg h-9"
                >
                  {copiedKey === "prompt" ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copiedKey === "prompt" ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <textarea 
                value={editablePrompt}
                onChange={(e) => setEditablePrompt(e.target.value)}
                className="w-full h-[450px] bg-secondary/30 border border-border rounded-2xl p-6 pt-16 font-mono text-sm leading-relaxed text-foreground/90 outline-none focus:border-primary/50 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Email Templates Section */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-heading font-bold text-lg">E-mails Sequenciais</h3>
              </div>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {templates.filter(t => t.key !== "lovable_prompt").map((tmpl, idx) => {
                const current = editableScripts[tmpl.key] || { subject: "", body: "" };
                return (
                  <AccordionItem 
                    key={tmpl.id} 
                    value={tmpl.key} 
                    className="bg-card/40 border border-border rounded-xl px-4 overflow-hidden"
                  >
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-3 text-left">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">{idx + 1}</span>
                        <span className="font-semibold text-sm">{tmpl.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6 pt-2 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Assunto</label>
                        <input 
                          type="text"
                          value={current.subject}
                          onChange={(e) => setEditableScripts(prev => ({
                            ...prev,
                            [tmpl.key]: { ...prev[tmpl.key], subject: e.target.value }
                          }))}
                          className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-primary/50"
                        />
                      </div>
                      <div className="space-y-1.5 relative">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Corpo do E-mail</label>
                        <button 
                          onClick={() => handleCopy(current.body, tmpl.key)}
                          className="absolute top-0 right-0 text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {copiedKey === tmpl.key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedKey === tmpl.key ? "Copiado" : "Copiar"}
                        </button>
                        <textarea 
                          value={current.body}
                          onChange={(e) => setEditableScripts(prev => ({
                            ...prev,
                            [tmpl.key]: { ...prev[tmpl.key], body: e.target.value }
                          }))}
                          rows={8}
                          className="w-full bg-card/60 rounded-xl border border-border p-4 text-sm leading-relaxed text-muted-foreground outline-none focus:border-primary/50 resize-none"
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </div>
      )}

      {/* Settings Modal (Base Templates) */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" /> Editar Base de Scripts
                </h2>
                <p className="text-xs text-muted-foreground mt-1">Use tags como {'{NOME}'}, {'{LINK_DEMO}'}, {'{ACCESS_CODE}'} para personalização.</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-secondary rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8 flex-1">
              {templates.map((t, i) => (
                <div key={t.id} className="space-y-4 p-4 bg-secondary/20 rounded-xl border border-border/50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-primary text-sm flex items-center gap-2 underline underline-offset-4 decoration-primary/30">
                      {i + 1}. {t.title}
                    </h4>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">{t.key}</span>
                  </div>
                  {t.subject !== null && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Assunto Base</label>
                      <input 
                        defaultValue={t.subject}
                        onBlur={async (e) => {
                          const val = e.target.value;
                          await supabase.from("email_templates").update({ subject: val }).eq("id", t.id);
                        }}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Corpo Base</label>
                    <textarea 
                      defaultValue={t.body}
                      onBlur={async (e) => {
                        const val = e.target.value;
                        await supabase.from("email_templates").update({ body: val }).eq("id", t.id);
                      }}
                      rows={t.key === "lovable_prompt" ? 4 : 6}
                      className="w-full bg-background border border-border rounded-lg p-3 text-sm outline-none focus:border-primary/50 font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button onClick={() => { setShowSettings(false); fetchData(); }} className="bg-primary text-black font-bold px-8">Concluir Alterações</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
