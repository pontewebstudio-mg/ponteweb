const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
const { YoutubeTranscript } = require('youtube-transcript');

const parser = new Parser();

const STATE_PATH = path.join(__dirname, 'yt-study-state.json');
const KB_PATH = path.join(__dirname, 'yt-knowledge.json');
const KB_MAX_ITEMS = 300;

const CHANNELS = [
  { name: 'CRIPTOMANIACOS', handleUrl: 'https://www.youtube.com/@CRIPTOMANIACOS', channelId: 'UCqqFtNyN_ZWM8mfIOEfgShw' },
  { name: 'Augusto Backes', handleUrl: 'https://www.youtube.com/@AugustoBackes', channelId: 'UCNGqYuEd86K7dY70jE6dhKg' },
  { name: 'Rogério Menezes', handleUrl: 'https://www.youtube.com/@rogeriomenezesx', channelId: 'UCgZHUsIfZnqHPNg03vht7pg' },
  { name: 'Caio Vicentino', handleUrl: 'https://www.youtube.com/@caiovicentino', channelId: 'UCAy-gUVyWSWsPY61-18Z9Fw' },
  { name: 'Stormer', handleUrl: 'https://www.youtube.com/@StormerOficial', channelId: 'UCzIIAGs9UiniQgKtXsgFPnQ' },
  { name: 'Investidor 4.20', handleUrl: 'https://www.youtube.com/@investidor4.20', channelId: 'UCSc51HOmk6JpGkz8lR3bs2Q' },
  { name: 'Orlando on Crypto', handleUrl: 'https://www.youtube.com/@orlandooncrypto', channelId: 'UCbYEDy7bIknUPwpZdHDpPww' },
];

function extractVideoId(link) {
  try {
    const u = new URL(link);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) return u.searchParams.get('v');
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com') && u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2];
  } catch {}
  return null;
}

async function tryGetTranscriptText(videoId) {
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    const text = items.map(x => x.text).join(' ').replace(/\s+/g, ' ').trim();
    return text || null;
  } catch {
    return null;
  }
}

function splitSentences(text) {
  // simple sentence-ish split; good enough for PT/EN
  return text
    .split(/(?<=[\.!\?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function pickKeySentences(text, max = 5) {
  const sentences = splitSentences(text);
  // heuristic: prefer medium sentences, avoid very short
  const scored = sentences.map(s => {
    const len = s.length;
    let score = 0;
    if (len >= 60 && len <= 180) score += 2;
    if (len > 180 && len <= 260) score += 1;
    if (/\b(btc|bitcoin|eth|ethereum|suporte|resist[eê]ncia|romp|ciclo|juros|fed|cpi|domin[aâ]ncia|altcoin|liquida|macro|spot|etf)\b/i.test(s)) score += 2;
    return { s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const picked = [];
  for (const it of scored) {
    if (picked.length >= max) break;
    if (!picked.includes(it.s)) picked.push(it.s);
  }
  return picked;
}

function quickBulletsFromTranscript(text, max = 7) {
  // very light: use key sentences and truncate
  const ks = pickKeySentences(text, Math.min(max, 6));
  return ks.map(s => (s.length > 220 ? s.slice(0, 217) + '...' : s));
}

function loadJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function saveJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
}

function loadState() {
  return loadJson(STATE_PATH, { seen: {} });
}

function saveState(state) {
  saveJson(STATE_PATH, state);
}

function loadKnowledge() {
  return loadJson(KB_PATH, { version: 1, updatedAt: null, items: [] });
}

function saveKnowledge(kb) {
  kb.updatedAt = new Date().toISOString();
  // keep only last KB_MAX_ITEMS
  if (kb.items.length > KB_MAX_ITEMS) {
    kb.items = kb.items.slice(0, KB_MAX_ITEMS);
  }
  saveJson(KB_PATH, kb);
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return iso;
  }
}

async function main() {
  const state = loadState();
  const kb = loadKnowledge();
  const nowIso = new Date().toISOString();

  let totalNew = 0;
  const blocks = [];
  const newKnowledgeItems = [];

  for (const ch of CHANNELS) {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channelId}`;
    let feed;
    try {
      feed = await parser.parseURL(rssUrl);
    } catch (e) {
      blocks.push(`\n**${ch.name}** (${ch.handleUrl})\n- erro RSS: ${e?.message || e}`);
      continue;
    }

    const items = (feed.items || []).slice(0, 8).map(i => ({
      title: i.title,
      link: i.link,
      pubDate: i.isoDate || i.pubDate || null,
      id: i.id || i.guid || i.link,
    }));

    const seenSet = new Set(state.seen[ch.channelId] || []);
    const newItems = items.filter(i => !seenSet.has(i.id));
    totalNew += newItems.length;

    // mark latest items as seen (keep small)
    state.seen[ch.channelId] = items.map(i => i.id).slice(0, 20);

    // Build lightweight knowledge items for NEW videos (best-effort transcript)
    for (const it of newItems) {
      const vid = extractVideoId(it.link || '');
      if (!vid) continue;

      // avoid duplicate insert if already in kb
      if (kb.items.some(x => x.videoId === vid)) continue;

      const isShort = (it.link || '').includes('/shorts/');
      let transcriptText = null;
      let hasTranscript = false;
      let bullets = [];
      let keyQuotes = [];

      if (!isShort) {
        transcriptText = await tryGetTranscriptText(vid);
        hasTranscript = !!transcriptText;
        if (transcriptText) {
          bullets = quickBulletsFromTranscript(transcriptText, 6);
          keyQuotes = pickKeySentences(transcriptText, 4);
        }
      }

      newKnowledgeItems.push({
        videoId: vid,
        channelId: ch.channelId,
        channel: ch.name,
        title: it.title,
        url: it.link,
        publishedAt: it.pubDate,
        collectedAt: nowIso,
        isShort,
        hasTranscript,
        bullets,
        keyQuotes,
      });
    }

    const lines = [];
    lines.push(`\n**${ch.name}** — ${newItems.length} novo(s)`);
    if (newItems.length === 0) {
      const latest = items[0];
      if (latest) lines.push(`- último: ${latest.title} (${fmtDate(latest.pubDate)})`);
    } else {
      for (const it of newItems.slice(0, 3)) {
        const vid = extractVideoId(it.link || '');
        const kbItem = vid ? newKnowledgeItems.find(x => x.videoId === vid) : null;
        const tFlag = kbItem ? (kbItem.hasTranscript ? 'transcrição: OK' : (kbItem.isShort ? 'transcrição: (shorts)' : 'transcrição: indisponível')) : 'transcrição: ?';
        lines.push(`- ${it.title} (${fmtDate(it.pubDate)})\n  ${it.link}\n  ${tFlag}`);
      }
      if (newItems.length > 3) lines.push(`- (+${newItems.length - 3} outros)`);
    }

    // placeholder for 'ação'
    lines.push(`- ação sugerida: (eu preencho na análise do relatório)`);

    blocks.push(lines.join('\n'));
  }

  // Update knowledge base (prepend newest)
  if (newKnowledgeItems.length) {
    kb.items = [...newKnowledgeItems, ...kb.items];
    saveKnowledge(kb);
  } else {
    saveKnowledge(kb);
  }

  state.lastRunAt = nowIso;
  saveState(state);

  const header = `[CRIPTO/INVEST] Estudo YouTube (Sun/Wed 22:00 BRT)\nGerado: ${fmtDate(nowIso)}\nNovos uploads detectados: ${totalNew}\n`;
  const footer = `\n\nObs: eu guardo um “conhecimento compacto” (até ${KB_MAX_ITEMS} vídeos) pra eu conseguir te responder depois sem lotar o SSD.\nSe um vídeo não tiver transcrição pública, eu marco como indisponível.`;

  console.log(header + blocks.join('\n') + footer);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
