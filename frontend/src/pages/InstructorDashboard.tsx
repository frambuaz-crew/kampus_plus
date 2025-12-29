/**
 * Instructor Dashboard (T050)
 * 
 * Features:
 * - Display courses being taught
 * - Analytics preview
 * - Course management links
 * - Upload course materials
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../api/config';
import { Header } from '../components/layout/Header';

interface Course {
  id: string;
  code: string;
  name: string;
  department: string | null;
  semester: string | null;
  credits: number | null;
  instructor_name: string | null;
}

interface MyCoursesResponse {
  courses: Course[];
}

export const InstructorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await apiClient.get<MyCoursesResponse>('/courses/my-courses');
        setCourses(response.data.courses);
      } catch (err) {
        setError('Failed to load courses');
        console.error('Error fetching courses:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Header */}
      <Header />
      
      {/* Page Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
        <div className="w-full px-8 xl:px-16 py-8">
          <div className="max-w-[1920px] mx-auto">
            <h1 className="text-3xl font-bold">
              👨‍🏫 Instructor Dashboard
            </h1>
            <p className="text-purple-100 mt-1">Manage your courses and student interactions</p>
          </div>
        </div>
      </div>

      <main className="w-full px-8 xl:px-16 py-8">
        <div className="max-w-[1920px] mx-auto">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button className="bg-white border-2 border-indigo-200 p-6 rounded-lg hover:border-indigo-400 hover:shadow-md transition-all text-left">
            <div className="text-4xl mb-3">📚</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Course Materials
            </h3>
            <p className="text-sm text-gray-600">
              Upload and manage course documents
            </p>
          </button>

          <button className="bg-white border-2 border-purple-200 p-6 rounded-lg hover:border-purple-400 hover:shadow-md transition-all text-left">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Analytics
            </h3>
            <p className="text-sm text-gray-600">
              View student engagement and performance
            </p>
          </button>

          <button className="bg-white border-2 border-green-200 p-6 rounded-lg hover:border-green-400 hover:shadow-md transition-all text-left">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              AI Assistant
            </h3>
            <p className="text-sm text-gray-600">
              Get insights and suggestions
            </p>
          </button>
        </div>

        {/* Teaching Courses */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              📖 My Courses
            </h2>
            {courses.length > 0 && (
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                Teaching {courses.length} {courses.length === 1 ? 'Course' : 'Courses'}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👨‍🏫</div>
              <p className="text-gray-600 text-lg font-medium mb-2">
                No courses assigned yet
              </p>
              <p className="text-gray-500 text-sm">
                Contact the department to get courses assigned
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-sm font-bold">
                          {course.code}
                        </span>
                        {course.semester && (
                          <span className="text-sm text-gray-500">
                            📅 {course.semester}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {course.name}
                      </h3>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        {course.department && (
                          <span>🏛️ {course.department}</span>
                        )}
                        {course.credits && (
                          <span>📊 {course.credits} credits</span>
                        )}
                      </div>
                    </div>
                    
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium">
                      Manage →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Analytics Preview */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            📈 Quick Analytics
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-3xl mb-2">👥</div>
              <p className="text-3xl font-bold text-gray-900 mb-1">0</p>
              <p className="text-sm text-gray-600">Total Students</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-3xl mb-2">📝</div>
              <p className="text-3xl font-bold text-gray-900 mb-1">0</p>
              <p className="text-sm text-gray-600">Uploaded Materials</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-3xl mb-2">💬</div>
              <p className="text-3xl font-bold text-gray-900 mb-1">0</p>
              <p className="text-sm text-gray-600">AI Queries (This Week)</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-3xl mb-2">⭐</div>
              <p className="text-3xl font-bold text-gray-900 mb-1">N/A</p>
              <p className="text-sm text-gray-600">Avg. Engagement</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <span className="font-medium">Tip:</span> Upload course materials to enable AI-powered Q&A for your students
            </p>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
};
