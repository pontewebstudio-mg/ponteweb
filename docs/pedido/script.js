// PonteWeb Studio — Checkout V1
// This script currently:
// - collects lead + order data
// - redirects based on selected payment method
// Next step (when you send Mercado Pago links + Supabase anon key):
// - save to Supabase (orders table) before redirect

const ORDER_CONFIG = {
  // TODO (Romulo): paste your Mercado Pago links per plan.
  mercadoPagoLinks: {
    Starter: "",
    Pro: "",
    Prime: "",
  },
  // TODO (Romulo): set your WhatsApp number for Pix direct / transfer / crypto.
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

  // TODO: save to Supabase here

  if (payment === "link_mercadopago") {
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
