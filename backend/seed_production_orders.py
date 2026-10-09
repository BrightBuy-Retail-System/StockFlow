"""
Seed realistic orders, order_items, shipments, and payments
for BrightBuy's new products and variants across Texas destination cities.
"""

from datetime import datetime, date, timedelta
from db import get_db_connection

def seed_orders():
    conn = get_db_connection()
    conn.autocommit = False
    cursor = conn.cursor(dictionary=True)

    try:
        # 1. Fetch available variants
        cursor.execute("""
            SELECT pv.variant_id, pv.product_id, p.title, p.category_id,
                   COALESCE(pv.price_override, p.base_price) AS price
            FROM product_variants pv
            JOIN products p ON pv.product_id = p.product_id
            WHERE p.is_active = 1
            LIMIT 30
        """)
        variants = cursor.fetchall()

        # 2. Fetch users
        cursor.execute("SELECT user_id, full_name FROM users WHERE role_id = 1 LIMIT 5")
        customers = cursor.fetchall()
        if not customers:
            # Fallback to any user
            cursor.execute("SELECT user_id, full_name FROM users LIMIT 3")
            customers = cursor.fetchall()

        # 3. Fetch Texas cities
        cursor.execute("SELECT city_id, city_name, base_lead_time_days FROM texas_cities")
        cities = cursor.fetchall()

        print(f"Variants: {len(variants)}, Customers: {len(customers)}, Cities: {len(cities)}")

        order_count = 0
        now = datetime.now()

        # Dates spreading over 2026 Q1, Q2, Q3, Q4
        date_offsets = [
            (datetime(2026, 1, 15, 10, 30), 'CONFIRMED', 'Paid', 'DELIVERED'),
            (datetime(2026, 2, 10, 14, 15), 'CONFIRMED', 'Paid', 'DELIVERED'),
            (datetime(2026, 4, 5, 9, 0), 'CONFIRMED', 'Paid', 'DELIVERED'),
            (datetime(2026, 5, 20, 16, 45), 'CONFIRMED', 'Paid', 'DELIVERED'),
            (datetime(2026, 7, 12, 11, 20), 'CONFIRMED', 'Paid', 'DELIVERED'),
            (datetime(2026, 8, 25, 13, 10), 'CONFIRMED', 'Paid', 'DELIVERED'),
            (datetime(2026, 9, 18, 15, 50), 'SHIPPED', 'Paid', 'DISPATCHED'),
            (datetime(2026, 10, 2, 8, 30), 'CONFIRMED', 'Paid', 'IN_TRANSIT'),
            (datetime(2026, 10, 8, 12, 0), 'PENDING', 'Pending', 'PENDING'),
            (datetime(2026, 10, 9, 10, 15), 'CONFIRMED', 'Pending', 'PENDING'),
        ]

        for i, (order_dt, ord_status, pay_status, ship_status) in enumerate(date_offsets):
            cust = customers[i % len(customers)]
            city = cities[i % len(cities)]
            
            # Select 1-2 items
            item1 = variants[(i * 2) % len(variants)]
            item2 = variants[(i * 2 + 1) % len(variants)]
            
            qty1 = 1 + (i % 2)
            qty2 = 1
            total_amt = float(item1['price']) * qty1 + float(item2['price']) * qty2

            tracking_no = f"TX-BRIGHT-{20260000 + i + 100}"
            est_arrival = order_dt.date() + timedelta(days=5 if city['city_name'] in ['Dallas', 'Houston', 'Austin', 'Fort Worth', 'San Antonio'] else 7)

            # Insert shipment
            cursor.execute("""
                INSERT INTO shipments (tracking_number, destination_city_id, shipping_status, estimated_arrival, dispatched_at)
                VALUES (%s, %s, %s, %s, %s)
            """, (tracking_no, city['city_id'], ship_status, est_arrival, order_dt if ship_status != 'PENDING' else None))
            shipment_id = cursor.lastrowid

            # Insert order
            cursor.execute("""
                INSERT INTO orders (user_id, shipment_id, total_amount, status, payment_status, placed_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (cust['user_id'], shipment_id, total_amt, ord_status, pay_status, order_dt))
            order_id = cursor.lastrowid

            # Insert order items
            cursor.execute("""
                INSERT INTO order_items (order_id, variant_id, quantity, unit_price)
                VALUES (%s, %s, %s, %s)
            """, (order_id, item1['variant_id'], qty1, item1['price']))

            cursor.execute("""
                INSERT INTO order_items (order_id, variant_id, quantity, unit_price)
                VALUES (%s, %s, %s, %s)
            """, (order_id, item2['variant_id'], qty2, item2['price']))

            # Insert payment if paid
            if pay_status == 'Paid':
                txn_ref = f"TXN-BRIGHT-2026-{1000 + i}"
                cursor.execute("""
                    INSERT INTO PAYMENT_TRANSACTION (order_id, amount, transaction_reference, processed_at)
                    VALUES (%s, %s, %s, %s)
                """, (order_id, total_amt, txn_ref, order_dt))

            order_count += 1

        conn.commit()
        print(f"Successfully seeded {order_count} rich multi-quarter orders across Texas hubs!")

    except Exception as e:
        conn.rollback()
        print("ERROR seeding orders:", e)
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    seed_orders()
