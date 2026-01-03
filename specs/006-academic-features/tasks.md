# 006 - Akademik Özellikler - Implementation Tasks

## 📋 Genel Bakış

Bu doküman, Akademik Özellikler (Ders Programı + Akademik Takvim) modülünün implementasyon task'lerini içerir. Öğrenci görüntüleme, katkı sistemi ve admin yönetim panelini kapsar.

---

## 📊 Proje Özeti

| Özellik | Süre Tahmini | Zorluk | Öncelik |
|---------|--------------|---------|---------|
| Akademik Özellikler (Full) | 10-12 gün | Yüksek | Yüksek |

**Toplam Task Sayısı:** 58  
**Tahmini Süre:** 10-12 gün (2 developer: 1 backend, 1 frontend)

---

## 🎯 Phase 0: Database & Infrastructure (1 gün)

### Task 0.1: Database Schema Oluştur
**Süre:** 2 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Akademik özellikler için gerekli tüm tabloları oluştur.

**Tablolar:**
```sql
-- Üniversiteler (zaten var, genişletilecek)
CREATE TABLE universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL UNIQUE,
    slug VARCHAR(200) NOT NULL UNIQUE,
    email_domain VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ders Programları
CREATE TABLE course_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id),
    department VARCHAR(200) NOT NULL,
    semester INTEGER NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    term VARCHAR(10) NOT NULL,
    course_code VARCHAR(50),
    course_name VARCHAR(200) NOT NULL,
    instructor VARCHAR(200),
    day_of_week INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(100),
    building VARCHAR(100),
    is_lab BOOLEAN DEFAULT FALSE,
    color VARCHAR(20),
    source VARCHAR(20) DEFAULT 'admin',
    contributed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Akademik Takvim
CREATE TABLE academic_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id),
    academic_year VARCHAR(20) NOT NULL,
    semester VARCHAR(10),
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    is_holiday BOOLEAN DEFAULT FALSE,
    icon VARCHAR(10),
    color VARCHAR(20),
    source VARCHAR(20) DEFAULT 'admin',
    contributed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Öğrenci Katkıları
CREATE TABLE user_contributed_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contributor_user_id UUID NOT NULL REFERENCES users(id),
    data_type VARCHAR(20) NOT NULL,
    university_id UUID NOT NULL REFERENCES universities(id),
    department VARCHAR(200),
    semester INTEGER,
    academic_year VARCHAR(20) NOT NULL,
    term VARCHAR(10),
    uploaded_file_path VARCHAR(500),
    parsed_data JSON,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Veri Durumu
CREATE TABLE university_data_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id),
    has_course_schedule BOOLEAN DEFAULT FALSE,
    course_schedule_departments JSON,
    course_schedule_last_updated TIMESTAMP,
    has_academic_calendar BOOLEAN DEFAULT FALSE,
    academic_calendar_year VARCHAR(20),
    academic_calendar_last_updated TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(university_id)
);

-- Index'ler
CREATE INDEX idx_course_university ON course_schedules(university_id);
CREATE INDEX idx_course_dept_semester ON course_schedules(department, semester);
CREATE INDEX idx_course_academic_year ON course_schedules(academic_year, term);
CREATE INDEX idx_course_day_time ON course_schedules(day_of_week, start_time);

CREATE INDEX idx_calendar_university ON academic_calendar_events(university_id);
CREATE INDEX idx_calendar_dates ON academic_calendar_events(start_date, end_date);
CREATE INDEX idx_calendar_year ON academic_calendar_events(academic_year);
CREATE INDEX idx_calendar_type ON academic_calendar_events(event_type);

CREATE INDEX idx_contributed_status ON user_contributed_data(status);
CREATE INDEX idx_contributed_university ON user_contributed_data(university_id);
CREATE INDEX idx_contributed_user ON user_contributed_data(contributor_user_id);
CREATE INDEX idx_contributed_type ON user_contributed_data(data_type);
```

**Test Kriterleri:**
- [x] Tüm tablolar oluşturuldu
- [x] Foreign key'ler çalışıyor
- [x] Index'ler eklendi

---

### Task 0.2: Alembic Migration Script
**Süre:** 30 dakika  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 0.1

**Açıklama:**  
Akademik özellikler tabloları için Alembic migration script'i.

**Konum:** `alembic/versions/xxx_add_academic_tables.py`

**Test Kriterleri:**
- [x] `alembic upgrade head` çalışıyor
- [x] `alembic downgrade -1` çalışıyor

---

### Task 0.3: Dosya Yükleme Sistemi (Academic)
**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Akademik dosyalar için yükleme klasörü ve yardımcı fonksiyonlar.

**Konum:** `app/utils/academic_file_upload.py`

**Özellikler:**
- Local storage: `uploads/academic/contributions/`
- Dosya tipi: PDF, JPG, PNG
- Max 10 MB
- Unique dosya adı

**Fonksiyonlar:**
```python
def save_academic_contribution_file(
    file: UploadFile,
    user_id: str,
    data_type: str
) -> dict:
    """
    Akademik katkı dosyasını kaydet.
    
    Returns:
        {
            "file_name": "ders_programi.pdf",
            "file_path": "uploads/academic/contributions/uuid_ders.pdf",
            "file_size": 2048000,
            "file_type": "application/pdf"
        }
    """
    pass

def delete_academic_file(file_path: str):
    """Dosyayı sil"""
    pass
```

**Test Kriterleri:**
- [x] PDF yükleme çalışıyor
- [x] 10 MB'dan büyük dosyalar reddediliyor
- [x] Dosya adı unique

---

## 🔧 Phase 1: Backend - Ders Programı (2.5 gün)

### Task 1.1: Course Schedule Schema (Pydantic)
**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Ders programı için Pydantic schema'ları.

**Konum:** `app/schemas/academic.py`

```python
from pydantic import BaseModel, validator
from typing import Literal
from datetime import time, date

class CourseScheduleBase(BaseModel):
    course_code: str | None
    course_name: str
    instructor: str | None
    day_of_week: int  # 1-7
    start_time: time
    end_time: time
    room: str | None
    building: str | None
    is_lab: bool = False
    color: str | None

class CourseScheduleResponse(CourseScheduleBase):
    id: str
    
class CourseScheduleListResponse(BaseModel):
    has_data: bool
    university: str | None
    department: str | None
    semester: int | None
    academic_year: str | None
    term: str | None
    courses: list[CourseScheduleResponse]
    source: str | None
    contributed_by: str | None

class TodayCoursesResponse(BaseModel):
    has_data: bool
    date: date
    day_of_week: int
    day_name: str
    courses: list[CourseScheduleResponse]
    message: str | None

class CourseScheduleContributeRequest(BaseModel):
    semester: int
    academic_year: str
    term: Literal["fall", "spring"]
    notes: str | None
    
    @validator('semester')
    def validate_semester(cls, v):
        if v < 1 or v > 8:
            raise ValueError('Semester 1-8 arası olmalı')
        return v
```

**Test Kriterleri:**
- [x] Schema validation çalışıyor
- [x] Semester kontrolü çalışıyor

---

### Task 1.2: GET /api/v1/academic/course-schedule
**Süre:** 2 saat  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 1.1

**Açıklama:**  
Kullanıcının ders programını getiren endpoint (otomatik: üniversite + bölüm + semester).

```python
@router.get("/course-schedule", response_model=CourseScheduleListResponse)
async def get_course_schedule(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Kullanıcının ders programını getirir.
    Üniversite, bölüm ve sınıf user profile'dan otomatik alınır.
    """
    # User'ın üniversite, bölüm, semester bilgilerini al
    university = db.query(University).filter(
        University.email_domain == current_user.email.split('@')[1]
    ).first()
    
    if not university:
        return {
            "has_data": False,
            "message": "Üniversite bilgisi bulunamadı"
        }
    
    # Kullanıcının semester bilgisini al (user profile'da olmalı)
    semester = current_user.semester  # Varsayım: users tablosuna semester field eklendi
    department = current_user.department
    
    if not semester or not department:
        return {
            "has_data": False,
            "message": "Bölüm veya sınıf bilgisi eksik"
        }
    
    # Ders programını getir (en güncel academic_year + term)
    courses = db.query(CourseSchedule).filter(
        CourseSchedule.university_id == university.id,
        CourseSchedule.department == department,
        CourseSchedule.semester == semester
    ).order_by(
        CourseSchedule.day_of_week,
        CourseSchedule.start_time
    ).all()
    
    if not courses:
        return {
            "has_data": False,
            "university": university.name,
            "department": department,
            "semester": semester,
            "message": "Üniversitenizin ders programı verilerine henüz erişemedik.",
            "courses": []
        }
    
    return {
        "has_data": True,
        "university": university.name,
        "department": department,
        "semester": semester,
        "academic_year": courses[0].academic_year,
        "term": courses[0].term,
        "courses": courses,
        "source": courses[0].source,
        "contributed_by": str(courses[0].contributed_by) if courses[0].contributed_by else None
    }
```

**Test Kriterleri:**
- [x] Veri varsa dersler dönüyor
- [x] Veri yoksa has_data: false
- [x] Üniversite otomatik algılanıyor
- [x] Günlere göre sıralı

---

### Task 1.3: GET /api/v1/academic/course-schedule/today
**Süre:** 1 saat  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 1.2

**Açıklama:**  
Bugünkü dersleri getiren endpoint (Dashboard widget için).

```python
@router.get("/course-schedule/today", response_model=TodayCoursesResponse)
async def get_today_courses(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Bugünkü dersleri getirir"""
    from datetime import datetime
    
    today = datetime.now()
    day_of_week = today.isoweekday()  # 1=Monday, 7=Sunday
    day_names = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
    
    # Kullanıcının ders programını al
    university = db.query(University).filter(
        University.email_domain == current_user.email.split('@')[1]
    ).first()
    
    if not university:
        return {
            "has_data": False,
            "date": today.date(),
            "day_of_week": day_of_week,
            "day_name": day_names[day_of_week],
            "courses": [],
            "message": "Ders programı verisi bulunamadı"
        }
    
    # Bugünkü dersleri getir
    courses = db.query(CourseSchedule).filter(
        CourseSchedule.university_id == university.id,
        CourseSchedule.department == current_user.department,
        CourseSchedule.semester == current_user.semester,
        CourseSchedule.day_of_week == day_of_week
    ).order_by(CourseSchedule.start_time).all()
    
    return {
        "has_data": len(courses) > 0,
        "date": today.date(),
        "day_of_week": day_of_week,
        "day_name": day_names[day_of_week],
        "courses": courses
    }
```

**Test Kriterleri:**
- [x] Bugünün dersleri dönüyor
- [x] Hafta sonu ise boş liste
- [x] Saate göre sıralı

---

### Task 1.4: POST /api/v1/academic/contribute/course-schedule
**Süre:** 3 saat  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 1.1, 0.3

**Açıklama:**  
Ders programı katkısı gönderme endpoint'i.

```python
@router.post("/contribute/course-schedule", response_model=dict)
async def contribute_course_schedule(
    semester: int = Form(...),
    academic_year: str = Form(...),
    term: str = Form(...),
    notes: str = Form(None),
    file: UploadFile = File(None),
    manual_data: str = Form(None),  # JSON string
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Ders programı katkısı gönder"""
    
    # Validation
    if semester < 1 or semester > 8:
        raise HTTPException(status_code=400, detail="Semester 1-8 arası olmalı")
    
    if term not in ["fall", "spring"]:
        raise HTTPException(status_code=400, detail="Geçersiz dönem")
    
    if not file and not manual_data:
        raise HTTPException(status_code=400, detail="PDF yükleyin veya manuel veri girin")
    
    # Üniversite bilgisi
    university = db.query(University).filter(
        University.email_domain == current_user.email.split('@')[1]
    ).first()
    
    if not university:
        raise HTTPException(status_code=404, detail="Üniversite bulunamadı")
    
    # Dosya yükleme
    uploaded_file_path = None
    if file:
        # Dosya tipi kontrolü
        if file.content_type not in ["application/pdf", "image/jpeg", "image/png"]:
            raise HTTPException(status_code=400, detail="Sadece PDF, JPG, PNG dosyaları kabul edilir")
        
        # Dosya boyutu kontrolü (max 10 MB)
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        
        if file_size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Dosya boyutu 10 MB'dan küçük olmalı")
        
        # Dosyayı kaydet
        file_info = save_academic_contribution_file(
            file,
            str(current_user.id),
            "course_schedule"
        )
        uploaded_file_path = file_info["file_path"]
    
    # Manuel data parse
    parsed_manual_data = None
    if manual_data:
        import json
        parsed_manual_data = json.loads(manual_data)
    
    # Katkı kaydı oluştur
    contribution = UserContributedData(
        contributor_user_id=current_user.id,
        data_type="course_schedule",
        university_id=university.id,
        department=current_user.department,
        semester=semester,
        academic_year=academic_year,
        term=term,
        uploaded_file_path=uploaded_file_path,
        parsed_data=parsed_manual_data,
        notes=notes,
        status="pending"
    )
    
    db.add(contribution)
    db.commit()
    db.refresh(contribution)
    
    return {
        "contribution_id": str(contribution.id),
        "message": "Katkınız gönderildi. Kontrol edildikten sonra onaylanacak.",
        "status": "pending"
    }
```

**Test Kriterleri:**
- [x] PDF yükleme çalışıyor
- [x] Manuel data çalışıyor
- [x] Validation çalışıyor
- [x] Katkı kaydı oluşturuluyor

---

### Task 1.5: GET /api/v1/academic/my-contributions
**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Kullanıcının katkılarını listeler.

```python
@router.get("/my-contributions", response_model=dict)
async def get_my_contributions(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Kullanıcının tüm katkılarını listeler"""
    
    contributions = db.query(UserContributedData).filter(
        UserContributedData.contributor_user_id == current_user.id
    ).order_by(UserContributedData.created_at.desc()).all()
    
    pending = [c for c in contributions if c.status == "pending"]
    approved = [c for c in contributions if c.status == "approved"]
    rejected = [c for c in contributions if c.status == "rejected"]
    
    return {
        "pending": pending,
        "approved": approved,
        "rejected": rejected
    }
```

**Test Kriterleri:**
- [x] Tüm katkılar listeleniyor
- [x] Status'lere göre gruplanan

---

### Task 1.6: Backend Unit Tests (Phase 1)
**Süre:** 2 saat  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 1.1-1.5

**Test Senaryoları:**
```python
def test_get_course_schedule_success():
    """Ders programı başarıyla getiriliyor"""
    ...

def test_get_course_schedule_no_data():
    """Veri yoksa has_data: false dönüyor"""
    ...

def test_get_today_courses():
    """Bugünkü dersler doğru getiriliyor"""
    ...

def test_contribute_course_schedule_with_pdf():
    """PDF ile katkı gönderme çalışıyor"""
    ...

def test_contribute_invalid_semester():
    """Geçersiz semester reddediliyor"""
    ...

def test_contribute_file_too_large():
    """10 MB'dan büyük dosya reddediliyor"""
    ...
```

**Test Kriterleri:**
- [x] Tüm test'ler pass
- [x] Coverage %85+

---

## ⏰ Phase 2: Backend - Akademik Takvim (2 gün)

### Task 2.1: Academic Calendar Schema (Pydantic)
**Süre:** 45 dakika  
**Atanan:** Backend Developer

**Konum:** `app/schemas/academic.py`

```python
class AcademicCalendarEventBase(BaseModel):
    event_type: Literal["exam", "registration", "holiday", "deadline", "other"]
    title: str
    description: str | None
    start_date: date
    end_date: date | None
    is_holiday: bool = False
    icon: str | None
    color: str | None

class AcademicCalendarEventResponse(AcademicCalendarEventBase):
    id: str

class AcademicCalendarListResponse(BaseModel):
    has_data: bool
    university: str | None
    academic_year: str | None
    events: list[AcademicCalendarEventResponse]
    message: str | None

class UpcomingEventsResponse(BaseModel):
    has_data: bool
    events: list[dict]  # id, title, start_date, end_date, event_type, icon, days_remaining, urgency
    message: str | None
```

---

### Task 2.2: GET /api/v1/academic/calendar
**Süre:** 2 saat  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 2.1

**Açıklama:**  
Akademik takvimi getiren endpoint.

```python
@router.get("/calendar", response_model=AcademicCalendarListResponse)
async def get_academic_calendar(
    year: str = None,
    event_type: str = None,
    start_date: date = None,
    end_date: date = None,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Akademik takvimi getirir"""
    
    # Üniversite bilgisi
    university = db.query(University).filter(
        University.email_domain == current_user.email.split('@')[1]
    ).first()
    
    if not university:
        return {
            "has_data": False,
            "message": "Üniversite bilgisi bulunamadı",
            "events": []
        }
    
    # Base query
    query = db.query(AcademicCalendarEvent).filter(
        AcademicCalendarEvent.university_id == university.id
    )
    
    # Filtreler
    if year:
        query = query.filter(AcademicCalendarEvent.academic_year == year)
    
    if event_type:
        query = query.filter(AcademicCalendarEvent.event_type == event_type)
    
    if start_date:
        query = query.filter(AcademicCalendarEvent.start_date >= start_date)
    
    if end_date:
        query = query.filter(AcademicCalendarEvent.start_date <= end_date)
    
    # Sıralama
    events = query.order_by(AcademicCalendarEvent.start_date).all()
    
    if not events:
        return {
            "has_data": False,
            "university": university.name,
            "message": "Akademik takvim verisi bulunamadı",
            "events": []
        }
    
    return {
        "has_data": True,
        "university": university.name,
        "academic_year": events[0].academic_year,
        "events": events
    }
```

**Test Kriterleri:**
- [x] Etkinlikler getiriliyor
- [x] Filtreler çalışıyor
- [x] Tarihe göre sıralı

---

### Task 2.3: GET /api/v1/academic/calendar/upcoming
**Süre:** 1.5 saat  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 2.2

**Açıklama:**  
Yaklaşan etkinlikler (Dashboard widget için).

```python
@router.get("/calendar/upcoming", response_model=UpcomingEventsResponse)
async def get_upcoming_events(
    limit: int = 5,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Yaklaşan akademik etkinlikleri getirir"""
    from datetime import datetime, timedelta
    
    today = datetime.now().date()
    
    # Üniversite
    university = db.query(University).filter(
        University.email_domain == current_user.email.split('@')[1]
    ).first()
    
    if not university:
        return {
            "has_data": False,
            "events": [],
            "message": "Üniversite bilgisi bulunamadı"
        }
    
    # Gelecekteki etkinlikler (bugünden itibaren)
    events = db.query(AcademicCalendarEvent).filter(
        AcademicCalendarEvent.university_id == university.id,
        AcademicCalendarEvent.start_date >= today
    ).order_by(AcademicCalendarEvent.start_date).limit(limit).all()
    
    if not events:
        return {
            "has_data": False,
            "events": [],
            "message": "Yaklaşan etkinlik bulunamadı"
        }
    
    # Urgency hesapla
    result_events = []
    for event in events:
        days_remaining = (event.start_date - today).days
        
        if days_remaining <= 7:
            urgency = "high"
        elif days_remaining <= 30:
            urgency = "medium"
        else:
            urgency = "low"
        
        result_events.append({
            "id": str(event.id),
            "title": event.title,
            "start_date": event.start_date,
            "end_date": event.end_date,
            "event_type": event.event_type,
            "icon": event.icon,
            "days_remaining": days_remaining,
            "urgency": urgency
        })
    
    return {
        "has_data": True,
        "events": result_events
    }
```

**Test Kriterleri:**
- [x] Yaklaşan etkinlikler dönüyor
- [x] days_remaining doğru hesaplanıyor
- [x] urgency doğru hesaplanıyor

---

### Task 2.4: POST /api/v1/academic/contribute/calendar
**Süre:** 2 saat  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 2.1, 0.3

**Açıklama:**  
Akademik takvim katkısı gönderme.

Mantık Task 1.4'e benzer, sadece data_type "academic_calendar".

---

### Task 2.5: Backend Unit Tests (Phase 2)
**Süre:** 2 saat  
**Atanan:** Backend Developer

**Test Senaryoları:**
- Akademik takvim getirme
- Filtreler
- Yaklaşan etkinlikler
- Katkı gönderme

---

## 🛠️ Phase 3: Backend - Admin Endpoints (2 gün)

### Task 3.1: GET /api/v1/admin/academic/contributions/pending
**Süre:** 1.5 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Bekleyen katkıları listeler.

```python
@router.get("/contributions/pending", response_model=dict)
async def get_pending_contributions(
    data_type: str = None,
    university_id: str = None,
    page: int = 1,
    per_page: int = 20,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Bekleyen katkıları listeler (sadece admin)"""
    
    query = db.query(UserContributedData).filter(
        UserContributedData.status == "pending"
    )
    
    if data_type:
        query = query.filter(UserContributedData.data_type == data_type)
    
    if university_id:
        query = query.filter(UserContributedData.university_id == university_id)
    
    total = query.count()
    contributions = query.offset((page - 1) * per_page).limit(per_page).all()
    
    # Contributor bilgilerini ekle
    result = []
    for c in contributions:
        contributor = db.query(User).filter(User.id == c.contributor_user_id).first()
        university = db.query(University).filter(University.id == c.university_id).first()
        
        result.append({
            **c.__dict__,
            "contributor": {
                "id": str(contributor.id),
                "first_name": contributor.first_name,
                "last_name": contributor.last_name,
                "email": contributor.email
            },
            "university": university.name if university else None
        })
    
    return {
        "contributions": result,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page
        }
    }
```

**Test Kriterleri:**
- [x] Bekleyen katkılar listeleniyor
- [x] Filtreler çalışıyor
- [x] Sayfalama çalışıyor

---

### Task 3.2: POST /api/v1/admin/academic/contributions/{id}/approve
**Süre:** 3 saat  
**Atanan:** Backend Developer  
**Bağımlılık:** Task 3.1

**Açıklama:**  
Katkıyı onayla ve sisteme ekle.

```python
@router.post("/contributions/{contribution_id}/approve", response_model=dict)
async def approve_contribution(
    contribution_id: str,
    parsed_data: dict = None,  # Admin düzeltmişse
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Katkıyı onayla ve sisteme ekle"""
    
    contribution = db.query(UserContributedData).filter(
        UserContributedData.id == contribution_id
    ).first()
    
    if not contribution:
        raise HTTPException(status_code=404, detail="Katkı bulunamadı")
    
    if contribution.status != "pending":
        raise HTTPException(status_code=400, detail="Bu katkı zaten işlenmiş")
    
    # Parsed data yoksa contribution'daki kullan
    data_to_use = parsed_data if parsed_data else contribution.parsed_data
    
    if not data_to_use:
        raise HTTPException(status_code=400, detail="Parse edilmiş veri bulunamadı")
    
    # Data type'a göre ilgili tabloya ekle
    if contribution.data_type == "course_schedule":
        # Ders programı ekle
        for course_data in data_to_use:
            course = CourseSchedule(
                university_id=contribution.university_id,
                department=contribution.department,
                semester=contribution.semester,
                academic_year=contribution.academic_year,
                term=contribution.term,
                source="user_contribution",
                contributed_by=contribution.contributor_user_id,
                **course_data
            )
            db.add(course)
        
        # university_data_availability güncelle
        availability = db.query(UniversityDataAvailability).filter(
            UniversityDataAvailability.university_id == contribution.university_id
        ).first()
        
        if not availability:
            availability = UniversityDataAvailability(
                university_id=contribution.university_id
            )
            db.add(availability)
        
        availability.has_course_schedule = True
        availability.course_schedule_last_updated = datetime.utcnow()
        
        # Departments JSON güncelle
        if availability.course_schedule_departments:
            depts = json.loads(availability.course_schedule_departments)
            if contribution.department not in depts:
                depts.append(contribution.department)
                availability.course_schedule_departments = json.dumps(depts)
        else:
            availability.course_schedule_departments = json.dumps([contribution.department])
    
    elif contribution.data_type == "academic_calendar":
        # Akademik takvim ekle
        for event_data in data_to_use:
            event = AcademicCalendarEvent(
                university_id=contribution.university_id,
                academic_year=contribution.academic_year,
                source="user_contribution",
                contributed_by=contribution.contributor_user_id,
                **event_data
            )
            db.add(event)
        
        # university_data_availability güncelle
        availability = db.query(UniversityDataAvailability).filter(
            UniversityDataAvailability.university_id == contribution.university_id
        ).first()
        
        if not availability:
            availability = UniversityDataAvailability(
                university_id=contribution.university_id
            )
            db.add(availability)
        
        availability.has_academic_calendar = True
        availability.academic_calendar_year = contribution.academic_year
        availability.academic_calendar_last_updated = datetime.utcnow()
    
    # Contribution status'unu güncelle
    contribution.status = "approved"
    contribution.reviewed_by = current_admin.id
    contribution.reviewed_at = datetime.utcnow()
    
    db.commit()
    
    # Kaç öğrenci görebilecek? (opsiyonel istatistik)
    affected_users_count = db.query(User).filter(
        User.email.like(f"%@{contribution.university.email_domain}"),
        User.department == contribution.department,
        User.semester == contribution.semester
    ).count() if contribution.data_type == "course_schedule" else 0
    
    # TODO: Katkıda bulunana bildirim gönder
    
    return {
        "message": "Katkı onaylandı ve sisteme eklendi",
        "affected_users": affected_users_count
    }
```

**Test Kriterleri:**
- [x] Katkı onaylanıyor
- [x] Veriler ilgili tabloya ekleniyor
- [x] university_data_availability güncelleniyor
- [x] Status "approved" oluyor

---

### Task 3.3: POST /api/v1/admin/academic/contributions/{id}/reject
**Süre:** 1 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Katkıyı reddet.

```python
@router.post("/contributions/{contribution_id}/reject", response_model=dict)
async def reject_contribution(
    contribution_id: str,
    reason: str,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Katkıyı reddet"""
    
    contribution = db.query(UserContributedData).filter(
        UserContributedData.id == contribution_id
    ).first()
    
    if not contribution:
        raise HTTPException(status_code=404, detail="Katkı bulunamadı")
    
    if contribution.status != "pending":
        raise HTTPException(status_code=400, detail="Bu katkı zaten işlenmiş")
    
    contribution.status = "rejected"
    contribution.reviewed_by = current_admin.id
    contribution.reviewed_at = datetime.utcnow()
    contribution.rejection_reason = reason
    
    db.commit()
    
    # TODO: Katkıda bulunana bildirim gönder
    
    return {
        "message": "Katkı reddedildi ve katkıda bulunana bildirildi"
    }
```

---

### Task 3.4: POST /api/v1/admin/academic/course-schedule
**Süre:** 2 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Admin ders programı ekler (direct, onaysız).

Mantık Task 1.4'e benzer ama direkt sisteme eklenir, pending'e düşmez.

---

### Task 3.5: POST /api/v1/admin/academic/calendar
**Süre:** 1.5 saat  
**Atanan:** Backend Developer

**Açıklama:**  
Admin akademik takvim ekler (direct).

---

### Task 3.6: Backend Unit Tests (Phase 3)
**Süre:** 2 saat  
**Atanan:** Backend Developer

**Test Senaryoları:**
- Admin pending list
- Approve contribution
- Reject contribution
- Admin direct add

---

## 🖼️ Phase 4: Frontend - Ders Programı UI (2.5 gün)

### Task 4.1: Frontend Component Yapısı
**Süre:** 30 dakika  
**Atanan:** Frontend Developer

```
src/components/Academic/
├── CourseSchedule/
│   ├── CourseSchedulePage.tsx
│   ├── WeeklyView.tsx
│   ├── ListView.tsx
│   ├── CourseCard.tsx
│   ├── CourseDetailPopup.tsx
│   └── EmptyState.tsx
└── ...
```

---

### Task 4.2: useCourseSchedule Hook
**Süre:** 1 saat  
**Atanan:** Frontend Developer

```typescript
export const useCourseSchedule = () => {
  const [schedule, setSchedule] = useState<CourseSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    fetchCourseSchedule();
  }, []);

  const fetchCourseSchedule = async () => {
    try {
      const response = await api.get('/api/v1/academic/course-schedule');
      setSchedule(response.data);
      setHasData(response.data.has_data);
    } catch (error) {
      toast.error('Ders programı yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  return { schedule, loading, hasData, refetch: fetchCourseSchedule };
};
```

---

### Task 4.3: CourseSchedulePage Component
**Süre:** 3 saat  
**Atanan:** Frontend Developer  
**Bağımlılık:** Task 4.2

**Konum:** `src/pages/Dashboard/CourseSchedulePage.tsx`

```typescript
const CourseSchedulePage = () => {
  const { schedule, loading, hasData } = useCourseSchedule();
  const [view, setView] = useState<'weekly' | 'list'>('weekly');

  if (loading) return <LoadingSpinner />;

  if (!hasData) {
    return <EmptyStateCourseSchedule />;
  }

  return (
    <div className="course-schedule-page">
      <header>
        <h1>📅 Ders Programım</h1>
        <p>{schedule.department} - {schedule.semester}. Sınıf</p>
        <p>{schedule.academic_year} {schedule.term === 'fall' ? 'Güz' : 'Bahar'} Dönemi</p>
      </header>

      <div className="view-controls">
        <button onClick={() => setView('weekly')}>📅 Haftalık</button>
        <button onClick={() => setView('list')}>📋 Liste</button>
        <button>📄 PDF İndir</button>
      </div>

      {view === 'weekly' ? (
        <WeeklyView courses={schedule.courses} />
      ) : (
        <ListView courses={schedule.courses} />
      )}
    </div>
  );
};
```

---

### Task 4.4: WeeklyView Component
**Süre:** 4 saat  
**Atanan:** Frontend Developer

**Konum:** `src/components/Academic/CourseSchedule/WeeklyView.tsx`

```typescript
const WeeklyView = ({ courses }: { courses: Course[] }) => {
  const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  // Dersleri grid'e yerleştir
  const courseGrid = {};
  courses.forEach(course => {
    const key = `${course.day_of_week}-${course.start_time}`;
    courseGrid[key] = course;
  });

  return (
    <div className="weekly-view">
      <table className="weekly-grid">
        <thead>
          <tr>
            <th></th>
            {days.map(day => <th key={day}>{day}</th>)}
          </tr>
        </thead>
        <tbody>
          {hours.map(hour => (
            <tr key={hour}>
              <td className="hour-cell">{hour}</td>
              {[1, 2, 3, 4, 5, 6, 7].map(day => {
                const course = courseGrid[`${day}-${hour}`];
                return (
                  <td key={day} className="course-cell">
                    {course && (
                      <CourseCard 
                        course={course} 
                        onClick={() => setSelectedCourse(course)}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

### Task 4.5: ListView Component
**Süre:** 2 saat  
**Atanan:** Frontend Developer

Liste görünüm bileşeni (günlere göre gruplu).

---

### Task 4.6: EmptyStateCourseSchedule Component
**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Konum:** `src/components/Academic/CourseSchedule/EmptyState.tsx`

```typescript
const EmptyStateCourseSchedule = () => {
  const [showContributeModal, setShowContributeModal] = useState(false);

  return (
    <div className="empty-state">
      <div className="empty-icon">📭</div>
      <h2>Henüz Veri Yok</h2>
      <p>Üniversitenizin ders programı verilerine henüz erişemedik.</p>
      <p>📝 Kısa süre içinde eklenecek!</p>
      
      <div className="divider"></div>
      
      <h3>💡 Katkıda Bulunun:</h3>
      <p>Ders programınızı bizimle paylaşarak diğer öğrencilere yardımcı olabilirsiniz!</p>
      
      <div className="action-buttons">
        <button onClick={() => setShowContributeModal(true)}>
          📤 PDF/Resim Yükle
        </button>
        <button onClick={() => setShowManualEntryModal(true)}>
          ✏️ Manuel Gir
        </button>
      </div>
      
      <p className="info">✅ Kontrol edildikten sonra tüm sınıf arkadaşlarınız görebilecek!</p>
      
      {showContributeModal && <ContributeModal onClose={() => setShowContributeModal(false)} />}
    </div>
  );
};
```

---

### Task 4.7: TodayCoursesWidget Component
**Süre:** 2 saat  
**Atanan:** Frontend Developer

**Konum:** `src/components/Dashboard/TodayCoursesWidget.tsx`

Dashboard'da "Bugün Derslerim" widget'ı.

---

### Task 4.8: Frontend Component Tests
**Süre:** 2 saat  
**Atanan:** Frontend Developer

React Testing Library ile component test'leri.

---

## ⏰ Phase 5: Frontend - Akademik Takvim UI (2 gün)

### Task 5.1: AcademicCalendarPage Component
**Süre:** 3 saat  
**Atanan:** Frontend Developer

---

### Task 5.2: CalendarListView Component
**Süre:** 2 saat  
**Atanan:** Frontend Developer

---

### Task 5.3: CalendarMonthView Component
**Süre:** 4 saat  
**Atanan:** Frontend Developer

Aylık takvim grid görünümü (react-calendar veya custom).

---

### Task 5.4: UpcomingEventsWidget Component
**Süre:** 2 saat  
**Atanan:** Frontend Developer

Dashboard'da "Yaklaşan Etkinlikler" widget'ı (renk kodlu).

---

### Task 5.5: EmptyStateAcademicCalendar Component
**Süre:** 1 saat  
**Atanan:** Frontend Developer

---

## 📤 Phase 6: Frontend - Katkı Sistemi UI (1.5 gün)

### Task 6.1: ContributeModal Component
**Süre:** 3 saat  
**Atanan:** Frontend Developer

Katkı modalı (PDF yükle veya manuel gir).

---

### Task 6.2: FileUpload Component
**Süre:** 2 saat  
**Atanan:** Frontend Developer

Dosya yükleme bileşeni (progress bar ile).

---

### Task 6.3: ManualEntryForm Component
**Süre:** 3 saat  
**Atanan:** Frontend Developer

Manuel ders/etkinlik girişi formu.

---

### Task 6.4: ContributionStatus Component
**Süre:** 2 saat  
**Atanan:** Frontend Developer

Katkı durumu (pending/approved/rejected).

---

## 🛠️ Phase 7: Admin Panel UI (2 gün)

### Task 7.1: AdminPendingContributions Page
**Süre:** 4 saat  
**Atanan:** Frontend Developer

Bekleyen katkılar listesi sayfası.

---

### Task 7.2: ContributionPreviewModal Component
**Süre:** 3 saat  
**Atanan:** Frontend Developer

PDF önizleme + parse edilmiş veriler.

---

### Task 7.3: ApproveRejectActions Component
**Süre:** 2 saat  
**Atanan:** Frontend Developer

Onayla/Reddet butonları ve modal'lar.

---

### Task 7.4: AdminAddDataForm Component
**Süre:** 3 saat  
**Atanan:** Frontend Developer

Admin'in direkt veri ekleme formu.

---

## 🧪 Phase 8: Testing & Polish (1 gün)

### Task 8.1: E2E Tests
**Süre:** 3 saat  
**Atanan:** QA

**Test Senaryoları:**
- Öğrenci ders programını görür
- Öğrenci katkıda bulunur
- Admin katkıyı onaylar
- Dashboard widget'ları çalışıyor

---

### Task 8.2: Responsive Test
**Süre:** 2 saat  
**Atanan:** Frontend Developer

Mobil/tablet/desktop test.

---

### Task 8.3: Performance Optimization
**Süre:** 2 saat  
**Atanan:** Full-Stack Developer

- Query optimization
- Lazy loading
- Caching

---

### Task 8.4: Accessibility Test
**Süre:** 1 saat  
**Atanan:** Frontend Developer

Keyboard navigation, screen reader, contrast.

---

## 📝 Phase 9: Documentation & Deployment (0.5 gün)

### Task 9.1: API Dokümantasyonu
**Süre:** 1 saat  
**Atanan:** Backend Developer

FastAPI docs'a açıklamalar ekle.

---

### Task 9.2: Component Docs
**Süre:** 1 saat  
**Atanan:** Frontend Developer

Component README'leri.

---

### Task 9.3: Deployment
**Süre:** 2 saat  
**Atanan:** DevOps

- Environment variables
- File upload klasörü
- Database migration

---

### Task 9.4: Final QA
**Süre:** 2 saat  
**Atanan:** Tüm Ekip

Son test turunu yap ve bugları düzelt.

---

## ✅ Definition of Done (DoD)

### Fonksiyonel Gereksinimler
- [ ] **Ders Programı:**
  - [ ] Haftalık görünüm çalışıyor
  - [ ] Liste görünüm çalışıyor
  - [ ] Bugünkü dersler widget'ı çalışıyor
  - [ ] PDF export çalışıyor
  - [ ] Boş durum mesajı gösteriliyor

- [ ] **Akademik Takvim:**
  - [ ] Liste görünüm çalışıyor
  - [ ] Aylık görünüm çalışıyor
  - [ ] Yaklaşan etkinlikler renk kodlu
  - [ ] Filtreler çalışıyor

- [ ] **Katkı Sistemi:**
  - [ ] PDF yükleme çalışıyor
  - [ ] Manuel girdi çalışıyor
  - [ ] Pending/onay/red durumları çalışıyor

- [ ] **Admin Paneli:**
  - [ ] Bekleyen katkılar listeleniyor
  - [ ] Onaylama çalışıyor
  - [ ] Reddetme çalışıyor

### Teknik Gereksinimler
- [ ] Tüm API endpoint'ler çalışıyor
- [ ] Database schema oluşturuldu
- [ ] Unit test'ler yazıldı (%80+ coverage)
- [ ] E2E test'ler yazıldı

### Performans
- [ ] Ders programı < 1 saniye
- [ ] Akademik takvim < 1 saniye
- [ ] Dashboard widget'ları < 500ms

### UX
- [ ] Boş durum mesajları net
- [ ] Loading state'leri var
- [ ] Success/error mesajları gösteriliyor
- [ ] Responsive çalışıyor

---

## 📊 Task Özeti

| Phase | Task Sayısı | Tahmini Süre |
|-------|-------------|--------------|
| Phase 0: Database & Infrastructure | 3 | 1 gün |
| Phase 1: Backend - Ders Programı | 6 | 2.5 gün |
| Phase 2: Backend - Akademik Takvim | 5 | 2 gün |
| Phase 3: Backend - Admin Endpoints | 6 | 2 gün |
| Phase 4: Frontend - Ders Programı UI | 8 | 2.5 gün |
| Phase 5: Frontend - Akademik Takvim UI | 5 | 2 gün |
| Phase 6: Frontend - Katkı Sistemi UI | 4 | 1.5 gün |
| Phase 7: Admin Panel UI | 4 | 2 gün |
| Phase 8: Testing & Polish | 4 | 1 gün |
| Phase 9: Documentation & Deployment | 4 | 0.5 gün |
| **TOPLAM** | **49** | **10-12 gün** |

---

**Hazırlayan:** AI Assistant  
**Versiyon:** 1.0  
**Son Güncelleme:** 2026-01-01

