/**
 * Professional Header Component
 * 
 * Features:
 * - Logo (left)
 * - Dark mode toggle
 * - Notifications dropdown with badge
 * - Messages dropdown with badge
 * - Profile dropdown
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface Notification {
  id: string;
  type: 'course' | 'document' | 'forum' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface Message {
  id: string;
  sender: string;
  preview: string;
  time: string;
  unread: boolean;
}

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State for dropdowns
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Mock data - replace with real API calls
  const notifications: Notification[] = [
    {
      id: '1',
      type: 'course',
      title: 'New course material',
      message: 'BIL101 - Lecture notes uploaded',
      time: '5 mins ago',
      read: false,
    },
    {
      id: '2',
      type: 'document',
      title: 'Document processed',
      message: 'notes.pdf is ready',
      time: '10 mins ago',
      read: false,
    },
    {
      id: '3',
      type: 'forum',
      title: 'Forum reply',
      message: 'Someone replied to your post',
      time: '2 hours ago',
      read: true,
    },
  ];

  const messages: Message[] = [
    {
      id: '1',
      sender: 'Dr. Mehmet Yılmaz',
      preview: 'Proje hakkında konuşmamız lazım...',
      time: '2 mins ago',
      unread: true,
    },
    {
      id: '2',
      sender: 'Ayşe Kaya',
      preview: 'Sınav tarihi değişti mi?',
      time: '1 hour ago',
      unread: true,
    },
    {
      id: '3',
      sender: 'Can Demir',
      preview: 'Ders notlarını paylaşabilir misin?',
      time: 'Yesterday',
      unread: false,
    },
  ];

  const unreadNotifications = notifications.filter(n => !n.read).length;
  const unreadMessages = messages.filter(m => m.unread).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'course': return '🎓';
      case 'document': return '✅';
      case 'forum': return '📝';
      case 'system': return '⚙️';
      default: return '📬';
    }
  };

  const handleLogout = () => {
    setProfileOpen(false); // Close dropdown first
    logout();
    // Small delay to ensure logout completes
    setTimeout(() => {
      navigate('/login');
    }, 100);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="w-full px-8 xl:px-16">
        <div className="flex items-center justify-between h-16 max-w-[1920px] mx-auto">
          
          {/* Logo - Left */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => navigate('/dashboard')}
          >
            <span className="text-3xl group-hover:scale-110 transition-transform">🎓</span>
            <h1 className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
              KAMPÜS+
            </h1>
          </div>

          {/* Actions - Right */}
          <div className="flex items-center space-x-2">
            
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors relative group"
              title="Toggle theme"
            >
              <span className="text-xl">
                {darkMode ? '☀️' : '🌙'}
              </span>
              <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Toggle theme
              </span>
            </button>

            {/* Divider */}
            <div className="h-8 w-px bg-gray-200 mx-1"></div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setMessagesOpen(false);
                  setProfileOpen(false);
                }}
                className="p-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors relative"
              >
                <span className="text-xl">🔔</span>
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 animate-fadeIn z-50">
                  {/* Header */}
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                      <span>📬</span>
                      <span>Notifications</span>
                      {unreadNotifications > 0 && (
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                          {unreadNotifications} new
                        </span>
                      )}
                    </h3>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500">
                        <span className="text-3xl block mb-2">📭</span>
                        <p className="text-sm">No notifications</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 ${
                            !notif.read ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <span className="text-xl">{getNotificationIcon(notif.type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                              <p className="text-xs text-gray-600 truncate">{notif.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                            </div>
                            {!notif.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2 border-t border-gray-100 flex justify-between text-xs">
                    <button className="text-indigo-600 hover:text-indigo-700 font-medium">
                      View all
                    </button>
                    <button className="text-gray-600 hover:text-gray-700">
                      Mark all read
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="relative">
              <button
                onClick={() => {
                  setMessagesOpen(!messagesOpen);
                  setNotificationsOpen(false);
                  setProfileOpen(false);
                }}
                className="p-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors relative"
              >
                <span className="text-xl">💬</span>
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadMessages}
                  </span>
                )}
              </button>

              {/* Messages Dropdown */}
              {messagesOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 animate-fadeIn z-50">
                  {/* Header */}
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                      <span>💬</span>
                      <span>Messages</span>
                      {unreadMessages > 0 && (
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                          {unreadMessages} unread
                        </span>
                      )}
                    </h3>
                  </div>

                  {/* Messages List */}
                  <div className="max-h-96 overflow-y-auto">
                    {messages.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500">
                        <span className="text-3xl block mb-2">✉️</span>
                        <p className="text-sm">No messages</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 ${
                            msg.unread ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => navigate('/messages')}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-sm font-semibold">
                                {msg.sender.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {msg.sender}
                                </p>
                                {msg.unread && (
                                  <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 truncate">{msg.preview}</p>
                              <p className="text-xs text-gray-400 mt-1">{msg.time}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2 border-t border-gray-100">
                    <button 
                      onClick={() => navigate('/messages')}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium w-full text-center"
                    >
                      View all messages →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-gray-200 mx-1"></div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                  setMessagesOpen(false);
                }}
                className="flex items-center space-x-3 p-2 pl-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                  </span>
                </div>
                <span className="text-sm font-medium hidden lg:block">
                  {user?.first_name} {user?.last_name}
                </span>
                <svg 
                  className="w-4 h-4 text-gray-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Profile Dropdown */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 animate-fadeIn z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {user?.first_name} {user?.last_name}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <button 
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                      onClick={() => {
                        navigate('/profile');
                        setProfileOpen(false);
                      }}
                    >
                      <span>👤</span>
                      <span>My Profile</span>
                    </button>
                    <button 
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                      onClick={() => {
                        navigate('/settings');
                        setProfileOpen(false);
                      }}
                    >
                      <span>⚙️</span>
                      <span>Settings</span>
                    </button>
                    <button 
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                      onClick={() => {
                        navigate('/stats');
                        setProfileOpen(false);
                      }}
                    >
                      <span>📊</span>
                      <span>My Statistics</span>
                    </button>
                    <button 
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                      onClick={() => {
                        navigate('/documents');
                        setProfileOpen(false);
                      }}
                    >
                      <span>📁</span>
                      <span>My Documents</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-100 my-2"></div>

                  {/* Help & Support */}
                  <div className="py-2">
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3">
                      <span>❓</span>
                      <span>Help & Support</span>
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3">
                      <span>📚</span>
                      <span>Documentation</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-100 my-2"></div>

                  {/* Logout */}
                  <div className="py-2">
                    <button 
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 font-medium"
                    >
                      <span>🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(notificationsOpen || messagesOpen || profileOpen) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setNotificationsOpen(false);
            setMessagesOpen(false);
            setProfileOpen(false);
          }}
        ></div>
      )}
    </header>
  );
};

