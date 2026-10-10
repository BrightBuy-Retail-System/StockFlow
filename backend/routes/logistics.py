import os
from datetime import date, datetime, timedelta
from decimal import Decimal
from flask import Blueprint, jsonify, request

from db import get_db_connection

logistics_bp = Blueprint('logistics', __name__)

# Business rule (per SRS Feature 5): an out-of-stock variant adds
# this many extra days to the base delivery lead time.
OUT_OF_STOCK_PENALTY_DAYS = 3


def serialize_value(val):
    """Safely convert Decimal, datetime, and date objects to JSON primitives."""
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    return val


def clean_row(row):
    """Recursively convert database row dictionary values for JSON serialization."""
    if not row:
        return row
    return {k: serialize_value(v) for k, v in row.items()}


@logistics_bp.route('/cities', methods=['GET'])
def get_cities():
    """List all Texas regional hubs with their base lead time, fee, and live throughput metrics."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT 
                city_id, 
                city_name, 
                hub_name, 
                base_lead_time_days, 
                shipping_fee
            FROM texas_cities
            ORDER BY city_name ASC
            """
        )
        cities = cursor.fetchall()
        cursor.close()

        result = []
        for c in cities:
            cleaned = clean_row(c)
            cleaned['shipping_fee'] = float(cleaned.get('shipping_fee') or 0.0)
            result.append(cleaned)

        return jsonify(result), 200
    except Exception as err:
        return jsonify({"error": f"Failed to retrieve Texas regional hubs: {str(err)}"}), 500
    finally:
        if conn and conn.is_connected():
            conn.close()


@logistics_bp.route('/stats', methods=['GET'])
def get_logistics_stats():
    """Return high-level KPIs across the Texas logistics and fulfillment network."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT COUNT(*) AS total_hubs, AVG(base_lead_time_days) AS avg_lead_days FROM texas_cities")
        city_stats = cursor.fetchone() or {}

        cursor.execute(
            """
            SELECT 
                COUNT(*) AS total_shipments,
                SUM(CASE WHEN shipping_status = 'PENDING' THEN 1 ELSE 0 END) AS pending_count,
                SUM(CASE WHEN shipping_status = 'DISPATCHED' THEN 1 ELSE 0 END) AS dispatched_count,
                SUM(CASE WHEN shipping_status = 'IN_TRANSIT' THEN 1 ELSE 0 END) AS in_transit_count,
                SUM(CASE WHEN shipping_status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered_count
            FROM shipments
            """
        )
        shipment_stats = cursor.fetchone() or {}
        cursor.close()

        total_shipments = int(shipment_stats.get('total_shipments') or 0)
        pending = int(shipment_stats.get('pending_count') or 0)
        dispatched = int(shipment_stats.get('dispatched_count') or 0)
        in_transit = int(shipment_stats.get('in_transit_count') or 0)
        delivered = int(shipment_stats.get('delivered_count') or 0)
        active_pipeline = pending + dispatched + in_transit

        return jsonify({
            "total_hubs": int(city_stats.get('total_hubs') or 8),
            "avg_lead_time_days": round(float(city_stats.get('avg_lead_days') or 1.8), 1),
            "total_shipments": total_shipments,
            "active_pipeline": active_pipeline,
            "pending": pending,
            "dispatched": dispatched,
            "in_transit": in_transit,
            "delivered": delivered,
        }), 200
    except Exception as err:
        return jsonify({"error": f"Failed to compute logistics KPIs: {str(err)}"}), 500
    finally:
        if conn and conn.is_connected():
            conn.close()


@logistics_bp.route('/calculate-delivery', methods=['POST'])
def calculate_delivery():
    """
    Calculate estimated delivery lead time and date for a set of
    cart items shipping to a given Texas city.

    Expected JSON body:
    {
        "city_id": 3,
        "items": [
            {"variant_id": 1, "quantity": 2},
            {"variant_id": 5, "quantity": 1}
        ]
    }
    """
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON body provided"}), 400

    city_id_raw = data.get('city_id')
    items_raw = data.get('items')

    if city_id_raw is None or city_id_raw == '':
        return jsonify({"error": "city_id is required"}), 400

    try:
        city_id = int(city_id_raw)
    except (ValueError, TypeError):
        return jsonify({"error": "city_id must be a valid integer"}), 400

    if not isinstance(items_raw, list) or len(items_raw) == 0:
        return jsonify({"error": "items list is required and cannot be empty"}), 400

    # Parse and validate items structure
    parsed_items = []
    for idx, itm in enumerate(items_raw):
        if not isinstance(itm, dict):
            return jsonify({"error": f"Item at index {idx} must be an object with variant_id and quantity"}), 400
        vid = itm.get('variant_id')
        qty = itm.get('quantity', 1)
        try:
            vid = int(vid)
            qty = max(1, int(qty))
            parsed_items.append({"variant_id": vid, "quantity": qty})
        except (ValueError, TypeError):
            return jsonify({"error": f"Invalid variant_id or quantity in item at index {idx}"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Fetch Destination City Info
        cursor.execute(
            """
            SELECT city_id, city_name, hub_name, base_lead_time_days, shipping_fee
            FROM texas_cities
            WHERE city_id = %s
            """,
            (city_id,),
        )
        city = cursor.fetchone()

        if not city:
            cursor.close()
            return jsonify({"error": f"No Texas destination city found with city_id {city_id}"}), 404

        # 2. Batch Fetch Inventory for all requested variants (eliminates N+1 query)
        req_variant_ids = [it['variant_id'] for it in parsed_items]
        format_strings = ','.join(['%s'] * len(req_variant_ids))
        cursor.execute(
            f"""
            SELECT pv.variant_id, pv.sku, p.title, COALESCE(inv.stock_quantity, 0) AS stock_quantity
            FROM product_variants pv
            JOIN products p ON pv.product_id = p.product_id
            LEFT JOIN inventory inv ON pv.variant_id = inv.variant_id
            WHERE pv.variant_id IN ({format_strings})
            """,
            req_variant_ids,
        )
        found_rows = cursor.fetchall()
        cursor.close()

        found_map = {row['variant_id']: row for row in found_rows}
        invalid_variant_ids = []
        out_of_stock_variant_ids = []
        item_breakdown = []

        for it in parsed_items:
            vid = it['variant_id']
            qty = it['quantity']
            if vid not in found_map:
                invalid_variant_ids.append(vid)
                continue

            inv_row = found_map[vid]
            curr_stock = int(inv_row['stock_quantity'])
            is_delayed = (curr_stock <= 0) or (curr_stock < qty)

            if is_delayed:
                out_of_stock_variant_ids.append(vid)

            item_breakdown.append({
                "variant_id": vid,
                "title": inv_row['title'],
                "sku": inv_row['sku'],
                "requested_quantity": qty,
                "current_stock": curr_stock,
                "in_stock": curr_stock >= qty,
                "adds_delay": is_delayed,
            })

        if invalid_variant_ids:
            return jsonify({
                "error": "One or more variant IDs do not exist",
                "invalid_variant_ids": invalid_variant_ids,
            }), 400

        base_days = int(city['base_lead_time_days'])
        penalty_days = OUT_OF_STOCK_PENALTY_DAYS if out_of_stock_variant_ids else 0
        total_lead_time_days = base_days + penalty_days
        estimated_delivery_date = date.today() + timedelta(days=total_lead_time_days)
        shipping_fee = float(city['shipping_fee'] if city['shipping_fee'] is not None else 0.0)

        return jsonify({
            "city_id": city['city_id'],
            "city_name": city['city_name'],
            "hub_name": city['hub_name'],
            "base_lead_time_days": base_days,
            "out_of_stock_penalty_days": penalty_days,
            "out_of_stock_variant_ids": out_of_stock_variant_ids,
            "total_lead_time_days": total_lead_time_days,
            "estimated_delivery_date": estimated_delivery_date.isoformat(),
            "shipping_fee": shipping_fee,
            "item_breakdown": item_breakdown,
        }), 200
    except Exception as err:
        return jsonify({"error": f"Failed to calculate delivery estimate: {str(err)}"}), 500
    finally:
        if conn and conn.is_connected():
            conn.close()


@logistics_bp.route('/shipments/<tracking_number>', methods=['GET'])
def track_shipment(tracking_number):
    """Look up full shipment and routing context by tracking number."""
    if not tracking_number or not tracking_number.strip():
        return jsonify({"error": "Tracking number is required"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT 
                s.shipment_id, 
                s.tracking_number, 
                s.shipping_status,
                s.estimated_arrival, 
                s.dispatched_at, 
                s.delivered_at,
                s.delivery_address, 
                s.recipient_phone,
                c.city_id, 
                c.city_name, 
                c.hub_name, 
                c.base_lead_time_days, 
                c.shipping_fee,
                o.order_id, 
                o.user_id, 
                o.status AS order_status, 
                o.total_amount,
                u.full_name AS customer_name
            FROM shipments s
            JOIN texas_cities c ON s.destination_city_id = c.city_id
            LEFT JOIN orders o ON o.shipment_id = s.shipment_id
            LEFT JOIN users u ON o.user_id = u.user_id
            WHERE s.tracking_number = %s
            """,
            (tracking_number.strip(),),
        )
        shipment = cursor.fetchone()
        cursor.close()

        if not shipment:
            return jsonify({"error": f"No shipment found for tracking number '{tracking_number}'"}), 404

        return jsonify(clean_row(shipment)), 200
    except Exception as err:
        return jsonify({"error": f"Failed to query tracking information: {str(err)}"}), 500
    finally:
        if conn and conn.is_connected():
            conn.close()


@logistics_bp.route('/shipments', methods=['GET'])
def list_shipments():
    """
    List shipments with optional filtering by status or search keyword.
    Supports ?status=PENDING|DISPATCHED|IN_TRANSIT|DELIVERED|ALL&q=<search>&limit=<num>
    """
    status_filter = request.args.get('status', 'ALL').strip().upper()
    query_search = request.args.get('q', '').strip()
    limit = min(int(request.args.get('limit', 50)), 100)

    conn = None
    try:
        cursor.close()
        conn.close()


@logistics_bp.route('/upcoming-shipments', methods=['GET'])
def upcoming_shipments():
    """
    Admin/logistics view: all shipments that haven't been delivered
    yet, soonest estimated arrival first. Matches Management Report
    style views used elsewhere in the project.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT s.shipment_id, s.tracking_number, s.shipping_status,
                   s.estimated_arrival, c.city_name, c.hub_name
            FROM shipments s
            JOIN texas_cities c ON s.destination_city_id = c.city_id
            WHERE s.shipping_status != 'DELIVERED'
            ORDER BY s.estimated_arrival ASC
            """
        )
        shipments = cursor.fetchall()
        return jsonify(shipments), 200
    finally:
        cursor.close()
        conn.close()