const Parser = require('rss-parser');
const { YoutubeTranscript } = require('youtube-transcript');

const parser = new Parser();

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
  } catch {}
  return null;
}

async function tryFetchTranscript(videoId) {
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    const text = items.map(x => x.text).join(' ');
    return text.length ? text.slice(0, 800) : null; // short preview
  } catch {
    return null;
  }
}

async function main() {
  const out = [];

  for (const ch of CHANNELS) {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channelId}`;
    let feed;
    try {
      feed = await parser.parseURL(rssUrl);
    } catch (e) {
      out.push({ channel: ch.name, rssUrl, error: `RSS parse failed: ${e?.message || e}` });
      continue;
    }

    const items = (feed.items || []).slice(0, 5).map(i => ({
      title: i.title,
      link: i.link,
      pubDate: i.pubDate || i.isoDate || null,
    }));

    // Try transcript preview for the most recent item
    let transcriptPreview = null;
    if (items[0]?.link) {
      const vid = extractVideoId(items[0].link);
      if (vid) transcriptPreview = await tryFetchTranscript(vid);
    }

    out.push({
      channel: ch.name,
      handleUrl: ch.handleUrl,
      rssUrl,
      latest: items,
      transcriptPreview,
    });
  }

  console.log(JSON.stringify({ ok: true, generatedAt: new Date().toISOString(), channels: out }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
