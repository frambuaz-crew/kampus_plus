/**
 * Academic API Service - Ders Programı ve Akademik Takvim
 *
 * Spec: 006-academic-features/spec.md
 */

import { apiClient } from './config';

// ============================================================================
// TYPES
// ============================================================================

export interface CourseSlot {
  day: string;
  start_time: string;
  end_time: string;
}

export interface CourseItem {
  id: string;
  name: string;
  code?: string | null;
  instructor?: string | null;
  room?: string | null;
  color?: string | null;
  slots: CourseSlot[];
}

export interface CourseSchedule {
  id: string;
  university: string;
  department: string;
  class_year: string;
  semester: string;
  academic_year: string;
  courses: CourseItem[];
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  university: string;
  academic_year: string;
  event_type: 'exam' | 'registration' | 'holiday' | 'other';
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  days_until?: number | null;
  created_at: string;
}

export interface SemesterInfo {
  semester: string;
  semester_label: string;
  academic_year: string;
}

export interface ContributionPayload {
  type: 'course_schedule' | 'academic_calendar';
  university: string;
  department?: string;
  class_year?: string;
  semester?: string;
  academic_year?: string;
  manual_data?: Record<string, unknown>;
  file_url?: string;
}

export interface ContributionItem {
  id: string;
  type: string;
  university: string;
  department?: string | null;
  class_year?: string | null;
  semester?: string | null;
  academic_year?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  created_at: string;
}

// ============================================================================
// API CALLS
// ============================================================================

export const getSemesterInfo = async (): Promise<SemesterInfo> => {
  const res = await apiClient.get<SemesterInfo>('/academic/semester-info');
  return res.data;
};

export const getCourseSchedule = async (params: {
  class_year: string;
  semester?: string;
  academic_year?: string;
}): Promise<CourseSchedule | null> => {
  const res = await apiClient.get<CourseSchedule | null>('/academic/course-schedule', { params });
  return res.data;
};

export const getCalendarEvents = async (params?: {
  academic_year?: string;
  event_type?: string;
}): Promise<CalendarEvent[]> => {
  const res = await apiClient.get<CalendarEvent[]>('/academic/calendar', { params });
  return res.data;
};

export const getUpcomingEvents = async (days = 30): Promise<CalendarEvent[]> => {
  const res = await apiClient.get<CalendarEvent[]>('/academic/calendar/upcoming', {
    params: { days },
  });
  return res.data;
};

export const submitContribution = async (payload: ContributionPayload): Promise<ContributionItem> => {
  const res = await apiClient.post<ContributionItem>('/academic/contribute', payload);
  return res.data;
};

export const getMyContributions = async (): Promise<ContributionItem[]> => {
  const res = await apiClient.get<ContributionItem[]>('/academic/my-contributions');
  return res.data;
};
