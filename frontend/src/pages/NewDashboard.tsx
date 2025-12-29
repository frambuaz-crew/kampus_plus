/**
 * New Dashboard - Professional Layout
 * 
 * Features:
 * - Hero/Welcome section with AI search
 * - Stats cards (KPIs)
 * - Quick action widgets
 * - Recent activity feed
 * - Active courses overview
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../api/config';
import { MainLayout } from '../components/layout/MainLayout';

interface Course {
  id: string;
  code: string;
  name: string;
  department: string | null;
  semester: string | null;
  credits: number | null;
  instructor_name: string | null;
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

export const NewDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [documentStats, setDocumentStats] = useState<DocumentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch courses
        const coursesResponse = await apiClient.get('/courses/my-courses');
        setCourses(coursesResponse.data.courses);
        
        // Fetch document stats
        try {
          const statsResponse = await apiClient.get('/documents/stats');
          setDocumentStats(statsResponse.data);
        } catch (statsErr) {
          console.error('Error fetching document stats:', statsErr);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <MainLayout>
      <div className="w-full px-8 xl:px-16 py-8">
        <div className="max-w-[1920px] mx-auto space-y-8">
          
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl shadow-lg p-8 text-white">
            <div className="max-w-4xl">
              <h1 className="text-4xl font-bold mb-2">
                👋 Welcome back, {user?.first_name}!
              </h1>
              <p className="text-indigo-100 text-lg mb-6">
                {getGreeting()} ☀️ Ready to continue learning?
              </p>
              
              {/* Quick AI Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Ask AI anything or search courses..."
                  className="w-full px-6 py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                  onFocus={() => navigate('/chat')}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <kbd className="px-3 py-1 bg-white/20 rounded-lg text-sm">Enter</kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Courses */}
            <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/courses')}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📚</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Active</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{courses.length}</div>
              <div className="text-sm text-gray-600 mt-1">Courses</div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/documents')}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📄</span>
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  {documentStats?.completed_documents || 0}
                </span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {documentStats?.total_documents || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Documents</div>
            </div>

            {/* Messages */}
            <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">💬</span>
                <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">3</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">12</div>
              <div className="text-sm text-gray-600 mt-1">Messages</div>
            </div>

            {/* Storage */}
            <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/documents')}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">💾</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  (documentStats?.storage_usage_percent || 0) > 80 
                    ? 'text-red-600 bg-red-100' 
                    : 'text-green-600 bg-green-100'
                }`}>
                  {Math.round(documentStats?.storage_usage_percent || 0)}%
                </span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {Math.round((documentStats?.total_storage_used || 0) / (1024 * 1024))}
              </div>
              <div className="text-sm text-gray-600 mt-1">MB Used</div>
            </div>

            {/* AI Usage */}
            <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/chat')}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🤖</span>
                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">Week</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">23</div>
              <div className="text-sm text-gray-600 mt-1">AI Queries</div>
            </div>

            {/* Forum */}
            <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/forum')}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">💭</span>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">5 new</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">47</div>
              <div className="text-sm text-gray-600 mt-1">Forum Posts</div>
            </div>
          </div>

          {/* Two Column Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Active Courses & Quick Actions */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Quick Actions Widget */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">⚡</span>
                  Quick Actions
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => navigate('/chat')}
                    className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg hover:from-indigo-100 hover:to-purple-100 transition-all text-left group"
                  >
                    <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">🤖</span>
                    <span className="text-sm font-medium text-gray-900">AI Chat</span>
                  </button>
                  
                  <button
                    onClick={() => navigate('/documents')}
                    className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg hover:from-blue-100 hover:to-cyan-100 transition-all text-left group"
                  >
                    <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">📤</span>
                    <span className="text-sm font-medium text-gray-900">Upload</span>
                  </button>
                  
                  <button
                    onClick={() => navigate('/forum')}
                    className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg hover:from-green-100 hover:to-emerald-100 transition-all text-left group"
                  >
                    <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">💬</span>
                    <span className="text-sm font-medium text-gray-900">Forum</span>
                  </button>
                  
                  <button
                    onClick={() => navigate('/stats')}
                    className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg hover:from-orange-100 hover:to-red-100 transition-all text-left group"
                  >
                    <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">📊</span>
                    <span className="text-sm font-medium text-gray-900">Stats</span>
                  </button>
                </div>
              </div>

              {/* Active Courses Widget */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center">
                    <span className="mr-2">📚</span>
                    My Active Courses
                  </h2>
                  <button
                    onClick={() => navigate('/courses')}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    View All →
                  </button>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : courses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <span className="text-4xl block mb-2">📖</span>
                    <p>No courses enrolled yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courses.slice(0, 4).map((course) => (
                      <div
                        key={course.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold">
                            {course.code}
                          </span>
                          {course.credits && (
                            <span className="text-xs text-gray-500">{course.credits} credits</span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                          {course.name}
                        </h3>
                        {course.instructor_name && (
                          <p className="text-sm text-gray-600">👨‍🏫 {course.instructor_name}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {courses.length > 4 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => navigate('/courses')}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      +{courses.length - 4} more courses
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Recent Activity & Tips */}
            <div className="space-y-6">
              
              {/* Recent Activity Widget */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🕒</span>
                  Recent Activity
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">✅</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">Document processed</p>
                      <p className="text-xs text-gray-500">notes.pdf • 5 mins ago</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">💬</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">Forum reply</p>
                      <p className="text-xs text-gray-500">Your post • 1 hour ago</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">🤖</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">AI chat session</p>
                      <p className="text-xs text-gray-500">BIL101 questions • 3 hours ago</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">📚</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">Course material added</p>
                      <p className="text-xs text-gray-500">BIL101 • Yesterday</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips Widget */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-sm p-6 border border-amber-200">
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">💡</span>
                  Pro Tip
                </h2>
                <p className="text-sm text-gray-700 mb-3">
                  Upload your lecture notes to enable AI-powered Q&A. The AI can answer questions based on your personal documents!
                </p>
                <button
                  onClick={() => navigate('/documents')}
                  className="text-sm font-medium text-amber-700 hover:text-amber-800"
                >
                  Upload Documents →
                </button>
              </div>

              {/* Storage Widget */}
              {documentStats && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">💾</span>
                    Storage
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Used</span>
                      <span className="font-semibold text-gray-900">
                        {(documentStats.total_storage_used / (1024 * 1024)).toFixed(2)} MB / 
                        {' '}{(documentStats.storage_quota / (1024 * 1024)).toFixed(0)} MB
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-full rounded-full transition-all ${
                          documentStats.storage_usage_percent >= 90
                            ? 'bg-red-500'
                            : documentStats.storage_usage_percent >= 75
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(documentStats.storage_usage_percent, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{documentStats.completed_documents} files</span>
                      <span>{documentStats.storage_usage_percent.toFixed(1)}% used</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
};

