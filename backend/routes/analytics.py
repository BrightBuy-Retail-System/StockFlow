import os
from decimal import Decimal, InvalidOperation
from datetime import datetime, date
from uuid import uuid4
from flask import Blueprint, jsonify, request
from db import get_db_connection

analytics_bp = Blueprint('analytics', __name__)

def serialize_row(row):
    """
    Serialize MySQL datatypes (Decimal, datetime, date) into JSON-safe formats.
    """
    if not row:
        return row
    cleaned = {}
    for k, v in row.items():
        if isinstance(v, Decimal):
            cleaned[k] = float(v)
        elif isinstance(v, (datetime, date)):
            cleaned[k] = v.isoformat()
        else:
            cleaned[k] = v
    return cleaned

# ============================================================================
# PHASE 2: ENDPOINT 1 - Payment Processing Pipeline (ACID Transaction)
# References:
#   Lecture Note 2 (DML: INSERT, UPDATE)
#   Lecture Note 6 (Stored Procedures: sp_process_payment)
#   Lecture Note 7 (Prepared Statements: SQL Injection Protection)
# ============================================================================
@analytics_bp.route('/payments/process', methods=['POST'])
def process_payment():
    """
    Processes customer payment, records a transaction in PAYMENT_TRANSACTION,
    and updates the order payment status to 'Paid' or 'Pending'.
    Enforces strict ACID transaction boundaries (commit/rollback).
    """
    data = request.get_json(silent=True) or {}
    order_id = data.get('order_id')
    amount = data.get('amount')
    payment_method = data.get('payment_method')

    if order_id is None or amount is None or not payment_method:
        return jsonify({
            'status': 'error',
            'error': 'order_id, amount, and payment_method are required fields.'
        }), 400

    try:
        amount_decimal = Decimal(str(amount))
    except (InvalidOperation, TypeError, ValueError):
        return jsonify({'status': 'error', 'error': 'amount must be a valid numeric decimal.'}), 400

    if amount_decimal <= 0:
        return jsonify({'status': 'error', 'error': 'amount must be greater than zero.'}), 400

    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        conn.autocommit = False
        cursor = conn.cursor(dictionary=True)

        # 1. Verify target order exists
        cursor.execute("SELECT order_id, total_amount, payment_status FROM orders WHERE order_id = %s FOR UPDATE", (order_id,))
        order_row = cursor.fetchone()

        if not order_row:
            conn.rollback()
            return jsonify({'status': 'error', 'error': f'Order #{order_id} does not exist.'}), 404

        method_text = str(payment_method).strip().lower()
        is_card = method_text in {'card', 'card payment', 'credit card', 'credit_card', 'debit card', 'visa', 'mastercard', 'amex'}
        payment_status = 'Paid' if is_card else 'Pending'
        transaction_reference = f"TXN-{uuid4().hex[:12].upper()}"

        # 2. Insert payment transaction (Prepared Statement - Lecture Note 7)
        insert_query = """
            INSERT INTO PAYMENT_TRANSACTION (order_id, amount, transaction_reference, processed_at)
            VALUES (%s, %s, %s, NOW())
        """
        cursor.execute(insert_query, (order_id, amount_decimal, transaction_reference))
        payment_id = cursor.lastrowid

        # 3. Synchronize parent order payment status
        update_query = "UPDATE orders SET payment_status = %s WHERE order_id = %s"
        cursor.execute(update_query, (payment_status, order_id))

        # 4. Optional: Log to audit_logs if table exists
        try:
            audit_query = """
                INSERT INTO audit_logs (action, table_name, record_id, details, created_at)
                VALUES (%s, %s, %s, %s, NOW())
            """
            cursor.execute(audit_query, (
                'PAYMENT_RECORDED',
                'PAYMENT_TRANSACTION',
                payment_id,
                f"Txn Ref: {transaction_reference} | Amount: ${amount_decimal:.2f} | Status: {payment_status}"
            ))
        except Exception:
            # Table audit_logs might not be seeded yet in some dev databases; continue safely
            pass

        conn.commit()

        return jsonify({
            'status': 'success',
            'message': 'Payment processed and verified successfully.',
            'data': {
                'payment_id': payment_id,
                'order_id': order_id,
                'amount': float(amount_decimal),
                'payment_method': payment_method,
                'payment_status': payment_status,
                'transaction_reference': transaction_reference,
                'processed_at': datetime.now().isoformat()
            }
        }), 200

    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({
            'status': 'error',
            'error': 'Payment processing failed during transaction execution.',
            'details': str(exc)
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ============================================================================
# PHASE 2: ENDPOINT 2 - Quarterly Sales Report
# References:
#   Lecture Note 4 (Virtual Views: v_quarterly_sales_report)
#   Lecture Note 9 (Windowing & Moving Averages)
# ============================================================================
@analytics_bp.route('/reports/quarterly-sales', methods=['GET'])
def quarterly_sales_report():
    year_filter = request.args.get('year')
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = "SELECT * FROM v_quarterly_sales_report"
        params = ()

        if year_filter:
            query += " WHERE sales_year = %s"
            params = (int(year_filter),)

        query += " ORDER BY sales_year, sales_quarter"
        cursor.execute(query, params)
        rows = cursor.fetchall()

        return jsonify({
            'status': 'success',
            'count': len(rows),
            'data': [serialize_row(r) for r in rows]
        }), 200

    except Exception as exc:
        return jsonify({
            'status': 'error',
            'error': 'Unable to fetch quarterly sales report from view.',
            'details': str(exc)
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ============================================================================
# PHASE 2: ENDPOINT 3 - Top Selling Products Leaderboard
# References:
#   Lecture Note 4 (Virtual Views: v_top_selling_products)
#   Lecture Note 9 (Window Ranking: DENSE_RANK)
# ============================================================================
@analytics_bp.route('/reports/top-selling', methods=['GET'])
def top_selling_products():
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = "SELECT * FROM v_top_selling_products WHERE revenue_rank <= 10 ORDER BY revenue_rank ASC"
        cursor.execute(query)
        rows = cursor.fetchall()

        return jsonify({
            'status': 'success',
            'count': len(rows),
            'data': [serialize_row(r) for r in rows]
        }), 200

    except Exception as exc:
        return jsonify({
            'status': 'error',
            'error': 'Unable to fetch top-selling products report from view.',
            'details': str(exc)
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ============================================================================
# PHASE 2: ENDPOINT 4 - Category Order Totals with Hierarchical Rollup
# References:
#   Lecture Note 4 (Virtual Views: v_category_order_totals)
#   Lecture Note 9 (Extended Aggregations: WITH ROLLUP)
# ============================================================================
@analytics_bp.route('/reports/category-orders', methods=['GET'])
def category_orders_report():
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = "SELECT * FROM v_category_order_totals"
        cursor.execute(query)
        rows = cursor.fetchall()

        return jsonify({
            'status': 'success',
            'count': len(rows),
            'data': [serialize_row(r) for r in rows]
        }), 200

    except Exception as exc:
        return jsonify({
            'status': 'error',
            'error': 'Unable to fetch category order totals from view.',
            'details': str(exc)
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ============================================================================
# PHASE 2: ENDPOINT 5 - Customer Lifetime Summary Leaderboard
# References:
#   Lecture Note 3 (Outer Joins)
#   Lecture Note 4 (Virtual Views: v_customer_order_summary)
# ============================================================================
@analytics_bp.route('/reports/customer-summary', methods=['GET'])
def customer_summary_report():
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = "SELECT * FROM v_customer_order_summary ORDER BY lifetime_spending DESC"
        cursor.execute(query)
        rows = cursor.fetchall()

        return jsonify({
            'status': 'success',
            'count': len(rows),
            'data': [serialize_row(r) for r in rows]
        }), 200

    except Exception as exc:
        return jsonify({
            'status': 'error',
            'error': 'Unable to fetch customer order summary report from view.',
            'details': str(exc)
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()