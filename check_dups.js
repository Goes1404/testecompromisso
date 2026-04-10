
const fs = require('fs');

const fileContent = fs.readFileSync('full_student_list_grouped.md', 'utf8');
const lines = fileContent.split('\n');
const emails = [];

for (const line of lines) {
    if (line.includes('|') && !line.includes('Nome') && !line.includes('---')) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 3) {
            const email = parts[2]?.toLowerCase();
            if (email && email.includes('@')) {
                emails.push(email);
            }
        }
    }
}

const uniqueEmails = new Set(emails);
console.log('Total emails in file:', emails.length);
console.log('Unique emails in file:', uniqueEmails.size);

if (emails.length !== uniqueEmails.size) {
    const counts = {};
    emails.forEach(e => counts[e] = (counts[e] || 0) + 1);
    const dups = Object.entries(counts).filter(([e, c]) => c > 1);
    console.log('Duplicates found:', dups.length);
    console.log('First 5 duplicates:', dups.slice(0, 5));
}
