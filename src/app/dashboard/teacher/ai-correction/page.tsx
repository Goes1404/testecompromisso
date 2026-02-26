
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, AlertTriangle, BookCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CorrectionResult {
  final_score: number;
  competencies: {
    name: string;
    score: number;
    analysis: string;
  }[];
  improvement_suggestions: string;
  general_feedback: string;
}

export default function AiCorrectionPage() {
  const [theme, setTheme] = useState('');
  const [text, setText] = useState('');
  const [result, setResult] = useState<CorrectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCorrection = async () => {
    if (!theme.trim() || !text.trim()) {
      setError('Por favor, preencha o tema e o texto da redação.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ai/grade-essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, text }),
      });

      const responseText = await response.text();
      let data;
      
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (e) {
        throw new Error('O servidor retornou uma resposta inválida.');
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Falha ao se comunicar com a API');
      }

      setResult(data);

    } catch (e: any) {
      setError(e.message || 'Ocorreu um erro inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <Card className="bg-white shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-slate-800">Correção de Redação com Aurora IA</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="theme" className="text-sm font-semibold text-slate-600 mb-1 block">Tema da Redação</label>
            <Input 
              id="theme"
              placeholder="Ex: Os desafios da educação a distância no Brasil"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="text" className="text-sm font-semibold text-slate-600 mb-1 block">Texto da Redação do Aluno</label>
            <Textarea 
              id="text"
              placeholder="Cole aqui o texto completo da redação..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[250px] rounded-lg"
            />
          </div>
          <Button onClick={handleCorrection} disabled={isLoading} className="w-full sm:w-auto font-bold rounded-lg">
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Corrigindo...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> Corrigir com Aurora IA</>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="bg-red-50 border-red-200 shadow-md rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm font-semibold text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="bg-white shadow-md rounded-2xl animate-in fade-in duration-500">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <BookCheck className="h-6 w-6 text-green-600"/>
              <span className="text-xl font-bold text-slate-800">Análise Concluída</span>
            </CardTitle>
            <div className='text-right'>
                <p className='text-sm text-slate-500 font-semibold'>Nota Final</p>
                <p className='text-3xl font-bold text-primary'>{result.final_score}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div>
              <h3 className="font-bold text-lg text-slate-700 mb-2">Análise por Competência</h3>
              <div className="space-y-4">
                {result.competencies.map((c, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-lg border">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-bold text-slate-800">{c.name}</p>
                      <Badge className="font-mono text-sm" variant={c.score < 100 ? "destructive" : "default"}>{c.score}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{c.analysis}</p>
                  </div>
                ))}
              </div>
            </div>
             <div>
              <h3 className="font-bold text-lg text-slate-700 mb-2">Feedback Geral</h3>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border">{result.general_feedback}</p>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-700 mb-2">Sugestões de Melhoria</h3>
              <p className="text-sm text-slate-600 leading-relaxed bg-amber-50 p-4 rounded-lg border border-amber-200 text-amber-800">{result.improvement_suggestions}</p>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
