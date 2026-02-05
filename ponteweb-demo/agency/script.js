function toggleNav(){
  document.querySelector('.top')?.classList.toggle('open');
}
document.getElementById('year').textContent = new Date().getFullYear();
