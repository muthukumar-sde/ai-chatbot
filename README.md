<div align="center">

# 🏡 MK Properties — AI Real Estate Assistant

**Next-Generation AI Real Estate Conversational Platform**  
Natural Language Property Search · Tanglish Query Parsing · Prisma DB Persistence · Interactive Site Visit Bookings · RAG Document Intelligence · Adaptive Mobile/Desktop Responsive UI

[![Next.js](https://img.shields.io/badge/Next.js-16.2.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![LangChain](https://img.shields.io/badge/LangChain-1.3-1C3C3C?style=flat-square&logo=langchain)](https://langchain.com/)
[![Prisma](https://img.shields.io/badge/Prisma-SQLite-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=flat-square&logo=openai)](https://openai.com/)

</div>

---

## ✨ Highlights & Key Features

### 🔍 1. Natural Language & Tanglish Search Engine
Understands natural conversational prompts in English, Tamil, and Tanglish:
- *“Coimbatore la 60 lakhs kulla 2BHK venum, school pakkathula.”*
- Converts queries into structured database filters (`city`, `maxPrice`, `bedrooms`, `amenities`, `search_type`).

### 📅 2. Interactive Site Visit Booking Popup Modal
- One-click `📅 Book Visit` button on every property card opens a pre-filled interactive modal form.
- Captures visitor details, preferred date, and time slots into SQLite `SiteVisit` database via `POST /api/site-visits`.

### 💾 3. Persistent Favorites & Session Memory
- Persistent chat memory across browser reloads via `localStorage`.
- Heart `❤️` favorite toggles saved directly to Prisma `Favorite` table.
- Slide-over **Saved Favorites Drawer** displaying bookmarked listings.

### 📚 4. RAG Knowledge Base (`RealEstates.pdf`)
- Integrated PDF vector search covering legal verification guidelines, RERA regulations, home loan interest rates (8.35% - 8.75%), and Tamil Nadu property registration fees (9%).

### 🎨 5. Adaptive Mobile & Desktop Responsive Header System
- **Desktop View (`> 640px`)**: Single-line executive compact bar with brand gradient, inline AI badges, and actions.
- **Mobile View (`<= 640px`)**: 2-Row Status Ribbon system preventing text crowding, overlaps, and single-word line breaks.

### 🎙️ 6. Speech Synthesis & Voice Recording Studio
- Integrated Text-to-Speech (TTS) for AI voice responses.
- Studio audio recording studio animation for hands-free search prompts.

---

## 📦 Tech Stack & Architecture

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.2.3 (App Router), React 19 |
| **Database & ORM** | SQLite (`prisma/dev.db`), Prisma ORM |
| **AI Agent Orchestration** | LangChain 1.3, OpenAI GPT-4o-mini |
| **RAG Vector Search** | MemoryVectorStore, OpenAI Embeddings, PDFKit |
| **Icons & Design System** | Lucide React, Glassmorphism, CSS Custom Properties |
| **PDF Generation** | PDFKit |

---

## 📁 Codebase Directory Overview

```
ai-chatbot/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/          # Streaming agent endpoint (Tanglish parsing + RAG)
│   │   │   ├── site-visits/   # Site visit booking API
│   │   │   └── favorites/     # Prisma favorite toggle API
│   │   ├── globals.css        # Core design system & responsive UI rules
│   │   └── page.js            # Main application shell
│   ├── components/Chat/
│   │   ├── ChatWindow.js      # Main state orchestration container
│   │   ├── ChatHeader.jsx     # Responsive Desktop & Mobile header views
│   │   ├── MessageList.jsx    # Chat message stream & Markdown property card renderer
│   │   ├── ChatInput.jsx      # Input bar & voice studio recording animation
│   │   ├── QuickSuggestions.jsx # Quick filter suggestion chips
│   │   ├── BookingModal.jsx   # Interactive site visit booking form modal
│   │   └── FavoritesModal.jsx # Saved favorites drawer modal
│   ├── lib/
│   │   ├── agent/             # LangChain agent, prompt templates, & tools
│   │   └── ThemeContext.js    # Dark/Light theme state provider
│   └── data/
│       └── properties.json    # Seed dataset (32+ listings in Chennai, Coimbatore, Madurai)
├── prisma/
│   ├── schema.prisma          # Database schema (Property, UserMemory, Favorite, SiteVisit)
│   └── seed.js                # Database seeding script
├── public/
│   └── RealEstates.pdf        # Production real estate RAG knowledge base PDF
└── scripts/
    └── generate_pdf.js        # PDFKit script generating RealEstates.pdf
```

---

## ⚙️ Quick Start & Local Setup

### Prerequisites
- **Node.js** v18+
- **npm** v9+
- **OpenAI API Key** ([Platform API Keys](https://platform.openai.com/api-keys))

### 1. Clone & Install
```bash
git clone https://github.com/muthukumar-sde/ai-chatbot.git
cd ai-chatbot
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root folder:
```env
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL="file:./dev.db"
```

### 3. Database Setup & Seed
```bash
npx prisma db push
node prisma/seed.js
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to start testing.

---

## 📜 Database Schema Summary

- **`Property`**: Stores property ID, title, city, location, price, type, bedrooms, amenities, status, and image URL.
- **`UserMemory`**: Stores thread ID, user name, phone, email, search preferences, and search locations.
- **`Favorite`**: Links thread ID / user key to bookmarked properties.
- **`SiteVisit`**: Stores visitor bookings including property ID, date, time, customer contact info, and confirmation status.

---

## 📄 License

Distributed under the [MIT License](./LICENSE).

---

<div align="center">
Developed with ❤️ for <b>MK Properties</b>
</div>
