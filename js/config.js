// =============================================
// SUPABASE CONFIGURATION
// Kendi bilgilerinizle değiştirin
// =============================================
const SUPABASE_URL = "https://tujpwprfspoyewbwjoyp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bH_gzp0Zu8AlX_aF7KFaHw_ESO53uUW";

// =============================================
// ADMIN ŞİFRESİ (basit koruma)
// =============================================
const ADMIN_PASSWORD = "admin123";

// =============================================
// Supabase client — global olarak db adıyla
// =============================================
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================================
// SQL SCHEMA (Supabase SQL Editor'da çalıştırın)
// =============================================
/*
CREATE TABLE tracks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  artist      TEXT NOT NULL,
  lyrics      TEXT,
  file_url    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Storage bucket: "music" (public)
*/
