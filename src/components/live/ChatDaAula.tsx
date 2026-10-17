"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import {
  ESPERA_ENTRE_MENSAGENS_S,
  INTERVALO_DA_REACAO_MS,
  erroDoChat,
  mesclarMensagens,
  proximoIntervaloDoChat,
  reacoesNovas,
  ultimaVersao,
  validarMensagemDoChat,
  type Emoji,
  type MensagemDoChat,
  type MensagemFixada,
  type RespostaDoChat,
} from "@/lib/live-chat";
import { ChatAoVivo } from "./ChatAoVivo";
import { chaveDoCache, gravarCache, lerCache } from "@/lib/cache-da-sessao";

/** O chat guardado vale por 6 h; dentro disso, voltar à sala só busca o que é novo. */
const VALIDADE_DO_CHAT_MS = 6 * 3_600_000;

type ChatGuardado = {
  mensagens: MensagemDoChat[];
  versao: number;
  silenciado: boolean;
  silenciados: string[];
};

/** Função ou tabela inexistente = migration do chat não aplicada. */
function faltaMigration(error: { code?: string } | null): boolean {
  return !!error && ["PGRST202", "42883", "42P01", "PGRST205"].includes(error.code ?? "");
}

/**
 * Chat ao vivo da aula: busca, envia e modera. O desenho é do `ChatAoVivo`.
 *
 * Consulta a cada 5 s (aluno) ou 3 s (equipe), só enquanto a aula está no ar
 * e a aba está visível, pedindo apenas o que mudou desde a última versão. Sem
 * Realtime de propósito: ver `src/lib/live-chat.ts`.
 *
 * Sem a migration `20261015120000_live_chat.sql` no banco, mostra `reserva`
 * (o chat do YouTube) — o deploy não depende da ordem.
 */
export function ChatDaAula({
  liveId,
  noAr,
  equipe,
  reserva = null,
  altura,
  preencher = false,
  sobreposto = false,
}: {
  liveId: string;
  noAr: boolean;
  equipe: boolean;
  reserva?: ReactNode;
  altura?: string;
  /** Ocupa toda a altura do pai (sala no celular). Ver `ChatAoVivo`. */
  preencher?: boolean;
  /** Por cima do vídeo, na tela cheia da sala. Ver `ChatAoVivo`. */
  sobreposto?: boolean;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const chave = chaveDoCache(user?.id, "chat", liveId, equipe ? "equipe" : "aluno");
  // Voltar à sala abre o chat como estava, e a consulta pede só o que mudou
  // desde a versão guardada — sem roda girando e sem baixar tudo de novo.
  const [guardado] = useState(() => lerCache<ChatGuardado>(chave, VALIDADE_DO_CHAT_MS));
  const [mensagens, setMensagens] = useState<MensagemDoChat[] | null>(guardado?.mensagens ?? null);
  const [silenciado, setSilenciado] = useState(guardado?.silenciado ?? false);
  const [silenciados, setSilenciados] = useState<string[]>(guardado?.silenciados ?? []);
  const [indisponivel, setIndisponivel] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);
  const versao = useRef(guardado?.versao ?? 0);
  const consultando = useRef(false);
  // Consultas seguidas que não trouxeram nada: é o que espaça a próxima.
  const quietos = useRef(0);

  // Mensagem fixada e reações (17/10). As reações que estão subindo na tela
  // ficam numa lista curta e saem sozinhas quando a animação acaba.
  const [fixada, setFixada] = useState<MensagemFixada | null>(null);
  const [subindo, setSubindo] = useState<{ chave: string; emoji: string }[]>([]);
  const ultimaReacao = useRef<number | null>(null);
  const minhasReacoes = useRef(new Set<number>());
  const soltar = useCallback((emoji: string) => {
    const chave = `${Date.now()}-${Math.random()}`;
    setSubindo((s) => [...s.slice(-14), { chave, emoji }]);
    setTimeout(() => setSubindo((s) => s.filter((x) => x.chave !== chave)), 2600);
  }, []);

  const consultar = useCallback(async () => {
    if (!user || consultando.current) return;
    consultando.current = true;
    try {
      const { data, error } = await supabase.rpc("chat_da_live", { p_live: liveId, p_desde: versao.current });
      if (error) {
        if (faltaMigration(error)) setIndisponivel(true);
        setMensagens((m) => m ?? []);
        return;
      }
      const r = data as RespostaDoChat;
      const novas = r?.mensagens ?? [];
      quietos.current = novas.length > 0 ? 0 : quietos.current + 1;
      versao.current = ultimaVersao(versao.current, novas);
      setMensagens((atuais) => mesclarMensagens(atuais ?? [], novas, equipe));
      // Só mexe no estado quando muda: cada set à toa redesenhava o chat
      // inteiro a cada consulta.
      setSilenciado(!!r?.silenciado);
      const lista = Array.isArray(r?.silenciados) ? r.silenciados : [];
      setSilenciados((atual) => (atual.length === lista.length && atual.every((x, i) => x === lista[i]) ? atual : lista));
      // Fixada: só troca o estado quando muda (outra mensagem ou foi solta).
      const f = r?.fixada ?? null;
      setFixada((atual) => (atual?.id === f?.id && atual?.em === f?.em ? atual : f));
      // Reações: anima só as novas, e não as minhas (essas subiram no toque).
      const { novas: chegaram, ultimo } = reacoesNovas(r?.reacoes, ultimaReacao.current);
      ultimaReacao.current = ultimo;
      chegaram.filter((x) => !minhasReacoes.current.has(x.id)).forEach((x, i) => setTimeout(() => soltar(x.emoji), i * 180));
    } finally {
      consultando.current = false;
    }
  }, [liveId, user, equipe]);

  // Primeira leitura (mesmo fora do ar, para mostrar o histórico). Com chat
  // guardado, parte da versão dele; sem, do zero.
  useEffect(() => {
    const g = lerCache<ChatGuardado>(chave, VALIDADE_DO_CHAT_MS);
    versao.current = g?.versao ?? 0;
    setMensagens(g?.mensagens ?? null);
    consultar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultar, chave]);

  // Guarda o que está na tela para a próxima volta.
  useEffect(() => {
    if (!mensagens) return;
    gravarCache<ChatGuardado>(chave, { mensagens, versao: versao.current, silenciado, silenciados });
  }, [chave, mensagens, silenciado, silenciados]);

  // Enquanto no ar: consulta periódica, pausada com a aba escondida. O
  // intervalo é decidido a cada volta (`proximoIntervaloDoChat`): chat parado
  // espaça as consultas, mensagem nova aproxima. Os ±10 % de variação evitam
  // que os ~855 celulares que entraram juntos (push do "ao vivo") batam no
  // banco no mesmo instante a cada volta.
  useEffect(() => {
    if (!noAr || indisponivel) return;
    let vivo = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const agendar = () => {
      if (!vivo) return;
      const base = proximoIntervaloDoChat(quietos.current, equipe);
      timer = setTimeout(async () => {
        if (!(typeof document !== "undefined" && document.hidden)) await consultar();
        agendar();
      }, Math.round(base * (0.9 + Math.random() * 0.2)));
    };
    agendar();
    const aoVoltar = () => {
      if (!document.hidden) {
        quietos.current = 0;
        consultar();
      }
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      vivo = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [noAr, equipe, indisponivel, consultar]);

  // Contagem regressiva até poder mandar de novo (aluno).
  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const enviar = async () => {
    if (!user || enviando) return;
    const problema = validarMensagemDoChat(texto);
    if (problema) {
      toast({ title: problema, variant: "destructive" });
      return;
    }
    setEnviando(true);
    // Sem `.select()`: o aluno não lê a tabela direto (só pela função).
    const { error } = await supabase.from("live_chat").insert({ live_id: liveId, user_id: user.id, texto: texto.trim() });
    setEnviando(false);
    if (error) {
      toast({ title: "Mensagem não enviada", description: erroDoChat(error), variant: "destructive" });
      if (/segundos/.test(error.message ?? "")) setEspera(ESPERA_ENTRE_MENSAGENS_S);
      return;
    }
    setTexto("");
    if (!equipe) setEspera(ESPERA_ENTRE_MENSAGENS_S);
    // Quem acabou de escrever quer ver a resposta: volta ao ritmo rápido.
    quietos.current = 0;
    consultar();
  };

  // Reação: sobe na hora para quem tocou; o banco recebe por trás. O excesso
  // (mais de uma a cada 2 s) o banco ignora em silêncio.
  const ultimoEnvioDeReacao = useRef(0);
  const reagir = useCallback(async (emoji: Emoji) => {
    soltar(emoji);
    if (Date.now() - ultimoEnvioDeReacao.current < INTERVALO_DA_REACAO_MS) return;
    ultimoEnvioDeReacao.current = Date.now();
    const { data } = await supabase.rpc("reagir_na_live", { p_live: liveId, p_emoji: emoji });
    if (typeof data === "number") minhasReacoes.current.add(data);
  }, [liveId, soltar]);

  const fixar = useCallback(async (id: number | null) => {
    const { data, error } = await supabase.rpc("fixar_no_chat", { p_live: liveId, p_mensagem: id });
    if (error) {
      toast({ title: "Não foi possível fixar", description: error.message, variant: "destructive" });
      return;
    }
    setFixada((data as MensagemFixada | null) ?? null);
    toast({ title: id ? "Mensagem fixada no topo do chat" : "Mensagem solta" });
  }, [liveId, toast]);

  const ocultar = useCallback(async (id: number, oculta: boolean) => {
    const { data, error } = await supabase.from("live_chat").update({ oculta }).eq("id", id).select("id");
    if (error || !data?.length) {
      toast({ title: "Não foi possível moderar", description: error?.message || "Sua conta não pode moderar o chat.", variant: "destructive" });
      return;
    }
    consultar();
  }, [consultar, toast]);

  const silenciar = useCallback(async (userId: string, calar: boolean) => {
    if (!user) return;
    const { data, error } = calar
      ? await supabase.from("live_chat_silenciados").insert({ live_id: liveId, user_id: userId, silenciado_por: user.id }).select("user_id")
      : await supabase.from("live_chat_silenciados").delete().eq("live_id", liveId).eq("user_id", userId).select("user_id");
    if (error || !data?.length) {
      toast({ title: "Não foi possível alterar", description: error?.message || "Sua conta não pode moderar o chat.", variant: "destructive" });
      return;
    }
    setSilenciados((s) => (calar ? [...new Set([...s, userId])] : s.filter((x) => x !== userId)));
    toast({ title: calar ? "Aluno silenciado nesta aula" : "Aluno liberado" });
  }, [user, liveId, toast]);

  if (indisponivel) return <>{reserva}</>;

  return (
    <ChatAoVivo
      mensagens={mensagens}
      meuId={user?.id ?? null}
      souEquipe={equipe}
      noAr={noAr}
      silenciado={silenciado}
      silenciados={silenciados}
      texto={texto}
      onTexto={setTexto}
      onEnviar={enviar}
      enviando={enviando}
      espera={espera}
      onOcultar={equipe ? ocultar : undefined}
      onSilenciar={equipe ? silenciar : undefined}
      altura={altura}
      preencher={preencher}
      sobreposto={sobreposto}
      fixada={fixada}
      onFixar={equipe ? fixar : undefined}
      reacoes={subindo}
      onReagir={noAr ? reagir : undefined}
    />
  );
}
