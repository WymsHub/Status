const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const sessions = new Map();

app.post("/ping", async (req, res) => {
    const { msgId, webhookUrl, action } = req.body;
    
    if (!msgId || !webhookUrl) return res.status(400).send("Missing Data");

    // Clear existing timeout for this message
    if (sessions.has(msgId)) {
        clearTimeout(sessions.get(msgId).timeout);
    }

    if (action === "stop") {
        sessions.delete(msgId);
        console.log(`Stopped monitoring ${msgId}`);
        return res.send("Monitoring stopped");
    }

    // Set a 45-second disconnect timer
    const timeout = setTimeout(() => {
        handleDisconnect(msgId, webhookUrl);
    }, 45000);

    sessions.set(msgId, { timeout });
    res.send("Ping received");
});

async function handleDisconnect(msgId, webhookUrl) {
    console.log(`User ${msgId} timed out. Sending 'Left' status...`);
    
    // We must ensure the URL is a proper Discord Webhook URL
    // If your Real_Webhook is a proxy, you need to provide the raw discord one or adjust this:
    const cleanUrl = webhookUrl.split('?')[0].replace('http://89.169.54.29:5000/gate', 'https://discord.com/api/webhooks');

    try {
        await axios.patch(`${webhookUrl}/messages/${msgId}`, {
            embeds: [{
                title: "Wym's Scripts • Murder Mystery 2",
                description: "## Status:\n```lua\n🔴 Player Left / Crashed```",
                color: 16711680, // Red
                footer: { text: "Disconnected via Railway Monitor" }
            }]
        });
    } catch (err) {
        console.error("Failed to update status:", err.response?.data || err.message);
    }
    sessions.delete(msgId);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Monitor listening on ${PORT}`));
