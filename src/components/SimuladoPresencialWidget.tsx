"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ClipboardCheck, ArrowRight, DoorOpen, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/app/lib/supabase";
import {
  AvisoDaHome, SimuladoDoAluno, avisoParaHome, diaDoSimulado, instante, numeroDeInscricao, ondeFica,
} from "@/lib/simulado-presencial";

export const ROTA_DO_SIMULADO = "/dashboard/student/simulado-presencial";

/**
 * Simulado presencial na home do aluno.
 *
 * Sem botão de dispensar, como o do mural: a inscrição é obrigatória, e
 * esconder o aviso não inscreve ninguém. Some sozinho quando não há o que
 * fazer (fora da janela sem inscrição, ou fora do público do simulado).
 */
export function SimuladoPresencialWidget() {
  const [aviso, setAviso] = useState<AvisoDaHome | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data, error } = await supabase.rpc("simulados_presenciais_do_aluno");
      // Lembrete secundário: falha (ou migration ainda não aplicada) não grita na home.
      if (!ativo || error) return;
      setAviso(avisoParaHome((data as SimuladoDoAluno[]) || []));
    })();
    return () => { ativo = false; };
  }, []);

  if (!aviso) return null;
  return <CartaoDoAviso aviso={aviso} />;
}

/** Só o desenho (a prévia em `/dev/simulado-preview` usa sem login). */
export function CartaoDoAviso({ aviso }: { aviso: AvisoDaHome }) {
  const s = aviso.simulado;
  const i = s.inscricao;

  const { rotulo, titulo, linha, botao, Icone } =
    aviso.tipo === "inscrever"
      ? { rotulo: "Inscrição obrigatória", titulo: s.titulo, linha: `Prova ${diaDoSimulado(s.aplicado_em)} · inscreva-se até ${instante(s.inscricao_fecha)}`, botao: "Fazer inscrição", Icone: ClipboardCheck }
      : aviso.tipo === "sala"
      ? { rotulo: `${s.titulo} · ${diaDoSimulado(s.aplicado_em)}`, titulo: `Sua sala: ${ondeFica(i!.sala, i!.predio)}`, linha: `${i!.carteira ? `Carteira ${i!.carteira} · ` : ""}Inscrição ${numeroDeInscricao(i!.numero)} · leve o RG original`, botao: "Ver ficha", Icone: DoorOpen }
      : { rotulo: "Inscrição feita", titulo: s.titulo, linha: `Nº ${numeroDeInscricao(i!.numero)} · sua sala sai em ${instante(s.salas_divulgadas_em)}`, botao: "Ver ficha", Icone: Hourglass };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[2rem] border border-orange-200 p-5 md:p-6 shadow-2xl text-white bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500"
    >
      <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none rounded-[2rem]" />
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-11 w-11 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-lg">
            <Icone className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/80">{rotulo}</span>
            <h2 className="text-base md:text-lg font-black italic tracking-tighter leading-tight">{titulo}</h2>
            <p className="text-[11px] md:text-xs font-semibold text-white/85 mt-0.5 leading-snug">{linha}</p>
          </div>
        </div>
        <Link href={ROTA_DO_SIMULADO} className="shrink-0">
          <Button className="w-full sm:w-auto h-11 px-5 rounded-xl bg-white text-orange-600 hover:bg-orange-50 font-black text-[11px] uppercase tracking-widest shadow-lg border-none active:scale-95 flex items-center justify-center gap-2">
            {botao} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
