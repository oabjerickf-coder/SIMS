// ============================================================
// Supabase connection config
// ============================================================
const SUPABASE_URL = "https://qzntbroqpmhppbsernol.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bnRicm9xcG1ocHBic2Vybm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMzU2MjYsImV4cCI6MjEwNTcxMTYyNn0.zYo6H1BENDWnuBssZAAIlRMhzZaXGrW-k1xIdZ50gfs";

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
