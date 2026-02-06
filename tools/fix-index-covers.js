/* Fix broken demo cover img src in docs/index.html.
   Ensures each demoCard uses assets/demo-covers/<slug>.jpg based on href slug.
*/
const fs = require('fs');

const file = 'docs/index.html';
let s = fs.readFileSync(file, 'utf8');

s = s.replace(
  /(<a class="demoCard" href="\/demos\/)([^\/]+)(\/"[\s\S]*?<img\s+src=")assets\/demo-covers\/(?:\.[^"\s]+|[^"\s]+\.(?:svg|jpg|jpeg|png|webp|gif|avif|bmp))(")/g,
  (m, p1, slug, p2, p3, p4) => `${p1}${slug}${p2}${p3}assets/demo-covers/${slug}.jpg${p4}`
);

// Also handle the exact broken pattern assets/demo-covers/.jpg
s = s.replace(
  /(<a class="demoCard" href="\/demos\/)([^\/]+)(\/"[\s\S]*?<img\s+src=")assets\/demo-covers\/\.jpg(")/g,
  (m, p1, slug, p2, p3, p4) => `${p1}${slug}${p2}${p3}assets/demo-covers/${slug}.jpg${p4}`
);

fs.writeFileSync(file, s, 'utf8');
console.log('OK fixed cover img src in', file);
