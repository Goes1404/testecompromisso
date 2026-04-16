import fs from 'fs';
const content = fs.readFileSync('update_passwords_final.mjs', 'utf8');

function parseData(raw) {
  const lines = raw.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const result = [];
  for (let i = 0; i < lines.length; i += 2) {
    const name = lines[i];
    const school = lines[i + 1];
    if (name && school) {
      result.push({ name, school });
    }
  }
  return result;
}

const rawDataENEMMatch = content.match(/const RawDataENEM = `([\s\S]+?)`;/);
const rawDataETECMatch = content.match(/const RawDataETEC = `([\s\S]+?)`;/);

if (rawDataENEMMatch && rawDataETECMatch) {
    const studentsENEM = parseData(rawDataENEMMatch[1]);
    const studentsETEC = parseData(rawDataETECMatch[1]);
    console.log(`ENEM: ${studentsENEM.length}`);
    console.log(`ETEC: ${studentsETEC.length}`);
    console.log(`Total: ${studentsENEM.length + studentsETEC.length}`);
} else {
    console.log('Matches failed');
}
