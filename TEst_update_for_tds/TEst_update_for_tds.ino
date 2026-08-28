#include <WiFi.h>
#include <WebServer.h>
#include <OneWire.h>            // NEW: Required for the Temperature Sensor
#include <DallasTemperature.h>  // NEW: Required for the Temperature Sensor

const char* ssid = "Mustar_2.4g";
const char* password = "78DF9827";

WebServer server(80);

// --- Turbidity Sensor Setup ---
int latestTurbidity = 0;
// DFRobot SEN0554 "Read Dirty Data" Command
byte requestCmd[] = {0x18, 0x05, 0x00, 0x01, 0x0D};

// --- Temperature Sensor Setup ---
// NEW: Data wire (Yellow) is connected to GPIO 4
#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);

void handleData() {
  // NEW: Ask the DS18B20 for the current temperature
  tempSensor.requestTemperatures(); 
  float currentTemp = tempSensor.getTempCByIndex(0);

  // Format the JSON to match your app.js expected IDs
  String json = "{";
  json += "\"turbidity\":" + String(latestTurbidity) + ","; // NEW: Added a comma here!
  json += "\"temp\":" + String(currentTemp);               // NEW: Added the temp data!
  json += "}";

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);
  
  // Start Hardware Serial 2 for the Turbidity Sensor
  // RX = Pin 32 (Blue wire), TX = Pin 33 (Green wire)
  Serial2.begin(9600, SERIAL_8N1, 32, 33);

  // NEW: Start up the Temperature Sensor library
  tempSensor.begin();

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  
  Serial.println("\nConnected!");
  Serial.print("ESP32 IP Address: ");
  Serial.println(WiFi.localIP()); 

  server.on("/data", HTTP_GET, handleData);
  server.begin();
}

void loop() {
  // Listen for dashboard requests
  server.handleClient();

  // Every 2 seconds, ask the turbidity sensor for new data
  static unsigned long lastRequest = 0;
  if (millis() - lastRequest > 2000) {
    Serial2.write(requestCmd, 5);
    lastRequest = millis();
  }

  // If the sensor replies, read the 5-byte data frame
  if (Serial2.available() >= 5) {
    byte buffer[5];
    Serial2.readBytes(buffer, 5);
    
    // Verify frame header (0x18), length (0x05), and trailer (0x0D)
    if (buffer[0] == 0x18 && buffer[1] == 0x05 && buffer[4] == 0x0D) {
      // buffer[3] contains the actual turbidity value (0-255)
      latestTurbidity = buffer[3];
      
      // NEW: Grab a quick temp reading just for the Serial Monitor
      tempSensor.requestTemperatures(); 
      float printTemp = tempSensor.getTempCByIndex(0);

      // Print to Serial Monitor so you can see BOTH working locally
      Serial.print("Live Turbidity: ");
      Serial.print(latestTurbidity);
      Serial.print("  |  Live Temp: ");
      Serial.print(printTemp);
      Serial.println(" °C");
    }
  }
}