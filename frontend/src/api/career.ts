import { apiClient } from './config';

export interface CareerCreator {
  id: string;
  username: string;
  full_name?: string | null;
  university?: string | null;
  department?: string | null;
  profile_picture_url?: string | null;
}

export interface CareerListing {
  id: string;
  listing_type: string;
  title: string;
  description: string;
  sector?: string | null;
  location?: string | null;
  company_name?: string | null;
  external_link?: string | null;
  salary_range?: string | null;
  required_position?: string | null;
  duration?: string | null;
  payment_type?: string | null;
  status: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  creator?: CareerCreator | null;
  posted_by?: string | null;
}

export const getAdminCareerListings = async (
  listing_type?: string,
): Promise<CareerListing[]> => {
  const response = await apiClient.get<CareerListing[]>('/career/admin/listings', {
    params: listing_type ? { listing_type } : undefined,
  });
  return response.data;
};

export const deleteCareerListing = async (listingId: string): Promise<void> => {
  await apiClient.delete(`/career/listings/${listingId}`);
};
