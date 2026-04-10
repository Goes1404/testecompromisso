
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

const uniqueNames = new Set(names);
console.log('Total names in file:', names.length);
console.log('Unique names in file:', uniqueNames.size);
