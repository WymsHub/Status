const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const sessions = new Map(); // Stores { timeout, msgId, active }
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1465985802122297355/WQW3bRqip7BegpeDWshjJ1mcI-SmL82QDtdWflDKZfziAi7jPS7olmnbMJwj5ENjbjee";

app.post("/ping", async (req, res) => {
    const { user, msgId, action } = req.body;
    if (!user || !msgId) return res.status(400).send("Missing Data");

    // 1. Handle STOP signal (Trade Finished)
    if (action === "STOP_MONITORING") {
        if (sessions.has(user)) {
            clearTimeout(sessions.get(user).timeout);
            sessions.delete(user);
        }
        return res.send("Monitoring stopped for " + user);
    }

    // 2. Handle Heartbeat (Active)
    if (sessions.has(user)) {
        clearTimeout(sessions.get(user).timeout);
    }

    const timeout = setTimeout(() => {
        handleTimeout(user, msgId);
    }, 15000); // 15 seconds (allows for 2 missed pings)

    sessions.set(user, { timeout, msgId });
    res.send("Pinging...");
});

async function handleTimeout(user, msgId) {
    console.log(`${user} timed out. Editing Discord...`);
    try {
        await axios.patch(`${DISCORD_WEBHOOK}/messages/${msgId}`, {
            embeds: [{
                title = "Mozil Logic - Session Tracker",
                fields: [
                    { name: "Status", value: "```🔴 Player Left / Crashed```" },
                    { name: "User", value = "```" + user + "```" }
                ],
                color: 16711680,
                footer: { text: "Railway Auto-Detection" }
            }]
        });
    } catch (err) {
        console.error("Failed to edit Discord:", err.message);
    }
    sessions.delete(user);
}

app.listen(process.env.PORT || 3000, () => console.log("Railway Monitoring Online"));
