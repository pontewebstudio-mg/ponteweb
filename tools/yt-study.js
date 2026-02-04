const Parser = require('rss-parser');
const { YoutubeTranscript } = require('youtube-transcript');

const parser = new Parser();

const CHANNELS = [
  { name: 'CRIPTOMANIACOS', url: 'https://www.youtube.com/@CRIPTOMANIACOS' },
  { name: 'AugustoBackes', url: 'https://www.youtube.com/@AugustoBackes' },
  { name: 'rogeriomenezesx', url: 'https://www.youtube.com/@rogeriomenezesx' },
  { name: 'caiovicentino', url: 'https://www.youtube.com/@caiovicentino' },
  { name: 'StormerOficial', url: 'https://www.youtube.com/@StormerOficial' },
  { name: 'investidor4.20', url: 'https://www.youtube.com/@investidor4.20' },
  { name: 'orlandooncrypto', url: 'https://www.youtube.com/@orlandooncrypto' },
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
    // RSS is not directly discoverable from handle without resolving channel id.
    // We keep this script as a template: user can replace rssUrl later.
    out.push({
      channel: ch.name,
      note: 'RSS feed URL not set yet. Replace with https://www.youtube.com/feeds/videos.xml?channel_id=...'
    });
  }

  console.log(JSON.stringify({ ok: true, channels: out }, null, 2));
  console.log('\nNext: provide channel_id for each channel to enable RSS + transcripts.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
