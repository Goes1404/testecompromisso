import fs from 'fs';

const texts = JSON.parse(fs.readFileSync('extracted_texts.json'));
const typos = [
    /\bvoce\b/i, /\btambem\b/i, /\bnao\b/i, /\bsao\b/i, /\baplicacao\b/i,
    /\busuario(s)?\b/i, /\bmodulo(s)?\b/i, /\bestrategia(s)?\b/i, /\bfrequencia\b/i,
    /\bconcluido\b/i, /\bbasico(s)?\b/i, /\bduvida(s)?\b/i, /\bcodigo(s)?\b/i,
    /\bhistorico(s)?\b/i, /\banalise(s)?\b/i, /\bmateria(s)?\b/i, /\bpedagogico(s)?\b/i,
    /\bgrafico(s)?\b/i, /\brelatorio(s)?\b/i, /\bminimo\b/i, /\bmaximo\b/i,
    /\bproximo(s)?\b/i, /\brapido(s)?\b/i, /\bdificil\b/i, /\bfacil\b/i,
    /\bpossivel\b/i, /\bimpossivel\b/i, /\bmetodo(s)?\b/i, /\bconteudo(s)?\b/i,
    /\bquestao\b/i, /\bquestoes\b/i, /\batraves\b/i, /\bgratis\b/i, /\bmatricula\b/i,
    /\bparagrafo\b/i, /\bexessão\b/i, /\bexceçao\b/i, /\bconcerteza\b/i, /\bderrepente\b/i,
    /\bexcessao\b/i, /\batt\b/i, /\binfos\b/i, /\bacessar\b/i,
    /\bseja bem vindo\b/i, /\bconcluzão\b/i, /\benrrolado\b/i, /\bporisso\b/i,
    /\bnada a ver\b/i, /\bnada aver\b/i, /\bauto escola\b/i, /\bassim que possivel\b/i,
    /\btrajetoria\b/i, /\bscopo\b/i, /\bacuracia\b/i, /\bdesenpenho\b/i, /\blicensa\b/i
];

const results = [];
texts.forEach(item => {
    // Check if the text has any typo (ignoring case)
    const textStr = item.text;
    for (const regex of typos) {
        if (regex.test(textStr)) {
            // Also need to ignore false positives like "nao" in English words or similar, but our regex has word boundaries \b
            // But wait, \b in JS regex doesn't see accented characters as word characters!
            // 'nao' with \b is fine, because 'o' is a word char.
            results.push({ file: item.file, text: textStr, match: regex.source });
            break;
        }
    }
});

let output = '';
results.forEach(r => {
    output += File: \nText: \nProblem: \n\n;
});
fs.writeFileSync('typos_found.txt', output);
console.log(Found  literal typos.);
