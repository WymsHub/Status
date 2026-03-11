import { Redis } from '@upstash/redis'

// Hardcoded credentials as requested
const redis = new Redis({
  url: "https://sincere-pika-37791.upstash.io",
  token: "AZOfAAIncDFhMGViOTE2MTRiYjg0ZjRmOWRmNTg4ODViNTNiNDAwMXAxMzc3OTE",
})

export default async function handler(req, res) {
    const { messageId, webhookUrl, status } = req.body;

    try {
        // 1. WATCHDOG: Check for dead sessions
        const keys = await redis.keys('hb_*');
        for (const key of keys) {
            const data = await redis.get(key);
            
            // If the player hasn't pinged in over 65 seconds
            if (data && (Date.now() - data.lastSeen > 65000)) {
                
                // Edit the Discord message to "Failed"
                await fetch(`${data.webhookUrl}/messages/${data.messageId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        embeds: [{
                            title = "Wym's Scripts • Murder Mystery 2",
                            description: "## Status:\n```lua\n🔴 Left (Player Left Or Crashed)```",
                            color: 16711680, // Red
                            footer: { text = "Failed - Connection Lost" }
                        }]
                    })
                }).catch(() => {});
                
                await redis.del(key); // Stop watching this player
            }
        }

        // 2. PING: Update the current player
        if (messageId && status === "Running") {
            await redis.set(`hb_${messageId}`, {
                messageId,
                webhookUrl,
                lastSeen: Date.now()
            }, { ex: 3600 });
        } 
        
        // 3. SUCCESS: If they finished, remove them so it doesn't turn Red
        if (status === "Success") {
            await redis.del(`hb_${messageId}`);
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
