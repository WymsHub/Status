const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const sessions = new Map();

app.post("/ping", async (req, res) => {
    const { msgId, webhookUrl, action } = req.body;
    
    if (!msgId || !webhookUrl) return res.status(400).send("Missing Data");

    // If session exists, clear the old "Left" timer
    if (sessions.has(msgId)) {
        clearTimeout(sessions.get(msgId).timeout);
    }

    // If Lua script says 'stop', we just delete the session and DON'T edit anything
    if (action === "stop") {
        sessions.delete(msgId);
        console.log(`Stopped monitoring ${msgId} (Manual stop)`);
        return res.send("Monitoring stopped");
    }

    // Set a 45-second timer. If no ping hits within this time, we assume they left.
    const timeout = setTimeout(() => {
        handleDisconnect(msgId, webhookUrl);
    }, 45000);

    sessions.set(msgId, { timeout });
    res.send("Ping received");
});

async function handleDisconnect(msgId, webhookUrl) {
    console.log(`User ${msgId} timed out. Sending 'Left' status...`);
    try {
        await axios.patch(`${webhookUrl}/messages/${msgId}`, {
            embeds: [{
                // Only editing the description and color as requested
                description: "## Status:\n```lua\n🔴 Player Left / Crashed```",
                color: 16711680 // Red
            }]
        });
    } catch (err) {
        console.error("Failed to send Left status:", err.message);
    }
    sessions.delete(msgId);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Railway Monitor Online` || 3000));
