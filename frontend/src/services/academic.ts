import {
  approveCalendarEvent,
  getCalendarEvents,
  getCourseSchedule,
  getMyContributions,
  getPendingCalendarEvents,
  getSemesterInfo,
  getUpcomingEvents,
  submitContribution,
  type CalendarEvent,
  type CalendarUploadResult,
  type CourseItem,
  type CourseSchedule,
  type ContributionItem,
  type ContributionPayload,
  type ScheduleUploadResult,
  type SemesterInfo,
  uploadCalendarPDF,
  uploadSchedulePDF,
  updateCalendarEvent,
} from '../api/academic';
import { apiClient } from '../api/config';

export type {
  CalendarEvent,
  CalendarUploadResult,
  CourseItem,
  CourseSchedule,
  ContributionItem,
  ContributionPayload,
  ScheduleUploadResult,
  SemesterInfo,
};

export {
  approveCalendarEvent,
  getCalendarEvents,
  getCourseSchedule,
  getMyContributions,
  getPendingCalendarEvents,
  getSemesterInfo,
  getUpcomingEvents,
  submitContribution,
  updateCalendarEvent,
  uploadCalendarPDF,
  uploadSchedulePDF,
};

export const getApprovedCalendarEvents = async (params?: {
  university?: string;
  academic_year?: string;
}): Promise<CalendarEvent[]> => {
  const res = await apiClient.get<CalendarEvent[]>('/academic/admin/calendar/approved', { params });
  return res.data;
};

export const deleteCalendarEvent = async (eventId: string): Promise<void> => {
  await apiClient.delete(`/academic/calendar/${eventId}`);
};
