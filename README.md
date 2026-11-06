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

## Visitor verification and linked schedules

Visitors can register with a Philippine mobile number, an email address, or both. A mobile-only visitor does not need an email account. Each supplied contact is verified before the account continues to identity review. When both are supplied, the SMS code is checked first, followed by the email code.

Visitor sign-in checks the password, verified contacts and account status, then creates the session immediately. Normal login does not send an OTP. Signup verification, password recovery and sensitive profile changes retain expiring, single-use codes and rate limits. An interrupted signup can resume through the login page's verification link.

The Administrator maintains each PDL’s approved visitor list (initially seven names) and assigned weekly visitation day. Activated linked visitors select eligible upcoming dates within 8:00 a.m.–4:00 p.m.; there is no appointment-approval cycle. Link approval and weekly schedule changes generate notices for verified email and SMS contacts, including visitors with no selected date. Selecting or changing a visit date sends a confirmation with the date, time, facility and reference to the visitor’s verified contacts. Changing the assigned day cancels upcoming unused selections. Unconfigured delivery remains recorded for later retry, and provider acceptance does not establish recipient receipt.

### Enable real delivery

Set the existing SMTP settings in the root `.env` for email. For real texts, use [textbee](https://textbee.dev/docs/getting-started) to register an Android phone with a SIM that can send SMS. Keep the phone online and allow the textbee app to send SMS.

Set `SMS_PROVIDER=textbee`, paste the key from the textbee dashboard into `TEXTBEE_API_KEY`, and copy the sending phone's Device ID into `TEXTBEE_DEVICE_ID`. Restart the app with `npm.cmd run dev`. Keep the API key in the local backend environment. API acceptance means textbee accepted the request. Check the textbee dashboard for delivery status.

`SMS_PROVIDER=mock` is for local testing only: the verification screen labels the test code, and notification records show test-only delivery. Mock SMS cannot be used in production. No real email or text is sent when its delivery service is unconfigured.

Access from outside the jail's local network requires an internet-accessible deployment with HTTPS, `APP_ORIGIN` set to the website address, and `VITE_API_BASE_URL` pointing to its backend `/api` address. Local development at `localhost` does not publish the website to the internet.

### Verify the communication flows

Run `npm.cmd run test:communications` and `npm.cmd run test:features` with local MySQL running. Integration checks use isolated temporary databases, a local test email receiver and mock SMS. They remove only their own temporary databases afterward. The MySQL account needs permission to create and remove these test databases. Checks include signup verification, immediate login, age/address/contact validation, recovery, verified profile changes, companions, approved-list limits, assigned days, schedule notices, Officer duties and ordered gate verification.

## October 2026 feature update

Run these from the main project folder with MySQL running:

```powershell
npm.cmd run db:backup
npm.cmd run db:migrate
npm.cmd run dev
```

The optional `npm.cmd run db:seed-pdls` creates 50 explicitly fictional records. It is not part of normal startup and was not run against the intentionally empty working roster. Migrations are additive and abort on conflicting normalized account contacts instead of merging accounts. The address controls use a bundled PSGC snapshot with all 18 regions, NCR/Manila districts and barangays; ZIP suggestions remain editable. An intentional reference refresh is available through `npm.cmd run address:refresh`.

Entrance processing is fingerprint first, then the permanent visitor QR, then current approved-list/date/day checks and check-in. A server-side proof expires after 60 seconds. The legacy direct gate-admission endpoint is blocked. Companions default to pending identity/entry review and require independent administrator authorization. Configure approved family relationships and the limit using `COMPANION_RELATIONSHIPS` and `COMPANION_LIMIT`.

See [the complete implementation and testing report](docs/FEATURE_IMPLEMENTATION_REPORT.md) and [the scanner contract](docs/esp32-hardware-websocket-contract.md). SMTP, SMS and physical scanner operation require configuration; test emulation does not verify real delivery or hardware.

## Latest paper alignment

See [the October 27 implementation report](docs/PAPER_ALIGNMENT_2026-10-27.md) for the source-paper mapping, administrator/Officer/visitor checklist, migration and backup evidence, 43 passing test groups, configuration requirements and the incomplete visual browser check. This supersedes older appointment-approval descriptions in the historical reports.
