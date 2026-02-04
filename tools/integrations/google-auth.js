const fs = require('fs');
const path = require('path');
const http = require('http');
const { google } = require('googleapis');

const CREDS_PATH = path.join(__dirname, 'google-oauth-client.json');
const TOKEN_PATH = path.join(__dirname, 'google-token.json');

function loadCredentials() {
  const raw = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
  // Downloaded JSON can be either {installed:{...}} or {web:{...}}
  const cfg = raw.installed || raw.web;
  if (!cfg) throw new Error('Invalid credentials JSON (expected installed/web)');
  return cfg;
}

function saveToken(token) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2), 'utf8');
}

function loadToken() {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  } catch {
    return null;
  }
}

async function authorize(scopes) {
  const cfg = loadCredentials();
  const redirectUri = (cfg.redirect_uris || [])[0] || 'http://localhost:8787/oauth2/callback';

  const oAuth2Client = new google.auth.OAuth2(cfg.client_id, cfg.client_secret, redirectUri);

  const token = loadToken();
  if (token) {
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });

  const authUrlPath = path.join(__dirname, 'google-last-auth-url.txt');
  fs.writeFileSync(authUrlPath, authUrl + '\n', 'utf8');

  console.log('Open this URL in your browser to authorize (copie a URL inteira, sem cortar):');
  console.log(authUrl);
  console.log(`(Saved to ${authUrlPath})`);

  // Local callback server
  const urlObj = new URL(redirectUri);
  const port = Number(urlObj.port) || 8787;
  const pathname = urlObj.pathname || '/oauth2/callback';

  await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (!req.url) return;
        const u = new URL(req.url, `http://localhost:${port}`);
        if (u.pathname !== pathname) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const code = u.searchParams.get('code');
        if (!code) {
          res.writeHead(400);
          res.end('Missing code');
          return;
        }
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        saveToken(tokens);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Authorized. You can close this tab.');
        server.close();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
    server.listen(port, () => {
      console.log(`Listening on ${redirectUri} ...`);
  console.log('Dica: se o CMD quebrar a linha, abra o arquivo google-last-auth-url.txt e copie de lá.');
    });
  });

  return oAuth2Client;
}

module.exports = { authorize, TOKEN_PATH };
