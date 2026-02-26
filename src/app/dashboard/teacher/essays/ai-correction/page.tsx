
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";

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
      const response = await fetch('/api/ai/grade-essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: essayTopic, text: essayText }),
      });

      const responseText = await response.text();
      let data;
      
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (e) {
        throw new Error('O servidor retornou uma resposta inválida.');
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Falha ao processar a correção.');
      }

      setAiResult(data);

    } catch (e: any) {
      setError(e.message || "Ocorreu um erro ao processar a análise. Por favor, tente novamente.");
      console.error("Erro Aurora IA:", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary italic flex items-center gap-3">
            Correção de Redação com IA
            <Badge className="bg-accent text-accent-foreground border-none">AURORA</Badge>
          </h1>
          <p className="text-muted-foreground font-medium">Cole o tema e o texto da redação para receber uma análise completa baseada nas 5 competências do ENEM.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <Card className="w-full lg:w-1/2 lg:max-w-2xl shadow-xl border-none">
          <CardHeader>
            <CardTitle>Dados da Redação</CardTitle>
            <CardDescription>Insira as informações para que a Aurora possa realizar a análise.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="essay-topic" className="font-bold">Tema da Redação</Label>
              <Textarea
                id="essay-topic"
                value={essayTopic}
                onChange={(e) => setEssayTopic(e.target.value)}
                placeholder="Ex: Os desafios da educação a distância no Brasil contemporâneo"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="essay-text" className="font-bold">Texto da Redação</Label>
              <Textarea
                id="essay-text"
                value={essayText}
                onChange={(e) => setEssayText(e.target.value)}
                placeholder="Cole aqui o texto completo da redação do aluno..."
                className="mt-2 min-h-[300px]"
              />
            </div>
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
              </div>
            )}
            <Button onClick={handleCorrection} disabled={isLoading} className="w-full h-12 font-bold text-base shadow-lg">
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando Análise...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Corrigir com Aurora IA</>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="w-full lg:w-1/2 lg:flex-1 sticky top-6 shadow-2xl border-primary/20 border-2">
          <CardHeader>
            <CardTitle>Análise da Aurora</CardTitle>
            <CardDescription>O resultado da correção será exibido aqui.</CardDescription>
          </CardHeader>
          <CardContent>
            {!aiResult && !isLoading && (
              <div className="text-center text-muted-foreground py-12">
                <Sparkles className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-4 font-medium italic">Aguardando uma redação para analisar.</p>
              </div>
            )}
            {isLoading && (
              <div className="text-center text-primary py-12">
                <Loader2 className="mx-auto h-12 w-12 animate-spin" />
                <p className="mt-4 font-bold italic">A Aurora está lendo e analisando o texto...</p>
              </div>
            )}
            {aiResult && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="text-center">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary/80">Nota Final</CardTitle>
                    <p className="text-6xl font-black text-primary italic">{aiResult.notaFinal}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-center text-primary/90 font-medium italic">"{aiResult.feedbackGeral}"</p>
                  </CardContent>
                </Card>
                <div className="space-y-4">
                  {Object.entries(aiResult.analiseCompetencias).map(([key, value]) => (
                    <details key={key} className="border p-3 rounded-lg bg-white group" open={value.nota < 200}>
                      <summary className="font-bold flex items-center justify-between cursor-pointer list-none">
                        <span className="text-primary italic">{key}</span>
                        <Badge variant={value.nota === 200 ? "secondary" : "default"} className="font-black">
                          {value.nota} / 200
                        </Badge>
                      </summary>
                      <p className="text-sm text-muted-foreground mt-2 pt-2 border-t font-medium italic">{value.analise}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
