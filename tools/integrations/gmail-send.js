const { google } = require('googleapis');
const { authorize } = require('./google-auth');

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

function b64url(input) {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function buildRawEmail({ from, to, subject, text }) {
  // Basic RFC 5322 message (UTF-8)
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    '',
  ];
  return b64url(lines.join('\r\n'));
}

async function main() {
  const args = process.argv.slice(2);
  const get = (k) => {
    const i = args.indexOf(`--${k}`);
    if (i === -1) return null;
    return args[i + 1] || '';
  };

  const from = get('from');
  const to = get('to');
  const subject = get('subject') || '(sem assunto)';
  const text = get('text') || '';
  const dryRun = args.includes('--dry-run');

  if (!from || !to) {
    console.error('Usage: node gmail-send.js --from <email> --to <email> --subject <text> --text <text> [--dry-run]');
    process.exit(2);
  }

  const auth = await authorize(SCOPES);
  const gmail = google.gmail({ version: 'v1', auth });

  const raw = buildRawEmail({ from, to, subject, text });

  if (dryRun) {
    console.log('DRY_RUN: would send email');
    console.log(JSON.stringify({ from, to, subject, preview: text.slice(0, 200) }, null, 2));
    return;
  }

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  console.log('SENT:', res.data.id);
}

main().catch((e) => {
  console.error('ERROR:', e?.response?.data || e);
  process.exit(1);
});
