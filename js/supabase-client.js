// ============================================================
// Supabase connection config
// Actual credentials are now stored in js/config.js
// which is ignored by Git via .gitignore to keep them private.
// See js/config.example.js to set up a new environment.
// ============================================================

const url = typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "";
const anonKey = typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "";

if (!url || !anonKey || url === "https://qzntbroqpmhppbsernol.supabase.co" || anonKey === "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bnRicm9xcG1ocHBic2Vybm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMzU2MjYsImV4cCI6MjEwNTcxMTYyNn0.zYo6H1BENDWnuBssZAAIlRMhzZaXGrW-k1xIdZ50gfs") {
    console.error(
        "Supabase configuration missing or incomplete! Please ensure js/config.js is created with valid SUPABASE_URL and SUPABASE_ANON_KEY. Refer to js/config.example.js."
    );
}

const supabaseClient = window.supabase && url && anonKey
    ? window.supabase.createClient(url, anonKey)
    : null;
