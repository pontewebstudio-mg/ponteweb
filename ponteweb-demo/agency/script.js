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

// Contact form: opens the user's email client with a prefilled email (static site)
// NOTE: truly "sending" requires a backend (Formspree/Netlify/Worker). This mailto is the safest no-backend option.
function submitEmail(ev){
  ev.preventDefault();
  const f = ev.target;
  const name = (f.name.value || '').trim();
  const phone = (f.phone.value || '').trim();
  const city = (f.city.value || '').trim();
  const need = (f.need.value || '').trim();
  const details = (f.details.value || '').trim();

  const subject = `Orçamento — PonteWeb Studio (${need || 'Site'})`;
  const lines = [
    'Olá! Quero um orçamento com a PonteWeb Studio.',
    '',
    `Nome: ${name}`,
    `WhatsApp: ${phone}`,
    city ? `Cidade: ${city}` : null,
    need ? `Preciso: ${need}` : null,
    details ? `Detalhes: ${details}` : null,
  ].filter(Boolean);

  const body = lines.join('\n');
  const to = 'oprodutormusic@gmail.com';
  const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  window.location.href = url;

  const btn = f.querySelector('button[type="submit"]');
  const original = btn.textContent;
  btn.textContent = 'Abrindo e-mail…';
  btn.disabled = true;
  setTimeout(()=>{ btn.textContent = original; btn.disabled = false; }, 1500);

  return false;
}
