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
  is_approved?: boolean;
  courses: CourseItem[];
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  university: string;
  academic_year: string;
  is_approved?: boolean;
  event_type: 'exam' | 'registration' | 'holiday' | 'other';
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  days_until?: number | null;
  created_at: string;
}

export interface PersonalSchedule {
  id: string;
  user_id: string;
  base_schedule_id: string | null;
  courses: CourseItem[];
  updated_at: string;
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
  university?: string;
  university_id?: string;
  department?: string;
}): Promise<CourseSchedule | null> => {
  const res = await apiClient.get<CourseSchedule | null>('/academic/course-schedule', { params });
  return res.data;
};

export const getCalendarEvents = async (params?: {
  academic_year?: string;
  event_type?: string;
  university?: string;
  university_id?: string;
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

export const getPendingCalendarEvents = async (): Promise<CalendarEvent[]> => {
  const res = await apiClient.get<CalendarEvent[]>('/academic/admin/calendar/pending');
  return res.data;
};

export const approveCalendarEvent = async (eventId: string): Promise<CalendarEvent> => {
  const res = await apiClient.patch<CalendarEvent>(`/academic/calendar/${eventId}/approve`);
  return res.data;
};

export interface UpdateCalendarEventPayload {
  title?: string;
  event_type?: CalendarEvent['event_type'];
  start_date?: string;
  end_date?: string | null;
  description?: string | null;
}

export const updateCalendarEvent = async (
  eventId: string,
  payload: UpdateCalendarEventPayload
): Promise<CalendarEvent> => {
  const res = await apiClient.patch<CalendarEvent>(`/academic/calendar/${eventId}`, payload);
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

// ============================================================================
// PDF DERS PROGRAMI YÜKLEME
// ============================================================================

export interface CalendarUploadResult {
  success: boolean;
  message: string;
  university: string;
  academic_year: string;
  events_parsed: number;
}

export const uploadCalendarPDF = async (params: {
  file: File;
  university_id: string;
  academic_year?: string;
}): Promise<CalendarUploadResult> => {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('university_id', params.university_id);
  if (params.academic_year) {
    formData.append('academic_year', params.academic_year);
  }

  const res = await apiClient.post<CalendarUploadResult>(
    '/academic/calendar/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data;
};

export interface ScheduleUploadResult {
  success: boolean;
  message: string;
  university: string;
  department: string;
  class_year: string;
  semester: string;
  academic_year: string;
  days_parsed: string[];
  total_lessons: number;
}

export const uploadSchedulePDF = async (params: {
  file: File;
  university: string;
  department: string;
  class_year: string;
  semester: string;
  academic_year?: string;
}): Promise<ScheduleUploadResult> => {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('university', params.university);
  formData.append('department', params.department);
  formData.append('class_year', params.class_year);
  formData.append('semester', params.semester);
  if (params.academic_year) {
    formData.append('academic_year', params.academic_year);
  }

  const res = await apiClient.post<ScheduleUploadResult>(
    '/academic/schedule/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data;
};

// ============================================================================
// KİŞİSEL DERS PROGRAMI
// ============================================================================

export const getMySchedule = async (): Promise<PersonalSchedule> => {
  const res = await apiClient.get<PersonalSchedule>('/academic/my-schedule');
  return res.data;
};

export const cloneToMySchedule = async (courseScheduleId: string): Promise<PersonalSchedule> => {
  const res = await apiClient.post<PersonalSchedule>(
    `/academic/my-schedule/clone/${courseScheduleId}`
  );
  return res.data;
};

export const updateMySchedule = async (courses: CourseItem[]): Promise<PersonalSchedule> => {
  const res = await apiClient.put<PersonalSchedule>('/academic/my-schedule', { courses });
  return res.data;
};

// ============================================================================
// ADMİN — DERS PROGRAMI
// ============================================================================

export const getPendingSchedules = async (): Promise<CourseSchedule[]> => {
  const res = await apiClient.get<CourseSchedule[]>('/academic/admin/schedules/pending');
  return res.data;
};

export const getApprovedSchedules = async (): Promise<CourseSchedule[]> => {
  const res = await apiClient.get<CourseSchedule[]>('/academic/admin/schedules/approved');
  return res.data;
};

export const approveSchedule = async (scheduleId: string): Promise<CourseSchedule> => {
  const res = await apiClient.patch<CourseSchedule>(`/academic/admin/schedules/${scheduleId}/approve`);
  return res.data;
};

export const deleteSchedule = async (scheduleId: string): Promise<void> => {
  await apiClient.delete(`/academic/admin/schedules/${scheduleId}`);
};

export const updateSchedule = async (
  scheduleId: string,
  courses: CourseItem[]
): Promise<CourseSchedule> => {
  const res = await apiClient.patch<CourseSchedule>(`/academic/admin/schedules/${scheduleId}`, {
    courses,
  });
  return res.data;
};
