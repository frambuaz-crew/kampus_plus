"""Contract tests for /courses endpoints - OpenAPI compliance validation."""

import pytest
from httpx import AsyncClient

from src.models.user import User
from src.models.course import Course, Enrollment, EnrollmentStatus


class TestMyCoursesEndpoint:
    """Test GET /courses/my-courses endpoint contract."""
    
    async def test_my_courses_requires_authentication(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/v1/courses/my-courses")
        assert response.status_code == 401
        
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "UNAUTHORIZED"
    
    async def test_my_courses_returns_200_with_courses(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict,
        db_session
    ):
        """Test that endpoint returns 200 with enrolled courses."""
        # Create test courses
        course1 = Course(
            code="CS101",
            name="Introduction to Programming",
            department="Computer Science",
            semester="2024-Fall",
            credits=3,
            instructor_id=test_user.id,
        )
        course2 = Course(
            code="MATH201",
            name="Calculus II",
            department="Mathematics",
            semester="2024-Fall",
            credits=4,
        )
        db_session.add_all([course1, course2])
        await db_session.flush()
        
        # Enroll test user in course1
        enrollment = Enrollment(
            student_id=test_user.id,
            course_id=course1.id,
            status=EnrollmentStatus.ACTIVE,
        )
        db_session.add(enrollment)
        await db_session.commit()
        
        response = await client.get("/v1/courses/my-courses", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "courses" in data
        assert isinstance(data["courses"], list)
    
    async def test_my_courses_returns_only_enrolled_courses(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict,
        db_session
    ):
        """Test that endpoint returns only courses user is enrolled in."""
        # Create 3 courses
        course1 = Course(
            code="CS101",
            name="Introduction to Programming",
            department="Computer Science",
            semester="2024-Fall",
            credits=3,
        )
        course2 = Course(
            code="MATH201",
            name="Calculus II",
            department="Mathematics",
            semester="2024-Fall",
            credits=4,
        )
        course3 = Course(
            code="PHYS101",
            name="Physics I",
            department="Physics",
            semester="2024-Fall",
            credits=3,
        )
        db_session.add_all([course1, course2, course3])
        await db_session.flush()
        
        # Enroll user only in course1 and course2
        enrollment1 = Enrollment(
            student_id=test_user.id,
            course_id=course1.id,
            status=EnrollmentStatus.ACTIVE,
        )
        enrollment2 = Enrollment(
            student_id=test_user.id,
            course_id=course2.id,
            status=EnrollmentStatus.ACTIVE,
        )
        db_session.add_all([enrollment1, enrollment2])
        await db_session.commit()
        
        response = await client.get("/v1/courses/my-courses", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["courses"]) == 2
        
        # Verify course codes
        course_codes = {course["code"] for course in data["courses"]}
        assert course_codes == {"CS101", "MATH201"}
    
    async def test_my_courses_excludes_dropped_enrollments(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict,
        db_session
    ):
        """Test that endpoint excludes dropped courses."""
        # Create courses
        active_course = Course(
            code="CS101",
            name="Programming",
            department="CS",
            semester="2024-Fall",
            credits=3,
        )
        dropped_course = Course(
            code="MATH201",
            name="Calculus",
            department="Math",
            semester="2024-Fall",
            credits=4,
        )
        db_session.add_all([active_course, dropped_course])
        await db_session.flush()
        
        # Create enrollments
        enrollment1 = Enrollment(
            student_id=test_user.id,
            course_id=active_course.id,
            status=EnrollmentStatus.ACTIVE,
        )
        enrollment2 = Enrollment(
            student_id=test_user.id,
            course_id=dropped_course.id,
            status=EnrollmentStatus.DROPPED,
        )
        db_session.add_all([enrollment1, enrollment2])
        await db_session.commit()
        
        response = await client.get("/v1/courses/my-courses", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["courses"]) == 1
        assert data["courses"][0]["code"] == "CS101"
    
    async def test_my_courses_includes_completed_enrollments(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict,
        db_session
    ):
        """Test that endpoint includes completed courses."""
        # Create courses
        active_course = Course(
            code="CS101",
            name="Programming",
            department="CS",
            semester="2024-Fall",
            credits=3,
        )
        completed_course = Course(
            code="CS100",
            name="Intro to CS",
            department="CS",
            semester="2024-Spring",
            credits=3,
        )
        db_session.add_all([active_course, completed_course])
        await db_session.flush()
        
        # Create enrollments
        enrollment1 = Enrollment(
            student_id=test_user.id,
            course_id=active_course.id,
            status=EnrollmentStatus.ACTIVE,
        )
        enrollment2 = Enrollment(
            student_id=test_user.id,
            course_id=completed_course.id,
            status=EnrollmentStatus.COMPLETED,
        )
        db_session.add_all([enrollment1, enrollment2])
        await db_session.commit()
        
        response = await client.get("/v1/courses/my-courses", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["courses"]) == 2
        
        course_codes = {course["code"] for course in data["courses"]}
        assert course_codes == {"CS101", "CS100"}
    
    async def test_my_courses_schema_compliance(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict,
        db_session
    ):
        """Test that response matches OpenAPI schema."""
        # Create course with all fields
        course = Course(
            code="CS101",
            name="Introduction to Programming",
            department="Computer Science",
            semester="2024-Fall",
            credits=3,
            instructor_id=test_user.id,
        )
        db_session.add(course)
        await db_session.flush()
        
        enrollment = Enrollment(
            student_id=test_user.id,
            course_id=course.id,
            status=EnrollmentStatus.ACTIVE,
        )
        db_session.add(enrollment)
        await db_session.commit()
        
        response = await client.get("/v1/courses/my-courses", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "courses" in data
        assert len(data["courses"]) == 1
        
        course_data = data["courses"][0]
        
        # Required fields per OpenAPI spec
        assert "id" in course_data
        assert "code" in course_data
        assert "name" in course_data
        assert "department" in course_data
        assert "semester" in course_data
        assert "credits" in course_data
        
        # Verify values
        assert course_data["code"] == "CS101"
        assert course_data["name"] == "Introduction to Programming"
        assert course_data["department"] == "Computer Science"
        assert course_data["semester"] == "2024-Fall"
        assert course_data["credits"] == 3
        assert course_data["instructor_name"] is not None
    
    async def test_my_courses_returns_empty_list_for_no_enrollments(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test that endpoint returns empty list when user has no enrollments."""
        response = await client.get("/v1/courses/my-courses", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "courses" in data
        assert data["courses"] == []
    
    async def test_my_courses_includes_instructor_name(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict,
        db_session
    ):
        """Test that course includes instructor_name field."""
        # Create instructor user
        instructor = User(
            email="instructor@uni.edu",
            first_name="Dr. John",
            last_name="Smith",
            password_hash="dummy",
            role="instructor",
            is_verified=True,
        )
        db_session.add(instructor)
        await db_session.flush()
        
        # Create course with instructor
        course = Course(
            code="CS101",
            name="Programming",
            department="CS",
            semester="2024-Fall",
            credits=3,
            instructor_id=instructor.id,
        )
        db_session.add(course)
        await db_session.flush()
        
        # Enroll test user
        enrollment = Enrollment(
            student_id=test_user.id,
            course_id=course.id,
            status=EnrollmentStatus.ACTIVE,
        )
        db_session.add(enrollment)
        await db_session.commit()
        
        response = await client.get("/v1/courses/my-courses", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["courses"]) == 1
        assert data["courses"][0]["instructor_name"] == "Dr. John Smith"
    
    async def test_my_courses_handles_course_without_instructor(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict,
        db_session
    ):
        """Test that course without instructor has null instructor_name."""
        course = Course(
            code="CS101",
            name="Programming",
            department="CS",
            semester="2024-Fall",
            credits=3,
            instructor_id=None,
        )
        db_session.add(course)
        await db_session.flush()
        
        enrollment = Enrollment(
            student_id=test_user.id,
            course_id=course.id,
            status=EnrollmentStatus.ACTIVE,
        )
        db_session.add(enrollment)
        await db_session.commit()
        
        response = await client.get("/v1/courses/my-courses", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["courses"]) == 1
        # instructor_name should be None or not present
        assert data["courses"][0].get("instructor_name") is None
