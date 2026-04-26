import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, MessageCircle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { supabase } from "@/lib/supabase";

const Proposta = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const navigate = useNavigate();

  const [proposal, setProposal] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!code) {
      navigate("/portal");
      return;
    }

    let intervalId: NodeJS.Timeout;

    const fetchProposal = async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("access_code", code)
        .single();
      
      if (error || !data) {
        navigate("/portal");
        return;
      }

      setProposal(data);

      const expiresAt = new Date(data.expires_at).getTime();
      const calculateTimeLeft = () => {
        const now = new Date().getTime();
        return Math.max(0, Math.floor((expiresAt - now) / 1000));
      };

      setSecondsLeft(calculateTimeLeft());
      setLoading(false);

      // Increment view count
      await supabase.from("proposals").update({ views_count: (data.views_count || 0) + 1 }).eq("id", data.id);
    };

    fetchProposal();
  }, [code, navigate]);

  useEffect(() => {
    if (!proposal?.expires_at) return;

    const end = new Date(proposal.expires_at as string).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = end - now;

      if (distance <= 0) {
        setSecondsLeft(0);
        return;
      }
      setSecondsLeft(Math.floor(distance / 1000));
    };

    updateTimer(); // Initial call
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [proposal?.expires_at]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse font-heading tracking-wider">Carregando acesso seguro...</p>
      </div>
    );
  }

  if (!proposal || secondsLeft <= 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border p-8 rounded-2xl max-w-md w-full text-center space-y-6"
        >
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-heading font-bold text-foreground">Acesso Expirado</h2>
            <p className="text-muted-foreground">
              O link desta proposta não é mais válido. Por questões de segurança, os acessos são temporários.
            </p>
          </div>
          <Button 
            className="w-full bg-primary text-black font-bold hover:bg-primary/90"
            onClick={() => window.location.href = '/'}
          >
            Voltar ao Início
          </Button>
        </motion.div>
      </div>
    );
  }

  const parseTimeLeft = () => {
    const d = Math.floor(secondsLeft / 86400);
    const h = String(Math.floor((secondsLeft % 86400) / 3600)).padStart(2, "0");
    const m = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, "0");
    const s = String(secondsLeft % 60).padStart(2, "0");
    return { d, h, m, s };
  };

  const { d: days, h: hours, m: minutes, s: seconds } = parseTimeLeft();
  const expired = secondsLeft <= 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-4">
            <Link to="/portal">
              <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
            </Link>
            <img src={logo} alt="ACQ" className="h-8 w-auto hidden sm:block" />
            <div className="h-6 w-px bg-border hidden sm:block" />
            <span className="text-sm font-heading font-semibold text-foreground truncate">
              {proposal?.client_name || "Client"}
            </span>
          </div>

          {/* Actions & Timer */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 mr-2">
              <Button 
                variant="outline"
                className="h-9 px-4 text-xs font-bold border-primary/50 text-white hover:bg-primary/10 bg-transparent rounded-lg transition-all"
                onClick={() => window.open(`https://wa.me/5562999953623?text=Quero solicitar alguns ajustes na proposta ${code}`, '_blank')}
              >
                Tweaks
              </Button>
              <Button 
                className="h-9 px-4 text-xs font-bold bg-[#00FF9D] text-black hover:bg-[#00E58C] rounded-lg shadow-[0_0_15px_rgba(0,255,157,0.4)] transition-all"
                onClick={() => window.open(`https://wa.me/5562999953623?text=Aprovo o conceito da proposta ${code}!`, '_blank')}
              >
                Approve Concept
              </Button>
            </div>

            {/* Timer */}
            <div className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border ${expired ? "border-destructive/40 bg-destructive/10" : "border-primary/30 bg-primary/5"}`}>
              <Clock className={`w-4 h-4 ${expired ? "text-destructive" : "text-primary"}`} />
              <div className={`font-heading font-bold text-xs sm:text-sm tracking-wider ${expired ? "text-destructive" : "text-primary"} flex items-center`}>
                {expired ? (
                  "EXPIRED"
                ) : (
                  <>
                    {days > 0 && (
                      <span className="mr-1.5 opacity-90">{days}d</span>
                    )}
                    <span>{hours}</span>
                    <span className="animate-pulse mx-0.5">:</span>
                    <span>{minutes}</span>
                    <span className="animate-pulse mx-0.5">:</span>
                    <span>{seconds}</span>
                    <span className="text-muted-foreground text-[10px] ml-2 font-body font-normal hidden lg:inline">remaining</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 container py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-5xl mx-auto"
        >
          <div className="bg-card/40 backdrop-blur-sm border border-border rounded-2xl overflow-hidden min-h-[85vh] flex items-center justify-center relative">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-primary/30 rounded-tl-2xl" />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-primary/30 rounded-br-2xl" />

            {(() => {
              const content = proposal?.html_content as string || "";
              const isUrl = /^(https?:\/\/)/i.test(content.trim());
              return (
                <iframe
                  src={isUrl ? content.trim() : undefined}
                  srcDoc={isUrl ? undefined : content}
                  title="Proposal Demo"
                  className="w-full h-full min-h-[85vh] rounded-2xl bg-white border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              );
            })()}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Proposta;
