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

// Contact form: opens WhatsApp with prefilled message
function submitWhatsApp(ev){
  ev.preventDefault();
  const f = ev.target;
  const name = (f.name.value || '').trim();
  const phone = (f.phone.value || '').trim();
  const city = (f.city.value || '').trim();
  const need = (f.need.value || '').trim();
  const details = (f.details.value || '').trim();

  const lines = [
    'Oi! Quero um orçamento (PonteWeb Studio).',
    '',
    `Nome: ${name}`,
    `WhatsApp: ${phone}`,
    city ? `Cidade: ${city}` : null,
    `Preciso: ${need}`,
    details ? `Detalhes: ${details}` : null,
  ].filter(Boolean);

  const msg = encodeURIComponent(lines.join('\n'));
  const url = `https://wa.me/5532984042502?text=${msg}`;
  window.open(url, '_blank', 'noopener');

  const btn = f.querySelector('button[type="submit"]');
  const original = btn.textContent;
  btn.textContent = 'Abrindo WhatsApp…';
  btn.disabled = true;
  setTimeout(()=>{ btn.textContent = original; btn.disabled = false; }, 1500);

  return false;
}
