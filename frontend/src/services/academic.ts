import {
  approveCalendarEvent,
  approveSchedule,
  cloneToMySchedule,
  deleteSchedule,
  getApprovedSchedules,
  getCalendarEvents,
  getCourseSchedule,
  getMyContributions,
  getMySchedule,
  getPendingCalendarEvents,
  getPendingSchedules,
  getSemesterInfo,
  getUpcomingEvents,
  submitContribution,
  updateMySchedule,
  updateSchedule,
  type CalendarEvent,
  type CalendarUploadResult,
  type CourseItem,
  type CourseSchedule,
  type ContributionItem,
  type ContributionPayload,
  type PersonalSchedule,
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
  PersonalSchedule,
  ScheduleUploadResult,
  SemesterInfo,
};

export {
  approveCalendarEvent,
  approveSchedule,
  cloneToMySchedule,
  deleteSchedule,
  getApprovedSchedules,
  getCalendarEvents,
  getCourseSchedule,
  getMyContributions,
  getMySchedule,
  getPendingCalendarEvents,
  getPendingSchedules,
  getSemesterInfo,
  getUpcomingEvents,
  submitContribution,
  updateCalendarEvent,
  updateMySchedule,
  updateSchedule,
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
