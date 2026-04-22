import { apiClient } from './config';

export interface TopicAuthor {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  profile_picture_url?: string | null;
}

export interface TopicItem {
  id: string;
  course_code: string;
  title: string;
  university_id?: string | null;
  created_by: string;
  creator?: TopicAuthor | null;
  entry_count: number;
  created_at: string;
}

export interface Attachment {
  id: string;
  file_url: string;
  file_type: 'pdf' | 'image';
  file_name: string;
}

export interface NoteEntry {
  id: string;
  topic_id: string;
  user_id: string;
  author?: TopicAuthor | null;
  content?: string | null;
  attachments: Attachment[];
  created_at: string;
}

export interface TopicDetail {
  id: string;
  course_code: string;
  title: string;
  university_id?: string | null;
  created_by: string;
  creator?: TopicAuthor | null;
  entries: NoteEntry[];
  created_at: string;
}

export const getCourseNoteTopics = async (params?: {
  course_code?: string;
  university_id?: string;
  page?: number;
  limit?: number;
}): Promise<TopicItem[]> => {
  const response = await apiClient.get<TopicItem[]>('/course-notes/topics', { params });
  return response.data;
};

export const createCourseNoteTopic = async (data: {
  course_code: string;
  title: string;
  university_id?: string;
}): Promise<TopicItem> => {
  const formData = new FormData();
  formData.append('course_code', data.course_code);
  formData.append('title', data.title);
  if (data.university_id) formData.append('university_id', data.university_id);
  const response = await apiClient.post<TopicItem>('/course-notes/topics', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getCourseNoteTopicDetail = async (topicId: string): Promise<TopicDetail> => {
  const response = await apiClient.get<TopicDetail>(`/course-notes/topics/${topicId}`);
  return response.data;
};

export const createCourseNoteEntry = async (
  topicId: string,
  data: { content?: string; files?: File[] },
): Promise<NoteEntry> => {
  const formData = new FormData();
  if (data.content) formData.append('content', data.content);
  if (data.files) {
    data.files.forEach((f) => formData.append('files', f));
  }
  const response = await apiClient.post<NoteEntry>(
    `/course-notes/topics/${topicId}/entries`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
};
