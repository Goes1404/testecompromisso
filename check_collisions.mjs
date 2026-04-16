
import fs from 'fs';

function generateEmail(name) {
    const nameParts = name.trim().split(' ').filter(p => p.length > 0);
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    let secondNameInitial = '';
    if (nameParts.length >= 2) {
        secondNameInitial = nameParts[1][0].toLowerCase();
    }
    const emailPart = (firstName + secondNameInitial + lastName)
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
    return `${emailPart}@compromisso.com`;
}

const content = fs.readFileSync('gen_full_list.js', 'utf8');
const enemMatch = content.match(/const RawDataENEM = `([\s\S]*?)`;/);
const etecMatch = content.match(/const RawDataETEC = `([\s\S]*?)`;/);

const parseBlock = (raw) => {
    const lines = raw.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const res = [];
    for(let i=0; i < lines.length; i += 2) {
        const name = lines[i];
        if(!name) continue;
        res.push({ name, email: generateEmail(name) });
    }
    return res;
};

const all = [...parseBlock(enemMatch[1]), ...parseBlock(etecMatch[1])];
const emails = {};
const collisions = [];

all.forEach(s => {
    if (emails[s.email]) {
        collisions.push({ email: s.email, names: [emails[s.email], s.name] });
    } else {
        emails[s.email] = s.name;
    }
});

console.log('Total Collisions:', collisions.length);
if (collisions.length > 0) {
    console.log(JSON.stringify(collisions, null, 2));
}
