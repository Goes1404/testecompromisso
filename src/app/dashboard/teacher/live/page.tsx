
"use client";

import { useState, useEffect } from "react";
import {
  PlusCircle,
  Calendar,
  Clock,
  Loader2,
  Trash2,
  Radio,
  Link as LinkIcon,
  AlertCircle,
  Inbox,
  Pencil,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { idDoYoutube, linkExternoSeguro, normalizarSala, rotuloDasTurmas, rotuloDoStatus } from "@/lib/lives";

const FORM_VAZIO = {
  title: "",
  description: "",
  date: "",
  time: "",
  meet_link: "",
  youtube_url: "",
  /** Salas normalizadas ("1".."12"). Vazio = todas as turmas. */
  turmas: [] as string[],
};

type OpcaoDeTurma = { sala: string; curso: string | null; alunos: number };

/**
 * Sem policy de escrita em `lives` o Supabase recusa o INSERT com 42501 e,
 * no UPDATE/DELETE, simplesmente não acha linha nenhuma — sem erro. Os dois
 * casos precisam virar a mesma mensagem, senão o professor vê "Sala removida"
 * e a sala continua lá.
 */
const SEM_PERMISSAO = "Sua conta não tem permissão para alterar aulas ao vivo. Fale com a coordenação.";

export default function ManageLivePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lives, setLives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState(FORM_VAZIO);
  // null = ainda não carregou ou a migration de turmas não foi aplicada. Nesse
  // caso a aula sai para todas as turmas e o campo `turmas` nem é enviado —
  // mandar uma coluna que não existe derrubaria o agendamento inteiro.
  const [opcoesDeTurma, setOpcoesDeTurma] = useState<OpcaoDeTurma[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("turmas_para_lives").then(({ data, error }) => {
      if (!error && Array.isArray(data)) setOpcoesDeTurma(data as OpcaoDeTurma[]);
    });
  }, [user]);

  const alternarTurma = (sala: string) =>
    setFormData((f) => ({
      ...f,
      turmas: f.turmas.includes(sala) ? f.turmas.filter((t) => t !== sala) : [...f.turmas, sala],
    }));

  const selecionarCurso = (curso: string) => {
    const salas = (opcoesDeTurma ?? []).filter((o) => o.curso === curso).map((o) => o.sala);
    setFormData((f) => ({ ...f, turmas: salas }));
  };

  const abrirNovo = () => {
    setEditingId(null);
    setFormData(FORM_VAZIO);
    setIsCreateOpen(true);
  };

  const abrirEdicao = (live: any) => {
    const d = live.start_time ? new Date(live.start_time) : null;
    setEditingId(live.id);
    setFormData({
      title: live.title || "",
      description: live.description || "",
      date: d ? format(d, "yyyy-MM-dd") : "",
      time: d ? format(d, "HH:mm") : "",
      meet_link: live.meet_link || "",
      youtube_url: live.youtube_url || (live.youtube_id ? `https://youtu.be/${live.youtube_id}` : ""),
      turmas: Array.isArray(live.turmas)
        ? live.turmas.map(normalizarSala).filter((t: string | null): t is string => !!t)
        : [],
    });
    setIsCreateOpen(true);
  };

  async function fetchLives() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lives")
        .select("*")
        .order("start_time", { ascending: false });

      if (!error && data) setLives(data);
    } catch (err) {
      console.error("Erro ao buscar lives:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLives();
  }, [user]);

  const handleSaveLive = async () => {
    if (!formData.title || !formData.date || !formData.time || !user || isSubmitting) {
      if (!isSubmitting)
        toast({
          title: "Dados Incompletos",
          description: "Título, data e horário são obrigatórios.",
          variant: "destructive",
        });
      return;
    }

    const youtubeUrl = formData.youtube_url.trim();
    const youtubeId = idDoYoutube(youtubeUrl);
    if (youtubeUrl && !youtubeId) {
      toast({
        title: "Link do YouTube não reconhecido",
        description: "Cole o link da transmissão (youtube.com/live/… ou youtu.be/…), não o do canal.",
        variant: "destructive",
      });
      return;
    }

    const meetUrl = formData.meet_link.trim();
    if (meetUrl && !linkExternoSeguro(meetUrl)) {
      toast({
        title: "Link do Meet inválido",
        description: "Cole o link completo, começando com https://",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const start_time = new Date(`${formData.date}T${formData.time}`).toISOString();
      const campos = {
        title: formData.title,
        description: formData.description,
        start_time,
        meet_link: meetUrl || null,
        youtube_url: youtubeId ? youtubeUrl : null,
        youtube_id: youtubeId,
        ...(opcoesDeTurma ? { turmas: formData.turmas } : {}),
      };

      if (editingId) {
        const { data, error } = await supabase.from("lives").update(campos).eq("id", editingId).select("id");
        if (error) throw error;
        if (!data?.length) throw new Error(SEM_PERMISSAO);
      } else {
        const { error } = await supabase.from("lives").insert({
          ...campos,
          teacher_id: user.id,
          teacher_name: user.user_metadata?.full_name || "Mentor da Rede",
          status: "scheduled",
        });
        if (error) throw error;
      }

      toast({
        title: editingId ? "Aula atualizada" : "Aula agendada!",
        description: youtubeId
          ? "Os alunos vão assistir pelo YouTube dentro da plataforma."
          : "Adicione o link do YouTube antes da aula para todos conseguirem assistir.",
      });
      setIsCreateOpen(false);
      setEditingId(null);
      setFormData(FORM_VAZIO);
      fetchLives();
    } catch (error: any) {
      toast({
        title: editingId ? "Erro ao salvar" : "Erro ao agendar",
        description: error?.code === "42501" ? SEM_PERMISSAO : error?.message || "Ocorreu um erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    const { data, error } = await supabase.from("lives").delete().eq("id", id).select("id");
    if (!error && data?.length) {
      setLives((prev) => prev.filter((live) => live.id !== id));
      toast({ title: "Sala removida" });
    } else {
      toast({
        title: "Não foi possível remover",
        description: error?.message || SEM_PERMISSAO,
        variant: "destructive",
      });
    }
    setDeletingId(null);
  };

  const upcomingCount = lives.filter((l) => new Date(l.start_time) >= new Date()).length;
  const liveNow = lives.filter((l) => l.status === "live").length;

  return (
    <div className="pb-24 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Hero ── */}
      <div className="relative rounded-[2rem] overflow-hidden bg-[#0d0d0f] border border-white/5 p-6">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 80% 10%, rgba(168,85,247,0.13) 0%, transparent 60%), radial-gradient(ellipse at 10% 90%, rgba(239,68,68,0.10) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Radio className="h-3 w-3 text-purple-400" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400/70">
              Studio Virtual
            </p>
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter text-white leading-none">
            Lives & Mentorias
          </h1>
          <p className="text-white/65 text-xs font-semibold mt-1">
            Gerencie reuniões (Meet/YouTube)
          </p>

          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="flex flex-col items-center bg-white/5 border border-white/8 rounded-2xl py-2.5">
              <span className="text-lg font-black text-white leading-none">{lives.length}</span>
              <span className="text-[8px] font-bold text-white/55 uppercase tracking-wider mt-0.5">Total</span>
            </div>
            <div className="flex flex-col items-center bg-purple-500/10 border border-purple-500/20 rounded-2xl py-2.5">
              <span className="text-lg font-black text-purple-400 leading-none">{upcomingCount}</span>
              <span className="text-[8px] font-bold text-purple-400/80 uppercase tracking-wider mt-0.5">Futuras</span>
            </div>
            <div className="flex flex-col items-center bg-red-500/10 border border-red-500/20 rounded-2xl py-2.5">
              <span className="text-lg font-black text-red-400 leading-none">{liveNow}</span>
              <span className="text-[8px] font-bold text-red-400/80 uppercase tracking-wider mt-0.5">No ar</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(aberto) => {
          setIsCreateOpen(aberto);
          if (!aberto) setEditingId(null);
        }}
      >
        <DialogTrigger asChild>
          <Button onClick={abrirNovo} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-slate-800 font-black rounded-2xl shadow-xl shadow-orange-500/20 text-xs uppercase tracking-widest border-none">
            <PlusCircle className="h-4 w-4 mr-2" />
            Agendar Aula
          </Button>
        </DialogTrigger>
        <DialogContent className="rounded-[2rem] p-0 bg-white border-slate-200 w-[95vw] sm:w-full max-w-lg max-h-[95vh] overflow-y-auto shadow-2xl">
          <DialogHeader className="p-5 border-b border-slate-100">
            <DialogTitle className="text-lg font-black italic text-slate-800 uppercase tracking-tighter">
              {editingId ? "Editar Aula" : "Nova Aula ao Vivo"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-5 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                Título da Aula
              </Label>
              <input
                placeholder="Ex: Mentoria - Carreira"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={isSubmitting}
                className="w-full h-11 bg-white shadow-sm border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-800 placeholder:text-slate-500 outline-none focus:border-orange-500/40 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Data</Label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full h-11 bg-white shadow-sm border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-800 outline-none focus:border-orange-500/40 transition-all [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Horário</Label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full h-11 bg-white shadow-sm border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-800 outline-none focus:border-orange-500/40 transition-all [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                Transmissão no YouTube
              </Label>
              <div className="relative">
                <Youtube className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-red-500 pointer-events-none" />
                <input
                  placeholder="https://youtube.com/live/..."
                  value={formData.youtube_url}
                  onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full h-11 bg-white shadow-sm border border-slate-200 rounded-xl pl-10 pr-3 text-sm font-bold text-slate-800 placeholder:text-slate-500 outline-none focus:border-orange-500/40 transition-all"
                />
              </div>
              <p className="text-[10px] font-medium text-slate-500 leading-snug ml-1">
                Crie a transmissão como <b>Não listada</b> no YouTube Studio, pelo computador, e cole o link aqui. Todos os alunos assistem dentro da plataforma, sem limite de vagas. Pode deixar para colar depois, em Editar.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                Sala do Meet (opcional)
              </Label>
              <div className="relative">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                <input
                  placeholder="https://meet.google.com/..."
                  value={formData.meet_link}
                  onChange={(e) => setFormData({ ...formData, meet_link: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full h-11 bg-white shadow-sm border border-slate-200 rounded-xl pl-10 pr-3 text-sm font-bold text-slate-800 placeholder:text-slate-500 outline-none focus:border-orange-500/40 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                Quem assiste
              </Label>
              {opcoesDeTurma === null ? (
                <p className="text-[11px] font-medium text-slate-500 ml-1">Todas as turmas.</p>
              ) : (
                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { rotulo: "Todas as turmas", ativo: formData.turmas.length === 0, onClick: () => setFormData((f) => ({ ...f, turmas: [] })) },
                      ...["ETEC", "ENEM"]
                        .filter((c) => opcoesDeTurma.some((o) => o.curso === c))
                        .map((c) => {
                          const salas = opcoesDeTurma.filter((o) => o.curso === c).map((o) => o.sala);
                          const ativo = salas.length > 0 && formData.turmas.length === salas.length && salas.every((s) => formData.turmas.includes(s));
                          return { rotulo: `Todo o ${c}`, ativo, onClick: () => selecionarCurso(c) };
                        }),
                    ].map((b) => (
                      <button
                        key={b.rotulo}
                        type="button"
                        onClick={b.onClick}
                        disabled={isSubmitting}
                        className={`h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          b.ativo ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {b.rotulo}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {opcoesDeTurma.map((o) => {
                      const marcada = formData.turmas.includes(o.sala);
                      return (
                        <button
                          key={o.sala}
                          type="button"
                          onClick={() => alternarTurma(o.sala)}
                          disabled={isSubmitting}
                          aria-pressed={marcada}
                          className={`h-11 rounded-lg border text-left px-2 transition-all ${
                            marcada ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <span className="block text-xs font-black text-slate-800 leading-none">Sala {o.sala}</span>
                          <span className="block text-[9px] font-bold text-slate-500 mt-0.5">
                            {o.curso ?? "—"} · {o.alunos}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 leading-snug">
                    {formData.turmas.length === 0
                      ? "Todos os alunos veem a aula, inclusive quem está sem sala no cadastro."
                      : `Só ${rotuloDasTurmas(formData.turmas)} veem a aula e entram na chamada. Aluno sem sala no cadastro não vê.`}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                Pauta (opcional)
              </Label>
              <textarea
                placeholder="O que será discutido..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={isSubmitting}
                className="w-full min-h-[70px] bg-white shadow-sm border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-500 outline-none focus:border-orange-500/40 transition-all resize-none"
              />
            </div>
          </div>
          <DialogFooter className="p-5 pt-0 flex-col gap-2">
            <Button
              onClick={handleSaveLive}
              disabled={isSubmitting || !formData.title}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-800 font-black rounded-2xl shadow-xl shadow-orange-500/30 border-none text-xs uppercase tracking-widest disabled:opacity-40"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : null}
              {editingId ? "Salvar Alterações" : "Publicar na Agenda"}
            </Button>
            <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider text-center">
              <AlertCircle className="h-3 w-3 shrink-0" /> O Meet grátis aceita só 100 pessoas por 60 minutos
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Lives list ── */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-orange-400" />
          </div>
        ) : lives.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 rounded-[1.5rem]">
            <Inbox className="h-8 w-8 mx-auto mb-2 text-white/15" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Nenhuma aula agendada
            </p>
          </div>
        ) : (
          lives.map((live) => {
            const isLive = live.status === "live";
            const d = new Date(live.start_time);
            const dayNum = d.getDate();
            const monthShort = format(d, "MMM", { locale: ptBR }).toUpperCase();

            return (
              <div
                key={live.id}
                className="group bg-white shadow-sm border border-slate-200 hover:border-purple-500/20 rounded-2xl p-3.5 transition-all"
              >
                <div className="flex items-start gap-3">
                  {/* Date anchor */}
                  <div
                    className={`flex flex-col items-center justify-center min-w-[44px] py-1 px-2 rounded-xl shrink-0 border ${
                      isLive
                        ? "bg-red-500/20 border-red-500/30 animate-pulse"
                        : "bg-white shadow-sm border-slate-200"
                    }`}
                  >
                    <span className={`text-xl font-black italic leading-none ${isLive ? "text-red-400" : "text-slate-800"}`}>
                      {String(dayNum).padStart(2, "0")}
                    </span>
                    <span
                      className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${
                        isLive ? "text-red-400/70" : "text-purple-400/70"
                      }`}
                    >
                      {monthShort}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {format(d, "HH:mm")}
                      </span>
                      <Badge
                        className={`border font-black text-[8px] uppercase px-1.5 h-4 ${
                          isLive
                            ? "bg-red-500/15 text-red-400 border-red-500/25 animate-pulse"
                            : "bg-purple-500/15 text-purple-400 border-purple-500/25"
                        }`}
                      >
                        {isLive ? "🔴 No ar" : rotuloDoStatus(live.status)}
                      </Badge>
                    </div>
                    <p className="text-sm font-black text-slate-800 italic leading-snug truncate">
                      {live.title}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold truncate mt-1">
                      {rotuloDasTurmas(live.turmas)}
                    </p>
                    {live.youtube_id ? (
                      <p className="text-[10px] text-red-500/80 font-bold truncate mt-1 flex items-center gap-1">
                        <Youtube className="h-2.5 w-2.5" />
                        Transmissão no YouTube pronta
                      </p>
                    ) : (
                      <p className="text-[10px] text-amber-600 font-bold truncate mt-1 flex items-center gap-1">
                        <AlertCircle className="h-2.5 w-2.5" />
                        Sem link do YouTube: só cabem 100 no Meet
                      </p>
                    )}
                    {live.meet_link && (
                      <p className="text-[10px] text-purple-400/70 font-bold truncate mt-1 flex items-center gap-1">
                        <LinkIcon className="h-2.5 w-2.5" />
                        {live.meet_link}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1.5 mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleDelete(live.id)}
                    disabled={deletingId === live.id}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all active:scale-95 disabled:opacity-40 touch-manipulation"
                    title="Excluir"
                  >
                    {deletingId === live.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    onClick={() => abrirEdicao(live)}
                    className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95 touch-manipulation"
                    title="Editar"
                  >
                    <Pencil className="h-3 w-3" />
                    Editar
                  </button>
                  <Link
                    href={`/dashboard/teacher/live/${live.id}`}
                    className="h-8 px-4 rounded-lg flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition-all active:scale-95 touch-manipulation"
                  >
                    Studio
                    <Radio className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
