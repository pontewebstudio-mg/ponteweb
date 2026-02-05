function toggleNav(){
  document.querySelector('.top')?.classList.toggle('open');
}

document.getElementById('year').textContent = new Date().getFullYear();

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
