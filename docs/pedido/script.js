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

  // Save lead + order to Supabase (best-effort)
  try {
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

    // Minimal required checks
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
