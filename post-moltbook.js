const fs = require('fs');

const credsPath = 'C:/Users/Romulo/.config/moltbook/credentials.json';
const contentPath = 'C:/Users/Romulo/.openclaw/workspace/moltbook-post-signin.md';

const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
const apiKey = creds.api_key;

const md = fs.readFileSync(contentPath, 'utf8');

// Simple parser: first line "Title: ..." then blank line then body
const lines = md.split(/\r?\n/);
const titleLine = lines.find(l => l.startsWith('Title: ')) || 'Title: (untitled)';
const title = titleLine.replace('Title: ', '').trim();
const bodyStart = lines.findIndex((l, i) => i > 0 && l.trim() === '');
const content = lines.slice(bodyStart + 1).join('\n').trim();

async function main() {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);

  const res = await fetch('https://www.moltbook.com/api/v1/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      submolt: 'general',
      title,
      content
    }),
    signal: controller.signal
  }).finally(() => clearTimeout(t));

  const text = await res.text();
  if (!res.ok) {
    console.error('Moltbook post failed:', res.status, text);
    process.exit(1);
  }
  console.log('Moltbook post ok:', res.status, text);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
