'use client';

/**
 * Onde o aluno para.
 *
 * Responde três perguntas que hoje só se responde com SQL na mão:
 *   1. Quantos alunos chegam a cada etapa do funil?
 *   2. Que telas eles abrem — e quais ninguém abre?
 *   3. O que está falhando agora?
 *
 * A terceira é a razão principal desta tela existir. Os dois defeitos que
 * mataram a redação (o CHECK que limitava a nota a 100 e o tema pré-preenchido
 * que anulava por fuga) falhavam sem erro visível e levaram dois meses para
 * aparecer, por acaso.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertTriangle, MonitorSmartphone, Users } from 'lucide-react';

type Funil = {
  base_real: number;
  contas_de_importacao: number;
  ja_entraram: number;
  ativos_30d: number;
  ativos_7d: number;
  responderam_questao: number;
  enviaram_redacao: number;
  usaram_flashcard: number;
};

type Linha = { chave: string; alunos: number; ocorrencias: number };

/** Agrupa eventos por uma chave, contando alunos distintos e ocorrências. */
function agrupar(eventos: { name: string; screen: string | null; user_id: string | null }[], por: 'name' | 'screen'): Linha[] {
  const mapa = new Map<string, { alunos: Set<string>; n: number }>();
  for (const e of eventos) {
    const chave = (por === 'name' ? e.name : e.screen) ?? '(sem rota)';
    const atual = mapa.get(chave) ?? { alunos: new Set<string>(), n: 0 };
    if (e.user_id) atual.alunos.add(e.user_id);
    atual.n++;
    mapa.set(chave, atual);
  }
  return [...mapa.entries()]
    .map(([chave, v]) => ({ chave, alunos: v.alunos.size, ocorrencias: v.n }))
    .sort((a, b) => b.ocorrencias - a.ocorrencias);
}

function Barra({ valor, total, cor }: { valor: number; total: number; cor: string }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right text-xs font-black text-slate-600">{pct}%</span>
    </div>
  );
}

export default function UsoPage() {
  const { toast } = useToast();
  const [funil, setFunil] = useState<Funil | null>(null);
  const [telas, setTelas] = useState<Linha[]>([]);
  const [falhas, setFalhas] = useState<Linha[]>([]);
  const [acoes, setAcoes] = useState<Linha[]>([]);
  const [eventosTotal, setEventosTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data: f, error: erroFunil } = await supabase
        .from('funil_alunos').select('*').maybeSingle();
      if (erroFunil) throw erroFunil;
      setFunil(f as Funil);

      // Janela de 14 dias: o suficiente para ver o padrão da semana sem
      // arrastar o histórico inteiro para o navegador.
      const desde = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
      const { data: ev, error: erroEv } = await supabase
        .from('app_events')
        .select('kind, name, screen, user_id')
        .gte('created_at', desde)
        .limit(5000);
      if (erroEv) throw erroEv;

      const eventos = ev ?? [];
      setEventosTotal(eventos.length);
      setTelas(agrupar(eventos.filter(e => e.kind === 'tela'), 'screen'));
      setAcoes(agrupar(eventos.filter(e => e.kind === 'acao'), 'name'));
      setFalhas(agrupar(eventos.filter(e => e.kind === 'falha'), 'name'));
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const etapas = funil ? [
    { label: 'Contas reais', valor: funil.base_real, cor: 'bg-slate-400' },
    { label: 'Já entraram alguma vez', valor: funil.ja_entraram, cor: 'bg-blue-500' },
    { label: 'Ativos nos últimos 30 dias', valor: funil.ativos_30d, cor: 'bg-indigo-500' },
    { label: 'Ativos nos últimos 7 dias', valor: funil.ativos_7d, cor: 'bg-violet-500' },
    { label: 'Já responderam questão', valor: funil.responderam_questao, cor: 'bg-emerald-500' },
    { label: 'Já usaram flashcard', valor: funil.usaram_flashcard, cor: 'bg-teal-500' },
    { label: 'Já enviaram redação', valor: funil.enviaram_redacao, cor: 'bg-orange-500' },
  ] : [];

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-6 pb-24">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-primary">Onde o aluno para</h1>
          <p className="text-xs font-medium text-muted-foreground mt-1">
            Funil de ativação e telemetria dos últimos 14 dias.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={carregar} disabled={loading}
          className="h-9 rounded-xl text-xs font-black gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary/30" /></div>
      ) : (
        <>
          {/* ── FUNIL ── */}
          <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-600">Funil de ativação</h2>
            </div>

            <div className="space-y-3">
              {etapas.map(e => (
                <div key={e.label} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-slate-600">{e.label}</span>
                    <span className="text-sm font-black text-slate-800">{e.valor}</span>
                  </div>
                  <Barra valor={e.valor} total={funil?.base_real ?? 0} cor={e.cor} />
                </div>
              ))}
            </div>

            {(funil?.contas_de_importacao ?? 0) > 0 && (
              <p className="text-[11px] font-medium text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                Fora da conta: <strong>{funil?.contas_de_importacao} contas</strong> criadas pela importação de
                boletim de 14/07/2026. Quase nenhuma chegou a ser usada — mantê-las no total faria toda taxa
                aqui parecer metade do que é.
              </p>
            )}
          </section>

          {/* ── FALHAS ── */}
          <section className="rounded-[2rem] border border-red-100 bg-red-50/40 p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <h2 className="text-sm font-black uppercase tracking-widest text-red-700">O que está falhando</h2>
            </div>

            {falhas.length === 0 ? (
              <p className="text-xs font-medium text-slate-500">
                Nenhuma falha registrada em 14 dias.
                {eventosTotal === 0 && ' (Ainda não há telemetria — ela começa a chegar no próximo acesso de aluno.)'}
              </p>
            ) : (
              <div className="space-y-1.5">
                {falhas.map(f => (
                  <div key={f.chave} className="flex items-center gap-3 rounded-xl border border-red-100 bg-white px-3 py-2">
                    <span className="flex-1 min-w-0 truncate text-xs font-black text-slate-700">{f.chave}</span>
                    <span className="text-[10px] font-bold text-slate-400">{f.alunos} aluno(s)</span>
                    <span className="w-10 text-right text-sm font-black text-red-600">{f.ocorrencias}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── TELAS E AÇÕES ── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <MonitorSmartphone className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-600">Telas mais abertas</h2>
              </div>
              {telas.length === 0 ? (
                <p className="text-xs font-medium text-slate-500">Sem dados ainda.</p>
              ) : telas.slice(0, 12).map(t => (
                <div key={t.chave} className="flex items-center gap-2">
                  <span className="flex-1 min-w-0 truncate text-[11px] font-bold text-slate-600">{t.chave}</span>
                  <span className="text-[10px] font-bold text-slate-400">{t.alunos}</span>
                  <span className="w-8 text-right text-xs font-black text-slate-700">{t.ocorrencias}</span>
                </div>
              ))}
            </section>

            <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <MonitorSmartphone className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-600">Ações concluídas</h2>
              </div>
              {acoes.length === 0 ? (
                <p className="text-xs font-medium text-slate-500">Sem dados ainda.</p>
              ) : acoes.slice(0, 12).map(a => (
                <div key={a.chave} className="flex items-center gap-2">
                  <span className="flex-1 min-w-0 truncate text-[11px] font-bold text-slate-600">{a.chave}</span>
                  <span className="text-[10px] font-bold text-slate-400">{a.alunos}</span>
                  <span className="w-8 text-right text-xs font-black text-slate-700">{a.ocorrencias}</span>
                </div>
              ))}
            </section>
          </div>

          <p className="text-center text-[10px] text-muted-foreground/60 font-medium">
            A telemetria não guarda nome, e-mail, telefone nem texto escrito pelo aluno — só rota, evento e números.
          </p>
        </>
      )}
    </div>
  );
}
