import os
import db

def export_database():
    output_path = os.path.join(os.path.dirname(__file__), 'stockflow_dump.sql')
    conn = db.get_db_connection()
    cursor = conn.cursor(dictionary=True)

    print("Fetching tables and views from TiDB...")
    cursor.execute("SHOW FULL TABLES;")
    all_objects = cursor.fetchall()

    base_tables = []
    views = []
    for item in all_objects:
        vals = list(item.values())
        obj_name = vals[0]
        obj_type = vals[1]
        if obj_type == 'BASE TABLE':
            base_tables.append(obj_name)
        elif obj_type == 'VIEW':
            views.append(obj_name)

    sql_statements = []
    sql_statements.append("-- ========================================================")
    sql_statements.append("-- StockFlow Database Dump from TiDB Cloud")
    sql_statements.append("-- Generated automatically for Railway MySQL Import")
    sql_statements.append("-- ========================================================\n")
    sql_statements.append("SET FOREIGN_KEY_CHECKS = 0;\n")

    # Dump Base Tables (DDL + Data)
    for table in base_tables:
        print(f"Exporting table: {table}...")
        cursor.execute(f"SHOW CREATE TABLE `{table}`;")
        create_res = cursor.fetchone()
        create_sql = create_res.get('Create Table')
        # Clean TiDB-specific comment syntax so it is 100% standard MySQL compatible
        import re
        create_sql = re.sub(r'/\*T!\[.*?\]\s*.*?\*/', '', create_sql)
        
        sql_statements.append(f"-- Table structure for `{table}`")
        sql_statements.append(f"DROP TABLE IF EXISTS `{table}`;")
        sql_statements.append(f"{create_sql};\n")

        # Export rows
        cursor.execute(f"SELECT * FROM `{table}`;")
        rows = cursor.fetchall()
        if rows:
            cols = [f"`{col}`" for col in rows[0].keys()]
            cols_str = ", ".join(cols)
            
            sql_statements.append(f"-- Dumping data for `{table}` ({len(rows)} records)")
            value_lines = []
            for r in rows:
                row_vals = []
                for val in r.values():
                    if val is None:
                        row_vals.append("NULL")
                    elif isinstance(val, (int, float)):
                        row_vals.append(str(val))
                    elif isinstance(val, bytes):
                        row_vals.append(f"0x{val.hex()}")
                    else:
                        escaped = str(val).replace("\\", "\\\\").replace("'", "\\'")
                        row_vals.append(f"'{escaped}'")
                value_lines.append(f"({', '.join(row_vals)})")
            
            # Batch inserts in chunks of 50
            chunk_size = 50
            for i in range(0, len(value_lines), chunk_size):
                chunk = value_lines[i:i + chunk_size]
                sql_statements.append(f"INSERT INTO `{table}` ({cols_str}) VALUES\n  " + ",\n  ".join(chunk) + ";")
            sql_statements.append("")

    # Dump Views
    for v in views:
        print(f"Exporting view: {v}...")
        cursor.execute(f"SHOW CREATE VIEW `{v}`;")
        view_res = cursor.fetchone()
        create_view_sql = view_res.get('Create View')
        create_view_sql = re.sub(r'DEFINER=`.*?`@`.*?`', 'DEFINER=CURRENT_USER', create_view_sql)
        sql_statements.append(f"-- View structure for `{v}`")
        sql_statements.append(f"DROP VIEW IF EXISTS `{v}`;")
        sql_statements.append(f"{create_view_sql};\n")

    sql_statements.append("SET FOREIGN_KEY_CHECKS = 1;\n")

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(sql_statements))

    file_size_kb = os.path.getsize(output_path) / 1024
    print(f"\n[SUCCESS] Successfully exported to {output_path} ({file_size_kb:.2f} KB)")
    cursor.close()
    conn.close()

if __name__ == '__main__':
    export_database()
