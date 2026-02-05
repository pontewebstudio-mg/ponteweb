const { google } = require('googleapis');
const { authorize } = require('./google-auth');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      out[a.slice(2)] = argv[i + 1];
      i++;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const spreadsheetId = args.spreadsheetId;
  const sheetTitle = args.sheetTitle || 'YT Title+Thumb Plan';
  const keyCol = (args.keyCol || 'B').toUpperCase(); // default: Video URL column

  if (!spreadsheetId) {
    console.error('Usage: node sheets-dedupe.js --spreadsheetId <id> [--sheetTitle <name>] [--keyCol B]');
    process.exit(2);
  }

  const auth = await authorize(SCOPES);
  const sheets = google.sheets({ version: 'v4', auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = (meta.data.sheets || []).find(s => s.properties?.title === sheetTitle);
  if (!sheet) throw new Error(`Sheet not found: ${sheetTitle}`);
  const sheetId = sheet.properties.sheetId;

  const range = `'${sheetTitle}'!A:I`;
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const values = resp.data.values || [];
  if (values.length <= 1) {
    console.log(JSON.stringify({ ok: true, removed: 0, reason: 'no data' }, null, 2));
    return;
  }

  const header = values[0];
  const keyIndex = (keyCol.charCodeAt(0) - 'A'.charCodeAt(0));

  const seen = new Map();
  const toDelete = []; // 0-based row indexes in sheet (not including header?) actually includes header

  for (let r = 1; r < values.length; r++) {
    const row = values[r] || [];
    const key = (row[keyIndex] || '').trim();
    if (!key) continue;
    if (seen.has(key)) {
      toDelete.push(r);
    } else {
      seen.set(key, r);
    }
  }

  // Delete from bottom to top to keep indexes valid
  toDelete.sort((a, b) => b - a);

  const requests = toDelete.map(r => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex: r, // inclusive
        endIndex: r + 1, // exclusive
      },
    },
  }));

  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  console.log(JSON.stringify({ ok: true, removed: requests.length, deletedRows: toDelete }, null, 2));
}

main().catch((e) => {
  console.error(e?.response?.data || e);
  process.exit(1);
});
