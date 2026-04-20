"""Konya üniversiteleri normalize seed script'i.

Temizlenmiş (Burslu/Ücretli ekleri kaldırılmış) Konya veri setini
upsert (varsa güncelle/geç, yoksa ekle) mantığıyla işler.

Kapsam: Konya Gıda ve Tarım, Konya Teknik, KTO Karatay,
        Necmettin Erbakan, Selçuk Üniversiteleri.

Kullanım:
    cd backend
    python scripts/seed_konya_normalized.py
"""

import asyncio
import json
import sys
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import and_, select

from src.core.database import get_engine, get_session_factory
from src.models.department import Department
from src.models.faculty import Faculty
from src.models.university import University

# ─── Üniversite meta verileri ─────────────────────────────────────────────────

UNI_META: dict[str, dict] = {
    "Konya Gıda ve Tarım Üniversitesi": {
        "type": "devlet",
        "city": "Konya",
        "email_domains": json.dumps(["gidatarim.edu.tr", "ogr.gidatarim.edu.tr"]),
    },
    "Konya Teknik Üniversitesi": {
        "type": "devlet",
        "city": "Konya",
        "email_domains": json.dumps(["ktun.edu.tr", "ogr.ktun.edu.tr"]),
    },
    "KTO Karatay Üniversitesi": {
        "type": "vakıf",
        "city": "Konya",
        "email_domains": json.dumps(["karatay.edu.tr", "ogr.karatay.edu.tr"]),
    },
    "Necmettin Erbakan Üniversitesi": {
        "type": "devlet",
        "city": "Konya",
        "email_domains": json.dumps(["erbakan.edu.tr", "ogr.erbakan.edu.tr"]),
    },
    "Selçuk Üniversitesi": {
        "type": "devlet",
        "city": "Konya",
        "email_domains": json.dumps(["selcuk.edu.tr", "ogr.selcuk.edu.tr"]),
    },
}

# ─── Master veri yapısı ───────────────────────────────────────────────────────

KONYA_DATA: dict[str, dict[str, list[str]]] = {
    "Konya Gıda ve Tarım Üniversitesi": {
        "Mühendislik ve Mimarlık Fakültesi": [
            "Bilgisayar Mühendisliği", "İç Mimarlık", "Yazılım Mühendisliği"
        ],
        "Tarım ve Doğa Bilimleri Fakültesi": [
            "Bitkisel Üretim ve Teknolojileri", "Moleküler Biyoloji ve Genetik"
        ],
        "Sosyal ve Beşeri Bilimler Fakültesi": [
            "Psikoloji", "Uluslararası Ticaret ve İşletmecilik", "Yönetim Bilişim Sistemleri"
        ],
    },
    "Konya Teknik Üniversitesi": {
        "Bilgisayar ve Bilişim Bilimleri Fakültesi": [
            "Bilgisayar Mühendisliği", "Yapay Zeka ve Makine Öğrenmesi", "Yazılım Mühendisliği"
        ],
        "Mühendislik ve Doğa Bilimleri Fakültesi": [
            "Elektrik-Elektronik Mühendisliği", "Endüstri Mühendisliği", "Harita Mühendisliği",
            "İnşaat Mühendisliği", "Jeoloji Mühendisliği", "Kimya Mühendisliği",
            "Makine Mühendisliği", "Metalurji ve Malzeme Mühendisliği"
        ],
        "Mimarlık ve Tasarım Fakültesi": [
            "İç Mimarlık", "Mimarlık", "Şehir ve Bölge Planlama"
        ],
    },
    "KTO Karatay Üniversitesi": {
        "İktisadi, İdari ve Sosyal Bilimler Fakültesi": [
            "Arapça Mütercim ve Tercümanlık", "Enerji Yönetimi", "İletişim ve Tasarımı",
            "İngilizce Mütercim ve Tercümanlık", "İslam İktisadı ve Finans", "İşletme",
            "Psikoloji", "Sigortacılık ve Sosyal Güvenlik", "Sosyal Hizmet", "Sosyoloji",
            "Tarih", "Uluslararası Ticaret ve Lojistik"
        ],
        "Sağlık Bilimleri Fakültesi": [
            "Beslenme ve Diyetetik", "Çocuk Gelişimi", "Ebelik",
            "Fizyoterapi ve Rehabilitasyon", "Hemşirelik", "Odyoloji"
        ],
        "Mühendislik ve Doğa Bilimleri Fakültesi": [
            "Bilgisayar Mühendisliği", "Elektrik-Elektronik Mühendisliği", "Endüstri Mühendisliği",
            "İnşaat Mühendisliği", "Makine Mühendisliği", "Mekatronik Mühendisliği"
        ],
        "Güzel Sanatlar ve Tasarım Fakültesi": [
            "Grafik Tasarımı", "İç Mimarlık", "Mimarlık"
        ],
        "Hukuk Fakültesi": [
            "Hukuk"
        ],
        "Uygulamalı Bilimler Yüksekokulu": [
            "Pilotaj"
        ],
        "Tıp Fakültesi": [
            "Tıp"
        ],
    },
    "Necmettin Erbakan Üniversitesi": {
        "Ahmet Keleşoğlu Eğitim Fakültesi": [
            "Almanca Öğretmenliği", "Arapça Öğretmenliği", "Biyoloji Öğretmenliği",
            "Coğrafya Öğretmenliği", "Fen Bilgisi Öğretmenliği", "Fizik Öğretmenliği",
            "İlköğretim Matematik Öğretmenliği", "İngilizce Öğretmenliği", "Kimya Öğretmenliği",
            "Matematik Öğretmenliği", "Okul Öncesi Öğretmenliği", "Özel Eğitim Öğretmenliği",
            "Rehberlik ve Psikolojik Danışmanlık", "Sınıf Öğretmenliği",
            "Sosyal Bilgiler Öğretmenliği", "Tarih Öğretmenliği",
            "Türk Dili ve Edebiyatı Öğretmenliği"
        ],
        "Nezahat Keleşoğlu Sağlık Bilimleri Fakültesi": [
            "Beslenme ve Diyetetik", "Fizyoterapi ve Rehabilitasyon",
            "Sağlık Yönetimi", "Sosyal Hizmet"
        ],
        "Mühendislik Fakültesi": [
            "Bilgisayar Mühendisliği", "Elektrik-Elektronik Mühendisliği",
            "Endüstri Mühendisliği", "Enerji Sistemleri Mühendisliği", "Gıda Mühendisliği",
            "Harita Mühendisliği", "İnşaat Mühendisliği", "Makine Mühendisliği",
            "Mekatronik Mühendisliği", "Metalurji ve Malzeme Mühendisliği"
        ],
        "Seydişehir Ahmet Cengiz Mühendislik Fakültesi": [
            "Bilgisayar Mühendisliği", "Makine Mühendisliği"
        ],
        "Ereğli Ziraat Fakültesi": [
            "Biyosistem Mühendisliği", "Tarla Bitkileri"
        ],
        "Fen Fakültesi": [
            "Biyoteknoloji", "İstatistik", "Matematik ve Bilgisayar Bilimleri",
            "Moleküler Biyoloji ve Genetik"
        ],
        "Sosyal ve Beşeri Bilimler Fakültesi": [
            "Dilbilimi", "Felsefe", "Halkla İlişkiler ve Reklamcılık", "Psikoloji",
            "Sanat Tarihi", "Sosyoloji", "Tarih", "Türk Dili ve Edebiyatı"
        ],
        "Diş Hekimliği Fakültesi": [
            "Diş Hekimliği"
        ],
        "Uygulamalı Bilimler Fakültesi": [
            "Finans ve Bankacılık", "Lojistik Yönetimi", "Muhasebe ve Finans Yönetimi",
            "Uluslararası Ticaret ve Finansman", "Yönetim Bilişim Sistemleri"
        ],
        "Turizm Fakültesi": [
            "Gastronomi ve Mutfak Sanatları", "Rekreasyon Yönetimi",
            "Turizm İşletmeciliği", "Turizm Rehberliği"
        ],
        "Güzel Sanatlar ve Mimarlık Fakültesi": [
            "Geleneksel Türk Sanatları", "İç Mimarlık ve Çevre Tasarımı", "Mimarlık",
            "Radyo, Televizyon ve Sinema", "Şehir ve Bölge Planlama"
        ],
        "Havacılık ve Uzay Bilimleri Fakültesi": [
            "Havacılık ve Uzay Mühendisliği", "Havacılık Yönetimi", "Uçak Mühendisliği"
        ],
        "Seydişehir Kamil Akkanat Sağlık Bilimleri Fakültesi": [
            "Hemşirelik"
        ],
        "Hemşirelik Fakültesi": [
            "Hemşirelik"
        ],
        "Hukuk Fakültesi": [
            "Hukuk"
        ],
        "Siyasal Bilgiler Fakültesi": [
            "İktisat", "İşletme", "Maliye",
            "Siyaset Bilimi ve Kamu Yönetimi", "Siyaset Bilimi ve Uluslararası İlişkiler"
        ],
        "Ahmet Keleşoğlu İlahiyat Fakültesi": [
            "İlahiyat"
        ],
        "Ereğli Eğitim Fakültesi": [
            "İlköğretim Matematik Öğretmenliği", "Okul Öncesi Öğretmenliği",
            "Rehberlik ve Psikolojik Danışmanlık", "Sınıf Öğretmenliği", "Türkçe Öğretmenliği"
        ],
        "Tıp Fakültesi": [
            "Tıp"
        ],
        "Veteriner Fakültesi (Ereğli)": [
            "Veteriner"
        ],
    },
    "Selçuk Üniversitesi": {
        "Beyşehir Ali Akkanat Uygulamalı Bilimler Yüksekokulu": [
            "Acil Yardım ve Afet Yönetimi", "Sosyal Hizmet"
        ],
        "Sağlık Bilimleri Fakültesi": [
            "Acil Yardım ve Afet Yönetimi", "Beslenme ve Diyetetik", "Çocuk Gelişimi",
            "Ebelik", "Fizyoterapi ve Rehabilitasyon", "Odyoloji", "Sağlık Yönetimi", "Sosyal Hizmet"
        ],
        "Fen Fakültesi": [
            "Aktüerya Bilimleri", "Biyokimya", "Biyoloji", "Biyoteknoloji", "Fizik",
            "İstatistik", "Kimya", "Matematik"
        ],
        "Edebiyat Fakültesi": [
            "Alman Dili ve Edebiyatı", "Arap Dili ve Edebiyatı",
            "Arapça Mütercim ve Tercümanlık", "Arkeoloji", "Fars Dili ve Edebiyatı",
            "Felsefe", "Fransız Dili ve Edebiyatı", "İngiliz Dili ve Edebiyatı",
            "İngilizce Mütercim ve Tercümanlık", "Karşılaştırmalı Edebiyat",
            "Psikoloji", "Rus Dili ve Edebiyatı", "Sanat Tarihi", "Sosyoloji", "Tarih",
            "Türk Dili ve Edebiyatı", "Urdu Dili ve Edebiyatı"
        ],
        "Mimarlık ve Tasarım Fakültesi": [
            "Ayakkabı Tasarımı ve Üretimi", "El Sanatları", "İç Mimarlık",
            "Moda Tasarımı", "Peyzaj Mimarlığı"
        ],
        "Ziraat Fakültesi": [
            "Bahçe Bitkileri", "Bitki Koruma", "Gıda Mühendisliği", "Tarım Ekonomisi",
            "Tarım Makineleri ve Teknolojileri Mühendisliği", "Tarımsal Yapılar ve Sulama",
            "Tarla Bitkileri", "Toprak Bilimi ve Bitki Besleme", "Zootekni"
        ],
        "Akşehir Kadir Yallagöz Sağlık Yüksekokulu": [
            "Beslenme ve Diyetetik", "Hemşirelik"
        ],
        "Kulu Sağlık Bilimleri Fakültesi": [
            "Beslenme ve Diyetetik", "Fizyoterapi ve Rehabilitasyon", "Hemşirelik"
        ],
        "Teknoloji Fakültesi": [
            "Bilgisayar Mühendisliği", "Elektrik-Elektronik Mühendisliği",
            "Makine Mühendisliği", "Mekatronik Mühendisliği", "Metalurji ve Malzeme Mühendisliği"
        ],
        "Güzel Sanatlar Fakültesi": [
            "Çizgi Film ve Animasyon", "Endüstriyel Tasarım"
        ],
        "Diş Hekimliği Fakültesi": [
            "Diş Hekimliği"
        ],
        "Eczacılık Fakültesi": [
            "Eczacılık"
        ],
        "Turizm Fakültesi": [
            "Gastronomi ve Mutfak Sanatları", "Rekreasyon Yönetimi",
            "Turizm İşletmeciliği", "Turizm Rehberliği"
        ],
        "Beyşehir Ali Akkanat Turizm Fakültesi": [
            "Gastronomi ve Mutfak Sanatları", "Turizm İşletmeciliği", "Turizm Rehberliği"
        ],
        "İletişim Fakültesi": [
            "Gazetecilik", "Halkla İlişkiler ve Tanıtım",
            "Radyo, Televizyon ve Sinema", "Reklamcılık"
        ],
        "Akşehir Mühendislik ve Mimarlık Fakültesi": [
            "Gıda Mühendisliği", "Makine Mühendisliği"
        ],
        "Sivil Havacılık Yüksekokulu": [
            "Havacılık Yönetimi", "Uçak Gövde ve Motor Bakımı"
        ],
        "Hemşirelik Fakültesi": [
            "Hemşirelik"
        ],
        "Hukuk Fakültesi": [
            "Hukuk"
        ],
        "İktisadi ve İdari Bilimler Fakültesi": [
            "İktisat", "İşletme", "Siyaset Bilimi ve Kamu Yönetimi",
            "Uluslararası İlişkiler", "Uluslararası Ticaret ve Finansman"
        ],
        "İlahiyat Fakültesi": [
            "İlahiyat"
        ],
        "Eğitim Fakültesi": [
            "İlköğretim Matematik Öğretmenliği", "Rehberlik ve Psikolojik Danışmanlık",
            "Sınıf Öğretmenliği", "Türkçe Öğretmenliği"
        ],
        "Beyşehir Ali Akkanat İşletme Fakültesi": [
            "İşletme", "Uluslararası Ticaret ve İşletmecilik", "Yönetim Bilişim Sistemleri"
        ],
        "Akşehir İktisadi ve İdari Bilimler Fakültesi": [
            "İşletme", "Maliye"
        ],
        "Çumra Uygulamalı Bilimler Yüksekokulu": [
            "Organik Tarım İşletmeciliği"
        ],
        "Spor Bilimleri Fakültesi": [
            "Spor Yöneticiliği"
        ],
        "Tıp Fakültesi": [
            "Tıp"
        ],
        "Veteriner Fakültesi": [
            "Veteriner"
        ],
    },
}


# ─── Seed fonksiyonu ──────────────────────────────────────────────────────────

async def seed() -> None:
    session_factory = get_session_factory()

    async with session_factory() as session:
        total_unis = total_facs = total_deps = 0
        new_unis   = new_facs   = new_deps   = 0

        for uni_name, faculties in KONYA_DATA.items():
            total_unis += 1
            meta = UNI_META[uni_name]

            # ── Üniversite upsert ──────────────────────────────────────────
            result = await session.execute(
                select(University).where(University.name == uni_name)
            )
            uni = result.scalar_one_or_none()

            if uni is None:
                uni = University(
                    id=str(uuid4()),
                    name=uni_name,
                    university_type=meta["type"],
                    city=meta["city"],
                    email_domains=meta["email_domains"],
                )
                session.add(uni)
                await session.flush()   # id'yi hemen al
                new_unis += 1
                print(f"  [YENİ ÜNİ]  {uni_name}")
            else:
                print(f"  [MEVCUT]    {uni_name}")

            uni_id = uni.id

            for fac_name, departments in faculties.items():
                total_facs += 1

                # ── Fakülte upsert ─────────────────────────────────────────
                result = await session.execute(
                    select(Faculty).where(
                        and_(Faculty.name == fac_name, Faculty.university_id == uni_id)
                    )
                )
                fac = result.scalar_one_or_none()

                if fac is None:
                    fac = Faculty(
                        id=str(uuid4()),
                        name=fac_name,
                        university_id=uni_id,
                    )
                    session.add(fac)
                    await session.flush()
                    new_facs += 1
                    print(f"    [YENİ FAK] {fac_name}")

                fac_id = fac.id

                for dep_name in departments:
                    total_deps += 1

                    # ── Bölüm upsert ───────────────────────────────────────
                    result = await session.execute(
                        select(Department).where(
                            and_(Department.name == dep_name, Department.faculty_id == fac_id)
                        )
                    )
                    dep = result.scalar_one_or_none()

                    if dep is None:
                        dep = Department(
                            id=str(uuid4()),
                            name=dep_name,
                            faculty_id=fac_id,
                        )
                        session.add(dep)
                        new_deps += 1

        await session.commit()

        print()
        print("=" * 55)
        print("  SEED TAMAMLANDI")
        print("=" * 55)
        print(f"  Üniversiteler : {total_unis} işlendi, {new_unis} yeni eklendi")
        print(f"  Fakülteler    : {total_facs} işlendi, {new_facs} yeni eklendi")
        print(f"  Bölümler      : {total_deps} işlendi, {new_deps} yeni eklendi")
        print("=" * 55)


if __name__ == "__main__":
    print("Konya normalize seed başlatılıyor...\n")
    asyncio.run(seed())
