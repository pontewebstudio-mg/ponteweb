const { google } = require('googleapis');
const { authorize } = require('./google-auth');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1];
      args[k] = v;
      i++;
    } else {
      args._.push(a);
    }
  }
  return args;
}

async function ensureSheet(sheets, spreadsheetId, title) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = (meta.data.sheets || []).find(s => s.properties?.title === title);
  if (existing) return existing.properties.sheetId;

  const addRes = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }],
    },
  });

  const reply = addRes.data.replies?.[0]?.addSheet?.properties;
  return reply?.sheetId;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const spreadsheetId = args.spreadsheetId;
  const sheetTitle = args.sheetTitle || 'YT Title+Thumb Plan';

  if (!spreadsheetId) {
    console.error('Usage: node sheets-write.js --spreadsheetId <id> [--sheetTitle <name>]');
    process.exit(2);
  }

  const auth = await authorize(SCOPES);
  const sheets = google.sheets({ version: 'v4', auth });

  await ensureSheet(sheets, spreadsheetId, sheetTitle);

  const header = [[
    'Video (current title)',
    'Video URL',
    'Impressions (28d)',
    'CTR (28d)',
    'Views (28d)',
    'New title (proposal)',
    'Thumbnail text (2–4 words)',
    'Thumbnail prompt (image gen)',
    'Notes'
  ]];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetTitle}'!A1:I1`,
    valueInputOption: 'RAW',
    requestBody: { values: header },
  });

  console.log(JSON.stringify({ ok: true, spreadsheetId, sheetTitle }, null, 2));
}

main().catch((e) => {
  console.error(e?.response?.data || e);
  process.exit(1);
});
