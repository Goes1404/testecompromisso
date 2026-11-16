"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SCHOOL_LIST } from "@/lib/constants";
import {
  Ficha, FICHA_VAZIA, PASSOS, ESCOLA_TIPOS, TURNOS, COMO_CONHECEU, PARENTESCOS,
  ErrosDaFicha, validarFicha, errosDoPasso, ehMenor, hojeNaEscola, FOCOS_NA_FICHA_ONLINE, Foco,
} from "@/lib/matricula";

export type RespostaDoEnvio = { protocolo: string } | { erro: string; erros?: ErrosDaFicha };

/**
 * Ficha de inscrição em 4 passos. A série não é perguntada: vem do foco
 * (`serieDoFoco`). Só desenha e valida; quem grava é quem usa
 * (`/matricula` chama a API pública, a planilha da equipe chama a do balcão).
 * A validação é a mesma de `validarFicha()` que a API roda de novo.
 */
export function FormularioDaFicha({
  onEnviar,
  modo = "site",
  inicial = FICHA_VAZIA,
}: {
  onEnviar: (f: Ficha) => Promise<RespostaDoEnvio>;
  modo?: "site" | "secretaria";
  inicial?: Ficha;
}) {
  const hoje = useMemo(() => hojeNaEscola(), []);
  // Na ficha online só existe ETEC: já vem marcado.
  const [f, setF] = useState<Ficha>(modo === "site" && !inicial.foco ? { ...inicial, foco: FOCOS_NA_FICHA_ONLINE[0] } : inicial);
  const [passo, setPasso] = useState(0);
  const [erros, setErros] = useState<ErrosDaFicha>({});
  const [enviando, setEnviando] = useState(false);
  const [erroGeral, setErroGeral] = useState("");
  const [isca, setIsca] = useState("");

  const menor = ehMenor(f.nascimento, hoje);
  const set = <K extends keyof Ficha>(k: K, v: Ficha[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    if (erros[k]) setErros((e) => ({ ...e, [k]: undefined }));
  };

  const avancar = () => {
    const e = errosDoPasso(passo, validarFicha(f, hoje).erros);
    setErros(e);
    if (Object.keys(e).length) return;
    setPasso((p) => p + 1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const enviar = async () => {
    const { erros: e } = validarFicha(f, hoje);
    if (Object.keys(e).length) {
      setErros(e);
      const primeiro = PASSOS.findIndex((p) => p.campos.some((c) => c in e));
      if (primeiro >= 0) setPasso(primeiro);
      return;
    }
    setEnviando(true);
    setErroGeral("");
    try {
      const r = await onEnviar({ ...f, ...(isca ? { site: isca } : {}) } as Ficha);
      if ("erro" in r) {
        setErroGeral(r.erro);
        if (r.erros && Object.keys(r.erros).length) {
          setErros(r.erros);
          const primeiro = PASSOS.findIndex((p) => p.campos.some((c) => c in (r.erros ?? {})));
          if (primeiro >= 0) setPasso(primeiro);
        }
      }
    } finally {
      setEnviando(false);
    }
  };

  const ultimo = passo === PASSOS.length - 1;

  return (
    <div className="space-y-6">
      {/* Passos como bolinhas de gabarito: preenchida = feito, contornada = agora. */}
      <ol className="flex items-start" aria-label="Passos da ficha">
        {PASSOS.map((p, i) => {
          const feito = i < passo, agora = i === passo;
          return (
            <li key={p.titulo} className="flex-1 flex flex-col items-center gap-1.5 relative" aria-current={agora ? "step" : undefined}>
              {i > 0 && (
                <span className={`absolute top-[15px] right-1/2 w-full h-0.5 -z-0 ${i <= passo ? "bg-orange-400" : "bg-slate-200 dark:bg-slate-700"}`} />
              )}
              <span className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center text-sm font-black transition-colors ${
                feito ? "bg-orange-500 text-white"
                  : agora ? "bg-white text-orange-600 ring-[3px] ring-orange-500 dark:bg-slate-900"
                  : "bg-white text-slate-400 ring-2 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"}`}>
                {feito ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className={`text-xs font-bold ${agora ? "text-orange-600" : feito ? "text-slate-600 dark:text-slate-300" : "text-slate-400"}`}>
                {p.titulo}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Isca para robô: fora da tela, sem tab, sem preencher automático. */}
      <input
        type="text" name="site" value={isca} onChange={(e) => setIsca(e.target.value)}
        tabIndex={-1} autoComplete="off" aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      {passo === 0 && (
        <Grupo titulo={modo === "site" ? "Seus dados" : "Dados do aluno"}>
          <Campo rotulo="Nome completo do aluno" erro={erros.nome}>
            <Input value={f.nome} onChange={(e) => set("nome", e.target.value)} autoComplete="name" placeholder="Como está no RG" className="h-12 rounded-xl" />
          </Campo>
          <Campo rotulo="Data de nascimento" erro={erros.nascimento}>
            <Input type="date" value={f.nascimento} onChange={(e) => set("nascimento", e.target.value)} max={hoje} className="h-12 rounded-xl" />
          </Campo>
          <Campo rotulo="Celular com WhatsApp" erro={erros.celular} dica="Com DDD. É por ele que a secretaria vai chamar.">
            <Input type="tel" inputMode="tel" value={f.celular} onChange={(e) => set("celular", e.target.value)} autoComplete="tel" placeholder="(11) 91234-5678" className="h-12 rounded-xl" />
          </Campo>
          <Campo rotulo="E-mail (opcional)" erro={erros.email}>
            <Input type="email" inputMode="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" className="h-12 rounded-xl" />
          </Campo>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo rotulo="Bairro" erro={erros.bairro}>
              <Input value={f.bairro} onChange={(e) => set("bairro", e.target.value)} className="h-12 rounded-xl" />
            </Campo>
            <Campo rotulo="Cidade" erro={erros.cidade}>
              <Input value={f.cidade} onChange={(e) => set("cidade", e.target.value)} className="h-12 rounded-xl" />
            </Campo>
          </div>
        </Grupo>
      )}

      {passo === 1 && (
        <Grupo titulo="Estudos">
          <Campo grupo rotulo={modo === "site" ? "Inscrição para" : "Vai se preparar para"} erro={erros.foco}>
            <Opcoes
              valor={f.foco} onChange={(v) => set("foco", v as Ficha["foco"])}
              opcoes={[{ valor: "ETEC", rotulo: "ETEC", sub: "Vestibulinho · 9º ano" }, { valor: "ENEM", rotulo: "ENEM", sub: "3º ano ou já formado" }]
                .filter((o) => modo !== "site" || FOCOS_NA_FICHA_ONLINE.includes(o.valor as Foco))}
              colunas={modo === "site" ? 1 : 2} grande
            />
          </Campo>
          <Campo grupo rotulo="Escola onde estuda" erro={erros.escola}>
            <EscolhaDaEscola valor={f.escola} onChange={(v) => set("escola", v)} />
          </Campo>
          <Campo grupo rotulo="A escola é" erro={erros.escola_tipo}>
            <Opcoes valor={f.escola_tipo} onChange={(v) => set("escola_tipo", v as Ficha["escola_tipo"])} opcoes={ESCOLA_TIPOS} colunas={3} />
          </Campo>
          <Campo grupo rotulo="Turno em que estuda na escola" erro={erros.turno_escola}>
            <Opcoes valor={f.turno_escola} onChange={(v) => set("turno_escola", v as Ficha["turno_escola"])} opcoes={TURNOS} colunas={2} />
          </Campo>
          <div className="space-y-2">
            <Marcar marcado={f.ja_fez_cursinho} onChange={(v) => set("ja_fez_cursinho", v)}>Já fez cursinho antes</Marcar>
            <Marcar marcado={f.ex_aluno} onChange={(v) => set("ex_aluno", v)}>Foi aluno do Compromisso em 2026</Marcar>
          </div>
        </Grupo>
      )}

      {passo === 2 && (
        <Grupo titulo={menor ? "Responsável (obrigatório para menor de 18)" : "Responsável ou contato de emergência (opcional)"}>
          {menor && (
            <p className="text-sm font-semibold text-orange-800 bg-orange-50 border border-orange-200 rounded-xl p-3 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-100">
              O aluno tem menos de 18 anos. Os dados do responsável são obrigatórios, e é ele quem confirma a matrícula na secretaria.
            </p>
          )}
          <Campo rotulo="Nome completo" erro={erros.resp_nome}>
            <Input value={f.resp_nome} onChange={(e) => set("resp_nome", e.target.value)} className="h-12 rounded-xl" />
          </Campo>
          <Campo grupo rotulo="Parentesco" erro={erros.resp_parentesco}>
            <Opcoes valor={f.resp_parentesco} onChange={(v) => set("resp_parentesco", v)} opcoes={PARENTESCOS.map((p) => ({ valor: p, rotulo: p }))} colunas={2} />
          </Campo>
          <Campo rotulo="Celular do responsável" erro={erros.resp_celular}>
            <Input type="tel" inputMode="tel" value={f.resp_celular} onChange={(e) => set("resp_celular", e.target.value)} placeholder="(11) 91234-5678" className="h-12 rounded-xl" />
          </Campo>
          <Campo grupo rotulo="Como conheceu o cursinho? (opcional)">
            <Opcoes valor={f.como_conheceu} onChange={(v) => set("como_conheceu", v)} opcoes={COMO_CONHECEU.map((p) => ({ valor: p, rotulo: p }))} colunas={2} />
          </Campo>
        </Grupo>
      )}

      {passo === 3 && (
        <Grupo titulo="Autorizações">
          <Marcar marcado={f.aceite_veracidade} onChange={(v) => set("aceite_veracidade", v)} erro={erros.aceite_veracidade} destaque>
            Declaro que as informações desta ficha são verdadeiras.
          </Marcar>
          <Marcar marcado={f.aceite_dados} onChange={(v) => set("aceite_dados", v)} erro={erros.aceite_dados} destaque>
            {menor
              ? "Sou o responsável (ou estou com ele agora) e autorizo o Cursinho Compromisso a usar estes dados só para a matrícula e para falar sobre as aulas."
              : "Autorizo o Cursinho Compromisso a usar estes dados só para a matrícula e para falar sobre as aulas."}
          </Marcar>
          <Marcar marcado={f.aceite_imagem} onChange={(v) => set("aceite_imagem", v)}>
            (Opcional) Autorizo o uso de fotos e vídeos do aluno nas redes do cursinho. Pode deixar desmarcado.
          </Marcar>
          <p className="text-xs text-slate-500 leading-relaxed">
            Não pedimos CPF, RG nem endereço completo pela internet. O documento é conferido na secretaria, na confirmação da matrícula.
          </p>
        </Grupo>
      )}

      {erroGeral && (
        <p role="alert" className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-200">
          {erroGeral}
        </p>
      )}

      <div className="flex gap-3">
        {passo > 0 && (
          <Button type="button" variant="outline" onClick={() => setPasso((p) => p - 1)} disabled={enviando} className="h-14 rounded-2xl px-5 font-black">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Voltar</span>
          </Button>
        )}
        <Button
          type="button"
          onClick={ultimo ? enviar : avancar}
          disabled={enviando}
          className="flex-1 min-w-0 h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-base shadow-[0_10px_24px_-10px_rgba(234,88,12,0.7)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
        >
          {enviando ? <Loader2 className="h-5 w-5 animate-spin" />
            : ultimo ? <><Check className="h-5 w-5 mr-2" /> {modo === "site" ? "Enviar inscrição" : "Registrar inscrição"}</>
            : <>Continuar <ArrowRight className="h-5 w-5 ml-2" /></>}
        </Button>
      </div>
    </div>
  );
}

/**
 * Escola: caixa com setinha que abre a lista das escolas da cidade (o seletor
 * nativo do celular, que rola e é fácil de tocar). "Outra escola" abre o campo
 * para digitar. O <datalist> antigo não mostrava as escolas no celular.
 */
const OUTRA_ESCOLA = "__outra__";
function EscolhaDaEscola({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const naLista = SCHOOL_LIST.includes(valor);
  const [outra, setOutra] = useState(!!valor && !naLista);
  return (
    <div className="space-y-2">
      <div className="relative">
        <select
          aria-label="Escola"
          value={outra ? OUTRA_ESCOLA : naLista ? valor : ""}
          onChange={(e) => {
            const v = e.target.value;
            if (v === OUTRA_ESCOLA) { setOutra(true); onChange(""); }
            else { setOutra(false); onChange(v); }
          }}
          className={`w-full h-12 appearance-none rounded-xl border border-input bg-background pl-3 pr-11 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
            outra || naLista ? "text-slate-900 dark:text-white" : "text-muted-foreground"}`}
        >
          <option value="" disabled>Escolha a escola</option>
          {SCHOOL_LIST.map((e) => <option key={e} value={e}>{e}</option>)}
          <option value={OUTRA_ESCOLA}>Outra escola</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-500" />
      </div>
      {outra && (
        <Input autoFocus value={valor} onChange={(e) => onChange(e.target.value)} placeholder="Escreva o nome da escola" className="h-12 rounded-xl" aria-label="Nome da escola" />
      )}
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-5">
      <legend className="text-xl font-black italic tracking-tight text-slate-900 dark:text-white mb-4">{titulo}</legend>
      {children}
    </fieldset>
  );
}

/** Campo com rótulo. Grupo de botões não pode ficar dentro de <label> (o toque no rótulo apertaria o primeiro botão). */
function Campo({ rotulo, erro, dica, grupo, children }: { rotulo: string; erro?: string; dica?: string; grupo?: boolean; children: React.ReactNode }) {
  const Tag = grupo ? "div" : "label";
  return (
    <Tag className="block space-y-1.5">
      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{rotulo}</span>
      {children}
      {erro ? <span role="alert" className="block text-xs font-bold text-red-600">{erro}</span>
        : dica ? <span className="block text-xs text-slate-500">{dica}</span> : null}
    </Tag>
  );
}

function Opcoes({ valor, onChange, opcoes, colunas, grande }: {
  valor: string; onChange: (v: string) => void; opcoes: { valor: string; rotulo: string; sub?: string }[]; colunas: 1 | 2 | 3; grande?: boolean;
}) {
  const cols = colunas === 1 ? "grid-cols-1" : colunas === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3";
  return (
    <div role="radiogroup" className={`grid ${cols} gap-2`}>
      {opcoes.map((o) => {
        const ativo = valor === o.valor;
        return (
          <button
            key={o.valor} type="button" role="radio" aria-checked={ativo} onClick={() => onChange(ativo && !grande ? "" : o.valor)}
            className={`rounded-xl border-2 px-3 text-left transition-colors ${grande ? "py-4" : "py-3"} ${
              ativo ? "border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-500/15 dark:text-orange-100"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}
          >
            <span className={`block font-black ${grande ? "text-xl" : "text-sm"}`}>{o.rotulo}</span>
            {o.sub && <span className="block text-xs font-semibold opacity-70">{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Marcar({ marcado, onChange, erro, destaque, children }: {
  marcado: boolean; onChange: (v: boolean) => void; erro?: string; destaque?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button" role="checkbox" aria-checked={marcado} onClick={() => onChange(!marcado)}
        className={`w-full flex items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-colors ${
          marcado ? "border-orange-500 bg-orange-50 dark:bg-orange-500/15"
            : erro ? "border-red-300 bg-white dark:bg-slate-900" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}
      >
        <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center ${marcado ? "bg-orange-500 border-orange-500" : "border-slate-300"}`}>
          {marcado && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
        </span>
        <span className={`text-sm leading-snug ${destaque ? "font-bold text-slate-800 dark:text-slate-100" : "font-medium text-slate-600 dark:text-slate-300"}`}>{children}</span>
      </button>
      {erro && <span role="alert" className="block mt-1 text-xs font-bold text-red-600">{erro}</span>}
    </div>
  );
}
