import sqlite3
import os

db_path = './kampus_plus.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    print("--- User Documents ---")
    c.execute("SELECT id, user_id, is_deleted, processing_status FROM user_documents LIMIT 5")
    rows = c.fetchall()
    for row in rows:
        print(f"ID: {row[0]!r}")
        print(f"User ID: {row[1]!r} (Type: {type(row[1])})")
        print(f"Is Deleted: {row[2]!r} (Type: {type(row[2])})")
        print(f"Status: {row[3]!r}")
        print("-" * 20)
        
    print("\n--- Users ---")
    c.execute("SELECT id, email FROM users LIMIT 1")
    user_rows = c.fetchall()
    for row in user_rows:
        print(f"User ID: {row[0]!r} (Type: {type(row[0])})")
        print(f"Email: {row[1]!r}")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals():
        conn.close()
