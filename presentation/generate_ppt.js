const pptxgen = require("pptxgenjs");
let pres = new pptxgen();

const BG = "030508", ECO = "34D399", RED = "F87171", CYAN = "22D3EE", AMB = "FBBF24", W = "F8FAFC", M = "94A3B8", D = "64748B";

pres.layout = "LAYOUT_WIDE";

pres.defineSlideMaster({ title: "M", background: { color: BG }, objects: [
    { rect: { x: 0, y: 0, w: "100%", h: 0.04, fill: { color: ECO } } },
    { text: { text: "VANRAKSHAK-X  ·  SOVEREIGN INTELLIGENCE", options: { x: 0.6, y: 7, w: 5, h: 0.3, color: "475569", fontSize: 9, fontFace: "Courier New" } } }
]});

function s(ttl, hl) {
    let sl = pres.addSlide({ masterName: "M" });
    if (ttl) sl.addText(ttl, { x: 0.6, y: 0.4, w: 9, h: 0.3, fontSize: 10, color: ECO, fontFace: "Courier New", bold: true });
    if (hl) sl.addText(hl, { x: 0.6, y: 0.8, w: 11, h: 0.8, fontSize: 32, color: W, fontFace: "Arial", bold: true });
    return sl;
}

// S1
let s1 = s(null, "VanRakshak-X");
s1.addText("A real-time AI system for detecting and preventing ecological threats.", { x: 0.6, y: 1.8, w: 11, h: 0.5, fontSize: 18, color: M });
s1.addText("NATIONAL-SCALE ECOLOGICAL INTELLIGENCE INFRASTRUCTURE", { x: 3, y: 2.8, w: 7, h: 0.4, fontSize: 12, color: ECO, align: "center", border: { pt: 1, color: ECO } });
s1.addText("• The Distributed Oracle: A self-reporting environmental intelligence infrastructure.\n• National Interest: Protecting the state's most critical ecological assets.\n• Sovereign Security: Securing carbon borders and biodiversity stability.", { x: 1, y: 3.8, w: 10, h: 1.5, fontSize: 14, color: W });
s1.addNotes("Welcome. Today, we are not looking at a dashboard. We are looking at a national-scale ecological intelligence infrastructure.");

// S2
let s2 = s("SECTION 1 — OPENING & PROBLEM", "The Visibility Gap");
s2.addText("10M", { x: 1, y: 2.2, w: 4, h: 0.8, fontSize: 48, color: RED, bold: true, fontFace: "Courier New" });
s2.addText("HECTARES LOST / YEAR", { x: 1, y: 3, w: 4, h: 0.3, fontSize: 10, color: D });
s2.addText("$152B", { x: 6, y: 2.2, w: 4, h: 0.8, fontSize: 48, color: RED, bold: true, fontFace: "Courier New" });
s2.addText("ANNUAL CRIME COST", { x: 6, y: 3, w: 4, h: 0.3, fontSize: 10, color: D });
s2.addText("• Ecological Silence: The collapse of biodiversity before the first tree falls.\n• Climate Instability: 15% of global emissions from unmonitored deforestation.", { x: 0.6, y: 4, w: 11, h: 1.5, fontSize: 16, color: W });
s2.addNotes("Every year, we lose a forest the size of South Korea.");

// S3
let s3 = s(null, "The Consequence of Silence");
s3.addText("• Water Systems Destabilize: Loss of watershed integrity.\n• Wildlife Corridors Collapse: Fragmentation of migration paths.\n• Indigenous Communities lose protection: Threats to ancestral livelihoods.\n• Wildfires accelerate exponentially: Fuel buildup and dry-out.", { x: 0.6, y: 1.8, w: 11, h: 2.5, fontSize: 16, color: W });
s3.addText("\"Environmental collapse begins silently.\"", { x: 1, y: 5, w: 10, h: 0.5, fontSize: 20, color: AMB, italic: true });
s3.addNotes("When forests fall, it's not just trees that are lost.");

// S4
let s4 = s(null, "Reactive vs. Proactive");
s4.addText("• Satellite Latency: You only see what happened yesterday.\n• Patrol Fragmentation: Rangers cover <5% of dense terrain.\n• Acoustic Noise: Sensors fail to distinguish chainsaws from wind.\n• Information Gap: Loggers know the schedule; rangers are blind.", { x: 0.6, y: 1.8, w: 11, h: 3, fontSize: 16, color: W });
s4.addNotes("Our current methods are failing.");

// S5
let s5 = s(null, "The Technological Convergence");
s5.addText("• Edge AI Maturity: TinyML allows intelligence at the source.\n• Mesh Connectivity: LoRaWAN penetrates dense canopy.\n• Energy Autonomy: High-efficiency solar for multi-year deployment.\n• Institutional Urgency: Global carbon markets demand verifiable data.", { x: 0.6, y: 1.8, w: 11, h: 2.5, fontSize: 16, color: W });
s5.addText("\"The technology to build a living forest intelligence system finally exists.\"", { x: 1, y: 5, w: 10, h: 0.5, fontSize: 16, color: ECO, bold: true });

// S6
let s6 = s("SECTION 2 — THE CORE IDEA", "The Forest Nervous System");
s6.addText("• Autonomous Perception: A system that listens, feels, and understands.\n• Distributed Intelligence: Intelligence lives at the edge, not just the cloud.\n• Predictive Governance: Detecting threats before the first tree is felled.", { x: 0.6, y: 1.8, w: 11, h: 2.5, fontSize: 16, color: W });

// S7
let s7 = s(null, "The Intelligence Loop");
s7.addText("1. SENSE → 2. ANALYZE → 3. LOCALIZE → 4. ESCALATE → 5. ACT", { x: 0.6, y: 2, w: 11, h: 0.5, fontSize: 20, color: ECO, fontFace: "Courier New", align: "center" });
s7.addText("• Sense: Nodes monitor acoustic and seismic signatures.\n• Analyze: Edge AI identifies anomalies (Chainsaw vs. Wind).\n• Localize: TDOA mesh triangulates the source (±4.5m).\n• Escalate: Probabilistic threat scores trigger protocols.\n• Act: Rangers receive precise tactical routing.", { x: 0.6, y: 3, w: 11, h: 3, fontSize: 14, color: W });

// S8
let s8 = s(null, "The Operational Leap");
s8.addTable([
    [{ text: "Feature", options: { color: ECO, bold: true } }, { text: "Traditional", options: { bold: true } }, { text: "VanRakshak-X", options: { color: ECO, bold: true } }],
    ["Response Time", "Hours / Days", "< 2.5 Seconds"],
    ["Precision", "> 100m Radius", "± 4.5 Meters"],
    ["Detection", "Binary (On/Off)", "Probabilistic Fusion"],
    ["Intelligence", "Static / Reactive", "Living / Predictive"]
], { x: 0.6, y: 1.8, w: 11, border: { pt: 1, color: "334155" }, fill: "0F172A", color: W, fontSize: 14, colW: [3.5, 3.5, 4] });

// S9
let s9 = s("SECTION 3 — SYSTEM ARCHITECTURE", "The Vertical Intelligence Stack");
s9.addText("• Layer 1: Terrain (Sentinel Nodes): Edge-AI & Multimodal sensing.\n• Layer 2: Mesh (LoRa Tier-1): Resilient, long-range telemetry.\n• Layer 3: Command (Cloud OS): Bayesian predictive modeling.\n• Layer 4: Field (Rakshak App): Tactical routing & field verification.", { x: 0.6, y: 1.8, w: 11, h: 3, fontSize: 16, color: W });

// S10
let s10 = s(null, "Multimodal Sentinel Hardware");
s10.addText("• Bioacoustics: High-fidelity MEMS array for soundscape analysis.\n• Seismic/Tilt: MPU6050 for mechanical impact and tree inclination.\n• Environmental: Context-aware sensors for adaptive thresholding.\n• Energy: Solar-harvesting IP68 enclosures with biomimetic camouflage.", { x: 0.6, y: 1.8, w: 11, h: 3, fontSize: 16, color: W });

// S11
let s11 = s(null, "Intelligence at the Edge");
s11.addText("• TinyML 1D-CNN: Real-time classification on the ESP32-S3.\n• Ecological Silence: Detection of bird/insect activity drops.\n• Anomaly Scoring: Distinguishing chainsaws from wind/rain.\n• Power Efficient: Hierarchical wake-up logic for 5+ year lifespan.", { x: 0.6, y: 1.8, w: 11, h: 3, fontSize: 16, color: W });

// S12
let s12 = s(null, "The Probabilistic Threat Engine");
s12.addText("Tn+1 = αA + βV + γE + δH", { x: 1, y: 2.2, w: 10, h: 1, fontSize: 40, color: ECO, fontFace: "Courier New", align: "center" });
s12.addText("A: Acoustic Confidence  |  V: Seismic Resonance  |  E: Environmental Context  |  H: Historical Risk", { x: 1, y: 3.5, w: 10, h: 0.5, fontSize: 12, color: M, align: "center" });
s12.addText("\"The system thinks probabilistically, not reactively.\"", { x: 1, y: 5, w: 10, h: 0.5, fontSize: 16, color: ECO, align: "center" });

// S13
let s13 = s(null, "Precision Triangulation");
s13.addText("• TDOA Triangulation: ±4.5m precision via mesh timestamps.\n• Source Tracking: Real-time movement tracking of threats.\n• Ranger Routing: Converting coordinates to tactical paths.", { x: 0.6, y: 1.8, w: 11, h: 2, fontSize: 16, color: W });

// S14
let s14 = s(null, "Quantifying Ecosystem Stability");
s14.addText("F = 0.3B + 0.25N + 0.25E + 0.2S", { x: 1, y: 2.2, w: 10, h: 1, fontSize: 36, color: AMB, align: "center" });
s14.addText("• Biodiversity Audits: Real-time health metrics.\n• Conservation Scoring: Evidence-based protection data.\n• Carbon Verification: Verifiable integrity for offset markets.", { x: 0.6, y: 3.5, w: 11, h: 2, fontSize: 14, color: W });

// S15
let s15 = s("SECTION 4 — COMMAND & OPERATIONS", "The Ecological Operating System");
s15.addText("• Global View: Full-screen geospatial visualization.\n• Live Telemetry: Real-time streams from every node.\n• Threat Escalation: Color-coded alerts (Amber → Critical).\n• Tactical HUD: Control of field units and drone assets.", { x: 0.6, y: 1.8, w: 11, h: 3, fontSize: 16, color: W });

// S16
let s16 = s(null, "From Detection to Interdiction");
s16.addText("1. Detection: T < 2.5s (Acoustic/Seismic Fusion).\n2. Classification: Identification as 'Illegal Logging'.\n3. Localization: GPS Coordinate generation (TDOA).\n4. Dispatch: Alert routed to nearest field units.\n5. Closure: Incident logged on an immutable ledger.", { x: 0.6, y: 1.8, w: 11, h: 3, fontSize: 16, color: W });

// S17
let s17 = s(null, "Augmenting Authority");
s17.addText("• Ranger Validation: Field units confirm AI alerts.\n• Audio Snippets: 5s audio clips sent for human review.\n• Decision Support: AI provides the 'What' and 'Where'.", { x: 0.6, y: 1.8, w: 11, h: 2, fontSize: 16, color: W });
s17.addText("AI augments humans, not replaces them.", { x: 1, y: 5, w: 10, h: 0.5, fontSize: 18, color: CYAN, bold: true, align: "center" });

// S18
let s18 = s("SECTION 5 — IMPLEMENTATION", "Operational Readiness");
s18.addText("• MVP V1.0 Complete: Core sensing and TinyML active.\n• LoRa Mesh Validated: 2.5km range in dense canopy.\n• Geospatial UI Online: Bayesian backend operational.\n\nCURRENT CONSTRAINTS:\n• Dense rainforest calibration ongoing.\n• Long-duration field validation in progress.\n• Drone integration planned for V2.", { x: 0.6, y: 1.8, w: 11, h: 4, fontSize: 14, color: W });

// S19
let s19 = s(null, "The Architecture of Resilience");
s19.addText("• Offline-first edge intelligence: Processing at the source.\n• Low-power autonomous operation: Solar-autonomous nodes.\n• Encrypted mesh telemetry: Secure data backhaul.\n• Distributed resilience architecture: No single point of failure.", { x: 0.6, y: 1.8, w: 11, h: 3, fontSize: 16, color: W });

// S20
let s20 = s(null, "Hardened for the Wild");
s20.addText("• IP68 Enclosures: Monsoon and humidity resilient.\n• Self-Healing Mesh: Automatic rerouting if a node fails.\n• Fail-Safe Storage: Local buffering for outages.\n• False-Positive Filter: Fusion reduces errors to < 3.8%.", { x: 0.6, y: 1.8, w: 11, h: 3, fontSize: 16, color: W });

// S21
let s21 = s("WHY INDIA?", "Securing the National Biotope");
s21.addText("• Western Ghats: Protecting a global biodiversity hotspot.\n• Sundarbans: Securing critical mangrove ecosystems.\n• Northeast biodiversity zones: Monitoring remote frontiers.\n• Wildfire Vulnerability: Detecting early ignition in risk zones.", { x: 0.6, y: 1.8, w: 11, h: 3, fontSize: 16, color: W });
s21.addText("Protecting India's natural capital and carbon assets.", { x: 1, y: 5, w: 10, h: 0.5, fontSize: 14, color: ECO, align: "center" });

// S22
let s22 = s("SECTION 6 — IMPACT & FUTURE", "The Carbon Frontline");
s22.addText("-80%", { x: 0.6, y: 2.2, w: 3.5, h: 0.8, fontSize: 48, color: ECO, bold: true, fontFace: "Courier New" });
s22.addText("DETECTION LATENCY", { x: 0.6, y: 3, w: 3.5, h: 0.3, fontSize: 10, color: D });
s22.addText("22kg", { x: 4.5, y: 2.2, w: 3.5, h: 0.8, fontSize: 48, color: ECO, bold: true, fontFace: "Courier New" });
s22.addText("CO₂ / TREE / YEAR", { x: 4.5, y: 3, w: 3.5, h: 0.3, fontSize: 10, color: D });
s22.addText("\"Every minute gained in detection can save hectares of irreversible damage.\"", { x: 1, y: 5, w: 10, h: 0.5, fontSize: 16, color: ECO, align: "center" });

// S23
let s23 = s(null, "From Conservation to Asset Management");
s23.addText("• Biodiversity Tokens: Verifiable data for ecological markets.\n• Carbon Credit Integrity: 100% transparency for audits.\n• Resource Efficiency: Optimizing patrol budgets by 40%.", { x: 0.6, y: 1.8, w: 11, h: 2.5, fontSize: 16, color: W });

// S24
let s24 = s(null, "Regional to National Rollout");
s24.addText("• Modular Deployment: From single sectors to entire districts.\n• Autonomous Mesh Expansion: Plug-and-Play network nodes.\n• District Gateways: Hierarchical data for state control.", { x: 0.6, y: 1.8, w: 11, h: 2.5, fontSize: 16, color: W });

// S25
let s25 = s(null, "The Autonomous Future");
s25.addText("Phase 1: Sentinel Mesh (NOW) — Intelligence and Localization.\nPhase 2: Drone Interception — Automated visual confirmation.\nPhase 3: Satellite Fusion — Global-local synchronization.\nPhase 4: Predictive Wildfire AI — Early ignition modeling.", { x: 0.6, y: 1.8, w: 11, h: 3, fontSize: 16, color: W });

// S26
let s26 = s("SECTION 7 — VISION & CLOSING", "Ecosystem Infrastructure");
s26.addText("• Forests are Infrastructure: As critical as roads or power grids.\n• The Oracle of the Earth: We cannot protect what we cannot perceive.\n• Generational Security: Preserving the biotope for the future.", { x: 0.6, y: 1.8, w: 11, h: 2.5, fontSize: 16, color: W });

// S27
let s27 = s(null, "VanRakshak-X");
s27.addText("PREDICTIVE  ·  PROACTIVE  ·  POWERFUL", { x: 1, y: 2.5, w: 10, h: 0.5, fontSize: 20, color: ECO, align: "center", bold: true });
s27.addText("\"The lungs of the nation deserve the intelligence of the state.\"", { x: 1, y: 3.5, w: 10, h: 0.5, fontSize: 22, color: M, align: "center" });
s27.addText("[ INSTITUTIONAL CONTACT / QR ]", { x: 3.5, y: 5, w: 5, h: 0.4, fontSize: 11, color: CYAN, align: "center", border: { pt: 1, color: CYAN } });
s27.addNotes("This is the future of the Earth's governance. Thank you.");

pres.writeFile({ fileName: "vanraksha ppt.pptx" }).then(f => console.log("Saved:", f));
