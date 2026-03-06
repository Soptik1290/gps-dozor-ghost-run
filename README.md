# 🏎️ GPS Dozor: Ghost Run

**AI-powered tactical racing engine for delivery fleets.** Transform mundane delivery routes into high-stakes precision runs using real-time telemetry, AI-driven feedback, and historical ghost matching. Works as a complete mission control system for both field pilots (drivers) and fleet command (admins).

> [!NOTE]
> This project was **VibeCoded in Antigravity** using autonomous agentic workflows.

---

## ✨ Features

*   **👻 AI-Powered Ghost Racing** – Match your current route against personal bests or top-tier teammates. Visualize the "Ghost" on a tactical Mapbox HUD in real-time.
*   **🎮 Tactical HUD** – Premium glassmorphic interface with real-time telemetry, efficiency gauges, and dynamic scanline overlays for a high-intensity "mission" feel.
*   **🎙️ Race Engineer Debrief** – Context-aware AI feedback powered by GPT-4o-mini. Get spoken tactical advice based on your speed, weather, and driving efficiency.
*   **📂 Mission Archive** – Comprehensive telemetry breakdown for every sortie. Analyze sector success rates, temporal deltas, and chassis integrity (eco-driving events).
*   **🛡️ Fleet Command** – Global oversight for admins. Track active assets, monitor fleet-wide efficiency matrices, and manage high-stakes challenges.
*   **🌤️ Dynamic Track Status** – Integrated weather data affecting "track conditions" (WET, ICY, STORM) with corresponding UI ambient theming.
*   **⚖️ Eco-Efficiency Scoring** – Gamified scoring system that rewards smoothness. Earn ranks (S, A, B, C, F) based on pacer matching and safety events.

---

## 🚀 Quick Start

### Option A: Tactical Docker Deployment (Recommended)
The fastest way to deploy the full mission stack.
```bash
docker-compose up --build
```
Frontend: **[localhost:8080](http://localhost:8080)** | API: **[localhost:3000](http://localhost:3000)**

### Option B: Render Blueprint Deployment 🚀
Deploy the entire infrastructure to Render in one click.
1.  Push this repository to GitHub.
2.  On **[Render Dashboard](https://dashboard.render.com)**, click **New +** -> **Blueprint**.
3.  Connect your repository and click **Apply**.
4.  Fill in the environment variables (DATABASE_URL, etc.) in the Render UI.

### Option C: Local Manual Setup
1. **Configure Environment**
   ```bash
   # Backend (.server/.env)
   DATABASE_URL="postgresql://..."
   GPS_DOZOR_USERNAME="..."
   GPS_DOZOR_PASSWORD="..."
   OPENAI_API_KEY="sk-..."

   # Frontend (.client/.env)
   VITE_API_URL="http://localhost:3000"
   VITE_MAPBOX_TOKEN="pk.ey..."
   ```
2. **Launch Backend (NestJS)**
   ```bash
   cd server && npm install && npx prisma generate && npm run start:dev
   ```
3. **Launch Frontend (Vue 3)**
   ```bash
   cd client && npm install && npm run dev
   ```
   Open **[localhost:5173](http://localhost:5173)** 🚀

---

## 🏗️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | Vue 3 (Composition API), Vite, Tailwind v4 |
| **Visuals** | Mapbox GL JS, Lucide icons, Glassmorphism |
| **Backend** | NestJS (TypeScript) |
| **Database** | Prisma ORM, Neon Postgres (Serverless) |
| **AI** | OpenAI GPT-4o-mini, Web Speech API |
| **Data Sources** | GPS Dozor API, Open-Meteo |

---

## 📁 Project Structure

```text
gps-dozor-ghost-run/
├── server/               # NestJS Backend
│   ├── src/
│   │   ├── trips/        # Mission & Telemetry logic
│   │   ├── ai/           # Race Engineer AI service
│   │   └── gps-dozor/    # External API integration
│   └── prisma/           # Database Schema
├── client/               # Vue 3 Frontend
│   └── src/
│       ├── views/        # Tactical cockpit, Commander, HUD
│       ├── components/   # Gauges, HUD overlays, Cards
│       └── api/          # Secure uplink endpoints
└── README.md             # Tactical Briefing
```

---

*Powered by Antigravity — Built for precision. Built for the run.*
