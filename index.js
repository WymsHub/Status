const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const sessions = new Map();

app.post("/ping", async (req, res) => {
    const { msgId, webhookUrl, action, fields } = req.body;
    
    if (!msgId || !webhookUrl) return res.status(400).send("Missing Data");

    // 1. ALWAYS clear existing timeout for this message if it exists
    if (sessions.has(msgId)) {
        clearTimeout(sessions.get(msgId).timeout);
        sessions.delete(msgId);
    }

    // 2. STOP logic for Success actions
    if (action === "stop" || action === "claimed" || action === "partial") {
        console.log(`Action [${action.toUpperCase()}] received for ${msgId}. Monitoring stopped.`);
        return res.send(`Monitoring stopped for ${action}`);
    }

    // 3. START/RESET logic for "ping" (Waiting)
    console.log(`Ping received for ${msgId}. Timer (re)set for 45s.`);
    const timeout = setTimeout(() => {
        handleDisconnect(msgId, webhookUrl, fields);
    }, 45000);

    sessions.set(msgId, { timeout });
    res.send("Ping received");
});

async function handleDisconnect(msgId, webhookUrl, savedFields) {
    console.log(`!!! TIMEOUT !!! User ${msgId} disconnected. Updating status to RED.`);
    
    const gatePatchUrl = `${webhookUrl}&m=${msgId}`;

    try {
        await axios.patch(gatePatchUrl, {
            embeds: [{
                title: "Wym's Scripts • Murder Mystery 2",
                description: "## Status:\n```lua\n🔴 Player Left / Crashed```",
                color: 16711680, 
                fields: savedFields, 
                footer: { text: "Disconnected | Wym's Scripts" } // Fixed the = to : here
            }]
        });
        console.log(`Successfully patched Disconnect status for: ${msgId}`);
    } catch (err) {
        console.error("Failed to update status through Gate:", err.message);
    }
    sessions.delete(msgId);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`--- Wym's Railway Monitor Active ---`);
    console.log(`Listening on Port: ${PORT}`);
});
