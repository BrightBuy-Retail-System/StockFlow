from datetime import date, timedelta

from flask import Blueprint, jsonify, request
from db import get_db_connection
logistics_bp = Blueprint('logistics', __name__)
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

        for item in items:
            variant_id = item.get('variant_id')
            cursor.execute(
                "SELECT stock_quantity FROM inventory WHERE variant_id = %s",
                (variant_id,),
            )
            row = cursor.fetchone()
            stock_quantity = row['stock_quantity'] if row else 0

            if stock_quantity <= 0:
                out_of_stock_variant_ids.append(variant_id)

        base_days = city['base_lead_time_days']
        penalty_days = OUT_OF_STOCK_PENALTY_DAYS if out_of_stock_variant_ids else 0
        total_lead_time_days = base_days + penalty_days
        estimated_delivery_date = date.today() + timedelta(days=total_lead_time_days)

        return jsonify({
            "city_id": city['city_id'],
            "city_name": city['city_name'],
            "hub_name": city['hub_name'],
            "base_lead_time_days": base_days,
            "out_of_stock_penalty_days": penalty_days,
            "out_of_stock_variant_ids": out_of_stock_variant_ids,
            "total_lead_time_days": total_lead_time_days,
            "estimated_delivery_date": estimated_delivery_date.isoformat(),
            "shipping_fee": float(city['shipping_fee']),
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