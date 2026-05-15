import asyncio
import uuid
import asyncpg

async def insert():
    try:
        # Konteyner içindeki DATABASE_URL
        db_url = 'postgresql://kampus:secret@db:5432/kampus_plus'
        conn = await asyncpg.connect(db_url)
        
        categories = [
            ('Kampüs Yaşamı', 'Genel kampüs geyiği ve günlük konular.', 'Home'),
            ('Akademik & Dersler', 'Ders notları, sınav tartışmaları ve akademik yardımlaşma.', 'BookOpen'),
            ('Soru-Cevap & Yardım', 'Her türlü soru ve hızlı çözümler için topluluk desteği.', 'HelpCircle'),
            ('Kulüpler & Topluluklar', 'Öğrenci kulüpleri ve topluluk faaliyetleri.', 'Users'),
            ('Kariyer & Staj', 'İş ilanları, staj tecrübeleri ve kariyer planlama.', 'Briefcase'),
            ('İtiraf', 'Kampüsteki ilginç olaylar ve anonim paylaşımlar.', 'Ghost'),
            ('Yurt & Barınma', 'Ev/oda arkadaşı arayanlar ve barınma tecrübeleri.', 'Building2'),
        ]
        
        for name, desc, icon in categories:
            row = await conn.fetchrow('SELECT id FROM forum_categories WHERE name = $1', name)
            if not row:
                cat_id = str(uuid.uuid4())
                await conn.execute('''
                    INSERT INTO forum_categories (id, name, description, icon, order_index, is_active, university_id, created_at)
                    VALUES ($1, $2, $3, $4, 0, true, NULL, NOW())
                ''', cat_id, name, desc, icon)
                print(f'Eklendi: {name}')
            else:
                print(f'Zaten var: {name}')
                
        await conn.close()
    except Exception as e:
        print(f'Hata: {e}')

if __name__ == '__main__':
    asyncio.run(insert())
