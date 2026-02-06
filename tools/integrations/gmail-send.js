const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { authorize } = require('./google-auth');

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

function b64urlFromBuffer(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function b64urlFromUtf8(str) {
  return b64urlFromBuffer(Buffer.from(str, 'utf8'));
}

function encodeHeaderValue(value) {
  // RFC 2047 (Q-encoding) for non-ASCII header values.
  // Keep ASCII as-is.
  const s = String(value ?? '');
  if (/^[\x00-\x7F]*$/.test(s)) return s;

  const b = Buffer.from(s, 'utf8');
  let out = '';
  for (const byte of b) {
    // safe chars in Q-encoding
    if (
      (byte >= 0x30 && byte <= 0x39) || // 0-9
      (byte >= 0x41 && byte <= 0x5a) || // A-Z
      (byte >= 0x61 && byte <= 0x7a) || // a-z
      byte === 0x21 || // !
      byte === 0x2a || // *
      byte === 0x2b || // +
      byte === 0x2d || // -
      byte === 0x2f // /
    ) {
      out += String.fromCharCode(byte);
    } else if (byte === 0x20) {
      out += '_';
    } else {
      out += '=' + byte.toString(16).toUpperCase().padStart(2, '0');
    }
  }

  return `=?UTF-8?Q?${out}?=`;
}

function buildRawEmailText({ from, to, subject, text }) {
  // Basic RFC 5322 message (UTF-8)
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeaderValue(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    '',
  ];
  return b64urlFromUtf8(lines.join('\r\n'));
}

function buildRawEmailWithAttachment({ from, to, subject, text, attachPath, attachName, attachType }) {
  const boundary = `oc_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const filename = attachName || path.basename(attachPath);
  const mimeType = attachType || 'application/octet-stream';
  const fileBytes = fs.readFileSync(attachPath);
  const fileB64 = Buffer.from(fileBytes).toString('base64');

  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeaderValue(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',

    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    '',

    `--${boundary}`,
    `Content-Type: ${mimeType}; name="${filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${filename}"`,
    '',
    fileB64,
    '',

    `--${boundary}--`,
    '',
  ];

  return b64urlFromUtf8(lines.join('\r\n'));
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
  let text = get('text') || '';

  // Allow passing newlines through CLI as literal "\\n" sequences (Windows/cmd-friendly).
  // This keeps dispatcher output unchanged (it already contains real newlines).
  if (text.includes('\\n')) {
    text = text.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
  }
  const attach = get('attach');
  const attachName = get('attach-name');
  const attachType = get('attach-type');
  const dryRun = args.includes('--dry-run');

  if (!from || !to) {
    console.error(
      'Usage: node gmail-send.js --from <email> --to <email> --subject <text> --text <text> [--attach <path> --attach-name <name> --attach-type <mime>] [--dry-run]'
    );
    process.exit(2);
  }

  const auth = await authorize(SCOPES);
  const gmail = google.gmail({ version: 'v1', auth });

  const raw = attach
    ? buildRawEmailWithAttachment({ from, to, subject, text, attachPath: attach, attachName, attachType })
    : buildRawEmailText({ from, to, subject, text });

  if (dryRun) {
    console.log('DRY_RUN: would send email');
    console.log(
      JSON.stringify(
        {
          from,
          to,
          subject,
          preview: text.slice(0, 200),
          attach: attach ? { path: attach, name: attachName || null, type: attachType || null } : null,
        },
        null,
        2
      )
    );
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
