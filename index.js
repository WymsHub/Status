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
    console.log(`User ${msgId} timed out. Updating status via Gate...`);
    
    /**
     * FIX EXPLANATION:
     * Your webhookUrl is "http://89.169.54.29:5000/gate?t=JOB_ID"
     * We append "&m=" + msgId so the Gate knows which message to edit.
     * We hit the Gate with a PATCH request.
     */
    const gatePatchUrl = `${webhookUrl}&m=${msgId}`;

    try {
        await axios.patch(gatePatchUrl, {
            embeds: [{
                title: "Wym's Scripts • Murder Mystery 2",
                description: "## Status:\n```lua\n🔴 Player Left / Crashed```",
                color: 16711680, // Red
                footer: { text = "Disconnected via Railway Monitor • " + new Date().toLocaleTimeString() }
            }]
        });
        console.log(`Successfully updated status for message: ${msgId}`);
    } catch (err) {
        // Log the error specifically to see if the Gate rejected it
        console.error("Failed to update status through Gate:");
        console.error(err.response?.data || err.message);
    }
    sessions.delete(msgId);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Monitor listening on ${PORT}`));
