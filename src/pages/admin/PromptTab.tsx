import { Sparkles } from "lucide-react";

export default function PromptTab() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
      <div className="p-4 rounded-full bg-primary/10 animate-pulse">
        <Sparkles className="w-12 h-12 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="font-heading text-2xl font-bold text-foreground">Em breve: IA de Propostas</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Estamos desenvolvendo uma inteligência artificial para ajudar você a gerar 
          textos e estruturas de propostas irresistíveis em segundos.
        </p>
      </div>
      <div className="px-4 py-2 bg-secondary/50 border border-border rounded-full text-xs font-medium text-muted-foreground">
        Aguardando lançamento oficial
      </div>
    </div>
  );
}
