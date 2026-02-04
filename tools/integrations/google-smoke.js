const { google } = require('googleapis');
const { authorize } = require('./google-auth');

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar',
];

async function main() {
  const auth = await authorize(SCOPES);

  const sheets = google.sheets({ version: 'v4', auth });
  const calendar = google.calendar({ version: 'v3', auth });

  // Sheets: create a tiny spreadsheet
  const ss = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: 'OpenClaw Test Sheet' },
    },
  });

  // Calendar: list next 5 events
  const ev = await calendar.events.list({
    calendarId: 'primary',
    maxResults: 5,
    singleEvents: true,
    orderBy: 'startTime',
    timeMin: new Date().toISOString(),
  });

  console.log(JSON.stringify({
    ok: true,
    spreadsheetId: ss.data.spreadsheetId,
    spreadsheetUrl: ss.data.spreadsheetUrl,
    nextEvents: (ev.data.items || []).map(i => ({
      summary: i.summary,
      start: i.start?.dateTime || i.start?.date,
    })),
  }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
