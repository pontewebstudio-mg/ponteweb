// Supabase Edge Function: super-api
//
// Routes:
// - POST / (webhook): Mercado Pago webhook handler
// - POST /create-checkout : creates a Mercado Pago Checkout Preference with external_reference=order_id
//
// Env vars required:
// - MP_ACCESS_TOKEN
// - SUPABASE_URL
// - SB_SERVICE_ROLE_KEY
// Optional:
// - MP_WEBHOOK_SECRET (future use)
//
// Notes:
// - We keep Verify JWT OFF in Supabase for this function because Mercado Pago webhooks won't send Supabase auth headers.
// - create-checkout uses service role so it can read order details if needed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Json = Record<string, unknown>

function json(data: Json, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

function corsHeaders(origin: string | null) {
  const allowOrigin = origin ?? '*'
  return {
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
  }
}

function getEnv(name: string) {
  const v = Deno.env.get(name)
  if (!v) throw new Error('Missing env: ' + name)
  return v
}

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}

async function mpFetchJson(url: string, accessToken: string) {
  const res = await fetch(url, {
    headers: { Authorization: 'Bearer ' + accessToken },
  })
  const text = await res.text()
  let data: any = null
  try {
    data = JSON.parse(text)
  } catch {
    // ignore
  }
  return { ok: res.ok, status: res.status, data, text }
}

async function mpCreatePreference(accessToken: string, body: any) {
  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data: any = null
  try {
    data = JSON.parse(text)
  } catch {
    // ignore
  }
  return { ok: res.ok, status: res.status, data, text }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  try {
    const url = new URL(req.url)
    const pathname = url.pathname

    // Supabase function base path: /functions/v1/super-api
    // Anything after that is preserved in pathname.
    const isCreateCheckout = pathname.endsWith('/create-checkout')

    const accessToken = getEnv('MP_ACCESS_TOKEN')
    const supabaseUrl = getEnv('SUPABASE_URL')
    const serviceKey = getEnv('SB_SERVICE_ROLE_KEY')

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    if (isCreateCheckout) {
      if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405, cors)

      const bodyText = await req.text()
      let payload: any = {}
      try {
        payload = bodyText ? JSON.parse(bodyText) : {}
      } catch {
        // ignore
      }

      const orderId = String(payload?.order_id ?? '')
      const plan = String(payload?.plan ?? '')
      const price = Number(payload?.price ?? NaN)
      const email = payload?.email ? String(payload.email) : null

      if (!orderId || !isUuid(orderId)) return json({ ok: false, error: 'invalid order_id' }, 400, cors)
      if (!plan) return json({ ok: false, error: 'missing plan' }, 400, cors)
      if (!Number.isFinite(price) || price <= 0) return json({ ok: false, error: 'invalid price' }, 400, cors)

      // Optional: fetch order row to confirm it exists (and to prevent random spam)
      const { data: orderRow, error: orderErr } = await supabase
        .from('pw_orders')
        .select('id, name, email, phone, plan, payment')
        .eq('id', orderId)
        .maybeSingle()

      if (orderErr) return json({ ok: false, error: 'order lookup failed', details: orderErr.message }, 500, cors)
      if (!orderRow) return json({ ok: false, error: 'order not found' }, 404, cors)

      const title = `PonteWeb Studio — Plano ${plan}`

      const preferenceBody: any = {
        items: [
          {
            title,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: price,
          },
        ],
        external_reference: orderId,
        notification_url: `${supabaseUrl}/functions/v1/super-api`,
        back_urls: {
          success: 'https://pontewebstudio.com.br/obrigado-pagamento/',
          pending: 'https://pontewebstudio.com.br/obrigado-pagamento/',
          failure: 'https://pontewebstudio.com.br/pedido/',
        },
        auto_return: 'approved',
      }

      // Payer email helps Mercado Pago UX, if present.
      const payerEmail = email || (orderRow as any)?.email || null
      if (payerEmail) preferenceBody.payer = { email: payerEmail }

      const prefRes = await mpCreatePreference(accessToken, preferenceBody)
      if (!prefRes.ok || !prefRes.data) {
        return json(
          {
            ok: false,
            error: 'mp preference create failed',
            status: prefRes.status,
            body: prefRes.data ?? prefRes.text,
          },
          502,
          cors,
        )
      }

      const initPoint = prefRes.data.init_point || prefRes.data.sandbox_init_point
      const prefId = prefRes.data.id

      // Save reference on payment table as pending (best-effort)
      await supabase.from('pw_payments').insert({
        order_id: orderId,
        provider: 'mercadopago',
        provider_payment_id: String(prefId),
        status: 'created',
        raw: prefRes.data,
      })

      return json({ ok: true, order_id: orderId, preference_id: prefId, init_point: initPoint }, 200, cors)
    }

    // Default route: webhook handler
    if (req.method !== 'POST') return json({ ok: true }, 200)

    const bodyText = await req.text()
    let payload: any = {}
    try {
      payload = bodyText ? JSON.parse(bodyText) : {}
    } catch {
      // ignore
    }

    const id = payload?.data?.id ?? payload?.id ?? payload?.resource?.id ?? payload?.resource_id ?? null
    if (!id) return json({ ok: true, note: 'no id' }, 200)

    const pid = String(id)

    // 1) try as payment
    const paymentRes = await mpFetchJson(
      'https://api.mercadopago.com/v1/payments/' + encodeURIComponent(pid),
      accessToken,
    )

    let approved = false
    let externalRef: string | null = null

    if (paymentRes.ok && paymentRes.data) {
      approved = String(paymentRes.data.status || '') === 'approved'
      externalRef = paymentRes.data.external_reference ? String(paymentRes.data.external_reference) : null
    } else {
      // 2) fallback merchant_orders
      const orderRes = await mpFetchJson(
        'https://api.mercadopago.com/merchant_orders/' + encodeURIComponent(pid),
        accessToken,
      )
      if (orderRes.ok && orderRes.data) {
        const payments: any[] = Array.isArray(orderRes.data.payments) ? orderRes.data.payments : []
        approved = payments.some((p) => String(p.status) === 'approved')
        externalRef = orderRes.data.external_reference ? String(orderRes.data.external_reference) : null
      }
    }

    if (!externalRef || !isUuid(externalRef)) {
      // Still record that we saw the event
      await supabase.from('pw_payments').insert({
        order_id: null,
        provider: 'mercadopago',
        provider_payment_id: pid,
        status: approved ? 'approved' : 'pending',
        raw: payload,
      })
      return json({ ok: true, note: 'no valid external_reference' }, 200)
    }

    const orderId = externalRef

    await supabase.from('pw_payments').insert({
      order_id: orderId,
      provider: 'mercadopago',
      provider_payment_id: pid,
      status: approved ? 'approved' : 'pending',
      raw: paymentRes.data ?? payload,
    })

    if (approved) {
      const { error: jobErr } = await supabase.from('pw_contract_jobs').insert({
        order_id: orderId,
        payment_provider: 'mercadopago',
        payment_id: pid,
        status: 'pending',
      })
      if (jobErr && !String(jobErr.message || '').toLowerCase().includes('duplicate')) {
        return json({ ok: true, note: 'job insert error', err: jobErr.message }, 200)
      }
    }

    return json({ ok: true, approved, order_id: orderId }, 200)
  } catch (e) {
    return json({ ok: false, error: String((e as any)?.message || e) }, 200)
  }
})
