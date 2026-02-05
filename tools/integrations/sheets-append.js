const { google } = require('googleapis');
const { authorize } = require('./google-auth');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      out[a.slice(2)] = argv[i + 1];
      i++;
    } else {
      out._.push(a);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const spreadsheetId = args.spreadsheetId;
  const sheetTitle = args.sheetTitle || 'YT Title+Thumb Plan';
  const jsonPath = args.json;

  if (!spreadsheetId || !jsonPath) {
    console.error('Usage: node sheets-append.js --spreadsheetId <id> --json <rows.json> [--sheetTitle <name>]');
    process.exit(2);
  }

  const rows = JSON.parse(require('fs').readFileSync(jsonPath, 'utf8'));
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error('JSON must be a non-empty array of row arrays');
    process.exit(2);
  }

  const auth = await authorize(SCOPES);
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetTitle}'!A:I`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });

  console.log(JSON.stringify({ ok: true, updates: res.data.updates }, null, 2));
}

main().catch((e) => {
  console.error(e?.response?.data || e);
  process.exit(1);
});
