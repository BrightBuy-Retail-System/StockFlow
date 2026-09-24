from decimal import Decimal
from datetime import datetime, date
from flask import Blueprint, jsonify, request
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

@orders_bp.route('/checkout', methods=['POST'])
def checkout():
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({
            "status": "error",
            "message": "Missing or invalid JSON body in request."
        }), 400

    # 1. Validate customer ID format
    user_id = payload.get('user_id')
    if not isinstance(user_id, int) or user_id <= 0:
        return jsonify({
            "status": "error",
            "message": "Field 'user_id' must be a positive integer."
        }), 400

    # 2. Validate destination city ID format
    shipping_city_id = payload.get('shipping_city_id')
    if not isinstance(shipping_city_id, int) or shipping_city_id <= 0:
        return jsonify({
            "status": "error",
            "message": "Field 'shipping_city_id' must be a positive integer."
        }), 400

    # 3. Validate items array format
    items = payload.get('items')
    if not isinstance(items, list) or len(items) == 0:
        return jsonify({
            "status": "error",
            "message": "Field 'items' must be a non-empty list of items."
        }), 400

    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            return jsonify({
                "status": "error",
                "message": f"Item at index {idx} must be a JSON object."
            }), 400

        variant_id = item.get('variant_id')
        quantity = item.get('quantity')

        if not isinstance(variant_id, int) or variant_id <= 0:
            return jsonify({
                "status": "error",
                "message": f"Item at index {idx} has an invalid 'variant_id'."
            }), 400

        if not isinstance(quantity, int) or quantity <= 0:
            return jsonify({
                "status": "error",
                "message": f"Item at index {idx} must specify an integer 'quantity' greater than zero."
            }), 400

    # --- Database Pre-Flight Verification ---
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # A. Check customer existence
        cursor.execute("SELECT user_id, full_name FROM users WHERE user_id = %s", (user_id,))
        user_row = cursor.fetchone()
        if not user_row:
            return jsonify({
                "status": "error",
                "message": f"User #{user_id} does not exist."
            }), 404

        # B. Check shipping city existence and read base fee
        cursor.execute(
            "SELECT city_id, city_name, base_shipping_fee FROM texas_cities WHERE city_id = %s",
            (shipping_city_id,)
        )
        city_row = cursor.fetchone()
        if not city_row:
            return jsonify({
                "status": "error",
                "message": f"Texas shipping city #{shipping_city_id} does not exist."
            }), 404

        # C. Look up all submitted variant IDs and their official prices
        requested_variant_ids = [item['variant_id'] for item in items]
        format_strings = ','.join(['%s'] * len(requested_variant_ids))
        cursor.execute(
            f"SELECT variant_id, sku, price, stock_quantity FROM product_variants WHERE variant_id IN ({format_strings})",
            requested_variant_ids
        )
        variants_db = {v['variant_id']: v for v in cursor.fetchall()}

        # Verify every requested variant actually exists in the database
        verified_items = []
        subtotal = Decimal('0.00')

        for item in items:
            vid = item['variant_id']
            qty = item['quantity']
            if vid not in variants_db:
                return jsonify({
                    "status": "error",
                    "message": f"Product variant #{vid} does not exist."
                }), 404

            variant_record = variants_db[vid]
            unit_price = Decimal(str(variant_record['price']))
            line_total = unit_price * qty
            subtotal += line_total

            verified_items.append({
                "variant_id": vid,
                "sku": variant_record['sku'],
                "quantity": qty,
                "unit_price": float(unit_price),
                "line_total": float(line_total),
                "available_stock": variant_record['stock_quantity']
            })

        shipping_fee = Decimal(str(city_row['base_shipping_fee']))
        total_amount = subtotal + shipping_fee

        return jsonify({
            "status": "verified",
            "message": "Entities verified and pricing calculated from authoritative database records.",
            "calculation": {
                "user": user_row['full_name'],
                "destination_city": city_row['city_name'],
                "shipping_fee": float(shipping_fee),
                "subtotal": float(subtotal),
                "total_amount": float(total_amount),
                "items": verified_items
            }
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