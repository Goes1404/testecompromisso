import fs from 'fs';
const data1 = fs.readFileSync('students_source_718.txt', 'utf8');
let data2 = '';
if (fs.existsSync('students_source_718_chunk_part2.txt')) {
    data2 = fs.readFileSync('students_source_718_chunk_part2.txt', 'utf8');
}
const data = data1 + '\n------------------------------\n' + data2;
const sections = data.split('------------------------------');
const students = [];
for (const section of sections) {
  const lines = section.trim().split('\n');
  const student = {};
  lines.forEach(line => {
    if (line.startsWith('NOME:')) student.name = line.replace('NOME:', '').trim();
    if (line.startsWith('EMAIL:')) student.email = line.replace('EMAIL:', '').trim().toLowerCase();
  });
  if (student.name && student.email && !students.find(s => s.email === student.email)) {
     students.push(student);
  }
}
console.log(`Total uniquely found in files: ${students.length}`);
