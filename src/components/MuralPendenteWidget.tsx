"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ClipboardList, ArrowRight, CalendarClock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/app/lib/supabase";
import { MuralPost, lerPost, pendentesParaHome, prazoDoTrabalho } from "@/lib/mural";

/**
 * Cobrança dos trabalhos do mural na home do aluno.
 *
 * Não tem botão de dispensar de propósito, ao contrário do aviso de simulado
 * logo acima: dispensar esconderia a cobrança sem fazer o trabalho, e o aluno
 * perderia o sábado achando que resolveu. O jeito de sumir com o card é marcar
 * "já fiz" no mural — aí ele some sozinho, aqui e no contador do menu.
 *
 * Sem nada pendente, não renderiza nada. Um card vazio dizendo "nenhum trabalho"
 * ocuparia a primeira tela do celular para dar uma notícia que não é notícia.
 */
export function MuralPendenteWidget({ userId }: { userId: string }) {
  const [pendentes, setPendentes] = useState<MuralPost[]>([]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const [{ data: posts, error }, { data: marcas }] = await Promise.all([
        supabase
          .from("mural_posts")
          .select("id, tipo, titulo, tema, descricao, questoes, instrucoes, entrega_em, imagem_url, destaque, ativo, autor_id, autor_nome, created_at, updated_at")
          .eq("tipo", "trabalho")
          .eq("ativo", true),
        supabase.from("mural_conclusoes").select("post_id").eq("user_id", userId),
      ]);
      // Falha aqui não vira toast nem card de erro: é um lembrete, e a home não
      // pode gritar por causa de uma consulta secundária que não respondeu.
      if (!ativo || error) return;
      setPendentes(pendentesParaHome((posts || []).map(lerPost), (marcas || []).map(m => m.post_id)));
    })();
    return () => { ativo = false; };
  }, [userId]);

  if (pendentes.length === 0) return null;

  const [principal, ...resto] = pendentes;
  const prazo = prazoDoTrabalho(principal.entrega_em);
  const atrasado = !!prazo?.encerrado;
  const apertado = !!prazo?.urgente || atrasado;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-[2rem] border p-5 md:p-6 shadow-2xl text-white ${
        atrasado
          ? "border-red-200 bg-gradient-to-br from-red-600 via-rose-600 to-red-700"
          : "border-indigo-200 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700"
      }`}
    >
      <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none rounded-[2rem]" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-11 w-11 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-lg">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>

          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/75">
              {atrasado ? "Trabalho atrasado" : "Trabalho para entregar"}
            </span>

            <h2 className="text-base md:text-lg font-black italic tracking-tighter leading-tight">
              {principal.titulo}
            </h2>

            {principal.tema && (
              <p className="text-[11px] md:text-xs font-semibold text-white/80 mt-0.5 leading-snug">
                {principal.tema}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {prazo && (
                <span className={`inline-flex items-center gap-1 font-black text-[9px] uppercase tracking-wider px-2 h-5 rounded-full border ${
                  apertado
                    ? "bg-white text-red-600 border-white"
                    : "bg-white/15 text-white border-white/25"
                }`}>
                  {apertado ? <AlertTriangle className="h-2.5 w-2.5" /> : <CalendarClock className="h-2.5 w-2.5" />}
                  {prazo.rotulo}
                </span>
              )}

              {principal.questoes.length > 0 && (
                <span className="inline-flex items-center gap-1 bg-white/15 text-white border border-white/25 font-black text-[9px] uppercase tracking-wider px-2 h-5 rounded-full">
                  {principal.questoes.length} questões
                </span>
              )}

              {resto.length > 0 && (
                <span className="inline-flex items-center gap-1 bg-white/15 text-white border border-white/25 font-black text-[9px] uppercase tracking-wider px-2 h-5 rounded-full">
                  +{resto.length} {resto.length === 1 ? "pendente" : "pendentes"}
                </span>
              )}
            </div>
          </div>
        </div>

        <Link href="/dashboard/mural" className="shrink-0">
          <Button className={`w-full sm:w-auto h-11 px-5 rounded-xl bg-white font-black text-[11px] uppercase tracking-widest shadow-lg border-none active:scale-95 flex items-center justify-center gap-2 ${
            atrasado ? "text-red-600 hover:bg-red-50" : "text-indigo-600 hover:bg-indigo-50"
          }`}>
            Ver o trabalho <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
