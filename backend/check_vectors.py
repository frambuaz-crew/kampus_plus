"""Check vector embeddings in database."""
import sqlite3

conn = sqlite3.connect('kampus_plus_dev.db')
cursor = conn.cursor()

# Count vector embeddings
cursor.execute('SELECT COUNT(*) FROM vector_embeddings')
count = cursor.fetchone()[0]
print(f'✅ Vector embeddings count: {count}')

if count > 0:
    print('\n📄 Sample embeddings:')
    cursor.execute('''
        SELECT id, document_id, source_type, chunk_index, faiss_index_id
        FROM vector_embeddings 
        LIMIT 10
    ''')
    for row in cursor.fetchall():
        print(f'  ID: {row[0]}, Doc: {row[1]}, Type: {row[2]}, Chunk: {row[3]}, FAISS: {row[4]}')

conn.close()
