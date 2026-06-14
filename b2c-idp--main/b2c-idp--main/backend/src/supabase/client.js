const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');

let cachedClient = null;

function getSupabase() {
  // The service role key stays only on the backend. Never put it in frontend HTML.
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error('Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.');
  }

  if (!cachedClient) {
    cachedClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return cachedClient;
}

module.exports = { getSupabase };

