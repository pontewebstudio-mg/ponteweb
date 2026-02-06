/*
  Build portfolio demos for PonteWeb Studio site.

  - Reads inbound HTML .txt files and writes to docs/demos/<slug>/index.html
  - Injects a fixed "Voltar para o site" button (same tab)
  - Fixes empty WhatsApp links (https://wa.me/) to PonteWeb number
  - Generates simple SVG covers in docs/assets/demo-covers/<slug>.svg

  Usage (Windows cmd):
    node tools\\build-portfolio-demos.js
*/

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INBOUND = path.resolve('C:/Users/Romulo/.openclaw/media/inbound');

const WHATSAPP_NUMBER = '5532985072741';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

const DEMOS = [
  {
    slug: 'iron-pulse-gym',
    title: 'Iron Pulse',
    meta: 'Landing page premium (academia) com prova social e CTA.',
    inbound: 'file_82---98c8e39c-e88f-4af2-be41-ee6bcbe89cdf.txt',
  },
  {
    slug: 'virtuoso-music-academy',
    title: 'Virtuoso Music Academy',
    meta: 'Landing page premium (aulas de música) com seções completas.',
    inbound: 'file_83---626bd878-b416-471b-94ce-a9eb4987ade7.txt',
  },
  {
    slug: 'dr-ricardo-bastos-advocacia',
    title: 'Dr. Ricardo Bastos',
    meta: 'Landing page premium (advocacia) com credibilidade e CTA.',
    inbound: 'file_84---c13505e7-5ab9-4294-88fa-a0fc3cd7acbf.txt',
  },
  {
    slug: 'buddy-co-pet-spa',
    title: 'Buddy & Co',
    meta: 'Landing page premium (pet spa/banho e tosa) com serviços.',
    inbound: 'file_85---f6feed45-ddcf-4540-94a2-774d2b391128.txt',
  },
  {
    slug: 'golden-crust-bakery',
    title: 'Golden Crust',
    meta: 'Landing page premium (padaria) com cardápio e CTA.',
    inbound: 'file_86---1867ade7-41ef-450c-b177-64972ae88bbb.txt',
  },
  {
    slug: 'luminosite-odontologia',
    title: 'Luminosité',
    meta: 'Landing page premium (odontologia) com estética clean.',
    inbound: 'file_87---dc994dcc-3848-4299-9a3c-b8a387f5b36b.txt',
  },
  {
    slug: 'o-alquimista-bar',
    title: 'O Alquimista',
    meta: 'Landing page premium (bar/cocktails) com atmosfera.',
    inbound: 'file_89---22d927c0-bf45-4d66-8577-adc9b3fdb1e4.txt',
  },
  {
    slug: 'sabor-e-brasa',
    title: 'Sabor & Brasa',
    meta: 'Landing page premium (restaurante) com menu e reservas.',
    inbound: 'file_90---d4357b75-f776-4227-9fc1-99adee28abfc.txt',
  },
  {
    slug: 'aquarela-do-saber',
    title: 'Aquarela do Saber',
    meta: 'Landing page premium (escola) com proposta pedagógica.',
    inbound: 'file_91---2bf24e4a-2bc3-41e3-ad55-e91ec7dd6184.txt',
  },
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function injectBackButton(html) {
  const css = `\n<style>\n  .pwBackToSite{\n    position:fixed;\n    left:16px;\n    top:16px;\n    z-index:99999;\n    display:inline-flex;\n    align-items:center;\n    gap:10px;\n    padding:10px 12px;\n    border-radius:999px;\n    background:rgba(10,12,20,.72);\n    color:#fff;\n    text-decoration:none;\n    border:1px solid rgba(255,255,255,.16);\n    backdrop-filter: blur(10px);\n    -webkit-backdrop-filter: blur(10px);\n    box-shadow: 0 10px 26px rgba(0,0,0,.35);\n    font: 600 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;\n  }\n  .pwBackToSite:hover{\n    transform: translateY(-1px);\n  }\n  .pwBackToSite:focus{\n    outline:2px solid rgba(124, 58, 237, .55);\n    outline-offset:2px;\n  }\n  @media (max-width: 520px){\n    .pwBackToSite{left:12px;top:12px;padding:9px 11px;font-size:13px}\n  }\n</style>\n`;

  const button = `\n<a class="pwBackToSite" href="/#portfolio" aria-label="Voltar para o site">← Voltar para o site</a>\n`;

  // Inject CSS before </head> if possible, otherwise prepend.
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${css}</head>`);
  } else {
    html = css + html;
  }

  // Inject button right after <body ...>
  const bodyOpenMatch = html.match(/<body[^>]*>/i);
  if (bodyOpenMatch) {
    const bodyOpen = bodyOpenMatch[0];
    html = html.replace(bodyOpen, `${bodyOpen}${button}`);
  } else {
    html = button + html;
  }

  return html;
}

function fixWhatsAppLinks(html) {
  // Normalize all WhatsApp links inside demos to PonteWeb number.
  // Covers:
  //  - https://wa.me/
  //  - https://wa.me/5511999999999
  //  - href="wa.me/..." (no protocol)

  // Replace empty placeholder (no number after slash).
  html = html.replace(/https:\/\/wa\.me\/(?!\d)/g, `${WHATSAPP_URL}`);

  // Replace any number to our number.
  html = html.replace(/https:\/\/wa\.me\/[0-9]{8,15}/g, `${WHATSAPP_URL}`);

  // Also fix href="wa.me/..." (no protocol).
  html = html.replace(/href=("|')wa\.me\/[0-9]{0,15}(\1)/g, `href=$1${WHATSAPP_URL}$1`);

  return html;
}

function makeCoverSvg({ title, subtitle }) {
  const safeTitle = String(title).replace(/[<>]/g, '');
  const safeSub = String(subtitle || '').replace(/[<>]/g, '');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1224"/>
      <stop offset="0.5" stop-color="#151a36"/>
      <stop offset="1" stop-color="#2a145f"/>
    </linearGradient>
    <radialGradient id="r" cx="30%" cy="35%" r="70%">
      <stop offset="0" stop-color="#22d3ee" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="r2" cx="75%" cy="65%" r="75%">
      <stop offset="0" stop-color="#a78bfa" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>

  <rect width="1600" height="900" fill="url(#g)"/>
  <circle cx="460" cy="300" r="340" fill="url(#r)" filter="url(#soft)"/>
  <circle cx="1180" cy="620" r="380" fill="url(#r2)" filter="url(#soft)"/>

  <g transform="translate(96 92)">
    <text x="0" y="0" fill="#e9eefc" font-size="64" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-weight="800">${safeTitle}</text>
    <text x="0" y="74" fill="#b9c2e6" font-size="32" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-weight="600">${safeSub}</text>

    <g transform="translate(0 682)">
      <rect x="0" y="0" width="290" height="56" rx="28" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.18)"/>
      <text x="26" y="38" fill="#e9eefc" font-size="24" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-weight="700">Demo • PonteWeb</text>
    </g>
  </g>
</svg>
`;
}

function main() {
  const outCoversDir = path.join(ROOT, 'docs', 'assets', 'demo-covers');
  ensureDir(outCoversDir);

  for (const d of DEMOS) {
    const inPath = path.join(INBOUND, d.inbound);
    if (!fs.existsSync(inPath)) {
      throw new Error(`Inbound file not found: ${inPath}`);
    }

    let html = fs.readFileSync(inPath, 'utf8');
    html = fixWhatsAppLinks(html);
    html = injectBackButton(html);

    const outDir = path.join(ROOT, 'docs', 'demos', d.slug);
    ensureDir(outDir);

    const outPath = path.join(outDir, 'index.html');
    fs.writeFileSync(outPath, html, 'utf8');

    const coverSvg = makeCoverSvg({ title: d.title, subtitle: 'PonteWeb Studio' });
    fs.writeFileSync(path.join(outCoversDir, `${d.slug}.svg`), coverSvg, 'utf8');

    process.stdout.write(`OK demo: ${d.slug}\n`);
  }

  process.stdout.write(`\nCovers: docs/assets/demo-covers/*.svg\n`);
}

main();
