import sqlite3
import os

db_path = './kampus_plus.db'

try:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    print("Updating is_deleted from 'false' to 0...")
    c.execute("UPDATE user_documents SET is_deleted = 0 WHERE is_deleted = 'false'")
    print(f"Updated {c.rowcount} rows.")
    
    conn.commit()
    
    # Verify
    c.execute("SELECT id, is_deleted FROM user_documents LIMIT 5")
    rows = c.fetchall()
    for row in rows:
        print(f"ID: {row[0]}, Is Deleted: {row[1]!r} (Type: {type(row[1])})")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals():
        conn.close()
