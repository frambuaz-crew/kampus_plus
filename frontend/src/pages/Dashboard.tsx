/**
 * Student Dashboard (T049)
 * 
 * Features:
 * - Display enrolled courses from /courses/my-courses endpoint
 * - Quick access button to AI chat
 * - Upload button for personal documents
 * - User profile section
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

interface DocumentStats {
  total_documents: number;
  pending_documents: number;
  processing_documents: number;
  completed_documents: number;
  failed_documents: number;
  total_storage_used: number;
  storage_quota: number;
  storage_usage_percent: number;
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [documentStats, setDocumentStats] = useState<DocumentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch courses
        const coursesResponse = await apiClient.get<MyCoursesResponse>('/courses/my-courses');
        setCourses(coursesResponse.data.courses);
        
        // Fetch document stats
        try {
          const statsResponse = await apiClient.get<DocumentStats>('/documents/stats');
          setDocumentStats(statsResponse.data);
        } catch (statsErr) {
          console.error('Error fetching document stats:', statsErr);
          // Don't fail the whole page if stats fail
        }
      } catch (err) {
        setError('Failed to load courses');
        console.error('Error fetching courses:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Header */}
      <Header />

      <main className="w-full px-8 xl:px-16 py-8">
        <div className="max-w-[1920px] mx-auto">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button 
            onClick={() => navigate('/chat')}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="text-4xl">🤖</div>
              <div>
                <h3 className="text-xl font-bold mb-1">AI Assistant</h3>
                <p className="text-indigo-100 text-sm">
                  Ask questions about courses, documents, and more
                </p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/forum')}
            className="bg-white border border-gray-200 p-6 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="text-4xl">🧑‍🏫</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  Go to Forum
                </h3>
                <p className="text-gray-600 text-sm">
                  Join course discussions and ask peers/instructors
                </p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/documents')}
            className="bg-white border-2 border-dashed border-gray-300 p-6 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="text-4xl">📄</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  Upload Documents
                </h3>
                <p className="text-gray-600 text-sm">
                  Add your study notes and materials
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Document Statistics - T088 */}
        {documentStats && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                📊 Document Storage
              </h2>
              <button
                onClick={() => navigate('/documents')}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                View All →
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {documentStats.total_documents}
                </div>
                <div className="text-xs text-gray-600 mt-1">Total Files</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">
                  {documentStats.completed_documents}
                </div>
                <div className="text-xs text-gray-600 mt-1">Completed</div>
              </div>
              
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-700">
                  {documentStats.processing_documents + documentStats.pending_documents}
                </div>
                <div className="text-xs text-gray-600 mt-1">Processing</div>
              </div>
              
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-700">
                  {documentStats.failed_documents}
                </div>
                <div className="text-xs text-gray-600 mt-1">Failed</div>
              </div>
            </div>

            {/* Storage Usage Bar */}
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Storage Used</span>
                <span>
                  {(documentStats.total_storage_used / (1024 * 1024)).toFixed(2)} MB / 
                  {' '}{(documentStats.storage_quota / (1024 * 1024)).toFixed(0)} MB
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    documentStats.storage_usage_percent >= 90
                      ? 'bg-red-500'
                      : documentStats.storage_usage_percent >= 75
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(documentStats.storage_usage_percent, 100)}%` }}
                />
              </div>
              <div className="text-right text-xs text-gray-500 mt-1">
                {documentStats.storage_usage_percent.toFixed(1)}% used
              </div>
            </div>
          </div>
        )}

        {/* Enrolled Courses */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              📚 My Courses
            </h2>
            {courses.length > 0 && (
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                {courses.length} {courses.length === 1 ? 'Course' : 'Courses'}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📖</div>
              <p className="text-gray-600 text-lg font-medium mb-2">
                No courses enrolled yet
              </p>
              <p className="text-gray-500 text-sm">
                Contact your academic advisor to enroll in courses
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-bold">
                      {course.code}
                    </span>
                    {course.credits && (
                      <span className="text-xs text-gray-500">
                        {course.credits} credits
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                    {course.name}
                  </h3>
                  
                  {course.instructor_name && (
                    <p className="text-sm text-gray-600 mb-1">
                      👨‍🏫 {course.instructor_name}
                    </p>
                  )}
                  
                  {course.department && (
                    <p className="text-xs text-gray-500 mb-1">
                      🏛️ {course.department}
                    </p>
                  )}
                  
                  {course.semester && (
                    <p className="text-xs text-gray-500">
                      📅 {course.semester}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">📊</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {courses.length}
                </p>
                <p className="text-sm text-gray-600">Active Courses</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">💬</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">AI Conversations</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">📁</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">Uploaded Documents</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
};
