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

        return jsonify({
            "status": "success",
            "data": serialize_row(order)
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