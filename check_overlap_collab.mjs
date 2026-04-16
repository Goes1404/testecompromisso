
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

const collaborators = [
  { email: "adrianevalente@compromisso.com" },
  { email: "christianeteodoro@compromisso.com" },
  { email: "angelicaaraujo@compromisso.com" },
  { email: "joelmabarbosa@compromisso.com" },
  { email: "pauloaraujo@compromisso.com" },
  { email: "franciscopio@compromisso.com" },
  { email: "paulosantos@compromisso.com" },
  { email: "alexandrecamargo@compromisso.com" },
  { email: "valeriasilva@compromisso.com" },
  { email: "denisbrito@compromisso.com" },
  { email: "jamescarvalho@compromisso.com" },
  { email: "paulosilva@compromisso.com" },
  { email: "reginaldolucindo@compromisso.com" },
  { email: "claudemiramaral@compromisso.com" },
  { email: "teylorsilva@compromisso.com" },
  { email: "pedrosampaio@compromisso.com" },
  { email: "jessicasilva@compromisso.com" },
  { email: "fernandomartins@compromisso.com" },
  { email: "brunolima@compromisso.com" },
  { email: "lucasgonsalves@compromisso.com" },
  { email: "luizsilva@compromisso.com" },
  { email: "luizfabiano@compromisso.com" },
  { email: "heliocarvalho@compromisso.com" },
  { email: "abrahaofreitas@compromisso.com" },
  { email: "selmaoliveira@compromisso.com" },
  { email: "rogerioloureiro@compromisso.com" },
  { email: "matheussilva@compromisso.com" },
  { email: "matheussantos@compromisso.com" },
  { email: "jorgeniocosta@compromisso.com" },
  { email: "eduardobezerra@compromisso.com" },
  { email: "augustosalgado@compromisso.com" }
];

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

const students = [...parseBlock(enemMatch[1]), ...parseBlock(etecMatch[1])];
const studentEmails = new Set(students.map(s => s.email.toLowerCase()));

const overlaps = collaborators.filter(c => studentEmails.has(c.email.toLowerCase()));

console.log('Overlapping Emails (Collaborator in Student List):', overlaps.length);
if (overlaps.length > 0) {
    console.log(JSON.stringify(overlaps, null, 2));
}
