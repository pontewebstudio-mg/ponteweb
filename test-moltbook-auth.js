const fs = require('fs');

const credsPath = 'C:/Users/Romulo/.config/moltbook/credentials.json';
const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
const apiKey = creds.api_key;

async function main() {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  const url = 'https://www.moltbook.com/api/v1/agents/me';

  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    const text = await res.text();
    const ms = Date.now() - started;

    let json;
    try { json = JSON.parse(text); } catch { json = null; }

    console.log(JSON.stringify({
      ok: res.ok,
      status: res.status,
      ms,
      bodyPreview: json ? {
        success: json.success,
        agent: json.agent ? { id: json.agent.id, name: json.agent.name, karma: json.agent.karma } : undefined,
        error: json.error,
        hint: json.hint
      } : (text.slice(0, 300) + (text.length > 300 ? '…' : ''))
    }, null, 2));

    process.exit(res.ok ? 0 : 2);
  } catch (err) {
    const ms = Date.now() - started;
    console.log(JSON.stringify({ ok: false, errorType: err?.name, message: String(err?.message || err), ms }, null, 2));
    process.exit(1);
  } finally {
    clearTimeout(t);
  }
}

main();
