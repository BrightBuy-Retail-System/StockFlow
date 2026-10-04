import uuid
from decimal import Decimal
from datetime import datetime, date, timedelta
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from db import get_db_connection

orders_bp = Blueprint('orders', __name__)

ALLOWED_ORDER_STATUSES = {'PENDING', 'CONFIRMED', 'SHIPPED', 'CANCELLED'}

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

@orders_bp.route('/', methods=['GET'])
@jwt_required()
def get_all_orders():
    """Manager & Admin endpoint: Retrieve all platform orders."""
    claims = get_jwt()
    role_id = claims.get('role_id', 1)

    if role_id not in (2, 3):
        return jsonify({
            "status": "error",
            "message": "Access forbidden: Manager or Admin permissions required."
        }), 403

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT 
                o.order_id,
                o.user_id,
                u.full_name AS customer_name,
                o.shipment_id,
                s.tracking_number,
                s.shipping_status,
                o.total_amount,
                o.status,
                o.placed_at
            FROM orders o
            JOIN users u ON o.user_id = u.user_id
            LEFT JOIN shipments s ON o.shipment_id = s.shipment_id
            ORDER BY o.placed_at DESC
        """
        cursor.execute(query)
        orders = cursor.fetchall()

        return jsonify({
            "status": "success",
            "count": len(orders),
            "data": [serialize_row(o) for o in orders]
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

@orders_bp.route('/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order_by_id(order_id):
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    role_id = claims.get('role_id', 1)

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        header_query = """
            SELECT 
                o.order_id,
                o.user_id,
                o.shipment_id,
                o.total_amount,
                o.status,
                o.placed_at,
                s.tracking_number,
                s.shipping_status,
                s.estimated_arrival,
                s.dispatched_at,
                s.delivered_at
            FROM orders o
            LEFT JOIN shipments s ON o.shipment_id = s.shipment_id
            WHERE o.order_id = %s
        """
        cursor.execute(header_query, (order_id,))
        order = cursor.fetchone()

        if not order:
            return jsonify({
                "status": "error",
                "message": f"Order #{order_id} not found."
            }), 404

        # Enforce Customer Data Isolation (Role 1)
        if role_id == 1 and order['user_id'] != current_user_id:
            return jsonify({
                "status": "error",
                "message": "Access forbidden: You cannot view orders belonging to another customer."
            }), 403

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
@jwt_required()
def get_orders_by_user(user_id):
    current_user_id = int(get_jwt_identity())
    claims = get_jwt()
    role_id = claims.get('role_id', 1)

    if role_id == 1 and user_id != current_user_id:
        return jsonify({
            "status": "error",
            "message": "Access forbidden: You cannot view order histories of other users."
        }), 403

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        orders_query = """
            SELECT 
                o.order_id,
                o.user_id,
                o.shipment_id,
                s.tracking_number,
                s.shipping_status,
                o.total_amount,
                o.status,
                o.placed_at
            FROM orders o
            LEFT JOIN shipments s ON o.shipment_id = s.shipment_id
            WHERE o.user_id = %s
            ORDER BY o.placed_at DESC
        """
        cursor.execute(orders_query, (user_id,))
        raw_orders = cursor.fetchall()

        if not raw_orders:
            return jsonify({
                "status": "success",
                "count": 0,
                "data": []
            }), 200

        orders_dict = {o['order_id']: serialize_row(o) for o in raw_orders}
        for o in orders_dict.values():
            o['items'] = []

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
@jwt_required()
def checkout():
    authenticated_user_id = int(get_jwt_identity())
    claims = get_jwt()
    role_id = claims.get('role_id', 1)

    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({
            "status": "error",
            "message": "Missing or invalid JSON body in request."
        }), 400

    payload_user_id = payload.get('user_id', authenticated_user_id)
    if role_id == 1 and payload_user_id != authenticated_user_id:
        return jsonify({
            "status": "error",
            "message": "Access forbidden: Customers cannot submit orders on behalf of other accounts."
        }), 403

    user_id = payload_user_id

    shipping_city_id = payload.get('shipping_city_id')
    if not isinstance(shipping_city_id, int) or shipping_city_id <= 0:
        return jsonify({
            "status": "error",
            "message": "Field 'shipping_city_id' must be a positive integer."
        }), 400

    items = payload.get('items')
    if not isinstance(items, list) or len(items) == 0:
        return jsonify({
            "status": "error",
            "message": "Field 'items' must be a non-empty list of items."
        }), 400

    validate_only = payload.get('validate_only', False)

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

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        conn.autocommit = False
        cursor = conn.cursor(dictionary=True)

        # 1. Customer Verification
        cursor.execute("SELECT user_id, full_name FROM users WHERE user_id = %s", (user_id,))
        user_row = cursor.fetchone()
        if not user_row:
            conn.rollback()
            return jsonify({
                "status": "error",
                "message": f"User #{user_id} does not exist."
            }), 404

        # 2. Texas City Verification
        cursor.execute(
            "SELECT city_id, city_name, base_lead_time_days, shipping_fee FROM texas_cities WHERE city_id = %s",
            (shipping_city_id,)
        )
        city_row = cursor.fetchone()
        if not city_row:
            conn.rollback()
            return jsonify({
                "status": "error",
                "message": f"Texas shipping city #{shipping_city_id} does not exist."
            }), 404

        # 3. Lock Variants and Inventory for Update
        requested_variant_ids = [item['variant_id'] for item in items]
        format_strings = ','.join(['%s'] * len(requested_variant_ids))
        
        lock_query = f"""
            SELECT 
                pv.variant_id,
                pv.sku,
                COALESCE(pv.price_override, p.base_price) AS effective_price,
                COALESCE(inv.stock_quantity, 0) AS stock_quantity
            FROM product_variants pv
            JOIN products p ON pv.product_id = p.product_id
            LEFT JOIN inventory inv ON pv.variant_id = inv.variant_id
            WHERE pv.variant_id IN ({format_strings})
            FOR UPDATE
        """
        cursor.execute(lock_query, requested_variant_ids)
        variants_db = {v['variant_id']: v for v in cursor.fetchall()}

        verified_items = []
        subtotal = Decimal('0.00')

        for item in items:
            vid = item['variant_id']
            qty = item['quantity']

            if vid not in variants_db:
                conn.rollback()
                return jsonify({
                    "status": "error",
                    "message": f"Product variant #{vid} does not exist."
                }), 404

            variant_record = variants_db[vid]
            available_stock = variant_record['stock_quantity']

            if available_stock < qty:
                conn.rollback()
                return jsonify({
                    "status": "error",
                    "code": "OUT_OF_STOCK",
                    "message": f"Insufficient stock for SKU '{variant_record['sku']}'. Requested: {qty}, Available: {available_stock}."
                }), 409

            unit_price = Decimal(str(variant_record['effective_price']))
            line_total = unit_price * qty
            subtotal += line_total

            verified_items.append({
                "variant_id": vid,
                "sku": variant_record['sku'],
                "quantity": qty,
                "unit_price": unit_price,
                "line_total": line_total,
                "available_stock": available_stock
            })

        shipping_fee = Decimal(str(city_row['shipping_fee']))
        total_amount = subtotal + shipping_fee

        if validate_only:
            conn.rollback()
            return jsonify({
                "status": "verified",
                "message": "Stock reserved and entities verified under transactional lock.",
                "calculation": {
                    "user": user_row['full_name'],
                    "destination_city": city_row['city_name'],
                    "shipping_fee": float(shipping_fee),
                    "subtotal": float(subtotal),
                    "total_amount": float(total_amount),
                    "items": [
                        {
                            "variant_id": it['variant_id'],
                            "sku": it['sku'],
                            "quantity": it['quantity'],
                            "unit_price": float(it['unit_price']),
                            "line_total": float(it['line_total']),
                            "available_stock": it['available_stock']
                        }
                        for it in verified_items
                    ]
                }
            }), 200

        # 4. Create Shipment with schema-exact enum 'PENDING'
        shipping_status = 'PENDING'
        tracking_number = f"TX-{datetime.now().strftime('%Y%m%d%H%M')}-{uuid.uuid4().hex[:6].upper()}"
        lead_days = city_row.get('base_lead_time_days') or 3
        estimated_arrival = (datetime.now() + timedelta(days=int(lead_days))).date()

        cursor.execute("""
            INSERT INTO shipments (tracking_number, destination_city_id, shipping_status, estimated_arrival)
            VALUES (%s, %s, %s, %s)
        """, (tracking_number, shipping_city_id, shipping_status, estimated_arrival))
        shipment_id = cursor.lastrowid

        # 5. Create Order Header with schema-exact enum 'PENDING'
        order_status = 'PENDING'
        cursor.execute("""
            INSERT INTO orders (user_id, shipment_id, total_amount, status)
            VALUES (%s, %s, %s, %s)
        """, (user_id, shipment_id, total_amount, order_status))
        order_id = cursor.lastrowid

        # 6. Insert Order Items & Decrement Inventory
        for it in verified_items:
            cursor.execute("""
                INSERT INTO order_items (order_id, variant_id, unit_price, quantity)
                VALUES (%s, %s, %s, %s)
            """, (order_id, it['variant_id'], it['unit_price'], it['quantity']))

            cursor.execute("""
                UPDATE inventory 
                SET stock_quantity = stock_quantity - %s 
                WHERE variant_id = %s
            """, (it['quantity'], it['variant_id']))

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Order placed successfully.",
            "data": {
                "order_id": order_id,
                "shipment_id": shipment_id,
                "tracking_number": tracking_number,
                "total_amount": float(total_amount),
                "status": order_status,
                "items_count": len(verified_items)
            }
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({
            "status": "error",
            "message": f"Database error: {str(e)}"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@orders_bp.route('/<int:order_id>/status', methods=['PATCH'])
@jwt_required()
def update_order_status(order_id):
    """Manager/Admin endpoint: Transition order status, update shipments, or restock on cancellation."""
    claims = get_jwt()
    role_id = claims.get('role_id', 1)

    # Restrict status changes to staff roles (2 or 3)
    if role_id not in (2, 3):
        return jsonify({
            "status": "error",
            "message": "Access forbidden: Only Warehouse Managers or Administrators can update order status."
        }), 403

    payload = request.get_json(silent=True) or {}
    new_status = payload.get('status', '').strip().upper()

    if new_status not in ALLOWED_ORDER_STATUSES:
        return jsonify({
            "status": "error",
            "message": f"Invalid status '{new_status}'. Allowed values: {sorted(list(ALLOWED_ORDER_STATUSES))}"
        }), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        conn.autocommit = False
        cursor = conn.cursor(dictionary=True)

        # 1. Fetch current order with row lock
        cursor.execute("""
            SELECT order_id, shipment_id, status 
            FROM orders 
            WHERE order_id = %s 
            FOR UPDATE
        """, (order_id,))
        order = cursor.fetchone()

        if not order:
            conn.rollback()
            return jsonify({
                "status": "error",
                "message": f"Order #{order_id} not found."
            }), 404

        current_status = order['status']

        if current_status == new_status:
            conn.rollback()
            return jsonify({
                "status": "success",
                "message": f"Order #{order_id} is already in '{new_status}' status.",
                "data": {"order_id": order_id, "status": current_status}
            }), 200

        # Business Rule: Cannot modify or cancel already cancelled orders
        if current_status == 'CANCELLED':
            conn.rollback()
            return jsonify({
                "status": "error",
                "message": f"Order #{order_id} is already CANCELLED and cannot be modified."
            }), 400

        # Business Rule: Cannot cancel orders that are already dispatched/shipped
        if new_status == 'CANCELLED' and current_status == 'SHIPPED':
            conn.rollback()
            return jsonify({
                "status": "error",
                "message": f"Order #{order_id} has already shipped and cannot be cancelled directly."
            }), 400

        # 2. Handle Stock Restock on Cancellation
        if new_status == 'CANCELLED':
            cursor.execute("""
                SELECT variant_id, quantity 
                FROM order_items 
                WHERE order_id = %s
            """, (order_id,))
            items = cursor.fetchall()

            for item in items:
                cursor.execute("""
                    UPDATE inventory 
                    SET stock_quantity = stock_quantity + %s 
                    WHERE variant_id = %s
                """, (item['quantity'], item['variant_id']))

        # 3. Synchronize Shipment Records
        shipment_id = order.get('shipment_id')
        if shipment_id:
            if new_status == 'SHIPPED':
                cursor.execute("""
                    UPDATE shipments 
                    SET shipping_status = 'DISPATCHED', dispatched_at = NOW() 
                    WHERE shipment_id = %s
                """, (shipment_id,))
            elif new_status == 'CANCELLED':
                cursor.execute("""
                    UPDATE shipments 
                    SET shipping_status = 'PENDING' 
                    WHERE shipment_id = %s
                """, (shipment_id,))

        # 4. Update Order Status
        cursor.execute("""
            UPDATE orders 
            SET status = %s 
            WHERE order_id = %s
        """, (new_status, order_id))

        conn.commit()

        return jsonify({
            "status": "success",
            "message": f"Order #{order_id} status updated from '{current_status}' to '{new_status}'.",
            "data": {
                "order_id": order_id,
                "previous_status": current_status,
                "status": new_status,
                "shipment_id": shipment_id
            }
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({
            "status": "error",
            "message": f"Database error: {str(e)}"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()