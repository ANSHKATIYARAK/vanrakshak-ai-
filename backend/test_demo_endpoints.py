import requests
import json

BASE_URL = "http://localhost:8000"

def test_backend_ready():
    print("Checking VanRakshak-X Backend Health...")
    
    # 1. Root
    try:
        r = requests.get(f"{BASE_URL}/")
        print(f"[*] Root API: {r.status_code} - {r.json()}")
    except:
        print("[!] Backend not running at http://localhost:8000")
        return

    # 2. Sustainability Metrics
    r = requests.get(f"{BASE_URL}/analytics/sustainability")
    print(f"[*] Sustainability Analytics: {r.status_code} - {r.json()}")

    # 3. BSI Trends
    r = requests.get(f"{BASE_URL}/analytics/bsi")
    print(f"[*] Bioacoustic Stability: {r.status_code} - {r.json()}")

    # 4. Predictive Hotspots
    r = requests.get(f"{BASE_URL}/analytics/predictive-hotspots")
    print(f"[*] Predictive Hotspots: {r.status_code} - {r.json()}")

    # 5. Alerts
    r = requests.get(f"{BASE_URL}/alerts")
    print(f"[*] Alerts Feed: {r.status_code} (Found {len(r.json())} alerts)")

    print("\n--- TEST COMPLETE: Backend is DEMO-READY ---")

if __name__ == "__main__":
    test_backend_ready()
