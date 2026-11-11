#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Adafruit_Fingerprint.h>

#include "config.h"

#ifndef BACKEND_PATH
#define BACKEND_PATH "/hardware"
#endif
#ifndef FINGERPRINT_MAX_TEMPLATE_ID
#define FINGERPRINT_MAX_TEMPLATE_ID 127
#endif

HardwareSerial FingerSerial(2);
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
  document["payload"]["connected"] = sensorReady;
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
    }
    return;
  }

  if (strcmp(type, "COMMAND") != 0 || !deviceAuthenticated) return;

  const char *action = document["payload"]["action"] | "";
  const char *requestId = document["requestId"] | "";
  if (!requestId[0]) return;

  if (operationBusy || hasQueuedCommand) {
    sendCommandAck(requestId, action, false);
    sendDeviceError(requestId, "The fingerprint scanner is handling another request.");
    return;
  }

  if (strcmp(action, "FINGERPRINT_ENROLL") != 0 &&
      strcmp(action, "FINGERPRINT_VERIFY") != 0) {
    sendCommandAck(requestId, action, false);
    sendDeviceError(requestId, "This firmware supports fingerprint commands only; no QR reader is connected.");
    return;
  }

  queuedCommand.action = action;
  queuedCommand.requestId = requestId;
  queuedCommand.subjectType = document["payload"]["subjectType"] | "VISITOR";
  queuedCommand.subjectId = document["payload"]["subjectId"] | "";
  queuedCommand.appointmentId = document["payload"]["appointmentId"] | "";

  if (!queuedCommand.subjectId.length() ||
      (queuedCommand.action == "FINGERPRINT_VERIFY" &&
       !queuedCommand.appointmentId.length())) {
    sendCommandAck(requestId, action, false);
    sendDeviceError(requestId, "The fingerprint request is missing its visitor or appointment ID.");
    return;
  }

  if (!sensorReady) {
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
    sendVerificationResult(command, false, 0);
    sendDeviceError(command.requestId, "No enrolled fingerprint matched this scan.");
    return;
  }
  if (result != FINGERPRINT_OK) {
    failCommand(command, "The sensor could not search its fingerprint database.");
    return;
  }

  sendVerificationResult(command, true, finger.fingerID);
  Serial.printf("Verification result sent for request %s (template %u).\n",
                command.requestId.c_str(), finger.fingerID);
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
    Serial.println(sensorReady ? "Fingerprint sensor is ready." :
                                 "Fingerprint sensor is unavailable.");
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);

  FingerSerial.begin(FINGERPRINT_BAUD, SERIAL_8N1,
                     FINGERPRINT_RX_PIN, FINGERPRINT_TX_PIN);
  finger.begin(FINGERPRINT_BAUD);

  sensorReady = finger.verifyPassword();
  if (sensorReady) sensorReady = (finger.getParameters() == FINGERPRINT_OK);
  Serial.println(sensorReady ? "AS608 fingerprint sensor connected." :
                               "AS608 fingerprint sensor not detected.");

  WiFi.mode(WIFI_STA);
  Serial.printf("Connecting to Wi-Fi: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWiFiAttempt = millis();

  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);
  webSocket.enableHeartbeat(15000, 3000, 2);
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!socketStarted) {
      Serial.printf("Wi-Fi connected. ESP32 IP: %s\n",
                    WiFi.localIP().toString().c_str());
      Serial.print("Connecting to hardware bridge at ");
      Serial.print(BACKEND_HOST);
      Serial.print(":");
      Serial.println(BACKEND_PORT);
      webSocket.begin(BACKEND_HOST, BACKEND_PORT, BACKEND_PATH);
      socketStarted = true;
    }
    webSocket.loop();
  } else if (millis() - lastWiFiAttempt >= WIFI_RETRY_MS) {
    Serial.println("Reconnecting to Wi-Fi.");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    lastWiFiAttempt = millis();
  }

  checkSensorStatus();
  if (deviceAuthenticated && statusPending) sendDeviceStatus();

  if (hasQueuedCommand) {
    HardwareCommand command = queuedCommand;
    hasQueuedCommand = false;
    operationBusy = true;
    if (command.action == "FINGERPRINT_ENROLL") {
      runEnrollment(command);
    } else if (command.action == "FINGERPRINT_VERIFY") {
      runVerification(command);
    }
    operationBusy = false;
  }

  delay(10);
}
