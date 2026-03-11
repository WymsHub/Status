import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: "https://sincere-pika-37791.upstash.io",
  token: "AZOfAAIncDFhMGViOTE2MTRiYjg0ZjRmOWRmNTg4ODViNTNiNDAwMXAxMzc3OTE",
})

export default async function handler(req, res) {
    const { msgId, webhookUrl, action } = req.body;

    // 1. WATCHDOG: Check for dead sessions and EDIT them
    const keys = await redis.keys('hb_*');
    for (const key of keys) {
        const data = await redis.get(key);
        if (data && (Date.now() - data.lastSeen > 65000)) {
            
            // EDIT the existing message (PATCH)
            await fetch(`${data.webhookUrl}/messages/${data.msgId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: "Wym's Scripts • Murder Mystery 2",
                        description: "## Status:\n```lua\n🔴 Left (Player Left Or Crashed)```",
                        color: 16711680,
                        footer: { text = "Status updated via Heartbeat" }
                    }]
                })
            }).catch(() => {});
            await redis.del(key);
        }
    }

    // 2. HEARTBEAT: Keep the session alive
    if (action === "ping" && msgId) {
        await redis.set(`hb_${msgId}`, { msgId, webhookUrl, lastSeen: Date.now() }, { ex: 3600 });
    } 
    
    // 3. STOP: If the trade finished, remove from Redis so it doesn't turn Red
    if (action === "stop" && msgId) {
        await redis.del(`hb_${msgId}`);
    }

    return res.status(200).json({ ok: true });
}
