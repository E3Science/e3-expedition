import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://fmzbnbzfzbchrtbxhobk.supabase.co",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_ErkYd9OQxmrRxKW_xjFZXQ_vGh_xap3",
  {
    auth: {
      // Keep multiplayer test accounts isolated when two players use
      // separate tabs on the same computer and localhost origin.
      storage: window.sessionStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
