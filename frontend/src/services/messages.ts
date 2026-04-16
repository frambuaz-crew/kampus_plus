import { apiClient } from '../api/config';

export interface StartDirectResponse {
  conversation_id: string;
  created: boolean;
}

/**
 * Verilen receiver_id ile doğrudan (direct) bir konuşma başlatır veya mevcutu döndürür.
 * Backend: POST /api/v1/messages/direct
 */
export const startDirectMessage = async (receiverId: string): Promise<StartDirectResponse> => {
  const res = await apiClient.post<StartDirectResponse>('/messages/direct', {
    receiver_id: receiverId,
  });
  return res.data;
};
