export interface MarketplaceCategory {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  order_index: number;
  is_active: boolean;
  listing_count: number;
}

export interface MarketplaceCategoriesResponse {
  categories: MarketplaceCategory[];
}

export interface CreateCategoryPayload {
  name: string;
  description?: string | null;
  icon?: string | null;
  order_index?: number;
  is_active?: boolean;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string | null;
  icon?: string | null;
  order_index?: number;
  is_active?: boolean;
}

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
  price: number | string;
  category_id?: string | null;
  category?: MarketplaceCategory | null;
  condition?: string;
  university?: string;
  seller_id: string;
  seller_name?: string;
  image_urls?: string[] | string | null;
  status?: string;
  view_count?: number;
  message_count?: number;
  creator?: MarketplaceCreator | null;
  created_at?: string;
}
