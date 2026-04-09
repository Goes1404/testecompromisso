import fs from 'fs';

const textsPath = 'extracted_texts.json';
const texts = JSON.parse(fs.readFileSync(textsPath, 'utf8'));

const typos = [
    /voce/i, /tambem/i, /\bnao\b/i, /\bsao\b/i, /aplicacao/i,
    /usuario/i, /modulo/i, /estrategia/i, /frequencia/i,
    /concluido/i, /basico/i, /duvida/i, /codigo/i,
    /historico/i, /analise/i, /materia/i, /pedagogico/i,
    /grafico/i, /relatorio/i, /minimo/i, /maximo/i,
    /proximo/i, /rapido/i, /dificil/i, /facil/i,
    /possivel/i, /impossivel/i, /metodo/i, /conteudo/i,
    /questao/i, /questoes/i, /atraves/i, /gratis/i, /matricula/i,
    /paragrafo/i, /exessão/i, /exceçao/i, /concerteza/i, /derrepente/i,
    /excessao/i, /seja bem vindo/i, /concluzão/i, /enrrolado/i, /porisso/i,
    /nada a ver/i, /nada aver/i, /auto escola/i, /assim que possivel/i,
    /trajetoria/i, /scopo/i, /acuracia/i, /desenpenho/i, /licensa/i,
    /aplicaçao/i, /exitem/i, /estao/i
];

const results = [];
texts.forEach(item => {
    const textStr = item.text;
    for (const regex of typos) {
        if (regex.test(textStr)) {
            // Check if it's a false positive (like an English word "basic", "code", "method", "module"?)
            // We're checking without \b to avoid issues, but we might catch English words if we aren't careful.
            // Let's filter out if it's part of a known english class name or path
            if (textStr.includes('className=') || textStr.includes('.tsx')) continue;

            const isKnownEnglish = /code|module|method/i.test(textStr);
            if (!isKnownEnglish) {
                results.push({ file: item.file, text: textStr, match: regex.source });
                break;
            }
        }
    }
});

let output = '';
results.forEach(r => {
    output += `File: ${r.file}\nText: ${r.text}\nProblem: ${r.match}\n\n`;
});
fs.writeFileSync('typos_found.txt', output);
console.log(`Found ${results.length} literal typos.`);
