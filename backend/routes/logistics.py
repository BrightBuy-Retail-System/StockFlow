from datetime import date, timedelta

from flask import Blueprint, jsonify, request

from db import get_db_connection

logistics_bp = Blueprint('logistics', __name__)

# Business rule (per SRS Feature 5): an out-of-stock variant adds
# this many extra days to the base delivery lead time.
OUT_OF_STOCK_PENALTY_DAYS = 3


@logistics_bp.route('/cities', methods=['GET'])
def get_cities():
    """List all Texas cities with their base lead time and shipping fee."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT city_id, city_name, hub_name, base_lead_time_days, shipping_fee
            FROM texas_cities
            ORDER BY city_name
            """
        )
        cities = cursor.fetchall()
        for c in cities:
            c['shipping_fee'] = float(c['shipping_fee'])
        return jsonify(cities), 200
    finally:
        cursor.close()
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

    If ANY item in the cart is out of stock, the whole shipment
    gets the out-of-stock penalty, since it all ships together.

    If any variant_id doesn't exist at all, the request is
    rejected with a 400 rather than silently treating it as
    out-of-stock -- those are different problems (a missing
    product vs. a real one that's sold out).
    """
    data = request.get_json(silent=True) or {}
    city_id = data.get('city_id')
    items = data.get('items', [])

    if not city_id:
        return jsonify({"error": "city_id is required"}), 400
    if not items:
        return jsonify({"error": "items list is required and cannot be empty"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
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
            return jsonify({"error": f"No city found with city_id {city_id}"}), 404

        out_of_stock_variant_ids = []
        invalid_variant_ids = []

        for item in items:
            variant_id = item.get('variant_id')
            cursor.execute(
                "SELECT stock_quantity FROM inventory WHERE variant_id = %s",
                (variant_id,),
            )
            row = cursor.fetchone()

            if row is None:
                invalid_variant_ids.append(variant_id)
                continue

            if row['stock_quantity'] <= 0:
                out_of_stock_variant_ids.append(variant_id)

        if invalid_variant_ids:
            return jsonify({
                "error": "One or more variant IDs do not exist",
                "invalid_variant_ids": invalid_variant_ids,
            }), 400

        base_days = city['base_lead_time_days']
        penalty_days = OUT_OF_STOCK_PENALTY_DAYS if out_of_stock_variant_ids else 0
        total_lead_time_days = base_days + penalty_days
        estimated_delivery_date = date.today() + timedelta(days=total_lead_time_days)

        shipping_fee = city['shipping_fee'] if city['shipping_fee'] is not None else 0

        return jsonify({
            "city_id": city['city_id'],
            "city_name": city['city_name'],
            "hub_name": city['hub_name'],
            "base_lead_time_days": base_days,
            "out_of_stock_penalty_days": penalty_days,
            "out_of_stock_variant_ids": out_of_stock_variant_ids,
            "total_lead_time_days": total_lead_time_days,
            "estimated_delivery_date": estimated_delivery_date.isoformat(),
            "shipping_fee": float(shipping_fee),
        }), 200
    finally:
        cursor.close()
        conn.close()


@logistics_bp.route('/shipments/<tracking_number>', methods=['GET'])
def track_shipment(tracking_number):
    """Look up a shipment's current status by tracking number."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT s.shipment_id, s.tracking_number, s.shipping_status,
                   s.estimated_arrival, s.dispatched_at, s.delivered_at,
                   c.city_name, c.hub_name
            FROM shipments s
            JOIN texas_cities c ON s.destination_city_id = c.city_id
            WHERE s.tracking_number = %s
            """,
            (tracking_number,),
        )
        shipment = cursor.fetchone()

        if not shipment:
            return jsonify({"error": "No shipment found with that tracking number"}), 404

        return jsonify(shipment), 200
    finally:
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