// =====================================================
// Supabase Client Configuration
// =====================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Debug logging
console.log('Supabase URL available:', !!supabaseUrl);
console.log('Supabase Anon Key available:', !!supabaseAnonKey);
console.log('Supabase Service Key available:', !!supabaseServiceKey);

// Client for frontend API (uses anon key)
let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client initialized');
} else {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
}

// Admin client for backend operations (uses service role)
let supabaseAdmin = null;

if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase admin client initialized');
} else if (supabaseUrl && supabaseAnonKey) {
    supabaseAdmin = supabase;
    console.log('⚠️ Using anon key for admin client');
}

module.exports = { supabase, supabaseAdmin };
