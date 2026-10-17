import type { SupabaseClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";

/**
 * Autorização das rotas chamadas pelo `pg_cron` (`/api/cron/*`). SÓ SERVIDOR.
 * Saiu de `lembrete-diario` em 17/10 para o aviso de aula sem link usar a
 * mesma régua.
 */

/** Compara segredos sem vazar quanto do valor o chamador já acertou. */
export function segredoConfere(recebido: string, esperado: string): boolean {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * O segredo que autoriza esta chamada.
 *
 * Fonte da verdade é `configuracao_privada` no banco, e não uma variável de
 * ambiente. O motivo é prático: quem assina a chamada é o `pg_cron`, que roda
 * DENTRO do Postgres e só sabe ler dali. Guardar o mesmo valor também na Vercel
 * criaria duas cópias do mesmo segredo, que precisam ser trocadas juntas — e a
 * primeira vez que uma delas ficar para trás, o lembrete para de sair sem
 * ninguém entender por quê.
 *
 * A tabela tem RLS ligada e nenhuma policy: `anon` e `authenticated` não leem
 * uma linha sequer. Chegam nela apenas o `postgres` (que é quem o cron usa) e a
 * service role — que esta rota já precisa ter de qualquer modo para consultar
 * os alunos. Ou seja, nenhum acesso novo foi criado.
 *
 * `CRON_SECRET` continua sendo aceito e tem prioridade, para o dia em que
 * alguém quiser tirar o segredo do banco sem mexer em código.
 */
export async function segredoEsperado(admin: SupabaseClient): Promise<string | null> {
  const doAmbiente = process.env.CRON_SECRET;
  if (doAmbiente && doAmbiente.length >= 16) return doAmbiente;

  const { data, error } = await admin
    .from("configuracao_privada")
    .select("valor")
    .eq("chave", "cron_secret")
    .maybeSingle();

  if (error || !data?.valor || data.valor.length < 16) return null;
  return data.valor;
}

