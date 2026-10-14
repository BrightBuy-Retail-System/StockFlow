import db

def run_migration():
    conn = db.get_db_connection()
    cur = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'users' 
          AND COLUMN_NAME = 'assigned_city_id'
    """)
    exists = cur.fetchone()

    if not exists:
        print("Adding assigned_city_id to users table...")
        cur.execute("""
            ALTER TABLE users 
            ADD COLUMN assigned_city_id INT NULL,
            ADD CONSTRAINT fk_users_assigned_city 
                FOREIGN KEY (assigned_city_id) REFERENCES texas_cities(city_id)
                ON DELETE SET NULL ON UPDATE CASCADE
        """)
        conn.commit()
        print("[OK] Column assigned_city_id added to users table.")
    else:
        print("Column assigned_city_id already exists.")

    # Assign default warehouses for existing managers and customers
    # User 2 (Elena) -> Dallas (1)
    # User 150003 (Warehouse Manager) -> Houston (4)
    # User 360003 -> Austin (3)
    cur.execute("UPDATE users SET assigned_city_id = 1 WHERE user_id = 2")
    cur.execute("UPDATE users SET assigned_city_id = 4 WHERE user_id = 150003")
    cur.execute("UPDATE users SET assigned_city_id = 3 WHERE user_id = 360003")
    cur.execute("UPDATE users SET assigned_city_id = 1 WHERE role_id = 1 AND assigned_city_id IS NULL")
    conn.commit()

    print("\nVerified users with assigned warehouses:")
    cur.execute("""
        SELECT u.user_id, u.full_name, u.email, u.role_id, u.assigned_city_id, c.city_name, c.hub_name
        FROM users u
        LEFT JOIN texas_cities c ON u.assigned_city_id = c.city_id
        WHERE u.role_id IN (1, 2)
        LIMIT 10
    """)
    for r in cur.fetchall():
        print(f"  User #{r['user_id']} ({r['full_name']}) -> Role {r['role_id']} | City: {r['city_name']} ({r['hub_name']})")

    cur.close()
    conn.close()

if __name__ == '__main__':
    run_migration()
