# VanRakshak Node Wiring Diagram

## Standard ESP32 (WROOM) Pinout Mapping (Recommended)

This pinout is designed for the standard ESP32 (WROOM) dev board. It utilizes safe GPIO pins that avoid strapping pin conflicts and internal SPI flash pins (GPIO 6-11).

### 1. LoRa SX1278 (VSPI Interface)
| SX1278 | ESP32 (WROOM) | Description |
| :--- | :--- | :--- |
| VCC | 3.3V | Power (3.3V) |
| GND | GND | Ground |
| SCK | GPIO 18 | SPI Clock (Standard VSPI) |
| MISO | GPIO 19 | SPI MISO (Standard VSPI) |
| MOSI | GPIO 23 | SPI MOSI (Standard VSPI) |
| NSS (CS) | GPIO 5 | SPI Select (Standard VSPI CS) |
| RST | GPIO 14 | LoRa Reset Pin |
| DIO0 | GPIO 26 | LoRa Interrupt Pin |

### 2. INMP441 Microphone (I2S Interface)
| INMP441 | ESP32 (WROOM) | Description |
| :--- | :--- | :--- |
| VDD | 3.3V | Power (3.3V) |
| GND | GND | Ground |
| L/R | GND | Left Channel Selection |
| WS | GPIO 25 | I2S Word Select (LRCLK) |
| SCK | GPIO 32 | I2S Bit Clock (BCLK) |
| SD | GPIO 33 | I2S Serial Data Out |

### 3. MPU6050 (I2C Interface)
| MPU6050 | ESP32 (WROOM) | Description |
| :--- | :--- | :--- |
| VCC | 3.3V | Power (3.3V) |
| GND | GND | Ground |
| SDA | GPIO 21 | I2C Data (Standard ESP32 SDA) |
| SCL | GPIO 22 | I2C Clock (Standard ESP32 SCL) |

### 4. PIR Sensor & Diagnostics
| Component | ESP32 (WROOM) | Description |
| :--- | :--- | :--- |
| PIR Signal | GPIO 13 | Digital Input (PIR Motion Detection) |
| Battery Sense | GPIO 35 | Analog Input (via 10K/10K Voltage Divider) |
| GREEN LED | GPIO 2 | System Active / OK (Built-in LED) |
| YELLOW LED | GPIO 4 | Simulation / Safe Mode Active |
| RED LED | GPIO 27 | Active Threat / Alert Indicator |

---

## ESP32-S3 Pinout Mapping (Legacy Reference)

> [!WARNING]
> Do NOT use these pins on a standard ESP32 (WROOM) board. Using GPIO 8/9 will cause boot-loops due to SPI flash connection, and GPIO 1 will conflict with the USB serial transmitter.

### 1. LoRa SX1278 (SPI)
| SX1278 | ESP32-S3 |
| :--- | :--- |
| VCC | 3.3V |
| GND | GND |
| SCK | GPIO 5 |
| MISO | GPIO 19 |
| MOSI | GPIO 27 |
| NSS (CS) | GPIO 18 |
| RST | GPIO 14 |
| DIO0 | GPIO 26 |

### 2. INMP441 Microphone (I2S)
| INMP441 | ESP32-S3 |
| :--- | :--- |
| VDD | 3.3V |
| GND | GND |
| L/R | GND (Left Channel) |
| WS | GPIO 25 |
| SCK | GPIO 32 |
| SD | GPIO 33 |

### 3. MPU6050 (I2C)
| MPU6050 | ESP32-S3 |
| :--- | :--- |
| VCC | 3.3V |
| GND | GND |
| SCL | GPIO 9 |
| SDA | GPIO 8 |

### 4. PIR Sensor & Others
| Component | ESP32-S3 |
| :--- | :--- |
| PIR Signal | GPIO 13 |
| Battery Sense | GPIO 1 (via Voltage Divider) |

---

## Power Circuit
- **Solar Panel (6V)** -> TP4056 Input
- **TP4056 B+/B-** -> 18650 Battery
- **TP4056 Out+** -> LDO/Buck Converter (3.3V) -> ESP32 3.3V Pin

