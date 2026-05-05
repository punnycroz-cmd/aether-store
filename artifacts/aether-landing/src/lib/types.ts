export interface GalleryItem {
  request_id: string;
  realm?: 'day' | 'star';
  prompt?: string;
  model?: string;
  images?: { url?: string; r2_url?: string; thumbnail_url?: string; status?: string }[];
  result?: { image_urls?: string[] };
  first_thumbnail?: string;
  user_name?: string;
  user_picture?: string;
  user_uid?: string;
  created_at?: string;
  image_id_seq?: number;
}

export interface GalleryResponse {
  items: GalleryItem[];
  has_more: boolean;
  next_cursor: number | null;
}
