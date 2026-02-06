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
    // Links Mercado Pago (enviados pelo Rômulo)
    Starter: "https://mpago.la/2Yg94M2", // R$ 500
    Pro: "https://mpago.la/29GDvpS",      // R$ 700
    Prime: "",                            // negociado no WhatsApp
  },

  whatsappNumberE164: "5532984042502",
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
    const allowed = ["Starter", "Pro", "Prime"]; 
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
      await fetch(`${ORDER_CONFIG.supabaseUrl}/rest/v1/pw_orders`, {
        method: "POST",
        headers: {
          apikey: ORDER_CONFIG.supabaseAnonKey,
          Authorization: `Bearer ${ORDER_CONFIG.supabaseAnonKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      });
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

    const url = ORDER_CONFIG.mercadoPagoLinks[plan];
    if (!url) {
      statusEl.textContent = "Link de pagamento ainda não configurado para este plano. Vamos te atender via WhatsApp.";
      window.location.href = waLink(
        `Olá! Quero fechar o plano ${plan} e pagar por link (Mercado Pago).\n\nNome: ${data.name}\nWhatsApp: ${data.phone}\nEmail: ${data.email}\nResumo: ${data.notes || ""}`
      );
      return;
    }
    window.location.href = url;
    return;
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
