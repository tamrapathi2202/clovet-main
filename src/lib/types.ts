export type Profile = {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    default_tryon_image: string | null;
    style_preferences: Record<string, unknown>;
    onboarding_completed: boolean;
    created_at: string;
    updated_at: string;
};

export type WardrobeItem = {
    id: string;
    user_id: string;
    name: string;
    category: string;
    color: string | null;
    season: string[] | null;
    occasion: string[] | null;
    brand: string | null;
    image_url: string;
    source_url: string | null;
    purchase_price: number | null;
    purchase_date: string | null;
    wear_count: number;
    ai_tags: Record<string, unknown>;
    created_at: string;
};

export type FavoriteItem = {
    id: string;
    user_id: string;
    item_name: string;
    platform: string;
    external_id: string;
    image_url: string;
    price: number;
    currency: string;
    seller: string | null;
    url: string;
    metadata: Record<string, unknown>;
    created_at: string;
};

export type StyleBundle = {
    id: string;
    user_id: string;
    name: string;
    item_ids: string[];
    suggested_additions: unknown[];
    style_tags: string[] | null;
    created_at: string;
};

export type TryOnResult = {
    id: string;
    user_id: string;
    item_id: string;
    item_name: string;
    item_image_url: string;
    user_image_url: string;
    result_image_url: string;
    platform: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
};
