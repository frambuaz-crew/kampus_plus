"""
Database seed script for development.

Creates sample data:
- 3 users: 2 students, 1 instructor, 1 admin
- 3 courses with instructor assignments
- 2 enrollments linking students to courses

Usage:
    python -m scripts.seed_data

Requirements:
    - PostgreSQL running
    - Database created
    - Alembic migrations applied
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, timedelta
from uuid import uuid4

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_engine, get_session_factory
from src.models.user import User, UserRole
from src.models.course import Course, Enrollment, EnrollmentStatus

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    return pwd_context.hash(password)


async def clear_existing_data(session: AsyncSession) -> None:
    """Clear existing seed data (optional - for re-running seed)."""
    print("🗑️  Clearing existing data...")
    
    # Delete in reverse order of dependencies
    await session.execute(select(Enrollment).limit(0))  # Just to check table exists
    await session.commit()
    
    print("✅ Data cleared")


async def seed_users(session: AsyncSession) -> dict:
    """Seed sample users."""
    print("\n👤 Seeding users...")
    
    users_data = [
        {
            "email": "student1@university.edu.tr",
            "password": "Student123!",
            "role": UserRole.STUDENT,
            "first_name": "Ahmet",
            "last_name": "Yılmaz",
        },
        {
            "email": "student2@university.edu.tr",
            "password": "Student123!",
            "role": UserRole.STUDENT,
            "first_name": "Ayşe",
            "last_name": "Demir",
        },
        {
            "email": "instructor@university.edu.tr",
            "password": "Instructor123!",
            "role": UserRole.INSTRUCTOR,
            "first_name": "Dr. Mehmet",
            "last_name": "Kaya",
        },
        {
            "email": "admin@university.edu.tr",
            "password": "Admin123!",
            "role": UserRole.ADMIN,
            "first_name": "Admin",
            "last_name": "User",
        },
    ]
    
    created_users = {}
    
    for user_data in users_data:
        # Check if user already exists
        result = await session.execute(
            select(User).where(User.email == user_data["email"])
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"   ⚠️  User {user_data['email']} already exists, skipping")
            created_users[user_data["email"]] = existing_user
            continue
        
        password = user_data.pop("password")
        role = user_data.pop("role")
        email = user_data["email"]
        user = User(
            **user_data,
            role=role,
            password_hash=hash_password(password),
            is_verified=True,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(user)
        created_users[email] = user
        print(f"   ✅ Created {role.value}: {email}")
    
    await session.commit()
    print(f"✅ Seeded {len(created_users)} users")
    return created_users


async def seed_courses(session: AsyncSession, users: dict) -> dict:
    """Seed sample courses."""
    print("\n📚 Seeding courses...")
    
    instructor = users.get("instructor@university.edu.tr")
    if not instructor:
        print("   ⚠️  Instructor not found, skipping courses")
        return {}
    
    courses_data = [
        {
            "code": "CS101",
            "name": "Introduction to Computer Science",
            "description": "Fundamentals of programming and computer science concepts",
            "instructor_id": instructor.id,
            "semester": "2025-Spring",
            "year": 2025,
            "is_active": True,
        },
        {
            "code": "MATH201",
            "name": "Linear Algebra",
            "description": "Matrices, vector spaces, eigenvalues and eigenvectors",
            "instructor_id": instructor.id,
            "semester": "2025-Spring",
            "year": 2025,
            "is_active": True,
        },
        {
            "code": "PHYS101",
            "name": "Physics I",
            "description": "Mechanics, thermodynamics, and waves",
            "instructor_id": instructor.id,
            "semester": "2025-Spring",
            "year": 2025,
            "is_active": True,
        },
    ]
    
    created_courses = {}
    
    for course_data in courses_data:
        # Check if course already exists
        result = await session.execute(
            select(Course).where(Course.code == course_data["code"])
        )
        existing_course = result.scalar_one_or_none()
        
        if existing_course:
            print(f"   ⚠️  Course {course_data['code']} already exists, skipping")
            created_courses[course_data["code"]] = existing_course
            continue
        
        course = Course(
            **course_data,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(course)
        created_courses[course_data["code"]] = course
        print(f"   ✅ Created course: {course_data['code']} - {course_data['name']}")
    
    await session.commit()
    print(f"✅ Seeded {len(created_courses)} courses")
    return created_courses


async def seed_enrollments(session: AsyncSession, users: dict, courses: dict) -> None:
    """Seed sample enrollments."""
    print("\n📝 Seeding enrollments...")
    
    student1 = users.get("student1@university.edu.tr")
    student2 = users.get("student2@university.edu.tr")
    cs101 = courses.get("CS101")
    math201 = courses.get("MATH201")
    
    if not all([student1, student2, cs101, math201]):
        print("   ⚠️  Required users or courses not found, skipping enrollments")
        return
    
    enrollments_data = [
        {
            "student_id": student1.id,
            "course_id": cs101.id,
            "status": EnrollmentStatus.ACTIVE,
        },
        {
            "student_id": student1.id,
            "course_id": math201.id,
            "status": EnrollmentStatus.ACTIVE,
        },
        {
            "student_id": student2.id,
            "course_id": cs101.id,
            "status": EnrollmentStatus.ACTIVE,
        },
    ]
    
    created_count = 0
    
    for enrollment_data in enrollments_data:
        # Check if enrollment already exists
        result = await session.execute(
            select(Enrollment).where(
                Enrollment.student_id == enrollment_data["student_id"],
                Enrollment.course_id == enrollment_data["course_id"],
            )
        )
        existing_enrollment = result.scalar_one_or_none()
        
        if existing_enrollment:
            print(f"   ⚠️  Enrollment already exists, skipping")
            continue
        
        status = enrollment_data.pop("status")
        enrollment = Enrollment(
            **enrollment_data,
            status=status,
            enrolled_at=datetime.utcnow(),
        )
        session.add(enrollment)
        created_count += 1
        print(f"   ✅ Enrolled student in course")
    
    await session.commit()
    print(f"✅ Seeded {created_count} enrollments")


async def main():
    """Main seed function."""
    print("=" * 60)
    print("🌱 KAMPÜS+ Database Seeding Script")
    print("=" * 60)
    
    try:
        # Initialize database connection
        engine = get_engine()
        session_factory = get_session_factory()
        
        async with session_factory() as session:
            # Seed data
            users = await seed_users(session)
            courses = await seed_courses(session, users)
            await seed_enrollments(session, users, courses)
        
        print("\n" + "=" * 60)
        print("✅ Database seeding completed successfully!")
        print("=" * 60)
        print("\n📋 Sample Credentials:")
        print("   Student 1: student1@university.edu.tr / Student123!")
        print("   Student 2: student2@university.edu.tr / Student123!")
        print("   Instructor: instructor@university.edu.tr / Instructor123!")
        print("   Admin: admin@university.edu.tr / Admin123!")
        print("\n")
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        # Close engine
        await engine.dispose()


if __name__ == "__main__":
    # Windows compatibility: use SelectorEventLoop for psycopg async
    import sys
    import selectors
    if sys.platform == 'win32':
        asyncio.run(main(), loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()))
    else:
        asyncio.run(main())
