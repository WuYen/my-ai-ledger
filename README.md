# my-ai-ledger

AI智能記帳系統｜AI-Powered Smart Ledger

---

## 🚀 專案簡介 (Project Description)

**my-ai-ledger** 是一個主打 AI 智能對話記帳、混合查詢與自動分類的現代雲端記帳 Web App。

- 📱 **PWA體驗**，極速、手機為主，秒開即用
- 🤖 **AI 對話記帳**：用自然語言就能記錄消費，不需填表
- 📊 **自動分類**：AI自動辨識消費分類（餐飲、娛樂、運動等），方便查詢
- 🧠 **Hybrid 智能查詢**：整合結構化 SQL 與語意檢索（embedding），用語言問就能查
- 🗂️ **支援語意搜尋**：即使消費描述不同，也能用語意找出相關紀錄
- ☁️ **免費雲端部署**（Vercel + Supabase）

---

## 🔧 技術棧 (Tech Stack)

- [Next.js](https://nextjs.org/) (TypeScript, React)
- [Tailwind CSS](https://tailwindcss.com/)
- [next-pwa](https://github.com/shadowwalker/next-pwa)（PWA 支援）
- [Supabase](https://supabase.com/)（Postgres DB + pgvector 向量資料庫）
- [LangChain](https://js.langchain.com/)（Hybrid LLM 智能查詢管線）
- [OpenAI API](https://platform.openai.com/)（Embedding、自動分類、自然語言理解）
- [Vercel](https://vercel.com/)（一鍵雲端部署）

---

## 🌟 MVP 特色 (Key Features / MVP)

1. **AI 對話記帳**  
   - 用戶自然語言輸入（例：「今天午餐 120元」）
   - 系統自動分類、產生語意向量，寫入資料庫

2. **自動分類**  
   - 呼叫 LLM，將消費自動歸類到「餐飲/娛樂/運動/其他」

3. **Hybrid 智能查詢**  
   - 常見結構化查詢（SQL）ex：「上月吃飯花多少？」
   - 語意查詢（embedding）ex：「和運動有關的花費有哪些？」

4. **PWA 手機體驗**  
   - 支援加到主畫面、離線快取、極速啟動

---

## 🏁 啟動流程 (Getting Started)

1. **Clone 專案**
   ```bash
   git clone https://github.com/你的帳號/my-ai-ledger.git
   cd my-ai-ledger

## 📦 離線模式 (Offline Mode)
- 從 IndexedDB 讀取資料，在背景與 API 同步
- 未同步的新增加紀錄會自動上傳

## structure
src/
│
├── app/                     ← Next.js App Router (UI + routing)
│   ├── page.tsx            ← 首頁 UI
│   ├── layout.tsx
│   │
│   ├── ledger/             ← 專門給 Ledger 的頁面
│   │   └── page.tsx        ← Ledger 主頁（你現在 page.tsx 可以搬這裡）
│   │
│   ├── api/                ← 所有 server-side API endpoint
│   │   ├── ledger/
│   │   │   └── route.ts    ← 處理 CRUD
│   │   └── ask/
│   │       └── route.ts    ← AI 查帳
│
├── components/              ← 所有純 UI React Components
│   ├── ledger/
│   │   ├── LedgerList.tsx
│   │   ├── LedgerAsk.tsx
│   │   └── LedgerInput.tsx
│   └── common/
│       └── Button.tsx
│
├── hooks/                   ← 自定義 React hooks
│   ├── useLedger.ts
│   └── useLocalDb.ts
│
├── domain/                  ← 你的核心 business logic
│   └── ledger/
│       ├── ledger.schema.ts
│       ├── ledger.service.ts
│       ├── ledger.repository.ts
│       └── index.ts         ← optional, 用來 export
│
├── chains/                  ← LangChain chains（AI prompt, agent）
│   ├── categoryChain.ts
│   └── askChain.ts
│
└── lib/                     ← infra tools（db client, langchain client…）
    ├── supabaseClient.ts
    ├── langchainClient.ts
    └── localDb.ts
