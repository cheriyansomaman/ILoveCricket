const fs = require('fs');
const path = require('path');

const roles = ['BATTER', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER'];
const batStyles = ['RIGHT_HAND', 'LEFT_HAND'];
const bowlStyles = ['RIGHT_ARM_FAST', 'RIGHT_ARM_SPIN', 'LEFT_ARM_FAST', 'LEFT_ARM_SPIN', 'NONE'];

let csvContent = "Name,JerseyNumber,Role,BattingStyle,BowlingStyle\n";

for (let i = 1; i <= 100; i++) {
    const name = `Player ${i}`;
    const jersey = Math.floor(Math.random() * 100);
    const role = roles[Math.floor(Math.random() * roles.length)];
    const batStyle = batStyles[Math.floor(Math.random() * batStyles.length)];
    // If bowler or AR, play styling, else NONE often for simple batter? 
    // Actually batters can bowl NONE. Bowlers must bowl.
    let bowlStyle = 'NONE';
    if (role === 'BOWLER' || role === 'ALL_ROUNDER') {
        bowlStyle = bowlStyles[Math.floor(Math.random() * (bowlStyles.length - 1))]; // Exclude NONE
    } else {
        bowlStyle = bowlStyles[Math.floor(Math.random() * bowlStyles.length)];
    }

    csvContent += `${name},${jersey},${role},${batStyle},${bowlStyle}\n`;
}

const outputPath = path.join(__dirname, '../assets/sample_players.csv');
// Ensure assets dir exists
const assetsDir = path.dirname(outputPath);
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

fs.writeFileSync(outputPath, csvContent);
console.log(`Generated sample CSV at ${outputPath}`);
