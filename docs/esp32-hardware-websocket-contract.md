# ESP32E hardware WebSocket contract

This is the website-side contract for the ESP32E gateway that connects the GM65 QR reader and AS608 fingerprint module. The XP-Pen G430S is a USB drawing tablet and is handled by the browser signature pad as pointer input; it does not use this socket.

## Connection

- Connect to `ws://<website-host>:4001/hardware` on the local network (use `wss://` when the site is served over HTTPS).
- The ESP32E is the only device client. It must authenticate immediately after connecting:

```json
{"type":"AUTHENTICATE","device":"esp32e","token":"<HARDWARE_DEVICE_TOKEN>"}
```

- Set the same random token in the backend environment as `HARDWARE_DEVICE_TOKEN`. The backend closes unauthenticated connections. Never put this token in frontend configuration.
- Staff browsers connect to the same path with their existing authenticated session cookie. Only authorized staff roles can subscribe or send commands.
- The backend sends `{"type":"AUTHENTICATED","payload":{"device":"esp32e"}}` after successful device authentication. It sends `{"type":"AUTHENTICATED","payload":{"role":"WORKER"}}` (or the user's actual role) to staff browsers.

## Browser-to-device commands

Commands are sent through the backend and include a unique `requestId`.

```json
{"type":"COMMAND","requestId":"uuid","payload":{"action":"QR_SCAN_START"}}
{"type":"COMMAND","requestId":"uuid","payload":{"action":"FINGERPRINT_ENROLL","subjectType":"PDL","subjectId":"pdl-123"}}
{"type":"COMMAND","requestId":"uuid","payload":{"action":"FINGERPRINT_VERIFY","subjectType":"VISITOR","subjectId":"42","appointmentId":"appt-123"}}
```

The ESP32E should acknowledge a command with `COMMAND_ACK` and the same `requestId`:

```json
{"type":"COMMAND_ACK","requestId":"uuid","payload":{"action":"FINGERPRINT_VERIFY","accepted":true}}
```

## Device-to-browser events

Every event includes a `requestId` when it answers a command. Scanner initiated QR reads may use a new request ID.

```json
{"type":"QR_SCANNED","requestId":"uuid","payload":{"code":"BJMP-IMUS-..."}}
{"type":"FINGERPRINT_ENROLL_RESULT","requestId":"uuid","payload":{"success":true,"subjectType":"PDL","subjectId":"pdl-123","templateId":"17","message":"Enrollment complete"}}
{"type":"FINGERPRINT_VERIFY_RESULT","requestId":"uuid","payload":{"success":true,"matched":true,"subjectType":"VISITOR","subjectId":"42","appointmentId":"appt-123","templateId":"17","message":"Match"}}
{"type":"DEVICE_STATUS","payload":{"connected":{"qr":true,"fingerprint":true},"firmware":"1.0.0"}}
{"type":"DEVICE_ERROR","requestId":"uuid","payload":{"code":"SENSOR_UNAVAILABLE","message":"Fingerprint sensor did not respond"}}
```

`templateId` is a scanner-side index, not fingerprint data. The AS608 should keep templates in its protected sensor storage; do not send fingerprint images or templates over the network. A successful event is only a sensor result. The server must still verify that the matched template belongs to the expected visitor and that the visit is eligible before recording admission.

## Operational notes

- The ESP32E should reconnect with backoff and send `DEVICE_STATUS` after connecting and whenever a peripheral changes state.
- The QR reader should send the exact decoded pass text, without extra newline characters.
- The website implements this socket contract, including admin visitor fingerprint enrollment and worker verification at admission. Set `HARDWARE_DEVICE_TOKEN` on the backend and implement these same message shapes in ESP32E firmware before the physical peripherals can communicate. Firmware is not part of this website repository, so device behavior still requires on-hardware commissioning.
