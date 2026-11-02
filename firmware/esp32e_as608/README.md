# ESP32E + AS608 firmware workspace

This folder belongs to the existing BJMP capstone. Inspection and setup notes
were prepared on October 30, 2026. No firmware code has been written yet.
This is a reserved sketch folder, not a compilable Arduino sketch yet.

## Shared editing with Arduino IDE

The planned primary sketch is `esp32e_as608.ino`, in this same folder. Arduino
requires the primary `.ino` filename to match its containing folder name.
Codex can create and edit that file here; Arduino IDE can open that exact file
through File > Open for verification and USB upload. No copying code into a
second project or into the Documents/Arduino folder is required. Reopen the
sketch after external edits if the IDE has not refreshed; avoid saving stale
IDE edits over newer Codex changes.

Planned supporting files, to be created during firmware implementation:

- `config.example.h`: documented configuration placeholders.
- `config.h`: private local Wi-Fi and device credentials. Add an ignore rule
  before creating this file with secrets; the current project ignore rules do
  not exclude it.

## Existing project inspected

- `frontend/`: React/Vite application and staff scanner screens.
- `backend/index.ts`: Express API and two WebSocket paths; `/ws` serves the
  application, while `/hardware` serves the hardware bridge.
- `backend/database/db.ts`: MySQL persistence, including biometric references.
- `backend/gate.ts`: fingerprint proof, QR verification and admission checks.
- `frontend/src/services/hardware.ts`: browser hardware bridge client.
- `docs/esp32-hardware-websocket-contract.md`: existing device protocol notes.
- Root `package.json` and `scripts/run-dev.mjs`: shared dependencies and
  `npm.cmd run dev` for the existing frontend and backend.

The documented defaults are frontend port 3000 and backend port 4001. No
application, backend, environment, dependency or database changes were made
for this workspace setup. Existing uncommitted project work was preserved.

## Current backend requirements for later firmware

- Connect to `ws://<laptop-LAN-address>:4001/hardware` for local development.
  Use the configured backend port if different. `localhost` on an ESP32 means
  the ESP32 itself, not the laptop. HTTPS deployments need a configured secure
  WebSocket endpoint and certificate validation.
- Authenticate within five seconds using message type `AUTHENTICATE`, device
  identifier `esp32e`, and the shared `HARDWARE_DEVICE_TOKEN`. Wait for
  `AUTHENTICATED` before processing commands.
- Handle `FINGERPRINT_ENROLL` and `FINGERPRINT_VERIFY`, retaining each original
  `requestId`, `subjectId` and, for verification, `appointmentId`.
- Enrollment commands currently do not supply a sensor slot. Firmware must
  allocate an unused template slot without overwriting enrolled fingerprints
  and return its index as the string `templateId`. Do not use a website user ID
  as a sensor slot. Verification must return the actual matched sensor index;
  the backend compares it with the expected visitor's stored reference.
- Current staff screens enroll `VISITOR` subjects. Older documentation shows
  PDL enrollment examples that do not describe this visitor activation flow.
- Current server request windows are 120 seconds for enrollment and 60 seconds
  for fingerprint verification. A successful verification creates a separate
  server proof valid for 60 seconds for the QR/admission steps.
- Fingerprint matching alone does not admit a visitor. Existing entrance order
  is fingerprint, permanent visitor QR, then backend eligibility and check-in.
  Older appointment-QR wording in the contract is superseded by its October 27
  update and the current `backend/gate.ts` implementation.
- Keep fingerprint images and templates on the sensor; send template indices
  and operation results only. Plan reconnect backoff and responsive timeouts.
- The existing protocol also includes `QR_SCAN_START` for a GM65 reader. This
  initial firmware scope is ESP32E + AS608. If no QR peripheral is fitted, report
  it unavailable; completing the full gate workflow still requires QR input.
- The backend currently forwards only selected status/acknowledgment/error
  fields. Detailed peripheral status and error codes in the older contract
  are not all delivered to browsers. Match current behavior without assuming
  those fields are displayed. Backend improvements are deferred.

## Configuration still needed

1. Exact ESP32 development board/module marking, Arduino board selection,
   USB serial interface and COM port. "ESP32E" alone does not establish these.
2. AS608 supplier pinout, supply and UART signal voltage, sensor baud rate,
   password/address if changed, storage capacity and selected ESP32 RX/TX
   pins. Confirm these for the actual module before assigning wiring; connect
   common ground and cross sensor TX to ESP32 RX and sensor RX to ESP32 TX.
3. Wi-Fi network name/password, laptop LAN address, reachable backend port and
   local firewall access. Keep credentials out of public files and chat.
4. A private shared `HARDWARE_DEVICE_TOKEN` in the backend environment and
   eventual local firmware configuration. The inspected root `.env` has no
   such entry; `.env.example` already documents it. No value was generated or
   changed. A separately supplied process environment was not inspected.
5. ESP32 Arduino core and compatible fingerprint, WebSocket and JSON
   libraries. Adafruit Fingerprint Sensor Library is a candidate pending
   confirmation of the actual AS608 protocol. Select and record tested
   versions when implementing, rather than assuming compatibility.

## Local tools observed

- Arduino IDE executable exists at
  `C:\Program Files\Arduino IDE\Arduino IDE.exe`.
- `arduino-cli` was not found on the command path. CLI setup is optional for
  IDE use; it would enable later command-line compile/upload checks.
- ESP32 core was not found under the usual
  `C:\Users\a\AppData\Local\Arduino15\packages\esp32` location. Custom
  Arduino data locations and IDE preferences were not inspected.
- No physical device detection, firmware compilation, upload, live backend
  connection or sensor operation was tested during this inspection.

## Reference documentation

- [Arduino sketch layout](https://docs.arduino.cc/arduino-cli/sketch-specification/)
- [Espressif Arduino-ESP32 installation](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html)
- [Adafruit fingerprint library](https://github.com/adafruit/Adafruit-Fingerprint-Sensor-Library)
