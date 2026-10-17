"use client";

/**
 * Prévia das telas da aula ao vivo com dados de exemplo, sem login.
 * `/dev/live-preview?tela=lista|sala|sala-agendada|sala-gravada|agenda|estudio|estudio-agendado`
 *
 * Só existe fora de produção. É o que deixa revisar o desenho no celular e no
 * computador (regra 15 das aulas ao vivo) e tirar as capturas de tela.
 */
import { notFound, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ListaDeAulas } from "@/components/live/ListaDeAulas";
import { SalaDoAluno } from "@/components/live/SalaDoAluno";
import { ChatAoVivo } from "@/components/live/ChatAoVivo";
import { QuadroDeDuvidas } from "@/components/live/QuadroDeDuvidas";
import { FilaDeDuvidas } from "@/components/live/FilaDeDuvidas";
import { EstudioDoProfessor } from "@/components/live/EstudioDoProfessor";
import { ResumoDaChamada } from "@/components/live/PainelDaChamada";
import { VerificacaoDoVideo } from "@/components/live/VerificacaoDoVideo";
import { CabecalhoDaAgenda, ListaDaAgenda } from "@/components/live/AgendaDoProfessor";
import type { MensagemDoChat } from "@/lib/live-chat";
import type { Duvida } from "@/lib/lives";

const daquiA = (min: number) => new Date(Date.now() + min * 60_000).toISOString();
const haMin = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

const AULAS = [
  { id: "a1", title: "Aulão de Matemática: funções e gráficos que caem no ENEM", status: "live", start_time: haMin(25), teacher_name: "Prof. Carlos Henrique de Souza", youtube_id: "dQw4w9WgXcQ", turmas: [] as string[], meet_link: "https://meet.google.com/abc-defg-hij", description: "Revisão completa de função afim e quadrática com questões do ENEM 2023 e 2024." },
  { id: "a2", title: "Redação: proposta de intervenção sem perder a C5", status: "scheduled", start_time: daquiA(90), teacher_name: "Profa. Ana Beatriz", youtube_id: null, turmas: ["7", "8", "9"] },
  { id: "a3", title: "Química orgânica", status: "scheduled", start_time: daquiA(60 * 26), teacher_name: "Prof. Marcos", youtube_id: null, turmas: ["ETEC"] },
  { id: "a4", title: "Plantão de dúvidas de História", status: "completed", start_time: haMin(60 * 30), teacher_name: "Prof. Rafael", youtube_id: "dQw4w9WgXcQ", turmas: [] as string[] },
];

const MENSAGENS: MensagemDoChat[] = [
  { id: 1, versao: 1, user_id: "u1", user_name: "Maria Eduarda Santos", equipe: false, texto: "boa noite professor!!", oculta: false, created_at: haMin(20) },
  { id: 2, versao: 2, user_id: "prof", user_name: "Carlos Henrique", equipe: true, texto: "Boa noite, turma! Já já começamos. Mandem as dúvidas pela aba Dúvida que eu respondo ao longo da aula.", oculta: false, created_at: haMin(19) },
  { id: 3, versao: 3, user_id: "u2", user_name: "João Pedro Oliveira", equipe: false, texto: "o som ta baixo pra alguem mais?", oculta: false, created_at: haMin(18) },
  { id: 4, versao: 4, user_id: "u3", user_name: "Ana Clara", equipe: false, texto: "aqui ta normal", oculta: false, created_at: haMin(18) },
  { id: 5, versao: 5, user_id: "eu", user_name: "Lucas Gabriel Ferreira", equipe: false, texto: "essa questão 2 é a da prova do ano passado né", oculta: false, created_at: haMin(12) },
  { id: 6, versao: 6, user_id: "u4", user_name: "Beatriz", equipe: false, texto: "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk", oculta: false, created_at: haMin(11) },
  { id: 7, versao: 7, user_id: "u5", user_name: "Gabriel Souza", equipe: false, texto: "professor pode repetir a parte do vértice? não entendi como achou o x", oculta: false, created_at: haMin(5) },
  { id: 8, versao: 8, user_id: "u6", user_name: "Pedro", equipe: false, texto: null, oculta: true, created_at: haMin(4) },
  { id: 9, versao: 9, user_id: "u7", user_name: "Isabela Cristina", equipe: false, texto: "to anotando tudo 📝", oculta: false, created_at: haMin(1) },
];

const DUVIDAS: Duvida[] = [
  { id: "d1", created_at: haMin(15), user_name: "Lucas Gabriel Ferreira", content: "Na função quadrática, por que o vértice é o ponto máximo quando a < 0? Não entendi a relação com a concavidade.", is_answered: true, resposta: "Com a < 0 a parábola abre para baixo, então o vértice é o ponto mais alto. Vou desenhar no quadro daqui a pouco.", oculta: false },
  { id: "d2", created_at: haMin(6), user_name: "Lucas Gabriel Ferreira", content: "A fórmula do delta vale para qualquer equação de segundo grau?", is_answered: false, resposta: null, oculta: false },
];

const DUVIDAS_DO_PROFESSOR: Duvida[] = [
  ...DUVIDAS,
  { id: "d3", created_at: haMin(3), user_name: "Gabriel Souza", content: "pode repetir a parte do vértice? não entendi como achou o x", is_answered: false, resposta: null, oculta: false },
  { id: "d4", created_at: haMin(2), user_name: "Beatriz", content: "vai cair isso na prova de sábado?", is_answered: false, resposta: null, oculta: false },
];

const CHAMADA = {
  segundos_da_aula: 1500,
  segundos_para_presenca: 900,
  esperados: 855,
  chamada_id: null,
  alunos: [
    { id: "u1", nome: "Maria Eduarda Santos", sala: "7", segundos: 1480, presente: true },
    { id: "u2", nome: "João Pedro Oliveira", sala: "8", segundos: 1300, presente: true },
    { id: "u3", nome: "Ana Clara", sala: null, segundos: 700, presente: false },
    { id: "u4", nome: "Beatriz", sala: "12", segundos: 420, presente: false },
    { id: "u5", nome: "Gabriel Souza", sala: "9", segundos: 60, presente: false },
  ],
};

function Chat({ preencher, altura, equipe = false }: { preencher?: boolean; altura?: string; equipe?: boolean }) {
  const [texto, setTexto] = useState("");
  return (
    <ChatAoVivo
      mensagens={MENSAGENS}
      meuId="eu"
      souEquipe={equipe}
      noAr
      silenciado={false}
      silenciados={["u4"]}
      texto={texto}
      onTexto={setTexto}
      onEnviar={() => setTexto("")}
      enviando={false}
      onOcultar={equipe ? () => {} : undefined}
      onSilenciar={equipe ? () => {} : undefined}
      preencher={preencher}
      altura={altura}
    />
  );
}

function Duvidas({ noAr }: { noAr: boolean }) {
  const [texto, setTexto] = useState("");
  return <QuadroDeDuvidas duvidas={DUVIDAS} texto={texto} onTexto={setTexto} onEnviar={() => setTexto("")} enviando={false} noAr={noAr} />;
}

function Telas() {
  const tela = useSearchParams().get("tela") ?? "lista";
  const nada = () => {};

  if (tela === "lista") return <div className="p-4 max-w-2xl mx-auto"><ListaDeAulas aulas={AULAS} carregando={false} /></div>;

  if (tela === "sala-gravada") {
    return <SalaDoAluno aula={AULAS[3]} presenca={null} onVoltar={nada} duvidas={<Duvidas noAr={false} />} chat={<Chat preencher />} />;
  }

  if (tela === "sala" || tela === "sala-agendada") {
    const aula = tela === "sala" ? AULAS[0] : { ...AULAS[1], meet_link: null };
    return (
      <SalaDoAluno
        aula={aula}
        presenca={tela === "sala" ? { segundos: 1520, segundosDaAula: 1500 } : { segundos: 0, segundosDaAula: 0 }}
        onVoltar={nada}
        duvidas={<Duvidas noAr={tela === "sala"} />}
        chat={<Chat preencher />}
      />
    );
  }

  if (tela === "agenda") {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <CabecalhoDaAgenda noAr={1} proximas={2} botao={<button className="h-11 px-4 rounded-xl bg-orange-500 text-white text-xs font-black uppercase tracking-widest">Nova aula</button>} />
        <ListaDaAgenda aulas={AULAS} carregando={false} excluindoId={null} onEditar={nada} onExcluir={nada} />
      </div>
    );
  }

  const agendado = tela === "estudio-agendado";
  const aula = agendado ? { ...AULAS[1], youtube_id: "dQw4w9WgXcQ" } : AULAS[0];
  return (
    <EstudioDoProfessor
      aula={aula}
      atualizando={false}
      onTrocarStatus={nada}
      onVoltar={nada}
      duvidas={<FilaDeDuvidas duvidas={DUVIDAS_DO_PROFESSOR} salvandoId={null} onRespondidaNaAula={nada} onResponder={async () => true} onOcultar={nada} />}
      chamada={<ResumoDaChamada resumo={agendado ? { ...CHAMADA, segundos_da_aula: 0, alunos: [] } : CHAMADA} status={aula.status} />}
      chat={<Chat equipe altura="h-[340px] lg:h-[max(260px,calc(100dvh-26rem))]" />}
      video={<VerificacaoDoVideo verificacao={agendado ? { ok: false, motivo: "nao_embute", definitivo: true } : { ok: true, titulo: "Aulão de Matemática — funções", canal: "Cursinho Compromisso" }} verificando={false} onVerificar={nada} />}
      videoVerificado={!agendado}
    />
  );
}

function Moldura({ children }: { children: React.ReactNode }) {
  // A sala é "full bleed": no app ela vive dentro de um `h-[100dvh]
  // overflow-hidden` (layout do dashboard). Sem isso a prévia rolaria e não
  // mostraria o problema que a regra 16 corrige.
  const tela = useSearchParams().get("tela") ?? "lista";
  const cheia = tela.startsWith("sala");
  return <div className={`bg-background text-foreground ${cheia ? "h-[100dvh] flex flex-col overflow-hidden" : "min-h-[100dvh]"}`}>{children}</div>;
}

export default function LivePreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  // Os dados de exemplo usam o relógio: renderizar só no cliente evita a
  // diferença servidor/cliente na hidratação (que trava os botões).
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (!montado) return null;
  return (
    <Suspense fallback={null}>
      <Moldura>
        <Telas />
      </Moldura>
    </Suspense>
  );
}
