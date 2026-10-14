"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import {
  ESPERA_ENTRE_MENSAGENS_S,
  INTERVALO_DA_EQUIPE_MS,
  INTERVALO_DO_ALUNO_MS,
  erroDoChat,
  mesclarMensagens,
  ultimaVersao,
  validarMensagemDoChat,
  type MensagemDoChat,
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
}: {
  liveId: string;
  noAr: boolean;
  equipe: boolean;
  reserva?: ReactNode;
  altura?: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const chave = chaveDoCache(user?.id, "chat", liveId, equipe ? "equipe" : "aluno");
  // Voltar à sala abre o chat como estava, e a consulta pede só o que mudou
  // desde a versão guardada — sem roda girando e sem baixar tudo de novo.
  const guardado = lerCache<ChatGuardado>(chave, VALIDADE_DO_CHAT_MS);
  const [mensagens, setMensagens] = useState<MensagemDoChat[] | null>(guardado?.mensagens ?? null);
  const [silenciado, setSilenciado] = useState(guardado?.silenciado ?? false);
  const [silenciados, setSilenciados] = useState<string[]>(guardado?.silenciados ?? []);
  const [indisponivel, setIndisponivel] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);
  const versao = useRef(guardado?.versao ?? 0);
  const consultando = useRef(false);

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
      versao.current = ultimaVersao(versao.current, novas);
      setMensagens((atuais) => mesclarMensagens(atuais ?? [], novas, equipe));
      setSilenciado(!!r?.silenciado);
      setSilenciados(Array.isArray(r?.silenciados) ? r.silenciados : []);
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

  // Enquanto no ar: consulta periódica, pausada com a aba escondida.
  useEffect(() => {
    if (!noAr || indisponivel) return;
    const intervalo = equipe ? INTERVALO_DA_EQUIPE_MS : INTERVALO_DO_ALUNO_MS;
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      consultar();
    }, intervalo);
    const aoVoltar = () => {
      if (!document.hidden) consultar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(timer);
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
    consultar();
  };

  const ocultar = async (id: number, oculta: boolean) => {
    const { data, error } = await supabase.from("live_chat").update({ oculta }).eq("id", id).select("id");
    if (error || !data?.length) {
      toast({ title: "Não foi possível moderar", description: error?.message || "Sua conta não pode moderar o chat.", variant: "destructive" });
      return;
    }
    consultar();
  };

  const silenciar = async (userId: string, calar: boolean) => {
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
  };

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
    />
  );
}
