# VanRakshak AI: Product Requirements Document (PRD) v2.0
## AI-Powered Autonomous Forest Guardianship & Illegal Logging Mitigation

---

### 1. Executive Summary
**Vision Statement**
VanRakshak AI (The "Forest Protector") is a state-of-the-art, distributed Edge-AI ecosystem designed to serve as a silent, 24/7 sentinel for the world's most vulnerable forest ecosystems. By fusing high-fidelity acoustic sensing, seismic vibration analysis, and low-power IoT infrastructure, VanRakshak AI moves beyond traditional reactive patrolling into **Proactive Environmental Guardianship**.

**Key Value Proposition**
*   **Zero-Latency Edge Inference:** Real-time threat detection (chainsaws, axe strikes) without needing persistent cloud connectivity.
*   **Solar-Autonomous Mesh:** Self-powering nodes that communicate over multi-kilometer ranges through dense foliage using LoRaWAN.
*   **Command-Center Analytics:** A high-end geospatial dashboard providing forest rangers with actionable intelligence, heatmaps, and rapid-response routing.

---

### 2. Problem Landscape
Deforestation accounts for nearly **15% of global greenhouse gas emissions**. Illegal logging is a multi-billion dollar criminal industry that thrives on:
*   **Vast Inaccessibility:** Traditional patrols can only cover <5% of dense forest area effectively.
*   **Information Asymmetry:** Loggers know the patrol schedules; rangers don't know the loggers' locations.
*   **Delayed Response:** By the time satellite imagery detects a "clearing," the trees are already gone and the perpetrators have vanished.
*   **Resource Scarcity:** Limited manpower and high risk for forest officials in remote regions.

---

### 3. The VanRakshak Solution
A three-tier architecture designed for resilience and precision:
1.  **The Sentinel Node (Edge):** Intelligent hardware deployed on tree trunks.
2.  **The Guardian Gateway (Communication):** LoRa-to-GSM/Satellite bridge for data backhaul.
3.  **The Command Center (Cloud):** AI-driven analytics and emergency dispatch interface.

---

### 4. Strategic Objectives
*   **Operational Excellence:** Achieve <10-second alert latency from the moment a chainsaw starts to the ranger's mobile device.
*   **Precision Monitoring:** Reduce false positives (wind, thunder, animal movement) to <5% using Multi-Sensor Fusion.
*   **Extreme Sustainability:** 5-year hardware lifespan with zero-maintenance solar harvesting.
*   **Community Integration:** Empower local indigenous populations with "Silent Alert" buttons to report illegal activity safely.

---

### 5. Target Stakeholders
| Stakeholder | Key Benefit |
| :--- | :--- |
| **Forest Departments** | Targeted deployment of manpower; increased conviction rates. |
| **Eco-NGOs** | Verifiable data for carbon credit audits and biodiversity tracking. |
| **Indigenous Communities** | Protection of ancestral lands and sacred groves. |
| **Local Citizens** | "Citizen Guardian" app for safe, anonymous reporting. |
| **Carbon Market Platforms** | Real-time "Proof of Protection" for forest-based offsets. |

---

### 6. Functional Requirements

#### 6.1 Multi-Modal Edge AI (Acoustic & Seismic)
*   **Acoustic Signature Analysis:** Real-time CNN-based classification of high-frequency chainsaw teeth noise vs. mechanical drills.
*   **Seismic Vibration Detection:** MPU6050-based FFT analysis to detect the "Thud" of a falling tree or rhythmic axe impacts.
*   **Correlation Engine:** Logic that triggers "Critical Alert" only when both sound and vibration signatures align, drastically reducing false alarms.

#### 6.2 Resilient Communication (The Mesh)
*   **LoRaWAN Long Range:** Capability to transmit through 2-5km of dense canopy.
*   **Adaptive Data Rate (ADR):** Dynamically adjusts transmission power to save battery based on signal strength.
*   **Local Buffering:** Stores event logs if the gateway is temporarily down, syncing once connection is restored.

#### 6.3 Advanced Geospatial Dashboard
*   **Live Threat Feed:** Real-time ticking feed with "Confidence Scores" for every incident.
*   **Dynamic Heatmaps:** Visualization of "Logistics Corridors" used by illegal loggers over time.
*   **Node Health Watchdog:** Real-time monitoring of battery voltage, solar intake, and internal temperature.
*   **Predictive Risk Maps:** AI-driven prediction of where logging is likely to occur next based on historical patterns and proximity to roads.

#### 6.4 Security & Durability
*   **Tamper Alerts:** Accelerometer-based detection if a node is being removed or destroyed.
*   **Encrypted Payloads:** AES-128 encryption for all LoRa transmissions to prevent "poacher spoofing."
*   **IP67 Weatherproofing:** Resistant to tropical monsoons, high humidity, and extreme heat.

#### 6.5 Community Mobile App (The "Rakshak" App)
*   **Offline First:** Maps and reporting forms that work without internet, syncing via Bluetooth/LoRa to nodes or once back in range.
*   **Gamified Conservation:** Rewards for community members who help maintain nodes or report valid threats.
*   **Emergency SOS:** Direct line to forest rangers for incidents like forest fires or wildlife poaching.

---

### 7. Technical Stack & AI Architecture

#### 7.1 Hardware Layer
*   **SoC:** ESP32-S3 (Dual-core, built-in AI acceleration instructions).
*   **Audio:** I2S MEMS Microphone (Inmp441) for digital-quality audio vs. analog noise.
*   **Power:** 18650 LiFePO4 battery (Safer in high heat) + 5W Monocrystalline Solar Panel.

#### 7.2 AI Pipeline (TinyML)
*   **Pre-processing:** Log-Mel Spectrogram generation on-chip.
*   **Model:** Lightweight MobileNet-V2 or custom 1D-CNN optimized for ESP32 using **TensorFlow Lite Micro**.
*   **Inference:** Continuous 1-second window analysis with a sliding window for temporal consistency.

#### 7.3 Backend & Frontend
*   **Backend:** FastAPI (Python) for high-performance async alert handling.
*   **Database:** TimescaleDB (PostgreSQL optimized for time-series sensor data).
*   **Frontend:** Next.js 14 + Tailwind CSS + Mapbox GL for a cinematic, high-performance map interface.
*   **Real-time:** WebSockets for instant dashboard updates without refreshing.

---

### 8. Data Flow & Intelligence Logic
1.  **Sense:** Continuous audio/vibration buffer.
2.  **Classify:** Edge AI identifies "Chainsaw" with 92% confidence.
3.  **Verify:** Seismic sensor detects rhythmic impact.
4.  **Transmit:** Encrypted LoRa packet: `{NodeID: 42, Type: "CRITICAL", Lat: 24.1, Long: 78.2, Conf: 0.94}`.
5.  **Act:** Cloud triggers SMS/WhatsApp to the nearest 3 Rangers and updates the Dashboard.

---

### 9. Risk Mitigation
*   **False Alarms:** Mitigated by multi-sensor correlation and "Human-in-the-loop" verification (sending 5s audio clips for high-confidence threats).
*   **Vandalism:** Camouflaged casings (3D scanned bark textures) and "Silent Tamper" alerts.
*   **Connectivity:** Satellite (Starlink/Swarm) gateways for deep-forest regions where GSM is non-existent.

---

### 10. Future Roadmap
*   **Phase 2:** Drone Interception - Automated takeoff of a drone to the GPS coordinate of an alert for visual confirmation.
*   **Phase 3:** Bio-Acoustics - Tracking endangered species (tigers, elephants) as a value-added "Conservation-as-a-Service."
*   **Phase 4:** Carbon Credit Integration - Automating the issuance of "Biodiversity Tokens" based on real-time protection data.

---

### 11. Success Metrics (KPIs)
*   **Detection Accuracy:** >92% (Chainsaw) | >85% (Axe) | <5% False Positives.
*   **Alert Latency:** <8 seconds from event to Dashboard/SMS notification.
*   **Energy Autonomy:** 100% solar uptime; minimum 72-hour battery buffer for monsoon seasons.
*   **Node Range:** Consistent 2.5km LoRa coverage in high-density canopy.

---

### 12. Deployment & Maintenance Strategy
*   **Deployment:** Nodes to be mounted at a height of 10-15ft to optimize solar intake and PIR range while preventing animal interference.
*   **Maintenance:** Bi-annual physical inspection of solar panels; remote over-the-air (OTA) firmware health checks via the dashboard.
*   **Field Kits:** Forest Rangers equipped with "Field Configurator" apps to diagnose nodes via Bluetooth without unmounting.

---

### 13. Estimated Budget (Prototype Phase)
| Category | Item | Approx. Cost (INR) |
| :--- | :--- | :--- |
| **Edge Hardware** | ESP32-S3 + Sensors + LoRa + Solar | ₹4,500 / node |
| **Gateway** | Raspberry Pi 5 + LoRa HAT + Casing | ₹12,000 / gateway |
| **Cloud/Infra** | Database + Hosting (1 Year) | ₹15,000 |
| **Miscellaneous** | Enclosures (IP67) + Mounting Hardware | ₹1,000 / node |

---

### 14. Conclusion
VanRakshak AI is not just a tool; it is a **Force Multiplier** for forest conservation. By bringing intelligence to the edge, we eliminate the blind spots that have allowed illegal logging to devastate our planet for decades. We are building the "Internet of Trees" to ensure the lungs of our planet remain breathing.
