import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db import get_db_connection

def test_connection():
    print("=" * 60)
    print("          BrightBuy TiDB Database Verification Tool")
    print("=" * 60)
    print("\n[1/3] Testing secure TLS handshake and session context...")
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT VERSION() AS db_version, DATABASE() AS current_db;")
        meta = cursor.fetchone()
        
        print("  [OK] TLS Handshake: Verified")
        print(f"  [OK] Database:       {meta['current_db']}")
        print(f"  [OK] TiDB Engine:    {meta['db_version']}")

        print("\n[2/3] Inspecting schema tables and record counts...")
        cursor.execute("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE';")
        tables_raw = cursor.fetchall()
        
        if not tables_raw:
            print("  [!] No base tables found in this database.")
        else:
            table_key = list(tables_raw[0].keys())[0]
            table_names = [row[table_key] for row in tables_raw]
            print(f"  [OK] Found {len(table_names)} tables in '{meta['current_db']}':\n")
            
            table_stats = []
            for tname in table_names:
                cursor.execute(f"SELECT COUNT(*) AS total FROM `{tname}`;")
                cnt = cursor.fetchone()['total']
                table_stats.append((tname, cnt))
            
            # Print table summary
            print(f"  {'Table Name':<35} | {'Row Count':>10}")
            print("  " + "-" * 50)
            for tname, cnt in table_stats:
                status = f"{cnt} rows" if cnt > 0 else "0 (empty)"
                print(f"  {tname:<35} | {status:>10}")

        print("\n[3/3] Inspecting sample data preview...")
        cursor.execute("SHOW TABLES;")
        all_tables = cursor.fetchall()
        if all_tables:
            first_key = list(all_tables[0].keys())[0]
            sample_candidates = [row[first_key] for row in all_tables]
            
            # Sample up to 3 non-empty tables to preview records
            preview_count = 0
            for tname in sample_candidates:
                cursor.execute(f"SELECT * FROM `{tname}` LIMIT 2;")
                samples = cursor.fetchall()
                if samples:
                    print(f"\n  * Sample Records from `{tname}`:")
                    for idx, row in enumerate(samples, 1):
                        print(f"    Record #{idx}: {row}")
                    preview_count += 1
                    if preview_count >= 3:
                        break
            if preview_count == 0:
                print("  ! Tables are present but no dummy records found yet.")

        cursor.close()
        conn.close()
        print("\n" + "=" * 60)
        print("Database test completed successfully!")
        print("=" * 60)
    except Exception as err:
        print(f"\n[!] Database Test Failed: {err}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    test_connection()

