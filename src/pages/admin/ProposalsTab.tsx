import { useState, useEffect, useRef, useCallback } from "react";
import {
  Palette, Zap, Edit3, Sparkles, Search, Settings2, Save, Camera, Upload, Image as ImageIcon,
  Database, ChevronRight, Circle, X, Loader2, Plus, Eye, Clock, CheckCircle, XCircle,
  AlertCircle, AlertTriangle, ChevronDown, Star, Phone, MapPin, Globe, FileText, Users, Trash2,
  RotateCcw, Download, ExternalLink, Bell, Filter,
  TrendingUp, Check, Copy, Mail, User, Shuffle, Send, History, RefreshCw, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

// ─── Types ───────────────────────────────────────────────────────────────────
type Status = "pending" | "approved" | "revision_requested" | "expired";
type StatusFilter = "all" | Status;

interface LeadListEntry {
  id: string;
  title: string;
  category: string | null;
  total_leads: number;
  viewed_at: string | null;
}

interface LeadEntry {
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

const PRESET_KEY_MAP: Record<string, string> = {
  healthcare: "Healthcare",
  contractor: "Contractor & Home Services",
  personal_care: "Personal Care",
  professional: "Professional Services",
  food_beverage: "Food & Beverage",
  dentist: "Healthcare",
  dental: "Healthcare",
  other: "Other (Generic)",
};

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
  phone: string | null;
  address: string | null;
  instagram: string | null;
  tagline: string | null;
  visual_style: string | null;
  tone_of_voice: string | null;
  diferencial_1: string | null;
  diferencial_2: string | null;
  diferencial_3: string | null;
  anos_negocio: number | null;
  num_clientes: number | null;
  review_1_nome: string | null;
  review_1_nota: number | null;
  review_1_texto: string | null;
  review_2_nome: string | null;
  review_2_nota: number | null;
  review_2_texto: string | null;
  review_3_nome: string | null;
  review_3_nota: number | null;
  review_3_texto: string | null;
  logo_url: string | null;
  foto_1: string | null;
  foto_2: string | null;
  foto_3: string | null;
  foto_4: string | null;
  foto_5: string | null;
  notas_parceiro: string | null;
  preset_key: string | null;
  gallery: { url: string; location: string }[] | null;
  effect_key: string | null;
  effect_intensity: string | null;
  prompt_cache: string | null;
  prompt_char_count: number | null;
}

interface EffectTemplate {
  id: string;
  key: string;
  label: string;
  description: string | null;
  compatible_presets: string[] | null;
  conflicts_with: string[] | null;
  body_subtle: string | null;
  body_standard: string | null;
  body_full: string | null;
  preview_url: string | null;
  created_at?: string;
  updated_at?: string;
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
  phone: string;
  address: string;
  instagram: string;
  tagline: string;
  visual_style: string;
  tone_of_voice: string;
  diferencial_1: string;
  diferencial_2: string;
  diferencial_3: string;
  anos_negocio: string;
  num_clientes: string;
  review_1_nome: string;
  review_1_nota: number;
  review_1_texto: string;
  review_2_nome: string;
  review_2_nota: number;
  review_2_texto: string;
  review_3_nome: string;
  review_3_nota: number;
  review_3_texto: string;
  logo_url: string;
  foto_1: string;
  foto_2: string;
  foto_3: string;
  foto_4: string;
  foto_5: string;
  notas_parceiro: string;
  preset_key: string;
  gallery: { url: string; location: string }[];
  effect_key: string | null;
  effect_intensity: string;
  prompt_cache: string;
  prompt_char_count: number;
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

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit"
  }).replace(",", " -");
};

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

  // Create/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  
  // Preview and Prompt
  const [showPreview, setShowPreview] = useState(false);
  const [lovablePrompt, setLovablePrompt] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPromptConfig, setShowPromptConfig] = useState(false);
  const [promptTemplates, setPromptTemplates] = useState<Record<string, string>>({});
  const [editingTemplates, setEditingTemplates] = useState<Record<string, string>>({});
  const [dirtyTemplates, setDirtyTemplates] = useState<Record<string, boolean>>({});
  const [activeConfigTab, setActiveConfigTab] = useState("other");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [effectTemplates, setEffectTemplates] = useState<EffectTemplate[]>([]);
  const [activeEffectTab, setActiveEffectTab] = useState<string>("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // ── Lead Selection States ─────────────────────────────────────────────────
  const [showLeadDrawer, setShowLeadDrawer] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadLists, setLeadLists] = useState<LeadListEntry[]>([]);
  const [leadDrawerTab, setLeadDrawerTab] = useState<string>("");
  const [drawerLeads, setDrawerLeads] = useState<LeadEntry[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState("");
  const [newListBadge, setNewListBadge] = useState(0);
  const [form, setForm] = useState<NewProposalForm>({
    client_name: "", access_code: generateCode(), html_content: "",
    expires_days: 8, client_email: "", client_company: "",
    client_owner: "", client_website: "", proposal_value: "",
    business_type: "Other", city: "", state: "",
    service_1: "", service_2: "", service_3: "",
    primary_color: "#00FF9D", secondary_color: "#050505",
    cta_action: "Solicitar Orçamento", reviews_summary: "",
    keywords: "",
    phone: "", address: "", instagram: "", tagline: "",
    visual_style: "Clean & Minimal", tone_of_voice: "Professional & Authoritative",
    diferencial_1: "", diferencial_2: "", diferencial_3: "",
    anos_negocio: "", num_clientes: "",
    review_1_nome: "", review_1_nota: 5, review_1_texto: "",
    review_2_nome: "", review_2_nota: 5, review_2_texto: "",
    review_3_nome: "", review_3_nota: 5, review_3_texto: "",
    logo_url: "", foto_1: "", foto_2: "", foto_3: "", foto_4: "", foto_5: "",
    notas_parceiro: "", preset_key: "other",
    gallery: [],
    effect_key: null,
    effect_intensity: "standard",
    prompt_cache: "",
    prompt_char_count: 0,
  });

  // Row actions
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ── Email Modal States ───────────────────────────────────────────────────
  interface EmailLog {
    id: string;
    template_key: string;
    template_title: string;
    sent_to: string;
    sent_by: string;
    subject: string;
    sent_at: string;
    status: string;
    replied_at: string | null;
    remarketing_enabled: boolean;
    remarketing_interval_days: number;
    next_followup_at: string | null;
    followup_count: number;
  }
  interface EmailTemplate {
    id: string;
    key: string;
    title: string;
    subject: string | null;
    body: string;
  }
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailProposal, setEmailProposal] = useState<Proposal | null>(null);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedEmailTemplateKey, setSelectedEmailTemplateKey] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSendResult, setEmailSendResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);
  const [showEmailHistory, setShowEmailHistory] = useState(false);
  const [remarketingEnabled, setRemarketingEnabled] = useState(false);
  const [remarketingDays, setRemarketingDays] = useState(7);
  const API_BASE = "https://admin.acqent.solutions";

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
      let userProposals = data as unknown as Proposal[];
      if (currentUser.role !== "master") {
        userProposals = userProposals.filter(p => (p as unknown as { created_by: string }).created_by === currentUser.name);
      }
      setProposals(userProposals);
      // Extract unique users for filter dropdown
      const users = [...new Set((data as Proposal[]).map(p => p.created_by).filter(Boolean))];
      setAllUsers(users);
    }
    setLoading(false);
  }, [currentUser, isMaster]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  // ── Lead Lists Fetch ─────────────────────────────────────────────────
  const fetchLeadLists = useCallback(async () => {
    // Get admin_users row for current user
    const { data: userRow } = await supabase
      .from("admin_users")
      .select("id")
      .eq("name", currentUser.name)
      .maybeSingle();

    if (!userRow?.id) return;

    const { data } = await supabase
      .from("list_assignments")
      .select("list_id, viewed_at, lead_lists(id, title, category, total_leads)")
      .eq("user_id", userRow.id);

    if (data) {
      const lists = data
        .filter((a: any) => a.lead_lists)
        .map((a: any) => ({ ...a.lead_lists, viewed_at: a.viewed_at })) as LeadListEntry[];
      setLeadLists(lists);
      setNewListBadge(lists.filter(l => !l.viewed_at).length);
      if (lists.length > 0 && !leadDrawerTab) setLeadDrawerTab(lists[0].id);
    }
  }, [currentUser.name, leadDrawerTab]);

  useEffect(() => {
    if (!isMaster) fetchLeadLists();
  }, [fetchLeadLists, isMaster]);

  const fetchLeadsForList = async (listId: string) => {
    setDrawerLoading(true);
    const { data } = await supabase.from("leads").select("*").eq("list_id", listId).order("inserted_at");
    setDrawerLeads((data ?? []) as LeadEntry[]);
    setDrawerLoading(false);
  };

  // ── Create ───────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + form.expires_days);

    const val = parseFloat(form.proposal_value);

    const b64Html = form.html_content ? btoa(encodeURIComponent(form.html_content)) : "";

    const payload = {
      client_name:    form.client_name,
      access_code:    form.access_code.toUpperCase(),
      html_content:   b64Html,
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
      phone:          form.phone || null,
      address:        form.address || null,
      instagram:      form.instagram || null,
      tagline:        form.tagline || null,
      visual_style:   form.visual_style || null,
      tone_of_voice:  form.tone_of_voice || null,
      diferencial_1:  form.diferencial_1 || null,
      diferencial_2:  form.diferencial_2 || null,
      diferencial_3:  form.diferencial_3 || null,
      anos_negocio:   form.anos_negocio ? parseInt(form.anos_negocio) : null,
      num_clientes:   form.num_clientes ? parseInt(form.num_clientes) : null,
      review_1_nome:  form.review_1_nome || null,
      review_1_nota:  form.review_1_nota,
      review_1_texto: form.review_1_texto || null,
      review_2_nome:  form.review_2_nome || null,
      review_2_nota:  form.review_2_nota,
      review_2_texto: form.review_2_texto || null,
      review_3_nome:  form.review_3_nome || null,
      review_3_nota:  form.review_3_nota,
      review_3_texto: form.review_3_texto || null,
      logo_url:       form.logo_url || null,
      foto_1:         form.foto_1 || null,
      foto_2:         form.foto_2 || null,
      foto_3:         form.foto_3 || null,
      foto_4:         form.foto_4 || null,
      foto_5:         form.foto_5 || null,
      notas_parceiro: form.notas_parceiro || null,
      preset_key:     form.preset_key || "other",
      gallery:        form.gallery || [],
      effect_key:     form.effect_key || null,
      effect_intensity: form.effect_intensity || "standard",
      prompt_cache:   lovablePrompt,
      prompt_char_count: lovablePrompt.length,
    };

    const { data: inserted, error } = editingId
      ? await (async () => { const r = await supabase.from("proposals").update(payload).eq("id", editingId).select().single(); return r; })()
      : await supabase.from("proposals").insert(payload).select().single();

    if (error) {
      setCreateError(error.code === "23505" ? "Código já está em uso. Gere um novo." : error.message);
      setCreating(false);
      return;
    }

    // Link lead to proposal (if a lead was selected)
    if (selectedLeadId && !editingId && inserted?.id) {
      await supabase.from("leads").update({ proposal_id: inserted.id }).eq("id", selectedLeadId);
      setSelectedLeadId(null);
    }

    setShowModal(false);
    setEditingId(null);
    setShowPreview(false);
    setForm({
      client_name: "", access_code: generateCode(), html_content: "", expires_days: 8,
      client_email: "", client_company: "", client_owner: "", client_website: "", proposal_value: "",
      business_type: "", city: "", state: "",
      service_1: "", service_2: "", service_3: "",
      primary_color: "#00FF9D", secondary_color: "#050505",
      cta_action: "Solicitar Orçamento", reviews_summary: "",
      keywords: "",
      phone: "", address: "", instagram: "", tagline: "",
      visual_style: "Clean & Minimal", tone_of_voice: "Professional & Authoritative",
      diferencial_1: "", diferencial_2: "", diferencial_3: "",
      anos_negocio: "", num_clientes: "",
      review_1_nome: "", review_1_nota: 5, review_1_texto: "",
      review_2_nome: "", review_2_nota: 5, review_2_texto: "",
      review_3_nome: "", review_3_nota: 5, review_3_texto: "",
      logo_url: "", foto_1: "", foto_2: "", foto_3: "", foto_4: "", foto_5: "",
      notas_parceiro: "", preset_key: "other",
      gallery: [], effect_key: "", effect_intensity: "standard"
    });
    fetchProposals();
    if (!isMaster) fetchLeadLists();
    setCreating(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Logo deve ter no máximo 2MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${form.access_code}/logo_${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('proposal-media')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('proposal-media')
        .getPublicUrl(path);

      setForm(f => ({ ...f, logo_url: publicUrl }));
    } catch (err: any) {
      alert("Erro no upload do logo: " + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Foto deve ter no máximo 5MB");
      return;
    }

    setUploadingPhotos(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${form.access_code}/foto_${index}_${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('proposal-media')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('proposal-media')
        .getPublicUrl(path);

      setForm(f => ({ ...f, [`foto_${index}`]: publicUrl }));
    } catch (err: any) {
      alert("Erro no upload da foto: " + err.message);
    } finally {
      setUploadingPhotos(false);
    }
  };

  // ── Prompt Logic ──────────────────────────────────────────────────────────
  const fetchTemplates = async () => {
    const keys = [
      "lovable_prompt", "prompt_healthcare", "prompt_contractor", 
      "prompt_personal_care", "prompt_professional", "prompt_food_beverage", "prompt_other"
    ];
    const { data } = await supabase.from("email_templates").select("key, body").in("key", keys);
    if (data) {
      const tmpls: Record<string, string> = {};
      data.forEach(item => { tmpls[item.key] = item.body; });
      setPromptTemplates(tmpls);
      setEditingTemplates(tmpls);
    }
  };

  const fetchEffectTemplates = async () => {
    const { data } = await supabase.from("effect_templates").select("*");
    if (data) {
      const decodedData = data.map(e => {
        const decodeSafe = (str: string | null) => {
          if (!str) return "";
          try {
            return decodeURIComponent(atob(str));
          } catch (err) {
            return str; // Fallback in case it's not base64 encoded
          }
        };
        return {
          ...e,
          body_subtle: decodeSafe(e.body_subtle),
          body_standard: decodeSafe(e.body_standard),
          body_full: decodeSafe(e.body_full)
        };
      });
      setEffectTemplates(decodedData);
      if (decodedData.length > 0 && !activeEffectTab) {
        setActiveEffectTab(decodedData[0].key);
      }
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchEffectTemplates();
  }, []);

  const saveTemplate = async (key: string) => {
    setSavingTemplate(true);
    try {
      const fullKey = key === "lovable_prompt" ? "lovable_prompt" : `prompt_${key}`;
      const { error } = await supabase
        .from("email_templates")
        .update({ body: editingTemplates[fullKey] })
        .eq("key", fullKey);

      if (error) throw error;
      
      setPromptTemplates(prev => ({ ...prev, [fullKey]: editingTemplates[fullKey] }));
      setDirtyTemplates(prev => ({ ...prev, [fullKey]: false }));
    } catch (err: any) {
      alert("Erro ao salvar template: " + err.message);
    } finally {
      setSavingTemplate(false);
    }
  };

  const saveEffectTemplate = async (key: string) => {
    setSavingTemplate(true);
    try {
      const effect = effectTemplates.find(e => e.key === key);
      if (!effect) return;
      
      const encodeSafe = (str: string | null) => str ? btoa(encodeURIComponent(str)) : "";
      
      const { error } = await supabase
        .from("effect_templates")
        .update({
          body_subtle: encodeSafe(effect.body_subtle),
          body_standard: encodeSafe(effect.body_standard),
          body_full: encodeSafe(effect.body_full)
        })
        .eq("key", key);

      if (error) throw error;
      alert("Efeito salvo com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar efeito: " + err.message);
    } finally {
      setSavingTemplate(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    
    // Choose template based on preset_key
    const targetKey = form.preset_key && form.preset_key !== "other" 
      ? `prompt_${form.preset_key}` 
      : (form.preset_key === "other" ? "prompt_other" : "lovable_prompt");
    
    const tmpl = promptTemplates[targetKey] || promptTemplates["lovable_prompt"] || "";
    
    let filled = tmpl
      .replaceAll("{NOME}", form.client_company || form.client_name || "[NOME]")
      .replaceAll("{TIPO}", form.business_type || "[TIPO]")
      .replaceAll("{CIDADE}", form.city || "[CIDADE]")
      .replaceAll("{ESTADO}", form.state || "[ESTADO]")
      .replaceAll("{EMAIL}", form.client_email || "[EMAIL]")
      .replaceAll("{COLOR_PRIMARY}", form.primary_color || "[COR]")
      .replaceAll("{COLOR_SECONDARY}", form.secondary_color || "[COR]")
      .replaceAll("{CTA_TEXT}", form.cta_action || "[AÇÃO]")
      .replaceAll("{REVIEWS_SUMMARY}", form.reviews_summary || "")
      .replaceAll("{KEYWORDS}", form.keywords || "")
      .replaceAll("{SERVICE_1}", form.service_1 || "")
      .replaceAll("{SERVICE_2}", form.service_2 || "")
      .replaceAll("{SERVICE_3}", form.service_3 || "")
      .replaceAll("{ACCESS_URL}", `${window.location.origin}/proposta?code=${form.access_code}`)
      .replaceAll("{LINK_DEMO}", `${window.location.origin}/proposta?code=${form.access_code}`)
      .replaceAll("{ACCESS_CODE}", form.access_code)
      .replaceAll("{PROPOSAL_VALUE}", form.proposal_value || "0,00")
      .replaceAll("{PHONE}", form.phone || "none")
      .replaceAll("{TELEFONE}", form.phone || "none")
      .replaceAll("{ADDRESS}", form.address || "none")
      .replaceAll("{ENDERECO}", form.address || "none")
      .replaceAll("{INSTAGRAM}", form.instagram || "none")
      .replaceAll("{TAGLINE}", form.tagline || "none")
      .replaceAll("{ESTILO}", form.visual_style)
      .replaceAll("{TOM}", form.tone_of_voice)
      .replaceAll("{DIFERENCIAL_1}", form.diferencial_1 || "none")
      .replaceAll("{DIFERENCIAL_2}", form.diferencial_2 || "none")
      .replaceAll("{DIFERENCIAL_3}", form.diferencial_3 || "none")
      .replaceAll("{ANOS}", form.anos_negocio || "none")
      .replaceAll("{CLIENTES}", form.num_clientes || "none")
      .replaceAll("{REVIEW_1_NOME}", form.review_1_nome || "none")
      .replaceAll("{REVIEW_1_NOTA}", form.review_1_nota.toString())
      .replaceAll("{REVIEW_1_TEXTO}", form.review_1_texto || "none")
      .replaceAll("{REVIEW_2_NOME}", form.review_2_nome || "none")
      .replaceAll("{REVIEW_2_NOTA}", form.review_2_nota.toString())
      .replaceAll("{REVIEW_2_TEXTO}", form.review_2_texto || "none")
      .replaceAll("{REVIEW_3_NOME}", form.review_3_nome || "none")
      .replaceAll("{REVIEW_3_NOTA}", form.review_3_nota.toString())
      .replaceAll("{REVIEW_3_TEXTO}", form.review_3_texto || "none")
      .replaceAll("{LOGO_URL}", form.logo_url || "none")
      .replaceAll("{NOTAS}", form.notas_parceiro || "none")
      .replaceAll("{ADMIN_NAME}", currentUser.name);

    // Backwards compatibility for old photo placeholders
    for (let i = 1; i <= 5; i++) {
      const photoUrl = form.gallery && form.gallery[i-1] ? form.gallery[i-1].url : "none";
      filled = filled.replaceAll(`{FOTO_${i}}`, photoUrl);
    }

    // Dynamic Gallery Block
    let galleryBlock = "\n\n### GALERIA DE IMAGENS ADICIONAIS\nUtilize as imagens reais do cliente abaixo na interface (dentro de containers estilizados ou cards apropriados):\n";
    if (form.gallery && form.gallery.length > 0) {
      form.gallery.forEach((item, idx) => {
        galleryBlock += `- Imagem ${idx + 1}: ${item.url} (Local sugerido no layout: ${item.location})\n`;
      });
    } else {
      galleryBlock += "- Nenhuma imagem adicional fornecida. Use placeholders/ilustrações se necessário.\n";
    }

    // Visual Effect Block
    let effectBlock = "";
    if (form.effect_key) {
      const selectedEffect = effectTemplates.find(e => e.key === form.effect_key);
      if (selectedEffect) {
        effectBlock = `\n\n### EFEITO VISUAL OBRIGATÓRIO: ${selectedEffect.label}\n`;
        let intensityText = "";
        if (form.effect_intensity === "subtle") {
          intensityText = selectedEffect.body_subtle || "";
        } else if (form.effect_intensity === "full") {
          intensityText = selectedEffect.body_full || "";
        } else {
          intensityText = selectedEffect.body_standard || "";
        }
        effectBlock += `Aplique obrigatoriamente a seguinte implementação técnica CSS/JS para este efeito:\n${intensityText}\n`;
      }
    }
    
    const finalPrompt = filled + galleryBlock + effectBlock;
    setLovablePrompt(finalPrompt);
    
    // Update prompt cache/char count in the form indirectly?
    // We don't want to trigger form updates inside useEffect dependent on form, it will loop.
    // We only update the prompt_char_count when saving.
  }, [form, promptTemplates, effectTemplates, currentUser.name]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // ── Email Modal Helpers ───────────────────────────────────────────────────
  const replaceEmailTags = (text: string, p: Proposal): string => {
    if (!text) return "";
    return text
      .replaceAll("{NOME}", p.client_company || p.client_name || "[NOME]")
      .replaceAll("{CLIENT_COMPANY}", p.client_company || p.client_name || "[NOME]")
      .replaceAll("{CLIENT_OWNER}", p.client_owner || p.client_name || "[NOME]")
      .replaceAll("{TIPO}", p.business_type || "[TIPO]")
      .replaceAll("{CIDADE}", p.city || "[CIDADE]")
      .replaceAll("{ESTADO}", p.state || "[ESTADO]")
      .replaceAll("{EMAIL}", p.client_email || "[EMAIL]")
      .replaceAll("{SERVICO_1}", p.service_1 || "[SERVIÇO 1]")
      .replaceAll("{SERVICO_2}", p.service_2 || "[SERVIÇO 2]")
      .replaceAll("{SERVICO_3}", p.service_3 || "[SERVIÇO 3]")
      .replaceAll("{CTA}", p.cta_action || "[AÇÃO]")
      .replaceAll("{LINK_DEMO}", `${window.location.origin}/proposta?code=${p.access_code}`)
      .replaceAll("{ACCESS_CODE}", p.access_code)
      .replaceAll("{PROPOSAL_VALUE}", p.proposal_value?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00")
      .replaceAll("{ADMIN_NAME}", currentUser.name);
  };

  const fetchEmailTemplates = async () => {
    const { data } = await supabase
      .from("email_templates")
      .select("id, key, title, subject, body")
      .neq("key", "lovable_prompt")
      .order("key", { ascending: true });
    if (data) setEmailTemplates(data as EmailTemplate[]);
  };

  const fetchEmailLogs = async (proposalId: string) => {
    setEmailLogsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/email-logs?proposalId=${proposalId}`);
      const json = await res.json();
      setEmailLogs(json.logs || []);
    } catch {
      setEmailLogs([]);
    } finally {
      setEmailLogsLoading(false);
    }
  };

  const handleOpenEmailModal = async (p: Proposal) => {
    if (!p.client_email) {
      alert("Esta proposta não possui e-mail do cliente cadastrado.");
      return;
    }
    setEmailProposal(p);
    setEmailSendResult(null);
    setShowEmailHistory(false);
    setRemarketingEnabled(false);
    setRemarketingDays(7);
    setSelectedEmailTemplateKey("");
    setEmailSubject("");
    setEmailBody("");
    await Promise.all([fetchEmailTemplates(), fetchEmailLogs(p.id)]);
    setShowEmailModal(true);
  };

  const handleEmailTemplateChange = (key: string) => {
    setSelectedEmailTemplateKey(key);
    if (!emailProposal || !key) { setEmailSubject(""); setEmailBody(""); return; }
    const tmpl = emailTemplates.find(t => t.key === key);
    if (!tmpl) return;
    setEmailSubject(replaceEmailTags(tmpl.subject || "", emailProposal));
    setEmailBody(replaceEmailTags(tmpl.body, emailProposal));
  };

  const handleSendEmail = async () => {
    if (!emailProposal || !emailSubject || !emailBody || !selectedEmailTemplateKey) return;
    setEmailSending(true);
    setEmailSendResult(null);
    try {
      const tmpl = emailTemplates.find(t => t.key === selectedEmailTemplateKey);
      const res = await fetch(`${API_BASE}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailProposal.client_email,
          subject: emailSubject,
          emailBody,
          proposalId: emailProposal.id,
          templateKey: selectedEmailTemplateKey,
          templateTitle: tmpl?.title || selectedEmailTemplateKey,
          sentBy: currentUser.name,
          remarketingEnabled,
          remarketingIntervalDays: remarketingDays,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEmailSendResult({ success: true });
        await fetchEmailLogs(emailProposal.id);
        fetchProposals();
      } else {
        setEmailSendResult({ error: json.error || "Erro desconhecido" });
      }
    } catch (e: unknown) {
      setEmailSendResult({ error: e instanceof Error ? e.message : "Falha de conexão" });
    } finally {
      setEmailSending(false);
    }
  };

  // Helper: get last email log for a proposal
  const getLastLogForProposal = (proposalId: string) => {
    // We track this via fetched proposals; use a simple memo approach
    return null; // logs only loaded per-modal; badge uses DB queries on open
  };
  void getLastLogForProposal;

  const handlePreview = (p: Proposal) => window.open(`/proposta?code=${p.access_code}`, "_blank");

  const handleEdit = (p: Proposal) => {
    setEditingId(p.id);
    setForm({
      client_name: p.client_name,
      access_code: p.access_code,
      html_content: (() => {
        if (!p.html_content) return "";
        try {
          return decodeURIComponent(atob(p.html_content));
        } catch {
          return p.html_content;
        }
      })(),
      expires_days: 8, // Non-critical for edit
      client_email: p.client_email || "",
      client_company: p.client_company || "",
      client_owner: p.client_owner || "",
      client_website: p.client_website || "",
      proposal_value: p.proposal_value?.toString() || "",
      business_type: p.business_type || "",
      city: p.city || "",
      state: p.state || "",
      service_1: p.service_1 || "",
      service_2: p.service_2 || "",
      service_3: p.service_3 || "",
      primary_color: p.primary_color || "#00FF9D",
      secondary_color: p.secondary_color || "#050505",
      cta_action: p.cta_action || "Solicitar Orçamento",
      reviews_summary: p.reviews_summary || "",
      keywords: p.keywords || "",
      phone: p.phone || "",
      address: p.address || "",
      instagram: p.instagram || "",
      tagline: p.tagline || "",
      visual_style: p.visual_style || "Clean & Minimal",
      tone_of_voice: p.tone_of_voice || "Professional & Authoritative",
      diferencial_1: p.diferencial_1 || "",
      diferencial_2: p.diferencial_2 || "",
      diferencial_3: p.diferencial_3 || "",
      anos_negocio: p.anos_negocio?.toString() || "",
      num_clientes: p.num_clientes?.toString() || "",
      review_1_nome: p.review_1_nome || "",
      review_1_nota: p.review_1_nota || 5,
      review_1_texto: p.review_1_texto || "",
      review_2_nome: p.review_2_nome || "",
      review_2_nota: p.review_2_nota || 5,
      review_2_texto: p.review_2_texto || "",
      review_3_nome: p.review_3_nome || "",
      review_3_nota: p.review_3_nota || 5,
      review_3_texto: p.review_3_texto || "",
      logo_url: p.logo_url || "",
      foto_1: p.foto_1 || "",
      foto_2: p.foto_2 || "",
      foto_3: p.foto_3 || "",
      foto_4: p.foto_4 || "",
      foto_5: p.foto_5 || "",
      notas_parceiro: p.notas_parceiro || "",
      preset_key: p.preset_key || "other",
      gallery: p.gallery || [],
      effect_key: p.effect_key || null,
      effect_intensity: p.effect_intensity || "standard",
      prompt_cache: p.prompt_cache || "",
      prompt_char_count: p.prompt_char_count || 0,
    });
    setShowModal(true);
    setCreateError(null);
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

  // ── Lead Drawer Helpers ───────────────────────────────────────────────────
  const handleOpenLeadDrawer = async () => {
    setShowLeadDrawer(true);
    setDrawerSearch("");
    if (leadLists.length > 0) {
      const firstListId = leadLists[0].id;
      setLeadDrawerTab(firstListId);
      await fetchLeadsForList(firstListId);
      // Mark all lists as viewed in DB
      const { data: userRow } = await supabase.from("admin_users").select("id").eq("name", currentUser.name).maybeSingle();
      if (userRow?.id) {
        await supabase.from("list_assignments").update({ viewed_at: new Date().toISOString() }).eq("user_id", userRow.id).is("viewed_at", null);
        setNewListBadge(0);
      }
    }
  };

  const handleSelectLead = (lead: LeadEntry) => {
    setSelectedLeadId(lead.id);
    // Map lead category to preset_key
    const catLower = (lead.category ?? "").toLowerCase();
    let preset_key = "other";
    if (catLower.includes("dent") || catLower.includes("health") || catLower.includes("medical") || catLower.includes("doctor")) preset_key = "healthcare";
    else if (catLower.includes("contract") || catLower.includes("plumb") || catLower.includes("electr") || catLower.includes("hvac") || catLower.includes("roofing")) preset_key = "contractor";
    else if (catLower.includes("salon") || catLower.includes("hair") || catLower.includes("beauty") || catLower.includes("spa") || catLower.includes("nail")) preset_key = "personal_care";
    else if (catLower.includes("lawyer") || catLower.includes("attorney") || catLower.includes("account") || catLower.includes("financial") || catLower.includes("consult")) preset_key = "professional";
    else if (catLower.includes("restaurant") || catLower.includes("food") || catLower.includes("cafe") || catLower.includes("pizza") || catLower.includes("bar")) preset_key = "food_beverage";

    const ratingValue = lead.google_rating ? Math.min(5, Math.round(lead.google_rating)) : 5;

    setForm(prev => ({
      ...prev,
      client_company: lead.business_name ?? "",
      client_name: lead.business_name ?? "",
      phone: lead.phone ?? "",
      client_email: lead.email ?? "",
      client_website: lead.website ?? "",
      address: lead.address ?? "",
      city: lead.city ?? "",
      state: lead.state ?? "",
      business_type: PRESET_KEY_MAP[preset_key] ?? "Other",
      preset_key,
      review_1_nota: ratingValue,
    }));
    setShowLeadDrawer(false);
    // Open the new proposal modal
    setEditingId(null);
    setCreateError(null);
    setShowModal(true);
  };

  const handleLeadPotencial = async (leadId: string, potencial: "bom" | "medio" | "ruim") => {
    await supabase.from("leads").update({ potencial }).eq("id", leadId);
    setDrawerLeads(prev => prev.map(l => l.id === leadId ? { ...l, potencial } : l));
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
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(p => 
      p.client_email?.toLowerCase().includes(term) || 
      p.access_code?.toLowerCase().includes(term) ||
      p.client_name?.toLowerCase().includes(term)
    );
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
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                type="text"
                placeholder="Buscar por e-mail, código ou nome..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-secondary/30 border-border text-xs focus:border-primary/50"
              />
            </div>
            
            {isMaster && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingTemplates(promptTemplates);
                  setDirtyTemplates({});
                  setActiveConfigTab("healthcare");
                  setShowPromptConfig(true);
                }}
                className="h-9 border-border bg-card/40 hover:bg-secondary/60 text-xs"
                title="Configurar Prompt Base"
              >
                <Settings2 className="w-4 h-4 mr-1 sm:mr-0 lg:mr-1" />
                <span className="hidden lg:inline">Configurar Prompt</span>
              </Button>
            )}

            {!isMaster && leadLists.length > 0 && (
              <Button
                variant="outline"
                onClick={handleOpenLeadDrawer}
                className="relative h-9 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold gap-2"
              >
                <Database className="w-4 h-4" />
                <span className="hidden sm:inline">Selecionar Lead</span>
                {newListBadge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-green-500 text-black text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {newListBadge}
                  </span>
                )}
              </Button>
            )}

            <Button
            onClick={() => { 
              setEditingId(null);
              setSelectedLeadId(null);
              setForm({
                client_name: "", access_code: generateCode(), html_content: "",
                expires_days: 8, client_email: "", client_company: "",
                client_owner: "", client_website: "", proposal_value: "",
                business_type: "Other", city: "", state: "",
                service_1: "", service_2: "", service_3: "",
                primary_color: "#00FF9D", secondary_color: "#050505",
                cta_action: "Solicitar Orçamento", reviews_summary: "",
                keywords: "",
                phone: "", address: "", instagram: "", tagline: "",
                visual_style: "Clean & Minimal", tone_of_voice: "Professional & Authoritative",
                diferencial_1: "", diferencial_2: "", diferencial_3: "",
                anos_negocio: "", num_clientes: "",
                review_1_nome: "", review_1_nota: 5, review_1_texto: "",
                review_2_nome: "", review_2_nota: 5, review_2_texto: "",
                review_3_nome: "", review_3_nota: 5, review_3_texto: "",
                logo_url: "", foto_1: "", foto_2: "", foto_3: "", foto_4: "", foto_5: "",
                notas_parceiro: "", preset_key: "other",
                gallery: [],
                effect_key: null,
                effect_intensity: "standard",
                prompt_cache: "",
                prompt_char_count: 0,
              });
              setShowModal(true); 
              setCreateError(null); 
            }}
            className="bg-[#00FF9D] text-black font-bold hover:bg-[#00E58C] shadow-[0_0_15px_rgba(0,255,157,0.3)] gap-2"
          >
            <Plus className="w-4 h-4" /> Nova Proposta
          </Button>
          </div>
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
                          <button
                            onClick={() => handleOpenEmailModal(p)}
                            title={p.client_email ? `Enviar email para ${p.client_email}` : "Sem email cadastrado"}
                            className={`p-1.5 rounded-lg transition-colors ${
                              p.client_email
                                ? "hover:bg-blue-500/10 text-blue-400 hover:text-blue-300"
                                : "text-muted-foreground/30 cursor-not-allowed"
                            }`}
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEdit(p)} title="Editar" className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
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

      {/* ── Email Send Modal ─────────────────────────────────────────────── */}
      {showEmailModal && emailProposal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) { setShowEmailModal(false); } }}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Send className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-foreground">Enviar E-mail</h2>
                  <p className="text-xs text-muted-foreground">
                    Para: <span className="text-blue-400 font-semibold">{emailProposal.client_email}</span>
                    {emailProposal.client_company && (
                      <span className="ml-2 text-foreground/60">— {emailProposal.client_company}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEmailHistory(!showEmailHistory)}
                  title="Histórico de envios"
                  className={`p-2 rounded-lg transition-colors ${
                    showEmailHistory
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <History className="w-5 h-5" />
                  {emailLogs.length > 0 && (
                    <span className="sr-only">{emailLogs.length} envios</span>
                  )}
                </button>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="p-2 rounded-lg hover:bg-secondary/60 text-muted-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content scrollable */}
            <div className="flex-1 overflow-y-auto">
              {/* Email History Panel */}
              {showEmailHistory && (
                <div className="p-4 border-b border-border/50 bg-secondary/10">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <History className="w-3.5 h-3.5" /> Histórico de Envios
                  </p>
                  {emailLogsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="animate-spin text-primary w-5 h-5" />
                    </div>
                  ) : emailLogs.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum email enviado ainda para esta proposta.</p>
                  ) : (
                    <div className="space-y-2">
                      {emailLogs.map(log => {
                        const sentAgo = Math.floor((Date.now() - new Date(log.sent_at).getTime()) / 3600000);
                        const sentAgoText = sentAgo < 24
                          ? `${sentAgo}h atrás`
                          : `${Math.floor(sentAgo / 24)}d atrás`;
                        return (
                          <div key={log.id} className="flex items-start gap-3 p-3 bg-card/40 rounded-xl border border-border/40">
                            <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${
                              log.replied_at ? "bg-green-500/10" : "bg-blue-500/10"
                            }`}>
                              {log.replied_at
                                ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                                : <Mail className="w-3.5 h-3.5 text-blue-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{log.template_title}</p>
                              <p className="text-xs text-muted-foreground truncate">{log.subject}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] text-muted-foreground">{sentAgoText}</span>
                                {log.replied_at && (
                                  <span className="text-[10px] text-green-400 font-semibold">✓ Respondido</span>
                                )}
                                {log.remarketing_enabled && !log.replied_at && log.next_followup_at && (
                                  <span className="text-[10px] text-yellow-400 flex items-center gap-1">
                                    <RefreshCw className="w-2.5 h-2.5" />
                                    Follow-up em {Math.ceil((new Date(log.next_followup_at).getTime() - Date.now()) / 86400000)}d
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">{log.sent_by}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Compose Form */}
              <div className="p-6 space-y-5">
                {/* Template Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Script de E-mail</label>
                  <select
                    value={selectedEmailTemplateKey}
                    onChange={e => handleEmailTemplateChange(e.target.value)}
                    className="w-full h-11 bg-secondary/50 border border-border rounded-xl px-4 text-sm text-foreground outline-none focus:border-blue-500/50 transition-all font-medium"
                  >
                    <option value="">Selecione um script...</option>
                    {emailTemplates.map(t => {
                      const log = emailLogs.find(l => l.template_key === t.key);
                      const sentAgo = log
                        ? Math.floor((Date.now() - new Date(log.sent_at).getTime()) / 3600000)
                        : null;
                      const onCooldown = sentAgo !== null && sentAgo < 24;
                      return (
                        <option key={t.id} value={t.key} disabled={onCooldown}>
                          {t.title}{onCooldown ? ` (⏳ cooldown — enviado há ${sentAgo}h)` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedEmailTemplateKey && (
                  <>
                    {/* Cooldown Warning */}
                    {(() => {
                      const log = emailLogs.find(l => l.template_key === selectedEmailTemplateKey);
                      const sentAgo = log ? Math.floor((Date.now() - new Date(log.sent_at).getTime()) / 3600000) : null;
                      if (sentAgo !== null && sentAgo < 24) {
                        return (
                          <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-yellow-300">
                              Este script foi enviado há <strong>{sentAgo}h</strong>. Aguarde as 24h de cooldown para reenviar o mesmo script.
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Subject */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assunto</label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={e => setEmailSubject(e.target.value)}
                        placeholder="Assunto do email..."
                        className="w-full h-10 bg-secondary/30 border border-border rounded-xl px-4 text-sm text-foreground outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>

                    {/* Body */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Corpo do E-mail</label>
                        <span className="text-[10px] text-muted-foreground">Editável antes de enviar</span>
                      </div>
                      <textarea
                        value={emailBody}
                        onChange={e => setEmailBody(e.target.value)}
                        rows={10}
                        className="w-full bg-card/60 rounded-xl border border-border p-4 text-sm leading-relaxed text-foreground outline-none focus:border-blue-500/50 resize-none transition-all"
                        placeholder="Corpo do email aparecerá aqui após selecionar um script..."
                      />
                    </div>

                    {/* Remarketing Toggle */}
                    <div className="p-4 rounded-xl bg-secondary/20 border border-border/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-semibold text-foreground">Remarketing Automático</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRemarketingEnabled(!remarketingEnabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            remarketingEnabled ? "bg-blue-500" : "bg-secondary"
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            remarketingEnabled ? "translate-x-6" : "translate-x-1"
                          }`} />
                        </button>
                      </div>
                      {remarketingEnabled && (
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-muted-foreground">Reenviar follow-up a cada</p>
                          <select
                            value={remarketingDays}
                            onChange={e => setRemarketingDays(Number(e.target.value))}
                            className="bg-secondary/60 border border-border rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground outline-none"
                          >
                            {[2, 3, 5, 7, 14, 21, 30].map(d => (
                              <option key={d} value={d}>{d} dias</option>
                            ))}
                          </select>
                          <p className="text-xs text-muted-foreground">se não houver resposta</p>
                        </div>
                      )}
                      {remarketingEnabled && (
                        <p className="text-[11px] text-muted-foreground/60">
                          O sistema enviará automaticamente o próximo script da sequência caso o cliente não responda.
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Send Result */}
                {emailSendResult?.success && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-300">Email enviado com sucesso!</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Enviado para {emailProposal.client_email}</p>
                    </div>
                  </div>
                )}
                {emailSendResult?.error && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                    <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{emailSendResult.error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                <span>De: lucas@acqent.solutions</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={emailSending || !selectedEmailTemplateKey || !emailSubject || !emailBody}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {emailSending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Enviar E-mail</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-heading text-xl font-bold text-foreground">
                {editingId ? "Editar Proposta" : "Nova Proposta"}
              </h2>
              <button 
                onClick={() => { setShowModal(false); setEditingId(null); }} 
                className="p-2 rounded-lg hover:bg-secondary/60 text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
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
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Telefone</label>
                    <Input type="text" placeholder="+1 (555) 000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Instagram</label>
                    <Input type="text" placeholder="@businessname" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Endereço Completo</label>
                    <Input type="text" placeholder="123 Main St, Miami, FL 33101" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
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
                    <select
                      value={form.preset_key}
                      onChange={e => {
                        const val = e.target.value;
                        const labels: Record<string, string> = {
                          healthcare: "Healthcare (Dentist, Doctor, Therapist, Clinic)",
                          contractor: "Contractor & Home Services (Builder, Plumber, Electrician, Roofer)",
                          personal_care: "Personal Care (Barbershop, Salon, Spa, Tattoo)",
                          professional: "Professional Services (Law, Accounting, Consulting, Finance)",
                          food_beverage: "Food & Beverage (Restaurant, Café, Bakery, Food Truck)",
                          other: "Other"
                        };
                        setForm(f => ({ ...f, preset_key: val, business_type: labels[val] }));
                      }}
                      className="w-full h-10 bg-secondary/30 border border-border rounded-md px-3 text-sm text-foreground outline-none focus:border-primary/50"
                    >
                      <option value="healthcare">Healthcare (Dentist, Doctor, Therapist, Clinic)</option>
                      <option value="contractor">Contractor & Home Services (Builder, Plumber, Electrician, Roofer)</option>
                      <option value="personal_care">Personal Care (Barbershop, Salon, Spa, Tattoo)</option>
                      <option value="professional">Professional Services (Law, Accounting, Consulting, Finance)</option>
                      <option value="food_beverage">Food & Beverage (Restaurant, Café, Bakery, Food Truck)</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Tagline / Slogan</label>
                    <Input type="text" placeholder="Ex: Excellence in every cut" value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Estilo Visual</label>
                    <select
                      value={form.visual_style}
                      onChange={e => setForm(f => ({ ...f, visual_style: e.target.value }))}
                      className="w-full h-10 bg-secondary/30 border border-border rounded-md px-3 text-sm text-foreground outline-none focus:border-primary/50"
                    >
                      <option value="Clean & Minimal">Clean & Minimal</option>
                      <option value="Bold & Dark">Bold & Dark</option>
                      <option value="Warm & Friendly">Warm & Friendly</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Tom de Voz</label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { id: "Professional & Authoritative", label: "🎯 Professional" },
                        { id: "Friendly & Approachable", label: "😊 Friendly" },
                        { id: "Bold & Direct", label: "⚡ Bold" },
                        { id: "Calm & Reassuring", label: "🌿 Calm" }
                      ].map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, tone_of_voice: t.id }))}
                          className={`flex-1 min-w-[120px] px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                            form.tone_of_voice === t.id
                              ? "bg-primary text-black border-primary shadow-[0_0_10px_rgba(0,255,157,0.2)]"
                              : "bg-transparent border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                      Cor Primária
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={form.primary_color} 
                        onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                        className="w-10 h-10 rounded-lg bg-secondary/30 border border-border cursor-pointer overflow-hidden p-0"
                      />
                      <Input 
                        type="text" 
                        placeholder="#00FF9D" 
                        value={form.primary_color} 
                        onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} 
                        className="h-10 bg-secondary/30 border-border font-mono flex-1 text-xs" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                      Cor Secundária
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={form.secondary_color} 
                        onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))}
                        className="w-10 h-10 rounded-lg bg-secondary/30 border border-border cursor-pointer overflow-hidden p-0"
                      />
                      <Input 
                        type="text" 
                        placeholder="#050505" 
                        value={form.secondary_color} 
                        onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} 
                        className="h-10 bg-secondary/30 border-border font-mono flex-1 text-xs" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Chamada Sugerida (CTA)</label>
                    <Input type="text" placeholder="Ex: Agendar Consulta, Solicitar Orçamento" value={form.cta_action} onChange={e => setForm(f => ({ ...f, cta_action: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Diferenciais do Negócio</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input placeholder="Ex: Licensed & Insured" value={form.diferencial_1} onChange={e => setForm(f => ({ ...f, diferencial_1: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                      <Input placeholder="Ex: 10+ Years Experience" value={form.diferencial_2} onChange={e => setForm(f => ({ ...f, diferencial_2: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                      <Input placeholder="Ex: Free Estimates" value={form.diferencial_3} onChange={e => setForm(f => ({ ...f, diferencial_3: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Anos de Negócio</label>
                    <Input type="number" placeholder="10" value={form.anos_negocio} onChange={e => setForm(f => ({ ...f, anos_negocio: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Clientes Atendidos</label>
                    <Input type="number" placeholder="500" value={form.num_clientes} onChange={e => setForm(f => ({ ...f, num_clientes: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Principais Serviços (Separados por vírgula)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="Serviço 1" value={form.service_1} onChange={e => setForm(f => ({ ...f, service_1: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                      <Input placeholder="Serviço 2" value={form.service_2} onChange={e => setForm(f => ({ ...f, service_2: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                      <Input placeholder="Serviço 3" value={form.service_3} onChange={e => setForm(f => ({ ...f, service_3: e.target.value }))} className="h-10 bg-secondary/30 border-border" />
                    </div>
                  </div>
                  
                  <div className="space-y-6 sm:col-span-2 pt-4 border-t border-border/30">
                    <label className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">Depoimentos (Reviews Estruturados)</label>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-4 rounded-xl bg-secondary/15 border border-border/50 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Avaliador {i}</label>
                            <Input
                              placeholder="Nome do cliente"
                              value={(form as any)[`review_${i}_nome`]}
                              onChange={e => setForm(f => ({ ...f, [`review_${i}_nome`]: e.target.value }))}
                              className="h-9 bg-secondary/30 border-border text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Nota</label>
                            <select
                              value={(form as any)[`review_${i}_nota`]}
                              onChange={e => setForm(f => ({ ...f, [`review_${i}_nota`]: parseInt(e.target.value) }))}
                              className="w-full h-9 bg-secondary/30 border border-border rounded-md px-2 text-xs text-foreground outline-none focus:border-primary/50"
                            >
                              <option value="5">5 Estrelas</option>
                              <option value="4">4 Estrelas</option>
                              <option value="3">3 Estrelas</option>
                              <option value="2">2 Estrelas</option>
                              <option value="1">1 Estrela</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Texto do Review</label>
                            <span className={`text-[9px] ${((form as any)[`review_${i}_texto`]?.length || 0) > 150 ? "text-destructive" : "text-muted-foreground"}`}>
                              {((form as any)[`review_${i}_texto`]?.length || 0)}/150
                            </span>
                          </div>
                          <textarea
                            placeholder="Descreva a experiência do cliente..."
                            maxLength={150}
                            value={(form as any)[`review_${i}_texto`]}
                            onChange={e => setForm(f => ({ ...f, [`review_${i}_texto`]: e.target.value }))}
                            className="w-full bg-secondary/30 border border-border rounded-lg p-2.5 text-xs text-foreground outline-none focus:border-primary/50 resize-none h-16"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 📸 Images Section */}
              <div className="space-y-4 pt-4 border-t border-border/30">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Camera className="w-4 h-4" /> 3. Imagens do Negócio
                </h3>
                
                <div className="space-y-4">
                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex justify-between">
                      Logo da Empresa (PNG/SVG/JPG, max 2MB)
                      {form.logo_url && (
                        <button type="button" onClick={() => setForm(f => ({ ...f, logo_url: "" }))} className="text-destructive hover:underline text-[10px]">Remover Logo</button>
                      )}
                    </label>
                    <div className="flex items-center gap-4 p-4 bg-secondary/15 border border-dashed border-border rounded-xl">
                      {form.logo_url ? (
                        <div className="relative group w-20 h-20 bg-white rounded-lg overflow-hidden border border-border">
                          <img src={form.logo_url} alt="Logo preview" className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <ImageIcon className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      ) : (
                        <label className="w-20 h-20 bg-secondary/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/50 transition-colors border border-border">
                          {uploadingLogo ? (
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          ) : (
                            <>
                              <Upload className="w-6 h-6 text-muted-foreground" />
                              <span className="text-[9px] text-muted-foreground mt-1">Upload</span>
                            </>
                          )}
                          <input type="file" accept="image/png,image/svg+xml,image/jpeg" onChange={handleLogoUpload} className="hidden" />
                        </label>
                      )}
                      <div className="flex-1">
                        <p className="text-xs text-foreground font-medium">{form.logo_url ? "Logo carregado com sucesso" : "Arraste ou clique para enviar"}</p>
                        <p className="text-[10px] text-muted-foreground">O logo será usado no cabeçalho e rodapé da landing page.</p>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Gallery Upload Grid */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Fotos do Negócio (Galeria Dinâmica - Max 10 fotos)</label>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          if (form.gallery.length >= 10) {
                            alert("Máximo de 10 fotos atingido.");
                            return;
                          }
                          setForm(f => ({ ...f, gallery: [...f.gallery, { url: "", location: "Galeria" }] }));
                        }}
                        className="h-7 text-[10px] border-primary/30 hover:bg-primary/10 text-primary"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Adicionar Foto
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(form.gallery || []).map((img, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-secondary/15 border border-border rounded-xl relative group">
                          <div className="w-16 h-16 bg-secondary/30 rounded-lg overflow-hidden border border-border relative flex-shrink-0 flex items-center justify-center">
                            {img.url ? (
                              <img src={img.url} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                            )}
                            
                            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-[9px]">
                              {uploadingPhotos ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mb-0.5" />
                                  Alterar
                                </>
                              )}
                              <input 
                                type="file" 
                                accept="image/jpeg,image/png" 
                                onChange={async (e) => {
                                  if (!e.target.files || e.target.files.length === 0) return;
                                  setUploadingPhotos(true);
                                  try {
                                    const file = e.target.files[0];
                                    const fileExt = file.name.split('.').pop();
                                    const filePath = `${Math.random()}.${fileExt}`;
                                    
                                    const { data, error } = await supabase.storage
                                      .from('proposal-media')
                                      .upload(filePath, file);

                                    if (error) throw error;

                                    const { data: { publicUrl } } = supabase.storage
                                      .from('proposal-media')
                                      .getPublicUrl(filePath);

                                    setForm(f => {
                                      const newGallery = [...f.gallery];
                                      newGallery[idx] = { ...newGallery[idx], url: publicUrl };
                                      return { ...f, gallery: newGallery };
                                    });
                                  } catch (err: any) {
                                    alert(`Erro no upload: ${err.message}`);
                                  } finally {
                                    setUploadingPhotos(false);
                                  }
                                }} 
                                className="hidden" 
                              />
                            </label>
                          </div>

                          <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Onde a imagem deve ficar?</label>
                            <input 
                              type="text" 
                              placeholder="Ex: Fundo do cabeçalho, Produto, Rodapé..." 
                              value={img.location}
                              onChange={e => {
                                const val = e.target.value;
                                setForm(f => {
                                  const newGallery = [...f.gallery];
                                  newGallery[idx] = { ...newGallery[idx], location: val };
                                  return { ...f, gallery: newGallery };
                                });
                              }}
                              className="w-full h-8 bg-secondary/30 border border-border rounded-md px-2 text-xs text-foreground focus:ring-1 focus:ring-primary/50 outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setForm(f => ({ ...f, gallery: f.gallery.filter((_, i) => i !== idx) }));
                            }}
                            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {form.gallery.length === 0 && (
                      <div className="text-center py-6 border border-dashed border-border/50 rounded-xl text-muted-foreground text-xs flex flex-col items-center gap-2 bg-secondary/5">
                        <ImageIcon className="w-5 h-5 opacity-50" />
                        <span>Nenhuma imagem adicionada ainda.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ✨ Visual Effects Section */}
              <div className="space-y-4 pt-4 border-t border-border/30">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Palette className="w-4 h-4" /> 4. Efeitos Visuais
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Estilo de Efeito</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, effect_key: "" }))}
                        className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                          form.effect_key === "" 
                            ? "bg-primary/10 border-primary text-primary" 
                            : "bg-secondary/15 border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        <span className="text-xs font-bold">Sem Efeito</span>
                        <span className="text-[9px] opacity-70">Design padrão da página</span>
                      </button>

                      {(() => {
                        const filtered = effectTemplates.filter(e => {
                          if (e.key === "starfield") return true; // Generic
                          if (!e.compatible_presets) return true;
                          if (Array.isArray(e.compatible_presets)) {
                            if (e.compatible_presets.length === 0) return true;
                            return e.compatible_presets.includes(form.preset_key);
                          }
                          if (typeof e.compatible_presets === "string") {
                            try {
                              const parsed = JSON.parse(e.compatible_presets);
                              if (Array.isArray(parsed)) {
                                if (parsed.length === 0) return true;
                                return parsed.includes(form.preset_key);
                              }
                            } catch (err) {}
                          }
                          return true;
                        });

                        // Fallback selection logic
                        if (form.effect_key && form.effect_key !== "" && !filtered.some(e => e.key === form.effect_key)) {
                          setTimeout(() => setForm(f => ({ ...f, effect_key: filtered.some(e => e.key === "starfield") ? "starfield" : "" })), 0);
                        }

                        return filtered.map(effect => (
                          <button
                            key={effect.id}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, effect_key: effect.key }))}
                            className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all relative group ${
                              form.effect_key === effect.key 
                                ? "bg-primary/10 border-primary text-primary" 
                                : "bg-secondary/15 border-border text-muted-foreground hover:border-primary/30"
                            }`}
                          >
                            <span className="text-xs font-bold">{effect.label}</span>
                            <span className="text-[9px] opacity-70 truncate">{effect.description || "Efeito visual dinâmico"}</span>
                          </button>
                        ));
                      })()}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Intensidade do Efeito</label>
                    <div className="flex flex-col gap-2 bg-secondary/15 border border-border p-3 rounded-xl">
                      {[
                        { value: "subtle", label: "🟢 Sutil", desc: "Toque minimalista" },
                        { value: "standard", label: "🟡 Padrão", desc: "Equilíbrio ideal" },
                        { value: "full", label: "🔴 Intenso", desc: "Imersão total" }
                      ].map(opt => (
                        <label 
                          key={opt.value} 
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                            form.effect_intensity === opt.value 
                              ? "bg-secondary/30 text-foreground" 
                              : "text-muted-foreground hover:bg-secondary/10"
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="intensity" 
                            value={opt.value} 
                            checked={form.effect_intensity === opt.value}
                            onChange={() => setForm(f => ({ ...f, effect_intensity: opt.value as any }))}
                            className="accent-primary"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">{opt.label}</span>
                            <span className="text-[9px] opacity-70">{opt.desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {(() => {
                  const selectedEffect = effectTemplates.find(e => e.key === form.effect_key);
                  if (!selectedEffect) return null;

                  const conflicts = selectedEffect.conflicts_with || [];
                  if (conflicts.length === 0) return null;

                  return (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-red-300">
                        <strong>Atenção:</strong> Este efeito entra em conflito com: {conflicts.join(", ")}.
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Proposal & Technical */}
              <div className="space-y-4 pt-4 border-t border-border/30">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4" /> 4. Detalhes Técnicos & Valor
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
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Notas do Parceiro (Instruções Especiais)</label>
                    <textarea
                      placeholder="Ex: cliente quer tema escuro, possui fonte personalizada..."
                      value={form.notas_parceiro}
                      onChange={e => setForm(f => ({ ...f, notas_parceiro: e.target.value }))}
                      className="w-full bg-secondary/30 border border-border rounded-lg p-3 text-sm text-foreground outline-none focus:border-primary/50 transition-colors h-24 resize-none"
                    />
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
                  <div className="space-y-4 sm:col-span-2 pt-4 border-t border-border/30">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> 4. Prompt LandingPage
                      </h3>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="ghost"
                        onClick={async () => {
                          navigator.clipboard.writeText(lovablePrompt);
                          setCopiedPrompt(true);
                          setTimeout(() => setCopiedPrompt(false), 2000);
                          
                          if (editingId) {
                            await supabase
                              .from("proposals")
                              .update({
                                prompt_cache: lovablePrompt,
                                prompt_char_count: lovablePrompt.length
                              })
                              .eq("id", editingId);
                          }
                        }}
                        className="h-7 text-[10px] text-primary hover:bg-primary/10 flex items-center gap-1"
                      >
                        {copiedPrompt ? (
                          <>
                            <Check className="w-3 h-3 text-green-400" />
                            <span className="text-green-400">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar Prompt</span>
                          </>
                        )}
                      </Button>
                    </div>
                    <textarea
                      readOnly
                      value={lovablePrompt}
                      className="w-full bg-primary/5 border border-primary/20 rounded-lg p-3 text-[10px] text-primary font-mono resize-none h-32 leading-relaxed"
                    />
                    <div className="flex justify-between items-center mt-1 text-[10px]">
                      <p className="text-muted-foreground italic">Copie este prompt detalhado para gerar sua Landing Page no Lovable.</p>
                      {(() => {
                        const chars = lovablePrompt.length;
                        const tokens = Math.ceil(chars / 3.8);
                        let colorClass = "text-green-400";
                        if (chars > 12000) colorClass = "text-red-400";
                        else if (chars > 6000) colorClass = "text-yellow-400 font-semibold";
                        
                        return (
                          <span className={`${colorClass} font-mono`}>
                            {chars} chars · ~{tokens} tokens
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="space-y-2 sm:col-span-2 pt-4 border-t border-border/30">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">HTML ou Link da Proposta *</label>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setShowPreview(!showPreview)}
                        className={`h-7 text-[10px] ${showPreview ? "text-destructive hover:bg-destructive/10" : "text-primary hover:bg-primary/10"}`}
                      >
                        {showPreview ? "Fechar Visualização" : "Visualizar Proposta"}
                      </Button>
                    </div>
                    <textarea
                      placeholder={"Cole aqui o link (ex: https://...) ou o código HTML completo da proposta."}
                      value={form.html_content} onChange={e => setForm(f => ({ ...f, html_content: e.target.value }))}
                      required rows={12} className="w-full bg-secondary/30 border border-border rounded-lg p-3 text-xs text-foreground font-mono resize-y outline-none focus:border-primary/50"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Dica: Se usar o Lovable, pode colar apenas o link do site publicado.</p>
                    
                    {showPreview && (
                      <div className="mt-4 border border-border rounded-xl overflow-hidden bg-white h-[600px]">
                        {(() => {
                          const isUrl = /^(https?:\/\/)/i.test(form.html_content.trim());
                          return (
                            <iframe 
                              src={isUrl ? form.html_content.trim() : undefined}
                              srcDoc={isUrl ? undefined : form.html_content}
                              title="Preview"
                              className="w-full h-full border-0"
                              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                            />
                          );
                        })()}
                      </div>
                    )}
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
      {/* Modal Prompt Master Config */}
      {showPromptConfig && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/10">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  Templates de Inteligência Artificial
                </h2>
                <p className="text-xs text-muted-foreground mt-1">Configure as instruções para cada segmento de negócio.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowPromptConfig(false)} className="rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex flex-col h-full overflow-hidden">
              {/* Tab Strip */}
              <div className="flex overflow-x-auto gap-1 p-2 bg-secondary/5 border-b border-border no-scrollbar">
                {[
                  { id: "healthcare", label: "Healthcare" },
                  { id: "contractor", label: "Contractor" },
                  { id: "personal_care", label: "Personal" },
                  { id: "professional", label: "Professional" },
                  { id: "food_beverage", label: "Food & Bev" },
                  { id: "other", label: "Other (Generic)" },
                  { id: "effects", label: "✦ Efeitos Visuais" }
                ].map(tab => {
                  const fullKey = `prompt_${tab.id}`;
                  const isDirty = tab.id === "effects" ? false : dirtyTemplates[fullKey];
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        if (tab.id !== "effects" && Object.values(dirtyTemplates).some(v => v)) {
                          if (activeConfigTab !== tab.id && !confirm("Você tem alterações não salvas nesta aba. Deseja mudar assim mesmo?")) {
                            return;
                          }
                        }
                        setActiveConfigTab(tab.id);
                      }}
                      className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                        activeConfigTab === tab.id
                          ? "bg-primary text-black shadow-[0_0_15px_rgba(0,255,157,0.25)]"
                          : "bg-transparent text-muted-foreground hover:bg-white/5"
                      }`}
                    >
                      {tab.label}
                      {isDirty && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" title="Alterações não salvas" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
                {activeConfigTab === "effects" ? (
                  <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
                    {/* Left column: Effect list */}
                    <div className="w-64 bg-secondary/10 border border-border rounded-xl p-3 flex flex-col gap-1 overflow-y-auto">
                      <label className="text-[10px] font-bold text-primary uppercase tracking-wider px-2 mb-2">Efeitos Disponíveis</label>
                      {effectTemplates.map(e => (
                        <button
                          key={e.id}
                          onClick={() => setActiveEffectTab(e.key)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex flex-col gap-0.5 ${
                            activeEffectTab === e.key 
                              ? "bg-primary/20 border border-primary/30 text-primary" 
                              : "hover:bg-white/5 text-muted-foreground"
                          }`}
                        >
                          <span>{e.label}</span>
                          <span className="text-[9px] opacity-60 truncate">{e.description || "Sem descrição"}</span>
                        </button>
                      ))}
                    </div>

                    {/* Right column: Intensity editors */}
                    <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                      {(() => {
                        const effect = effectTemplates.find(e => e.key === activeEffectTab);
                        if (!effect) return <div className="text-center text-muted-foreground text-xs py-10">Nenhum efeito selecionado.</div>;
                        
                        return (
                          <>
                            <div className="flex justify-between items-center bg-secondary/20 p-3 rounded-xl border border-border/50">
                              <div>
                                <h3 className="text-sm font-bold text-foreground">{effect.label}</h3>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Edite o bloco de código CSS/JS injetado no prompt.</p>
                              </div>
                              {Array.isArray(effect.compatible_presets) && effect.compatible_presets.length > 0 && (
                                <div className="flex items-center gap-1 text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded">
                                  <Sparkles className="w-3 h-3" /> Compatível
                                </div>
                              )}
                            </div>

                            {/* Conflict Alerts */}
                            {Array.isArray(effect.conflicts_with) && effect.conflicts_with.length > 0 && (
                              <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-red-300">
                                  <strong>Atenção:</strong> Este efeito entra em conflito técnico com: {effect.conflicts_with.join(", ")}. Evite usá-los juntos.
                                </div>
                              </div>
                            )}

                            <div className="space-y-3 flex-1">
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">🟢 Nível Sutil (Subtle)</label>
                                  {(() => {
                                    const chars = (effect.body_subtle || "").length;
                                    const tokens = Math.ceil(chars / 3.8);
                                    let colorClass = "text-green-400";
                                    if (chars > 5000) colorClass = "text-red-400";
                                    else if (chars > 2500) colorClass = "text-yellow-400 font-semibold";
                                    return <span className={`text-[9px] font-mono ${colorClass}`}>{chars} chars · ~{tokens} tkn</span>;
                                  })()}
                                </div>
                                <textarea
                                  value={effect.body_subtle || ""}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setEffectTemplates(prev => prev.map(item => item.key === effect.key ? { ...item, body_subtle: val } : item));
                                  }}
                                  className="w-full h-[100px] bg-secondary/15 border border-border rounded-xl p-3 text-xs font-mono text-foreground focus:ring-1 focus:ring-primary/50 outline-none leading-relaxed"
                                  placeholder="CSS/JS para intensidade sutil..."
                                />
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">🟡 Nível Padrão (Standard)</label>
                                  {(() => {
                                    const chars = (effect.body_standard || "").length;
                                    const tokens = Math.ceil(chars / 3.8);
                                    let colorClass = "text-green-400";
                                    if (chars > 5000) colorClass = "text-red-400";
                                    else if (chars > 2500) colorClass = "text-yellow-400 font-semibold";
                                    return <span className={`text-[9px] font-mono ${colorClass}`}>{chars} chars · ~{tokens} tkn</span>;
                                  })()}
                                </div>
                                <textarea
                                  value={effect.body_standard || ""}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setEffectTemplates(prev => prev.map(item => item.key === effect.key ? { ...item, body_standard: val } : item));
                                  }}
                                  className="w-full h-[100px] bg-secondary/15 border border-border rounded-xl p-3 text-xs font-mono text-foreground focus:ring-1 focus:ring-primary/50 outline-none leading-relaxed"
                                  placeholder="CSS/JS para intensidade padrão..."
                                />
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">🔴 Nível Intenso (Full)</label>
                                  {(() => {
                                    const chars = (effect.body_full || "").length;
                                    const tokens = Math.ceil(chars / 3.8);
                                    let colorClass = "text-green-400";
                                    if (chars > 5000) colorClass = "text-red-400";
                                    else if (chars > 2500) colorClass = "text-yellow-400 font-semibold";
                                    return <span className={`text-[9px] font-mono ${colorClass}`}>{chars} chars · ~{tokens} tkn</span>;
                                  })()}
                                </div>
                                <textarea
                                  value={effect.body_full || ""}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setEffectTemplates(prev => prev.map(item => item.key === effect.key ? { ...item, body_full: val } : item));
                                  }}
                                  className="w-full h-[100px] bg-secondary/15 border border-border rounded-xl p-3 text-xs font-mono text-foreground focus:ring-1 focus:ring-primary/50 outline-none leading-relaxed"
                                  placeholder="CSS/JS para intensidade máxima..."
                                />
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-end mb-1">
                      <div>
                        <label className="text-[11px] font-bold text-primary uppercase tracking-tighter">Corpo do Prompt (Instruções)</label>
                        <p className="text-[10px] text-muted-foreground">O modelo abaixo será preenchido com as variáveis do formulário.</p>
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground bg-secondary/20 px-2 py-1 rounded">
                        Key: prompt_{activeConfigTab}
                      </div>
                    </div>

                    <textarea
                      value={editingTemplates[`prompt_${activeConfigTab}`] || ""}
                      onChange={e => {
                        const val = e.target.value;
                        const key = `prompt_${activeConfigTab}`;
                        setEditingTemplates(prev => ({ ...prev, [key]: val }));
                        setDirtyTemplates(prev => ({ ...prev, [key]: val !== promptTemplates[key] }));
                      }}
                      className="w-full min-h-[350px] resize-y bg-secondary/15 border border-border rounded-xl p-4 text-sm font-mono text-foreground focus:ring-1 focus:ring-primary/50 outline-none leading-relaxed flex-1"
                      placeholder="Instruções para o Claude/GPT..."
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/30">
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <h4 className="text-[10px] font-bold text-primary uppercase mb-2 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" /> Dica de Variáveis
                        </h4>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Use tags como <code className="text-primary">{`{NOME}`}</code>, <code className="text-primary">{`{TOM}`}</code>, <code className="text-primary">{`{REVIEW_1_TEXTO}`}</code> e <code className="text-primary">{`{LOGO_URL}`}</code>. 
                          As imagens e efeitos serão concatenados automaticamente no final do prompt.
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
                        <h4 className="text-[10px] font-bold text-orange-500 uppercase mb-2 flex items-center gap-1.5">
                          <Zap className="w-3 h-3" /> Regra de Tech Stack
                        </h4>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Sempre peça ao modelo para usar **Vanilla HTML/CSS/JS**. 
                          Não use CDNs de Tailwind ou frameworks externos para garantir portabilidade.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="p-6 border-t border-border bg-secondary/10 flex justify-between items-center gap-4 flex-shrink-0">
                <p className="text-[11px] text-muted-foreground">
                  {activeConfigTab === "effects" 
                    ? "✅ Salve para aplicar as mudanças técnicos nos efeitos."
                    : (dirtyTemplates[`prompt_${activeConfigTab}`] 
                        ? "⚠️ Você possui alterações não salvas nesta aba." 
                        : "✅ Template sincronizado com o banco de dados.")}
                </p>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setShowPromptConfig(false)}>Cancelar</Button>
                  <Button 
                    className="bg-primary text-black font-bold h-10 px-8" 
                    onClick={() => activeConfigTab === "effects" ? saveEffectTemplate(activeEffectTab) : saveTemplate(activeConfigTab)}
                    disabled={savingTemplate || (activeConfigTab !== "effects" && !dirtyTemplates[`prompt_${activeConfigTab}`])}
                  >
                    {savingTemplate ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar {activeConfigTab === "effects" ? "Efeito" : "Template"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Lead Selection Drawer ──────────────────────────────────────────── */}
      {showLeadDrawer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-card border border-border w-full sm:max-w-3xl max-h-[92vh] sm:rounded-2xl rounded-t-2xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-200">
            {/* Header */}
            <div className="p-5 border-b border-border flex justify-between items-center flex-shrink-0 bg-secondary/5">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" /> Selecionar Lead
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Clique em um lead para pré-preencher a proposta.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowLeadDrawer(false)} className="rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {leadLists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center p-6">
                <Database className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">Nenhuma lista atribuída a você ainda.</p>
                <p className="text-muted-foreground text-xs mt-1">Aguarde o administrador atribuir uma lista.</p>
              </div>
            ) : (
              <>
                {/* List Tabs */}
                <div className="flex overflow-x-auto gap-1 p-2 bg-secondary/5 border-b border-border flex-shrink-0 no-scrollbar">
                  {leadLists.map(list => (
                    <button
                      key={list.id}
                      onClick={async () => {
                        setLeadDrawerTab(list.id);
                        setDrawerSearch("");
                        await fetchLeadsForList(list.id);
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                        leadDrawerTab === list.id
                          ? "bg-primary text-black"
                          : "bg-transparent text-muted-foreground hover:bg-white/5"
                      }`}
                    >
                      {list.title}
                      <span className="opacity-60">({list.total_leads})</span>
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="p-3 border-b border-border flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      placeholder="Buscar por nome..."
                      value={drawerSearch}
                      onChange={e => setDrawerSearch(e.target.value)}
                      className="w-full h-9 bg-secondary/20 border border-border rounded-lg pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                {/* Lead List */}
                <div className="flex-1 overflow-y-auto">
                  {drawerLoading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
                  ) : (() => {
                    const filtered = drawerLeads.filter(l =>
                      !drawerSearch || (l.business_name ?? "").toLowerCase().includes(drawerSearch.toLowerCase())
                    );
                    const available = filtered.filter(l => !l.proposal_id);
                    const done = filtered.filter(l => l.proposal_id);

                    return (
                      <div className="divide-y divide-border/50">
                        {available.length === 0 && done.length === 0 && (
                          <div className="text-center py-12 text-muted-foreground text-sm">Nenhum lead encontrado.</div>
                        )}
                        {available.map(lead => (
                          <div key={lead.id} className="flex items-center gap-3 p-4 hover:bg-primary/5 transition-colors group">
                            {/* Potencial buttons */}
                            <div className="flex flex-col gap-1 flex-shrink-0">
                              {(["bom", "medio", "ruim"] as const).map(p => (
                                <button
                                  key={p}
                                  onClick={e => { e.stopPropagation(); handleLeadPotencial(lead.id, p); }}
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all border ${
                                    lead.potencial === p
                                      ? p === "bom" ? "bg-green-500 text-black border-green-500" 
                                        : p === "medio" ? "bg-yellow-500 text-black border-yellow-500" 
                                        : "bg-red-500 text-black border-red-500"
                                      : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                                  }`}
                                  title={`Classificar como ${p}`}
                                >
                                  {p === "bom" ? "🟢" : p === "medio" ? "🟡" : "🔴"}
                                </button>
                              ))}
                            </div>

                            {/* Lead Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">{lead.business_name ?? "Sem nome"}</p>
                              <div className="flex items-center gap-3 mt-0.5">
                                {lead.category && <span className="text-[10px] text-muted-foreground">{lead.category}</span>}
                                {lead.state && <span className="text-[10px] text-muted-foreground">{lead.state}</span>}
                                {lead.google_rating && (
                                  <span className="text-[10px] text-yellow-400 font-semibold">⭐ {lead.google_rating}</span>
                                )}
                              </div>
                            </div>

                            {/* Select Button */}
                            <Button
                              size="sm"
                              onClick={() => handleSelectLead(lead)}
                              className="bg-primary text-black font-bold text-xs h-8 px-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            >
                              Usar <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        ))}

                        {done.length > 0 && (
                          <>
                            <div className="px-4 py-2 bg-secondary/20">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Já possuem proposta ({done.length})</p>
                            </div>
                            {done.map(lead => (
                              <div key={lead.id} className="flex items-center gap-3 p-4 opacity-40">
                                <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-foreground truncate">{lead.business_name ?? "Sem nome"}</p>
                                  <span className="text-[10px] text-blue-400">Proposta gerada</span>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

