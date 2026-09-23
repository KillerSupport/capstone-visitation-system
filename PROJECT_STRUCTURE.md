# Project Structure

```text
Capstone from Lhester/
├── frontend/                 # Everything shown in the browser
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/       # React UI components
│   │   ├── services/         # Browser API and WebSocket clients
│   │   ├── styles/           # Global styles
│   │   ├── types/            # Frontend TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/                  # Everything that runs on the server
│   ├── database/             # MySQL queries and legacy SQLite files
│   ├── index.ts              # Express API and WebSocket server
│   └── tsconfig.json
├── scripts/
│   └── run-dev.mjs           # Starts frontend and backend together
├── .env                      # DB credentials and local port settings
├── package.json              # One-command scripts and dependencies
└── README.md
```

Run the whole project from the root folder with:

```powershell
npm.cmd run dev
```
