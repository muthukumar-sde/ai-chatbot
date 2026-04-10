<div align="center">

# 🤖 AI Chatbot

**A production-ready AI chatbot built with Next.js, LangChain, and LangGraph.**  
Multi-model support · PDF RAG · Agentic workflows · Streaming responses

[![Next.js](https://img.shields.io/badge/Next.js-16.2.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![LangChain](https://img.shields.io/badge/LangChain-1.3.1-1C3C3C?style=flat-square&logo=langchain)](https://langchain.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/your-username/ai-chatbot/pulls)

</div>

---

## ✨ Features

- **Chat UI** — Responsive, streaming chat interface using Next.js App Router
- **Multi-model** — Switch between Anthropic Claude and OpenAI GPT models
- **LangGraph agents** — Stateful, tool-using agentic workflows
- **PDF RAG** — Upload and query documents with Retrieval-Augmented Generation
- **Modular tools** — Easily extend with custom tools (search, APIs, etc.)
- **Tailwind CSS v4** — Fast, utility-first styling

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.3, React 19 |
| AI Orchestration | LangChain 1.3, LangGraph 1.2 |
| LLM Providers | Anthropic (Claude), OpenAI (GPT) |
| Document Processing | pdf-parse, LangChain Text Splitters |
| Styling | Tailwind CSS v4, Lucide React |
| Linting | ESLint 9 |

---

## 📁 Project Structure

```
ai-chatbot/
├── app/
│   ├── api/
│   │   └── chat/          # Streaming LLM API route
│   └── page.tsx           # Main chat UI
├── components/            # Reusable React components
├── lib/
│   ├── agent/             # LangGraph agent definition
│   ├── tools/             # Custom LangChain tools
│   └── rag/               # PDF ingestion & vector store
├── public/                # Static assets
├── .env.local             # Environment variables (not committed)
└── package.json
```

---

## ⚙️ Installation

### Prerequisites

- **Node.js** v18+
- **npm** v9+
- API key(s) from [Anthropic](https://console.anthropic.com/) and/or [OpenAI](https://platform.openai.com/api-keys)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ai-chatbot.git
cd ai-chatbot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```env
# Anthropic (Claude)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# OpenAI (optional)
OPENAI_API_KEY=your_openai_api_key_here
```

---

## ▶️ Running the App

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production

```bash
npm run build
npm run start
```

---

## 🧹 Utility Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run clean` | Remove `.next`, `.swc`, and `node_modules` |
| `npm run fresh` | Clean install and restart dev server |

---

## 📄 RAG (Retrieval-Augmented Generation)

This project supports PDF-based knowledge ingestion:

1. Place PDF files in `public/` or upload via the UI
2. Files are parsed with `pdf-parse`
3. Text is chunked via `RecursiveCharacterTextSplitter`
4. Chunks are embedded and stored in a LangChain vector store
5. The LangGraph agent retrieves relevant context before responding

> **Note:** The vector store must be initialized before RAG queries will work. See `lib/rag/` for setup details.

---

## 🧠 Agent Flow

```
User message
    │
    ▼
LangGraph router
    │
    ├──► Tool invocation (search, RAG, custom tools)
    │         │
    │         ▼
    │    Tool results
    │         │
    └──► LLM response generation
              │
              ▼
         Streamed reply
```

---

## 🛠️ Key Dependencies

| Package | Purpose |
|---|---|
| `@langchain/anthropic` | Claude model integration |
| `@langchain/openai` | OpenAI GPT integration |
| `@langchain/langgraph` | Stateful agent graph |
| `@langchain/community` | Community tools & integrations |
| `@langchain/textsplitters` | Document chunking |
| `pdf-parse` | PDF text extraction |

---

## 📌 Notes

- Node.js 18+ is required for Next.js 16 and the LangChain ecosystem
- For RAG to work, the vector store must be populated before queries
- API keys must be set in `.env.local` before starting the dev server
- Use `npm run fresh` to fully reset your local environment if you hit dependency issues

---

## 🤝 Contributing

1. Fork the repository
2. Create your branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📜 License

This project is licensed under the [MIT License](./LICENSE).

---

<div align="center">

Built with ❤️ using [Next.js](https://nextjs.org/) + [LangChain](https://langchain.com/)

</div>
