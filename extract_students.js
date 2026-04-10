const fs = require('fs');

const logPath = "C:\\Users\\eduar\\.gemini\\antigravity\\brain\\91d3ed9e-8340-47eb-9465-44c5798ff8be\\.system_generated\\logs\\overview.txt";
const logContent = fs.readFileSync(logPath, 'utf8');

// Find the start and end of the student list in the log
const startLine = "Alan Henrique | alanhenrique@compromisso.com | Aldônio | ENEM";
const endLine = "Yuri da Silva  Lima | yurislima@compromisso.com | J.k | ETEC";

const startIndex = logContent.lastIndexOf(startLine);
const endIndex = logContent.indexOf(endLine, startIndex) + endLine.length;

if (startIndex !== -1 && endIndex !== -1) {
    const list = logContent.substring(startIndex, endIndex);
    fs.writeFileSync('C:\\Users\\eduar\\Desktop\\Eu\\compromisso\\testecompromisso\\students.txt', list, 'utf8');
    console.log(`Saved ${list.trim().split('\\n').length} students to students.txt`);
} else {
    console.log("Could not find list in log.");
}
