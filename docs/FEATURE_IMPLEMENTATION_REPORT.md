# Current workflow update

See [the October 27 paper-alignment report](PAPER_ALIGNMENT_2026-10-27.md). The latest paper supersedes this historical report’s appointment-approval and appointment-QR descriptions with approved PDL lists, assigned days, eligible dates, a permanent visitor QR, and linked schedule notices. The working roster remains empty as requested.

# Project modifications and verification report

Date: 19 October 2026 (Asia/Manila)

The existing React/Vite/TypeScript, Express, MySQL and WebSocket project was updated in place. Existing uncommitted authentication/messaging changes were preserved and integrated. No dependencies were installed. Local credentials and important configuration files (`.env` and `.env.local`) were not replaced.

## Completed application changes

1. **50 fictional PDLs:** Added an idempotent seed with deterministic unique `DEMO-FICTIONAL-001` through `050` identifiers, Filipino-style names, birthdates, sex and existing facility/dormitory fields. Each row carries the `FICTIONAL-PDL-DEMO-50-V1` marker and an explicit fictional-data note. No criminal allegation is invented. The seed aborts on conflicting existing identifiers and never overwrites a PDL. It was run twice against the current database: **50 fictional records, 51 total PDLs, original PDL preserved**. Original account count remains **3**, and original appointment count remains **0**.
2. **Nationwide addresses:** Signup and profile editing share dependent PSGC controls for region, applicable province/administrative division, city/municipality/Manila district and barangay. NCR skips the province layer. Independent cities and Manila's district barangays are supported. House/building, street, optional subdivision, editable ZIP and assembled address are stored together with geographic codes. Existing legacy addresses remain readable and are retained during profile edits unless the user changes the address. Loading/error/retry states are present.
3. **Mobile validation:** Fixed `+63` prefix; 10 editable numeric digits starting with `9`; numeric input mode and length/pattern limits; strict backend normalization of local `09…` and international `+639…` numbers. Invalid country-code duplication, wrong lengths and nonnumeric values are rejected.
4. **Contact uniqueness:** Lowercase email and normalized mobile storage, backend conflict checks and unique database indexes. Concurrent duplicate registration requests are rejected by the database. Profile changes exclude the current user in checks and recheck uniqueness when committed. Existing normalized conflicts stop migration for manual reconciliation; no accounts are deleted or merged.
5. **Suffix and age:** Shared optional suffix dropdown from None through Jr./Sr./II–X, backend allowlist, date inputs and calculated ages. Visitor registration enforces age 20 using the current Manila calendar date. Future/invalid dates are rejected; the age policy does not apply to internally created staff accounts.
6. **Passwords and recovery:** Login/signup/confirmation/recovery/change-password visibility buttons are accessible and hidden by default. The simulated recovery form was replaced with backend OTP verification, a five-minute reset grant, strong-password validation and secure password hashing. Recovery responses do not reveal whether an email exists. Codes expire, are attempt-limited and single-use, with resend cooldowns. Successful reset/change invalidates account sessions and recovery grants. Login/signup/recovery navigation is functional.
7. **Sensitive profile changes:** Changes remain pending until a code verifies the current verified contact and each changed email/mobile destination. Requests expire after ten minutes and have rate/attempt limits. Changes are audited and active sessions are invalidated. Name, birthdate or address changes require renewed identity review. A new resubmission marker preserves previous identity-review records; superseded submissions and submissions without current ID documents cannot be approved.
8. **Companions:** Optional Yes/No selection; configurable limit and approved family relationships; full name, birthdate, calculated age and relationship fields. Backend enforces age 20 and family eligibility. Companion identity data is linked through the existing appointment row and is immutable after creation. Administrators can record independent ID/entry review notes and authorize/reject each companion. Authorization is required at check-in and is never inherited from the primary visitor.
9. **Admin appearance and analytics:** Admin-only off-white/gray/muted-navy theme for the header, navigation, cards, tables, forms and dialogs. Visitor/authentication theme changes were limited to functional form additions. Infographics remain; previously fixed population numbers and decorative visit bars now use actual PDL/appointment data. Check-in and on-site counts use backend statistics and WebSocket updates. Pending pass previews show their real status, do not generate approved QR codes and cannot be printed as approved passes.
10. **Login and notifications:** Verified contacts plus valid credentials log in immediately; normal login does not send an OTP. Suspended/rejected/inactive accounts and unverified contacts are blocked. Contact verification during signup remains. Routine messaging covers signup, approved visits and sensitive changes; user-requested recovery remains separate. Approved visits use the existing per-channel outbox and duplicate suppression. Pending/cancelled states do not trigger successful confirmation. Confirmations include visitor/date/time/reference/status/reminders and the fingerprint-before-QR instructions. PDL details stay in the authorized account rather than being sent in messages.
11. **Ordered entrance verification:** Staff select a candidate visit, then the authenticated scanner must match its enrolled identity. An opaque 60-second server-side session binds staff, visitor and appointment. QR scanning is blocked beforehand. An exact random approved appointment QR must match that session; public references and unsigned identity JSON are rejected as authentication tokens. Approval, current custody record, account/KYC state, Manila date/time window, companion authorization and previous entry are checked again before entry. Check-in, both attendance logs, proof consumption and audit commit together. Existing historical admissions are backfilled as used. The old direct-admission API is blocked. The admin scanner reuses this same workflow.

## Files changed

Application/backend:

- `backend/auth.ts`
- `backend/identity.ts`
- `backend/index.ts`
- `backend/database/db.ts`
- `backend/messaging.ts` (existing uncommitted provider implementation retained; confirmation content updated)

Application/frontend:

- `frontend/src/App.tsx`
- `frontend/src/components/Auth/LoginPage.tsx`
- `frontend/src/components/Auth/ForgotPasswordModal.tsx`
- `frontend/src/components/Registration/SignUpModal.tsx`
- `frontend/src/components/Common/PermanentVisitorIdCard.tsx`
- `frontend/src/components/Common/PrintablePassModal.tsx`
- `frontend/src/components/Dashboard/AdminDashboard.tsx`
- `frontend/src/components/Dashboard/VisitorDashboard.tsx`
- `frontend/src/components/Dashboard/WorkerDashboard.tsx`
- `frontend/src/components/Guard/GuardScannerModal.tsx`
- `frontend/src/index.css`
- `frontend/src/services/api.ts`
- `frontend/src/types.ts`
- `frontend/src/types/index.ts`

Configuration/documentation/tests:

- `.env.example` (companion policy examples added; actual credentials unchanged)
- `package.json` (migration, seed, reference-refresh and feature-test commands)
- `README.md`
- `docs/esp32-hardware-websocket-contract.md`
- `tests/visitor-communications.test.ts` (updated expectations for immediate login and structured addresses)

New retained files:

- `backend/validation.ts`
- `backend/geography.ts`
- `backend/gate.ts`
- `backend/database/migrations.ts`
- `backend/data/psgc.json`
- `backend/data/PSGC-SOURCE.md`
- `frontend/src/components/Common/IdentityFields.tsx`
- `frontend/src/components/Common/AddressFields.tsx`
- `frontend/src/components/Common/ProfileEditor.tsx`
- `frontend/src/components/Common/CompanionFields.tsx`
- `scripts/migrate.ts`
- `scripts/seed-pdls.ts`
- `scripts/import-psgc.mjs`
- `tests/features.test.ts`
- `docs/FEATURE_IMPLEMENTATION_REPORT.md`

Pre-existing uncommitted `backend/appointment-notifications.ts`, `backend/login-challenge.ts`, `tests/messaging.test.ts`, and `frontend/src/components/Verification/EmailConfirmationView.tsx` were retained. The challenge utility is no longer used for normal login. Generated production assets are under the existing build output directory.

## Database migrations and seed

`npm.cmd run db:migrate` runs the existing initializer and repeatable feature migration. The initializer also invokes the feature migration on normal startup.

| Schema change | Purpose |
| --- | --- |
| `users.address_data` | Structured PSGC address while retaining legacy address columns |
| `pdls.demo_batch` | Explicit seed ownership/demonstration marker |
| `appointments.companions` | Companion identity/review records on their appointment |
| `appointments.checked_in_at` | Permanent, atomically checked admission marker |
| `account_change_requests` | Expiring pending profile payload and hashed verification proofs; FK to user |
| `gate_verification_sessions` | Hashed, expiring fingerprint/QR proof; FKs to staff, visitor and appointment; expiry index |
| `feature_migrations` | Applied migration marker |
| Existing email/mobile unique indexes | Preserved/created after normalized-duplicate preflight |

`npm.cmd run db:seed-pdls` inserts only the 50 marked demo PDLs. Reruns check ownership and count, preserving existing PDLs and visitor relationships. Do **not** use the older `db:reset-demo` command for this update; that reset command is unrelated to the additive seed.

## New and updated APIs

All paths below begin with `/api`. Existing authentication and role checks remain unless an endpoint is public by design.

| Method/path | Behavior |
| --- | --- |
| `GET /geography/:kind?parent=CODE` | Public local PSGC lookups; kinds: regions, provinces, cities, barangays, zips |
| `POST /auth/register` | Visitor age, person, contact uniqueness and structured-address validation |
| `POST /auth/login` | Immediate credential login after contact/status checks |
| `POST /auth/resume-verification` | Password-protected resumption of interrupted visitor contact verification |
| `POST /auth/forgot-password` | Generic email recovery request |
| `POST /auth/verify-reset` | Consume recovery OTP and issue five-minute reset grant |
| `POST /auth/reset-password` | Consume grant, hash password, invalidate sessions/tokens |
| `POST /auth/change-password` | Verify current password and change password, invalidate sessions |
| `POST /auth/profile-change` | Validate and queue sensitive changes; send required verification codes |
| `POST /auth/profile-change/verify` | Verify successive required contacts and commit changes atomically |
| `POST /auth/verify-login-otp`, `/auth/resend-login-otp` | Retired normal-login endpoints return HTTP 410 |
| `GET /companion-policy` | Authenticated approved relationships, age and maximum |
| `POST /appointments` | Validated optional companions; always pending administrator review |
| `PATCH /appointments/:id/companions` | Administrator-only individual ID/entry authorization with review notes |
| `POST /worker/scan` | Requires `{code, proof}`; verifies QR only after fingerprint |
| `POST /worker/visits/:id/admit` | Requires `{requestId: proof}`; atomic admission after QR |
| `POST /gate/scan`, `/gate/visits/:id/admit` | Same ordered workflow under the existing ADMIN/SUPER_ADMIN gate permission; raw direct-admission payloads return HTTP 403 |
| `GET /gate/visitors/today`, `/gate/visitors/search`, `/gate/history`; `POST /gate/visits/:id/exit` | Existing administrator entrance responsibilities through the admin gate guard; worker permissions are unchanged |
| `GET /stats` | Includes actual admission and current-on-site statistics |
| `PATCH /admin/kyc/:id/review` | Rejects superseded reviews and approval without current documents |

The existing `/hardware` WebSocket contract is reused. See the hardware document for message shapes and commissioning requirements. Existing signup OTP, logout, account/session, appointment approval, document and role-restricted management APIs remain.

## Dependencies and external configuration

**New dependencies installed: none.** The update uses existing React, lucide-react, Express, mysql2, nodemailer, qrcode, ws and Node built-ins.

Address selection needs no external API key or live upstream connection. The bundled licensed [PSGC reference snapshot](../backend/data/PSGC-SOURCE.md) contains 18 regions, 1,656 city/municipality/submunicipality entries and 42,010 barangays. Administrative parent groups are handled separately from actual provinces. Its upstream identifies the geographic hierarchy as PSA Q1 2026, based on the Q4 2025 datafile. This is a versioned reference snapshot, not a promise of continuously updated administrative changes. ZIP suggestions are postal-area reference data and must be confirmed by the user. `npm.cmd run address:refresh` deliberately downloads a new snapshot and provenance; review changes before operational deployment.

The current local `.env` check found these missing, without printing any credential values:

- **SMTP:** `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` are not fully configured. Supply these plus the provider's `SMTP_PORT`, `SMTP_SECURE` and approved `SMTP_FROM`.
- **SMS:** No live provider is configured. The existing adapter supports Twilio through `SMS_PROVIDER=twilio`, `SMS_ACCOUNT_ID`, `SMS_AUTH_TOKEN`, `SMS_FROM`, and optional `SMS_API_URL`. Sender/Philippine delivery permissions depend on the provider account. `mock` is explicit test-only behavior and cannot operate in production.
- **KYC:** `KYC_ENCRYPTION_KEY` is missing. Supply a private, persistent random 32-byte key (64 hex characters or base64) before ID uploads. Preserve and back up that key; replacing it makes existing encrypted material unreadable.
- **Hardware:** `HARDWARE_DEVICE_TOKEN` is missing. Configure it privately in the backend and ESP32 firmware. Commission the GM65 QR reader, AS608 fingerprint enrollment/matching and the exact request/result fields. `templateId` means the enrolled scanner index, never a raw template. The server refuses missing/mismatched identities. No successful scan is fabricated by production code.
- Set a persistent `SESSION_SECRET`, appropriate `APP_ORIGIN`/HTTPS and deployment network controls before production. No real secret was generated into or overwritten in your local environment files.

Actual external email/SMS delivery, recipient inbox/device receipt, real ID uploads with the deployment key, and physical scanner operation remain unverified. Contact-based features require the configured delivery services. Email recovery requires an account with a registered email; mobile-only accounts do not gain an email automatically.

## Actual testing results

Commands run successfully:

- `npm.cmd run db:migrate`: additive migration applied to the current database and rerun successfully.
- `npm.cmd run db:seed-pdls`: run twice against the current database; exactly 50 marked fictional PDLs, 51 total PDLs; original 3 accounts and 0 appointments preserved.
- `npm.cmd run lint`: frontend and backend TypeScript checks passed.
- `npm.cmd run build`: production build passed. Vite reports a main JavaScript chunk over its 500 KB advisory threshold; this is a performance advisory, not a build failure.
- `npm.cmd run test:features`: **13 test groups passed** using isolated MySQL databases, controlled dates, local SMTP capture and a test-only authenticated hardware protocol emulator.
- `npm.cmd run test:communications`: **9 test groups passed** using isolated MySQL, local SMTP and mock SMS/provider requests.
- `git diff --check`: no whitespace errors; Git also prints ordinary Windows line-ending notices.

The hardware test exercises authenticated WebSocket commands/results, fingerprint rejection and proof creation. The gate API test also uses a controlled calendar/time and synthetic enrolled identity to verify expiry, ownership, ordering and concurrent admission. These tests establish application behavior; they do not establish physical sensor accuracy or operation.

Browser checks were performed on the running app and on an isolated fictional-data admin preview: signup controls, NCR city/barangay dependency, assembled address, suffix selection, password visibility, signup-to-login/recovery navigation, admin sidebar/table/companion review, responsive admin layout (default narrow viewport and 1280×900 desktop), actual population count and disabled QR controls before fingerprint. No real visitor's profile or appointment was changed for these checks.

### Requested scenario checklist

| # | Scenario | Evidence / limit |
| --- | --- | --- |
| 1 | Exactly 50 repeatable fictional PDLs | Current DB count + two seed runs + isolated integration test |
| 2–3 | Nationwide dependent address selection | All 18 regions and parent/child traversal tested; NCR browser check |
| 4 | ZIP handling | Imus suggestion, manual format and assembled-address backend tests; suggestions visible in browser |
| 5–7 | Fixed prefix, digit/length/character rules | Implemented shared controls, inspected in browser; strict backend valid/invalid-number tests. Exhaustive keyboard/paste combinations not manually tested |
| 8–11 | Duplicate contacts, email case, mobile normalization | Concurrent API requests + database assertions |
| 12 | Suffix dropdown | Browser selection + backend rejection of arbitrary values |
| 13–15 | Age 19/20/future birthdays | API tests and date-boundary/leap-date validation tests |
| 16 | Password eye buttons | Signup show/hide verified in browser; shared control used in confirmation/reset/change forms. Every instance not manually clicked |
| 17 | Forgot Password | Local SMTP recovery through actual API, weak password rejection, OTP reuse/expiry and session invalidation tests; real delivery untested |
| 18–19 | Login/signup navigation | Both entry links inspected; signup Log in and recovery navigation clicked |
| 20–23 | Adult family companions / reject minors/non-family / none | API and validation tests |
| 24 | Admin companion review | Administrator API authorization test + browser details/review controls |
| 25–26 | Government theme and retained infographics | Narrow/desktop browser inspection; actual 50-PDL preview count. All historic report/export permutations not retested |
| 27–29 | Immediate verified login, block unverified, keep signup verification | API tests; no login message sent; legacy login OTP endpoint retired |
| 30 | Confirmed-schedule notifications | Local SMTP + mock SMS, repeated approval suppression and independent-channel tests; real providers untested |
| 31 | Sensitive changes require verification | Pending-state tests, wrong-code rejection, old/new contact verification, uniqueness, identity-review preservation and session invalidation |
| 32 | Password reset verification remains | End-to-end local recovery API test |
| 33–35 | Fingerprint first; valid/invalid results gate QR | API + authenticated test WebSocket emulator; browser disabled QR controls. Physical hardware untested |
| 36 | QR ownership | Fingerprint proof is bound to one visitor and appointment; wrong QR rejected by API test |
| 37 | Invalid/expired schedules | Future schedule and expired proof rejected; permitted Manila time windows tested. Every legacy status combination not separately exercised |
| 38–39 | Successful ordered check-in and duplicate prevention | Controlled-date API test; concurrent admission yields one success, one rejection; one gate log, two attendance log types, one audit |
| 40 | Existing unrelated functionality | TypeScript/build + retained communications tests + selected admin UI inspection passed. No claim of exhaustive regression testing of every existing feature |

## Limits and remaining operational work

- Real email/SMS, ID upload encryption configuration and scanner commissioning must be completed before operational use. The current local configuration lacks the required values listed above.
- Companion review is an administrator's documented facility identity/entry decision. Automated companion identity verification or a separate companion biometric enrollment system was not invented; the declared companion remains pending until individually authorized.
- The existing role allowlists were preserved. Automatic approval review rejected a proposed expansion of the worker allowlist; it was not applied. The administrator scanner uses the existing ADMIN/SUPER_ADMIN gate guard and shares the ordered workflow, so existing admin entrance access is retained without granting extra worker permissions.
- Full live-device, live-message and every unrelated workflow regression tests remain outstanding. The testing checklist distinguishes these from implemented and tested application logic.
- Notification provider acceptance is not proof of recipient delivery. Existing FAILED or indeterminate SENDING outbox jobs need operator review to avoid blindly resending a possibly accepted message.

## Running the updated project

From the existing project root, start MySQL in XAMPP, then run:

```powershell
npm.cmd run dev
```

Frontend: `http://localhost:3000/`. Backend health: `http://localhost:4001/api/health`.

For a second checkout or deployment database:

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed-pdls
npm.cmd run dev
```

The migration and fictional seed are repeatable. If duplicate existing normalized contacts are reported, reconcile the named accounts deliberately before retrying; no automatic deletion/merge is performed. Restart the backend after providing external-service or companion-policy configuration.

## CRUA and login repair follow-up — October 20, 2026

See [CRUA_READINESS.md](CRUA_READINESS.md) for essential CRUA modules, remaining functionality, repaired endpoints, the legacy-account access migration and updated verification evidence. The follow-up feature suite contains 22 passing groups, including archive/restore coverage, worker/visitor access, socket logout isolation and duplicate-PDL protection. Dedicated staff administration, rescheduling and complete document management remain unfinished; the presence of a module is not a claim of complete CRUA.

## Shared government visual theme — October 20, 2026

The user's updated scope applies the minimalist government theme to all roles and authentication screens. This supersedes the earlier admin-only styling scope. The photo background and dark translucent surfaces were replaced by a soft gray page, off-white panels, slate text, muted navy actions and neutral borders. Charts, statistics and all application behavior remain intact. Visitor booking/card and footer layouts also adapt to narrow screens.

Styling changes: `frontend/src/index.css`, the root class in `frontend/src/App.tsx`, and presentation classes in `Header.tsx`, `Footer.tsx`, `Dashboard/VisitorDashboard.tsx` and `Common/PermanentVisitorIdCard.tsx`. No backend, database, authentication, permission or configuration changes were made for this visual update.

Browser checks used an isolated fictional database: login, signup modal, visitor booking, worker desk, admin navigation and infographic dashboard; admin and visitor previews fit a 390-pixel viewport without page overflow. The temporary preview was removed afterward. Evidence is saved in `docs/qa/government-style-login.png`, `government-style-visitor.png`, `government-style-worker.png` and `government-style-admin.png`. Build and TypeScript checks passed; individual protected workflows were not exhaustively retested for a presentation-only update.
