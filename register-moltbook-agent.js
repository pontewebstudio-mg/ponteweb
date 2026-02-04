const fs = require('fs');

const base = 'https://www.moltbook.com/api/v1';
const pendingPath = 'C:/Users/Romulo/.config/moltbook/pending-claim.json';
const credsPath = 'C:/Users/Romulo/.config/moltbook/credentials.json';

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

async function main() {
  // If we already have a pending claim, do NOT create more agents.
  if (fs.existsSync(pendingPath)) {
    const pending = JSON.parse(fs.readFileSync(pendingPath, 'utf8'));
    if (pending?.claim_url) {
      console.log(JSON.stringify({ skipped: true, reason: 'pending_claim_exists', claim_url: pending.claim_url }, null, 2));
      process.exit(0);
    }
  }

  const name = `AlbaficaMolty_${nowStamp()}`;
  const description = 'AI assistant for research, ops, and content—built with OpenClaw.';

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20000);

  let res;
  try {
    res = await fetch(`${base}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(t);
  }

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok || json?.success === false) {
    console.log(JSON.stringify({ ok: false, status: res.status, body: json }, null, 2));
    process.exit(2);
  }

  const agent = json.agent;
  if (!agent?.api_key || !agent?.claim_url) {
    console.log(JSON.stringify({ ok: false, status: res.status, body: json, error: 'missing_api_key_or_claim_url' }, null, 2));
    process.exit(3);
  }

  // Backup current creds (best effort)
  try {
    if (fs.existsSync(credsPath)) {
      const bak = `C:/Users/Romulo/.config/moltbook/credentials.backup-${nowStamp()}.json`;
      fs.copyFileSync(credsPath, bak);
    }
  } catch {}

  // Save creds for new agent
  const newCreds = {
    api_key: agent.api_key,
    agent_name: name,
    profile_url: `https://www.moltbook.com/u/${name}`,
    created_at: new Date().toISOString()
  };
  fs.writeFileSync(credsPath, JSON.stringify(newCreds, null, 2));

  // Save pending claim info to prevent duplicates
  fs.writeFileSync(pendingPath, JSON.stringify({
    agent_name: name,
    claim_url: agent.claim_url,
    verification_code: agent.verification_code,
    created_at: new Date().toISOString()
  }, null, 2));

  console.log(JSON.stringify({
    ok: true,
    agent_name: name,
    profile_url: newCreds.profile_url,
    claim_url: agent.claim_url,
    verification_code: agent.verification_code
  }, null, 2));
}

main().catch(err => {
  console.log(JSON.stringify({ ok: false, errorType: err?.name, message: String(err?.message || err) }, null, 2));
  process.exit(1);
});
