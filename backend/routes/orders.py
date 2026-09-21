from decimal import Decimal
from datetime import datetime, date
from flask import Blueprint, jsonify
from db import get_db_connection

orders_bp = Blueprint('orders', __name__)

def serialize_row(row):
    """Convert MySQL Decimal and datetime objects into JSON-compatible formats."""
    if not row:
        return row
    clean_row = {}
    for key, val in row.items():
        if isinstance(val, Decimal):
            clean_row[key] = float(val)
        elif isinstance(val, (datetime, date)):
            clean_row[key] = val.isoformat()
        else:
            clean_row[key] = val
    return clean_row

@orders_bp.route('/ping', methods=['GET'])
def ping():
    return jsonify({
        "status": "healthy",
        "module": "orders"
    }), 200

@orders_bp.route('/<int:order_id>', methods=['GET'])
def get_order_by_id(order_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT 
                order_id,
                user_id,
                shipment_id,
                total_amount,
                status,
                placed_at
            FROM orders
            WHERE order_id = %s
        """
        cursor.execute(query, (order_id,))
        order = cursor.fetchone()

        if not order:
            return jsonify({
                "status": "error",
                "message": f"Order #{order_id} not found."
            }), 404
        
        # 2. Fetch line items joined with product and variant metadata
        items_query = """
            SELECT 
                oi.order_item_id,
                oi.variant_id,
                oi.quantity,
                oi.unit_price,
                (oi.quantity * oi.unit_price) AS line_total,
                pv.sku,
                pv.attribute_name,
                pv.attribute_value,
                p.title AS product_title
            FROM order_items oi
            JOIN product_variants pv ON oi.variant_id = pv.variant_id
            JOIN products p ON pv.product_id = p.product_id
            WHERE oi.order_id = %s
            ORDER BY oi.order_item_id ASC
        """
        cursor.execute(items_query, (order_id,))
        items = cursor.fetchall()

        # 3. Assemble response payload
        payload = serialize_row(order)
        payload["items"] = [serialize_row(item) for item in items]

        return jsonify({
            "status": "success",
            "data": payload
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Database error: {str(e)}"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@orders_bp.route('/user/<int:user_id>', methods=['GET'])
def get_orders_by_user(user_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Fetch all order headers for the user (newest first)
        orders_query = """
            SELECT 
                order_id,
                user_id,
                shipment_id,
                total_amount,
                status,
                placed_at
            FROM orders
            WHERE user_id = %s
            ORDER BY placed_at DESC
        """
        cursor.execute(orders_query, (user_id,))
        raw_orders = cursor.fetchall()

        if not raw_orders:
            return jsonify({
                "status": "success",
                "count": 0,
                "data": []
            }), 200

        # Convert headers to JSON-safe dictionaries
        orders_dict = {o['order_id']: serialize_row(o) for o in raw_orders}
        for o in orders_dict.values():
            o['items'] = []

        # 2. Batch fetch line items for all retrieved orders
        order_ids = tuple(orders_dict.keys())
        format_strings = ','.join(['%s'] * len(order_ids))
        items_query = f"""
            SELECT 
                oi.order_item_id,
                oi.order_id,
                oi.variant_id,
                oi.quantity,
                oi.unit_price,
                (oi.quantity * oi.unit_price) AS line_total,
                pv.sku,
                pv.attribute_name,
                pv.attribute_value,
                p.title AS product_title
            FROM order_items oi
            JOIN product_variants pv ON oi.variant_id = pv.variant_id
            JOIN products p ON pv.product_id = p.product_id
            WHERE oi.order_id IN ({format_strings})
            ORDER BY oi.order_item_id ASC
        """
        cursor.execute(items_query, order_ids)
        raw_items = cursor.fetchall()

        # 3. Nest items into their respective parent order
        for item in raw_items:
            oid = item['order_id']
            if oid in orders_dict:
                orders_dict[oid]['items'].append(serialize_row(item))

        return jsonify({
            "status": "success",
            "count": len(orders_dict),
            "data": list(orders_dict.values())
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Database error: {str(e)}"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()