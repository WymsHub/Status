const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const sessions = new Map();

app.post("/ping", async (req, res) => {
    const { msgId, webhookUrl, action } = req.body;
    
    if (!msgId || !webhookUrl) return res.status(400).send("Missing Data");

    if (sessions.has(msgId)) {
        clearTimeout(sessions.get(msgId).timeout);
    }

    if (action === "stop") {
        sessions.delete(msgId);
        console.log(`Stopped monitoring ${msgId}`);
        return res.send("Monitoring stopped");
    }

    const timeout = setTimeout(() => {
        handleDisconnect(msgId, webhookUrl);
    }, 45000);

    sessions.set(msgId, { timeout });
    res.send("Ping received");
});

async function handleDisconnect(msgId, webhookUrl) {
    console.log(`User ${msgId} timed out. Updating status via Gate...`);
    
    const gatePatchUrl = `${webhookUrl}&m=${msgId}`;

    try {
        await axios.patch(gatePatchUrl, {
            embeds: [{
                title: "Wym's Scripts • Murder Mystery 2",
                description: "## Status:\n```lua\n🔴 Player Left / Crashed```",
                color: 16711680,
                footer: { text: "Disconnected via Railway Monitor" }
            }]
        });
        console.log(`Successfully updated status for: ${msgId}`);
    } catch (err) {
        console.error("Failed to update status through Gate:", err.message);
    }
    sessions.delete(msgId);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Monitor listening on ${PORT}`));
