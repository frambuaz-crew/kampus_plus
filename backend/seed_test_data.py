"""
Seed test data for development/testing.
Creates sample courses and enrolls test users.
"""
import asyncio
from uuid import uuid4
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_session_factory

async def seed_test_data():
    """Create test courses and enrollments."""
    
    session_factory = get_session_factory()
    async with session_factory() as session:
        print("🌱 Seeding test data...")
        
        # Find the student user (most recent)
        result = await session.execute(
            text("SELECT id, email, first_name, role FROM users WHERE role = 'student' ORDER BY created_at DESC LIMIT 1")
        )
        student = result.fetchone()
        
        if not student:
            print("❌ No student user found. Please register a student first.")
            return
        
        student_id, student_email, student_name, _ = student
        print(f"📚 Found student: {student_name} ({student_email})")
        
        # Check if we need an instructor
        result = await session.execute(
            text("SELECT id, first_name FROM users WHERE role = 'instructor' LIMIT 1")
        )
        instructor = result.fetchone()
        
        if not instructor:
            print("👨‍🏫 Creating default instructor...")
            instructor_id = str(uuid4())
            from src.core.security import hash_password
            password_hash = hash_password("Instructor123!")
            
            await session.execute(
                text("""
                INSERT INTO users (id, email, password_hash, role, first_name, last_name, is_verified, is_active)
                VALUES (:id, :email, :password_hash, :role, :first_name, :last_name, :is_verified, :is_active)
                """),
                {
                    "id": instructor_id,
                    "email": "prof.ali@university.edu",
                    "password_hash": password_hash,
                    "role": "instructor",
                    "first_name": "Ali",
                    "last_name": "Yılmaz",
                    "is_verified": True,
                    "is_active": True
                }
            )
            await session.commit()
            instructor_name = "Ali"
        else:
            instructor_id, instructor_name = instructor
        
        print(f"👨‍🏫 Using instructor: {instructor_name}")
        
        # Create sample courses
        courses_data = [
            {
                "code": "CS101",
                "name": "Introduction to Computer Science",
                "description": "Fundamentals of programming and computational thinking",
                "semester": "Fall 2024",
                "year": 2024,
                "department": "Computer Science",
                "credits": 4
            },
            {
                "code": "MATH201",
                "name": "Linear Algebra",
                "description": "Vector spaces, matrices, and linear transformations",
                "semester": "Fall 2024",
                "year": 2024,
                "department": "Mathematics",
                "credits": 3
            },
            {
                "code": "PHYS101",
                "name": "Physics I",
                "description": "Mechanics, thermodynamics, and waves",
                "semester": "Fall 2024",
                "year": 2024,
                "department": "Physics",
                "credits": 4
            }
        ]
        
        course_ids = []
        for course_data in courses_data:
            course_id = str(uuid4())
            course_ids.append((course_id, course_data["code"], course_data["name"]))
            
            await session.execute(
                text("""
                INSERT INTO courses (id, code, name, description, instructor_id, semester, year, department, credits, is_active)
                VALUES (:id, :code, :name, :description, :instructor_id, :semester, :year, :department, :credits, :is_active)
                """),
                {
                    "id": course_id,
                    "code": course_data["code"],
                    "name": course_data["name"],
                    "description": course_data["description"],
                    "instructor_id": instructor_id,
                    "semester": course_data["semester"],
                    "year": course_data["year"],
                    "department": course_data["department"],
                    "credits": course_data["credits"],
                    "is_active": True
                }
            )
            print(f"  ✅ Created course: {course_data['code']} - {course_data['name']}")
        
        await session.commit()
        
        # Enroll student in courses
        for course_id, code, name in course_ids:
            enrollment_id = str(uuid4())
            await session.execute(
                text("""
                INSERT INTO enrollments (id, student_id, course_id, status)
                VALUES (:id, :student_id, :course_id, :status)
                """),
                {"id": enrollment_id, "student_id": student_id, "course_id": course_id, "status": "active"}
            )
            print(f"  📝 Enrolled {student_name} in {code}")
        
        await session.commit()
        
        print(f"\n✅ Test data seeded successfully!")
        print(f"   - Created {len(courses_data)} courses")
        print(f"   - Enrolled {student_name} in all courses")
        print(f"   - Instructor: {instructor_name} (prof.ali@university.edu / Instructor123!)")
        print(f"\n🔄 Refresh your dashboard to see the courses!")

if __name__ == "__main__":
    asyncio.run(seed_test_data())
