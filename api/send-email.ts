import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS check (although it shouldn't matter if called from same origin)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      to,
      subject,
      emailBody,
      proposalId,
      templateKey,
      templateTitle,
      sentBy,
      remarketingEnabled,
      remarketingIntervalDays,
    } = req.body;

    if (!to || !subject || !emailBody || !proposalId) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "ACQ Enterprise Solutions";
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SUPABASE_SERVICE_KEY) {
      throw new Error("Configurações de SMTP ou banco de dados ausentes no servidor.");
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://ycibjtbrqmpatrmfsyye.supabase.co";

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_KEY
    );

    // 1. Check cooldown (last 24h)
    const { data: recentLog } = await supabase
      .from("email_logs")
      .select("sent_at")
      .eq("proposal_id", proposalId)
      .eq("template_key", templateKey)
      .order("sent_at", { ascending: false })
      .limit(1)
      .single();

    if (recentLog) {
      const sentTime = new Date(recentLog.sent_at).getTime();
      const hoursSince = (Date.now() - sentTime) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        return res
          .status(429)
          .json({ error: "Cooldown ativo. Este script já foi enviado nas últimas 24 horas." });
      }
    }

    // 2. Format HTML Body
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background-color: #050505; padding: 24px; text-align: center; border-bottom: 2px solid #00FF9D;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: -0.5px;">ACQ <span style="color: #00FF9D;">Enterprise Solutions</span></h1>
        </div>
        <div style="padding: 32px; color: #333333; line-height: 1.6; font-size: 16px;">
          ${emailBody.replace(/\n/g, "<br />")}
        </div>
        <div style="background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #666666; border-top: 1px solid #eaeaea;">
          <p style="margin: 0;">Sent by <strong>Lucas Santos</strong> from ACQ Enterprise Solutions</p>
        </div>
      </div>
    `;

    // 3. Subject is mapped exactly as requested by user input
    const finalSubject = subject;

    // 4. Send Email
    const transp = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const info = await transp.sendMail({
      from: `"${SMTP_FROM_NAME}" <${SMTP_USER}>`,
      to,
      bcc: SMTP_USER, // Para salvar uma cópia na caixa da Hostinger (SMTP não salva por padrão)
      subject: finalSubject,
      html: htmlContent,
      text: emailBody, // fallback
    });

    // 5. Track in Supabase
    const nextFollowup = remarketingEnabled
      ? new Date(Date.now() + (remarketingIntervalDays || 7) * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { error: dbError } = await supabase.from("email_logs").insert({
      proposal_id: proposalId,
      template_key: templateKey,
      template_title: templateTitle,
      sent_to: to,
      sent_by: sentBy,
      subject: finalSubject,
      body: emailBody,
      status: "sent",
      remarketing_enabled: !!remarketingEnabled,
      remarketing_interval_days: remarketingIntervalDays || 7,
      next_followup_at: nextFollowup,
      followup_count: 0,
    });

    if (dbError) {
      console.error("Failed to log email to DB:", dbError);
    }

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err: any) {
    console.error("API error:", err);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}
