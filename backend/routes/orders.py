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

def resolve_payment_status(cursor):
    """Safely extracts a valid ENUM value for payments.payment_status from information_schema."""
    try:
        cursor.execute("""
            SELECT COLUMN_TYPE, COLUMN_DEFAULT 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'payments' 
              AND COLUMN_NAME = 'payment_status'
        """)
        row = cursor.fetchone()
        if row:
            if row.get('COLUMN_DEFAULT'):
                return row['COLUMN_DEFAULT']
            col_type = row.get('COLUMN_TYPE', '')
            if col_type.startswith('enum('):
                allowed_vals = [v.strip("'\" )") for v in col_type[5:].split(',')]
                for preferred in ['COMPLETED', 'PAID', 'SUCCESS', 'PENDING']:
                    if preferred in allowed_vals:
                        return preferred
                return allowed_vals[0]
    except Exception:
        pass
    return 'COMPLETED'

@orders_bp.route('/ping', methods=['GET'])
def ping():
    return jsonify({
        "status": "healthy",
        "module": "orders"
    }), 200

@orders_bp.route('/shipping-cities', methods=['GET'])
def get_shipping_cities():
    """Public/Customer endpoint: Retrieve available Texas delivery hubs, fees, and lead times."""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT 
                city_id,
                city_name,
                hub_name,
                base_lead_time_days,
                shipping_fee
            FROM texas_cities
            ORDER BY city_id ASC
        """
        cursor.execute(query)
        cities = cursor.fetchall()

        return jsonify({
            "status": "success",
            "count": len(cities),
            "data": [serialize_row(c) for c in cities]
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
                o.subtotal,
                o.service_fee,
                o.shipping_fee,
                o.delivery_type,
                o.recipient_name,
                o.phone,
                o.shipping_address,
                o.billing_address,
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

        # 1. Fetch Line Items
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

        # 2. Fetch Payment Record
        cursor.execute("""
            SELECT 
                payment_id,
                payment_method,
                transaction_ref,
                amount,
                payment_status,
                processed_at
            FROM payments
            WHERE order_id = %s
            ORDER BY payment_id DESC
            LIMIT 1
        """, (order_id,))
        payment_record = cursor.fetchone()

        payload = serialize_row(order)
        payload["payment"] = serialize_row(payment_record) if payment_record else None
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

    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({"status": "error", "message": "Missing JSON request body."}), 400

    payload_user_id = payload.get('user_id', authenticated_user_id)
    if role_id == 1 and payload_user_id != authenticated_user_id:
        return jsonify({
            "status": "error",
            "message": "Access forbidden: Customers cannot submit orders on behalf of other accounts."
        }), 403

    user_id = payload_user_id
    items = payload.get('items', [])
    if not isinstance(items, list) or len(items) == 0:
        return jsonify({"status": "error", "message": "Field 'items' must be a non-empty list."}), 400

    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            return jsonify({"status": "error", "message": f"Item at index {idx} must be a JSON object."}), 400
        vid = item.get('variant_id')
        qty = item.get('quantity')
        if not isinstance(vid, int) or vid <= 0:
            return jsonify({"status": "error", "message": f"Item at index {idx} has an invalid 'variant_id'."}), 400
        if not isinstance(qty, int) or qty <= 0:
            return jsonify({"status": "error", "message": f"Item at index {idx} must specify a positive quantity."}), 400

    validate_only = payload.get('validate_only', False)

    # 1. Delivery & Address Ingestion
    delivery_type = payload.get('delivery_type', 'SHIP').upper()
    if delivery_type not in ('SHIP', 'PICKUP'):
        delivery_type = 'SHIP'

    recipient_name = payload.get('recipient_name', '').strip()
    phone = payload.get('phone', '').strip()
    shipping_address = payload.get('shipping_address', '').strip()
    billing_address = payload.get('billing_address', '').strip() or shipping_address
    payment_method = payload.get('payment_method', 'CREDIT_CARD').strip().upper()
    shipping_city_id = payload.get('shipping_city_id', 1)

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        conn.autocommit = False
        cursor = conn.cursor(dictionary=True)

        # 2. Verify Customer
        cursor.execute("SELECT user_id, full_name, email FROM users WHERE user_id = %s", (user_id,))
        user_row = cursor.fetchone()
        if not user_row:
            conn.rollback()
            return jsonify({"status": "error", "message": f"User #{user_id} does not exist."}), 404

        if not recipient_name:
            recipient_name = user_row['full_name']

        # 3. Determine Shipping Fee & Destination
        if delivery_type == 'PICKUP':
            shipping_fee = Decimal('0.00')
            city_name = 'In-Store Pickup'
            lead_days = 0
            # City ID 1 serves as fallback hub reference for pickup shipments
            shipping_city_id = shipping_city_id or 1
        else:
            cursor.execute(
                "SELECT city_id, city_name, base_lead_time_days, shipping_fee FROM texas_cities WHERE city_id = %s",
                (shipping_city_id,)
            )
            city_row = cursor.fetchone()
            if not city_row:
                conn.rollback()
                return jsonify({"status": "error", "message": f"City #{shipping_city_id} not found."}), 404
            shipping_fee = Decimal(str(city_row['shipping_fee']))
            city_name = city_row['city_name']
            lead_days = city_row.get('base_lead_time_days') or 3

        # 4. Pessimistic Lock on Catalog & Stock
        requested_vids = [item['variant_id'] for item in items]
        format_strings = ','.join(['%s'] * len(requested_vids))
        lock_query = f"""
            SELECT pv.variant_id, pv.sku, p.title AS product_title,
                   COALESCE(pv.price_override, p.base_price) AS effective_price,
                   COALESCE(inv.stock_quantity, 0) AS stock_quantity
            FROM product_variants pv
            JOIN products p ON pv.product_id = p.product_id
            LEFT JOIN inventory inv ON pv.variant_id = inv.variant_id
            WHERE pv.variant_id IN ({format_strings})
            FOR UPDATE
        """
        cursor.execute(lock_query, requested_vids)
        variants_db = {v['variant_id']: v for v in cursor.fetchall()}

        verified_items = []
        subtotal = Decimal('0.00')

        for item in items:
            vid = item.get('variant_id')
            qty = item.get('quantity')
            if vid not in variants_db:
                conn.rollback()
                return jsonify({"status": "error", "message": f"Variant #{vid} does not exist."}), 404

            var_record = variants_db[vid]
            if var_record['stock_quantity'] < qty:
                conn.rollback()
                return jsonify({
                    "status": "error",
                    "code": "OUT_OF_STOCK",
                    "message": f"Insufficient stock for SKU '{var_record['sku']}'. Requested: {qty}, Available: {var_record['stock_quantity']}."
                }), 409

            unit_price = Decimal(str(var_record['effective_price']))
            line_total = unit_price * qty
            subtotal += line_total
            verified_items.append({
                "variant_id": vid,
                "sku": var_record['sku'],
                "title": var_record['product_title'],
                "quantity": qty,
                "unit_price": unit_price,
                "line_total": line_total
            })

        # 5. Service Fee (from payload if provided, defaults to 0.00)
        service_fee = Decimal(str(payload.get('service_fee', '0.00')))
        total_amount = subtotal + service_fee + shipping_fee

        # Pre-Flight Calculation Response (Powers the right sidebar)
        if validate_only:
            conn.rollback()
            return jsonify({
                "status": "verified",
                "calculation": {
                    "user": user_row['full_name'],
                    "delivery_type": delivery_type,
                    "destination": city_name,
                    "subtotal": float(subtotal),
                    "service_fee": float(service_fee),
                    "shipping_fee": float(shipping_fee),
                    "total_amount": float(total_amount),
                    "items": [
                        {
                            "variant_id": it['variant_id'],
                            "sku": it['sku'],
                            "title": it['title'],
                            "quantity": it['quantity'],
                            "unit_price": float(it['unit_price']),
                            "line_total": float(it['line_total'])
                        }
                        for it in verified_items
                    ]
                }
            }), 200

        # --- ACID COMMIT PATH ---
        # 6. Insert Shipment
        tracking_number = f"TX-{datetime.now().strftime('%Y%m%d%H%M')}-{uuid.uuid4().hex[:6].upper()}"
        est_arrival = (datetime.now() + timedelta(days=int(lead_days))).date() if lead_days > 0 else None

        cursor.execute("""
            INSERT INTO shipments (
                tracking_number, destination_city_id, shipping_status, 
                estimated_arrival, delivery_address, recipient_phone
            ) VALUES (%s, %s, 'PENDING', %s, %s, %s)
        """, (tracking_number, shipping_city_id, est_arrival, shipping_address, phone))
        shipment_id = cursor.lastrowid

        # 7. Insert Order with Address Snapshots & Fee Breakdown
        cursor.execute("""
            INSERT INTO orders (
                user_id, shipment_id, total_amount, status, delivery_type,
                recipient_name, phone, shipping_address, billing_address,
                subtotal, service_fee, shipping_fee
            ) VALUES (%s, %s, %s, 'PENDING', %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id, shipment_id, total_amount, delivery_type,
            recipient_name, phone, shipping_address, billing_address,
            subtotal, service_fee, shipping_fee
        ))
        order_id = cursor.lastrowid

        # 8. Insert Order Items & Decrement Inventory
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

        # 9. Insert Payment Record
        # For COD: payment remains 'INITIATED' until courier delivers.
        # For Cards/Wallets: payment is marked 'SUCCESS'.
        payment_status = 'INITIATED' if payment_method in ('COD', 'CASH_ON_DELIVERY') else 'SUCCESS'
        transaction_ref = f"TX-PAY-{datetime.now().strftime('%Y%m%d%H%M')}-{uuid.uuid4().hex[:6].upper()}"

        cursor.execute("""
            INSERT INTO payments (order_id, payment_method, transaction_ref, amount, payment_status, processed_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """, (order_id, payment_method, transaction_ref, total_amount, payment_status))
        payment_id = cursor.lastrowid

        # 10. Clear Active Cart
        cursor.execute("""
            DELETE ci FROM cart_items ci
            JOIN carts c ON ci.cart_id = c.cart_id
            WHERE c.user_id = %s
        """, (user_id,))

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Order placed successfully.",
            "data": {
                "order_id": order_id,
                "shipment_id": shipment_id,
                "tracking_number": tracking_number,
                "payment_id": payment_id,
                "transaction_ref": transaction_ref,
                "payment_status": payment_status,
                "payment_method": payment_method,
                "delivery_type": delivery_type,
                "subtotal": float(subtotal),
                "service_fee": float(service_fee),
                "shipping_fee": float(shipping_fee),
                "total_amount": float(total_amount),
                "status": "PENDING"
            }
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"status": "error", "message": f"Database error: {str(e)}"}), 500
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

        # 3. Synchronize Shipment Status
        shipment_id = order.get('shipment_id')
        if shipment_id:
            if new_status == 'SHIPPED':
                cursor.execute("""
                    UPDATE shipments 
                    SET shipping_status = 'DISPATCHED', dispatched_at = NOW() 
                    WHERE shipment_id = %s
                """, (shipment_id,))
            elif new_status == 'DELIVERED':
                cursor.execute("""
                    UPDATE shipments 
                    SET shipping_status = 'DELIVERED', delivered_at = NOW() 
                    WHERE shipment_id = %s
                """, (shipment_id,))
                # Settle Cash on Delivery payment
                cursor.execute("""
                    UPDATE payments 
                    SET payment_status = 'SUCCESS' 
                    WHERE order_id = %s AND payment_status = 'INITIATED'
                """, (order_id,))

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