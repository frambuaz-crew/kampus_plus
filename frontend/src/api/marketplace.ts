import { apiClient } from './config';
import type {
  MarketplaceListing,
  MarketplaceCreator,
  MarketplaceCategory,
  MarketplaceCategoriesResponse,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../types/marketplace';

// Re-export types that admin page imports from this module directly
export type { MarketplaceCreator, MarketplaceListing };

// ============================================================================
// İLAN
// ============================================================================

export const getAdminMarketplaceListings = async (
  categoryId?: string,
): Promise<MarketplaceListing[]> => {
  const response = await apiClient.get<MarketplaceListing[]>('/marketplace/admin/listings', {
    params: categoryId ? { category_id: categoryId } : undefined,
  });
  return response.data;
};

export const deleteMarketplaceListing = async (listingId: string): Promise<void> => {
  await apiClient.delete(`/marketplace/${listingId}`);
};

// ============================================================================
// KATEGORİ
// ============================================================================

export const getMarketplaceCategories = async (): Promise<MarketplaceCategoriesResponse> => {
  const response = await apiClient.get<MarketplaceCategoriesResponse>('/marketplace/categories');
  return response.data;
};

export const createMarketplaceCategory = async (
  data: CreateCategoryPayload,
): Promise<{ success: boolean; category: MarketplaceCategory }> => {
  const response = await apiClient.post<{ success: boolean; category: MarketplaceCategory }>(
    '/marketplace/admin/categories',
    data,
  );
  return response.data;
};

export const updateMarketplaceCategory = async (
  id: string,
  data: UpdateCategoryPayload,
): Promise<{ success: boolean; category: MarketplaceCategory }> => {
  const response = await apiClient.put<{ success: boolean; category: MarketplaceCategory }>(
    `/marketplace/admin/categories/${id}`,
    data,
  );
  return response.data;
};

export const deleteMarketplaceCategory = async (id: string): Promise<{ success: boolean }> => {
  const response = await apiClient.delete<{ success: boolean }>(
    `/marketplace/admin/categories/${id}`,
  );
  return response.data;
};
