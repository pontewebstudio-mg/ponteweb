/*
  Create portfolio cover images (JPEG) from screenshots.
  Crops top portion (hero) to remove large white/blank areas.

  Usage:
    node tools\\make-portfolio-covers.js

  Requires: sharp (already in repo)
*/

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'assets', 'demo-covers');

// Crop settings from a 1400x820 screenshot: take top hero area.
// Then resize to 1200x675 (16:9) for consistent cards.
const CROP = { left: 0, top: 0, width: 1400, height: 788 }; // tall enough; then center-crop 16:9 on resize

const MAP = [
  { slug: 'iron-pulse-gym', inPath: 'C:/Users/Romulo/.openclaw/media/browser/34e89757-d8d7-45b6-84d6-f4ebe49114c1.jpg' },
  { slug: 'aura-hair-studio', inPath: 'C:/Users/Romulo/.openclaw/media/browser/56c485f8-9449-464a-b179-8ecad0d6e7e9.jpg' },
  { slug: 'virtuoso-music-academy', inPath: 'C:/Users/Romulo/.openclaw/media/browser/c8ed823b-cb4b-4e15-b2b2-2dab44aea7f9.jpg' },
  { slug: 'dr-ricardo-bastos-advocacia', inPath: 'C:/Users/Romulo/.openclaw/media/browser/bded4716-5d64-4a5c-87dc-7c6ae5641127.jpg' },
  { slug: 'buddy-co-pet-spa', inPath: 'C:/Users/Romulo/.openclaw/media/browser/cdc3318d-863c-4036-ba01-d746bac56095.jpg' },
  // The remaining demos will be filled after we capture screenshots.
  { slug: 'golden-crust-bakery', inPath: 'C:/Users/Romulo/.openclaw/media/browser/b1a1120b-e994-4d98-b8e8-d9616b0169f5.jpg' },
  { slug: 'luminosite-odontologia', inPath: 'C:/Users/Romulo/.openclaw/media/browser/e7a9290c-b83e-44ad-9249-a636378bb7d6.jpg' },
  { slug: 'o-alquimista-bar', inPath: 'C:/Users/Romulo/.openclaw/media/browser/7568dad4-52c5-490d-88c3-64a717727319.jpg' },
  { slug: 'sabor-e-brasa', inPath: 'C:/Users/Romulo/.openclaw/media/browser/09353732-40bf-4e48-9676-64d6157948ca.jpg' },
  { slug: 'aquarela-do-saber', inPath: 'C:/Users/Romulo/.openclaw/media/browser/b51a8f6f-75be-4ff0-8e16-ac61613217ce.jpg' },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const missing = MAP.filter(x => x.inPath.includes('SCREENSHOT_'));
  if (missing.length) {
    console.error('Missing screenshot paths for:', missing.map(x => x.slug).join(', '));
    console.error('Edit tools/make-portfolio-covers.js and replace SCREENSHOT_*.jpg with actual paths, then rerun.');
    process.exit(2);
  }

  for (const item of MAP) {
    if (!fs.existsSync(item.inPath)) throw new Error('Input not found: ' + item.inPath);

    const outPath = path.join(OUT_DIR, item.slug + '.jpg');

    const img = sharp(item.inPath);
    const meta = await img.metadata();

    let pipeline = img;

    // If screenshot isn't the expected size, crop proportionally: take the top ~72%.
    if (meta.width && meta.height) {
      const cropH = Math.round(meta.height * 0.72);
      pipeline = pipeline.extract({ left: 0, top: 0, width: meta.width, height: cropH });
    } else {
      pipeline = pipeline.extract(CROP);
    }

    // Resize to 16:9 and crop to cover.
    await pipeline
      .resize(1200, 675, { fit: 'cover', position: 'top' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(outPath);

    process.stdout.write('OK cover: ' + item.slug + '\n');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
