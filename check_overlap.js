
const fs = require('fs');

const fileContent = fs.readFileSync('full_student_list_grouped.md', 'utf8');
const lines = fileContent.split('\n');

let currentType = 'enem';
const enemNames = new Set();
const etecNames = new Set();

for (const line of lines) {
    if (line.includes('## Alunos ETEC')) currentType = 'etec';
    if (line.includes('## Alunos ENEM')) currentType = 'enem';
    
    if (line.includes('|') && !line.includes('Nome') && !line.includes('---')) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 3) {
            const name = parts[1];
            if (name) {
                if (currentType === 'enem') enemNames.add(name);
                else etecNames.add(name);
            }
        }
    }
}

const intersection = [...enemNames].filter(n => etecNames.has(n));
console.log('Total ENEM names:', enemNames.size);
console.log('Total ETEC names:', etecNames.size);
console.log('Students in BOTH lists:', intersection.length);
console.log('Unique students across both (Names):', (new Set([...enemNames, ...etecNames])).size);
