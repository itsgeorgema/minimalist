// Regenerates the responsive hero derivatives in public/assets/opt from the
// full-resolution source PNG. Run with: npm run optimize:images
//
// Output filenames embed an 8-char hash of the source file's bytes. The
// derivatives are served with `Cache-Control: immutable` (see next.config.ts),
// so the URL *must* change whenever the image does — otherwise browsers that
// already have the old bytes will never revalidate and you'll keep seeing the
// previous photo. The generated manifest.json is what the app reads.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Resolve against the repo root, not process.cwd(), so the script works no
// matter which directory it is invoked from.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "public/assets/milan.png");
const OUT = join(ROOT, "public/assets/opt");
const WIDTHS = [800, 1200, 1600, 2400];

if (!existsSync(SRC)) {
  console.error(
    `Hero source image not found: ${SRC}\n` +
      `Put the full-resolution image there (named exactly milan.png) and re-run.`
  );
  process.exit(1);
}

const source = readFileSync(SRC);
const version = createHash("sha256").update(source).digest("hex").slice(0, 8);

mkdirSync(OUT, { recursive: true });

// Drop derivatives from previous runs so stale hashes don't pile up.
for (const file of readdirSync(OUT)) {
  if (file.startsWith("milan-")) unlinkSync(join(OUT, file));
}

for (const w of WIDTHS) {
  const base = sharp(source).resize({ width: w, withoutEnlargement: true });
  const stem = join(OUT, `milan-${version}-${w}`);
  await base.clone().avif({ quality: 55, effort: 6 }).toFile(`${stem}.avif`);
  await base.clone().webp({ quality: 78 }).toFile(`${stem}.webp`);
  await base.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(`${stem}.jpg`);
  console.log(`wrote ${w}w`);
}

const lqip = await sharp(source).resize({ width: 24 }).blur(1).webp({ quality: 40 }).toBuffer();

writeFileSync(
  join(OUT, "manifest.json"),
  JSON.stringify(
    {
      version,
      widths: WIDTHS,
      lqip: `data:image/webp;base64,${lqip.toString("base64")}`,
    },
    null,
    2
  ) + "\n"
);
console.log(`version ${version}`);
