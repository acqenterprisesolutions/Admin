import { useState, useEffect } from "react";
import { 
  Copy, Check, Mail, Sparkles, MessageSquare, 
  ExternalLink, ChevronDown, FileText, Send, User, 
  Building2, MapPin, Palette, Zap
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

export default function ScriptsTab({ currentUser }: { currentUser: { name: string; role: string } }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const fetchProposals = async () => {
      let query = supabase
        .from("proposals")
        .select("*")
        .order("inserted_at", { ascending: false });

      if (currentUser.role !== "master") {
        query = query.eq("created_by", currentUser.name);
      }

      const { data } = await query;
      if (data) setProposals(data as Proposal[]);
      setLoading(false);
    };

    fetchProposals();
  }, [currentUser]);

  const selected = proposals.find(p => p.id === selectedId);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Helper to get demo link
  const getDemoLink = (code: string) => `${window.location.origin}/proposta?code=${code}`;

  // ── Scripts Logic ──────────────────────────────────────────────────────────
  
  const generateLovablePrompt = (p: Proposal) => {
    return `Create a modern, professional landing page for a ${p.business_type || "[TIPO]"} called ${p.client_company || p.client_name || "[NOME]"} located in ${p.city || "[CIDADE]"}, ${p.state || "[ESTADO]"}.
Services offered: ${p.service_1 || "[SERVIÇO 1]"}, ${p.service_2 || "[SERVIÇO 2]"}, ${p.service_3 || "[SERVIÇO 3]"}
Design: Clean, modern, trustworthy. ${p.primary_color || "[COR PRIMÁRIA]"} and ${p.secondary_color || "[COR SECUNDÁRIA]"} palette with white backgrounds.
Sections: 1) Hero with headline + CTA "${p.cta_action || "[AÇÃO]"}" 2) Services with icons 3) About 4) Testimonials (3 based on: ${p.reviews_summary || "[REVIEWS REAIS]"}) 5) Contact with address, phone, Google Maps 6) Footer with social links
Technical: Responsive mobile-first, fast loading, smooth scroll, contact form to ${p.client_email || "[EMAIL]"}, SEO meta tags for "${p.keywords || "[KEYWORDS]"}"`;
  };

  const emailTemplates = [
    {
      id: "direct",
      title: "5.1 Primeiro Contato — Versão Direta",
      subject: `Modern website concept for ${selected?.client_company || "[Business Name]"}`,
      body: `Hi ${selected?.client_owner || selected?.client_name || "[Name]"},

I came across ${selected?.client_company || "[Business Name]"} while looking for ${selected?.business_type || "[niche]"} in ${selected?.city || "[City]"} and noticed your online presence could use a modern refresh to better match the quality of your services.

I created a concept for you — here’s a live preview:
${selected ? getDemoLink(selected.access_code) : "[LINK DA DEMO]"}

Includes responsive mobile design, booking/contact form, and optimized layout to convert visitors into customers. Final version in 5 business days for $${selected?.proposal_value || "[PREÇO]"}. Preview available 7 days.

Best, ${currentUser.name} | Web Developer`
    },
    {
      id: "competitive",
      title: "5.2 Primeiro Contato — Versão Competitiva",
      subject: `Your competitors have better websites — let’s fix that`,
      body: `Hi ${selected?.client_owner || selected?.client_name || "[Name]"},

I compared ${selected?.business_type || "[niche]"} websites in ${selected?.city || "[City]"}. Your reviews are great, but your online presence doesn’t reflect ${selected?.client_company || "[Business Name]"}’s quality. I built a concept to put you ahead:

${selected ? getDemoLink(selected.access_code) : "[LINK DA DEMO]"}

5 business days, $${selected?.proposal_value || "[PREÇO]"}. Preview live 7 days. 

Best, ${currentUser.name}`
    },
    {
      id: "no-site",
      title: "5.3 Primeiro Contato — Negócio SEM Site",
      subject: `I built a website for ${selected?.client_company || "[Business Name]"} — take a look`,
      body: `Hi ${selected?.client_owner || selected?.client_name || "[Name]"},

Found ${selected?.client_company || "[Business Name]"} on Google Maps — great reviews! A website would help more people find you. I created one:

${selected ? getDemoLink(selected.access_code) : "[LINK DA DEMO]"}

Mobile-friendly, your services + location + booking button. Ready in 5 days for $${selected?.proposal_value || "[PREÇO]"}. Preview up for 7 days.

Best, ${currentUser.name} | Web Developer`
    },
    {
      id: "followup1",
      title: "5.4 Follow-up 1 (3-4 dias depois)",
      subject: `Re: Website concept for ${selected?.client_company || "[Business Name]"}`,
      body: `Hi ${selected?.client_owner || selected?.client_name || "[Name]"}, just following up. 

Preview still active: ${selected ? getDemoLink(selected.access_code) : "[LINK]"}

Would you have 5 min to look? Happy to answer questions. 

Best, ${currentUser.name}`
    },
    {
      id: "followup2",
      title: "5.5 Follow-up 2 (7 dias depois)",
      subject: `Re: Website — last chance to preview`,
      body: `Hi ${selected?.client_owner || selected?.client_name || "[Name]"}, taking the preview down soon. 

Here’s the link one more time: ${selected ? getDemoLink(selected.access_code) : "[LINK]"}

No pressure! 

Best, ${currentUser.name}`
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Sparkles className="animate-spin text-primary w-8 h-8" />
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
            <p className="text-sm text-muted-foreground">Selecione uma proposta para gerar seus materiais de venda.</p>
          </div>
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
                  onClick={() => handleCopy(generateLovablePrompt(selected), "prompt")}
                  className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 backdrop-blur-md rounded-lg h-9"
                >
                  {copiedKey === "prompt" ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copiedKey === "prompt" ? "Copiado" : "Copiar Prompt"}
                </Button>
              </div>
              <div className="bg-secondary/30 border border-border rounded-2xl p-6 pt-16 font-mono text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                {generateLovablePrompt(selected)}
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-4 bg-primary/5 border border-primary/10 rounded-xl text-xs text-primary/80">
              <ExternalLink className="w-4 h-4" />
              <span>Gere o esboço visual no Lovable e depois cole o HTML na Aba de Propostas.</span>
            </div>
          </div>

          {/* Email Templates Section */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-heading font-bold text-lg">Sequência de E-mails</h3>
              </div>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {emailTemplates.map((email, idx) => (
                <AccordionItem 
                  key={email.id} 
                  value={email.id} 
                  className="bg-card/40 border border-border rounded-xl px-4 overflow-hidden"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-left">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">{idx + 1}</span>
                      <span className="font-semibold text-sm">{email.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 pt-2">
                    <div className="space-y-4">
                      <div className="p-3 bg-secondary/50 rounded-lg border border-border">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Assunto</p>
                        <p className="text-sm font-medium text-foreground">{email.subject}</p>
                      </div>
                      <div className="relative">
                        <button 
                          onClick={() => handleCopy(email.body, email.id)}
                          className="absolute top-2 right-2 p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
                          title="Copiar corpo do e-mail"
                        >
                          {copiedKey === email.id ? <Check className="w-4 h-4 text-[#00FF9D]" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <div className="p-5 bg-card/60 rounded-xl border border-border text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                          {email.body}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

        </div>
      )}
    </div>
  );
}
