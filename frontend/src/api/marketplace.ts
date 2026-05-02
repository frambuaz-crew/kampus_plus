import { apiClient } from './config';

export interface MarketplaceCreator {
  id: string;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  university?: string | null;
  profile_picture_url?: string | null;
}

export interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  price: string; // Decimal serialises to string in JSON
  category: string;
  condition: string;
  status: string;
  view_count: number;
  image_urls?: string | null; // JSON-encoded string array stored in DB
  created_at: string;
  seller_id: string;
  creator?: MarketplaceCreator | null;
}

export const getAdminMarketplaceListings = async (
  category?: string,
): Promise<MarketplaceListing[]> => {
  const response = await apiClient.get<MarketplaceListing[]>('/marketplace/admin/listings', {
    params: category ? { category } : undefined,
  });
  return response.data;
};

export const deleteMarketplaceListing = async (listingId: string): Promise<void> => {
  await apiClient.delete(`/marketplace/${listingId}`);
};
