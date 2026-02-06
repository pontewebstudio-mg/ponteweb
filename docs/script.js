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

// Formspree handles submission via HTML form action.
// Optional: small UX for submit button.
(function initFormUX(){
  const form = document.querySelector('.contactForm');
  if (!form) return;
  form.addEventListener('submit', () => {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.dataset.originalText = btn.textContent;
    btn.textContent = 'Enviando…';
    btn.disabled = true;
    setTimeout(()=>{
      // Formspree will redirect/replace page depending on config; this is just a fallback.
      btn.textContent = btn.dataset.originalText || 'Solicitar orçamento';
      btn.disabled = false;
    }, 3500);
  });
})();
