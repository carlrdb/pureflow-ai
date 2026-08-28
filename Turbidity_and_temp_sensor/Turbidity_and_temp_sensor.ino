#include <WiFi.h>
#include <WebServer.h>
#include <OneWire.h>           
#include <DallasTemperature.h>  

const char* ssid = "PLDTHOMEFIBRAzKT4";
const char* password = "PLDTWIFIJAWx4";

WebServer server(80);

int latestTurbidity = 0;

byte requestCmd[] = {0x18, 0x05, 0x00, 0x01, 0x0D};

#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);

void handleData() {
  tempSensor.requestTemperatures(); 
  float currentTemp = tempSensor.getTempCByIndex(0);


  String json = "{";
  json += "\"turbidity\":" + String(latestTurbidity) + ","; 
  json += "\"temp\":" + String(currentTemp);               
  json += "}";

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, 32, 33);
  tempSensor.begin();
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

  server.handleClient();

  static unsigned long lastRequest = 0;
  if (millis() - lastRequest > 2000) {
    Serial2.write(requestCmd, 5);
    lastRequest = millis();
  }

  if (Serial2.available() >= 5) {
    byte buffer[5];
    Serial2.readBytes(buffer, 5);
    
    if (buffer[0] == 0x18 && buffer[1] == 0x05 && buffer[4] == 0x0D) {
      latestTurbidity = buffer[3];
      tempSensor.requestTemperatures(); 
      float printTemp = tempSensor.getTempCByIndex(0);

      Serial.print("Live Turbidity: ");
      Serial.print(latestTurbidity);
      Serial.print("  |  Live Temp: ");
      Serial.print(printTemp);
      Serial.println(" °C");
    }
  }
}