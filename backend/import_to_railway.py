import os
import sys
import mysql.connector
from urllib.parse import urlparse

def import_dump():
    dump_file = os.path.join(os.path.dirname(__file__), 'stockflow_dump.sql')
    if not os.path.exists(dump_file):
        print(f"Error: Dump file {dump_file} not found.")
        return

    conn_str = sys.argv[1] if len(sys.argv) > 1 else input("Enter Railway MySQL Public URL: ").strip()

    if conn_str.startswith('mysql://'):
        p = urlparse(conn_str)
        config = {
            'host': p.hostname,
            'port': p.port or 3306,
            'user': p.username or 'root',
            'password': p.password or '',
            'database': p.path.lstrip('/') or 'railway',
            'ssl_disabled': True  # Essential for Python 3.13 over Railway proxy
        }
    else:
        host = conn_str
        port = int(input("Port: ").strip())
        user = input("User (default root): ").strip() or "root"
        password = input("Password: ").strip()
        database = input("Database (default railway): ").strip() or "railway"
        config = {
            'host': host,
            'port': port,
            'user': user,
            'password': password,
            'database': database,
            'ssl_disabled': True
        }

    print(f"\nConnecting to Railway MySQL at {config['host']}:{config['port']} (ssl_disabled=True)...")
    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        print("Connected successfully to Railway MySQL!")
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    print(f"Reading {dump_file}...")
    with open(dump_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    # Split statements carefully
    raw_statements = sql_content.split(';\n')
    statements = []
    for s in raw_statements:
        cleaned = s.strip()
        if cleaned and not cleaned.startswith('--'):
            statements.append(cleaned)

    print(f"Executing {len(statements)} SQL statements...")
    success = 0
    errors = 0
    for stmt in statements:
        try:
            cursor.execute(stmt)
            success += 1
        except Exception as e:
            errors += 1
            print(f"Notice: {e}")
            print(f"  Statement snippet: {stmt[:120]}...\n")

    conn.commit()
    cursor.close()
    conn.close()
    print(f"\n[DONE] Finished importing to Railway MySQL! ({success} statements succeeded, {errors} errors)")

if __name__ == '__main__':
    import_dump()
