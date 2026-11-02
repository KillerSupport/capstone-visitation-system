# Website alignment with the October 26 capstone paper

Updated October 27, 2026, Asia/Manila.

The existing website now uses PDL-specific approved visitor lists and assigned weekly visitation days. Visitors select an eligible date directly. The superseded appointment-request, administrator-approval and approval-confirmation cycle is retired from the interface and public status endpoint. Existing historical records are retained.

## Source and interpretation

Source: `C:\Users\a\Desktop\Capstone Important sh8s\1 to 3 hardcopy.docx`, last modified October 26, 2026. The document was read without modification.

The updated objectives and Scope and Delimitation describe approved lists, an initial seven-name limit, assigned weekly days, permanent visitor QR identifiers, Officer duty assignments and schedule-change notices. Some later manuscript tables still describe the older approval cycle. This implementation follows the revised objectives and scope. It retains the user's earlier explicit fingerprint-first entrance requirement: select the visitor/visit, verify the fingerprint, scan the permanent QR, then record admission.

## Implemented behavior

| Requirement | Implemented behavior |
| --- | --- |
| Approved PDL visitor lists | Administrator links an activated, fingerprint-enrolled visitor account to a PDL, records the relationship and archives connections with a reason. Archived connections remain retrievable and can be approved again. |
| Initial seven-person limit | Database policy defaults to seven names per PDL. Administrator can change it. Concurrent additions are serialized. A lower limit cannot hide excess existing names. |
| Assigned visitation days | Administrator assigns Sunday–Saturday per PDL and records a reason. Each change increments the schedule version and preserves its audit history. |
| Eligible visit selection | Visitor sees only their linked current PDLs and the next eligible dates for the assigned day. The server rechecks membership and weekday inside the booking transaction. Relationship comes from the approved connection. |
| Visiting hours | New selections use 8:00 a.m.–4:00 p.m. Gate admission checks the Manila date and time; 4:00 p.m. closes admission. |
| Schedule changes | Changing the day cancels upcoming unused selections and invalidates unused entrance proofs. Historical attendance stays intact. Visitors can choose a new eligible date. |
| Personal date changes | Owner can reschedule an upcoming unused selected visit to another eligible date. Ownership, capacity, duplicate selection and membership are rechecked. No appointment-approval message is generated. |
| Permanent QR | Each visitor gets one opaque random identifier at signup, including while awaiting verification. Existing visitor accounts receive one through the repeatable migration. The identifier contains no embedded personal or PDL details. Cards and selected-visit records use this same QR. |
| Gate authorization | Fingerprint proof, correct permanent visitor QR, active account, approved identity review, current PDL connection, current schedule version, selected date and visiting hours must all pass. QR alone never authorizes entry. |
| Companions | Existing adult-family rules and independent entry review remain. Each companion must be a distinct active visitor on the same PDL's approved list. Each admitted person gets their own jail and PDL attendance records. Active entries cannot overlap. |
| Entry and exit | Transactions prevent duplicate admissions and departures. Departure updates both attendance records and completes the visit. Responsible staff accounts remain in audit and gate records. |
| PDL and schedule notifications | Link approval and weekly-day changes create independent email/SMS delivery records for verified contacts. Changes reach linked visitors even with no selected visit. PDL name and assigned schedule are included. Accepted provider requests are distinguished from recipient receipt. |
| Officer accounts | Administrator creates individual Officer accounts with records, gate, identity-review and/or enrollment duties. Every corresponding API and hardware command checks the assigned duty. No role-management permission is given to Officers. |
| Staff lifecycle | Duties, badge identifier and Active/Suspended status can be updated. Changes invalidate sessions. Officer archiving/restoration preserves records; restoration does not revive old sessions. Existing role aliases retain compatibility until explicitly reassigned. |
| Shared visitation history | Gate-assigned Officers can search records across shifts by visitor, contact, PDL or identifier. Entry and exit Officers are displayed. Contact values are used for search without being returned in the history table. |
| Profile and password access | Shared header opens the existing verified self-profile and password editor for all accounts. Unselected address changes are discarded. |
| Recovery | Verified mobile-only contacts can recover passwords through SMS. Email recovery remains available. Public responses are generic; codes and reset grants expire, are single use, and successful resets invalidate sessions. |
| Incident follow-up | Administrator can correct or follow up a report with a reason. Original reporter and timestamp remain. Before/after information and responsible Officer are retained in audit history. |
| PDL signatures | Existing pointer/tablet signature capture remains connected to PDL records. Integration testing verifies signature data is saved and retrieved under the correct record. This does not establish physical XPPen operation. |

## Schema and record preservation

New additive tables: `visitation_policy`, `pdl_visitation_schedules`, `pdl_visitor_links`, and `pdl_schedule_notifications`.

New columns: `users.permanent_qr_token`, `users.officer_duties`, `appointments.schedule_version`, and `appointments.selection_mode`.

Legacy appointment notification records are retained. Unsent legacy approval confirmations are marked cancelled; the dispatcher now processes linked-PDL/schedule notices. Historical accepted/failed/indeterminate delivery evidence is not deleted or blindly resent.

A local SQL snapshot was created under the ignored `.local-backups/` directory before migration. It was restored to an isolated empty database and all 19 original table counts were verified. The migration was tested repeatedly against isolated data and applied to the working database. The working database remains **3 accounts, 0 PDL records and 0 visits**. No sample PDL seed was run against it. Existing passwords, roles and local environment files were not replaced.

## Files added or connected in this follow-up

- `backend/database/paper-migration.ts`: additive migration and permanent QR initialization.
- `backend/visitation.ts`: approved lists, weekly days, eligible selection/rescheduling, notification outbox and eligibility checks.
- `backend/staff.ts`: individual Officer creation and assigned-duty updates.
- `backend/incidents.ts`: validated incident corrections and audit history.
- `backend/auth.ts`, `backend/index.ts`, `backend/gate.ts`, `backend/database/db.ts`, `backend/appointment-notifications.ts`: integrate the revised workflow, recovery and session boundaries.
- `frontend/src/components/Admin/AdminVisitationPanel.tsx`, `AdminStaffPanel.tsx`: administrator controls.
- `frontend/src/components/Dashboard/OfficerWorkspace.tsx`: assigned Officer tasks and enrollment desk.
- `frontend/src/components/Common/OfficerVisitHistory.tsx`: shared visitation history.
- Existing visitor/admin/worker dashboards, header, recovery, profile, ID/pass components, API client, QR helper and types: connect the new behavior while retaining the shared government theme.
- `scripts/backup-database.ts`, `scripts/node-runtime.cjs`, `scripts/run-dev.mjs`, `package.json`: recoverable snapshots and working root commands, including a Windows account-name lookup fallback used by the local TypeScript runtime.
- `tests/paper-workflow.test.ts` and existing feature/communication tests: verify revised requirements and retained workflows.

## Verification

The completed integration/validation run passed **43 test groups** across the feature, paper-workflow, messaging and visitor-communications suites. Coverage includes:

- Contact normalization, uniqueness, age/address checks, signup verification and password-only login.
- Seven-name concurrent list enforcement, archive retention and configurable limits.
- Restricted roster visibility, assigned-day selection, duplicate selection and rescheduling ownership.
- Notifications for visitors without selected dates, independent channels, failure states and bounded retry behavior.
- Permanent QR ownership, fingerprint proof ordering, invalid/expired proofs, current schedule enforcement, duplicate check-in/out and individual companion attendance.
- Assigned Officer APIs, contact onboarding, session invalidation, archive/restore, shared histories and saved PDL signatures.
- Incident correction history and verified mobile/email password recovery.
- Existing PDL records, account compatibility, security notice, facility capacity and archive workflows.

`npm.cmd run lint` passed. `npm.cmd run build` passed; Vite retains its existing advisory about a JavaScript bundle over 500 KB. Whitespace validation is recorded in the final working-tree check.

An isolated fictional-data browser preview started successfully. **Visual browser verification was not completed**: Computer Use stopped because it could not reliably identify the current Edge URL to enforce its policy. No visual or physical-device success is claimed.

## Configuration still required

The current local environment does not have live SMTP/SMS delivery, `KYC_ENCRYPTION_KEY`, `HARDWARE_DEVICE_TOKEN`, or a persistent `SESSION_SECRET` configured. Actual configuration values were not fabricated or printed.

| Purpose | Variables |
| --- | --- |
| MySQL | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` |
| Persistent sessions | `SESSION_SECRET`, `SESSION_TTL_HOURS`, `APP_ORIGIN` |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| SMS | `SMS_PROVIDER=twilio`, `SMS_ACCOUNT_ID`, `SMS_AUTH_TOKEN`, `SMS_FROM`; optional `SMS_API_URL` |
| ID encryption | Persistent private `KYC_ENCRYPTION_KEY`, 32 random bytes encoded as 64 hex characters or base64; back it up securely before saving real IDs |
| ESP32 authentication | Same private `HARDWARE_DEVICE_TOKEN` in backend and firmware |

Live recipient delivery, actual ID uploads with the deployment key, fingerprint accuracy and physical XPPen/scanner operation still require commissioning. Tests use local email capture, synthetic identities and test-only hardware/provider emulation.

## Browser checklist

1. Start MySQL, then run `npm.cmd run dev` in the project root. Open `http://localhost:3000/`.
2. Administrator: add a real or deliberately fictional PDL record when ready; the working roster is intentionally empty.
3. Create an Officer under **Staff & duties** and verify first-sign-in contact onboarding. Confirm only assigned workspaces are accessible.
4. Register an eligible visitor using email, mobile or both. Configure delivery before expecting real codes. Confirm the permanent QR is available while enrollment is pending.
5. Complete authorized identity review and actual supervised fingerprint enrollment. No production success is simulated.
6. Under **Approved lists & days**, assign the PDL's weekly day and add the activated visitor. Check delivery statuses.
7. Visitor: verify only linked PDLs appear and select an eligible date. Check that no appointment approval is requested. Test an own-date change and cancellation before entry.
8. Change the assigned day as Administrator. Check that all linked visitors receive updated schedule details, including those without selected dates, and that obsolete unused selections are cancelled.
9. During the chosen date and visiting hours, complete fingerprint then permanent QR verification and record admission. Confirm duplicate entry and exit are blocked, companions have separate review/attendance, and another gate Officer can see the visit history.
10. Exercise verified profile changes, email/mobile recovery, incident follow-up/history, staff suspension and archive/restore. Reopening an archived account must require a new sign-in.

The manuscript's remaining figure/page/questionnaire corrections are document-editing work and were not applied to the user's source paper in this coding task.
