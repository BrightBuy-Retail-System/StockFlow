import os
from decimal import Decimal, InvalidOperation
from datetime import datetime, date
from uuid import uuid4
from flask import Blueprint, jsonify, request
from db import get_db_connection

analytics_bp = Blueprint('analytics', __name__)
def serialize_item(item):
    """Serialize Decimals, Dates, and Timestamps for clean JSON output."""
    if not item:
        return item
    clean = {}
    for k, v in item.items():
        if isinstance(v, Decimal):
            clean[k] = float(v)
        elif isinstance(v, (datetime, date)):
            clean[k] = v.isoformat()
        else:
            clean[k] = v
    return clean

def run_query(sql, params=None):
    """Helper to execute SQL queries and return serialized dictionary rows."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(sql, params or ())
        rows = cursor.fetchall()
        return [serialize_item(row) for row in rows]
    finally:
        cursor.close()
        conn.close()

# -------------------------------------------------------------------------
# EXECUTIVE KPI SUMMARY: STORE OVERALL PERFORMANCE EVALUATION
# -------------------------------------------------------------------------
@analytics_bp.route('/overview', methods=['GET'])
def get_executive_overview():
    """
    Evaluates the overall financial, order fulfillment, and inventory health of the store.
    Read-only for executives and store managers.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Total revenue & orders
        cursor.execute("""
            SELECT 
                COUNT(*) AS total_orders,
                COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total_amount ELSE 0 END), 0) AS gross_revenue,
                COALESCE(AVG(CASE WHEN status != 'CANCELLED' THEN total_amount ELSE NULL END), 0) AS average_order_value,
                SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_orders,
                SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed_orders,
                SUM(CASE WHEN status = 'SHIPPED' THEN 1 ELSE 0 END) AS shipped_orders,
                SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_orders
            FROM orders
        """)
        order_metrics = serialize_item(cursor.fetchone())

        # 2. Total active customers
        cursor.execute("SELECT COUNT(DISTINCT user_id) AS active_customers FROM orders")
        customer_metrics = cursor.fetchone()

        # 3. Product & inventory metrics
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT p.product_id) AS total_products,
                COUNT(DISTINCT pv.variant_id) AS total_skus,
                COALESCE(SUM(i.stock_quantity), 0) AS total_units_in_stock,
                COALESCE(SUM(i.stock_quantity * COALESCE(pv.price_override, p.base_price)), 0) AS total_inventory_valuation
            FROM products p
            LEFT JOIN product_variants pv ON p.product_id = pv.product_id
            LEFT JOIN inventory i ON pv.variant_id = i.variant_id
        """)
        inv_metrics = serialize_item(cursor.fetchone())

        # 4. Payments success rate
        cursor.execute("""
            SELECT 
                COUNT(*) AS total_payments,
                SUM(CASE WHEN payment_status = 'SUCCESS' THEN 1 ELSE 0 END) AS successful_payments,
                COALESCE(SUM(CASE WHEN payment_status = 'SUCCESS' THEN amount ELSE 0 END), 0) AS settled_revenue
            FROM payments
        """)
        payment_metrics = serialize_item(cursor.fetchone())

        return jsonify({
            "status": "success",
            "executive_summary": {
                "gross_revenue": order_metrics.get("gross_revenue", 0.0),
                "settled_revenue": payment_metrics.get("settled_revenue", 0.0),
                "average_order_value": order_metrics.get("average_order_value", 0.0),
                "total_orders": order_metrics.get("total_orders", 0),
                "active_customers": customer_metrics.get("active_customers", 0),
                "order_breakdown": {
                    "pending": order_metrics.get("pending_orders", 0),
                    "confirmed": order_metrics.get("confirmed_orders", 0),
                    "shipped": order_metrics.get("shipped_orders", 0),
                    "cancelled": order_metrics.get("cancelled_orders", 0),
                },
                "inventory_summary": {
                    "total_products": inv_metrics.get("total_products", 0),
                    "total_skus": inv_metrics.get("total_skus", 0),
                    "units_on_hand": inv_metrics.get("total_units_in_stock", 0),
                    "valuation": inv_metrics.get("total_inventory_valuation", 0.0),
                },
                "payment_health": {
                    "total_transactions": payment_metrics.get("total_payments", 0),
                    "successful": payment_metrics.get("successful_payments", 0),
                }
            }
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

# -------------------------------------------------------------------------
# ORDER FULFILLMENT PIPELINE REVIEW
# -------------------------------------------------------------------------
@analytics_bp.route('/fulfillment-pipeline', methods=['GET'])
def get_fulfillment_pipeline():
    """
    Returns full order fulfillment pipeline with shipment dispatch & Texas hub logistics.
    Categorizes orders into stages: PENDING -> CONFIRMED -> IN_TRANSIT / SHIPPED -> DELIVERED.
    """
    sql = """
        SELECT 
            o.order_id,
            o.user_id,
            u.full_name AS customer_name,
            u.email AS customer_email,
            o.total_amount,
            o.status AS order_status,
            o.placed_at,
            s.shipment_id,
            s.tracking_number,
            COALESCE(s.shipping_status, 'UNASSIGNED') AS shipping_status,
            s.estimated_arrival,
            s.dispatched_at,
            s.delivered_at,
            COALESCE(tc.city_name, 'Direct Dispatch') AS destination_city,
            COALESCE(tc.hub_name, 'Central Hub') AS fulfillment_hub,
            COALESCE(tc.shipping_fee, 0.00) AS shipping_fee,
            COALESCE(p.payment_method, 'STANDARD') AS payment_method,
            COALESCE(p.payment_status, 'PENDING') AS payment_status
        FROM orders o
        JOIN users u ON o.user_id = u.user_id
        LEFT JOIN shipments s ON o.shipment_id = s.shipment_id
        LEFT JOIN texas_cities tc ON s.destination_city_id = tc.city_id
        LEFT JOIN payments p ON o.order_id = p.order_id
        ORDER BY o.placed_at DESC
        LIMIT 100
    """
    try:
        pipeline = run_query(sql)
        
        # Categorize by pipeline stages for quick executive triage
        stages = {
            "pending": [row for row in pipeline if row['order_status'] == 'PENDING'],
            "confirmed": [row for row in pipeline if row['order_status'] == 'CONFIRMED'],
            "in_transit": [row for row in pipeline if row['order_status'] == 'SHIPPED'],
            "cancelled": [row for row in pipeline if row['order_status'] == 'CANCELLED'],
        }

        return jsonify({
            "status": "success",
            "total_count": len(pipeline),
            "stages": {
                "pending_count": len(stages["pending"]),
                "confirmed_count": len(stages["confirmed"]),
                "in_transit_count": len(stages["in_transit"]),
                "cancelled_count": len(stages["cancelled"]),
            },
            "pipeline": pipeline
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Database error: {str(e)}"}), 500

# -------------------------------------------------------------------------
# ANALYTICAL REPORTS: TOP SELLING PRODUCTS & CATEGORY PERFORMANCE
# -------------------------------------------------------------------------
@analytics_bp.route('/reports/top-products', methods=['GET'])
def get_top_selling_products():
    """
    Ranks top performing products by revenue, units sold, and active warehouse stock.
    """
    sql = """
        SELECT 
            p.product_id,
            p.title AS product_name,
            c.name AS category_name,
            p.base_price,
            COALESCE(sales.units_sold, 0) AS total_units_sold,
            COALESCE(sales.total_revenue, 0.0) AS total_revenue,
            COALESCE(inv.total_stock, 0) AS current_stock
        FROM products p
        JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN (
            SELECT 
                pv.product_id,
                SUM(oi.quantity) AS units_sold,
                SUM(oi.quantity * oi.unit_price) AS total_revenue
            FROM order_items oi
            JOIN product_variants pv ON oi.variant_id = pv.variant_id
            GROUP BY pv.product_id
        ) sales ON p.product_id = sales.product_id
        LEFT JOIN (
            SELECT 
                pv2.product_id,
                SUM(i2.stock_quantity) AS total_stock
            FROM product_variants pv2
            JOIN inventory i2 ON pv2.variant_id = i2.variant_id
            GROUP BY pv2.product_id
        ) inv ON p.product_id = inv.product_id
        ORDER BY total_revenue DESC, total_units_sold DESC
        LIMIT 10
    """
    try:
        products = run_query(sql)
        return jsonify({
            "status": "success",
            "top_products": products
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Database error: {str(e)}"}), 500

@analytics_bp.route('/reports/category-performance', methods=['GET'])
def get_category_performance():
    """
    Aggregate business intelligence by category: sales volume, products count, revenue.
    """
    sql = """
        SELECT 
            c.category_id,
            c.name AS category_name,
            c.slug,
            COUNT(DISTINCT p.product_id) AS total_products,
            COALESCE(SUM(oi.quantity), 0) AS total_units_sold,
            COALESCE(SUM(oi.quantity * oi.unit_price), 0.0) AS category_revenue
        FROM categories c
        LEFT JOIN products p ON c.category_id = p.category_id
        LEFT JOIN product_variants pv ON p.product_id = pv.product_id
        LEFT JOIN order_items oi ON pv.variant_id = oi.variant_id
        GROUP BY c.category_id, c.name, c.slug
        ORDER BY category_revenue DESC, total_products DESC
    """
    try:
        categories_data = run_query(sql)
        return jsonify({
            "status": "success",
            "category_performance": categories_data
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Database error: {str(e)}"}), 500

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

# 
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

# ============================================================================
# PHASE 2: ENDPOINT 6 - Delivery Time Estimates for Upcoming Orders
# References:
#   Course Project SRS: Feature 5 & Management Report 4
#   Rule: Main cities (Dallas, Fort Worth, Austin, Houston, San Antonio): 5 days
#         Other cities: 7 days
#         + 3 days out-of-stock penalty
# ============================================================================
@analytics_bp.route('/reports/delivery-estimates', methods=['GET'])
def delivery_estimates_report():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
            SELECT 
                o.order_id,
                o.placed_at,
                o.total_amount,
                o.status AS order_status,
                COALESCE(o.payment_status, 'Pending') AS payment_status,
                u.user_id,
                u.full_name AS customer_name,
                u.email AS customer_email,
                s.shipment_id,
                s.tracking_number,
                COALESCE(s.shipping_status, 'PENDING') AS shipping_status,
                s.estimated_arrival,
                COALESCE(c.city_name, 'Texas Regional') AS city_name,
                COALESCE(c.hub_name, 'Central Hub') AS hub_name,
                CASE 
                    WHEN LOWER(c.city_name) IN ('dallas', 'fort worth', 'austin', 'houston', 'san antonio') THEN 5
                    ELSE 7
                END AS base_days,
                COALESCE((
                    SELECT MAX(CASE WHEN inv.stock_quantity <= 0 THEN 3 ELSE 0 END)
                    FROM order_items oi
                    LEFT JOIN inventory inv ON oi.variant_id = inv.variant_id
                    WHERE oi.order_id = o.order_id
                ), 0) AS stock_penalty_days
            FROM orders o
            JOIN users u ON o.user_id = u.user_id
            LEFT JOIN shipments s ON o.shipment_id = s.shipment_id
            LEFT JOIN texas_cities c ON s.destination_city_id = c.city_id
            WHERE o.status != 'CANCELLED'
            ORDER BY o.placed_at DESC
        """
        cursor.execute(sql)
        rows = cursor.fetchall()

        # Compute calculated delivery lead time and display metrics
        formatted_rows = []
        for r in rows:
            clean = serialize_row(r)
            base_days = int(clean.get('base_days') or 5)
            penalty_days = int(clean.get('stock_penalty_days') or 0)
            total_lead_time_days = base_days + penalty_days
            clean['total_lead_days'] = total_lead_time_days
            clean['delivery_formula'] = f"{base_days}d hub lead + {penalty_days}d stock penalty = {total_lead_time_days} days"
            formatted_rows.append(clean)

        return jsonify({
            'status': 'success',
            'count': len(formatted_rows),
            'data': formatted_rows
        }), 200

    except Exception as exc:
        return jsonify({
            'status': 'error',
            'error': 'Unable to fetch delivery time estimates report.',
            'details': str(exc)
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

