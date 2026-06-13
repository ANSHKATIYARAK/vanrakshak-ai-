#include <Arduino.h>
#include <LoRa.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <driver/i2s.h>
#include <WiFi.h>
#include <PubSubClient.h>

// WiFi & MQTT Credentials
const char* ssid = "irladitya";
const char* password = "00000000";
const char* mqttServer = "192.168.1.5";
const int mqttPort = 1883;
#define USE_WIFI false // Set to true if you have a stable power supply (e.g. decoupling capacitor) to connect to WiFi

#if USE_WIFI
WiFiClient espClient;
PubSubClient mqttClient(espClient);
#endif



// Pin Definitions for Standard ESP32 (WROOM)
#define LORA_SCK 18
#define LORA_MISO 19
#define LORA_MOSI 23
#define LORA_SS 5
#define LORA_RST 14
#define LORA_DIO0 26

#define I2S_WS 25
#define I2S_SD 32
#define I2S_SCK 33

#define I2C_SDA 21
#define I2C_SCL 22

#define PIR_PIN 13
#define BATTERY_PIN 35 // ADC1_CH7 (Input only, safe for Battery ADC)

#define GREEN_LED 2    // System OK / Active (Built-in LED on most dev boards)
#define YELLOW_LED 4   // Simulation Mode Active
#define RED_LED 27     // Alert / Threat Active

// Research-Grade Novelty Constants
const char* NODE_ID = "VR-X-001";
float backgroundNoiseFloor = 20.0; // Startup baseline noise floor
float currentTilt = 0.0;

// Hardware Status Flags
bool loraEnabled = false;
bool mpuEnabled = false;
bool micEnabled = false;
bool rawI2CMode = false;
byte mpuAddress = 0x68;

// Threat Analyzer (threshold-based fusion engine)
class ThreatAnalyzer {
public:
    void setup() {
        Serial.println("[ThreatAnalyzer] Multi-Modal Fusion Engine Initialized (Heuristic Mode).");
    }

    // T = 0.5A + 0.2V + 0.1M + 0.1θ + 0.1E
    float predict(float audioLevel, float vibrationAnom, bool motion, float tiltAnom) {
        float A = audioLevel;                      // Acoustic contribution (0-100)
        float V = vibrationAnom;                   // Vibration contribution (0-100)
        float M = motion ? 100.0 : 0.0;            // Motion contribution (0 or 100)
        float theta = tiltAnom * 100.0;            // Tilt contribution (0 or 100)
        float E = 10.0;                            // Contextual environment baseline

        float threatScore = (0.50 * A) + (0.20 * V) + (0.10 * M) + (0.10 * theta) + (0.10 * E);
        return threatScore;
    }
};

class EcoIntelligence {
public:
    float bioacousticRichness = 100.0;
    float adaptiveThreshold = 70.0; // Scaled out of 100 for threat score comparison
    bool tamperAlert = false;

    void checkTamper(float currentAccel) {
        // Novelty #8: Anti-Tamper detection
        // If node is moved violently without PIR trigger
        if (currentAccel > 25.0) {
            tamperAlert = true;
            Serial.println("SECURITY ALERT: Device Tamper Detected!");
        }
    }

    void updateBaseline(float currentAudioLevel) {
        // Simple moving average for background noise floor
        backgroundNoiseFloor = (backgroundNoiseFloor * 0.95) + (currentAudioLevel * 0.05);

        // Novelty #2: Ecological Silence Detection
        // If sound drops significantly below noise floor, it indicates wildlife flight
        if (backgroundNoiseFloor > 5.0 && currentAudioLevel < (backgroundNoiseFloor * 0.3)) {
            static unsigned long lastSilenceAlert = 0;
            if (millis() - lastSilenceAlert > 10000) { // Limit to once every 10 seconds
                Serial.println("ALERT: Ecological Silence Detected! Potential Human Presence (Birds flight).");
                lastSilenceAlert = millis();
            }
            bioacousticRichness = 20.0; // Richness drops
        } else {
            bioacousticRichness = 90.0; // Normal state
        }
    }

    void adjustSensitivity(float ambientNoise) {
        // Novelty #3: Adaptive Thresholding
        // Increase threshold in noisy environments (rain/wind) to prevent false alerts
        if (ambientNoise > 60.0) {
            adaptiveThreshold = 85.0; // Less sensitive
        } else {
            adaptiveThreshold = 70.0; // Standard sensitivity
        }
    }
};

EcoIntelligence eco;
ThreatAnalyzer ai;
Adafruit_MPU6050 mpu;

// Prototypes
void setupLoRa();
void setupMPU();
bool setupI2S();
void setupWiFi();
void reconnectMQTT();
float readI2SAudioLevel();
float getVibrationAnomaly();
float getTiltAnomaly();
bool getMotion();
void sendAlert(float score, const char* type);
void sendTelemetry();
void updateLEDs(bool alertActive);

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n=============================================");
    Serial.println("         VanRakshak-X Node Starting");
    Serial.println("=============================================");

    // LED Initialization
    pinMode(GREEN_LED, OUTPUT);
    pinMode(YELLOW_LED, OUTPUT);
    pinMode(RED_LED, OUTPUT);

    // Initial LED test sequence
    digitalWrite(GREEN_LED, HIGH);
    digitalWrite(YELLOW_LED, HIGH);
    digitalWrite(RED_LED, HIGH);
    delay(500);
    digitalWrite(GREEN_LED, LOW);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(RED_LED, LOW);
    delay(200);

    // Startup Hardware Initializations (Non-blocking)
    setupLoRa();
    setupMPU();
    micEnabled = setupI2S();
    ai.setup();

#if USE_WIFI
    // Setup WiFi & MQTT Configuration
    setupWiFi();
    mqttClient.setServer(mqttServer, mqttPort);
#endif

    // Check if we are running in Simulation Mode
    bool simulationMode = !loraEnabled || !mpuEnabled || !micEnabled;
    if (simulationMode) {
        Serial.println("\n[DIAGNOSTICS] WARNING: Some hardware components are missing.");
        Serial.println("[DIAGNOSTICS] Running in SIMULATION MODE for missing devices:");
        Serial.print("  - LoRa (Ra-02): "); Serial.println(loraEnabled ? "OK" : "MISSING (Using Serial telemetry)");
        Serial.print("  - MPU6050 IMU:  "); Serial.println(mpuEnabled ? "OK" : "MISSING (Simulating vibration/tilt)");
        Serial.print("  - INMP441 Mic:  "); Serial.println(micEnabled ? "OK" : "MISSING (Simulating audio level)");
    } else {
        Serial.println("\n[DIAGNOSTICS] All hardware components initialized successfully.");
    }

    // Wake up reason check
    esp_sleep_wakeup_cause_t wakeup_reason = esp_sleep_get_wakeup_cause();
    if (wakeup_reason == ESP_SLEEP_WAKEUP_EXT0) {
        Serial.println("Woken up by PIR motion sensor!");
    }

    Serial.println("VanRakshak Node Initialized: " + String(NODE_ID));
}

void loop() {
#if USE_WIFI
    // Keep WiFi and MQTT connection active
    if (WiFi.status() == WL_CONNECTED) {
        if (!mqttClient.connected()) {
            reconnectMQTT();
        }
        mqttClient.loop();
    }
#endif

    // 1. Audio Analysis & Baseline Update
    float audioLevel = readI2SAudioLevel();
    eco.updateBaseline(audioLevel);
    eco.adjustSensitivity(backgroundNoiseFloor);

    // 2. Vibration & Trunk Tilt Analysis (Novelty #1: Smart Tree Digital Twin)
    float vibAnom = getVibrationAnomaly();
    float tiltAnom = getTiltAnomaly();
    bool motion = getMotion();

    // 3. Multi-Modal Fusion Score
    float threatScore = ai.predict(audioLevel, vibAnom, motion, tiltAnom);

    // 4. Alert Processing
    bool alertActive = false;
    if (threatScore > eco.adaptiveThreshold) {
        alertActive = true;
        const char* threatType = "INTRUSION";
        if (audioLevel > 50.0 && vibAnom > 30.0) {
            threatType = "CHAINSAW";
        } else if (tiltAnom > 0.5) {
            threatType = "TREE_FALLING";
        } else if (eco.tamperAlert) {
            threatType = "TAMPER";
        }
        sendAlert(threatScore, threatType);
        delay(3000); // Prevent alert spam
    }

    // 5. Update Diagnostic LEDs
    updateLEDs(alertActive);

    // 6. Periodic Telemetry (Every 10 seconds in simulation mode, 60 seconds in normal)
    static unsigned long lastTelemetry = 0;
    static bool firstTelemetrySent = false;
    unsigned long telemetryInterval = (!loraEnabled || !mpuEnabled || !micEnabled) ? 10000 : 60000;

    if (!firstTelemetrySent || (millis() - lastTelemetry > telemetryInterval)) {
        sendTelemetry();
        lastTelemetry = millis();
        firstTelemetrySent = true;

        // Deep sleep entry (Bypassed in simulation mode to allow easy USB serial debugging)
        bool simulationMode = !loraEnabled || !mpuEnabled || !micEnabled;
        if (!simulationMode && threatScore < 20.0) {
            Serial.println("Entering deep sleep (power saving)...");
            digitalWrite(GREEN_LED, LOW);
            digitalWrite(YELLOW_LED, LOW);
            digitalWrite(RED_LED, LOW);
            esp_sleep_enable_ext0_wakeup((gpio_num_t)PIR_PIN, 1); // Wake on PIR high
            esp_deep_sleep(60000000); // 1 minute in microseconds
        }
    }

    delay(100);
}

void setupLoRa() {
    LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
    // Explicitly configure 433MHz frequency for the Ra-02 module
    if (!LoRa.begin(433E6)) {
        Serial.println("[HARDWARE] LoRa (Ra-02 433MHz) Initialization Failed. Check connections.");
        loraEnabled = false;
    } else {
        LoRa.setSyncWord(0xF1);
        Serial.println("[HARDWARE] LoRa (Ra-02 433MHz) Initialized successfully.");
        loraEnabled = true;
    }
}

void setupMPU() {
    Wire.begin(I2C_SDA, I2C_SCL);
    
    // Attempt standard initialization on default address 0x68
    if (mpu.begin()) {
        mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
        mpu.setGyroRange(MPU6050_RANGE_500_DEG);
        mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
        Serial.println("[HARDWARE] MPU6050 IMU Initialized successfully on 0x68.");
        mpuEnabled = true;
        rawI2CMode = false;
    } else {
        Serial.println("[HARDWARE] MPU6050 failed on default address 0x68. Scanning I2C bus...");
        
        byte detectedAddress = 0;
        byte count = 0;
        for (byte address = 1; address < 127; address++) {
            Wire.beginTransmission(address);
            byte error = Wire.endTransmission();
            if (error == 0) {
                Serial.print("  -> Found I2C device at address 0x");
                if (address < 16) Serial.print("0");
                Serial.println(address, HEX);
                detectedAddress = address;
                count++;
            }
        }
        
        // Auto-recovery / Clone Bypass: if ANY device is found at 0x68 or 0x69
        if (detectedAddress == 0x68 || detectedAddress == 0x69) {
            mpuAddress = detectedAddress;
            Serial.printf("[DIAGNOSTICS] I2C device detected at 0x%02X. Reading chip ID...\n", mpuAddress);
            
            // Read WHO_AM_I register (0x75)
            byte chipID = 0;
            Wire.beginTransmission(mpuAddress);
            Wire.write(0x75);
            Wire.endTransmission(false);
            Wire.requestFrom(mpuAddress, (uint8_t)1);
            if (Wire.available()) {
                chipID = Wire.read();
            }
            Serial.printf("[DIAGNOSTICS] WHO_AM_I register (0x75) returned: 0x%02X\n", chipID);
            
            // Wake up the sensor (write 0x00 to PWR_MGMT_1 register 0x6B)
            Wire.beginTransmission(mpuAddress);
            Wire.write(0x6B);
            Wire.write(0x00);
            Wire.endTransmission();
            delay(10);
            
            // Set Accel Config to ±2g (write 0x00 to ACCEL_CONFIG register 0x1C)
            Wire.beginTransmission(mpuAddress);
            Wire.write(0x1C);
            Wire.write(0x00);
            Wire.endTransmission();
            
            rawI2CMode = true;
            mpuEnabled = true;
            Serial.printf("[HARDWARE] MPU6050/Clone Direct Register Mode Enabled at 0x%02X\n", mpuAddress);
        } else {
            if (count == 0) {
                Serial.println("[DIAGNOSTICS] I2C Scan: No devices found on bus. Check SDA, SCL, VCC, GND.");
            } else {
                Serial.printf("[DIAGNOSTICS] I2C Scan: Found %d device(s), but no MPU6050 at 0x68/0x69. Check connections.\n", count);
            }
            mpuEnabled = false;
        }
    }
    pinMode(PIR_PIN, INPUT);
}

bool tryI2SPins(int sckPin, int sdPin) {
    // Uninstall if already installed to ensure clean state
    i2s_driver_uninstall(I2S_NUM_0);

    i2s_config_t i2s_config = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
        .sample_rate = 16000,
        .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
        .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
#ifdef I2S_COMM_FORMAT_STAND_I2S
        .communication_format = (i2s_comm_format_t)I2S_COMM_FORMAT_STAND_I2S,
#else
        .communication_format = (i2s_comm_format_t)(I2S_COMM_FORMAT_I2S_MSB | I2S_COMM_FORMAT_I2S),
#endif
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count = 4,
        .dma_buf_len = 64,
        .use_apll = false,
        .tx_desc_auto_clear = false,
        .fixed_mclk = 0
    };

    i2s_pin_config_t pin_config = {
        .bck_io_num = sckPin,
        .ws_io_num = I2S_WS,
        .data_out_num = I2S_PIN_NO_CHANGE,
        .data_in_num = sdPin
    };

    if (i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL) != ESP_OK) {
        return false;
    }

    if (i2s_set_pin(I2S_NUM_0, &pin_config) != ESP_OK) {
        return false;
    }

    // Give microphone time to boot and clocks to settle
    delay(200);

    // Read and discard a few blocks to clear startup transients
    int32_t discardSamples[64];
    size_t discardBytes = 0;
    for (int k = 0; k < 6; k++) {
        i2s_read(I2S_NUM_0, discardSamples, sizeof(discardSamples), &discardBytes, pdMS_TO_TICKS(50));
    }

    // Verify samples
    int32_t testSamples[64];
    size_t testBytes = 0;
    esp_err_t err = i2s_read(I2S_NUM_0, testSamples, sizeof(testSamples), &testBytes, pdMS_TO_TICKS(100));

    bool flatline = true;
    if (err == ESP_OK && testBytes > 0) {
        int sampleCount = testBytes / sizeof(int32_t);
        for (int i = 0; i < sampleCount; i++) {
            if (testSamples[i] != 0) {
                flatline = false;
                break;
            }
        }
    }
    return !flatline;
}

bool setupI2S() {
    Serial.println("[HARDWARE] Initializing INMP441 Microphone (I2S)...");
    
    // Try primary configuration (SCK=33, SD=32)
    if (tryI2SPins(33, 32)) {
        Serial.println("[HARDWARE] INMP441 Microphone (I2S) Initialized successfully on primary pins (SCK=33, SD=32).");
        return true;
    }
    
    // Try secondary configuration (SCK=32, SD=33)
    Serial.println("[HARDWARE] INMP441 flatlined on primary pins. Trying swapped pins (SCK=32, SD=33)...");
    if (tryI2SPins(32, 33)) {
        Serial.println("[HARDWARE] INMP441 Microphone (I2S) Initialized successfully on swapped pins (SCK=32, SD=33).");
        return true;
    }
    
    Serial.println("[HARDWARE] INMP441 Microphone (I2S) failed flatline check on both pin configurations. Disabling microphone.");
    i2s_driver_uninstall(I2S_NUM_0); // Clean up if installed but failed
    return false;
}

float readI2SAudioLevel() {
    if (!micEnabled) {
        // Generate simulated audio level representing wind noise + periodic birds
        static float simAudio = 20.0;
        simAudio = (simAudio * 0.9) + ((rand() % 30 + 10) * 0.1);
        
        // Randomly simulate occasional loud spikes (chainsaw simulation for testing)
        if (rand() % 100 == 0) {
            simAudio = 85.0; 
            Serial.println("[SIMULATOR] Generating high audio spike...");
        }
        return simAudio;
    }

    int32_t samples[64];
    size_t bytesRead = 0;
    // Timeout of 100ms instead of portMAX_DELAY to make it non-blocking
    esp_err_t err = i2s_read(I2S_NUM_0, samples, sizeof(samples), &bytesRead, pdMS_TO_TICKS(100));
    if (err != ESP_OK || bytesRead == 0) {
        return 0.0;
    }

    int sampleCount = bytesRead / sizeof(int32_t);
    double sum = 0.0;
    for (int i = 0; i < sampleCount; i++) {
        // Convert to normalized floating point (-1.0 to 1.0)
        float val = (float)samples[i] / 2147483648.0;
        sum += (val * val);
    }
    float rms = sqrt(sum / sampleCount);

    // Scale RMS to 0 - 100 range
    float audioLevel = rms * 2000.0; 
    if (audioLevel > 100.0) audioLevel = 100.0;

    return audioLevel;
}

bool readRawAcceleration(int16_t &ax, int16_t &ay, int16_t &az) {
    Wire.beginTransmission(mpuAddress);
    Wire.write(0x3B); // ACCEL_XOUT_H register
    if (Wire.endTransmission(false) != 0) return false;
    
    Wire.requestFrom(mpuAddress, (uint8_t)6);
    if (Wire.available() < 6) return false;
    
    ax = (Wire.read() << 8) | Wire.read();
    ay = (Wire.read() << 8) | Wire.read();
    az = (Wire.read() << 8) | Wire.read();
    return true;
}

float getVibrationAnomaly() {
    if (!mpuEnabled) {
        // Simulated vibration floor
        static float simVib = 0.0;
        simVib = (simVib * 0.9) + ((rand() % 10) * 0.1);
        
        // Occasional high vibration (axe strike simulation)
        if (rand() % 150 == 0) {
            simVib = 45.0;
            Serial.println("[SIMULATOR] Generating vibration shockwave...");
        }
        return simVib;
    }

    float ax = 0.0, ay = 0.0, az = 0.0;

    if (rawI2CMode) {
        int16_t raw_ax, raw_ay, raw_az;
        if (readRawAcceleration(raw_ax, raw_ay, raw_az)) {
            // For ±2g range, sensitivity is 16384 LSB/g.
            ax = (float)raw_ax / 16384.0 * 9.80665;
            ay = (float)raw_ay / 16384.0 * 9.80665;
            az = (float)raw_az / 16384.0 * 9.80665;
        } else {
            return 0.0;
        }
    } else {
        sensors_event_t a, g, temp;
        mpu.getEvent(&a, &g, &temp);
        ax = a.acceleration.x;
        ay = a.acceleration.y;
        az = a.acceleration.z;
    }

    // Calculate magnitude of acceleration
    float totalAccel = sqrt(ax * ax + ay * ay + az * az);
    
    // Normal gravity is ~9.8 m/s^2. Anomaly is the deviation from this.
    float deviation = abs(totalAccel - 9.81);
    
    // Run anti-tamper check on raw acceleration values
    eco.checkTamper(totalAccel);

    // Map deviation to a vibration anomaly score (0-100)
    float score = deviation * 15.0;
    if (score > 100.0) score = 100.0;
    return score;
}

float getTiltAnomaly() {
    if (!mpuEnabled) {
        // Simulated tree inclination (usually stable at 0, or tilting slowly if felling)
        static float simTilt = 0.0;
        if (rand() % 300 == 0) {
            simTilt = 12.0; // Simulate falling tree tilt
            Serial.println("[SIMULATOR] Generating high tilt anomaly...");
        } else {
            // Recover slowly to 0
            simTilt = simTilt * 0.99;
        }
        return simTilt > 5.0 ? 1.0 : 0.0;
    }

    float ax = 0.0, ay = 0.0, az = 0.0;

    if (rawI2CMode) {
        int16_t raw_ax, raw_ay, raw_az;
        if (readRawAcceleration(raw_ax, raw_ay, raw_az)) {
            ax = (float)raw_ax / 16384.0 * 9.80665;
            ay = (float)raw_ay / 16384.0 * 9.80665;
            az = (float)raw_az / 16384.0 * 9.80665;
        } else {
            return 0.0;
        }
    } else {
        sensors_event_t a, g, temp;
        mpu.getEvent(&a, &g, &temp);
        ax = a.acceleration.x;
        ay = a.acceleration.y;
        az = a.acceleration.z;
    }

    // Calculate Pitch (Tilt) in degrees
    float pitch = atan2(-ax, sqrt(ay * ay + az * az)) * 180.0 / M_PI;
    currentTilt = pitch;

    // Return 1.0 (anomaly) if tilt exceeds 5 degrees, otherwise 0.0
    if (abs(pitch) > 5.0) {
        return 1.0;
    }
    return 0.0;
}

bool getMotion() {
    if (!mpuEnabled) { // PIR is checked along with MPU in setupSensors
        // Simulate PIR motion triggers
        if (rand() % 100 == 0) {
            Serial.println("[SIMULATOR] PIR sensor motion event triggered...");
            return true;
        }
        return false;
    }
    return digitalRead(PIR_PIN);
}

void sendAlert(float score, const char* type) {
    StaticJsonDocument<200> doc;
    doc["id"] = NODE_ID;
    doc["type"] = type;
    doc["score"] = score;
    doc["conf"] = score;
    doc["arrival_us"] = micros();

    String output;
    serializeJson(doc, output);

    // Send via WiFi MQTT if connected
#if USE_WIFI
    if (mqttClient.connected()) {
        String topic = "vanrakshak/node/" + String(NODE_ID) + "/alert";
        mqttClient.publish(topic.c_str(), output.c_str());
        Serial.println("Alert Sent via WiFi MQTT: " + output);
    }
#endif

    if (loraEnabled) {
        LoRa.beginPacket();
        LoRa.print(output);
        LoRa.endPacket();
        Serial.println("Alert Sent via LoRa: " + output);
    } else {
        Serial.println("Alert generated (LoRa offline): " + output);
    }
}

void sendTelemetry() {
    StaticJsonDocument<250> doc;
    doc["id"] = NODE_ID;
    doc["bsi"] = eco.bioacousticRichness;
    doc["noise_floor"] = backgroundNoiseFloor;
    doc["threshold"] = eco.adaptiveThreshold;
    doc["tilt"] = currentTilt;

    float temperature = 28.5;
    float humidity = 65.0;
    if (mpuEnabled) {
        sensors_event_t a, g, temp;
        mpu.getEvent(&a, &g, &temp);
        temperature = temp.temperature;
    }
    doc["temp"] = temperature;
    doc["hum"] = humidity;

    // Real battery sense on pin 35 (safe ADC)
    float raw = analogRead(BATTERY_PIN);
    // 1:1 voltage divider (e.g. 10k/10k) means voltage = raw_adc_volts * 2
    float voltage = (raw / 4095.0) * 3.3 * 2.0; 
    doc["batt"] = voltage;
    doc["batt_pct"] = map(voltage * 100, 330, 420, 0, 100);
    doc["uptime"] = millis();

    String output;
    serializeJson(doc, output);

    // Send via WiFi MQTT if connected
#if USE_WIFI
    if (mqttClient.connected()) {
        String topic = "vanrakshak/node/" + String(NODE_ID) + "/telemetry";
        mqttClient.publish(topic.c_str(), output.c_str());
        Serial.println("Telemetry Sent via WiFi MQTT: " + output);
    }
#endif

    if (loraEnabled) {
        LoRa.beginPacket();
        LoRa.print(output);
        LoRa.endPacket();
        Serial.println("Telemetry Sent via LoRa: " + output);
    } else {
        Serial.println("Telemetry Sent via Serial: " + output);
    }
}

#if USE_WIFI
void setupWiFi() {
    Serial.print("\nConnecting to WiFi SSID: ");
    Serial.println(ssid);
    WiFi.begin(ssid, password);
    int retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < 15) {
        delay(500);
        Serial.print(".");
        retries++;
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n[HARDWARE] WiFi Connected successfully.");
        Serial.print("IP Address: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("\n[HARDWARE] WiFi Connection Failed (Timeout).");
    }
}

void reconnectMQTT() {
    if (WiFi.status() != WL_CONNECTED) return;
    static unsigned long lastReconnectAttempt = 0;
    if (millis() - lastReconnectAttempt > 5000) {
        lastReconnectAttempt = millis();
        Serial.println("[MQTT] Attempting connection to PC MQTT broker...");
        if (mqttClient.connect(NODE_ID)) {
            Serial.println("[MQTT] Connected to PC broker successfully!");
        } else {
            Serial.print("[MQTT] Connection failed, rc=");
            Serial.println(mqttClient.state());
        }
    }
}
#endif

void updateLEDs(bool alertActive) {
    // Green LED indicates normal running / system active
    digitalWrite(GREEN_LED, HIGH);

    // Yellow LED indicates Simulation Mode is active (one or more sensors offline)
    bool simulationMode = !loraEnabled || !mpuEnabled || !micEnabled;
    if (simulationMode) {
        digitalWrite(YELLOW_LED, HIGH);
    } else {
        digitalWrite(YELLOW_LED, LOW);
    }

    // Red LED flashes when a threat is active
    if (alertActive) {
        digitalWrite(RED_LED, HIGH);
    } else {
        digitalWrite(RED_LED, LOW);
    }
}
