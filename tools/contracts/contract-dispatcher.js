#!/usr/bin/env node
/*
Poll Supabase for pending pw_contract_jobs, generate PDF, email client + provider, mark sent.

Env (tools/integrations/.env):
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  PROVIDER_NAME
  PROVIDER_EMAIL
  PROVIDER_PHONE
  GMAIL_FROM (optional; defaults to PROVIDER_EMAIL)

Usage:
  node tools/contracts/contract-dispatcher.js --limit 5
*/

const path = require('path');
const fs = require('fs');

function loadDotEnv(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      // Remove surrounding quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = val;
    }
  } catch {
    // ignore missing .env
  }
}

loadDotEnv(path.join(__dirname, '..', 'integrations', '.env'));

const { createClient } = require('@supabase/supabase-js');
const { execFileSync } = require('child_process');

function getArg(args, k, def) {
  const i = args.indexOf(`--${k}`);
  if (i === -1) return def;
  return args[i + 1] || def;
}

function must(envKey) {
  const v = process.env[envKey];
  if (!v) throw new Error(`Missing env: ${envKey}`);
  return v;
}

async function main() {
  const args = process.argv.slice(2);
  const limit = Number(getArg(args, 'limit', '5'));

  const supabaseUrl = must('SUPABASE_URL');
  const serviceKey = must('SUPABASE_SERVICE_ROLE_KEY');

  const providerName = process.env.PROVIDER_NAME || 'PonteWeb Studio';
  const providerCnpj = '64.990.841/0001-76';

  const providerEmail = process.env.PROVIDER_EMAIL || 'oprodutormusic@gmail.com';
  const providerPhone = process.env.PROVIDER_PHONE || '(32) 98507-2741';

 const providerCnpj = '64.990.841/0001-76';
  const gmailFrom = process.env.GMAIL_FROM || providerEmail;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: jobs, error } = await supabase
    .from('pw_contract_jobs')
    .select('id, order_id, payment_provider, payment_id, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  if (!jobs || jobs.length === 0) {
    console.log('NO_JOBS');
    return;
  }

  for (const job of jobs) {
    try {
      const { data: order, error: oErr } = await supabase
        .from('pw_orders')
        .select('id, name, email, phone, plan, payment, notes, created_at')
        .eq('id', job.order_id)
        .single();
      if (oErr) throw oErr;

      const outPath = path.join(process.cwd(), 'tmp', `contrato-${order.id}.pdf`);
      const paymentDate = new Date().toISOString().slice(0, 10);

      execFileSync(
        process.execPath,
        [
          path.join('tools', 'contracts', 'generate-contract-pdf.js'),
          '--plan',
          String(order.plan || 'Starter'),
          '--client-name',
          String(order.name || ''),
          '--client-doc',
          String(order.doc || '---'),
          '--client-email',
          String(order.email || ''),
          '--client-phone',
          String(order.phone || ''),
          '--payment-method',
          String(job.payment_provider || order.payment || ''),
          '--payment-date',
          paymentDate,
          '--project',
          String(order.notes || 'Site / Landing Page'),
          '--out',
          outPath,
          '--provider-name',
          providerName,
          '--provider-email',
          providerEmail,
          '--provider-phone',
          providerPhone,
        ],
        { stdio: 'inherit' }
      );

      if (!fs.existsSync(outPath)) throw new Error('PDF not created');

      // Avoid fancy unicode in Subject to prevent mojibake on some clients.
      const subject = `Contrato PonteWeb Studio - ${order.plan} - Pedido ${String(order.id).slice(0, 8)}`;
      const text =
        `Olá, ${order.name}!\n` +
        `\n` +
        `Conforme combinado, segue em anexo o contrato referente ao seu pedido (${order.plan}).\n` +
        `Valor do plano: R$ ${String(plan.price_total || '—')}\n` +
        `\n` +
        `Para dar andamento, basta confirmar por resposta neste e-mail (ou no WhatsApp) e enviar o material mínimo do projeto.\n` +
        `\n` +
        `Fico à disposição para qualquer dúvida.\n` +
        `\n` +
        `Atenciosamente,\n` +
        `PonteWeb Studio\n` +
        `${providerEmail} | ${providerPhone}`;

      // Send to client
      execFileSync(
        process.execPath,
        [
          path.join('tools', 'integrations', 'gmail-send.js'),
          '--from',
          gmailFrom,
          '--to',
          order.email,
          '--subject',
          subject,
          '--text',
          text,
          '--attach',
          outPath,
          '--attach-name',
          'contrato-ponteweb.pdf',
          '--attach-type',
          'application/pdf',
        ],
        { stdio: 'inherit' }
      );

      // Send copy to provider
      execFileSync(
        process.execPath,
        [
          path.join('tools', 'integrations', 'gmail-send.js'),
          '--from',
          gmailFrom,
          '--to',
          providerEmail,
          '--subject',
          `[COPIA] ${subject}`,
          '--text',
          `Cópia do contrato enviado para ${order.email}.\n` +
            `Pedido: ${order.id}\n` +
            `Plano: ${order.plan}\n` +
            `Valor: R$ ${String(plan.price_total || '—')}\n` +
            `Pagamento: ${job.payment_provider} (${job.payment_id || '—'})`,

          '--attach',
          outPath,
          '--attach-name',
          `contrato-${String(order.id).slice(0, 8)}.pdf`,
          '--attach-type',
          'application/pdf',
        ],
        { stdio: 'inherit' }
      );

      const { error: uErr } = await supabase
        .from('pw_contract_jobs')
        .update({ status: 'sent', sent_at: new Date().toISOString(), error: null })
        .eq('id', job.id);
      if (uErr) throw uErr;

      console.log('SENT_JOB', job.id);
    } catch (e) {
      const msg = e?.message || String(e);
      console.error('JOB_ERROR', job.id, msg);
      await supabase
        .from('pw_contract_jobs')
        .update({ status: 'error', error: msg })
        .eq('id', job.id);
    }
  }
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
