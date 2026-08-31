"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import {
  Flame, Megaphone, ClipboardList, PlusCircle, X, Loader2, Trash2, CalendarClock,
  CheckCircle2, Circle, ImagePlus, Pin, Users, AlertTriangle, Inbox, EyeOff, Eye,
  BellRing, BellOff,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MuralPost, MuralRascunho, MuralTipo, RASCUNHO_VAZIO, TIPOS,
  lerPost, ordenarMural, podePublicar, prazoDoTrabalho, questoesDeTexto, avisoDoPost,
} from "@/lib/mural";

const ESTILO: Record<MuralTipo, { icon: any; cor: string; bg: string; borda: string; brilho: string }> = {
  anuncio:  { icon: Megaphone,     cor: "text-sky-400",    bg: "bg-sky-500/12",    borda: "border-sky-500/25",    brilho: "rgba(56,189,248,0.14)" },
  trabalho: { icon: ClipboardList, cor: "text-orange-400", bg: "bg-orange-500/12", borda: "border-orange-500/25", brilho: "rgba(255,107,0,0.16)" },
};

/** Nome de arquivo seguro para o Storage: acento e espaço quebram a URL pública. */
function nomeDeArquivo(original: string) {
  const ext = (original.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "jpg"}`;
}

export default function MuralPage() {
  const { user, profile, userRole } = useAuth();
  const { toast } = useToast();
  const inputImagem = useRef<HTMLInputElement>(null);

  const publica = podePublicar(userRole);

  const [posts, setPosts]       = useState<MuralPost[]>([]);
  const [feitos, setFeitos]     = useState<Set<string>>(new Set());
  const [contagem, setContagem] = useState<Record<string, number>>({});
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | MuralTipo>("todos");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [composer, setComposer]   = useState(false);
  const [rascunho, setRascunho]   = useState<MuralRascunho>(RASCUNHO_VAZIO);
  const [textoQuestoes, setTextoQuestoes] = useState("");
  const [salvando, setSalvando]   = useState(false);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [avisando, setAvisando] = useState<string | null>(null);
  const [avisarAoPublicar, setAvisarAoPublicar] = useState(false);

  const buscar = useCallback(async () => {
    setCarregando(true);
    try {
      const [{ data: linhas, error }, { data: marcas }] = await Promise.all([
        supabase.from("mural_posts").select("*").order("created_at", { ascending: false }),
        supabase.from("mural_conclusoes").select("post_id, user_id"),
      ]);
      if (error) throw error;
      setPosts((linhas || []).map(lerPost));

      // Uma consulta serve aos dois papéis: a RLS devolve só as próprias marcas
      // ao aluno e todas a quem publica, então `feitos` e `contagem` saem daqui
      // sem uma segunda ida ao banco.
      const meus = new Set<string>();
      const contador: Record<string, number> = {};
      for (const m of marcas || []) {
        contador[m.post_id] = (contador[m.post_id] || 0) + 1;
        if (m.user_id === user?.id) meus.add(m.post_id);
      }
      setFeitos(meus);
      setContagem(contador);
    } catch (e: any) {
      toast({ title: "Não deu para carregar o mural", description: e.message, variant: "destructive" });
    } finally {
      setCarregando(false);
    }
  }, [user?.id, toast]);

  useEffect(() => { if (user) buscar(); }, [user, buscar]);

  const visiveis = useMemo(
    () => ordenarMural(posts).filter(p => filtro === "todos" || p.tipo === filtro),
    [posts, filtro],
  );

  const abertos = useMemo(
    () => posts.filter(p => p.ativo && p.tipo === "trabalho" && !prazoDoTrabalho(p.entrega_em)?.encerrado).length,
    [posts],
  );

  /* ── Aluno marca "já fiz" ─────────────────────────────────────────────── */
  const alternarFeito = async (postId: string) => {
    if (!user) return;
    const jaEstava = feitos.has(postId);

    // Otimista: o toque tem que responder na hora. Se o banco recusar, volta.
    setFeitos(prev => {
      const proximo = new Set(prev);
      jaEstava ? proximo.delete(postId) : proximo.add(postId);
      return proximo;
    });
    setContagem(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + (jaEstava ? -1 : 1)) }));

    const { error } = jaEstava
      ? await supabase.from("mural_conclusoes").delete().eq("post_id", postId).eq("user_id", user.id)
      : await supabase.from("mural_conclusoes").insert({ post_id: postId, user_id: user.id });

    if (error) {
      setFeitos(prev => {
        const proximo = new Set(prev);
        jaEstava ? proximo.add(postId) : proximo.delete(postId);
        return proximo;
      });
      setContagem(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + (jaEstava ? 1 : -1)) }));
      toast({ title: "Não deu para salvar", description: error.message, variant: "destructive" });
    }
  };

  /* ── Publicação ───────────────────────────────────────────────────────── */
  const enviarImagem = async (arquivo: File) => {
    if (!user) return;
    if (arquivo.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "O limite é 5 MB — o aluno abre isso na rede móvel.", variant: "destructive" });
      return;
    }
    setEnviandoImagem(true);
    try {
      const caminho = `${user.id}/${nomeDeArquivo(arquivo.name)}`;
      const { error } = await supabase.storage.from("mural").upload(caminho, arquivo, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("mural").getPublicUrl(caminho);
      setRascunho(r => ({ ...r, imagem_url: data.publicUrl }));
    } catch (e: any) {
      toast({ title: "Falha no upload", description: e.message, variant: "destructive" });
    } finally {
      setEnviandoImagem(false);
      if (inputImagem.current) inputImagem.current.value = "";
    }
  };

  const publicar = async () => {
    if (!user) return;
    if (!rascunho.titulo.trim() || !rascunho.descricao.trim()) {
      toast({ title: "Falta preencher", description: "Título e descrição são obrigatórios.", variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        tipo: rascunho.tipo,
        titulo: rascunho.titulo.trim(),
        tema: rascunho.tema?.trim() || null,
        descricao: rascunho.descricao.trim(),
        questoes: rascunho.tipo === "trabalho" ? questoesDeTexto(textoQuestoes) : [],
        instrucoes: rascunho.instrucoes?.trim() || null,
        entrega_em: rascunho.tipo === "trabalho" ? rascunho.entrega_em || null : null,
        imagem_url: rascunho.imagem_url,
        destaque: rascunho.destaque,
        autor_id: user.id,
        autor_nome: profile?.name || "Equipe Compromisso",
      };
      const { data, error } = await supabase.from("mural_posts").insert(payload).select().single();
      if (error) throw error;

      const publicado = lerPost(data);
      setPosts(prev => [publicado, ...prev]);
      setRascunho(RASCUNHO_VAZIO);
      setTextoQuestoes("");
      setComposer(false);
      toast({ title: "Publicado no mural!", description: "Todos os alunos já estão vendo." });

      // O aviso vai depois do post existir: se ele falhar, o que ficou no ar é
      // um post sem aviso — recuperável pelo botão do card. Na ordem inversa,
      // uma falha na publicação deixaria um aviso apontando para nada.
      if (avisarAoPublicar) {
        await avisarTodos(publicado, false);
        setAvisarAoPublicar(false);
      }
    } catch (e: any) {
      toast({ title: "Falha ao publicar", description: e.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  /**
   * Dispara o comunicado global: cria o `announcements` de prioridade alta (que
   * é o que o banner do dashboard lê) e pede o push. O texto sai de
   * `avisoDoPost`, para o banner e a notificação dizerem a mesma coisa.
   *
   * Grava `avisado_em` para o botão não ser clicável duas vezes — dois cliques
   * seriam dois banners e dois pushes para os mesmos alunos. Se a coluna ainda
   * não existir no banco (migration não aplicada), o aviso sai do mesmo jeito e
   * só a memória se perde: melhor isso do que o botão inteiro falhar.
   */
  const avisarTodos = async (post: MuralPost, confirmar = true) => {
    if (!user) return;
    if (post.avisado_em) return;
    if (confirmar && !confirm(`Avisar TODOS os alunos sobre "${post.titulo}"?\n\nEles recebem um aviso no painel e uma notificação no celular. Isso não dá para desfazer.`)) return;

    setAvisando(post.id);
    try {
      const aviso = avisoDoPost(post);
      const { data, error } = await supabase
        .from("announcements")
        .insert({ ...aviso, target_group: "all", author_id: user.id })
        .select()
        .single();
      if (error) throw error;

      // O push é o extra: quem não tem notificação ligada continua vendo o
      // banner. Falhar aqui não pode desfazer um aviso que já foi publicado.
      fetch("/api/push/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "communication", announcementId: data.id }),
      }).catch(() => {});

      const agora = new Date().toISOString();
      const marcado = await supabase.from("mural_posts").update({ avisado_em: agora }).eq("id", post.id);
      if (!marcado.error) {
        setPosts(prev => prev.map(p => (p.id === post.id ? { ...p, avisado_em: agora } : p)));
      }

      toast({ title: "Todo mundo avisado!", description: "O aviso está no painel dos alunos e a notificação foi enviada." });
    } catch (e: any) {
      toast({ title: "Falha ao avisar", description: e.message, variant: "destructive" });
    } finally {
      setAvisando(null);
    }
  };

  const arquivar = async (post: MuralPost) => {
    const { error } = await supabase.from("mural_posts").update({ ativo: !post.ativo }).eq("id", post.id);
    if (error) return toast({ title: "Falha", description: error.message, variant: "destructive" });
    setPosts(prev => prev.map(p => (p.id === post.id ? { ...p, ativo: !p.ativo } : p)));
  };

  const apagar = async (post: MuralPost) => {
    if (!confirm(`Apagar "${post.titulo}" do mural? Isso não volta.`)) return;
    const { error } = await supabase.from("mural_posts").delete().eq("id", post.id);
    if (error) return toast({ title: "Falha", description: error.message, variant: "destructive" });
    setPosts(prev => prev.filter(p => p.id !== post.id));
    toast({ title: "Removido do mural" });
  };

  /* ── Tela ─────────────────────────────────────────────────────────────── */
  return (
    <div className="pb-28 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Hero */}
      <div className="relative rounded-[2rem] overflow-hidden bg-[#0d0d0f] border border-white/5 p-5">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at 85% 5%, rgba(255,107,0,0.18) 0%, transparent 60%), radial-gradient(ellipse at 5% 95%, rgba(56,189,248,0.08) 0%, transparent 60%)",
        }} />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-3 w-3 text-orange-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400/80">Anúncios · Trabalhos</p>
            </div>
            <h1 className="text-2xl font-black italic tracking-tighter text-white leading-none">Mural</h1>
            <p className="text-white/60 text-xs font-semibold mt-1">
              {publica ? "O que você publica aqui chega a todos os alunos" : "Tudo que a escola pediu, num lugar só"}
            </p>
          </div>
          <div className="flex flex-col items-center bg-orange-500/10 border border-orange-500/20 rounded-2xl px-3 py-2 min-w-[52px] shrink-0">
            <span className="text-lg font-black text-orange-400 leading-none">{abertos}</span>
            <span className="text-[7px] font-bold text-orange-400/70 uppercase tracking-wider mt-0.5 text-center">Em aberto</span>
          </div>
        </div>
      </div>

      {publica && !composer && (
        <button
          onClick={() => setComposer(true)}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.97] text-white font-black rounded-2xl shadow-xl shadow-orange-500/25 text-xs uppercase tracking-widest transition-all touch-manipulation"
          style={{ height: 52 }}
        >
          <PlusCircle className="h-4 w-4" />
          Publicar no mural
        </button>
      )}

      {publica && composer && (
        <Composer
          rascunho={rascunho} setRascunho={setRascunho}
          textoQuestoes={textoQuestoes} setTextoQuestoes={setTextoQuestoes}
          salvando={salvando} enviandoImagem={enviandoImagem}
          avisarTodos={avisarAoPublicar} setAvisarTodos={setAvisarAoPublicar}
          inputImagem={inputImagem} onImagem={enviarImagem}
          onPublicar={publicar} onFechar={() => setComposer(false)}
        />
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        {([["todos", "Tudo"], ["trabalho", TIPOS.trabalho.plural], ["anuncio", TIPOS.anuncio.plural]] as const).map(([valor, rotulo]) => (
          <button
            key={valor}
            onClick={() => setFiltro(valor as any)}
            className={`flex-1 h-9 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all touch-manipulation active:scale-95 border ${
              filtro === valor
                ? "bg-white/10 text-white border-white/20"
                : "bg-[#0d0d0f] text-white/40 border-white/6 hover:text-white/70"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
          </div>
        ) : visiveis.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Inbox className="h-8 w-8 text-white/15" />
            <p className="text-xs font-bold text-white/40">Nada no mural por enquanto.</p>
          </div>
        ) : (
          visiveis.map(post => (
            <CardDoMural
              key={post.id}
              post={post}
              feito={feitos.has(post.id)}
              quantosFizeram={contagem[post.id] || 0}
              podeModerar={publica && (post.autor_id === user?.id || userRole === "admin" || userRole === "staff")}
              ehAluno={!publica}
              avisando={avisando === post.id}
              onAvisarTodos={() => avisarTodos(post)}
              onAlternarFeito={() => alternarFeito(post.id)}
              onArquivar={() => arquivar(post)}
              onApagar={() => apagar(post)}
              onAbrirImagem={setLightbox}
            />
          ))
        )}
      </div>

      {/* Cartaz em tamanho cheio */}
      <Dialog open={!!lightbox} onOpenChange={aberto => !aberto && setLightbox(null)}>
        <DialogContent className="max-w-3xl bg-[#0d0d0f] border-white/10 p-2">
          <DialogTitle className="sr-only">Imagem do anúncio</DialogTitle>
          {lightbox && (
            <div className="relative w-full" style={{ height: "min(80vh, 900px)" }}>
              <Image src={lightbox} alt="Imagem do anúncio" fill className="object-contain rounded-xl" sizes="(max-width: 768px) 100vw, 768px" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Card ──────────────────────────────────────────────────────────────── */
function CardDoMural({
  post, feito, quantosFizeram, podeModerar, ehAluno, avisando,
  onAvisarTodos, onAlternarFeito, onArquivar, onApagar, onAbrirImagem,
}: {
  post: MuralPost;
  feito: boolean;
  quantosFizeram: number;
  podeModerar: boolean;
  ehAluno: boolean;
  avisando: boolean;
  onAvisarTodos: () => void;
  onAlternarFeito: () => void;
  onArquivar: () => void;
  onApagar: () => void;
  onAbrirImagem: (url: string) => void;
}) {
  const s = ESTILO[post.tipo];
  const prazo = prazoDoTrabalho(post.entrega_em);
  const quente = post.destaque || !!prazo?.urgente;

  return (
    <div
      className={`bg-[#0d0d0f] border rounded-[1.5rem] overflow-hidden transition-all ${
        quente ? "border-orange-500/30" : "border-white/6"
      } ${post.ativo ? "" : "opacity-55"}`}
      style={quente ? { boxShadow: `0 0 0 1px ${s.brilho}, 0 12px 40px -18px ${s.brilho}` } : undefined}
    >
      {post.imagem_url && (
        <button
          onClick={() => onAbrirImagem(post.imagem_url!)}
          className="relative block w-full aspect-[16/10] bg-black/40 group"
          aria-label="Ver imagem em tamanho cheio"
        >
          <Image
            src={post.imagem_url}
            alt={post.titulo}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 640px"
          />
        </button>
      )}

      <div className="p-4 space-y-3">
        {/* Cabeçalho */}
        <div className="flex items-start gap-3">
          <div className={`h-9 w-9 rounded-xl ${s.bg} border ${s.borda} flex items-center justify-center shrink-0`}>
            <s.icon className={`h-4 w-4 ${s.cor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-black italic text-white leading-tight">{post.titulo}</h2>
            {post.tema && <p className="text-[11px] font-semibold text-white/45 mt-0.5">{post.tema}</p>}
          </div>
          {podeModerar && (
            <div className="flex gap-1 shrink-0">
              <button
                onClick={onArquivar}
                title={post.ativo ? "Tirar do mural" : "Voltar ao mural"}
                className="h-8 w-8 rounded-xl bg-white/5 text-white/40 hover:text-white/80 flex items-center justify-center transition-all active:scale-90"
              >
                {post.ativo ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={onApagar}
                title="Apagar"
                className="h-8 w-8 rounded-xl bg-white/5 text-white/40 hover:text-red-400 flex items-center justify-center transition-all active:scale-90"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Selos */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 ${s.bg} ${s.cor} border ${s.borda} font-black text-[8px] uppercase px-2 h-4 rounded-full`}>
            {TIPOS[post.tipo].label}
          </span>
          {post.destaque && (
            <span className="inline-flex items-center gap-1 bg-orange-500/15 text-orange-400 border border-orange-500/30 font-black text-[8px] uppercase px-2 h-4 rounded-full">
              <Pin className="h-2 w-2" /> Fixado
            </span>
          )}
          {prazo && (
            <span className={`inline-flex items-center gap-1 font-black text-[8px] uppercase px-2 h-4 rounded-full border ${
              prazo.encerrado ? "bg-white/5 text-white/40 border-white/10"
              : prazo.urgente ? "bg-red-500/15 text-red-400 border-red-500/30"
              : "bg-white/5 text-white/55 border-white/10"
            }`}>
              {prazo.urgente && !prazo.encerrado ? <AlertTriangle className="h-2 w-2" /> : <CalendarClock className="h-2 w-2" />}
              {prazo.rotulo}
            </span>
          )}
          {!post.ativo && (
            <span className="inline-flex items-center gap-1 bg-white/5 text-white/40 border border-white/10 font-black text-[8px] uppercase px-2 h-4 rounded-full">
              Fora do mural
            </span>
          )}
        </div>

        {/* Corpo */}
        <p className="text-xs text-white/65 leading-relaxed font-medium whitespace-pre-line">{post.descricao}</p>

        {post.questoes.length > 0 && (
          <div className="rounded-xl bg-white/[0.03] border border-white/8 p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40 mb-2.5">
              Pesquise e responda
            </p>
            <ol className="space-y-2">
              {post.questoes.map((q, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className={`shrink-0 h-4 w-4 rounded-md ${s.bg} ${s.cor} border ${s.borda} flex items-center justify-center text-[8px] font-black mt-0.5`}>
                    {i + 1}
                  </span>
                  <span className="text-xs text-white/70 leading-relaxed font-medium">{q}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {post.instrucoes && (
          <div className="rounded-xl bg-amber-500/[0.07] border border-amber-500/20 p-3">
            <p className="text-xs text-amber-100/75 leading-relaxed font-medium whitespace-pre-line">{post.instrucoes}</p>
          </div>
        )}

        {/* Rodapé */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider truncate">
            {post.autor_nome || "Equipe Compromisso"} · {format(new Date(post.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </p>

          {post.tipo === "trabalho" && ehAluno && (
            <button
              onClick={onAlternarFeito}
              className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 border ${
                feito
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-white/5 text-white/50 border-white/10 hover:text-white/80"
              }`}
            >
              {feito ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              {feito ? "Já fiz" : "Marcar como feito"}
            </button>
          )}

          {post.tipo === "trabalho" && !ehAluno && (
            <span className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-black text-white/45 uppercase tracking-wider">
              <Users className="h-3 w-3" />
              {quantosFizeram} {quantosFizeram === 1 ? "aluno marcou" : "alunos marcaram"}
            </span>
          )}
        </div>

        {/* Avisar todo mundo — só para quem publica, e só uma vez por post. */}
        {podeModerar && post.ativo && (
          <div className="pt-1">
            {post.avisado_em ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-400/70 uppercase tracking-wider">
                <BellOff className="h-3 w-3" />
                Todo mundo avisado em {format(new Date(post.avisado_em), "dd/MM 'às' HH:mm", { locale: ptBR })}
              </span>
            ) : (
              <button
                onClick={onAvisarTodos}
                disabled={avisando}
                className="w-full h-10 rounded-xl bg-red-500/12 border border-red-500/30 text-red-400 hover:bg-red-500/20 disabled:opacity-50 font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {avisando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
                {avisando ? "Avisando…" : "Avisar todo mundo"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Composer ──────────────────────────────────────────────────────────── */
function Composer({
  rascunho, setRascunho, textoQuestoes, setTextoQuestoes,
  salvando, enviandoImagem, avisarTodos, setAvisarTodos,
  inputImagem, onImagem, onPublicar, onFechar,
}: {
  rascunho: MuralRascunho;
  setRascunho: React.Dispatch<React.SetStateAction<MuralRascunho>>;
  textoQuestoes: string;
  setTextoQuestoes: (v: string) => void;
  salvando: boolean;
  enviandoImagem: boolean;
  avisarTodos: boolean;
  setAvisarTodos: React.Dispatch<React.SetStateAction<boolean>>;
  inputImagem: React.RefObject<HTMLInputElement | null>;
  onImagem: (f: File) => void;
  onPublicar: () => void;
  onFechar: () => void;
}) {
  const ehTrabalho = rascunho.tipo === "trabalho";
  const campo = "w-full h-12 bg-white/4 border border-white/10 rounded-xl px-4 text-sm font-bold text-white placeholder:text-white/25 outline-none focus:border-orange-500/40 focus:bg-white/6 transition-all";
  const rotulo = "text-[9px] font-black uppercase tracking-widest text-white/45 ml-1";

  return (
    <div className="bg-[#0d0d0f] border border-white/8 rounded-[1.5rem] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/6">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
            <PlusCircle className="h-3.5 w-3.5 text-orange-400" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/65">Nova publicação</p>
        </div>
        <button onClick={onFechar} className="h-8 w-8 rounded-xl bg-white/5 text-white/40 hover:text-white/70 flex items-center justify-center transition-all active:scale-90">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Tipo */}
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(TIPOS) as MuralTipo[]).map(t => {
            const s = ESTILO[t];
            const ativo = rascunho.tipo === t;
            return (
              <button
                key={t}
                onClick={() => setRascunho(r => ({ ...r, tipo: t }))}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all active:scale-[0.98] ${
                  ativo ? `${s.bg} ${s.borda}` : "bg-white/[0.03] border-white/8 hover:border-white/15"
                }`}
              >
                <s.icon className={`h-4 w-4 shrink-0 mt-0.5 ${ativo ? s.cor : "text-white/35"}`} />
                <div className="min-w-0">
                  <p className={`text-[11px] font-black italic leading-tight ${ativo ? s.cor : "text-white/60"}`}>{TIPOS[t].label}</p>
                  <p className="text-[9px] font-semibold text-white/35 leading-tight mt-0.5">{TIPOS[t].ajuda}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <label className={rotulo}>Título</label>
          <input
            type="text" value={rascunho.titulo} className={campo}
            onChange={e => setRascunho(r => ({ ...r, titulo: e.target.value }))}
            placeholder={ehTrabalho ? "Atividade para o próximo sábado – 05/09" : "Bullying é Crime! Não se cale."}
          />
        </div>

        <div className="space-y-1.5">
          <label className={rotulo}>Tema <span className="text-white/25 normal-case tracking-normal">(opcional)</span></label>
          <input
            type="text" value={rascunho.tema || ""} className={campo}
            onChange={e => setRascunho(r => ({ ...r, tema: e.target.value }))}
            placeholder="Bullying, comportamento humano e responsabilidade social"
          />
        </div>

        <div className="space-y-1.5">
          <label className={rotulo}>{ehTrabalho ? "Enunciado" : "Mensagem"}</label>
          <Textarea
            value={rascunho.descricao}
            onChange={e => setRascunho(r => ({ ...r, descricao: e.target.value }))}
            placeholder={ehTrabalho ? "O que o aluno precisa fazer e por quê..." : "O recado que vai para toda a escola..."}
            className="min-h-[110px] bg-white/4 border border-white/10 rounded-xl text-white placeholder:text-white/25 text-sm resize-none focus-visible:ring-0 focus-visible:border-orange-500/40 focus-visible:bg-white/6 transition-all"
          />
        </div>

        {ehTrabalho && (
          <>
            <div className="space-y-1.5">
              <label className={rotulo}>Questões — uma por linha</label>
              <Textarea
                value={textoQuestoes}
                onChange={e => setTextoQuestoes(e.target.value)}
                placeholder={"O que é bullying e o que o diferencia de uma brincadeira?\nQuais fatores levam alguém a praticar bullying?"}
                className="min-h-[110px] bg-white/4 border border-white/10 rounded-xl text-white placeholder:text-white/25 text-sm resize-none focus-visible:ring-0 focus-visible:border-orange-500/40 focus-visible:bg-white/6 transition-all"
              />
              <p className="text-[9px] font-semibold text-white/30 ml-1">
                Pode colar a lista numerada — o "1." e o "2." do começo da linha saem sozinhos.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className={rotulo}>Entregar em</label>
              <input
                type="date" value={rascunho.entrega_em || ""} className={campo}
                onChange={e => setRascunho(r => ({ ...r, entrega_em: e.target.value || null }))}
              />
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <label className={rotulo}>Observações {ehTrabalho ? "(fontes, formato do texto…)" : "(opcional)"}</label>
          <Textarea
            value={rascunho.instrucoes || ""}
            onChange={e => setRascunho(r => ({ ...r, instrucoes: e.target.value }))}
            placeholder="Utilizem fontes confiáveis e indiquem pelo menos duas ao final."
            className="min-h-[70px] bg-white/4 border border-white/10 rounded-xl text-white placeholder:text-white/25 text-sm resize-none focus-visible:ring-0 focus-visible:border-orange-500/40 focus-visible:bg-white/6 transition-all"
          />
        </div>

        {/* Imagem */}
        <div className="space-y-1.5">
          <label className={rotulo}>Cartaz <span className="text-white/25 normal-case tracking-normal">(opcional, até 5 MB)</span></label>
          {rascunho.imagem_url ? (
            <div className="relative aspect-[16/10] rounded-xl overflow-hidden border border-white/10">
              <Image src={rascunho.imagem_url} alt="Prévia do cartaz" fill className="object-cover" sizes="640px" />
              <button
                onClick={() => setRascunho(r => ({ ...r, imagem_url: null }))}
                className="absolute top-2 right-2 h-8 w-8 rounded-xl bg-black/70 text-white/80 hover:text-white flex items-center justify-center backdrop-blur"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => inputImagem.current?.click()}
              disabled={enviandoImagem}
              className="w-full h-20 rounded-xl border border-dashed border-white/15 bg-white/[0.02] hover:border-orange-500/40 flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {enviandoImagem ? <Loader2 className="h-4 w-4 animate-spin text-orange-400" /> : <ImagePlus className="h-4 w-4 text-white/35" />}
              <span className="text-[10px] font-black uppercase tracking-wider text-white/40">
                {enviandoImagem ? "Enviando…" : "Anexar imagem"}
              </span>
            </button>
          )}
          <input
            ref={inputImagem} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onImagem(f); }}
          />
        </div>

        {/* Fixar */}
        <button
          onClick={() => setRascunho(r => ({ ...r, destaque: !r.destaque }))}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.99] ${
            rascunho.destaque ? "bg-orange-500/12 border-orange-500/30" : "bg-white/[0.03] border-white/8"
          }`}
        >
          <Flame className={`h-4 w-4 shrink-0 ${rascunho.destaque ? "text-orange-400" : "text-white/30"}`} />
          <div className="text-left min-w-0">
            <p className={`text-[11px] font-black italic ${rascunho.destaque ? "text-orange-400" : "text-white/60"}`}>
              Fixar no topo do mural
            </p>
            <p className="text-[9px] font-semibold text-white/35 leading-tight">
              Acende o contador do menu para todo mundo.
            </p>
          </div>
        </button>

        <button
          onClick={() => setAvisarTodos(v => !v)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.99] ${
            avisarTodos ? "bg-red-500/12 border-red-500/30" : "bg-white/[0.03] border-white/8"
          }`}
        >
          <BellRing className={`h-4 w-4 shrink-0 ${avisarTodos ? "text-red-400" : "text-white/30"}`} />
          <div className="text-left min-w-0">
            <p className={`text-[11px] font-black italic ${avisarTodos ? "text-red-400" : "text-white/60"}`}>
              Avisar todo mundo agora
            </p>
            <p className="text-[9px] font-semibold text-white/35 leading-tight">
              Aviso no painel de todos os alunos e notificação no celular. Não dá para desfazer.
            </p>
          </div>
        </button>

        <button
          onClick={onPublicar}
          disabled={salvando || enviandoImagem}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.97] disabled:opacity-50 text-white font-black rounded-2xl shadow-xl shadow-orange-500/25 text-xs uppercase tracking-widest transition-all"
          style={{ height: 52 }}
        >
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
          {salvando ? "Publicando…" : "Publicar para todos os alunos"}
        </button>
      </div>
    </div>
  );
}
