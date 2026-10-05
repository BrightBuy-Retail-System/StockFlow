import os
import sys
import unittest
from flask_jwt_extended import create_access_token

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

# pyrefly: ignore [missing-import]
from app import app
# pyrefly: ignore [missing-import]
from db import get_db_connection


class TestOrdersAPI(unittest.TestCase):

    def setUp(self):
        self.client = app.test_client()
        with app.app_context():
            # Mint customer token (user_id: 4, role_id: 1)
            self.customer_token = create_access_token(
                identity="4",
                additional_claims={"username": "Test Customer", "role_id": 1, "email": "customer@brightbuy.test"}
            )
            # Mint manager token (user_id: 2, role_id: 2)
            self.manager_token = create_access_token(
                identity="2",
                additional_claims={"username": "Test Manager", "role_id": 2, "email": "manager@brightbuy.test"}
            )
        self.customer_headers = {'Authorization': f'Bearer {self.customer_token}'}
        self.manager_headers = {'Authorization': f'Bearer {self.manager_token}'}

    def test_01_ping_health_check(self):
        res = self.client.get('/api/orders/ping')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'healthy')

    def test_02_get_order_by_id_success(self):
        res = self.client.get('/api/orders/1', headers=self.customer_headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'success')
        order = data.get('data', {})
        self.assertEqual(order.get('order_id'), 1)
        self.assertIn('items', order)

    def test_03_get_order_by_id_not_found(self):
        res = self.client.get('/api/orders/99999', headers=self.manager_headers)
        self.assertEqual(res.status_code, 404)

    def test_04_get_user_orders_with_line_items(self):
        res = self.client.get('/api/orders/user/4', headers=self.customer_headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'success')
        self.assertTrue(all('items' in o for o in data.get('data', [])))

    def test_05_get_user_orders_empty_history(self):
        res = self.client.get('/api/orders/user/99999', headers=self.manager_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json().get('count'), 0)

    def test_06_checkout_validation_missing_fields(self):
        res = self.client.post('/api/orders/checkout', json={"user_id": 4, "items": []}, headers=self.customer_headers)
        self.assertEqual(res.status_code, 400)

    def test_07_checkout_validation_invalid_quantity(self):
        payload = {
            "user_id": 4,
            "shipping_city_id": 1,
            "items": [{"variant_id": 1, "quantity": 0}]
        }
        res = self.client.post('/api/orders/checkout', json=payload, headers=self.customer_headers)
        self.assertEqual(res.status_code, 400)

    def test_08_checkout_validation_success(self):
        payload = {
            "user_id": 4,
            "shipping_city_id": 1,
            "validate_only": True,
            "items": [{"variant_id": 1, "quantity": 1}]
        }
        res = self.client.post('/api/orders/checkout', json=payload, headers=self.customer_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json().get('status'), 'verified')

    def test_09_checkout_nonexistent_user(self):
        payload = {
            "user_id": 99999,
            "shipping_city_id": 1,
            "items": [{"variant_id": 1, "quantity": 1}]
        }
        res = self.client.post('/api/orders/checkout', json=payload, headers=self.manager_headers)
        self.assertEqual(res.status_code, 404)

    def test_10_checkout_nonexistent_city(self):
        payload = {
            "user_id": 4,
            "shipping_city_id": 99999,
            "items": [{"variant_id": 1, "quantity": 1}]
        }
        res = self.client.post('/api/orders/checkout', json=payload, headers=self.customer_headers)
        self.assertEqual(res.status_code, 404)

    def test_11_checkout_verified_pricing(self):
        payload = {
            "user_id": 4,
            "shipping_city_id": 1,
            "validate_only": True,
            "items": [{"variant_id": 1, "quantity": 1}]
        }
        res = self.client.post('/api/orders/checkout', json=payload, headers=self.customer_headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'verified')
        calc = data.get('calculation', {})
        self.assertEqual(calc['total_amount'], round(calc['subtotal'] + calc['shipping_fee'], 2))

    def test_12_checkout_insufficient_stock_conflict(self):
        payload = {
            "user_id": 4,
            "shipping_city_id": 1,
            "items": [{"variant_id": 1, "quantity": 999999}]
        }
        res = self.client.post('/api/orders/checkout', json=payload, headers=self.customer_headers)
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.get_json().get('code'), 'OUT_OF_STOCK')

    def test_13_checkout_transaction_success(self):
        """Verifies full ACID checkout: creates shipment, creates order, and decrements inventory."""
        # 1. Inspect stock prior to purchase
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT stock_quantity FROM inventory WHERE variant_id = 1")
        initial_stock = cur.fetchone()['stock_quantity']
        cur.close()
        conn.close()

        # 2. Place an order for 1 unit
        payload = {
            "user_id": 4,
            "shipping_city_id": 1,
            "items": [{"variant_id": 1, "quantity": 1}]
        }
        res = self.client.post('/api/orders/checkout', json=payload, headers=self.customer_headers)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'success')
        created_order_id = data['data']['order_id']
        self.assertIsNotNone(created_order_id)
        self.assertIsNotNone(data['data']['shipment_id'])
        self.assertIsNotNone(data['data']['tracking_number'])

        # 3. Assert inventory was decremented by exactly 1
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT stock_quantity FROM inventory WHERE variant_id = 1")
        updated_stock = cur.fetchone()['stock_quantity']
        cur.close()
        conn.close()
        self.assertEqual(updated_stock, initial_stock - 1)

        # 4. Assert the newly created order is immediately retrievable via GET /api/orders/<id>
        verify_res = self.client.get(f'/api/orders/{created_order_id}', headers=self.customer_headers)
        self.assertEqual(verify_res.status_code, 200)
        verify_data = verify_res.get_json().get('data', {})
        self.assertEqual(verify_data.get('order_id'), created_order_id)
        self.assertEqual(len(verify_data.get('items', [])), 1)

    # --- Role-Based Access Control Verification ---
    def test_14_unauthenticated_request_rejected(self):
        """Verifies endpoints reject requests missing a JWT Bearer token with 401."""
        res = self.client.get('/api/orders/1')
        self.assertEqual(res.status_code, 401)

    def test_15_customer_forbidden_on_manager_feed(self):
        """Verifies Customer (role 1) is rejected from the system-wide orders list."""
        res = self.client.get('/api/orders/', headers=self.customer_headers)
        self.assertEqual(res.status_code, 403)

    def test_16_manager_can_access_all_orders_feed(self):
        """Verifies Manager (role 2) can view system-wide orders list."""
        res = self.client.get('/api/orders/', headers=self.manager_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json().get('status'), 'success')

    def test_17_customer_cannot_update_order_status(self):
        """Verifies Customer (role 1) is forbidden from altering order status (HTTP 403)."""
        res = self.client.patch('/api/orders/1/status', json={"status": "SHIPPED"}, headers=self.customer_headers)
        self.assertEqual(res.status_code, 403)

    def test_18_invalid_status_rejected(self):
        """Verifies manager submitting an unrecognized status receives HTTP 400."""
        res = self.client.patch('/api/orders/1/status', json={"status": "FLYING"}, headers=self.manager_headers)
        self.assertEqual(res.status_code, 400)

    def test_19_manager_transition_to_shipped_syncs_shipment(self):
        """Verifies Manager updating an order to SHIPPED updates shipment to DISPATCHED."""
        # 1. Place a test order
        checkout_res = self.client.post('/api/orders/checkout', json={
            "user_id": 4, "shipping_city_id": 1, "items": [{"variant_id": 1, "quantity": 1}]
        }, headers=self.customer_headers)
        self.assertEqual(checkout_res.status_code, 201)
        created_order = checkout_res.get_json()['data']
        order_id = created_order['order_id']
        shipment_id = created_order['shipment_id']

        # 2. Manager patches status to SHIPPED
        patch_res = self.client.patch(f'/api/orders/{order_id}/status', json={"status": "SHIPPED"}, headers=self.manager_headers)
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.get_json()['data']['status'], 'SHIPPED')

        # 3. Assert shipment in DB was synced to DISPATCHED
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT shipping_status, dispatched_at FROM shipments WHERE shipment_id = %s", (shipment_id,))
        shipment = cur.fetchone()
        cur.close()
        conn.close()

        self.assertEqual(shipment['shipping_status'], 'DISPATCHED')
        self.assertIsNotNone(shipment['dispatched_at'])

    def test_20_manager_cancel_order_restocks_inventory(self):
        """Verifies cancelling an order restores the decremented inventory stock."""
        # 1. Check stock before placement
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT stock_quantity FROM inventory WHERE variant_id = 1")
        stock_before = cur.fetchone()['stock_quantity']
        cur.close()
        conn.close()

        # 2. Place an order for 2 units
        checkout_res = self.client.post('/api/orders/checkout', json={
            "user_id": 4, "shipping_city_id": 1, "items": [{"variant_id": 1, "quantity": 2}]
        }, headers=self.customer_headers)
        self.assertEqual(checkout_res.status_code, 201)
        order_id = checkout_res.get_json()['data']['order_id']

        # 3. Manager cancels order
        cancel_res = self.client.patch(f'/api/orders/{order_id}/status', json={"status": "CANCELLED"}, headers=self.manager_headers)
        self.assertEqual(cancel_res.status_code, 200)

        # 4. Check stock after cancellation -> must equal original baseline stock
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT stock_quantity FROM inventory WHERE variant_id = 1")
        stock_restored = cur.fetchone()['stock_quantity']
        cur.close()
        conn.close()

        self.assertEqual(stock_restored, stock_before)

    def test_21_checkout_creates_linked_payment_record(self):
        """Verifies ACID checkout inserts an immutable payment record tied to the order."""
        payload = {
            "user_id": 4,
            "shipping_city_id": 1,
            "payment_method": "CREDIT_CARD",
            "items": [{"variant_id": 1, "quantity": 1}]
        }
        res = self.client.post('/api/orders/checkout', json=payload, headers=self.customer_headers)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()['data']
        order_id = data['order_id']
        payment_id = data.get('payment_id')
        self.assertIsNotNone(payment_id)
        self.assertIsNotNone(data.get('transaction_ref'))

        # Inspect order via GET to confirm payment details are nested
        verify_res = self.client.get(f'/api/orders/{order_id}', headers=self.customer_headers)
        self.assertEqual(verify_res.status_code, 200)
        payment_data = verify_res.get_json()['data'].get('payment')
        self.assertIsNotNone(payment_data)
        self.assertEqual(payment_data['payment_id'], payment_id)
        self.assertEqual(payment_data['payment_method'], 'CREDIT_CARD')
        self.assertEqual(payment_data['amount'], data['total_amount'])

    def test_22_get_shipping_cities_catalog(self):
        """Verifies shipping cities endpoint returns Texas hubs, fees, and lead times from DB."""
        res = self.client.get('/api/orders/shipping-cities')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'success')
        self.assertGreater(data.get('count', 0), 0)
        
        first_city = data.get('data', [])[0]
        self.assertIn('city_id', first_city)
        self.assertIn('city_name', first_city)
        self.assertIn('shipping_fee', first_city)
        self.assertIn('base_lead_time_days', first_city)


if __name__ == '__main__':
    unittest.main()