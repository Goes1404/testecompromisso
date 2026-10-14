/**
 * Transmissão pela plataforma (`src/lib/transmissao.ts`).
 * `npx tsx scripts/test-transmissao.ts`
 */
import assert from 'node:assert/strict';
import { validarFaixas, faixasDaAula, destinoDaFaixa, gbPorHora, podeTransmitirAqui } from '../src/lib/transmissao';

let n = 0;
const ok = (nome: string, fn: () => void) => { fn(); n++; console.log('ok  ', nome); };

ok('aceita tela + microfone', () => {
  const r = validarFaixas([{ mid: '0', nome: 'tela' }, { mid: '1', nome: 'audio-mic' }]);
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.faixas.map((f) => f.tipo), ['video', 'audio']);
});
ok('aceita mid numérico (alguns navegadores)', () => {
  assert.equal(validarFaixas([{ mid: 0, nome: 'tela' }]).ok, true);
});
ok('recusa só áudio (não é aula)', () => {
  assert.equal(validarFaixas([{ mid: '0', nome: 'audio-mic' }]).ok, false);
});
ok('recusa nome desconhecido ou repetido', () => {
  assert.equal(validarFaixas([{ mid: '0', nome: 'hack' }]).ok, false);
  assert.equal(validarFaixas([{ mid: '0', nome: 'tela' }, { mid: '1', nome: 'tela' }]).ok, false);
});
ok('recusa lista vazia, gigante ou sem mid', () => {
  assert.equal(validarFaixas([]).ok, false);
  assert.equal(validarFaixas('x').ok, false);
  assert.equal(validarFaixas([{ nome: 'tela' }]).ok, false);
  assert.equal(validarFaixas(Array.from({ length: 5 }, (_, i) => ({ mid: String(i), nome: 'tela' }))).ok, false);
});
ok('faixas gravadas no banco são filtradas', () => {
  assert.deepEqual(faixasDaAula([{ nome: 'tela' }, { nome: 'xx' }, null]).map((f) => f.nome), ['tela']);
  assert.deepEqual(faixasDaAula(null), []);
});
ok('câmera vai para o canto só quando há tela', () => {
  assert.equal(destinoDaFaixa('camera', [{ nome: 'tela', tipo: 'video' }, { nome: 'camera', tipo: 'video' }]), 'canto');
  assert.equal(destinoDaFaixa('camera', [{ nome: 'camera', tipo: 'video' }]), 'principal');
  assert.equal(destinoDaFaixa('audio-mic', [{ nome: 'tela', tipo: 'video' }]), 'principal');
});
ok('estimativa de banda: 100 alunos ~ 58 GB por hora', () => {
  const gb = gbPorHora(100);
  assert.ok(gb > 50 && gb < 65, String(gb));
});
ok('celular não transmite tela', () => {
  assert.equal(typeof podeTransmitirAqui({ mediaDevices: { getDisplayMedia: () => {} } }, 'Mozilla/5.0 (iPhone)'), 'string');
  assert.equal(typeof podeTransmitirAqui({ mediaDevices: {} }, 'Mozilla/5.0 (Windows NT 10.0)'), 'string');
  assert.equal(podeTransmitirAqui({ mediaDevices: { getDisplayMedia: () => {} } }, 'Mozilla/5.0 (Windows NT 10.0)'), null);
});

console.log(`\ntransmissão: ${n} testes, tudo certo`);
