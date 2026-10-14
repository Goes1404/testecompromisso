"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabase";
import { estaNaAgenda, filtroDaAgenda } from "@/lib/lives";
import { ListaDeAulas } from "@/components/live/ListaDeAulas";

export default function LiveClassesPage() {
  const [lives, setLives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        setLives((data || []).filter((l: any) => estaNaAgenda(l, agora)));
      } catch (err) {
        console.error("Erro ao buscar lives:", err);
        // Em caso de erro/timeout, mostramos a tela vazia em vez de travar.
        setLives([]);
      } finally {
        setLoading(false);
      }
    }

    fetchLives();

    const channel = supabase
      .channel('live_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lives' }, () => {
        fetchLives();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return <ListaDeAulas aulas={lives} carregando={loading} />;
}
