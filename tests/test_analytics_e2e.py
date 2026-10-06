import os
import sys
import unittest
from decimal import Decimal
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app import app
from routes.analytics import serialize_row

class TestAnalyticsE2E(unittest.TestCase):
    """
    Phase 5: End-to-End Integration & Unit Test Suite for Member 5
    Covers:
      - Payment Processing Pipeline (ACID transaction, Card vs COD, Rollback)
      - Validation Checks (order_id, positive amounts, non-numeric guards)
      - Analytical Report Views (Quarterly Sales, Top Selling DENSE_RANK,
        Category ROLLUP, Customer Summary)
      - Row Serialization Utility
    """

    def setUp(self):
        self.client = app.test_client()

    # =========================================================================
    # 1. UNIT & SERIALIZATION TESTS
    # =========================================================================
    def test_01_serialize_row_primitives(self):
        from datetime import datetime, date
        row = {
            'revenue': Decimal('1499.50'),
            'date_field': date(2026, 10, 4),
            'timestamp_field': datetime(2026, 10, 4, 12, 30, 0),
            'order_id': 101,
            'status': 'Paid'
        }
        serialized = serialize_row(row)
        self.assertIsInstance(serialized['revenue'], float)
        self.assertEqual(serialized['revenue'], 1499.50)
        self.assertEqual(serialized['date_field'], '2026-10-04')
        self.assertEqual(serialized['timestamp_field'], '2026-10-04T12:30:00')
        self.assertEqual(serialized['order_id'], 101)

    # =========================================================================
    # 2. PAYMENT API VALIDATION TESTS (INPUT GUARDS)
    # =========================================================================
    def test_02_payment_missing_required_fields(self):
        # Missing payment_method
        res = self.client.post('/api/analytics/payments/process', json={'order_id': 1, 'amount': 100.0})
        self.assertEqual(res.status_code, 400)
        self.assertIn('required', res.get_json()['error'])

        # Missing order_id
        res = self.client.post('/api/analytics/payments/process', json={'amount': 100.0, 'payment_method': 'Card'})
        self.assertEqual(res.status_code, 400)

        # Missing amount
        res = self.client.post('/api/analytics/payments/process', json={'order_id': 1, 'payment_method': 'Card'})
        self.assertEqual(res.status_code, 400)

    def test_03_payment_invalid_amount_zero_or_negative(self):
        # Negative amount
        res = self.client.post('/api/analytics/payments/process', json={'order_id': 1, 'amount': -50.0, 'payment_method': 'Card'})
        self.assertEqual(res.status_code, 400)
        self.assertIn('greater than zero', res.get_json()['error'])

        # Zero amount
        res = self.client.post('/api/analytics/payments/process', json={'order_id': 1, 'amount': 0.0, 'payment_method': 'Card'})
        self.assertEqual(res.status_code, 400)

    def test_04_payment_non_numeric_amount(self):
        res = self.client.post('/api/analytics/payments/process', json={'order_id': 1, 'amount': 'abc_invalid', 'payment_method': 'Card'})
        self.assertEqual(res.status_code, 400)
        self.assertIn('numeric decimal', res.get_json()['error'])

    # =========================================================================
    # 3. PAYMENT ACID TRANSACTION TESTS (MOCK & LIVE HYBRID)
    # =========================================================================
    @patch('routes.analytics.get_db_connection')
    def test_05_payment_card_successful_transaction(self, mock_get_db):
        # Setup mock DB connection & cursor
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_db.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        # Mock order existence check (SELECT ... FOR UPDATE)
        mock_cursor.fetchone.return_value = {'order_id': 1, 'total_amount': Decimal('1299.00'), 'payment_status': 'Pending'}
        mock_cursor.lastrowid = 88

        payload = {
            'order_id': 1,
            'amount': 1299.00,
            'payment_method': 'Credit Card'
        }

        res = self.client.post('/api/analytics/payments/process', json=payload)
        self.assertEqual(res.status_code, 200)

        data = res.get_json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['data']['payment_status'], 'Paid')
        self.assertEqual(data['data']['order_id'], 1)
        self.assertTrue(data['data']['transaction_reference'].startswith('TXN-'))

        # Verify transaction isolation & atomic commit
        self.assertFalse(mock_conn.autocommit)
        mock_conn.commit.assert_called_once()
        mock_cursor.close.assert_called_once()
        mock_conn.close.assert_called_once()

    @patch('routes.analytics.get_db_connection')
    def test_06_payment_cod_status_pending(self, mock_get_db):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_db.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchone.return_value = {'order_id': 2, 'total_amount': Decimal('450.00'), 'payment_status': 'Pending'}
        mock_cursor.lastrowid = 89

        payload = {
            'order_id': 2,
            'amount': 450.00,
            'payment_method': 'Cash on Delivery'
        }

        res = self.client.post('/api/analytics/payments/process', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['data']['payment_status'], 'Pending')
        mock_conn.commit.assert_called_once()

    @patch('routes.analytics.get_db_connection')
    def test_07_payment_rollback_on_order_not_found(self, mock_get_db):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_db.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        # Order not found returns None
        mock_cursor.fetchone.return_value = None

        payload = {'order_id': 99999, 'amount': 150.00, 'payment_method': 'Card'}
        res = self.client.post('/api/analytics/payments/process', json=payload)

        self.assertEqual(res.status_code, 404)
        mock_conn.rollback.assert_called_once()

    @patch('routes.analytics.get_db_connection')
    def test_08_payment_atomic_rollback_on_database_exception(self, mock_get_db):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_db.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchone.return_value = {'order_id': 1, 'total_amount': Decimal('500.00'), 'payment_status': 'Pending'}
        # Simulate database engine disk / network failure during insert
        mock_cursor.execute.side_effect = [None, Exception('Lock wait timeout exceeded')]

        payload = {'order_id': 1, 'amount': 500.00, 'payment_method': 'Card'}
        res = self.client.post('/api/analytics/payments/process', json=payload)

        self.assertEqual(res.status_code, 500)
        self.assertIn('failed', res.get_json()['error'])
        mock_conn.rollback.assert_called_once()

    # =========================================================================
    # 4. ANALYTICAL REPORT ENDPOINTS TESTS (4 VIEWS)
    # =========================================================================
    @patch('routes.analytics.get_db_connection')
    def test_09_get_quarterly_sales_report(self, mock_get_db):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_db.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchall.return_value = [
            {
                'sales_year': 2026,
                'sales_quarter': 1,
                'total_orders': 40,
                'gross_revenue': Decimal('52000.00'),
                'net_collected_revenue': Decimal('48000.00'),
                'total_units_sold': 120,
                'moving_avg_quarterly_revenue': Decimal('52000.00')
            }
        ]

        res = self.client.get('/api/analytics/reports/quarterly-sales?year=2026')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['count'], 1)
        self.assertEqual(data['data'][0]['gross_revenue'], 52000.00)

    @patch('routes.analytics.get_db_connection')
    def test_10_get_top_selling_products(self, mock_get_db):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_db.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchall.return_value = [
            {
                'product_id': 1,
                'product_name': 'Apex Pro Terminal',
                'category_name': 'Hardware',
                'total_units_sold': 50,
                'total_revenue': Decimal('64950.00'),
                'revenue_rank': 1
            }
        ]

        res = self.client.get('/api/analytics/reports/top-selling')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['data'][0]['revenue_rank'], 1)

    @patch('routes.analytics.get_db_connection')
    def test_11_get_category_orders_rollup(self, mock_get_db):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_db.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchall.return_value = [
            {'category_name': 'Hardware', 'total_category_revenue': Decimal('64950.00'), 'total_orders': 20, 'total_units_sold': 50},
            {'category_name': 'ALL CATEGORIES (GRAND TOTAL)', 'total_category_revenue': Decimal('64950.00'), 'total_orders': 20, 'total_units_sold': 50}
        ]

        res = self.client.get('/api/analytics/reports/category-orders')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['count'], 2)
        # Check rollup row
        self.assertIn('GRAND TOTAL', data['data'][1]['category_name'])

    @patch('routes.analytics.get_db_connection')
    def test_12_get_customer_summary(self, mock_get_db):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_db.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchall.return_value = [
            {
                'customer_id': 4,
                'customer_name': 'Test Customer',
                'email': 'customer@brightbuy.test',
                'primary_city': 'Dallas Hub',
                'total_orders': 5,
                'lifetime_spending': Decimal('8990.00'),
                'paid_orders': 5,
                'pending_orders': 0,
                'paid_order_value': Decimal('8990.00'),
                'pending_order_value': Decimal('0.00')
            }
        ]

        res = self.client.get('/api/analytics/reports/customer-summary')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['data'][0]['customer_id'], 4)
        self.assertEqual(data['data'][0]['lifetime_spending'], 8990.00)

if __name__ == '__main__':
    unittest.main()
