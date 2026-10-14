import os
import re
import mysql.connector

def migrate():
    dump_path = os.path.join(os.path.dirname(__file__), 'stockflow_dump.sql')
    with open(dump_path, 'r', encoding='utf-8') as f:
        content = f.read()

    print("Connecting to Railway MySQL...")
    conn = mysql.connector.connect(
        host='zephyr.proxy.rlwy.net',
        port=57707,
        user='root',
        password='jGoAiVsHwJIQtOeMaUvVKwLOjlKWeHHt',
        database='railway',
        ssl_disabled=True,
        connection_timeout=15,
        autocommit=True
    )
    cursor = conn.cursor()

    print("Disabling foreign key checks...")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")

    # Split into individual clean statements
    raw_stmts = content.split(';\n')
    executed = 0
    errors = 0

    for s in raw_stmts:
        stmt = s.strip()
        if not stmt or stmt.startswith('--'):
            continue
        # Skip comment-only lines
        lines = [line for line in stmt.split('\n') if not line.strip().startswith('--')]
        clean_stmt = '\n'.join(lines).strip()
        if not clean_stmt or clean_stmt == 'SET FOREIGN_KEY_CHECKS = 0' or clean_stmt == 'SET FOREIGN_KEY_CHECKS = 1':
            continue

        try:
            cursor.execute(clean_stmt)
            executed += 1
            if executed % 10 == 0:
                print(f"  Progress: {executed} statements executed...")
        except Exception as e:
            errors += 1
            print(f"\n[Warning] {e}")
            print(f"Snippet: {clean_stmt[:90]}...\n")

    print("Re-enabling foreign key checks...")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")

    cursor.execute("SHOW TABLES;")
    tables = [r[0] for r in cursor.fetchall()]
    print(f"\n[SUCCESS] Migration completed! Tables ({len(tables)}): {tables}")

    cursor.close()
    conn.close()

if __name__ == '__main__':
    migrate()
