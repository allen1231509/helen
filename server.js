// ─────────────────────────────────────────────
// 🌙 Luna para Helen — servidor Gemini
// Sirve el frontend y reenvía mensajes a Gemini
// sin exponer la API key.
// ─────────────────────────────────────────────
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash";
const MAX_TOKENS = 1000;

if (!API_KEY) {
  console.warn("⚠️ Falta GEMINI_API_KEY. Luna no podrá responder.");
}

// Detrás del proxy de Render: req.ip será la IP real del cliente
app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ── Limitador simple ─────────────────────────
const RATE_LIMIT = 60;            // mensajes por hora por IP
const WINDOW_MS = 3600_000;       // 1 hora
const usage = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const rec = usage.get(ip) || { count: 0, reset: now + WINDOW_MS };
  if (now > rec.reset) {
    rec.count = 0;
    rec.reset = now + WINDOW_MS;
  }
  rec.count++;
  usage.set(ip, rec);
  return rec.count > RATE_LIMIT;
}

// Limpieza periódica para que el Map no crezca sin límite
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of usage) {
    if (now > rec.reset) usage.delete(ip);
  }
}, 10 * 60_000); // cada 10 minutos

// ── Endpoint principal ───────────────────────
app.post("/api/luna", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({
        error: "El servidor no tiene configurada GEMINI_API_KEY"
      });
    }

    const ip = req.ip || "?";
    if (rateLimited(ip)) {
      return res.status(429).json({
        error: "Demasiados mensajes seguidos 🌙 Espera un ratito."
      });
    }

    const { system, messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Mensajes inválidos" });
    }

    // Convertimos formato de Luna a Gemini
    let contents = messages.slice(-30).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "").slice(0, 4000) }]
    }));

    // Gemini exige que el historial empiece con rol "user":
    // descartamos mensajes iniciales de rol "model" tras el recorte
    while (contents.length > 0 && contents[0].role !== "user") {
      contents.shift();
    }
    if (contents.length === 0) {
      return res.status(400).json({ error: "Mensajes inválidos" });
    }

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": API_KEY // key en header, no en la URL
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: String(system || "").slice(0, 8000) }]
          },
          contents,
          generationConfig: {
            maxOutputTokens: MAX_TOKENS
          }
        })
      }
    );

    const data = await r.json();

    if (!r.ok) {
      console.error("Gemini API error:", JSON.stringify(data));
      return res.status(502).json({
        error: data?.error?.message || "Error de Gemini"
      });
    }

    // Prompt bloqueado por filtros de seguridad
    if (data.promptFeedback?.blockReason) {
      return res.json({
        text: "Mmm… no puedo responder a eso 🌙 ¿Hablamos de otra cosa?"
      });
    }

    const candidate = data.candidates?.[0];

    // Respuesta bloqueada o cortada por seguridad
    if (!candidate || candidate.finishReason === "SAFETY") {
      return res.json({
        text: "Mejor no respondo eso 🌙 Cuéntame otra cosa."
      });
    }

    const text = candidate.content?.parts
      ?.map(p => p.text)
      ?.join("\n")
      ?.trim() || "";

    if (!text) {
      return res.json({
        text: "Me quedé sin palabras 🌙 ¿Me lo repites de otra forma?"
      });
    }

    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.listen(PORT, () => {
  console.log(`🌙 Luna escuchando en el puerto ${PORT}`);
});
