import sqlite3

conn = sqlite3.connect('kampus_plus_dev.db')

# Update courses from Ali to Mehmet
result = conn.execute(
    'UPDATE courses SET instructor_id = ? WHERE instructor_id = ?',
    ('8c68bd8d358049a69b1e151cffb6a72d', '064d4073-fbe3-483e-9374-011916788957')
)
conn.commit()

print(f'✅ Updated {result.rowcount} courses - assigned to Mehmet')
print('\n=== COURSES NOW ===')
for row in conn.execute('SELECT code, name, instructor_id FROM courses'):
    print(row)

conn.close()
