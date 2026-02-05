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

  if (!spreadsheetId) {
    console.error('Usage: node sheets-fill-urls.js --spreadsheetId <id>');
    process.exit(2);
  }

  const mapping = {
    "Stop the Panic: This 12-Minute Prayer to Saint Joseph GUARANTEES Your Financial Deliverance TODAY!": "https://youtu.be/693lGVMMLI0",
    "STOP THE PAIN NOW: Urgent Deliverance Prayer Based on Psalm 34 (Angel Encamps!)": "https://youtu.be/GF11YdYANP8",
    "Stop the Chaos NOW: Powerful Prayer to SEAL Your Home Against Evil (Psalm 34:7)": "https://youtu.be/j38za_MJ_nw",
    "STOP Worrying! The Angelic Army is Guarding Your Bed Tonight (Psalm 34 Sleep Prayer)": "https://youtu.be/1fAGMaRwRbA",
    "STOP WORRYING! Mary Goes Before Me and RESOLVES EVERYTHING NOW": "https://youtu.be/wYZacavGvvs",
    "Breastplate of Righteousness: Urgent Prayer to SHIELD Your Finances & Conquer Fear": "https://youtu.be/Mz1OEP6iDPI",
    "Our Lady and St. Michael: Powerful Prayer to Deliver Your Home": "https://youtu.be/1HcaHHv63r4",
    "The Pain of Being Forgotten: Powerful Prayer for Chronic Illness | St. Marianne Cope": "https://youtu.be/MVzliiqfdzs",
    "Powerful Prayer Against Slander, Gossip, and Envy (Psalm 7)": "https://youtu.be/1AAUndRyS3Y",
    "STOP Panic Attacks NOW! The SECRET Protection Prayer of St. Michael & Mary": "https://youtu.be/DbZ-Ntx2VMo"
  };

  const auth = await authorize(SCOPES);
  const sheets = google.sheets({ version: 'v4', auth });

  const range = `'${sheetTitle}'!A:I`;
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const values = resp.data.values || [];

  // Find rows where A matches a mapping key, and B is blank.
  const updates = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r] || [];
    const title = (row[0] || '').trim();
    const url = (row[1] || '').trim();
    const mapped = mapping[title];
    if (mapped && !url) {
      // B column is index 1. Sheets rows are 1-indexed.
      const rowNum = r + 1;
      updates.push({ range: `'${sheetTitle}'!B${rowNum}:B${rowNum}`, values: [[mapped]] });
    }
  }

  if (!updates.length) {
    console.log(JSON.stringify({ ok: true, updated: 0 }, null, 2));
    return;
  }

  const res = await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: updates,
    },
  });

  console.log(JSON.stringify({ ok: true, updated: updates.length, totalUpdatedCells: res.data.totalUpdatedCells }, null, 2));
}

main().catch((e) => {
  console.error(e?.response?.data || e);
  process.exit(1);
});
