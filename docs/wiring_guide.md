# VanRakshak-X: Detailed Breadboard Wiring Guide

This guide details the step-by-step physical placement, wiring connections, power considerations, and debugging strategies for the **VanRakshak-X** edge node using a standard **ESP32 (WROOM) DevKit** on a full-size **830-point Breadboard**.

---

## 🛠️ Required Components Checklist
1. **ESP32 (WROOM) DevKit** (30 or 38 pins)
2. **Ra-02 LoRa Module (433MHz)** (usually requires its 2.54mm adapter/breakout board to fit breadboards)
3. **INMP441 I2S Microphone**
4. **MPU6050 Accelerometer/Gyro**
5. **PIR Motion Sensor** (HC-SR501 or Mini PIR)
6. **3x LEDs** (Red, Yellow, Green)
7. **Resistors**:
   - **2x 10KΩ Resistors** (for the optional Battery Sensing Voltage Divider)
   - **3x Resistors** (Ideally 220Ω to 1KΩ for the LEDs. If using 10KΩ, the LEDs will be very dim; 220Ω-330Ω is recommended for brightness).
8. **Breadboard (830 points)** and **Jumper Wires**

---

## ⚠️ Critical Setup Warnings

### 1. Antenna Connection (LoRa SX1278 Protection)
> [!CAUTION]
> **NEVER power on or transmit with the Ra-02 LoRa module unless you have connected its antenna.**
> Transmitting with an open RF load can permanently burn out the RF power amplifier on the SX1278 chip within seconds. Always connect the antenna before plugging in the USB cable.

### 2. Power Rail Loading & Brownouts
> [!WARNING]
> During LoRa transmissions, the Ra-02 module can draw transient currents exceeding **120mA**. 
> If you are powering the entire system from the ESP32's onboard 3.3V LDO regulator via USB, it may brown out.
> **Symptoms**: If you see `Brownout detector was triggered` in the serial monitor and the chip resets, your USB port or ESP32 board regulator is failing to supply enough current.
> **Fix**: Add a **100µF to 470µF electrolytic capacitor** across the breadboard's 3.3V and GND rails to smooth out transient spikes.

### 3. Ra-02 Breadboard Footprint
> [!IMPORTANT]
> Raw Ra-02 modules use **2.0mm pitch castellated pads** and cannot plug directly into a standard 2.54mm breadboard. You will need to use the **2.54mm pitch breakout adapter board** that comes with the module, or connect it using Male-to-Female jumper wires.

---

## 📌 Part 1: Breadboard Layout & Placement

1. **Power Rails**:
   - Connect the top and bottom horizontal rails together so you have power and ground access on both sides of the board.
     - Top `+` to Bottom `+` (Red wire)
     - Top `-` to Bottom `-` (Black/Blue wire)
2. **ESP32 Placement**:
   - Press the ESP32 DevKit board down across the **center divider (ravine)** of the breadboard, near the **left end**.
   - Make sure the Micro-USB port faces outward (to the left) so you can plug the cable in easily.
3. **Sensor Placement**:
   - Leave 2-3 empty rows between components to prevent short circuits and leave room for wires.

---

## 📌 Part 2: Detailed Pin Connections

### 1. Powering the Rails from the ESP32
* Connect the ESP32 **3V3** pin to the **Red (+) Rail** (3.3V power).
* Connect the ESP32 **GND** pin to the **Blue/Black (-) Rail** (Ground).

### 2. MPU6050 (I2C Accelerometer/Gyro)
* **VCC** ➡️ **Red (+) Rail** (3.3V)
* **GND** ➡️ **Blue/Black (-) Rail** (GND)
* **SDA** ➡️ **ESP32 GPIO 21**
* **SCL** ➡️ **ESP32 GPIO 22**

### 3. INMP441 (I2S Microphone)
* **VDD** ➡️ **Red (+) Rail** (3.3V)
* **GND** ➡️ **Blue/Black (-) Rail** (GND)
* **L/R** (Channel Select) ➡️ **Blue/Black (-) Rail** (GND for Left Channel)
* **WS** (Word Select) ➡️ **ESP32 GPIO 25**
* **SCK** (Serial Clock) ➡️ **ESP32 GPIO 33** *(Swapped for standard ESP32 libraries)*
* **SD** (Serial Data) ➡️ **ESP32 GPIO 32** *(Swapped for standard ESP32 libraries)*

### 4. Ra-02 LoRa Module (433MHz SPI)
* **3.3V** ➡️ **Red (+) Rail** (3.3V)
* **GND** ➡️ **Blue/Black (-) Rail** (GND)
* **MISO** ➡️ **ESP32 GPIO 19**
* **MOSI** ➡️ **ESP32 GPIO 23**
* **SCK** ➡️ **ESP32 GPIO 18**
* **NSS / CS** ➡️ **ESP32 GPIO 5**
* **RST** ➡️ **ESP32 GPIO 14**
* **DIO0** ➡️ **ESP32 GPIO 26**

### 5. PIR Motion Sensor
* **VCC**:
  - **HC-SR501 (Standard Blue/Green)** ➡️ Connect to **ESP32 5V/VIN Pin** (Needs 5V to run reliably).
  - **AM312 (Mini PIR)** ➡️ Connect to **Red (+) Rail** (Runs on 3.3V).
* **GND** ➡️ **Blue/Black (-) Rail** (GND)
* **OUT / Signal** ➡️ **ESP32 GPIO 13**

### 6. Battery Sensing Voltage Divider (Optional - Skip if no battery)
* **Resistor A (10KΩ)**: Connects from battery positive terminal to a **Center Node** row.
* **Resistor B (10KΩ)**: Connects from the **Center Node** row to the **Blue/Black (-) Rail** (GND).
* **Center Node** ➡️ Connects to **ESP32 GPIO 35** (ADC1_CH7).

### 7. Diagnostic LEDs
* **GREEN LED (System OK)**: Anode ➡️ **ESP32 GPIO 2**; Cathode ➡️ Resistor (220Ω) ➡️ GND Rail.
* **YELLOW LED (Simulation Mode)**: Anode ➡️ **ESP32 GPIO 4**; Cathode ➡️ Resistor (220Ω) ➡️ GND Rail.
* **RED LED (Active Threat)**: Anode ➡️ **ESP32 GPIO 27**; Cathode ➡️ Resistor (220Ω) ➡️ GND Rail.

---

## 🚀 Recommended Incremental Build Order

Do not plug in all components at once. Build and test in stages to narrow down any hardware or connection faults:

### Stage 1: Basic Blink & Core Boot (ESP32 + Green LED)
1. Place only the ESP32 on the breadboard.
2. Wire the **GREEN LED** to **GPIO 2** with a current-limiting resistor to GND.
3. Plug in the USB cable and upload the sketch.
4. Verify the GREEN LED blinks/glows and the Serial Monitor shows boot diagnostics.

### Stage 2: I2C Verification (Add MPU6050)
1. Disconnect USB power.
2. Wire the **MPU6050** to power, GND, and GPIO 21 (SDA) / 22 (SCL).
3. Connect USB, check the Serial Monitor. 
4. The system should report `[HARDWARE] MPU6050 IMU Initialized successfully` and the YELLOW LED should turn on (since other sensors are still missing).

### Stage 3: Audio Acquisition (Add INMP441)
1. Disconnect USB.
2. Wire the **INMP441 Mic** to power, GND, L/R, and GPIO 25 (WS), 33 (SCK), 32 (SD).
3. Power up, check serial logs. The system should confirm I2S initialization and start outputting ambient audio levels.

### Stage 4: Radio Setup (Add Ra-02 LoRa)
1. Disconnect USB.
2. Connect the **Antenna** to the Ra-02 module.
3. Wire the **Ra-02** to the SPI bus (GPIO 18, 19, 23, 5) and controls (14, 26).
4. Power up. The serial logs should show `[HARDWARE] LoRa (Ra-02 433MHz) Initialized successfully` instead of warnings.

### Stage 5: Passive Infrared (Add PIR)
1. Disconnect USB.
2. Wire the **PIR sensor** (VCC, GND, OUT to GPIO 13).
3. Power up and check if passing your hand in front of the PIR triggers simulated motion events.

### Stage 6: Power Monitoring (Add Battery Sensing)
1. Disconnect USB.
2. Assemble the two 10KΩ resistors on the breadboard and connect to GPIO 35.
3. Wire the positive terminal of your battery holder to Resistor A's input.
4. Verify the analog voltage reading in the telemetry logs matches your battery's actual voltage.
