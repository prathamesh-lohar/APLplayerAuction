require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('./models/Player');
const Team = require('./models/Team');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const teams = await Team.find().populate('players');
    let hasCaptains = false;
    for (const t of teams) {
        if (t.players.length > 0) {
            hasCaptains = true;
            console.log(`Team: ${t.teamName}, Players: ${t.players.length}`);
            t.players.forEach(p => console.log(` - ${p?.name}: soldPrice ${p?.soldPrice}, status ${p?.status}`));
        }
    }
    if (!hasCaptains) console.log("No teams have players.");
    process.exit(0);
});
