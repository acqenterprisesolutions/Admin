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

      intervalId = setInterval(() => {
        setSecondsLeft(calculateTimeLeft());
      }, 1000);

      // Increment view count via an RPC or updating directly. Doing directly:
      await supabase.from("proposals").update({ views_count: (data.views_count || 0) + 1 }).eq("id", data.id);
    };

    fetchProposal();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [code, navigate]);

  const hours = String(Math.floor(secondsLeft / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");
  const expired = secondsLeft <= 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
      </div>
    );
  }

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
              <div className={`font-heading font-bold text-xs sm:text-sm tracking-wider ${expired ? "text-destructive" : "text-primary"}`}>
                {expired ? (
                  "EXPIRED"
                ) : (
                  <>
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
          <div className="bg-card/40 backdrop-blur-sm border border-border rounded-2xl overflow-hidden min-h-[60vh] flex items-center justify-center relative">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-primary/30 rounded-tl-2xl" />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-primary/30 rounded-br-2xl" />

            <iframe
              srcDoc={proposal?.html_content || ""}
              title="Proposal Demo"
              className="w-full h-full min-h-[70vh] rounded-2xl bg-white border-0"
            />
          </div>
        </motion.div>
      </main>

      {/* Fixed bottom CTA */}
      <div className="sticky bottom-0 border-t border-border bg-card/80 backdrop-blur-xl py-4">
        <div className="container flex justify-center">
          <Button
            asChild
            className="h-12 px-8 text-base font-semibold rounded-xl glow-teal hover:scale-[1.02] transition-all duration-300 gap-2"
          >
            <a
              href="https://wa.me/5562999953623"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="w-5 h-5" />
              Talk to a Consultant
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Proposta;
