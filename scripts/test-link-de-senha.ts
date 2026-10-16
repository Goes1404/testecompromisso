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
  montarLinkDeConvite,
  montarLinkDeSenha,
  origemDoLink,
  validadeDoLink,
  mensagemDoLink,
  textoDoLote,
  senhaAtendeRequisitos,
  TIPO_DO_TOKEN,
} from '../src/lib/link-de-senha';
import { assinarLinkDeSenha, conferirLinkDeSenha } from '../src/lib/link-de-senha-token';

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

// ── Link de 24 h, várias vezes (16/10) ──────────────────────────────────
const SEGREDO = 'segredo-de-teste-com-mais-de-16';
const ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const AGORA = Date.UTC(2026, 9, 16, 12);
const HORA = 3_600_000;

ok('link assinado: vale por 24 h e confere quantas vezes for aberto', () => {
  const t = assinarLinkDeSenha(ID, 3, { agora: AGORA, segredo: SEGREDO });
  for (let i = 0; i < 5; i++) {
    const r = conferirLinkDeSenha(t, { agora: AGORA + 23 * HORA, segredo: SEGREDO });
    assert.deepEqual(r, { ok: true, userId: ID, versao: 3, expiraEm: AGORA + 24 * HORA });
  }
});

ok('link assinado: depois de 24 h diz "expirado"', () => {
  const t = assinarLinkDeSenha(ID, 1, { agora: AGORA, segredo: SEGREDO });
  assert.deepEqual(conferirLinkDeSenha(t, { agora: AGORA + 24 * HORA + 1, segredo: SEGREDO }), { ok: false, motivo: 'expirado' });
});

ok('link assinado: trocar o aluno, o prazo ou a versão invalida a assinatura', () => {
  const t = assinarLinkDeSenha(ID, 1, { agora: AGORA, segredo: SEGREDO });
  const [payload, sig] = t.split('.');
  const texto = Buffer.from(payload, 'base64url').toString();
  const outro = texto.replace(ID, '11111111-2222-4333-8444-555555555555');
  const prazo = texto.replace(String(AGORA + 24 * HORA), String(AGORA + 999 * HORA));
  const versao = texto.replace(/\.1\./, '.9.');
  for (const adulterado of [outro, prazo, versao]) {
    const tk = `${Buffer.from(adulterado).toString('base64url')}.${sig}`;
    assert.deepEqual(conferirLinkDeSenha(tk, { agora: AGORA, segredo: SEGREDO }), { ok: false, motivo: 'invalido' });
  }
  assert.deepEqual(conferirLinkDeSenha(t, { agora: AGORA, segredo: 'outro-segredo-de-teste-16+' }), { ok: false, motivo: 'invalido' });
  assert.equal(conferirLinkDeSenha(t + 'x', { agora: AGORA, segredo: SEGREDO }).ok, false);
  assert.equal(conferirLinkDeSenha('', { segredo: SEGREDO }).ok, false);
  assert.equal(conferirLinkDeSenha(null, { segredo: SEGREDO }).ok, false);
});

ok('link assinado: dois links do mesmo aluno são diferentes (nonce)', () => {
  const a = assinarLinkDeSenha(ID, 1, { agora: AGORA, segredo: SEGREDO });
  const b = assinarLinkDeSenha(ID, 1, { agora: AGORA, segredo: SEGREDO });
  assert.notEqual(a, b);
});

ok('link assinado: ida e volta pela tela', () => {
  const t = assinarLinkDeSenha(ID, 2, { agora: AGORA, segredo: SEGREDO });
  const link = montarLinkDeConvite('https://app.exemplo', t, 'primeiro-acesso');
  const u = new URL(link);
  assert.equal(u.pathname, '/reset-password');
  assert.deepEqual(lerLinkDeSenha(u.search, ''), { tipo: 'convite', convite: t, finalidade: 'primeiro-acesso' });
  assert.equal(lerLinkDeSenha('?convite=abc.def', '').tipo, 'erro');
});

ok('a secretaria lê a validade certa de cada link', () => {
  assert.match(validadeDoLink('https://x/reset-password?convite=a.b&para=redefinir').rotulo, /24 horas/);
  assert.match(validadeDoLink('https://x/reset-password?token_hash=abc&type=recovery').rotulo, /1 hora/);
});

ok('mensagem do WhatsApp: primeiro nome só, avisa que é pessoal, link no fim', () => {
  const m = mensagemDoLink('Maria Eduarda de Oliveira Messina', 'https://x/reset-password?convite=a.b');
  assert.match(m, /^Olá, Maria!/);
  assert.ok(!m.includes('Messina'));
  assert.match(m, /24 horas/);
  assert.match(m, /não repasse/);
  assert.ok(m.endsWith('https://x/reset-password?convite=a.b'));
  assert.match(mensagemDoLink(null, 'L'), /^Olá! /);
});

ok('lote: só quem tem link entra no texto, um bloco por aluno', () => {
  const t = textoDoLote([{ nome: 'Ana', link: 'L1' }, { nome: 'Bia' }, { nome: null, link: 'L3' }]);
  assert.equal(t, 'Ana\nL1\n\nAluno\nL3');
});

console.log(`\nlink de senha: ${n} testes, tudo certo`);
