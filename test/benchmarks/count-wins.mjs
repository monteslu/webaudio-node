import { readFileSync } from 'fs';

const content = readFileSync('/tmp/bench-final-with-fft-fix.txt', 'utf-8');
const lines = content.split('\n');

let wins = 0, losses = 0, total = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for table rows with timing data
    if (line.includes('node-web-audio-api') && line.includes('│')) {
        // Next line should be webaudio-node
        const rustLine = line;
        const cppLine = lines[i + 1];
        
        if (cppLine && cppLine.includes('webaudio-node')) {
            // Extract times (first numeric column after implementation name)
            const rustMatch = rustLine.match(/│\s+node-web-audio-api\s+│\s+([\d.]+|FAILED)/);
            const cppMatch = cppLine.match(/│\s+webaudio-node\s+│\s+([\d.]+|FAILED)/);
            
            if (rustMatch && cppMatch) {
                const rustTime = rustMatch[1];
                const cppTime = cppMatch[1];
                
                if (rustTime !== 'FAILED' && cppTime !== 'FAILED') {
                    const rustVal = parseFloat(rustTime);
                    const cppVal = parseFloat(cppTime);
                    
                    total++;
                    if (cppVal < rustVal) {
                        wins++;
                    } else {
                        losses++;
                    }
                }
            }
        }
    }
}

console.log(`✅ Wins: ${wins}/${total} (${(wins/total*100).toFixed(1)}%)`);
console.log(`❌ Losses: ${losses}/${total} (${(losses/total*100).toFixed(1)}%)`);
