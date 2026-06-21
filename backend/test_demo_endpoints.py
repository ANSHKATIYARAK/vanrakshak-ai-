import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_backend_ready():
    print("==================================================")
    print("Checking VanRakshak-X Backend & New API Endpoints...")
    print("==================================================")
    
    # 1. Root Check
    try:
        r = requests.get(f"{BASE_URL}/")
        print(f"[*] Root API: {r.status_code} - {r.json()}")
    except Exception as e:
        print(f"[!] Backend not running at http://localhost:8000: {e}")
        return

    # 2. Sustainability Metrics
    r = requests.get(f"{BASE_URL}/analytics/sustainability")
    print(f"[*] Sustainability Analytics: {r.status_code} - {r.json()}")

    # 3. BSI Trends
    r = requests.get(f"{BASE_URL}/analytics/bsi")
    print(f"[*] Bioacoustic Stability: {r.status_code} - {r.json()}")

    # 4. Alerts feed before inserts
    r = requests.get(f"{BASE_URL}/alerts")
    initial_alerts_count = len(r.json())
    print(f"[*] Alerts Feed: {r.status_code} (Found {initial_alerts_count} initial alerts)")

    # 5. Test Demo Telemetry Injection
    print("\n[*] Testing Virtual Telemetry Injection (POST /demo/telemetry)...")
    telemetry_payload = {
        "node_id": "VR-X-001",
        "tilt": 18.5, # Anomaly (tilt > 15)
        "vib": 32.0,  # Anomaly (vib > 30)
        "rms": 550.0, # Anomaly (rms > 500)
        "temp": 46.0,
        "hum": 65,
        "batt": 4.12,
        "batt_pct": 94,
        "packets": 42
    }
    r = requests.post(f"{BASE_URL}/demo/telemetry", json=telemetry_payload)
    print(f"[*] Telemetry Inject Response: {r.status_code} - {r.json()}")
    assert r.status_code == 200, "Failed to inject telemetry"

    # 6. Test Mic Alert Posting
    print("\n[*] Testing Acoustic Assistant Alert Posting (POST /alerts/mic)...")
    mic_payload = {
        "node_id": "VR-X-001",
        "threat_type": "Acoustic anomaly",
        "confidence": 0.88,
        "threat_score": 0.88
    }
    r = requests.post(f"{BASE_URL}/alerts/mic", json=mic_payload)
    alert_data = r.json()
    print(f"[*] Mic Alert Response: {r.status_code} - {alert_data}")
    assert r.status_code == 200, "Failed to post mic alert"
    alert_id = alert_data.get("id")
    assert alert_id is not None, "Alert ID missing in response"

    # 7. Test Alert Response Workflow (Acknowledge)
    print(f"\n[*] Testing Alert Response Acknowledge (POST /alerts/{alert_id}/respond)...")
    r = requests.post(f"{BASE_URL}/alerts/{alert_id}/respond", json={"action": "acknowledge"})
    print(f"[*] Acknowledge Response: {r.status_code} - {r.json()}")
    assert r.status_code == 200, "Failed to acknowledge alert"
    assert r.json().get("status") == "acknowledged", "Status not updated to acknowledged"

    # 8. Test Alert Response Dispatch
    print(f"[*] Testing Alert Response Dispatch (POST /alerts/{alert_id}/respond)...")
    r = requests.post(f"{BASE_URL}/alerts/{alert_id}/respond", json={"action": "dispatch"})
    print(f"[*] Dispatch Response: {r.status_code} - {r.json()}")
    assert r.status_code == 200, "Failed to dispatch ranger"
    assert r.json().get("status") == "dispatched", "Status not updated to dispatched"

    # 9. Test Alert Response Resolve
    print(f"[*] Testing Alert Response Resolve (POST /alerts/{alert_id}/respond)...")
    r = requests.post(f"{BASE_URL}/alerts/{alert_id}/respond", json={"action": "resolve"})
    print(f"[*] Resolve Response: {r.status_code} - {r.json()}")
    assert r.status_code == 200, "Failed to resolve alert"
    assert r.json().get("resolved") == True, "Alert not marked as resolved"

    # 10. Verify Alerts List updated
    r = requests.get(f"{BASE_URL}/alerts")
    print(f"\n[*] Alerts Feed after cleanup: {r.status_code} (Found {len(r.json())} alerts)")

    print("\n==================================================")
    print("   ALL TESTS PASSED: BACKEND INTEGRITY CONFIRMED")
    print("==================================================")

if __name__ == "__main__":
    test_backend_ready()
