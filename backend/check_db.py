import sqlite3

conn = sqlite3.connect('kampus_plus_dev.db')
cur = conn.cursor()

print('=== INSTRUCTORS ===')
for row in cur.execute('SELECT id, email, role, first_name FROM users WHERE role = "instructor"'):
    print(row)

print('\n=== COURSES ===')
for row in cur.execute('SELECT id, code, name, instructor_id FROM courses'):
    print(row)

print('\n=== LOGGED IN USER ===')
for row in cur.execute('SELECT id, email, role, first_name FROM users WHERE id = "8c68bd8d358049a69b1e151cffb6a72d"'):
    print(row)

conn.close()
