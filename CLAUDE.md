# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build
npm run lint     # ESLint via next lint
```

## Architecture

**Single-page portfolio site** built with Next.js App Router. There is one route (`/`) rendered by `src/app/page.tsx` → `src/components/HomePage.tsx`.

### Rendering layers (bottom to top, z-index order)

| Layer | File | Role |
|---|---|---|
| WebGL canvas | `src/components/animations/CanvasBackground.tsx` | Animated noise/grain background rendered with Three.js + custom GLSL shaders. Fixed, `z-index: 0`, pointer-events none. |
| Page content | `src/components/HomePage.tsx` | All page content, header, footer, scroll animation logic. `z-index: 2`. |
| Custom cursor | `src/components/animations/elasticCursor.tsx` | GSAP-driven elastic blob cursor. Snaps to any element with `cursor-can-hover` class. Hidden on touch/mobile. `z-index: 100`. |

### Styling

- **`src/styles/minimalist.css`** — primary stylesheet, imported by `HomePage.tsx`. Contains all layout, intro animation, scroll animation, and responsive rules. Tailwind is present but barely used; prefer this CSS file.
- **`src/app/globals.css`** — minimal resets and Tailwind base imports.
- Background color is `#edeae4` (warm off-white), set on `html` and matched in the Three.js `backColor` uniform.

### Scroll & animation system

`HomePage.tsx` manages a three-phase scroll animation on the hero image:

- **`above`** — scroll-driven: `window.scrollY` maps to GSAP timeline progress `[0, 0.5]` (width compression).
- **`locked`** — page scroll frozen via `body { position: fixed }` trick; wheel/touch scrubs timeline progress `[0.5, 1]` (slide left + text reveal).
- **`below`** — animation complete, free scroll.

The lock triggers when `trackEl.getBoundingClientRect().top <= -20`. The `lockTriggerY` is computed as `trackDocTop - (-20)`.

**Critical**: `marginLeft` is animated by a **single keyframe tween** throughout the timeline. Never split it into two overlapping tweens — that causes a jump on reverse scrubbing.

### Smooth scroll

`SmoothScroll.tsx` wraps `ReactLenis` (Lenis). The Lenis instance is stored on `window.lenisScroll` for use in `HomePage.tsx`'s `smoothScrollTo()`. Lenis is **not** wrapping the page in the App Router layout — `HomePage.tsx` manages scroll manually during the lock phase.

### Intro animation

Controlled entirely by CSS classes on `<body>` toggled via `setTimeout` in `HomePage.tsx`:
- `intro-active` → page is in intro zoom state
- `intro-unveiled` → hero image begins revealing
- `intro-header-in` → header slides in
- `intro-ready` → transition to full scale begins
- All classes removed after `~2700ms`

`scrollRestoration` is set to `manual` (inline script in `layout.tsx`) and scroll is reset to 0 on every page load.

### Cursor hover targets

Add `cursor-can-hover` class to any element to make the elastic cursor snap and expand over it. The cursor walks up to 2 levels of parent elements looking for this class.

### Key refs in HomePage

| Ref | Element |
|---|---|
| `milanSectionRef` | `<section>` wrapper (used by intro zoom calc) |
| `milanTrackRef` | `.animation-scroll-track` div (scroll lock trigger) |
| `milanImageRef` | `.grid__animation-wrapper` (GSAP animation target) |
| `milanTextRef` | `.milan-text-panel` (text reveal target) |
