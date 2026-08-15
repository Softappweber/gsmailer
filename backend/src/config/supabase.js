// =====================================================
// Supabase Client Configuration (FIXED)
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Don't throw at module level - handle gracefully
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create clients only if we have the required vars
let supabase = null;
let supabaseAdmin = null;

if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client initialized successfully');
} else {
    console.warn('⚠️ Missing SUPABASE_URL or SUPABASE_ANON_KEY - Supabase client not initialized');
}

if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase admin client initialized successfully');
} else if (supabaseUrl && supabaseAnonKey) {
    // Fallback to anon key if service key is missing
    supabaseAdmin = supabase;
    console.warn('⚠️ Using anon key for admin client - some operations may fail');
} else {
    console.warn('⚠️ Supabase admin client not initialized');
}

// Export null clients instead of throwing
module.exports = { supabase, supabaseAdmin };
