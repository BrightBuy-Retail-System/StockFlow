import db

def migrate_phone():
    conn = db.get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'users' 
              AND COLUMN_NAME = 'phone'
        """)
        exists = cur.fetchone()

        if not exists:
            print("Adding phone column to users table...")
            cur.execute("""
                ALTER TABLE users 
                ADD COLUMN phone VARCHAR(30) NULL AFTER email
            """)
            conn.commit()
            print("Successfully added phone column to users table.")
        else:
            print("phone column already exists on users table.")

        # Also let's inspect the columns
        cur.execute("DESCRIBE users")
        cols = [c['Field'] for c in cur.fetchall()]
        print("Updated users columns:", cols)

    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    migrate_phone()
