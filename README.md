# BJMP Imus City Jail Visitation System

React/Vite frontend with an Express, MySQL, and WebSocket backend.

## Run locally

1. Open the **project root** in VS Code (the folder containing `package.json`).
2. Start MySQL in XAMPP.
3. Open one VS Code terminal and run:

   ```powershell
   npm.cmd run dev
   ```

4. Open `http://localhost:3000/` in your browser.

The command starts both services:

- Frontend: `http://localhost:3000/`
- Backend API: `http://localhost:4001/api`
- WebSocket: `ws://localhost:4001/ws`

Use `Ctrl + C` in the terminal to stop both services.

## Folder layout

- `frontend/` — React components, pages, styles, Vite configuration, and browser API/WebSocket clients.
- `backend/` — Express API, MySQL database code, and WebSocket server.
- `scripts/` — one-command development launcher.
- `.env` — local database and port settings; do not commit passwords.
- Root `package.json` — shared dependencies and commands.

## Useful commands

```powershell
npm.cmd run dev        # frontend and backend together
npm.cmd run lint       # TypeScript checks
npm.cmd run build      # frontend production build
```
