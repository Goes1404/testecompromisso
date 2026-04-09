import { readFileSync } from 'fs';
import { globSync } from 'glob';

// A simple regex to find sequences of text that look like words inside files
const files = globSync('src/**/*.tsx');
let allTexts = [];

files.forEach(file => {
    const content = readFileSync(file, 'utf-8');
    // Extract everything between > and <
    const matches = content.match(/>([^<{]+)</g);
    if (matches) {
        matches.forEach(m => {
            const text = m.substring(1, m.length - 1).trim();
            if (text && text.length > 2 && text.match(/[a-zA-Záéíóúâêôãõç]/)) {
                allTexts.push({ file, text });
            }
        });
    }
    
    // Also extract text inside quotes for common props like placeholder="...", title="..."
    const propMatches = content.match(/(placeholder|title|aria-label|description|label)=[\\"']([^\\"'{]+)[\\"']/g);
    if (propMatches) {
        propMatches.forEach(m => {
            const val = m.split('=')[1];
            const text = val.substring(1, val.length - 1).trim();
            if (text && text.length > 2) {
                allTexts.push({ file, text });
            }
        });
    }
});

import fs from 'fs';
fs.writeFileSync('extracted_texts.json', JSON.stringify(allTexts, null, 2));
console.log('Total texts extracted:', allTexts.length);
