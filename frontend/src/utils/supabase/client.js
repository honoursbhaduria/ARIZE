import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  'https://phpmpjymtujvjevlogng.supabase.co';

const supabaseKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  'sb_publishable_1pz6dMTneFqL1eLr8jOI8g_dw34k1LT';

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );

export const supabase = createClient();
