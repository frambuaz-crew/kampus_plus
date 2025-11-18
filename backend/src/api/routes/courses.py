"""Courses API routes."""

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.user import User
from src.models.course import Course, Enrollment, EnrollmentStatus

router = APIRouter(prefix="/courses", tags=["Courses"])


# Pydantic schemas
from pydantic import BaseModel, ConfigDict


class CourseResponse(BaseModel):
    """Course response schema matching OpenAPI spec."""
    
    id: UUID
    code: str
    name: str
    department: str | None = None
    semester: str | None = None
    credits: int | None = None
    instructor_name: str | None = None
    
    model_config = ConfigDict(from_attributes=True)


class MyCoursesResponse(BaseModel):
    """Response for GET /courses/my-courses endpoint."""
    
    courses: List[CourseResponse]


@router.get(
    "/my-courses",
    response_model=MyCoursesResponse,
    status_code=status.HTTP_200_OK,
    summary="Get my enrolled courses",
    description="Get courses user is enrolled in or teaching",
)
async def get_my_courses(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> MyCoursesResponse:
    """
    Get all courses the authenticated user is enrolled in (students) or teaching (instructors).
    
    - **Authentication required**: Bearer JWT token
    - **Returns**: List of enrolled/teaching courses with course details
    - **Filters**: Only active and completed enrollments (excludes dropped)
    """
    # For instructors, return courses they teach
    if current_user.role == "instructor":
        stmt = (
            select(Course)
            .where(Course.instructor_id == current_user.id)
            .options(selectinload(Course.instructor))
        )
    else:
        # For students, query enrollments with course and instructor data
        stmt = (
            select(Course)
            .join(Enrollment, Enrollment.course_id == Course.id)
            .where(Enrollment.student_id == current_user.id)
            .where(Enrollment.status.in_([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]))
            .options(selectinload(Course.instructor))
        )
    
    result = await session.execute(stmt)
    courses = result.scalars().all()
    
    # Build response with instructor names
    course_responses = []
    for course in courses:
        instructor_name = None
        if course.instructor:
            instructor_name = f"{course.instructor.first_name} {course.instructor.last_name}"
        
        course_data = CourseResponse(
            id=course.id,
            code=course.code,
            name=course.name,
            department=course.department,
            semester=course.semester,
            credits=course.credits,
            instructor_name=instructor_name,
        )
        course_responses.append(course_data)
    
    return MyCoursesResponse(courses=course_responses)
