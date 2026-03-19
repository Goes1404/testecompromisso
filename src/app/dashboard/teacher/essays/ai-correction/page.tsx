
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Loader2, AlertCircle, Award, BookOpen, PenTool, Scale, Goal } from "lucide-react";

interface AIAnalysisResult {
  notaFinal: number;
  feedbackGeral: string;
  analiseCompetencias: {
    [key: string]: { 
      nota: number;
      analise: string;
    };
  };
}

// Helper para ícones e cores
const getCompetenceDetails = (key: string) => {
  if (key.includes("1")) return { Icon: PenTool, color: "#3b82f6" };
  if (key.includes("2")) return { Icon: BookOpen, color: "#8b5cf6" };
  if (key.includes("3")) return { Icon: Goal, color: "#10b981" };
  if (key.includes("4")) return { Icon: Scale, color: "#f97316" };
  if (key.includes("5")) return { Icon: Award, color: "#ec4899" };
  return { Icon: Sparkles, color: "#6b7280" };
};

export default function AICorrectionPage() {
  const [essayTopic, setEssayTopic] = useState("");
  const [essayText, setEssayText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCorrection = async () => {
    if (!essayTopic.trim() || !essayText.trim()) {
      setError("Por favor, preencha o tema e o texto da redação.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setAiResult(null);
    try {
      const response = await fetch('/api/ai/grade-essay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: essayTopic, text: essayText }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Falha ao processar a correção.');
      setAiResult(data);
    } catch (e: any) {
      setError(e.message || "Ocorreu um erro ao processar a análise.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start p-4 md:p-6 animate-in fade-in duration-500">
      {/* Coluna da Esquerda: Inserção dos Dados */}
      <Card className="w-full shadow-lg border-none sticky top-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-accent"/>
            <div>
              <CardTitle className="text-2xl font-black text-primary italic">Correção com Aurora IA</CardTitle>
              <CardDescription className="font-medium">Insira os dados para uma análise completa nas 5 competências do ENEM.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="essay-topic" className="font-bold text-sm">Tema da Redação</Label>
            <Textarea id="essay-topic" value={essayTopic} onChange={(e) => setEssayTopic(e.target.value)} placeholder="Ex: Os desafios da educação a distância..." className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="essay-text" className="font-bold text-sm">Texto da Redação</Label>
            <Textarea id="essay-text" value={essayText} onChange={(e) => setEssayText(e.target.value)} placeholder="Cole aqui o texto completo..." className="mt-1.5 min-h-[350px]" />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro na Análise</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button onClick={handleCorrection} disabled={isLoading} className="w-full h-12 font-bold text-lg shadow-lg gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />} 
            {isLoading ? "Analisando..." : "Corrigir com Aurora"}
          </Button>
        </CardContent>
      </Card>

      {/* Coluna da Direita: Resultado da Análise */}
      <div className="w-full">
        <div className="sticky top-6">
        {!aiResult && !isLoading && (
          <Card className="flex flex-col items-center justify-center text-center p-10 lg:p-20 border-2 border-dashed shadow-none">
              <Sparkles className="mx-auto h-16 w-16 text-muted-foreground/30" />
              <h3 className="mt-6 text-xl font-bold text-muted-foreground">Aguardando Redação</h3>
              <p className="text-muted-foreground mt-2">O resultado da análise da Aurora IA será exibido aqui.</p>
          </Card>
        )}
        {isLoading && (
          <Card className="flex flex-col items-center justify-center text-center p-10 lg:p-20 border-2 border-dashed border-primary/20 shadow-none bg-primary/5">
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
            <h3 className="mt-6 text-xl font-bold text-primary italic">Analisando...</h3>
            <p className="text-primary/80 mt-2">A Aurora está lendo o texto, avaliando as competências e preparando o feedback.</p>
          </Card>
        )}

        {aiResult && (
          <Card className="w-full shadow-2xl border-2 border-primary/20 animate-in fade-in duration-700 bg-white/50 backdrop-blur-sm">
            <CardHeader className="text-center bg-gradient-to-b from-primary/5 to-transparent pt-6">
              <CardDescription className="font-bold uppercase tracking-widest text-sm">Performance Pedagógica</CardDescription>
              <CardTitle className="text-7xl font-black text-primary italic">{aiResult.notaFinal}</CardTitle>
               <div className="px-10 lg:px-20 pt-2">
                 <Progress value={aiResult.notaFinal / 10} className="h-3" />
               </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-6">
              <Alert className="bg-primary/5 border-primary/10">
                <BookOpen className="h-5 w-5 text-primary/80" />
                <AlertTitle className="font-bold text-primary">Feedback Geral da Aurora</AlertTitle>
                <AlertDescription className="font-medium text-primary/90 italic">
                  {aiResult.feedbackGeral}
                </AlertDescription>
              </Alert>

              <Accordion type="single" collapsible defaultValue={Object.keys(aiResult.analiseCompetencias).find(k => aiResult.analiseCompetencias[k].nota < 200)} className="w-full">
                {Object.entries(aiResult.analiseCompetencias).map(([key, value]) => {
                  const { Icon, color } = getCompetenceDetails(key);
                  return (
                    <AccordionItem value={key} key={key} className="border-b-2 border-black/5 bg-white/50 rounded-xl mb-2 shadow-sm transition-all hover:bg-white">
                      <AccordionTrigger className="p-4 font-bold text-left text-sm hover:no-underline">
                        <div className="flex items-center gap-4 w-full">
                           <div style={{ backgroundColor: color }} className="h-10 w-10 rounded-lg flex items-center justify-center text-white shrink-0">
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <span className="italic font-black text-primary/80">{key}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={value.nota / 2} className="h-2 flex-1" />
                              <Badge variant="outline" className="font-black text-xs w-16 justify-center" style={{borderColor: color, color: color}}>{value.nota}/200</Badge>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 pt-0">
                        <p className="text-muted-foreground font-medium italic text-sm">
                          {value.analise}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
}

