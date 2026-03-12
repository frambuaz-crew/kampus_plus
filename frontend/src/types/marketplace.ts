export interface MarketplaceCreator {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  university?: string;
  profile_picture_url?: string | null;
}

export interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  price: number | string;
  category?: string;
  condition?: string;
  university?: string;
  seller_id: string;
  seller_name?: string;
  image_urls?: string[] | string | null;
  created_at?: string;
  status?: string;
  creator?: MarketplaceCreator | null;
}
