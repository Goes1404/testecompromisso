/**
 * Testes do link de senha (primeiro acesso e redefinição).
 * `npx tsx scripts/test-link-de-senha.ts`
 *
 * O que está sob teste: o link que a secretaria gera e a leitura que a tela
 * faz dele. Antes de 16/10 nenhum dos dois funcionava — o convite nem era
 * gerado e o link de reset caía sempre em "Link expirado".
 */
import assert from 'node:assert/strict';
import {
  finalidadeDe,
  lerLinkDeSenha,
  mensagemDoErroDoLink,
  montarLinkDeSenha,
  origemDoLink,
  senhaAtendeRequisitos,
  TIPO_DO_TOKEN,
} from '../src/lib/link-de-senha';

let n = 0;
const ok = (nome: string, fn: () => void) => {
  fn();
  n++;
  console.log(`ok   ${nome}`);
};

const HASH = 'a3f1c0de9b8a7f6e5d4c3b2a19f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4';
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJh';

ok('convite e reset usam o mesmo token do Supabase (recovery)', () => {
  assert.equal(TIPO_DO_TOKEN, 'recovery');
});

ok('finalidade: convite vira primeiro acesso, o resto é redefinir', () => {
  assert.equal(finalidadeDe('invite'), 'primeiro-acesso');
  assert.equal(finalidadeDe('primeiro-acesso'), 'primeiro-acesso');
  assert.equal(finalidadeDe('recovery'), 'redefinir');
  assert.equal(finalidadeDe(null), 'redefinir');
  assert.equal(finalidadeDe('qualquer-coisa'), 'redefinir');
});

ok('origem: só protocolo e host, só http(s), com reserva', () => {
  assert.equal(origemDoLink('https://app.compromisso.com.br', null), 'https://app.compromisso.com.br');
  assert.equal(origemDoLink('https://app.compromisso.com.br/caminho?x=1', null), 'https://app.compromisso.com.br');
  assert.equal(origemDoLink('javascript:alert(1)', 'https://reserva.com'), 'https://reserva.com');
  assert.equal(origemDoLink(null, 'https://reserva.com/'), 'https://reserva.com');
  assert.equal(origemDoLink('lixo', 'também lixo'), 'http://localhost:3000');
});

ok('o link aponta para a nossa tela com token_hash, nunca para o Supabase', () => {
  const link = montarLinkDeSenha('https://app.x', HASH, 'primeiro-acesso');
  const u = new URL(link);
  assert.equal(u.origin + u.pathname, 'https://app.x/reset-password');
  assert.equal(u.searchParams.get('token_hash'), HASH);
  assert.equal(u.searchParams.get('type'), 'recovery');
  assert.equal(u.searchParams.get('para'), 'primeiro-acesso');
  assert.ok(!link.includes('supabase.co'));
});

ok('ida e volta: o que a rota monta é o que a tela lê', () => {
  for (const f of ['primeiro-acesso', 'redefinir'] as const) {
    const u = new URL(montarLinkDeSenha('https://app.x', HASH, f));
    assert.deepEqual(lerLinkDeSenha(u.search, u.hash), { tipo: 'token', tokenHash: HASH, finalidade: f });
  }
});

ok('link antigo (#access_token) ainda é lido, para os já enviados', () => {
  const r = lerLinkDeSenha('', `#access_token=${JWT}&refresh_token=abc123def&type=recovery&expires_in=3600`);
  assert.deepEqual(r, { tipo: 'sessao', accessToken: JWT, refreshToken: 'abc123def', finalidade: 'redefinir' });
  const convite = lerLinkDeSenha('', `#access_token=${JWT}&refresh_token=abc123def&type=invite`);
  assert.equal(convite.tipo === 'sessao' && convite.finalidade, 'primeiro-acesso');
});

ok('erro do Supabase no endereço vence tudo e vira texto para o aluno', () => {
  const r = lerLinkDeSenha(`?token_hash=${HASH}`, '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  assert.equal(r.tipo, 'erro');
  assert.match(r.tipo === 'erro' ? r.mensagem : '', /já foi usado ou passou do prazo/);
});

ok('link cortado ou adulterado não chega ao Supabase', () => {
  assert.equal(lerLinkDeSenha('?token_hash=abc', '').tipo, 'erro');
  assert.equal(lerLinkDeSenha('?token_hash=<script>alert(1)</script>xxxxxxxxxx', '').tipo, 'erro');
  assert.equal(lerLinkDeSenha('', '#access_token=nao-e-jwt&refresh_token=abc123def').tipo, 'erro');
  assert.equal(lerLinkDeSenha('', `#access_token=${JWT}`).tipo, 'erro');
});

ok('sem link nenhum: a tela não mostra formulário', () => {
  assert.deepEqual(lerLinkDeSenha('', ''), { tipo: 'nenhum' });
  assert.deepEqual(lerLinkDeSenha('?para=redefinir', ''), { tipo: 'nenhum' });
});

ok('mensagens: nunca o erro cru do servidor', () => {
  assert.match(mensagemDoErroDoLink('otp_expired'), /prazo de 1 hora/);
  assert.match(mensagemDoErroDoLink(undefined, 'Token has expired or is invalid'), /prazo de 1 hora/);
  assert.match(mensagemDoErroDoLink('over_request_rate_limit'), /Espere alguns minutos/);
  assert.match(mensagemDoErroDoLink('user_banned'), /bloqueada/);
  assert.match(mensagemDoErroDoLink('algo_novo', 'stack trace interno'), /Peça um link novo/);
  assert.ok(!mensagemDoErroDoLink('algo_novo', 'stack trace interno').includes('stack'));
});

ok('requisitos da senha iguais aos da tela', () => {
  assert.equal(senhaAtendeRequisitos('Compromisso#2026'), true);
  assert.equal(senhaAtendeRequisitos('compromisso2026'), false); // a senha padrão não passa
  assert.equal(senhaAtendeRequisitos('Ab1!'), false);
  assert.equal(senhaAtendeRequisitos('Abcdefg1_'), true); // qualquer símbolo vale, não só !@#
});

console.log(`\nlink de senha: ${n} testes, tudo certo`);
