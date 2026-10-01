from decimal import Decimal
from datetime import datetime, date
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