"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  BookOpen,
  Loader2,
  TrendingUp,
  ChevronRight,
  ArrowRight,
  PenTool,
  AlertCircle,
  Lightbulb,
  Target,
  Link as LinkIcon,
  Zap,
  History,
  ShieldCheck,
  Star,
  FileSearch,
  MessageSquareQuote,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { format } from "date-fns";

const EssayChart = dynamic(
  () =>
    import("recharts").then(({ AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer }) => {
      function Chart({ data }: { data: { date: string; score: number; theme?: string }[] }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScoreEssay" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fb923c" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} dy={6} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 1000]} />
              <Tooltip
                content={({ active, payload, label }: any) =>
                  active && payload?.length ? (
                    <div className="bg-[#1a1a1f] border border-white/10 p-3 rounded-2xl shadow-2xl flex flex-col gap-1 max-w-[200px]">
                      <p className="font-bold text-white/60 text-[10px]">{label}</p>
                      <p className="font-black text-orange-400 text-lg">{payload[0].value} pts</p>
                      {payload[0].payload.theme && (
                        <p className="text-[9px] font-bold text-white/40 leading-tight italic line-clamp-3 mt-1">
                          "{payload[0].payload.theme}"
                        </p>
                      )}
                    </div>
                  ) : null
                }
              />
              <Area type="monotone" dataKey="score" stroke="#fb923c" strokeWidth={2.5} fillOpacity={1} fill="url(#colorScoreEssay)" />
            </AreaChart>
          </ResponsiveContainer>
        );
      }
      return { default: Chart };
    }),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-white/5 animate-pulse rounded-2xl" />,
  }
);

const COMPETENCY_LABELS: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  c1: { label: "C1: Norma Culta", icon: PenTool, color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/25" },
  c2: { label: "C2: Estrutura", icon: FileSearch, color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/25" },
  c3: { label: "C3: Argumentação", icon: Target, color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/25" },
  c4: { label: "C4: Coesão", icon: LinkIcon, color: "text-cyan-400", bg: "bg-cyan-500/15 border-cyan-500/25" },
  c5: { label: "C5: Intervenção", icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/25" },
};

export default function StudentEssayPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [theme, setTheme] = useState("Os impactos da Inteligência Artificial na educação brasileira contemporânea");
  const [supportingTexts, setSupportingTexts] = useState<any[]>([
    { id: 1, content: "A inteligência artificial pode personalizar o ensino, mas levanta questões éticas sobre a autonomia do aluno.", source: "MEC 2024" },
    { id: 2, content: "O Brasil ocupa a 5ª posição no ranking de países que mais buscam ferramentas de IA para estudo.", source: "G1 Notícias" },
    { id: 3, content: "A desigualdade digital no Brasil ainda é um entrave para a implementação plena de tecnologias educacionais.", source: "IBGE" },
  ]);
  const [customTheme, setCustomTheme] = useState(false);
  const [text, setText] = useState("");
  const [loadingTopic, setLoadingTopic] = useState(false);
  const [loadingGrading, setLoadingGrading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [charCount, setCharCount] = useState(0);
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("essay_submissions")
        .select("created_at, score, theme")
        .eq("user_id", user.id)
        .not("score", "is", null)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        if (data.length === 1) {
          setHistory([
            { date: "Início", score: 0, theme: "" },
            { date: format(new Date(data[0].created_at), "dd/MM"), score: Number(data[0].score), theme: data[0].theme },
          ]);
        } else {
          setHistory(
            data.map((d) => ({
              date: format(new Date(d.created_at), "dd/MM"),
              score: Number(d.score),
              theme: d.theme,
            }))
          );
        }
      }
    } catch (e) {
      console.error("Erro ao buscar histórico de redações:", e);
    }
  }, [user]);

  useEffect(() => {
    setCharCount(text.length);
  }, [text]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleGenerateTopic = async () => {
    setLoadingTopic(true);
    setResult(null);
    setCustomTheme(false);
    try {
      const res = await fetch("/api/essay-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTheme(data.result.title);
        setSupportingTexts(data.result.supporting_texts || []);
        toast({ title: "Proposta ENEM Gerada!", description: "A Aurora carregou os textos motivadores." });
      } else {
        throw new Error(data.error || "IA falhou");
      }
    } catch {
      const etecThemes = [
        {
          theme: "A importância da qualificação técnica profissional para a juventude no mercado atual",
          texts: [
            { id: 1, content: "Os cursos técnicos favorecem o contato com a prática profissional e aceleram a empregabilidade.", source: "Censo Inep" },
            { id: 2, content: "A demanda por profissionais de tecnologia e indústria se mantém alta no interior paulista.", source: "Guia do Estudante" },
          ],
        },
        {
          theme: "O papel do jovem na construção de mobilidade urbana sustentável nas grandes cidades",
          texts: [{ id: 1, content: "O planejamento urbano frequentemente negligencia o transporte coletivo sustentável.", source: "Mobilize Brasil" }],
        },
      ];

      const enemThemes = [
        {
          theme: "O desafio de democratizar o acesso à tecnologia e informação no Brasil",
          texts: [
            { id: 1, content: "O acesso à internet no Brasil ainda é desigual, afetando principalmente as áreas rurais e as classes D e E.", source: "TIC Domicílios" },
            { id: 2, content: "A educação mediada pela tecnologia exige infraestrutura e capacitação docente contínua.", source: "Portal Educação" },
          ],
        },
        {
          theme: "Caminhos para combater a insegurança alimentar no Brasil contemporâneo",
          texts: [{ id: 1, content: "O desperdício na cadeia logística de alimentos agrava as crises sociais.", source: "ONU Brasil" }],
        },
      ];

      const audience = (
        profile?.exam_target ||
        user?.user_metadata?.exam_target ||
        profile?.profile_type ||
        user?.user_metadata?.profile_type ||
        "enem"
      )
        .toLowerCase()
        .trim();
      const isEtec = audience.includes("etec");
      const pool = isEtec ? etecThemes : enemThemes;
      const pick = pool[Math.floor(Math.random() * pool.length)];

      toast({ title: "Banco de Apoio", description: `Tema padrão ${isEtec ? "ETEC" : "ENEM"}` });
      setTheme(pick.theme);
      setSupportingTexts(pick.texts);
    } finally {
      setLoadingTopic(false);
    }
  };

  const handleSubmitEssay = async () => {
    if (text.length < 100) {
      toast({ title: "Texto Insuficiente", description: "Escreva ao menos 100 caracteres.", variant: "destructive" });
      return;
    }

    setLoadingGrading(true);
    try {
      const res = await fetch("/api/essay-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, text }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const aiOutput = data.result;
        setResult(aiOutput);

        if (user) {
          try {
            const saveRes = await fetch("/api/essay-save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: user.id,
                theme,
                content: text,
                score: aiOutput.total_score,
                feedback: aiOutput.general_feedback,
                result_data: aiOutput,
              }),
            });
            const saveData = await saveRes.json();
            if (!saveRes.ok || !saveData.success) throw new Error(saveData.error || "Erro ao salvar");
            fetchHistory();
          } catch (insertError) {
            console.error("Erro insert", insertError);
            toast({ title: "Erro na Evolução", description: "Avaliação finalizada, mas houve falha ao salvar no histórico.", variant: "destructive" });
            setHistory((prev) => {
              const newScore = { date: format(new Date(), "dd/MM"), score: aiOutput.total_score, theme };
              if (prev.length === 0) return [{ date: "Início", score: 0, theme: "" }, newScore];
              return [...prev, newScore];
            });
          }
        }

        toast({ title: "Avaliação Concluída!" });
        setTimeout(() => {
          document.getElementById("audit-results")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        throw new Error(data.error || "IA offline");
      }
    } catch {
      toast({ title: "Erro de Sincronização", description: "Houve uma oscilação na rede. Tente novamente.", variant: "destructive" });
    } finally {
      setLoadingGrading(false);
    }
  };

  return (
    <div className="pb-24 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Hero ── */}
      <div className="relative rounded-[2rem] overflow-hidden bg-[#0d0d0f] border border-white/5 p-6">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 80% 10%, rgba(255,107,0,0.13) 0%, transparent 60%), radial-gradient(ellipse at 10% 90%, rgba(139,92,246,0.08) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-3 w-3 text-orange-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400/70">
                  Aurora IA Ativa
                </p>
              </div>
              <h1 className="text-2xl font-black italic tracking-tighter text-white leading-none">
                Lab de Redação
              </h1>
              <p className="text-white/40 text-xs font-semibold mt-1">
                Auditoria por IA · critérios INEP
              </p>
            </div>
            <div className="flex flex-col items-center bg-white/5 border border-white/8 rounded-2xl px-3 py-2 shrink-0">
              <span className="text-lg font-black text-white leading-none">{charCount}</span>
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider mt-0.5">Sinais</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button
              onClick={() => {
                setCustomTheme(!customTheme);
                setTheme("");
                setSupportingTexts([]);
                setResult(null);
              }}
              className={`h-11 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${
                customTheme
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-transparent border-white/10 text-white/50 hover:text-white/80"
              }`}
            >
              {customTheme ? "Sair do Manual" : "Tema Manual"}
            </Button>
            <Button
              onClick={handleGenerateTopic}
              disabled={loadingTopic || loadingGrading}
              className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 border-none disabled:opacity-40"
            >
              {loadingTopic ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              )}
              Gerar com IA
            </Button>
          </div>
        </div>
      </div>

      {/* ── Theme + Editor ── */}
      <div className="bg-white/3 border border-white/6 rounded-[1.5rem] overflow-hidden">
        {/* Theme header */}
        <div className="p-5 border-b border-white/5 bg-white/3">
          {customTheme ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <PenTool className="h-3 w-3 text-orange-400/70" />
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  Sua proposta
                </label>
              </div>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Ex: A inteligência artificial na educação..."
                className="w-full h-11 bg-white/5 border border-white/8 rounded-xl px-4 text-sm font-bold italic text-white placeholder:text-white/25 outline-none focus:border-orange-500/40 transition-all"
              />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3 w-3 text-orange-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-400/70">Tema Sintonizado</p>
              </div>
              <h2 className="text-base font-black italic text-white leading-snug">
                {theme || "Aguardando geração de tema..."}
              </h2>
            </>
          )}
        </div>

        {/* Textarea */}
        <Textarea
          placeholder="Inicie seu texto aqui... Desenvolva sua tese com clareza."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loadingGrading}
          className="min-h-[280px] sm:min-h-[400px] border-none p-5 font-medium text-sm leading-relaxed italic resize-none focus-visible:ring-0 bg-transparent text-white/85 placeholder:text-white/20 scrollbar-hide rounded-none"
        />

        {/* Submit footer */}
        <div className="border-t border-white/5 p-4 space-y-3">
          <Button
            onClick={handleSubmitEssay}
            disabled={loadingGrading || !text || !theme}
            className="w-full h-13 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-2xl shadow-xl shadow-orange-500/30 border-none text-xs uppercase tracking-widest disabled:opacity-40 group"
          >
            {loadingGrading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sincronizando Auditoria...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Submeter para Aurora IA
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </Button>
          <div className="flex items-center justify-center gap-1.5">
            <AlertCircle className="h-3 w-3 text-white/20" />
            <p className="text-[9px] text-white/25 uppercase tracking-widest font-bold">
              Aurora é uma IA · correção pode ter imprecisões
            </p>
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      {result && (
        <div id="audit-results" className="space-y-5 animate-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-2 px-1">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Diagnóstico</p>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
          </div>

          {/* Score Card */}
          <div className="relative bg-[#0d0d0f] border border-white/8 rounded-[1.5rem] overflow-hidden p-6">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 100% 0%, rgba(255,107,0,0.2) 0%, transparent 60%)",
              }}
            />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-3 w-3 text-orange-400 fill-orange-400 animate-pulse" />
                  <Badge className="bg-orange-500/20 text-orange-400 border-none font-black text-[9px] px-2 py-0.5 uppercase tracking-widest">
                    Pontuação Final
                  </Badge>
                </div>
                <h2 className="text-6xl font-black italic tracking-tighter leading-none text-white drop-shadow-xl">
                  {result.total_score}
                </h2>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">
                  de 1000 pontos
                </p>
              </div>
            </div>
            <div className="relative z-10 mt-5 pt-5 border-t border-white/8">
              <MessageSquareQuote className="h-4 w-4 text-orange-400 mb-2" />
              <p className="text-xs font-medium italic text-white/70 leading-relaxed">
                "{result.general_feedback}"
              </p>
            </div>
          </div>

          {/* Competencies grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(result.competencies || {}).map(([key, comp]: any) => {
              const info = COMPETENCY_LABELS[key];
              if (!info) return null;
              const Icon = info.icon;
              return (
                <div
                  key={key}
                  className="bg-white/3 border border-white/6 rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-xl border ${info.bg}`}>
                      <Icon className={`h-4 w-4 ${info.color}`} />
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Nota</p>
                      <p className="text-2xl font-black italic text-white leading-none">{comp.score}</p>
                    </div>
                  </div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${info.color}`}>
                    {info.label}
                  </p>
                  <p className="text-xs font-medium italic text-white/60 leading-relaxed">{comp.feedback}</p>
                </div>
              );
            })}
          </div>

          {/* Corrections */}
          {result.detailed_corrections?.length > 0 && (
            <div className="bg-white/3 border border-white/6 rounded-[1.5rem] overflow-hidden">
              <div className="p-5 border-b border-white/5 bg-red-500/5">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                    <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                  </div>
                  <h3 className="text-sm font-black italic text-red-400 uppercase tracking-wide">
                    Raio-X de Desvios
                  </h3>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {result.detailed_corrections.map((corr: any, i: number) => (
                  <div key={i} className="p-4 bg-white/3 border border-white/5 rounded-2xl space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge className="bg-red-500/15 text-red-400 border-none font-black text-[9px] px-2 line-through opacity-70">
                        {corr.original}
                      </Badge>
                      <ChevronRight className="h-3 w-3 text-white/30" />
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-none font-black text-[9px] px-2">
                        {corr.suggestion}
                      </Badge>
                    </div>
                    <p className="text-[11px] font-medium text-white/50 italic leading-relaxed flex items-start gap-2">
                      <Lightbulb className="h-3 w-3 text-orange-400 shrink-0 mt-0.5" />
                      {corr.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions?.length > 0 && (
            <div className="bg-[#0d0d0f] border border-orange-500/15 rounded-[1.5rem] overflow-hidden">
              <div className="p-5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                    <Zap className="h-3.5 w-3.5 text-orange-400" />
                  </div>
                  <h3 className="text-sm font-black italic text-orange-400 uppercase tracking-wide">
                    Plano de Evolução
                  </h3>
                </div>
              </div>
              <div className="p-4 space-y-2.5">
                {result.suggestions.map((sug: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/3 border border-white/5">
                    <div className="h-6 w-6 rounded-lg bg-orange-500 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-xs font-medium italic text-white/70 leading-relaxed">{sug}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Support texts ── */}
      {supportingTexts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <BookOpen className="h-4 w-4 text-orange-400/60" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
              Textos Motivadores
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {supportingTexts.map((st) => (
              <div
                key={st.id}
                className="bg-white/3 border border-white/6 border-l-2 border-l-orange-500 rounded-2xl p-4"
              >
                <p className="text-xs font-medium italic text-white/70 leading-relaxed">
                  "{st.content}"
                </p>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">
                    Fonte: {st.source}
                  </span>
                  <Badge className="bg-orange-500/10 text-orange-400/80 border border-orange-500/20 font-black text-[7px] uppercase px-1.5 h-4">
                    Motivador
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Evolution chart ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <TrendingUp className="h-4 w-4 text-orange-400/60" />
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
            Evolução
          </p>
        </div>
        <div className="bg-white/3 border border-white/6 rounded-[1.5rem] overflow-hidden p-4">
          {history.length > 0 ? (
            <div className="h-[220px] w-full">
              <EssayChart data={history} />
            </div>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                <History className="h-4 w-4 text-white/30" />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                  Radar de Evolução
                </p>
                <p className="text-[9px] font-bold text-white/20 uppercase mt-1">
                  Aguardando seu primeiro envio
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
