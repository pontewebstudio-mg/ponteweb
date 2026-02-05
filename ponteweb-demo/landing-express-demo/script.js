// Theme
(function initTheme(){
  const saved = localStorage.getItem('pw_theme');
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.dataset.theme = saved;
  }
})();
function toggleTheme(){
  const cur = document.documentElement.dataset.theme;
  const next = cur === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('pw_theme', next);
}

// View modes (simulação)
(function initView(){
  const saved = localStorage.getItem('pw_view');
  if (saved) document.body.dataset.view = saved;
})();
function setView(mode){
  document.body.dataset.view = mode;
  localStorage.setItem('pw_view', mode);
}

// Carousel
let carIndex = 0;
let carTimer = null;
function carouselSetup(){
  const track = document.getElementById('carouselTrack');
  const dots = document.getElementById('carouselDots');
  if (!track || !dots) return;

  const slides = Array.from(track.querySelectorAll('img'));
  dots.innerHTML = '';
  slides.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dot';
    b.setAttribute('aria-label', `Ir para imagem ${i+1}`);
    b.addEventListener('click', () => carouselGo(i));
    dots.appendChild(b);
  });

  // keyboard
  track.closest('.carousel')?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') carouselPrev();
    if (e.key === 'ArrowRight') carouselNext();
  });

  carouselGo(0);
  carouselAuto();

  // pause on hover
  const root = track.closest('.carousel');
  root?.addEventListener('mouseenter', () => carouselStop());
  root?.addEventListener('mouseleave', () => carouselAuto());
}
function carouselGo(i){
  const track = document.getElementById('carouselTrack');
  const dots = document.querySelectorAll('#carouselDots .dot');
  if (!track) return;
  const slides = track.querySelectorAll('img');
  carIndex = (i + slides.length) % slides.length;
  track.style.transform = `translateX(${-carIndex * 100}%)`;
  dots.forEach((d, di) => d.classList.toggle('active', di === carIndex));
}
function carouselNext(){
  const track = document.getElementById('carouselTrack');
  const n = track?.querySelectorAll('img')?.length || 1;
  carouselGo((carIndex + 1) % n);
}
function carouselPrev(){
  const track = document.getElementById('carouselTrack');
  const n = track?.querySelectorAll('img')?.length || 1;
  carouselGo((carIndex - 1 + n) % n);
}
function carouselAuto(){
  carouselStop();
  carTimer = setInterval(carouselNext, 4500);
}
function carouselStop(){
  if (carTimer) clearInterval(carTimer);
  carTimer = null;
}

document.addEventListener('DOMContentLoaded', carouselSetup);
