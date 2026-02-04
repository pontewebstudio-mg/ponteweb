// Minimal Supabase-backed memory store
// Loads env from tools/integrations/.env (not committed)

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnvFile(p) {
  const out = {};
  const txt = fs.readFileSync(p, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx === -1) continue;
    const k = t.slice(0, idx).trim();
    const v = t.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

const envPath = path.join(__dirname, '.env');
const env = fs.existsSync(envPath) ? loadEnvFile(envPath) : process.env;

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing SUPABASE_URL / SUPABASE_KEY (set tools/integrations/.env)');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function upsertYtKnowledge(item) {
  // item: { videoId, channelId, channel, title, url, publishedAt, collectedAt, bullets, keyQuotes }
  return supabase
    .from('yt_knowledge')
    .upsert({
      video_id: item.videoId,
      channel_id: item.channelId,
      channel: item.channel,
      title: item.title,
      url: item.url,
      published_at: item.publishedAt,
      collected_at: item.collectedAt,
      bullets: item.bullets || [],
      key_quotes: item.keyQuotes || [],
    });
}

async function searchYtKnowledge(q, limit = 10) {
  // Simple ilike search across title + bullets; for more, add pg_trgm / full text.
  return supabase
    .from('yt_knowledge')
    .select('*')
    .or(`title.ilike.%${q}%,channel.ilike.%${q}%`)
    .order('published_at', { ascending: false })
    .limit(limit);
}

module.exports = { supabase, upsertYtKnowledge, searchYtKnowledge };
