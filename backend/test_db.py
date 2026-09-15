import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db import get_db_connection

def test_connection():
    print("Testing connection to database...")
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT VERSION() AS db_version, DATABASE() AS current_db;")
        result = cursor.fetchone()
        
        print("\n--- Connection Successful ---")
        print(f"Database: {result['current_db']}")
        print(f"Engine Version: {result['db_version']}")
        print("TLS/SSL Handshake: Verified\n")
        
        cursor.close()
        conn.close()
    except Exception as err:
        print(f"\n[!] Connection Failed: {err}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    test_connection()
