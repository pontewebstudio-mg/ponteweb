// PonteWeb Studio — Checkout V1
// This script currently:
// - collects lead + order data
// - redirects based on selected payment method
// Next step (when you send Mercado Pago links + Supabase anon key):
// - save to Supabase (orders table) before redirect

const ORDER_CONFIG = {
  // Supabase (public)
  // Project: openclaw-memory (sirflbkdqulxxnrfxmqy)
  supabaseUrl: "https://sirflbkdqulxxnrfxmqy.supabase.co",
  supabaseAnonKey: "sb_publishable_Fli6YW2y1vcWoTR_eXYIJw_c6asiVVd",

  // Email notifications (best-effort)
  // Using Formspree to email you the order details.
  // Note: this will go to the same inbox as the contact form unless you create a separate Formspree form.
  formspreeEndpoint: "https://formspree.io/f/xqedznak",

  mercadoPagoLinks: {
    // Links Mercado Pago (pagamento único)
    Starter: "https://mpago.la/1W7LTZa", // R$ 300
    Pro: "https://mpago.la/2Yg94M2",     // R$ 500
    Business: "https://mpago.la/29GDvpS", // R$ 700
  },
  mercadoPagoSubscriptionPlans: {
    // Planos de assinatura (Mercado Pago)
    "Social Essencial": "2dfbc5f86c57461cba11dfdce9a68cb9",
    "Social Premium": "0a96af3bece244b189383fdaac3dc751",
    "Tráfego Essencial": "39eb42b3a8be4e4b8075e552abe8dd5b",
    "Tráfego Pro": "ccd59cd34ac446cf81f15fd18aaf5904",
  },

  whatsappNumberE164: "5532985072741",
};

function waLink(text) {
  const base = `https://wa.me/${ORDER_CONFIG.whatsappNumberE164}`;
  return `${base}?text=${encodeURIComponent(text)}`;
}

function $(id) {
  return document.getElementById(id);
}

const form = $("orderForm");
const statusEl = $("status");

// Preselect plan from URL (?plan=Starter|Pro|Prime)
try {
  const params = new URLSearchParams(window.location.search);
  const planParam = (params.get("plan") || "").trim();
  if (planParam) {
    const planSelect = form.querySelector('select[name="plan"]');
    const allowed = ["Starter", "Pro", "Business", "Prime", "Social Essencial", "Social Premium", "Tráfego Essencial", "Tráfego Pro"]; 
    if (planSelect && allowed.includes(planParam)) {
      planSelect.value = planParam;
    }
  }
} catch (e) {
  // ignore
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "";

  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());

  const plan = String(data.plan || "");
  const payment = String(data.payment || "");

  // Minimal validation
  if (!plan || !payment) {
    statusEl.textContent = "Selecione plano e pagamento.";
    return;
  }

  const payload = {
    name: String(data.name || "").trim(),
    phone: String(data.phone || "").trim(),
    email: String(data.email || "").trim(),
    plan,
    payment,
    notes: String(data.notes || "").trim() || null,
    user_agent: navigator.userAgent,
    referer: document.referrer || null,
  };

  // Save lead + order to Supabase (best-effort)
  try {
    if (payload.name && payload.phone && payload.email) {
      const res = await fetch(`${ORDER_CONFIG.supabaseUrl}/rest/v1/pw_orders`, {
        method: "POST",
        headers: {
          apikey: ORDER_CONFIG.supabaseAnonKey,
          Authorization: `Bearer ${ORDER_CONFIG.supabaseAnonKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      });

      // If the table returns the inserted row, keep the id for linking payments/contracts.
      try {
        const rows = await res.json();
        const row = Array.isArray(rows) ? rows[0] : null;
        if (row && row.id) payload.order_id = row.id;
      } catch (e) {
        // ignore JSON parse failures (e.g., minimal returns)
      }
    }
  } catch (err) {
    // Don't block checkout on logging failure.
    // eslint-disable-next-line no-console
    console.warn("order save failed", err);
  }

  // Email you the order details via Formspree (best-effort)
  try {
    const subject = `Novo pedido — ${plan} (${payment})`;
    await fetch(ORDER_CONFIG.formspreeEndpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        _subject: subject,
        kind: "pedido",
        order_id: payload.order_id || null,
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        plan: payload.plan,
        payment: payload.payment,
        notes: payload.notes,
        referer: payload.referer,
        user_agent: payload.user_agent,
        page: window.location.href,
      }),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("order email failed", err);
  }

  if (payment === "link_mercadopago") {
    // Prime is negotiated case-by-case
    if (plan === "Prime") {
      window.location.href = waLink(
        `Olá! Quero fechar o plano Prime (negociável) e pagar por link (Mercado Pago).\n\nNome: ${data.name}\nWhatsApp: ${data.phone}\nEmail: ${data.email}\nResumo: ${data.notes || ""}`
      );
      return;
    }

    const subscriptionPlanId = ORDER_CONFIG.mercadoPagoSubscriptionPlans[plan];
    if (subscriptionPlanId) {
      if (!payload.order_id) {
        const url = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${subscriptionPlanId}`;
        window.open(url, "_blank", "noopener,noreferrer");
        statusEl.textContent = "Abrimos o pagamento em uma nova aba.";
        return;
      }

      try {
        statusEl.textContent = "Gerando assinatura...";

        const res = await fetch(`${ORDER_CONFIG.supabaseUrl}/functions/v1/super-api/create-preapproval`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: payload.order_id,
            plan,
            preapproval_plan_id: subscriptionPlanId,
            email: payload.email,
          }),
        });

        const out = await res.json();
        if (!res.ok || !out?.ok || !out?.init_point) {
          throw new Error(out?.error || `Falha ao criar assinatura (HTTP ${res.status})`);
        }

        window.open(out.init_point, "_blank", "noopener,noreferrer");
        statusEl.textContent = "Abrimos a assinatura em uma nova aba.";
        return;
      } catch (err) {
        console.warn("mp create-preapproval failed", err);
        const url = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${subscriptionPlanId}`;
        window.open(url, "_blank", "noopener,noreferrer");
        statusEl.textContent = "Abrimos o pagamento em uma nova aba.";
        return;
      }
    }

    // Pagamento único (checkout preference)
    const PLAN_PRICES = { Starter: 300, Pro: 500, Business: 700 };
    const price = PLAN_PRICES[plan];

    if (!payload.order_id) {
      const url = ORDER_CONFIG.mercadoPagoLinks[plan];
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        statusEl.textContent = "Abrimos o pagamento em uma nova aba.";
        return;
      }

      statusEl.textContent = "Não conseguimos registrar o pedido para vincular o pagamento. Vamos te atender via WhatsApp.";
      window.location.href = waLink(
        `Olá! Quero fechar o plano ${plan} e pagar por link (Mercado Pago).\n\nNome: ${data.name}\nWhatsApp: ${data.phone}\nEmail: ${data.email}\nResumo: ${data.notes || ""}`
      );
      return;
    }

    if (!price) {
      statusEl.textContent = "Valor do plano não configurado. Vamos te atender via WhatsApp.";
      window.location.href = waLink(
        `Olá! Quero fechar o plano ${plan} e pagar por link (Mercado Pago).\n\nNome: ${data.name}\nWhatsApp: ${data.phone}\nEmail: ${data.email}\nResumo: ${data.notes || ""}`
      );
      return;
    }

    try {
      statusEl.textContent = "Gerando link de pagamento...";

      const res = await fetch(`${ORDER_CONFIG.supabaseUrl}/functions/v1/super-api/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: payload.order_id,
          plan,
          price,
          email: payload.email,
        }),
      });

      const out = await res.json();
      if (!res.ok || !out?.ok || !out?.init_point) {
        throw new Error(out?.error || `Falha ao criar checkout (HTTP ${res.status})`);
      }

      window.open(out.init_point, "_blank", "noopener,noreferrer");
      statusEl.textContent = "Abrimos o pagamento em uma nova aba. Se preferir, volte aqui depois.";
      return;
    } catch (err) {
      console.warn("mp create-checkout failed", err);

      const url = ORDER_CONFIG.mercadoPagoLinks[plan];
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        statusEl.textContent = "Abrimos o pagamento em uma nova aba.";
        return;
      }

      statusEl.textContent = "Não foi possível gerar o link agora. Vamos te atender via WhatsApp.";
      window.location.href = waLink(
        `Olá! Quero fechar o plano ${plan} e pagar por link (Mercado Pago).\n\nNome: ${data.name}\nWhatsApp: ${data.phone}\nEmail: ${data.email}\nResumo: ${data.notes || ""}`
      );
      return;
    }
  }

  if (payment === "pix_direto") {
    window.location.href = waLink(
      `Olá! Quero fechar o plano ${plan} com Pix direto (5% OFF).\n\nNome: ${data.name}\nWhatsApp: ${data.phone}\nEmail: ${data.email}\nResumo: ${data.notes || ""}`
    );
    return;
  }

  if (payment === "transferencia") {
    window.location.href = waLink(
      `Olá! Quero fechar o plano ${plan} por transferência.\n\nNome: ${data.name}\nWhatsApp: ${data.phone}\nEmail: ${data.email}\nResumo: ${data.notes || ""}`
    );
    return;
  }

  if (payment === "cripto") {
    window.location.href = waLink(
      `Olá! Quero fechar o plano ${plan} via cripto (BTC/USDT/USDC).\n\nNome: ${data.name}\nWhatsApp: ${data.phone}\nEmail: ${data.email}\nResumo: ${data.notes || ""}\n\nPode me enviar o endereço da carteira e a rede correta?`
    );
    return;
  }

  // fallback
  window.location.href = waLink(
    `Olá! Quero fechar o plano ${plan}.\n\nNome: ${data.name}\nWhatsApp: ${data.phone}\nEmail: ${data.email}\nPagamento: ${payment}\nResumo: ${data.notes || ""}`
  );
});
