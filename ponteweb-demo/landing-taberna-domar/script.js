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

// Carousel (hero)
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

// Carousel (reviews)
let reviewIndex = 0;
let reviewTimer = null;
function reviewSetup(){
  const track = document.getElementById('reviewTrack');
  const dots = document.getElementById('reviewDots');
  if (!track || !dots) return;

  const slides = Array.from(track.querySelectorAll('.reviewSlide'));
  dots.innerHTML = '';
  slides.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dot';
    b.setAttribute('aria-label', `Ir para avaliação ${i+1}`);
    b.addEventListener('click', () => reviewGo(i));
    dots.appendChild(b);
  });

  reviewGo(0);
  reviewAuto();

  const root = track.closest('.reviewCarousel');
  root?.addEventListener('mouseenter', () => reviewStop());
  root?.addEventListener('mouseleave', () => reviewAuto());
}
function reviewGo(i){
  const track = document.getElementById('reviewTrack');
  const dots = document.querySelectorAll('#reviewDots .dot');
  if (!track) return;
  const slides = track.querySelectorAll('.reviewSlide');
  reviewIndex = (i + slides.length) % slides.length;
  track.style.transform = `translateX(${-reviewIndex * 100}%)`;
  dots.forEach((d, di) => d.classList.toggle('active', di === reviewIndex));
}
function reviewNext(){
  const track = document.getElementById('reviewTrack');
  const n = track?.querySelectorAll('.reviewSlide')?.length || 1;
  reviewGo((reviewIndex + 1) % n);
}
function reviewPrev(){
  const track = document.getElementById('reviewTrack');
  const n = track?.querySelectorAll('.reviewSlide')?.length || 1;
  reviewGo((reviewIndex - 1 + n) % n);
}
function reviewAuto(){
  reviewStop();
  reviewTimer = setInterval(reviewNext, 6000);
}
function reviewStop(){
  if (reviewTimer) clearInterval(reviewTimer);
  reviewTimer = null;
}

function mountPhotoGrid(rootId, items){
  const root = document.getElementById(rootId);
  if (!root) return;
  root.innerHTML = '';
  items.forEach((it) => {
    const a = document.createElement('a');
    a.href = it.src;
    a.target = '_blank';
    a.rel = 'noopener';

    const img = document.createElement('img');
    img.src = it.src;
    img.alt = it.alt || 'Foto';
    img.loading = 'lazy';

    a.appendChild(img);
    root.appendChild(a);
  });
}

// TODO: preencher quando as fotos chegarem
const PHOTOS_SAO_JOAO = [
  { src: 'assets/sao-joao/01.jpg', alt: 'Taberna d’Omar — São João del Rei' },
  { src: 'assets/sao-joao/02.jpg', alt: 'Vitrine / pães — Taberna d’Omar (São João del Rei)' },
  { src: 'assets/sao-joao/03.jpg', alt: 'Interior — Taberna d’Omar (São João del Rei)' },
  { src: 'assets/sao-joao/04.jpg', alt: 'Hambúrguer — Taberna d’Omar (São João del Rei)' },
  { src: 'assets/sao-joao/05.jpg', alt: 'Sanduíche — Taberna d’Omar (São João del Rei)' },
  { src: 'assets/sao-joao/06.jpg', alt: 'Placa — Taberna d’Omar (São João del Rei)' },
];

const PHOTOS_TIRADENTES = [
  { src: 'assets/tiradentes/02.jpg', alt: 'Tábua / pães e acompanhamentos — Taberna d’Omar (Tiradentes)' },
  { src: 'assets/tiradentes/03.jpg', alt: 'Hambúrgueres — Taberna d’Omar (Tiradentes)' },
  { src: 'assets/tiradentes/04.jpg', alt: 'Café — Taberna d’Omar (Tiradentes)' },
  { src: 'assets/tiradentes/05.jpg', alt: 'Mesa / pães e café — Taberna d’Omar (Tiradentes)' },
  { src: 'assets/tiradentes/06.jpg', alt: 'Fachada / placa na rua — Taberna d’Omar (Tiradentes)' },
  { src: 'assets/tiradentes/07.jpg', alt: 'Sanduíche — Taberna d’Omar (Tiradentes)' },
];

document.addEventListener('DOMContentLoaded', () => {
  carouselSetup();
  reviewSetup();
  mountPhotoGrid('photos-sao-joao', PHOTOS_SAO_JOAO);
  mountPhotoGrid('photos-tiradentes', PHOTOS_TIRADENTES);
});
