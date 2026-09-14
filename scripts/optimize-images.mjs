// Regenerates the responsive hero derivatives in public/assets/opt from the
// full-resolution source PNG. Run with: npm run optimize:images
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const SRC = "public/assets/milan.png";
const OUT = "public/assets/opt";
const WIDTHS = [800, 1200, 1600, 2400];

mkdirSync(OUT, { recursive: true });

for (const w of WIDTHS) {
  const base = sharp(SRC).resize({ width: w, withoutEnlargement: true });
  await base.clone().avif({ quality: 55, effort: 6 }).toFile(`${OUT}/milan-${w}.avif`);
  await base.clone().webp({ quality: 78 }).toFile(`${OUT}/milan-${w}.webp`);
  await base.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(`${OUT}/milan-${w}.jpg`);
  console.log(`wrote ${w}w`);
}

const lqip = await sharp(SRC).resize({ width: 24 }).blur(1).webp({ quality: 40 }).toBuffer();
writeFileSync(`${OUT}/lqip.txt`, `data:image/webp;base64,${lqip.toString("base64")}`);
