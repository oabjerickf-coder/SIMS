// ============================================================
// Supabase client initialization
// The actual credentials are read from js/config.js (window.SUPABASE_URL)
// which is ignored by Git (.gitignore) to keep keys secure.
// ============================================================

const SUPABASE_URL = (typeof window !== "undefined" && window.SUPABASE_URL)
  ? window.SUPABASE_URL
  : (typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "");

const SUPABASE_ANON_KEY = (typeof window !== "undefined" && window.SUPABASE_ANON_KEY)
  ? window.SUPABASE_ANON_KEY
  : (typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "");

if (!window.supabase) {
  console.error("Supabase library not loaded! Check CDN or network connection.");
} else if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === "YOUR_SUPABASE_PROJECT_URL") {
  console.error("Supabase config missing or invalid! Ensure js/config.js has valid SUPABASE_URL and SUPABASE_ANON_KEY.");
}

const supabaseClient = (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL")
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
