const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const sessions = new Map();

// Helper to send the Patch to your Gate
async function patchDiscord(webhookUrl, msgId, description, color, fields) {
    const gatePatchUrl = `${webhookUrl}&m=${msgId}`;
    try {
        await axios.patch(gatePatchUrl, {
            embeds: [{
                title: "Wym's Scripts • Murder Mystery 2",
                description: `## Status:\n\`\`\`lua\n${description}\`\`\``,
                color: color,
                fields: fields,
                footer: { text: `Status Updated | ${new Date().toLocaleTimeString()}` }
            }]
        });
        console.log(`Successfully updated Discord to: ${description}`);
    } catch (err) {
        console.error(`Error patching Discord (${description}):`, err.message);
    }
}

app.post("/ping", async (req, res) => {
    const { msgId, webhookUrl, action, fields } = req.body;
    
    if (!msgId || !webhookUrl) return res.status(400).send("Missing Data");

    // Clear any existing 45s timer
    if (sessions.has(msgId)) {
        clearTimeout(sessions.get(msgId).timeout);
        sessions.delete(msgId);
    }

    if (action === "claimed") {
        // 🟢 GREEN EDIT + STOP
        await patchDiscord(webhookUrl, msgId, "🟢 Claimed (Trade Success)", 65280, fields);
        return res.send("Marked as Claimed. Timer killed.");
    }

    if (action === "partial") {
        // 🔵 BLUE EDIT + STOP (Lua will restart the timer with a new ping shortly)
        await patchDiscord(webhookUrl, msgId, "🔵 Partially Claimed", 3447003, fields);
        return res.send("Marked as Partial. Timer killed.");
    }

    if (action === "stop") {
        return res.send("Monitoring stopped.");
    }

    // Default "ping" behavior: Start the 45s "Player Left" timer
    const timeout = setTimeout(() => {
        handleDisconnect(msgId, webhookUrl, fields);
    }, 45000);

    sessions.set(msgId, { timeout });
    res.send("Ping received. Protection active.");
});

async function handleDisconnect(msgId, webhookUrl, savedFields) {
    console.log(`!!! TIMEOUT !!! User ${msgId} disconnected.`);
    await patchDiscord(webhookUrl, msgId, "🔴 Player Left / Crashed", 16711680, savedFields);
    sessions.delete(msgId);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Monitor listening on ${PORT}`));
