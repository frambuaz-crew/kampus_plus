/**
 * Arkadaşlık (Friendship) API servisi
 *
 * Spec: Arkadaşlık sistemi - backend /api/v1/friendships/...
 */

import { apiClient } from './config';

// ─── Tipler ───────────────────────────────────────────────────────────────────

export interface UserSummary {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  profile_picture_url?: string | null;
}

export interface FriendshipResponse {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  requester?: UserSummary | null;
  addressee?: UserSummary | null;
}

export interface FriendsListResponse {
  total: number;
  friends: FriendshipResponse[];
}

export interface PendingRequestsResponse {
  total: number;
  requests: FriendshipResponse[];
}

// ─── API Fonksiyonları ────────────────────────────────────────────────────────

/** Belirtilen kullanıcıya arkadaşlık isteği gönderir. */
export const sendRequest = async (addresseeId: string): Promise<FriendshipResponse> => {
  const res = await apiClient.post<FriendshipResponse>('/friendships/request', {
    addressee_id: addresseeId,
  });
  return res.data;
};

/** Gelen arkadaşlık isteğini kabul veya reddeder. */
export const respondToRequest = async (
  friendshipId: string,
  status: 'accepted' | 'rejected',
): Promise<FriendshipResponse> => {
  const res = await apiClient.put<FriendshipResponse>(
    `/friendships/respond/${friendshipId}`,
    { status },
  );
  return res.data;
};

/** Kabul edilmiş arkadaşları getirir. */
export const getFriends = async (): Promise<FriendsListResponse> => {
  const res = await apiClient.get<FriendsListResponse>('/friendships/friends');
  return res.data;
};

/** Bekleyen (pending) gelen istekleri getirir. */
export const getPendingRequests = async (): Promise<PendingRequestsResponse> => {
  const res = await apiClient.get<PendingRequestsResponse>('/friendships/pending');
  return res.data;
};
