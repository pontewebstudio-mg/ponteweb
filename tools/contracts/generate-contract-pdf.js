#!/usr/bin/env node
/*
Generate a simple PDF contract using pdf-lib.

Usage:
  node tools/contracts/generate-contract-pdf.js \
    --plan Starter \
    --client-name "Fulano" --client-doc "123" --client-email "a@b.com" --client-phone "(11)" \
    --payment-method "Mercado Pago" --payment-date "2026-02-06" \
    --project "Landing para restaurante" \
    --out "./tmp/contrato.pdf"
*/

const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

function getArg(args, k) {
  const i = args.indexOf(`--${k}`);
  if (i === -1) return null;
  return args[i + 1] || '';
}

function required(v, name) {
  if (!v) {
    console.error(`Missing --${name}`);
    process.exit(2);
  }
  return v;
}

function wrapText(text, maxWidth, font, fontSize) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(test, fontSize);
    if (width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function main() {
  const args = process.argv.slice(2);

  const planKey = required(getArg(args, 'plan'), 'plan');
  const clientName = required(getArg(args, 'client-name'), 'client-name');
  const clientDoc = required(getArg(args, 'client-doc'), 'client-doc');
  const clientEmail = required(getArg(args, 'client-email'), 'client-email');
  const clientPhone = required(getArg(args, 'client-phone'), 'client-phone');
  const paymentMethod = required(getArg(args, 'payment-method'), 'payment-method');
  const paymentDate = required(getArg(args, 'payment-date'), 'payment-date');
  const project = required(getArg(args, 'project'), 'project');

  const outPath = required(getArg(args, 'out'), 'out');

  const providerName = getArg(args, 'provider-name') || 'PonteWeb Studio';
  const providerEmail = getArg(args, 'provider-email') || 'oprodutormusic@gmail.com';
  const providerPhone = getArg(args, 'provider-phone') || '(32) 98404-2502';

  const city = getArg(args, 'city') || 'Brasil (remoto)';
  const date = getArg(args, 'date') || new Date().toISOString().slice(0, 10);
  const foroCity = getArg(args, 'foro-city') || 'Juiz de Fora';
  const foroState = getArg(args, 'foro-state') || 'MG';

  const cfgPath = path.join(__dirname, 'plan-config.json');
  const planCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const plan = planCfg[planKey];
  if (!plan) {
    console.error(`Unknown plan: ${planKey}. Allowed: ${Object.keys(planCfg).join(', ')}`);
    process.exit(2);
  }

  const title = 'CONTRATO DE PRESTACAO DE SERVICOS DIGITAIS';

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Embed logo (PNG) if present
  let logo;
  const logoPath = path.join(process.cwd(), 'docs', 'assets', 'brand', 'ponteweb-avatar-512.png');
  if (fs.existsSync(logoPath)) {
    const pngBytes = fs.readFileSync(logoPath);
    logo = await pdfDoc.embedPng(pngBytes);
  }

  const margin = 48;
  const w = page.getWidth();
  const h = page.getHeight();
  let y = h - margin;

  // Header
  if (logo) {
    const logoW = 56;
    const logoH = 56;
    page.drawImage(logo, { x: margin, y: y - logoH, width: logoW, height: logoH });
    page.drawText('PonteWeb Studio', { x: margin + 70, y: y - 20, size: 18, font: fontBold, color: rgb(0.05, 0.12, 0.2) });
    page.drawText('Criacao de Sites e Landing Pages', { x: margin + 70, y: y - 40, size: 10, font, color: rgb(0.2, 0.25, 0.3) });
  } else {
    page.drawText('PonteWeb Studio', { x: margin, y: y - 20, size: 18, font: fontBold, color: rgb(0.05, 0.12, 0.2) });
  }

  y -= 80;

  page.drawText(title, { x: margin, y, size: 14, font: fontBold, color: rgb(0, 0, 0) });
  y -= 18;

  // Body blocks
  const blocks = [
    { label: 'CONTRATADA', value: `PonteWeb Studio, representada por ${providerName}. Email: ${providerEmail}. WhatsApp: ${providerPhone}.` },
    { label: 'CONTRATANTE', value: `${clientName}. CPF/CNPJ: ${clientDoc}. Email: ${clientEmail}. WhatsApp: ${clientPhone}.` },
    { label: 'PLANO / SERVICO', value: plan.plan_name },
    { label: 'PROJETO', value: project },
    { label: 'PAGAMENTO', value: `R$ ${plan.price_total} — ${paymentMethod} — ${paymentDate}` },
  ];

  const labelSize = 10;
  const textSize = 10;
  const maxWidth = w - margin * 2;

  for (const b of blocks) {
    page.drawText(`${b.label}:`, { x: margin, y, size: labelSize, font: fontBold, color: rgb(0, 0, 0) });
    y -= 14;
    const lines = wrapText(b.value, maxWidth, font, textSize);
    for (const line of lines) {
      page.drawText(line, { x: margin, y, size: textSize, font, color: rgb(0, 0, 0) });
      y -= 13;
    }
    y -= 8;
  }

  const clauses = [
    ['1. OBJETO', `Prestacao de servicos de desenvolvimento de ${plan.deliverable_type} (site/landing), incluindo design responsivo (mobile-first), implementacao de CTAs (ex.: WhatsApp) e SEO basico.`],
    ['2. PRAZO E ENTREGAS', `Entrega da primeira versao (V1) em ate ${plan.delivery_days} dias uteis apos confirmacao do pagamento e recebimento do material minimo.`],
    ['3. AJUSTES', `Inclusas ${plan.revision_rounds} rodada(s) de ajustes dentro do escopo contratado.`],
    ['4. PUBLICACAO / DOMINIO', 'Custos de dominio/hospedagem sao do CONTRATANTE, salvo contratacao expressa.'],
    ['5. AUTORIZACAO DE PORTFOLIO', 'O CONTRATANTE autoriza a CONTRATADA a exibir o site/landing (prints e link) em portfolio, redes sociais e apresentacoes comerciais.'],
    ['6. FORO', `Fica eleito o foro de ${foroCity}/${foroState}.`],
  ];

  for (const [head, body] of clauses) {
    if (y < 120) {
      // new page
      y = h - margin;
      const p2 = pdfDoc.addPage([595.28, 841.89]);
      // NOTE: keep writing on latest page
      // eslint-disable-next-line no-unused-vars
      break;
    }
    page.drawText(head, { x: margin, y, size: 11, font: fontBold, color: rgb(0, 0, 0) });
    y -= 14;
    const lines = wrapText(body, maxWidth, font, textSize);
    for (const line of lines) {
      page.drawText(line, { x: margin, y, size: textSize, font, color: rgb(0, 0, 0) });
      y -= 13;
    }
    y -= 8;
  }

  y -= 10;
  page.drawText(`Local e data: ${city}, ${date}`, { x: margin, y, size: 10, font, color: rgb(0, 0, 0) });
  y -= 30;
  page.drawText('CONTRATANTE: _______________________________', { x: margin, y, size: 10, font, color: rgb(0, 0, 0) });
  y -= 14;
  page.drawText(`${clientName} — ${clientDoc}`, { x: margin, y, size: 10, font, color: rgb(0, 0, 0) });
  y -= 24;
  page.drawText('CONTRATADA: _______________________________', { x: margin, y, size: 10, font, color: rgb(0, 0, 0) });
  y -= 14;
  page.drawText(`${providerName} — PonteWeb Studio`, { x: margin, y, size: 10, font, color: rgb(0, 0, 0) });

  const pdfBytes = await pdfDoc.save();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, pdfBytes);
  console.log('WROTE:', outPath);
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
