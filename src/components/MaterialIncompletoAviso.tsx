import { AlertTriangle } from "lucide-react";
import type { ReactElement } from "react";

/** A questão traz o marcador de imagem pendente e não tem imagem para mostrar. */
export function materialIncompleto(questao: {
  question_text?: string | null;
  supporting_text?: string | null;
  image_url?: string | null;
}): boolean {
  if (questao.image_url) return false;
  const marcador = "[IMAGEM_PENDENTE]";
  return (
    (questao.question_text ?? "").includes(marcador) ||
    (questao.supporting_text ?? "").includes(marcador)
  );
}

/**
 * Aviso de questão sem o material completo.
 *
 * O importador marca com `[IMAGEM_PENDENTE]` a questão cuja imagem não veio
 * junto, e o painel do professor tem uma fila para resolver essas pendências.
 * A tela do aluno, porém, apagava o marcador em silêncio: sobrava o enunciado
 * pedindo para analisar um texto ou gráfico que não estava na tela, e a aluna
 * ficava tentando responder uma questão impossível. Melhor dizer o que houve.
 */
export function MaterialIncompletoAviso({ escuro = false }: { escuro?: boolean }): ReactElement {
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-2xl border p-4 ${
        escuro
          ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${escuro ? "text-amber-400" : "text-amber-600"}`} />
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest">
          Material incompleto
        </p>
        <p className={`text-xs font-medium leading-relaxed ${escuro ? "text-amber-100/80" : "text-amber-800"}`}>
          A imagem de apoio desta questão ainda não foi publicada, então não dá
          para respondê-la agora. Pule sem problema: ela não conta como erro no
          seu desempenho, e a equipe já foi avisada.
        </p>
      </div>
    </div>
  );
}
