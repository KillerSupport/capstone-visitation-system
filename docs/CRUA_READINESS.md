# Current status

The October 27 paper-alignment update supersedes the historical status below. Officer account creation/duty management, staff profile access, eligible-date changes, incident follow-up and shared histories are now implemented. See [the current report](PAPER_ALIGNMENT_2026-10-27.md) for implemented behavior and limits. The latest workflow uses approved PDL connections and assigned weekly days without an appointment-approval cycle.

# Essential CRUA modules and operational readiness

CRUA means Create, Read, Update and Archive. Archive retains the original record and related history; it is not permanent deletion. Permissions below describe recommended responsibilities, not permission expansions made by this repair.

## Priority modules

| Module | Responsible roles | Current implementation and remaining work |
| --- | --- | --- |
| PDL records | Admin: CRUA; Worker: assisted creation/read/update; Visitor: limited roster read | Core record management is connected. Worker creation no longer sends a temporary ID as an existing record. Worker edits preserve the existing custody status. Release and archiving remain administrator actions. |
| Visitor accounts | Visitor: signup/read/verified self-update; Admin: read/status/archive | Existing verified-account login compatibility repaired. A dedicated administrator-assisted account creation/edit workflow is not implemented. No visitor self-deletion. |
| Staff accounts | Authorized administrator, with existing Super Admin restrictions | Dedicated staff creation/edit/assignment screens remain unfinished. Existing fixed role permissions were preserved. |
| Personal profile and contacts | Account owner; sensitive changes verified | Visitor editor is connected. Backend own-account changes exist for staff, but dedicated staff profile screens remain unfinished. Unchanged unverified contacts are no longer incorrectly marked verified during another profile change. |
| Visitation schedules | Visitor: create/read/cancel own; Admin: read/status/archive; Worker: operational read/check-in/out | Booking, status changes, cancellation and archive are connected. Date/time rescheduling and administrator-assisted booking remain unfinished. |
| Companions | Visitor declares eligible adults; Admin reviews each identity/entry decision | Created with a schedule, read in visit details, reviewed separately. No standalone companion directory. Confirmed identities cannot be freely rewritten. Retained with the associated visit. |
| Security incidents | Admin: create/read/archive under current permissions | Editing/follow-up workflow is unfinished. Worker reporting is not currently authorized by the backend. |
| Published security notice | Admin: create/read/update/archive; other users/public: published notice read | Existing broadcast controls now persist one notice, publish it to login/dashboard banners, and archive it when cleared. General announcement creation backend also derives its author from the signed-in user. |
| Facility capacity | Admin: read/update; Visitor: configured facility read | Existing controls persist actual database facilities. Missing facilities are disabled instead of presenting a false successful save. Booking enforces the configured limit and counts companions, including simultaneous requests. Full facility/dorm/calendar CRUA remains unfinished. |
| Official PDL documents | Authorized records staff | Data-backed generation/printing and form-storage APIs exist; a complete individual-document editor, approval/version history and archive interface remain unfinished. |
| Archive and restore | Authorized Admin/Super Admin | Canonical record names now resolve correctly. Archive listing SQL was repaired. User, PDL, appointment, incident and announcement archive/detail/history/restore were covered by integration tests. Restoring refreshes active admin lists. |

## Records that should not expose unrestricted CRUA

- Attendance, gate check-ins/check-outs and audit logs: append controlled events, read/filter/export, retain historical evidence. Corrections should be additional audited events rather than rewriting history.
- Identity submissions: controlled submission/resubmission, authorized reading and review decisions. Preserve earlier reviews instead of arbitrary document deletion.
- Passwords, OTPs, reset grants, fingerprint proofs and biometric references: managed through their security workflows, not ordinary record-editing screens. Expiring security tokens may be consumed or removed independently of business-record archiving.
- Charts and statistics: read calculated results from business records rather than manual CRUD.

## Repairs made during the login/CRUA follow-up

- Added the repeatable `20261019_legacy_verified_access` migration. Only accounts already active with a genuinely verified contact at upgrade receive the legacy access policy. No password, phone-verification timestamp, role or account status is replaced. New accounts retain all-registered-contact verification.
- Aligned frontend routing with that policy and reload role data after verification/status changes. Data-loading failures now have a visible retry message.
- Fixed worker PDL creation and status preservation; PDL forms await save completion, preserve entered fields on failure and prevent repeated submission while saving.
- Fixed archive type mismatch and ambiguous SQL columns; refreshed active lists after restoration.
- Connected capacity and notice controls to database-backed endpoints, validation, authorization and audit records. No new business tables were needed for these controls.
- Read configured facilities from the database in visitor scheduling instead of offering nonexistent hardcoded facilities.
- Prevented verified profile updates from implicitly verifying unchanged, unverified contact information.
- Used generated UUIDs for backend-created PDL, incident and announcement record identifiers to avoid timestamp collisions.
- Closed the signed-out session's live/hardware sockets, cleared frontend role data on logout, and retained other independent sessions. Added a regression test for this boundary.
- Prevented duplicate PDL identification numbers from overwriting a different record. PDL/profile writes now commit together or roll back together.
- Removed invented fallback identity, arrest, case, property and document-verification data from normal PDL form initialization. Additional existing case records are retained when editing the first case. Explicit sample filling is marked fictional.
- Removed visitor-side scanner simulation controls. Enrollment/photo labels now reflect recorded evidence instead of inferring verification from active account status. Card downloads can generate a card without an approved QR; the physical entry checks remain enforced.

## Added endpoints

- `GET /api/security-notice`: public, explicitly published notice text only.
- `GET /api/facilities`: authenticated configured-facility reference data.
- `PUT /api/admin/facility-capacities`: existing administrator guard; validated capacities.
- `PUT /api/admin/security-notice`: existing administrator guard; publish/update/archive the notice.

Existing login, profile-change, worker PDL, archive and announcement endpoints were repaired without widening role allowlists.

## Follow-up files

- Backend: `backend/auth.ts`, `backend/messaging.ts`, `backend/index.ts`, `backend/database/db.ts`, `backend/database/migrations.ts`.
- Frontend integration: `frontend/src/App.tsx`, `frontend/src/types.ts`, `frontend/src/services/api.ts`, `frontend/src/services/websocket.ts`, `frontend/src/services/hardware.ts`, `frontend/src/components/Header.tsx`.
- Screens/forms: `frontend/src/components/Dashboard/AdminDashboard.tsx`, `WorkerDashboard.tsx`, `VisitorDashboard.tsx`, `frontend/src/components/Admin/AdminArchivePanel.tsx`, `PDLRegistrationModal.tsx`, `frontend/src/components/Common/PermanentVisitorIdCard.tsx`.
- Added component: `frontend/src/components/Common/SecurityNotice.tsx`.
- Verification and reports: `tests/features.test.ts`, `docs/CRUA_READINESS.md`, `docs/FEATURE_IMPLEMENTATION_REPORT.md`, `docs/qa/worker-crua.png`, `docs/qa/visitor-booking.png`.

The final run passed all 22 feature groups, all 9 communication groups, frontend/backend TypeScript checks and the production build. The build retains Vite's advisory about a JavaScript chunk larger than 500 KB. No credentials/configuration files were overwritten during this follow-up, and no dependencies were added.

## Database separation

`users` stores login accounts. `pdls` stores PDL detainee records. `pdl_form_records` stores structured information associated with a PDL. `appointments.user_id` identifies the visitor account and `appointments.pdl_id` identifies the PDL being visited. A PDL is not a login account.

The last verified main-database inventory before the follow-up resumed was 3 accounts, 51 PDLs (50 fictional demonstration records) and 0 appointments. Tests use separate generated databases and synthetic accounts.

## Verification and limits

The completed repair run passed 22 feature integration/validation groups and 9 communication groups. TypeScript checks and the production build were also run. Tests include old-account compatibility, strict new-account verification, worker intake, visitor booking/cancellation, all five archive record types, concurrent capacity enforcement, notice persistence, unchanged-contact verification safety, logout socket invalidation and duplicate-PDL overwrite protection. Communication tests use local/mock delivery; gate tests use a test-only protocol emulator.

An isolated browser preview with three fictional accounts and 50 fictional PDLs verified worker sign-in, roster loading and a saved PDL edit; visitor sign-in, PDL selection, booking, displayed pending status, cancellation and session persistence after reload. The temporary preview database and helper were removed after testing. Evidence: [worker edit](qa/worker-crua.png) and [visitor booking](qa/visitor-booking.png).

The browser download observer timed out while checking the ID PNG export, so the final card download fix remains unverified in that browser. Printing and every document/report permutation were not manually retested.

Real account passwords were not changed or used in these tests. Passing synthetic account tests does not establish that a particular password entered by a user matches its stored hash.

SMTP, a live SMS provider, `KYC_ENCRYPTION_KEY` and fingerprint hardware/device authentication configuration remain required for their corresponding operations. These are operational dependencies, not simulated successful production actions. Full physical-device operation and every historic document/report permutation remain unverified.

No new dependencies were installed. Start MySQL, then use `npm.cmd run dev` in the project root. The normal frontend is `http://localhost:3000/`; the backend health endpoint is `http://localhost:4001/api/health`. Run `npm.cmd run db:migrate` for an explicit migration run. Do not reset the database to solve a login issue.
