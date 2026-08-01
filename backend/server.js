const express = require("express");
const cors = require("cors");
console.log("SERVER FILE LOADED");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

console.log("KEY FOUND:", !!process.env.OPENAI_API_KEY);
console.log("KEY PREFIX:", process.env.OPENAI_API_KEY?.substring(0, 7));

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.options("/api/chat", cors());

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "CampusBuyAI backend is running" });
});

app.get("/api/chat", (req, res) => {
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CampusBuyAI API</title>
    <style>
      body { font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
      .box { background: #111827; padding: 24px 28px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); max-width: 560px; }
      code { background: #1f2937; padding: 2px 6px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="box">
      <h2>CampusBuyAI API is ready</h2>
      <p>Send a POST request with a <code>message</code> field to this endpoint.</p>
      <p>Open the main app at <a href="http://localhost:3000/" style="color:#38bdf8">http://localhost:3000/</a>.</p>
    </div>
  </body>
</html>`);
});

app.post("/api/chat", async (req, res) => {
  // CHANGED: log the route entry clearly so we can confirm the request reaches this handler.
  console.log("POST /api/chat HIT");
  console.log("req.body:", req.body);

  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Please provide a message." });
  }

  // CHANGED: normalize the key once and use that value for the branch check.
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  console.log("KEY READY:", !!apiKey);

  // CHANGED: keep the OpenAI branch explicit and only fall back after the try/catch completes.
  if (apiKey) {
    try {
      console.log("Inside try");

      // CHANGED: use the 7.x SDK pattern directly and destructure the client class.
      const { OpenAI } = require("openai");
      const openai = new OpenAI({ apiKey });

      console.log("Calling OpenAI API with message:", message);
      const completion = await openai.responses.create({
        model: "gpt-4o-mini",
        input: `You are CampusBuyAI, a helpful campus marketplace assistant. Reply briefly and practically. User: ${message}`
      });

      console.log("After OpenAI call, completion received");
      const reply = completion.output_text || completion.output?.[0]?.text || "NO reply.";
      return res.json({ reply });
    } catch (error) {
      // CHANGED: log the actual SDK failure instead of silently skipping it.
      console.error("========== OPENAI ERROR ==========");
      console.error(error);
      console.error("=================================");
    }
  }

  const fallbackReply = buildFallbackReply(message);
  return res.json({ reply: fallbackReply });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    console.error("Invalid JSON body received:", err.message);
    return res.status(400).json({ error: "Invalid JSON payload." });
  }
  next(err);
});

function buildFallbackReply(message) {
  const text = message.toLowerCase();

  if (text.includes("sell")) {
    return "You can list an item by including the title, price, condition, and pickup location so buyers can reach you faster.";
  }

  if (text.includes("buy") || text.includes("find")) {
    return "Try describing the item, your budget, and your campus area so I can suggest the best options to look for.";
  }

  return "I can help you buy, sell, compare, and discover campus deals. Try asking about a textbook, laptop, or dorm item.";
}

function startServer() {
  const PORT = process.env.PORT || 3000;
  return app.listen(PORT, () => {
    console.log(`CampusBuyAI server running on port ${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };