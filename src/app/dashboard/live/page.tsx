"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabase";
import { estaNaAgenda, estaNasGravadas, filtroDaAgenda } from "@/lib/lives";
import { useAuth } from "@/lib/AuthProvider";
import { chaveDoCache, gravarCache, lerCache } from "@/lib/cache-da-sessao";

/** A lista guardada vale por 10 min; depois disso mostra o esqueleto de novo. */
const VALIDADE_DA_LISTA_MS = 10 * 60_000;
import { ListaDeAulas } from "@/components/live/ListaDeAulas";

export default function LiveClassesPage() {
  const { user } = useAuth();
  const chave = chaveDoCache(user?.id, "lives_lista");
  // Volta para a lista com o que já tinha na tela; a consulta atualiza por trás.
  const [lives, setLives] = useState<any[]>(() => lerCache<any[]>(chave, VALIDADE_DA_LISTA_MS) ?? []);
  const [loading, setLoading] = useState(() => lerCache(chave, VALIDADE_DA_LISTA_MS) === null);

  useEffect(() => {
    if (!user) return;
    async function fetchLives() {
      try {
        // Promise.race garante que o loading sempre resolva, mesmo que o fetch
        // fique pendurado (ex.: service worker antigo interceptando a request),
        // o que travava a tela em "Sintonizando Estúdio Master..." para sempre.
        const query = supabase
          .from('lives')
          .select('*')
          // Aula no ar entra sempre, qualquer que seja o horário agendado;
          // agendada só a partir do piso. A regra fina é `estaNaAgenda`.
          .or(filtroDaAgenda())
          .order('start_time', { ascending: true });

        const { data, error } = await Promise.race([
          query,
          new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error('Tempo esgotado ao sintonizar o estúdio.')), 12_000)
          ),
        ]);

        if (error) throw error;
        // A regra fina (no ar até 12h, agendada até 3h de atraso) mora em
        // `estaNaAgenda`; a consulta só traz o piso. O corte antigo de 1h
        // tirava o aulão da lista no meio dele.
        const agora = new Date();
        const naAgenda = (data || []).filter((l: any) => estaNaAgenda(l, agora) || estaNasGravadas(l, agora));
        setLives(naAgenda);
        gravarCache(chave, naAgenda);
      } catch (err) {
        console.error("Erro ao buscar lives:", err);
        // Erro/timeout: fica o que já estava na tela (ou vazio), sem travar.
      } finally {
        setLoading(false);
      }
    }

    fetchLives();

    // Sem Realtime (regra 14 do CLAUDE.md): ~855 alunos não cabem nas 200
    // conexões do plano. A lista relê a cada 30 s e ao voltar para a aba —
    // uma aula que abre aparece em no máximo meio minuto.
    const t = setInterval(() => {
      if (document.hidden) return;
      fetchLives();
    }, 30_000);
    const aoVoltar = () => {
      if (!document.hidden) fetchLives();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [user, chave]);

  return <ListaDeAulas aulas={lives} carregando={loading} />;
}
