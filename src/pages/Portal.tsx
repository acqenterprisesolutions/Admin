import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import heroBg from "@/assets/hero-bg.jpg";
import { supabase } from "@/lib/supabase";

const Portal = () => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 5 || code.length > 8) {
      setError("Please enter a valid access code.");
      return;
    }
    setLoading(true);
    setError("");

    const { data: proposal, error: supabaseError } = await supabase
      .from("proposals")
      .select("id")
      .eq("access_code", code.toUpperCase())
      .single();

    if (supabaseError || !proposal) {
      setError("Código de acesso inválido ou proposta não encontrada.");
      setLoading(false);
      return;
    }

    navigate(`/proposta?code=${code.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative"
      >
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Card */}
        <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-8 md:p-10 relative overflow-hidden">
          {/* Subtle border glow */}
          <div className="absolute inset-0 rounded-2xl border border-primary/20 pointer-events-none" />

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={logo} alt="ACQ Enterprise Solutions" className="h-12 w-auto" />
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
              Client Portal
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your exclusive access code to view your proposal.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Access Code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.slice(0, 8));
                  setError("");
                }}
                className="pl-10 h-12 bg-secondary/50 border-border text-center text-lg tracking-[0.3em] font-heading placeholder:tracking-normal placeholder:text-sm"
                maxLength={8}
              />
            </div>

            {error && (
              <p className="text-destructive text-sm text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-semibold rounded-xl glow-teal hover:scale-[1.02] transition-all duration-300"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : "Access Proposal"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Portal;
