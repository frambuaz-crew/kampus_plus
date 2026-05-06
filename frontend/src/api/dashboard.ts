import { apiClient } from './config';

export interface FeedItem {
  id: string;
  type: 'forum' | 'marketplace' | 'career';
  title: string;
  author_name: string;
  created_at: string;
  // Forum
  tags?: string[] | null;
  // Marketplace
  price?: string | null;
  image_url?: string | null;
  // Career
  company_name?: string | null;
  location?: string | null;
  listing_type?: string | null;
  sector?: string | null;
  salary_range?: string | null;
}

export interface EventItem {
  id: string;
  title: string;
  start_date: string;
  end_date?: string | null;
  event_type?: string | null;
}

export interface SemesterInfo {
  start_date: string;
  end_date: string;
  title: string;
}

export interface DashboardResponse {
  unread_message_count: number;
  active_listing_count: number;
  ai_messages_remaining: number;
  friend_count: number;
  recent_feed: FeedItem[];
  upcoming_events: EventItem[];
  semester_info: SemesterInfo | null;
}

export async function getStudentDashboard(): Promise<DashboardResponse> {
  const res = await apiClient.get<DashboardResponse>('/dashboard/me');
  return res.data;
}
