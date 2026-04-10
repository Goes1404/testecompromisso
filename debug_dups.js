
const fs = require('fs');

const fileContent = fs.readFileSync('full_student_list_grouped.md', 'utf8');
const lines = fileContent.split('\n');
const names = [];

for (const line of lines) {
    if (line.includes('|') && !line.includes('Nome') && !line.includes('---')) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 3) {
            const name = parts[1];
            if (name) {
                names.push(name);
            }
        }
    }
}

const counts = {};
names.forEach(n => counts[n] = (counts[n] || 0) + 1);
const dups = Object.entries(counts).filter(([n, c]) => c > 1);
console.log('Duplicate names total:', dups.length);
console.log('Sample duplicates:', dups.slice(0, 10));
