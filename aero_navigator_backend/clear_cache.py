import sqlite3

conn = sqlite3.connect('./aero_navigator.db')
c = conn.cursor()

c.execute('SELECT COUNT(*) FROM flights')
total = c.fetchone()[0]
print(f'Total flights before cleanup: {total}')

c.execute('SELECT departure_city, arrival_city FROM flights LIMIT 5')
rows = c.fetchall()
print(f'Sample cities: {rows}')

# Clear all cached flights - they will be regenerated fresh with correct city names on next search
c.execute('DELETE FROM flights')
conn.commit()

c.execute('SELECT COUNT(*) FROM flights')
print(f'After cleanup: {c.fetchone()[0]} flights')
conn.close()
print('Done! All cached flights cleared. Fresh data with correct city names will be fetched on next search.')
