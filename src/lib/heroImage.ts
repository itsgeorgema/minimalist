import manifest from "../../public/assets/opt/manifest.json";

// Single source of truth for the hero derivatives, consumed by both the
// <picture> in HomePage and the <link rel="preload"> in the root layout so the
// two can never drift. Filenames are content-hashed by
// scripts/optimize-images.mjs — re-run `npm run optimize:images` after changing
// public/assets/milan.png and the URLs update themselves.
const { version, widths } = manifest;

const srcSetFor = (ext: string) =>
  widths.map((w) => `/assets/opt/milan-${version}-${w}.${ext} ${w}w`).join(", ");

export const HERO_SIZES = "(max-width: 960px) 100vw, 55vw";

export const HERO_SRCSET = {
  avif: srcSetFor("avif"),
  webp: srcSetFor("webp"),
  jpg: srcSetFor("jpg"),
};

export const HERO_FALLBACK = `/assets/opt/milan-${version}-1600.jpg`;
export const HERO_PRELOAD_HREF = `/assets/opt/milan-${version}-1600.avif`;
