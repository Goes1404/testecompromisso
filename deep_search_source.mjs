
import fs from 'fs';

const content = fs.readFileSync('students_source_718.txt', 'utf8');
const searchTerms = [
    'Leonardo',
    'Richardy',
    'Luiz Claudio',
    'Mathias'
];

searchTerms.forEach(term => {
    console.log(`--- Searching for: ${term} ---`);
    const regex = new RegExp(term, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
        const start = Math.max(0, match.index - 50);
        const end = Math.min(content.length, match.index + 150);
        console.log(content.substring(start, end));
        console.log('---------------------------');
    }
});
