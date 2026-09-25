import os
import sys
import unittest

# Ensure the backend directory is in sys.path so modules like db.py resolve cleanly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

# pyrefly: ignore [missing-import]
from app import app


class TestOrdersAPI(unittest.TestCase):

    def setUp(self):
        """Create a new test client before every individual test."""
        self.client = app.test_client()

    # --- Phase 1: Gateway & Blueprint ---
    def test_01_ping_health_check(self):
        """Verifies the blueprint route is properly mounted under /api/orders."""
        res = self.client.get('/api/orders/ping')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'healthy')
        self.assertEqual(data.get('module'), 'orders')

    # --- Phase 2: Single Order Retrieval ---
    def test_02_get_order_by_id_success(self):
        """Verifies Order #1 header and line items load correctly from TiDB."""
        res = self.client.get('/api/orders/1')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'success')

        order = data.get('data', {})
        self.assertEqual(order.get('order_id'), 1)
        self.assertEqual(order.get('user_id'), 4)
        self.assertIn('items', order)
        self.assertIsInstance(order['items'], list)
        self.assertGreater(len(order['items']), 0)
        self.assertIn('product_title', order['items'][0])

    def test_03_get_order_by_id_not_found(self):
        """Verifies querying an invalid order ID safely returns an HTTP 404."""
        res = self.client.get('/api/orders/99999')
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'error')
        self.assertIn('not found', data.get('message', '').lower())

    # --- Phase 3: Customer Order History ---
    def test_04_get_user_orders_with_line_items(self):
        """Verifies past orders for user #4 return with nested line items."""
        res = self.client.get('/api/orders/user/4')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'success')
        self.assertGreaterEqual(data.get('count'), 1)

        orders = data.get('data', [])
        self.assertIsInstance(orders, list)
        self.assertTrue(all('items' in o for o in orders))

    def test_05_get_user_orders_empty_history(self):
        """Verifies user with no orders returns 200 with an empty list."""
        res = self.client.get('/api/orders/user/99999')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'success')
        self.assertEqual(data.get('count'), 0)
        self.assertEqual(data.get('data'), [])

    # --- Phase 4: Checkout Input Validation ---
    def test_06_checkout_validation_missing_fields(self):
        """Verifies checkout rejects payloads missing required fields with HTTP 400."""
        # Missing shipping_city_id and invalid empty items
        payload = {
            "user_id": 4,
            "items": []
        }
        res = self.client.post('/api/orders/checkout', json=payload)
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'error')

    def test_07_checkout_validation_invalid_quantity(self):
        """Verifies items with non-positive quantities trigger an HTTP 400."""
        payload = {
            "user_id": 4,
            "shipping_city_id": 1,
            "items": [
                {"variant_id": 1, "quantity": 0}
            ]
        }
        res = self.client.post('/api/orders/checkout', json=payload)
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'error')
        self.assertIn('quantity', data.get('message', '').lower())

    def test_08_checkout_validation_success(self):
        """Verifies a structurally valid checkout payload passes pre-flight checks."""
        payload = {
            "user_id": 4,
            "shipping_city_id": 1,
            "items": [
                {"variant_id": 1, "quantity": 2}
            ]
        }
        res = self.client.post('/api/orders/checkout', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'verified')

    def test_09_checkout_nonexistent_user(self):
        """Verifies checkout returns 404 if the user ID does not exist in the database."""
        payload = {
            "user_id": 99999,
            "shipping_city_id": 1,
            "items": [{"variant_id": 1, "quantity": 1}]
        }
        res = self.client.post('/api/orders/checkout', json=payload)
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertIn("user #99999 does not exist", data.get('message', '').lower())

    def test_10_checkout_nonexistent_city(self):
        """Verifies checkout returns 404 if the Texas city ID does not exist."""
        payload = {
            "user_id": 4,
            "shipping_city_id": 99999,
            "items": [{"variant_id": 1, "quantity": 1}]
        }
        res = self.client.post('/api/orders/checkout', json=payload)
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertIn("shipping city #99999 does not exist", data.get('message', '').lower())

    def test_11_checkout_verified_pricing(self):
        """Verifies server fetches real prices and computes subtotal + shipping fee accurately."""
        payload = {
            "user_id": 4,
            "shipping_city_id": 1,
            "items": [{"variant_id": 1, "quantity": 1}]
        }
        res = self.client.post('/api/orders/checkout', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'verified')

        calc = data.get('calculation', {})
        self.assertIn('shipping_fee', calc)
        self.assertIn('subtotal', calc)
        self.assertEqual(calc['total_amount'], round(calc['subtotal'] + calc['shipping_fee'], 2))


if __name__ == '__main__':
    unittest.main()