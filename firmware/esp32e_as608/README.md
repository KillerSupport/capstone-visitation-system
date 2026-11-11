# ESP32E + AS608 firmware

This Arduino sketch connects the existing BJMP website to an AS608-compatible
fingerprint sensor through the backend's authenticated `/hardware` WebSocket.
It implements the website's fingerprint enrollment and entrance verification
commands. It does not implement the optional GM65 QR reader.

## Arduino setup

Open `esp32e_as608.ino` in Arduino IDE. Install these libraries through Library
Manager:

- Adafruit Fingerprint Sensor Library
- WebSockets by Markus Sattler (Links2004/arduinoWebSockets)
- ArduinoJson 7.x

Copy `config.example.h` to `config.h` in this folder and set the local Wi-Fi
name/password, laptop LAN IP, backend port, and shared device token. The private
`config.h` is excluded from git. Do not put these values in the website's
frontend configuration or share the device token publicly.

In the backend's private `.env`, set `HARDWARE_DEVICE_TOKEN` to the same random
token. Start the project with `npm.cmd run dev`. The ESP32 and laptop must be on
the same reachable network, and the laptop firewall must allow the backend
port (default `4001`). The sketch connects to
`ws://<laptop-LAN-IP>:4001/hardware`; `localhost` on the ESP32 points to the
ESP32 itself.

For the sample pin defaults, connect sensor TX to ESP32 GPIO 16 (RX2), sensor
RX to GPIO 17 (TX2), and connect grounds together. Confirm the sensor's power
requirements, UART voltage, pin labels, baud rate, and storage range for the
actual module before wiring it. Update the settings in `config.h` if they
differ. Do not connect a sensor signal to an ESP32 pin if its voltage exceeds
the board's input rating.

## Website flow

- The device authenticates using `device: "esp32e"` and the shared token.
- Staff start enrollment or verification from the website; the backend sends
  `FINGERPRINT_ENROLL` or `FINGERPRINT_VERIFY` with a request ID and visitor
  identifiers.
- Enrollment uses two scans, checks for an existing match, finds a free sensor
  slot, and returns the slot number as the string `templateId`.
- Verification returns the matched sensor slot, subject ID, appointment ID,
  and original request ID. The backend compares them with the enrolled visitor
  and visit before it issues its short-lived verification proof.
- Fingerprint images and templates stay inside the sensor. The firmware sends
  only operation results and template IDs. Fingerprint success by itself does
  not admit a visitor; the website still requires its QR and eligibility steps.

The existing website expects an operator to select the visitor and visit
before fingerprint verification. Enrollment and verification timeouts are
kept below the backend's corresponding request windows.

## Limits to confirm before real use

- `FINGERPRINT_MAX_TEMPLATE_ID` defaults to 127, a common AS608 range. Confirm
  the exact module's capacity and address range before enrolling real records.
  The sketch checks slots individually and fails closed on unexpected sensor
  errors instead of guessing from the stored-template count.
- This sketch uses plain `ws://` for the project's local development setup.
  Public or facility-network deployments must use a trusted TLS WebSocket
  endpoint and a restricted network before connecting the device.
- No physical device, board compile, upload, sensor enrollment, or live backend
  connection has been exercised yet. The precise ESP32 board, AS608 pinout,
  voltage, and library versions still need confirmation against the hardware.
- No QR reader support is included. The complete gate sequence still needs the
  website's QR scan input after fingerprint verification.

## Project references

- `backend/index.ts`: authenticated device bridge and command validation.
- `backend/gate.ts`: fingerprint proof and gate admission checks.
- `frontend/src/services/hardware.ts`: website-side WebSocket client.
- `docs/esp32-hardware-websocket-contract.md`: message contract.
