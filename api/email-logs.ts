import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS check (although it shouldn't matter if called from same origin)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const proposalId = req.query.proposalId as string;

    if (!proposalId) {
      return res.status(400).json({ error: "proposalId é obrigatório" });
    }

    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    if (!SUPABASE_SERVICE_KEY) {
      throw new Error("Configurações de banco de dados ausentes no servidor.");
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://ycibjtbrqmpatrmfsyye.supabase.co";

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_KEY
    );

    const { data, error } = await supabase
      .from("email_logs")
      .select("id, template_key, template_title, sent_to, sent_by, subject, sent_at, status, replied_at, remarketing_enabled, remarketing_interval_days, next_followup_at, followup_count")
      .eq("proposal_id", proposalId)
      .order("sent_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({ logs: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}
