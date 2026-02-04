const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
const { YoutubeTranscript } = require('youtube-transcript');

const parser = new Parser();

const STATE_PATH = path.join(__dirname, 'yt-study-state.json');

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

async function tryTranscriptPreview(videoId) {
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    const text = items.map(x => x.text).join(' ');
    if (!text) return null;
    return text.slice(0, 500);
  } catch {
    return null;
  }
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return { seen: {} };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
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
  const nowIso = new Date().toISOString();

  let totalNew = 0;
  const blocks = [];

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

    // transcript preview only for newest NEW full video (not shorts), if available
    let transcriptPreview = null;
    const firstNew = newItems.find(i => i.link && i.link.includes('watch?v=')) || null;
    if (firstNew) {
      const vid = extractVideoId(firstNew.link);
      if (vid) transcriptPreview = await tryTranscriptPreview(vid);
    }

    const lines = [];
    lines.push(`\n**${ch.name}** — ${newItems.length} novo(s)`);
    if (newItems.length === 0) {
      // show latest title anyway
      const latest = items[0];
      if (latest) lines.push(`- último: ${latest.title} (${fmtDate(latest.pubDate)})`);
    } else {
      for (const it of newItems.slice(0, 3)) {
        lines.push(`- ${it.title} (${fmtDate(it.pubDate)})\n  ${it.link}`);
      }
      if (newItems.length > 3) lines.push(`- (+${newItems.length - 3} outros)`);
      if (transcriptPreview) lines.push(`- trecho (preview): ${transcriptPreview}`);
    }

    // placeholder for 'ação'
    lines.push(`- ação sugerida: (eu preencho na análise do relatório)`);

    blocks.push(lines.join('\n'));
  }

  state.lastRunAt = nowIso;
  saveState(state);

  const header = `[CRIPTO/INVEST] Estudo YouTube (Sun/Wed 22:00 BRT)\nGerado: ${fmtDate(nowIso)}\nNovos uploads detectados: ${totalNew}\n`;
  const footer = `\n\nSe quiser, eu evoluo isso pra: “o que mudou desde o último estudo + 1 ação prática por canal” (com resumo por tópicos).`;

  console.log(header + blocks.join('\n') + footer);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
