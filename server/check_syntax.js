const fs = require('fs');
const content = fs.readFileSync('index.js', 'utf8');

try {
    new Function(content);
    console.log('Syntax OK');
} catch (e) {
    if (e.stack) {
        console.log(e.stack);
        const match = e.stack.match(/<anonymous>:(\d+):(\d+)/);
        if (match) {
            const lineNum = parseInt(match[1]) - 2; // Function wrapper adds lines
            const colNum = parseInt(match[2]);
            const lines = content.split('\n');
            console.log(`Error at line ${lineNum}, column ${colNum}`);
            const line = lines[lineNum - 1];
            if (line) {
                console.log('Line content:', line);
                const char = line[colNum - 1];
                console.log(`Character at column ${colNum}: "${char}" (Code: ${char ? char.charCodeAt(0) : 'N/A'})`);
            }
        }
    } else {
        console.error(e);
    }
}
