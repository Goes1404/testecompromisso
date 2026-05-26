"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import {
  Bell,
  PlusCircle,
  Megaphone,
  AlertOctagon,
  Info,
  Loader2,
  Trash2,
  Target,
  Zap,
  FileCheck,
  MonitorPlay,
  Clock,
  Search,
  Sparkles,
  Layers,
  Inbox,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  target_group?: string;
  created_at: string;
  author_name?: string;
}

const priorityStyles: Record<"low" | "medium" | "high", { icon: any; label: string; color: string; bg: string; border: string }> = {
  low: { icon: Info, label: "Informativo", color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/25" },
  medium: { icon: Megaphone, label: "Importante", color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/25" },
  high: { icon: AlertOctagon, label: "Urgente", color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/25" },
};

const QUICK_TEMPLATES = [
  { title: "Sinal de Live Ativo", message: "Atenção: Nossa mentoria ao vivo está começando agora! Acesse o menu de Lives.", icon: MonitorPlay, priority: "medium" },
  { title: "Alerta de Documentação", message: "Prazo Crítico: O envio de documentos para o SiSU encerra em 24h. Verifique seu checklist.", icon: FileCheck, priority: "high" },
  { title: "Material Novo no Acervo", message: "Acabamos de liberar novos simulados e PDFs na Biblioteca Digital. Bons estudos!", icon: Zap, priority: "low" },
];

export default function CommunicationPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    priority: "low" as "low" | "medium" | "high",
    target_group: "all",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: annData } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (annData) setAnnouncements(annData);

      const { data: classData } = await supabase
        .from("classes")
        .select("id, name")
        .order("name");

      if (classData) setCohorts(classData);
    } catch (e) {
      console.error("Erro comunicação:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateAnnouncement = async (overrideData?: any) => {
    const dataToSubmit = overrideData || formData;
    if (!dataToSubmit.title?.trim() || !dataToSubmit.message?.trim() || !user) {
      toast({ title: "Dados Incompletos", description: "Preencha o título e a mensagem.", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const payload: any = {
        title: dataToSubmit.title,
        message: dataToSubmit.message,
        priority: dataToSubmit.priority,
        target_group: dataToSubmit.target_group,
        author_id: user.id,
      };

      let { data, error } = await supabase.from("announcements").insert([payload]).select().single();

      if (error && (error.code === "42703" || error.message.includes("target_group"))) {
        const { target_group, ...fallbackPayload } = payload;
        const retry = await supabase.from("announcements").insert([fallbackPayload]).select().single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        user_name: profile?.name || "Mentor",
        action: `Publicou aviso: ${dataToSubmit.title}`,
        entity_type: "announcement",
        entity_id: data.id,
      });

      fetch("/api/push/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "communication", announcementId: data.id }),
      }).catch(() => {});

      setAnnouncements((prev) => [data, ...prev]);
      setFormData({ title: "", message: "", priority: "low", target_group: "all" });
      setShowComposer(false);
      toast({ title: "Comunicado Fixado!", description: "A rede foi notificada." });
    } catch (e: any) {
      toast({ title: "Falha na Publicação", description: e.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const applyTemplate = (template: any) => {
    setFormData({
      title: template.title,
      message: template.message,
      priority: template.priority,
      target_group: "all",
    });
    setShowComposer(true);
    toast({ title: "Template Aplicado", description: "Revise e publique." });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (!error) {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Aviso arquivado." });
    }
  };

  const filtered = announcements.filter((a) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      (a.title || "").toLowerCase().includes(search) ||
      (a.message || "").toLowerCase().includes(search);
    const targetName = cohorts.find((c) => c.id === a.target_group)?.name || "";
    const matchesTarget = targetName.toLowerCase().includes(search);
    return matchesSearch || matchesTarget;
  });

  const urgentCount = announcements.filter((a) => a.priority === "high").length;

  return (
    <div className="pb-24 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Hero ── */}
      <div className="relative rounded-[2rem] overflow-hidden bg-[#0d0d0f] border border-white/5 p-6">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 80% 10%, rgba(255,107,0,0.13) 0%, transparent 60%), radial-gradient(ellipse at 10% 90%, rgba(245,158,11,0.08) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="h-3 w-3 text-orange-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400/85">
                Push · Mural
              </p>
            </div>
            <h1 className="text-2xl font-black italic tracking-tighter text-white leading-none">
              Comunicados
            </h1>
            <p className="text-white/70 text-xs font-semibold mt-1">
              Alertas em tempo real para a rede
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <div className="flex flex-col items-center bg-white/5 border border-white/8 rounded-2xl px-3 py-2 min-w-[60px]">
              <span className="text-lg font-black text-white leading-none">{announcements.length}</span>
              <span className="text-[8px] font-bold text-white/55 uppercase tracking-wider mt-0.5">Ativos</span>
            </div>
            <div className="flex flex-col items-center bg-red-500/10 border border-red-500/20 rounded-2xl px-3 py-2 min-w-[60px]">
              <span className="text-lg font-black text-red-400 leading-none">{urgentCount}</span>
              <span className="text-[8px] font-bold text-red-400/80 uppercase tracking-wider mt-0.5">Urgente</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Composer toggle ── */}
      {!showComposer && (
        <Button
          onClick={() => setShowComposer(true)}
          className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 text-xs uppercase tracking-widest border-none"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Novo Comunicado
        </Button>
      )}

      {/* ── Composer ── */}
      {showComposer && (
        <div className="bg-white border border-slate-200 shadow-xl rounded-[1.5rem] overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-orange-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                Nova Mensagem
              </p>
            </div>
            <button
              onClick={() => setShowComposer(false)}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider transition-colors"
            >
              Fechar
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                Assunto
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título do aviso..."
                className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold italic text-slate-800 placeholder:text-slate-400 outline-none focus:border-orange-500/40 focus:ring-4 focus:ring-orange-500/10 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                Corpo
              </label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Detalhes do comunicado..."
                className="rounded-xl min-h-[100px] bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 text-sm italic resize-none focus-visible:ring-orange-500/30 focus-visible:border-orange-500/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                  Prioridade
                </label>
                <Select value={formData.priority} onValueChange={(v: any) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger className="h-11 bg-white border-slate-200 text-slate-800 font-bold rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white">
                    <SelectItem value="low" className="font-bold text-slate-700 text-xs">Informativo</SelectItem>
                    <SelectItem value="medium" className="font-bold text-amber-500 text-xs">Importante</SelectItem>
                    <SelectItem value="high" className="font-bold text-red-500 text-xs">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                  Público
                </label>
                <Select value={formData.target_group} onValueChange={(v) => setFormData({ ...formData, target_group: v })}>
                  <SelectTrigger className="h-11 bg-white border-slate-200 text-slate-800 font-bold rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white max-h-60">
                    <SelectGroup>
                      <SelectLabel className="text-[9px] font-black uppercase text-slate-400 px-2 pt-2">Geral</SelectLabel>
                      <SelectItem value="all" className="font-bold italic text-slate-700 text-xs">Toda a Rede</SelectItem>
                      <SelectItem value="etec" className="font-bold italic text-slate-700 text-xs">ETEC</SelectItem>
                      <SelectItem value="enem" className="font-bold italic text-slate-700 text-xs">ENEM</SelectItem>
                      <SelectItem value="teacher" className="font-bold italic text-slate-700 text-xs">Staff</SelectItem>
                    </SelectGroup>
                    {cohorts.length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="text-[9px] font-black uppercase text-slate-400 px-2 pt-3 border-t border-slate-100 mt-1">Turmas</SelectLabel>
                        {cohorts.map((cohort) => (
                          <SelectItem key={cohort.id} value={cohort.id} className="font-bold italic text-slate-700 text-xs">
                            {cohort.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={() => handleCreateAnnouncement()}
              disabled={isCreating || !formData.title.trim()}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-2xl shadow-xl shadow-orange-500/30 border-none text-xs uppercase tracking-widest disabled:opacity-40"
            >
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {isCreating ? "Publicando..." : "Fixar Comunicado"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Quick templates ── */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 px-1 mb-2">
          Atalhos
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {QUICK_TEMPLATES.map((tpl, i) => (
            <button
              key={i}
              onClick={() => applyTemplate(tpl)}
              className="shrink-0 flex items-center gap-2.5 bg-white border border-slate-200 hover:border-orange-500/30 hover:bg-orange-50/50 rounded-2xl p-3 transition-all touch-manipulation active:scale-95 text-left min-w-[200px] max-w-[240px] shadow-sm"
            >
              <div className="h-8 w-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                <tpl.icon className="h-4 w-4 text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black text-slate-800 italic leading-tight truncate">{tpl.title}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Aplicar template</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Pesquisar no histórico..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-11 bg-white border border-slate-200 shadow-sm rounded-2xl pl-11 pr-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-orange-500/40 focus:ring-4 focus:ring-orange-500/10 transition-all"
        />
      </div>

      {/* ── Announcements list ── */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Sparkles className="h-7 w-7 text-orange-400 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sincronizando...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 rounded-[1.5rem]">
            <Inbox className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="font-black italic text-xs text-slate-400 uppercase tracking-widest">
              Nenhum aviso localizado
            </p>
          </div>
        ) : (
          filtered.map((ann) => {
            const styles = priorityStyles[ann.priority] || priorityStyles.low;
            const Icon = styles.icon;
            const targetCohort = cohorts.find((c) => c.id === ann.target_group);

            return (
              <div
                key={ann.id}
                className={`group relative bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden`}
              >
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    ann.priority === "high"
                      ? "bg-red-500"
                      : ann.priority === "medium"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                />
                <div className="p-4 pl-5">
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-xl ${styles.bg} border ${styles.border} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-4 w-4 ${styles.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-black text-slate-800 italic text-sm leading-snug flex-1">{ann.title}</h3>
                        <button
                          onClick={() => handleDelete(ann.id)}
                          className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-60 group-hover:opacity-100 flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <Badge className={`${styles.bg} ${styles.color} border ${styles.border} font-black text-[8px] uppercase px-2 h-4`}>
                          {styles.label}
                        </Badge>
                        {ann.target_group && (
                          <Badge className="bg-slate-100 text-slate-600 border border-slate-200 font-black text-[8px] uppercase px-2 h-4 flex items-center gap-1">
                            {targetCohort ? <Layers className="h-2 w-2" /> : <Target className="h-2 w-2" />}
                            {targetCohort ? targetCohort.name : ann.target_group === "all" ? "Toda Rede" : ann.target_group}
                          </Badge>
                        )}
                        <span className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                          <Clock className="h-2.5 w-2.5" />
                          {format(new Date(ann.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs text-slate-600 leading-relaxed font-medium italic">"{ann.message}"</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
