import { useState, useEffect, useCallback } from "react";
import { DollarSign, TrendingUp, Users, BarChart3, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface UserStats {
  name: string;
  total: number;
  approved: number;
  conversionRate: number;
  totalValue: number;
  commissionRate: number;
  commissionValue: number;
}

export default function BillingTab() {
  const [stats, setStats] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch all proposals and admin users in parallel
    const [proposalsRes, usersRes] = await Promise.all([
      supabase.from("proposals").select("created_by, status, proposal_value"),
      supabase.from("admin_users").select("name, commission_rate"),
    ]);

    const proposals = (proposalsRes.data || []) as { created_by: string; status: string; proposal_value: number | null }[];
    const users = (usersRes.data || []) as { name: string; commission_rate: number }[];

    // Build stats per user
    const map = new Map<string, UserStats>();

    for (const u of users) {
      map.set(u.name, {
        name: u.name,
        total: 0,
        approved: 0,
        conversionRate: 0,
        totalValue: 0,
        commissionRate: u.commission_rate || 50,
        commissionValue: 0,
      });
    }

    for (const p of proposals) {
      const key = p.created_by || "Admin";
      if (!map.has(key)) {
        map.set(key, { name: key, total: 0, approved: 0, conversionRate: 0, totalValue: 0, commissionRate: 50, commissionValue: 0 });
      }
      const s = map.get(key)!;
      s.total++;
      if (p.status === "approved") {
        s.approved++;
        s.totalValue += p.proposal_value || 0;
      }
    }

    // Calculate rates and commissions
    for (const s of map.values()) {
      s.conversionRate = s.total > 0 ? Math.round((s.approved / s.total) * 100) : 0;
      s.commissionValue = s.totalValue * (s.commissionRate / 100);
    }

    setStats(Array.from(map.values()).sort((a, b) => b.conversionRate - a.conversionRate));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Aggregate
  const totalProposals = stats.reduce((a, s) => a + s.total, 0);
  const totalApproved = stats.reduce((a, s) => a + s.approved, 0);
  const totalRevenue = stats.reduce((a, s) => a + s.totalValue, 0);
  const totalCommission = stats.reduce((a, s) => a + s.commissionValue, 0);
  const overallConversion = totalProposals > 0 ? Math.round((totalApproved / totalProposals) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Propostas", value: totalProposals.toString(), icon: BarChart3, color: "text-foreground" },
          { label: "Taxa de Conversão", value: `${overallConversion}%`, icon: TrendingUp, color: overallConversion >= 50 ? "text-[#00FF9D]" : "text-yellow-400" },
          { label: "Receita Aprovada", value: `R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-[#00FF9D]" },
          { label: "Total Comissões", value: `R$ ${totalCommission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: Users, color: "text-indigo-400" },
        ].map(c => (
          <div key={c.label} className="bg-card/40 backdrop-blur-sm border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`w-4 h-4 ${c.color}`} />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className={`text-xl font-heading font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Conversion Rate by User */}
      <div className="bg-card/40 backdrop-blur-sm border border-border rounded-2xl p-6">
        <h3 className="font-heading text-lg font-bold text-foreground mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Taxa de Conversão por Vendedor
        </h3>

        {stats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado disponível.</p>
        ) : (
          <div className="space-y-4">
            {stats.map((s, i) => (
              <div key={s.name} className="flex items-center gap-4">
                <div className="flex items-center gap-3 w-40 flex-shrink-0">
                  <span className="text-xs text-muted-foreground font-mono w-5 text-right">#{i + 1}</span>
                  <span className="text-sm font-semibold text-foreground truncate">{s.name}</span>
                </div>
                <div className="flex-1 relative h-8 bg-secondary/40 rounded-lg overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-lg transition-all duration-700"
                    style={{
                      width: `${Math.max(s.conversionRate, 2)}%`,
                      background: s.conversionRate >= 60
                        ? "linear-gradient(90deg, #00FF9D, #00CC7D)"
                        : s.conversionRate >= 30
                          ? "linear-gradient(90deg, #f59e0b, #d97706)"
                          : "linear-gradient(90deg, #ef4444, #dc2626)",
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-3">
                    <span className="text-xs font-bold text-white drop-shadow-sm z-10">{s.conversionRate}%</span>
                    <span className="text-[10px] text-muted-foreground z-10">{s.approved}/{s.total} aprovadas</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Commission Table */}
      <div className="bg-card/40 backdrop-blur-sm border border-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" /> Detalhamento de Comissões
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Vendedor", "Propostas", "Aprovadas", "Conversão", "Receita Aprovada", "Comissão %", "Valor Comissão"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map(s => (
                <tr key={s.name} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.total}</td>
                  <td className="px-4 py-3 text-[#00FF9D] font-semibold">{s.approved}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      s.conversionRate >= 60 ? "bg-green-500/15 text-green-400"
                      : s.conversionRate >= 30 ? "bg-yellow-500/15 text-yellow-400"
                      : "bg-red-500/15 text-red-400"
                    }`}>{s.conversionRate}%</span>
                  </td>
                  <td className="px-4 py-3 text-foreground">R$ {s.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.commissionRate}%</td>
                  <td className="px-4 py-3 text-indigo-400 font-bold">R$ {s.commissionValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="bg-primary/5 font-bold">
                <td className="px-4 py-3 text-foreground">Total</td>
                <td className="px-4 py-3 text-foreground">{totalProposals}</td>
                <td className="px-4 py-3 text-[#00FF9D]">{totalApproved}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary/15 text-primary">{overallConversion}%</span>
                </td>
                <td className="px-4 py-3 text-foreground">R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-muted-foreground">—</td>
                <td className="px-4 py-3 text-indigo-400">R$ {totalCommission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
