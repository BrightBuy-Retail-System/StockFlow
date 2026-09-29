import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

# pyrefly: ignore [missing-import]
from app import app
# pyrefly: ignore [missing-import]
from db import get_db_connection


class TestOrdersAPI(unittest.TestCase):

    def setUp(self):
        self.client = app.test_client()

    def test_01_ping_health_check(self):
        res = self.client.get('/api/orders/ping')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'healthy')

    def test_02_get_order_by_id_success(self):
        res = self.client.get('/api/orders/1')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'success')
        order = data.get('data', {})
        self.assertEqual(order.get('order_id'), 1)
        self.assertIn('items', order)

    def test_03_get_order_by_id_not_found(self):
        res = self.client.get('/api/orders/99999')
        self.assertEqual(res.status_code, 404)

    def test_04_get_user_orders_with_line_items(self):
        res = self.client.get('/api/orders/user/4')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'success')
        self.assertTrue(all('items' in o for o in data.get('data', [])))

    def test_05_get_user_orders_empty_history(self):
        res = self.client.get('/api/orders/user/99999')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json().get('count'), 0)

    def test_06_checkout_validation_missing_fields(self):
        res = self.client.post('/api/orders/checkout', json={"user_id": 4, "items": []})
        self.assertEqual(res.status_code, 400)

    def test_07_checkout_validation_invalid_quantity(self):
        payload = {
            "user_id": 4,
            "shipping_city_id": 1,
            "items": [{"variant_id": 1, "quantity": 0}]
        }
        res = self.client.post('/api/orders/checkout', json=payload)
        self.assertEqual(res.status_code, 400)

    def test_08_checkout_validation_success(self):
        payload = {
            "user_id": 4,
            "shipping_city_id": 1,
            "validate_only": True,
            "items": [{"variant_id": 1, "quantity": 1}]
        }
        res = self.client.post('/api/orders/checkout', json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json().get('status'), 'verified')

    def test_09_checkout_nonexistent_user(self):
        payload = {
            "user_id": 99999,
            "shipping_city_id": 1,
            "items": [{"variant_id": 1, "quantity": 1}]
        }
        res = self.client.post('/api/orders/checkout', json=payload)
        self.assertEqual(res.status_code, 404)

    def test_10_checkout_nonexistent_city(self):
        payload = {
            "user_id": 4,
            "shipping_city_id": 99999,
            "items": [{"variant_id": 1, "quantity": 1}]
        }
        res = self.client.post('/api/orders/checkout', json=payload)
        self.assertEqual(res.status_code, 404)

    def test_11_checkout_verified_pricing(self):
        payload = {
            "user_id": 4,
            "shipping_city_id": 1,
            "validate_only": True,
            "items": [{"variant_id": 1, "quantity": 1}]
        }
        res = self.client.post('/api/orders/checkout', json=payload)
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
        res = self.client.post('/api/orders/checkout', json=payload)
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
        res = self.client.post('/api/orders/checkout', json=payload)
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
        verify_res = self.client.get(f'/api/orders/{created_order_id}')
        self.assertEqual(verify_res.status_code, 200)
        verify_data = verify_res.get_json().get('data', {})
        self.assertEqual(verify_data.get('order_id'), created_order_id)
        self.assertEqual(len(verify_data.get('items', [])), 1)


if __name__ == '__main__':
    unittest.main()