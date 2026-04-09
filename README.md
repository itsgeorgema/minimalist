## Setup

Clone the repository, then:

### Run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Production build: `npm run build` then `npm start`.

## Tech stack

| Area | Stack |
|------|--------|
| Framework | [Next.js](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| UI | [React](https://react.dev/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) + project CSS (`src/styles/minimalist.css`) |
| Utilities | [clsx](https://github.com/lukeed/clsx), [tailwind-merge](https://github.com/dcastil/tailwind-merge) |
| Animation | [GSAP](https://gsap.com/) |
| Smooth scroll | [Lenis](https://lenis.darkroom.engineering/) (`lenis/react`) |
| 3D / WebGL | [Three.js](https://threejs.org/) (shader background canvas) |
| Linting | [ESLint](https://eslint.org/) + `eslint-config-next` |
