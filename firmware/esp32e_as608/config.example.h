#pragma once

// Copy this file to config.h and fill in local values. config.h is ignored by git.
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Use the laptop/server LAN IPv4 address, not localhost or 127.0.0.1.
#define BACKEND_HOST "192.168.1.100"
#define BACKEND_PORT 4001
#define BACKEND_PATH "/hardware"

// Optional Wi-Fi fallback list. Add entries in the order to try them.
// Each entry holds the SSID, password, and laptop IP on that network.
// #define WIFI_FALLBACKS \
//   {"OTHER_WIFI", "OTHER_PASSWORD", "192.168.2.100"},

// Must match HARDWARE_DEVICE_TOKEN in the backend's private .env file.
#define HARDWARE_DEVICE_TOKEN "REPLACE_WITH_A_LONG_RANDOM_TOKEN"

#define FINGERPRINT_BAUD 57600

// Common AS608-compatible modules expose template IDs 1 through 127.
// Confirm the range supported by the exact sensor module before enrollment.
#define FINGERPRINT_MAX_TEMPLATE_ID 127
