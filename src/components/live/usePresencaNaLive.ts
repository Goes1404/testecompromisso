"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { INTERVALO_DO_SINAL_MS } from "@/lib/lives";

export type Presenca = { segundos: number; segundosDaAula: number; status: string | null };

/**
 * Enquanto a sala está aberta, avisa o banco a cada 60 s. O banco só conta
 * tempo quando a aula está no ar, mas o aviso sai antes também: a resposta
 * traz o status da aula, e é por ela que a sala descobre que a aula abriu.
 * O Realtime do Supabase aguenta 200 conexões no Free e 500 no Pro — com
 * ~855 alunos, quem ficar de fora nunca saberia que a aula começou e nunca
 * mandaria sinal de presença.
 *
 * Quem soma o tempo é o banco (`registrar_presenca_live`), com o relógio dele:
 * daqui só sai "estou aqui".
 *
 * Não filtra por aba visível de propósito. No iPhone, o vídeo em tela cheia
 * pode deixar a página como "oculta", e o aluno que assiste em tela cheia
 * perderia a presença. Quando o celular bloqueia ou o aluno troca de app, o
 * navegador já congela este timer sozinho — e o banco não conta o buraco além
 * de 130 s.
 *
 * Devolve `null` enquanto não há resposta, ou se a função não existir no banco
 * (migration não aplicada): a sala segue funcionando, só sem o contador.
 */
export function usePresencaNaLive(liveId: string | null | undefined, ativo: boolean): Presenca | null {
  const [presenca, setPresenca] = useState<Presenca | null>(null);

  useEffect(() => {
    if (!liveId || !ativo) return;
    let vivo = true;

    const sinal = async () => {
      const { data, error } = await supabase.rpc("registrar_presenca_live", { p_live_id: liveId });
      if (!vivo || error || !Array.isArray(data) || !data[0]) return;
      setPresenca({
        segundos: data[0].segundos ?? 0,
        segundosDaAula: data[0].segundos_da_aula ?? 0,
        status: data[0].status ?? null,
      });
    };

    sinal();
    const timer = setInterval(sinal, INTERVALO_DO_SINAL_MS);
    // Volta do bloqueio de tela: avisa na hora, sem esperar o próximo minuto.
    const aoVoltar = () => {
      if (document.visibilityState === "visible") sinal();
    };
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      vivo = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [liveId, ativo]);

  return presenca;
}
