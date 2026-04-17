# LogiFlow - AI Supply Chain Management

![LogiFlow Banner](https://via.placeholder.com/1200x300.png?text=LogiFlow+Supply+Chain)

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black.svg?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue.svg?style=flat&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.2-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E.svg?style=flat&logo=supabase)](https://supabase.com/)
[![Gemini](https://img.shields.io/badge/Google-Gemini_Flash-4186F4.svg?style=flat&logo=google)](https://ai.google.dev/)
[![Leaflet](https://img.shields.io/badge/Leaflet-Maps-199900.svg?style=flat&logo=leaflet)](https://leafletjs.com/)

**LogiFlow** is an AI-powered logistics and supply chain management platform designed specifically for the Indian SME market. It leverages modern "Glassmorphism Dark" aesthetics, interactive mapping, and real-time AI context processing via Gemini to provide logistics managers unparalleled situational awareness of their shipments across the country.

🌍 **Live Demo:** [Demo Link Pending - Deploy on Vercel](#)

---

## 🌟 Key Features

1. **Dashboard Overview:** KPI tracking, live status updates, and transport mode distribution.
2. **Interactive Map:** `react-leaflet` integration mapping real-time supply chain disruptions on Indian hubs.
3. **AI LogiBot:** Google Gemini 1.5 Flash integrated chat that understands the context of Indian logistics, delays, and optimization.
4. **Shipment Tracking:** Comprehensive end-to-end status tracking with visual progress bars.
5. **Analytics & Reports:** Automated weekly AI insight reports with PDF generation using `Recharts`.
6. **Authentication:** Secure Google OAuth and Email login via Supabase.

## 🛠️ Setup & Local Development

### 1. Prerequisites
- Node.js > 18.x
- A Supabase account (free tier)
- A Google Gemini API key

### 2. Installation
```bash
git clone https://github.com/your-username/logiflow.git
cd logiflow
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local` and populate your secrets:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Database Setup
Run the SQL queries found in `supabase_schema.sql` directly into your Supabase SQL Editor.

### 5. Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

## 🎨 Design System
Powered by the **Google Stitch** "Glassmorphism Dark" theme logic.
- **Background:** Midnight Blue (`#0F172A`)
- **Primary:** Vivid Purple (`#8B5CF6`)
- **Glassmorphism:** `backdrop-filter: blur(16px)` on transparent overlays.

---
*Built for Hackathon Submission 2026.*
