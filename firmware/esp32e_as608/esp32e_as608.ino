#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Adafruit_Fingerprint.h>
#include <Adafruit_ILI9341.h>
#include <SPI.h>

#include "config.h"

struct WiFiNetwork {
  const char *ssid;
  const char *password;
  const char *backendHost;
};

const WiFiNetwork wifiNetworks[] = {
  {WIFI_SSID, WIFI_PASSWORD, BACKEND_HOST},
#ifdef WIFI_FALLBACKS
  WIFI_FALLBACKS
#endif
};
constexpr size_t WIFI_NETWORK_COUNT = sizeof(wifiNetworks) / sizeof(wifiNetworks[0]);
size_t wifiNetworkIndex = 0;
bool wifiWasConnected = false;

#ifndef BACKEND_PATH
#define BACKEND_PATH "/hardware"
#endif
#ifndef FINGERPRINT_MAX_TEMPLATE_ID
#define FINGERPRINT_MAX_TEMPLATE_ID 127
#endif

// GPIO numbers are from the ESP32 side of each serial connection.
constexpr int TFT_CS = 5;
constexpr int TFT_DC = 2;
constexpr int TFT_RST = 4;
constexpr int TFT_SCK = 18;
constexpr int TFT_MISO = 19;
constexpr int TFT_MOSI = 23;
constexpr int GM65_RX = 16;
constexpr int GM65_TX = 17;
// Fingerprint scanning is disabled. Keep the AS608 code for future use.
constexpr bool FINGERPRINT_ENABLED = false;
constexpr int AS608_RX = 26;
constexpr int AS608_TX = 27;

Adafruit_ILI9341 display(TFT_CS, TFT_DC, TFT_RST);
HardwareSerial FingerSerial(1);
HardwareSerial qrSerial(2);
Adafruit_Fingerprint finger(&FingerSerial);
WebSocketsClient webSocket;

struct HardwareCommand {
  String action;
  String requestId;
  String subjectType;
  String subjectId;
  String appointmentId;
};

HardwareCommand queuedCommand;
bool hasQueuedCommand = false;
bool operationBusy = false;
bool socketStarted = false;
bool deviceAuthenticated = false;
bool sensorReady = false;
bool statusPending = true;

unsigned long lastWiFiAttempt = 0;
unsigned long lastSensorCheck = 0;

const unsigned long WIFI_RETRY_MS = 10000;
const unsigned long SENSOR_CHECK_MS = 10000;
const unsigned long VERIFY_WAIT_MS = 45000;
const unsigned long ENROLL_WAIT_MS = 30000;
const unsigned long REMOVE_FINGER_WAIT_MS = 10000;
const unsigned long QR_WAIT_MS = 20000;
constexpr size_t MAX_QR_LENGTH = 512;

void showMessage(const char *title, const char *message) {
  display.fillScreen(ILI9341_BLACK);
  display.setTextSize(2);
  display.setTextColor(ILI9341_CYAN);
  display.setCursor(15, 20);
  display.println(title);
  display.drawFastHLine(10, 55, display.width() - 20, ILI9341_WHITE);
  display.setTextColor(ILI9341_WHITE);
  display.setCursor(15, 80);
  display.println(message);
}

void showIdleStatus() {
  if (FINGERPRINT_ENABLED && !sensorReady) {
    showMessage("Scanner offline", "Check AS608 wiring.");
  } else if (!deviceAuthenticated) {
    showMessage("Connecting", "Waiting for the website.");
  } else {
    showMessage("System ready", "Start a scan on the website.");
  }
}

bool sendDocument(JsonDocument &document) {
  if (!webSocket.isConnected()) return false;

  String message;
  serializeJson(document, message);
  return webSocket.sendTXT(message);
}

bool sendAuthentication() {
  JsonDocument document;
  document["type"] = "AUTHENTICATE";
  document["device"] = "esp32e";
  document["token"] = HARDWARE_DEVICE_TOKEN;
  return sendDocument(document);
}

void sendDeviceStatus() {
  JsonDocument document;
  document["type"] = "DEVICE_STATUS";
  document["payload"]["connected"] = true;
  document["payload"]["firmware"] = "esp32e-as608-1.0.0";
  if (sendDocument(document)) statusPending = false;
}

void sendCommandAck(const String &requestId, const String &action, bool accepted) {
  JsonDocument document;
  document["type"] = "COMMAND_ACK";
  document["requestId"] = requestId;
  document["payload"]["action"] = action;
  document["payload"]["accepted"] = accepted;
  sendDocument(document);
}

void sendDeviceError(const String &requestId, const char *message) {
  JsonDocument document;
  document["type"] = "DEVICE_ERROR";
  if (requestId.length()) document["requestId"] = requestId;
  document["payload"]["message"] = message;
  sendDocument(document);
}

bool sendEnrollmentResult(const HardwareCommand &command, bool success,
                          uint16_t templateId) {
  JsonDocument document;
  document["type"] = "FINGERPRINT_ENROLL_RESULT";
  document["requestId"] = command.requestId;
  document["payload"]["success"] = success;
  document["payload"]["subjectType"] = command.subjectType;
  document["payload"]["subjectId"] = command.subjectId;
  if (success) document["payload"]["templateId"] = String(templateId);
  return sendDocument(document);
}

void sendVerificationResult(const HardwareCommand &command, bool matched,
                            uint16_t templateId) {
  JsonDocument document;
  document["type"] = "FINGERPRINT_VERIFY_RESULT";
  document["requestId"] = command.requestId;
  document["payload"]["success"] = matched;
  document["payload"]["matched"] = matched;
  document["payload"]["subjectType"] = command.subjectType;
  document["payload"]["subjectId"] = command.subjectId;
  document["payload"]["appointmentId"] = command.appointmentId;
  if (matched) document["payload"]["templateId"] = String(templateId);
  sendDocument(document);
}

void failCommand(const HardwareCommand &command, const char *message) {
  showMessage("Scan stopped", "See the website for details.");
  if (command.action == "FINGERPRINT_ENROLL") {
    sendEnrollmentResult(command, false, 0);
  } else if (command.action == "FINGERPRINT_VERIFY") {
    sendVerificationResult(command, false, 0);
  }
  sendDeviceError(command.requestId, message);
  Serial.printf("Operation failed: %s\n", message);
}

bool authenticatedConnectionIsOpen() {
  return deviceAuthenticated && webSocket.isConnected() &&
         WiFi.status() == WL_CONNECTED;
}

void handleIncomingText(uint8_t *payload, size_t length) {
  JsonDocument document;
  if (deserializeJson(document, payload, length)) {
    Serial.println("Ignoring invalid WebSocket JSON.");
    return;
  }

  const char *type = document["type"] | "";
  if (strcmp(type, "AUTHENTICATED") == 0) {
    const char *device = document["payload"]["device"] | "";
    if (strcmp(device, "esp32e") == 0) {
      deviceAuthenticated = true;
      statusPending = true;
      Serial.println("Authenticated with the BJMP hardware bridge.");
      sendDeviceStatus();
      if (!operationBusy) showIdleStatus();
    }
    return;
  }

  if (strcmp(type, "COMMAND") != 0 || !deviceAuthenticated) return;

  const char *action = document["payload"]["action"] | "";
  const char *requestId = document["requestId"] | "";
  if (!requestId[0]) return;

  if (!FINGERPRINT_ENABLED && strcmp(action, "QR_SCAN_START") != 0) {
    sendCommandAck(requestId, action, false);
    sendDeviceError(requestId, "Fingerprint scanning is disabled.");
    return;
  }

  if (operationBusy || hasQueuedCommand) {
    sendCommandAck(requestId, action, false);
    sendDeviceError(requestId, "The scanner is handling another request.");
    return;
  }

  if (strcmp(action, "FINGERPRINT_ENROLL") != 0 &&
      strcmp(action, "FINGERPRINT_VERIFY") != 0 &&
      strcmp(action, "QR_SCAN_START") != 0) {
    sendCommandAck(requestId, action, false);
    sendDeviceError(requestId, "Unsupported scanner command.");
    return;
  }

  queuedCommand.action = action;
  queuedCommand.requestId = requestId;
  queuedCommand.subjectType = document["payload"]["subjectType"] | "VISITOR";
  queuedCommand.subjectId = document["payload"]["subjectId"] | "";
  queuedCommand.appointmentId = document["payload"]["appointmentId"] | "";

  if ((queuedCommand.action != "QR_SCAN_START" && !queuedCommand.subjectId.length()) ||
      (queuedCommand.action == "FINGERPRINT_VERIFY" &&
       !queuedCommand.appointmentId.length())) {
    sendCommandAck(requestId, action, false);
    sendDeviceError(requestId, "The fingerprint request is missing its visitor or appointment ID.");
    return;
  }

  if (!sensorReady && queuedCommand.action != "QR_SCAN_START") {
    sendCommandAck(requestId, action, false);
    failCommand(queuedCommand, "Fingerprint sensor is not available.");
    return;
  }

  hasQueuedCommand = true;
  sendCommandAck(requestId, action, true);
  Serial.printf("Accepted %s request %s.\n", action, requestId);
}

void webSocketEvent(WStype_t event, uint8_t *payload, size_t length) {
  switch (event) {
    case WStype_CONNECTED:
      deviceAuthenticated = false;
      Serial.println("Connected to /hardware; authenticating device.");
      sendAuthentication();
      break;

    case WStype_DISCONNECTED:
      deviceAuthenticated = false;
      if (hasQueuedCommand) hasQueuedCommand = false;
      if (!operationBusy) showIdleStatus();
      Serial.println("Hardware bridge disconnected; reconnecting automatically.");
      break;

    case WStype_TEXT:
      handleIncomingText(payload, length);
      break;

    case WStype_ERROR:
      Serial.println("WebSocket connection error.");
      break;

    default:
      break;
  }
}

bool waitForFingerImage(const char *prompt, unsigned long timeoutMs) {
  showMessage("Fingerprint", prompt);
  Serial.println(prompt);
  const unsigned long started = millis();

  while (millis() - started < timeoutMs) {
    webSocket.loop();
    if (!authenticatedConnectionIsOpen()) return false;

    const uint8_t result = finger.getImage();
    if (result == FINGERPRINT_OK) return true;
    if (result != FINGERPRINT_NOFINGER &&
        result != FINGERPRINT_PACKETRECIEVEERR) {
      Serial.printf("Sensor image status: 0x%02X\n", result);
    }
    delay(50);
  }

  return false;
}

bool waitUntilFingerRemoved(unsigned long timeoutMs) {
  showMessage("Fingerprint", "Lift your finger.");
  const unsigned long started = millis();
  while (millis() - started < timeoutMs) {
    webSocket.loop();
    if (!authenticatedConnectionIsOpen()) return false;

    const uint8_t result = finger.getImage();
    if (result == FINGERPRINT_NOFINGER) return true;
    delay(50);
  }
  return false;
}

uint16_t findUnusedTemplateSlot() {
  if (finger.getTemplateCount() != FINGERPRINT_OK) return 0;

  const uint16_t maxId = min((uint16_t)FINGERPRINT_MAX_TEMPLATE_ID,
                             finger.capacity);
  if (maxId == 0 || finger.templateCount >= maxId) return 0;

  // Check every candidate slot. Deleted templates can leave gaps in the sensor.
  for (uint16_t id = 1; id <= maxId; ++id) {
    const uint8_t result = finger.loadModel(id);
    if (result == FINGERPRINT_OK) continue;
    if (result == FINGERPRINT_DBRANGEFAIL ||
        result == FINGERPRINT_BADLOCATION) {
      return id;
    }

    Serial.printf("Could not safely inspect template slot %u (0x%02X).\n",
                  id, result);
    return 0;
  }

  return 0;
}

void runEnrollment(const HardwareCommand &command) {
  if (!authenticatedConnectionIsOpen()) {
    failCommand(command, "Hardware bridge disconnected before enrollment started.");
    return;
  }

  const uint16_t slot = findUnusedTemplateSlot();
  if (!slot) {
    failCommand(command, "No unused fingerprint template slot is available, or the sensor database could not be checked safely.");
    return;
  }

  if (!waitForFingerImage("Place the visitor's finger on the sensor.", ENROLL_WAIT_MS)) {
    failCommand(command, "Enrollment timed out or the hardware bridge disconnected.");
    return;
  }
  if (finger.image2Tz(1) != FINGERPRINT_OK) {
    failCommand(command, "The first fingerprint image could not be read. Try again.");
    return;
  }

  const uint8_t searchResult = finger.fingerFastSearch();
  if (searchResult == FINGERPRINT_OK) {
    failCommand(command, "This fingerprint is already enrolled in the sensor.");
    return;
  }
  if (searchResult != FINGERPRINT_NOTFOUND) {
    failCommand(command, "The sensor could not check for an existing fingerprint.");
    return;
  }

  if (!waitUntilFingerRemoved(REMOVE_FINGER_WAIT_MS)) {
    failCommand(command, "Lift the finger from the sensor, then start enrollment again.");
    return;
  }
  if (!waitForFingerImage("Place the same finger on the sensor again.", ENROLL_WAIT_MS)) {
    failCommand(command, "The second fingerprint scan timed out or the hardware bridge disconnected.");
    return;
  }
  if (finger.image2Tz(2) != FINGERPRINT_OK) {
    failCommand(command, "The second fingerprint image could not be read. Try again.");
    return;
  }
  if (finger.createModel() != FINGERPRINT_OK) {
    failCommand(command, "The two scans did not match. Start enrollment again.");
    return;
  }
  if (finger.storeModel(slot) != FINGERPRINT_OK) {
    failCommand(command, "The sensor could not save the fingerprint template.");
    return;
  }

  if (!authenticatedConnectionIsOpen() ||
      !sendEnrollmentResult(command, true, slot)) {
    // If the result cannot reach the server, remove the just-created orphan.
    finger.deleteModel(slot);
    Serial.println("Enrollment result was not delivered; removed the new template.");
    return;
  }

  showMessage("Fingerprint saved", "Continue on the website.");
  Serial.printf("Enrollment result sent for visitor %s (template %u).\n",
                command.subjectId.c_str(), slot);
}

void runVerification(const HardwareCommand &command) {
  if (!authenticatedConnectionIsOpen()) {
    failCommand(command, "Hardware bridge disconnected before verification started.");
    return;
  }

  if (!waitForFingerImage("Place the visitor's finger on the sensor.", VERIFY_WAIT_MS)) {
    failCommand(command, "Fingerprint scan timed out or the hardware bridge disconnected.");
    return;
  }
  if (finger.image2Tz(1) != FINGERPRINT_OK) {
    failCommand(command, "The fingerprint image could not be read. Try again.");
    return;
  }

  const uint8_t result = finger.fingerFastSearch();
  if (result == FINGERPRINT_NOTFOUND) {
    failCommand(command, "No enrolled fingerprint matched this scan.");
    return;
  }
  if (result != FINGERPRINT_OK) {
    failCommand(command, "The sensor could not search its fingerprint database.");
    return;
  }

  sendVerificationResult(command, true, finger.fingerID);
  showMessage("Fingerprint read", "Continue on the website.");
  Serial.printf("Verification result sent for request %s (template %u).\n",
                command.requestId.c_str(), finger.fingerID);
}

void runQrScan(const HardwareCommand &command) {
  // Drop serial data captured before the operator requested a scan.
  qrSerial.flush(false);
  showMessage("Scan QR", "Present the visitor ID QR.");

  String code;
  code.reserve(MAX_QR_LENGTH);
  bool discardLine = false;
  bool receivedData = false;
  size_t bytesReceived = 0;
  unsigned long lastByteAt = 0;
  const unsigned long started = millis();
  while (millis() - started < QR_WAIT_MS) {
    webSocket.loop();
    if (!authenticatedConnectionIsOpen()) {
      failCommand(command, "The hardware bridge disconnected during the QR scan.");
      return;
    }

    const int next = qrSerial.read();
    if (next < 0 && (!receivedData || millis() - lastByteAt < 120)) {
      delay(2);
      continue;
    }
    // Some GM65 configurations send a burst with no CR/LF suffix.
    if (next < 0 || next == '\r' || next == '\n') {
      if (!receivedData) continue;
      code.trim();
      const bool isVisitorToken = !discardLine && code.length() == 64 &&
        strspn(code.c_str(), "0123456789abcdef") == 64;
      Serial.printf("GM65 received %u bytes (%s).\n",
                    static_cast<unsigned>(bytesReceived),
                    isVisitorToken ? "visitor QR format" : "invalid format");
      if (isVisitorToken) {
        JsonDocument document;
        document["type"] = "QR_SCANNED";
        document["requestId"] = command.requestId;
        document["payload"]["code"] = code;
        if (sendDocument(document)) {
          showMessage("QR read", "Check the website for verification.");
        } else {
          failCommand(command, "Could not send the QR scan to the website.");
        }
        return;
      }
      failCommand(command, "Invalid code. Scan a visitor QR issued by this system.");
      return;
    } else {
      ++bytesReceived;
      receivedData = true;
      lastByteAt = millis();
      if (discardLine) continue;
      if (next < 32 || next > 126 || code.length() >= MAX_QR_LENGTH) {
        discardLine = true;
      } else {
        code += static_cast<char>(next);
      }
    }
  }
  if (!receivedData) {
    failCommand(command, "No data received from the QR scanner. Check GM65 UART mode and TX connection.");
  } else {
    failCommand(command, "The QR scanner sent incomplete data. Try scanning again.");
  }
}

void checkSensorStatus() {
  const unsigned long now = millis();
  if (operationBusy || now - lastSensorCheck < SENSOR_CHECK_MS) return;
  lastSensorCheck = now;

  bool available = finger.verifyPassword();
  if (available) available = (finger.getParameters() == FINGERPRINT_OK);

  if (available != sensorReady) {
    sensorReady = available;
    statusPending = true;
    showIdleStatus();
    Serial.println(sensorReady ? "Fingerprint sensor is ready." :
                                 "Fingerprint sensor is unavailable.");
  }
}

void connectToSelectedWiFi() {
  const WiFiNetwork &network = wifiNetworks[wifiNetworkIndex];
  Serial.printf("Connecting to Wi-Fi: %s\n", network.ssid);
  WiFi.begin(network.ssid, network.password);
  lastWiFiAttempt = millis();
}

void setup() {
  Serial.begin(115200);
  delay(200);

  SPI.begin(TFT_SCK, TFT_MISO, TFT_MOSI, TFT_CS);
  display.begin();
  display.setRotation(1);
  showMessage("BJMP visitation", "Starting...");

  qrSerial.setRxBufferSize(1024);
  qrSerial.begin(9600, SERIAL_8N1, GM65_RX, GM65_TX);
  if (FINGERPRINT_ENABLED) {
    Serial.printf("AS608 UART: ESP32 RX GPIO %d, TX GPIO %d.\n", AS608_RX, AS608_TX);
    FingerSerial.begin(FINGERPRINT_BAUD, SERIAL_8N1,
                       AS608_RX, AS608_TX);
    finger.begin(FINGERPRINT_BAUD);

    sensorReady = finger.verifyPassword();
    if (sensorReady) sensorReady = (finger.getParameters() == FINGERPRINT_OK);
    Serial.println(sensorReady ? "AS608 fingerprint sensor connected." :
                                 "AS608 fingerprint sensor not detected.");
  } else {
    Serial.println("Fingerprint scanning disabled. QR scanner enabled.");
  }
  showIdleStatus();

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false);
  connectToSelectedWiFi();

  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);
  webSocket.enableHeartbeat(15000, 3000, 2);
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiWasConnected) {
      wifiWasConnected = true;
      const char *backendHost = wifiNetworks[wifiNetworkIndex].backendHost;
      Serial.printf("Wi-Fi connected. ESP32 IP: %s\n",
                    WiFi.localIP().toString().c_str());
      if (!backendHost[0]) {
        Serial.println("No backend IP configured for this Wi-Fi network.");
        showMessage("Wi-Fi connected", "Set the backend IP.");
        return;
      }
      Serial.print("Connecting to hardware bridge at ");
      Serial.print(backendHost);
      Serial.print(":");
      Serial.println(BACKEND_PORT);
      WiFiClient probe;
      const bool tcpReachable = probe.connect(backendHost, BACKEND_PORT, 3000);
      Serial.println(tcpReachable
        ? "Backend TCP connection OK; trying WebSocket."
        : "Backend TCP connection failed; check hotspot and laptop firewall.");
      probe.stop();
      webSocket.begin(backendHost, BACKEND_PORT, BACKEND_PATH);
      socketStarted = true;
    }
    if (socketStarted) webSocket.loop();
  } else if (wifiWasConnected || millis() - lastWiFiAttempt >= WIFI_RETRY_MS) {
    if (socketStarted) webSocket.disconnect();
    socketStarted = false;
    deviceAuthenticated = false;
    hasQueuedCommand = false;
    wifiWasConnected = false;
    showIdleStatus();
    WiFi.disconnect();
    wifiNetworkIndex = (wifiNetworkIndex + 1) % WIFI_NETWORK_COUNT;
    connectToSelectedWiFi();
  }

  if (FINGERPRINT_ENABLED) checkSensorStatus();
  if (deviceAuthenticated && statusPending) sendDeviceStatus();

  if (hasQueuedCommand) {
    HardwareCommand command = queuedCommand;
    hasQueuedCommand = false;
    operationBusy = true;
    if (command.action == "FINGERPRINT_ENROLL") {
      runEnrollment(command);
    } else if (command.action == "FINGERPRINT_VERIFY") {
      runVerification(command);
    } else if (command.action == "QR_SCAN_START") {
      runQrScan(command);
    }
    operationBusy = false;
  }

  delay(10);
}
