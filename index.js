const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const sessions = new Map();
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1465985802122297355/WQW3bRqip7BegpeDWshjJ1mcI-SmL82QDtdWflDKZfziAi7jPS7olmnbMJwj5ENjbjee";

app.post("/ping", async (req, res) => {
    const { user, msgId, action } = req.body;
    if (!user || !msgId) return res.status(400).send("Missing Data");

    if (action === "STOP_MONITORING") {
        if (sessions.has(user)) {
            clearTimeout(sessions.get(user).timeout);
            sessions.delete(user);
        }
        return res.send("Monitoring stopped");
    }

    if (sessions.has(user)) {
        clearTimeout(sessions.get(user).timeout);
    }

    const timeout = setTimeout(() => {
        handleTimeout(user, msgId);
    }, 15000); 

    sessions.set(user, { timeout: timeout, msgId: msgId });
    res.send("Pinging...");
});

async function handleTimeout(user, msgId) {
    try {
        await axios.patch(`${DISCORD_WEBHOOK}/messages/${msgId}`, {
            embeds: [{
                title: "Mozil Logic - Session Tracker",
                fields: [
                    { name: "Status", value: "```🔴 Player Left / Crashed```" },
                    { name: "User", value: "```" + user + "```" }
                ],
                color: 16711680,
                footer: { text: "Railway Auto-Detection" }
            }]
        });
    } catch (err) {
        console.error("Error:", err.message);
    }
    sessions.delete(user);
}

app.listen(process.env.PORT || 3000, () => console.log("Online"));
