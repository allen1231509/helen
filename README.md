# 🌙 Luna para Helen

Asistente personal de estudio, productividad y crecimiento. Web app con chat de IA (API de Anthropic), misión diaria, hábitos con rachas, progreso semanal y reflexión nocturna.

## Estructura

```
luna-app/
├── server.js          # Backend Express: sirve el frontend y protege la API key
├── package.json
└── public/
    └── index.html     # Toda la app (HTML + CSS + JS)
```

## Probar en local

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # en Windows: set ANTHROPIC_API_KEY=sk-ant-...
npm start
```

Abre http://localhost:3000

## Desplegar en Render (gratis)

1. Sube esta carpeta a un repositorio de GitHub (puede ser privado).
2. En Render: **New → Web Service** → conecta el repo.
3. Configuración:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. En **Environment** agrega la variable:
   - `ANTHROPIC_API_KEY` = tu key de https://console.anthropic.com
   - (opcional) `LUNA_MODEL` = `claude-haiku-4-5-20251001` si quieres abaratar costos
5. Deploy. Render te da una URL tipo `https://luna-para-helen.onrender.com` — ese es el link para Helen.

## Notas

- **API key:** se crea en console.anthropic.com → API Keys. Las llamadas se cobran a tu cuenta; con uso personal de chat es muy poco (centavos al día con Haiku). El servidor incluye un límite de 60 mensajes/hora por IP para protegerte.
- **Datos de Helen:** se guardan en el `localStorage` de su navegador. No hay base de datos: si borra los datos del navegador o cambia de dispositivo, empieza de cero.
- **Plan Free de Render:** el servidor se "duerme" tras 15 min sin uso; el primer mensaje tras dormir tarda ~30-50 s en responder. Igual que tu relay de ZoxiRobit.
- **App en el celular:** Helen puede abrir la URL y usar "Agregar a pantalla de inicio" para tenerla como app.
