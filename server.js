// ─────────────────────────────────────────────
// 🌙 Luna para Helen — servidor
// Sirve el frontend y reenvía los mensajes a la
// API de Anthropic sin exponer la API key.
// ─────────────────────────────────────────────
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.LUNA_MODEL || "claude-sonnet-4-5";
const MAX_TOKENS = 1000;

if (!API_KEY) {
  console.warn("⚠️  Falta ANTHROPIC_API_KEY. El chat de Luna no funcionará hasta configurarla.");
}

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Limitador muy simple por IP (60 mensajes por hora) para cuidar tu saldo
const usage = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const rec = usage.get(ip) || { count: 0, reset: now + 3600_000 };
  if (now > rec.reset) {
    rec.count = 0;
    rec.reset = now + 3600_000;
  }
  rec.count++;
  usage.set(ip, rec);
  return rec.count > 60;
}

app.post("/api/luna", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({ error: "El servidor no tiene configurada la API key." });
    }
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "?";
    if (rateLimited(ip)) {
      return res.status(429).json({ error: "Demasiados mensajes seguidos. Espera un ratito 🌙" });
    }

    const { system, messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Mensajes inválidos." });
    }

    // Saneamos: solo role + content de texto, máximo 30 turnos
    const clean = messages.slice(-30).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 4000),
    }));

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: String(system || "").slice(0, 8000),
        messages: clean,
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error("Anthropic API error:", data);
      return res.status(502).json({ error: data?.error?.message || "Error de la API." });
    }

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

app.listen(PORT, () => {
  console.log(`🌙 Luna escuchando en el puerto ${PORT}`);
});
