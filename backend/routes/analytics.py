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
        cursor.execute("SELECT order_id, user_id, total_amount, payment_status FROM orders WHERE order_id = %s FOR UPDATE", (order_id,))
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

        # 4. Record event into audit_logs (Lecture Note 5 Triggers & Audit Trail)
        try:
            audit_query = """
                INSERT INTO audit_logs (user_id, event_action, event_details, ip_address, created_at)
                VALUES (%s, %s, %s, %s, NOW())
            """
            cursor.execute(audit_query, (
                order_row.get('user_id') or 1,
                'PAYMENT_RECORDED',
                f"Txn Ref: {transaction_reference} | Amount: ${amount_decimal:.2f} | Status: {payment_status} | Order #{order_id}",
                request.remote_addr or '127.0.0.1'
            ))
        except Exception:
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

# ============================================================================
# ROLE-BASED EXTENSION: Transactions Ledger (Manager & Admin View)
# References:
#   Lecture Note 1 (Tables: PAYMENT_TRANSACTION)
#   Lecture Note 3 (Inner / Outer Joins with orders & users)
# ============================================================================
@analytics_bp.route('/transactions', methods=['GET'])
def get_payment_transactions():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT 
                pt.payment_id,
                pt.order_id,
                pt.amount,
                pt.transaction_reference,
                pt.processed_at,
                o.payment_status,
                o.status AS order_status,
                o.user_id,
                u.full_name AS customer_name,
                u.email AS customer_email
            FROM PAYMENT_TRANSACTION pt
            INNER JOIN orders o ON o.order_id = pt.order_id
            LEFT JOIN users u ON u.user_id = o.user_id
            ORDER BY pt.processed_at DESC
            LIMIT 50
        """
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
            'error': 'Unable to fetch payment transactions.',
            'details': str(exc)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ============================================================================
# ROLE-BASED EXTENSION: Customer Orders & Pending Settlements (Customer View)
# References:
#   Lecture Note 2 (DML: SELECT with WHERE user_id)
#   Lecture Note 7 (Prepared Statements: parameterized user_id)
# ============================================================================
@analytics_bp.route('/customer-orders/<int:user_id>', methods=['GET'])
def get_customer_orders_summary(user_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Fetch user's orders with payment status
        orders_query = """
            SELECT 
                order_id,
                user_id,
                total_amount,
                status AS order_status,
                placed_at,
                payment_status,
                delivery_type
            FROM orders
            WHERE user_id = %s
            ORDER BY placed_at DESC
        """
        cursor.execute(orders_query, (user_id,))
        orders = cursor.fetchall()

        # 2. Fetch specific summary from v_customer_order_summary
        summary_query = """
            SELECT * FROM v_customer_order_summary
            WHERE customer_id = %s
        """
        cursor.execute(summary_query, (user_id,))
        summary_row = cursor.fetchone()

        # 3. Fetch recent payments for this user's orders
        payments_query = """
            SELECT 
                pt.payment_id,
                pt.order_id,
                pt.amount,
                pt.transaction_reference,
                pt.processed_at,
                o.payment_status
            FROM PAYMENT_TRANSACTION pt
            INNER JOIN orders o ON o.order_id = pt.order_id
            WHERE o.user_id = %s
            ORDER BY pt.processed_at DESC
        """
        cursor.execute(payments_query, (user_id,))
        payments = cursor.fetchall()

        return jsonify({
            'status': 'success',
            'data': {
                'summary': serialize_row(summary_row) if summary_row else None,
                'orders': [serialize_row(o) for o in orders],
                'payments': [serialize_row(p) for p in payments]
            }
        }), 200
    except Exception as exc:
        return jsonify({
            'status': 'error',
            'error': f'Unable to fetch orders for user {user_id}.',
            'details': str(exc)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ============================================================================
# ROLE-BASED EXTENSION: DCL Roles & Audit Log Console (Admin View)
# References:
#   Lecture Note 5 (Database Triggers & audit_logs)
#   Lecture Note 8 (Data Control Language: CREATE ROLE, GRANT Privileges)
# ============================================================================
@analytics_bp.route('/dcl-matrix', methods=['GET'])
def get_dcl_matrix():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Fetch system roles
        cursor.execute("SELECT role_id, role_name, description FROM roles ORDER BY role_id ASC")
        roles_list = cursor.fetchall()

        # 2. Fetch recent audit logs triggered by system/payments
        cursor.execute("SELECT log_id, user_id, event_action, event_details, ip_address, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 20")
        audit_rows = cursor.fetchall()

        # 3. Formulate DCL grant matrix conforming to Lecture Note 8
        dcl_grants = [
            {
                "role": "Customer (Role 1)",
                "target_objects": "orders, cart_items, carts, PAYMENT_TRANSACTION",
                "privileges": "SELECT (own), INSERT (orders, payments), UPDATE (cart)",
                "lecture_reference": "Lecture Note 2 & 8 (Row Isolation & DML)"
            },
            {
                "role": "Store Manager (Role 2)",
                "target_objects": "v_top_selling_products, v_category_order_totals, products, inventory",
                "privileges": "SELECT (analytics views), UPDATE (inventory, products)",
                "lecture_reference": "Lecture Note 4 & 8 (Virtual Views & Role Grants)"
            },
            {
                "role": "System Administrator (Role 3)",
                "target_objects": "v_quarterly_sales_report, v_customer_order_summary, audit_logs, users, roles",
                "privileges": "ALL PRIVILEGES, GRANT OPTION, REVOKE, TRIGGER AUDIT",
                "lecture_reference": "Lecture Note 5 & 8 (DCL Authorization & Triggers)"
            },
            {
                "role": "analytics_viewer (DB Role)",
                "target_objects": "v_quarterly_sales_report, v_top_selling_products, v_category_order_totals, v_customer_order_summary",
                "privileges": "GRANT SELECT ON 4 VIRTUAL VIEWS",
                "lecture_reference": "Lecture Note 8 (CREATE ROLE analytics_viewer)"
            }
        ]

        return jsonify({
            'status': 'success',
            'data': {
                'roles': roles_list,
                'grants': dcl_grants,
                'recent_audit_logs': [serialize_row(r) for r in audit_rows]
            }
        }), 200
    except Exception as exc:
        return jsonify({
            'status': 'error',
            'error': 'Unable to fetch DCL security matrix.',
            'details': str(exc)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()