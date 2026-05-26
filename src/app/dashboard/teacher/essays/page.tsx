
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  ClipboardCheck,
  Loader2,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  FileText,
  ArrowLeft,
  Inbox,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AssessmentsGraderPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEssay, setSelectedEssay] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [mentorFeedback, setMentorFeedback] = useState("");

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: essays, error: essayError } = await supabase
        .from("essay_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (essayError) throw essayError;

      const loadedSubmissions = essays || [];

      if (loadedSubmissions.length > 0) {
        const userIds = [...new Set(loadedSubmissions.map((s) => s.user_id).filter(Boolean))];

        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, name, profile_type")
            .in("id", userIds);

          loadedSubmissions.forEach((sub) => {
            const matchedProfile = profilesData?.find((p) => p.id === sub.user_id);
            sub.profiles = matchedProfile || { name: "Aluno Oculto" };
          });
        }
      }

      setSubmissions(loadedSubmissions);
    } catch (e: any) {
      console.error("Erro explícito no Supabase:", e.message || JSON.stringify(e));
      toast({
        title: "Erro no Banco",
        description: e.message || "Falha ao conectar com auth.users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleSelectEssay = (essay: any) => {
    setSelectedEssay(essay);
    setMentorFeedback(essay.mentor_notes || "");
  };

  const handleSaveFeedback = async () => {
    if (!selectedEssay || isSaving) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("essay_submissions")
        .update({
          mentor_notes: mentorFeedback,
          status: "reviewed",
        })
        .eq("id", selectedEssay.id);

      if (error) throw error;

      toast({ title: "Avaliação Registrada!", description: "O aluno foi notificado." });

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === selectedEssay.id ? { ...s, mentor_notes: mentorFeedback, status: "reviewed" } : s
        )
      );
    } catch (e: any) {
      toast({ title: "Falha ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSubmissions = submissions.filter(
    (s) =>
      s.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.theme?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = submissions.filter((s) => s.status !== "reviewed").length;
  const reviewedCount = submissions.filter((s) => s.status === "reviewed").length;

  return (
    <div className="pb-24 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Hero (hidden on mobile when essay selected) ── */}
      <div className={`${selectedEssay ? "hidden lg:block" : "block"}`}>
        <div className="relative rounded-[2rem] overflow-hidden bg-[#0d0d0f] border border-white/5 p-6">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 80% 10%, rgba(255,107,0,0.13) 0%, transparent 60%), radial-gradient(ellipse at 10% 90%, rgba(168,85,247,0.08) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400/85 mb-1">
                Staff · Maestro
              </p>
              <h1 className="text-2xl font-black italic tracking-tighter text-white leading-none">
                Central de Auditoria
              </h1>
              <p className="text-white/70 text-xs font-semibold mt-1">
                Revisão técnica de redações
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <div className="flex flex-col items-center bg-amber-500/10 border border-amber-500/20 rounded-2xl px-3 py-2 min-w-[60px]">
                <span className="text-lg font-black text-amber-400 leading-none">{pendingCount}</span>
                <span className="text-[8px] font-bold text-amber-400/80 uppercase tracking-wider mt-0.5">Fila</span>
              </div>
              <div className="flex flex-col items-center bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-3 py-2 min-w-[60px]">
                <span className="text-lg font-black text-emerald-400 leading-none">{reviewedCount}</span>
                <span className="text-[8px] font-bold text-emerald-400/80 uppercase tracking-wider mt-0.5">OK</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search (hidden on mobile when essay selected) ── */}
      <div className={`${selectedEssay ? "hidden lg:block" : "block"} relative`}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar estudante ou tema..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-12 bg-white shadow-sm border border-slate-200 rounded-2xl pl-11 pr-4 text-sm font-semibold text-slate-800 placeholder:text-slate-500 outline-none focus:border-orange-500/40 focus:bg-slate-50 transition-all"
        />
      </div>

      {/* ── Split layout: list + detail ── */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5">

        {/* === LIST (always shown on desktop, hidden on mobile when essay selected) === */}
        <div className={`${selectedEssay ? "hidden lg:block" : "block"} w-full lg:w-[320px] shrink-0`}>
          <div className="bg-white shadow-sm border border-slate-200 rounded-[1.5rem] overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-white shadow-sm">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-orange-400/85" />
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-600">
                  Fila de Avaliação ({filteredSubmissions.length})
                </p>
              </div>
            </div>

            <div className="max-h-[60vh] lg:max-h-[600px] overflow-y-auto scrollbar-hide">
              {loading ? (
                <div className="p-10 flex justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-orange-400" />
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="p-12 text-center">
                  <Inbox className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sem envios</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {filteredSubmissions.map((item) => {
                    const isSelected = selectedEssay?.id === item.id;
                    const isPending = item.status !== "reviewed";
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectEssay(item)}
                        className={`relative p-4 text-left border-b border-slate-100 last:border-0 transition-all touch-manipulation active:scale-[0.99] ${
                          isSelected
                            ? "bg-orange-500/8"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 rounded-r-full" />
                        )}
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <p className="font-black text-slate-800 text-xs italic leading-none truncate flex-1">
                            {item.profiles?.name || "Aluno"}
                          </p>
                          <Badge
                            className={`border-none font-black text-[8px] uppercase px-2 h-4 shrink-0 ${
                              isPending
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-emerald-500/15 text-emerald-400"
                            }`}
                          >
                            {isPending ? "Pendente" : "OK"}
                          </Badge>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 truncate italic mb-2 leading-tight">
                          "{item.theme}"
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">
                            {item.score} pts
                          </span>
                          <span className="text-[8px] font-bold text-slate-500 uppercase">
                            {format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === DETAIL === */}
        <div className={`${selectedEssay ? "block" : "hidden lg:block"} flex-1 min-w-0`}>
          {selectedEssay ? (
            <div className="bg-white shadow-sm border border-slate-200 rounded-[1.5rem] overflow-hidden">

              {/* Mobile back button */}
              <div className="lg:hidden p-3 border-b border-slate-100">
                <button
                  onClick={() => setSelectedEssay(null)}
                  className="flex items-center gap-2 text-slate-400 hover:text-slate-800 text-xs font-black uppercase tracking-widest h-9 px-3 rounded-xl bg-slate-50 active:scale-95 transition-all touch-manipulation"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar à fila
                </button>
              </div>

              <div className="p-5 lg:p-6 space-y-5">

                {/* Student header */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center font-black italic shrink-0">
                    {selectedEssay.profiles?.name?.charAt(0)?.toUpperCase() || "A"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-black text-slate-800 italic truncate leading-none">
                      {selectedEssay.profiles?.name}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                      Submissão acadêmica
                    </p>
                  </div>
                </div>

                {/* Theme block */}
                <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-4">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Tema da Redação
                  </p>
                  <h3 className="text-sm font-black text-slate-800 italic leading-snug">
                    {selectedEssay.theme}
                  </h3>
                </div>

                {/* Content */}
                <div className="relative bg-white shadow-sm border border-dashed border-slate-200 rounded-2xl p-5">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest absolute -top-2 left-4 bg-white px-2">
                    Transcrição
                  </p>
                  <div className="font-medium text-sm leading-relaxed italic text-slate-600 whitespace-pre-wrap max-h-[400px] overflow-y-auto scrollbar-hide">
                    {selectedEssay.content}
                  </div>
                </div>

                {/* AI Score */}
                <div className="relative bg-[#0d0d0f] border border-orange-500/15 rounded-2xl p-5 overflow-hidden">
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "radial-gradient(ellipse at 100% 0%, rgba(255,107,0,0.15) 0%, transparent 60%)",
                    }}
                  />
                  <div className="relative z-10 flex items-start justify-between mb-3">
                    <Badge className="bg-orange-500/20 text-orange-400 border-none font-black text-[9px] px-2 py-0.5 uppercase tracking-widest">
                      Laudo Aurora IA
                    </Badge>
                    <Sparkles className="h-4 w-4 text-orange-400 animate-pulse" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/55 mb-1">
                      Nota
                    </p>
                    <p className="text-5xl font-black italic text-white leading-none drop-shadow-xl">
                      {selectedEssay.score}
                    </p>
                  </div>
                  {selectedEssay.feedback && (
                    <p className="relative z-10 text-xs font-medium italic text-white/60 leading-relaxed mt-4 pt-4 border-t border-white/10">
                      "{selectedEssay.feedback}"
                    </p>
                  )}
                </div>

                {/* Mentor feedback */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2 ml-1">
                    <MessageSquare className="h-3 w-3 text-orange-400" /> Parecer do Maestro
                  </Label>
                  <Textarea
                    value={mentorFeedback}
                    onChange={(e) => setMentorFeedback(e.target.value)}
                    placeholder="Adicione suas notas pedagógicas ou orientações personalizadas..."
                    className="min-h-[140px] rounded-2xl bg-white shadow-sm border border-slate-200 p-4 font-medium italic text-sm text-slate-800 placeholder:text-slate-400 resize-none focus-visible:ring-orange-500/30 focus-visible:border-orange-500/30 transition-all"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveFeedback}
                      disabled={isSaving}
                      className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-2xl shadow-xl shadow-orange-500/30 border-none text-xs uppercase tracking-widest disabled:opacity-40"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Validar Revisão
                    </Button>
                    <Button
                      asChild
                      className="h-12 w-12 bg-white shadow-sm border border-slate-200 hover:border-orange-500/40 hover:text-orange-400 text-slate-500 rounded-2xl shrink-0"
                      title="Conversar com Aluno"
                    >
                      <Link href={`/dashboard/chat/${selectedEssay.user_id}`}>
                        <MessageSquare className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center text-center py-20 bg-white shadow-sm border border-dashed border-slate-200 rounded-[1.5rem] min-h-[400px]">
              <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                <FileText className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm font-black text-slate-500 italic uppercase tracking-widest">
                Selecione uma Submissão
              </p>
              <p className="text-[10px] font-bold text-slate-400 mt-2 max-w-xs uppercase tracking-wider">
                Clique em um aluno na fila para iniciar a auditoria
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
