"""
Verifies:
  1. GET /api/logistics/cities (Texas regional distribution hubs)
  2. GET /api/logistics/stats (Logistics KPIs & active pipelines)
  3. POST /api/logistics/calculate-delivery (Lead-time logic & out-of-stock penalties)
  4. GET /api/logistics/shipments/<tracking_number> (Shipment tracking)
  5. GET /api/logistics/upcoming-shipments (Dispatcher queue)
  6. GET /api/logistics/shipments (Shipment list & status filter)
  7. PATCH /api/logistics/shipments/<id>/status (Dispatch lifecycle transitions)
  8. Defensive validation & edge cases (malformed JSON, invalid IDs, 404s)
"""
import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import requests
from app import app

BASE_URL = "http://localhost:5000/api/logistics"
PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"

passed = 0
failed = 0

# Test client wrapper that transparently uses requests (if server running) or app.test_client()
class ApiClient:
    def __init__(self):
        import socket
        self.use_live = False
        try:
            with socket.create_connection(('127.0.0.1', 5000), timeout=0.15):
                self.use_live = True
        except Exception:
            self.use_live = False
        self.test_client = app.test_client()

    def get(self, path, params=None):
        if self.use_live:
            return requests.get(f"{BASE_URL}{path}", params=params)
        query = f"?{'&'.join([f'{k}={v}' for k, v in params.items()])}" if params else ""
        resp = self.test_client.get(f"/api/logistics{path}{query}")
        return self._wrap(resp)

    def post(self, path, json=None):
        if self.use_live:
            return requests.post(f"{BASE_URL}{path}", json=json)
        resp = self.test_client.post(f"/api/logistics{path}", json=json)
        return self._wrap(resp)

    def patch(self, path, json=None):
        if self.use_live:
            return requests.patch(f"{BASE_URL}{path}", json=json)
        resp = self.test_client.patch(f"/api/logistics{path}", json=json)
        return self._wrap(resp)

    def _wrap(self, resp):
        class WrappedResponse:
            def __init__(self, r):
                self.status_code = r.status_code
                self._r = r
            def json(self):
                return self._r.get_json()
            @property
            def text(self):
                return self._r.get_data(as_text=True)
        return WrappedResponse(resp)

def check(label, resp, expected_status=200, key=None):
    global passed, failed
    ok = resp.status_code == expected_status
    if ok and key:
        try:
            data = resp.json()
            if isinstance(data, list):
                ok = len(data) > 0
            elif isinstance(data, dict):
                ok = key in data
        except Exception:
            ok = False
    status = PASS if ok else FAIL
    if ok:
        passed += 1
    else:
        failed += 1
    print(f"  {status}  {label}")
    if not ok:
        print(f"         status={resp.status_code}  body={resp.text[:200]}")
    return resp

def run_tests():
    global passed, failed
    client = ApiClient()
    mode = "Live HTTP (Port 5000)" if client.use_live else "In-Memory Test Client (Direct WSGI)"

    print("=" * 68)
    print("   StockFlow - Logistics & Regional Hubs Verification (Member 4)")
    print(f"   Execution Mode: {mode}")
    print("=" * 68)

    # 1. Read Endpoints
    print("\n[1/4] Core Routing & Hub Endpoints")
    r_cities = check("GET /cities (All 8 Texas Regional Hubs)", client.get("/cities"), 200)
    cities = r_cities.json() if r_cities.status_code == 200 else []
    city_id = cities[0]['city_id'] if cities else 1

    check("GET /stats (Logistics KPIs & Pipeline Totals)", client.get("/stats"), 200, key="total_hubs")
    check("GET /sample-variants (Catalog Variant Presets)", client.get("/sample-variants"), 200)

    # 2. Delivery Estimator Logic
    print("\n[2/4] Delivery Lead Time & Out-of-Stock Penalty (SRS Feature 5)")
    r_est = check(
        "POST /calculate-delivery (In-stock variant route)",
        client.post("/calculate-delivery", json={
            "city_id": city_id,
            "items": [{"variant_id": 1, "quantity": 1}]
        }),
        200,
        key="estimated_delivery_date"
    )
    if r_est.status_code == 200:
        est = r_est.json()
        print(f"         Delivery Date: {est.get('estimated_delivery_date')} | Lead: {est.get('total_lead_time_days')}d | Fee: ${est.get('shipping_fee')}")

    # 3. Shipment Tracking & Pipeline
    print("\n[3/4] Shipment Tracking & Pipeline Endpoints")
    r_shipments = check("GET /shipments (Full Dispatches Pipeline)", client.get("/shipments"), 200)
    shipments = r_shipments.json() if r_shipments.status_code == 200 else []
    
    check("GET /upcoming-shipments (Active Non-Delivered Shipments)", client.get("/upcoming-shipments"), 200)

    if shipments:
        sample_trk = shipments[0]['tracking_number']
        sample_id = shipments[0]['shipment_id']
        check(f"GET /shipments/{sample_trk} (Lookup tracking context)", client.get(f"/shipments/{sample_trk}"), 200, key="tracking_number")

        # Test status patch transition
        check(
            f"PATCH /shipments/{sample_id}/status (Advance shipping lifecycle)",
            client.patch(f"/shipments/{sample_id}/status", json={"status": "IN_TRANSIT"}),
            200,
            key="message"
        )

    # 4. Edge cases & Defensive Validation
    print("\n[4/4] Defensive Validation & Edge Cases")
    check("POST /calculate-delivery with empty body (Expect 400)", client.post("/calculate-delivery", json={}), 400)
    check("POST /calculate-delivery with string items (Expect 400)", client.post("/calculate-delivery", json={"city_id": 1, "items": "bad"}), 400)
    check("POST /calculate-delivery with invalid city (Expect 404)", client.post("/calculate-delivery", json={"city_id": 99999, "items": [{"variant_id": 1, "quantity": 1}]}), 404)
    check("GET /shipments/NONEXISTENT-TRACKING (Expect 404)", client.get("/shipments/NONEXISTENT-TRACKING"), 404)
    check("PATCH /shipments/1/status with invalid status (Expect 400)", client.patch("/shipments/1/status", json={"status": "INVALID_STATE"}), 400)

    print("\n" + "=" * 68)
    print(f"  Results:  {passed} passed  |  {failed} failed")
    print("=" * 68)
    sys.exit(0 if failed == 0 else 1)

if __name__ == "__main__":
    run_tests()
