import sys
import requests

BASE = "http://localhost:5000/api/catalog"
PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"

created_id = None
passed = 0
failed = 0

def check(label, resp, expected_status=200, key=None):
    global passed, failed
    ok = resp.status_code == expected_status
    if ok and key:
        ok = key in resp.json()
    status = PASS if ok else FAIL
    if ok:
        passed += 1
    else:
        failed += 1
    print(f"  {status}  {label}")
    if not ok:
        print(f"         status={resp.status_code}  body={resp.text[:200]}")
    return resp

print("=" * 55)
print("   StockFlow - Catalog API Tests (Member 1)")
print("=" * 55)

# --- GET endpoints ---
print("\n[1/3] Read endpoints")

r = check("GET /categories", requests.get(f"{BASE}/categories"))
cats = r.json()
cat_id = cats[0]['category_id'] if cats else None

r = check("GET /products (all)", requests.get(f"{BASE}/products"))
prods = r.json()
prod_id = prods[0]['product_id'] if prods else None

if cat_id:
    check("GET /products?category_id=<id>",
          requests.get(f"{BASE}/products?category_id={cat_id}"))

check("GET /products?q=<term>",
      requests.get(f"{BASE}/products?q=a"))

if cat_id:
    check("GET /products?category_id=<id>&q=<term> (combined)",
          requests.get(f"{BASE}/products?category_id={cat_id}&q=a"))

if prod_id:
    r = check(f"GET /products/{prod_id} (detail + variants)",
              requests.get(f"{BASE}/products/{prod_id}"))
    if 'variants' not in r.json():
        print(f"         [WARN]  'variants' key missing in response")

check("GET /inventory/low-stock (default threshold=10)",
      requests.get(f"{BASE}/inventory/low-stock"))
check("GET /inventory/low-stock?threshold=50",
      requests.get(f"{BASE}/inventory/low-stock?threshold=50"))

# --- Write endpoints ---
print("\n[2/3] Write endpoints")

payload = {
    "title":       "Test Product (auto-created)",
    "description": "Created by test_catalog.py - safe to delete",
    "base_price":  9.99,
    "category_id": cat_id or 1
}
r = check("POST /products (create)",
          requests.post(f"{BASE}/products", json=payload), expected_status=201, key="product_id")
if r.status_code == 201:
    created_id = r.json().get("product_id")
    print(f"         created product_id = {created_id}")

if created_id:
    check("PATCH /products/<id> (update title + price)",
          requests.patch(f"{BASE}/products/{created_id}",
                         json={"title": "Test Product (updated)", "base_price": 19.99}))
    check("PATCH /products/<id> with invalid field (expect 400)",
          requests.patch(f"{BASE}/products/{created_id}",
                         json={"nonexistent_field": "x"}), expected_status=400)

if created_id:
    check("DELETE /products/<id> (soft-delete)",
          requests.delete(f"{BASE}/products/{created_id}"))
    r = requests.get(f"{BASE}/products/{created_id}")
    data = r.json() if r.status_code == 200 else {}
    if data.get('is_active') == 0:
        print(f"  {PASS}  Verified is_active = 0 after delete")
        passed += 1
    else:
        print(f"  {FAIL}  is_active not 0 after soft-delete (got: {data.get('is_active')})")
        failed += 1

# --- Edge cases ---
print("\n[3/3] Edge cases")

check("GET /products/999999 (not found -> 404)",
      requests.get(f"{BASE}/products/999999"), expected_status=404)
check("POST /products missing fields (expect 500 or 400)",
      requests.post(f"{BASE}/products", json={}), expected_status=500)

# --- Summary ---
print()
print("=" * 55)
print(f"  Results:  {passed} passed  |  {failed} failed")
print("=" * 55)
sys.exit(0 if failed == 0 else 1)
