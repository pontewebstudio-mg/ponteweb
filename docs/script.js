function $(sel){ return document.querySelector(sel); }

function toggleMenu(){
  const m = $('#menuMobile');
  const icon = $('#menuIcon');
  const isHidden = m.hasAttribute('hidden');
  if (isHidden) {
    m.removeAttribute('hidden');
    icon.textContent = '✕';
  } else {
    m.setAttribute('hidden','');
    icon.textContent = '☰';
  }
}
function closeMenu(){
  const m = $('#menuMobile');
  const icon = $('#menuIcon');
  m.setAttribute('hidden','');
  icon.textContent = '☰';
}

// Nav scroll effect
(function initNav(){
  const nav = $('#nav');
  const onScroll = () => {
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Chart animation (intersection observer)
(function initChart(){
  const chart = $('#chart');
  if (!chart) return;
  chart.classList.add('chart');
  chart.classList.add('armed');

  const obs = new IntersectionObserver((entries)=>{
    const e = entries[0];
    if (e && e.isIntersecting){
      chart.classList.add('show');
      obs.disconnect();
    }
  }, { threshold: 0.35 });

  obs.observe(chart);
})();

// Footer year
$('#year').textContent = new Date().getFullYear();

// Form submit: send via AJAX to Formspree and redirect to our own thank-you page.
// This avoids Formspree's default hosted thank-you page.
(function initLeadForm(){
  const form = document.querySelector('#leadForm') || document.querySelector('.contactForm');
  if (!form) return;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();

    const btn = form.querySelector('button[type="submit"]');
    const original = btn?.textContent;
    if (btn) {
      btn.textContent = 'Enviando…';
      btn.disabled = true;
    }

    try {
      const fd = new FormData(form);
      const res = await fetch(form.action, {
        method: 'POST',
        body: fd,
        headers: {
          'Accept': 'application/json'
        },
      });

      if (!res.ok) {
        // If something went wrong, let user try WhatsApp.
        throw new Error('formspree_not_ok');
      }

      window.location.assign('/thanks/');
    } catch (err) {
      if (btn) {
        btn.textContent = original || 'Solicitar orçamento';
        btn.disabled = false;
      }
      alert('Não foi possível enviar agora. Tente novamente ou chame no WhatsApp.');
    }
  });
})();
