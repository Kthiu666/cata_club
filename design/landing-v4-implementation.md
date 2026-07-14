# Task: Implement Public Landing from Mockup v4

## Context

The client approved the landing mockup **v4 premium**. It is the visual contract — pixel-perfect fidelity is the acceptance bar.

- **Visual contract**: `design/cata-club-landing-mockup-v4.html` (self-contained: data-URI images + embedded @font-face fonts)
- **Reference render**: `design/cata-club-landing-mockup-v4.png` (1440×4398, Playwright fullPage at 1440px)
- **Target**: replace the current `src/app/page.tsx` (the existing landing there is an older internal demo page and is NOT the contract — the mockup wins; keep the `/login` route working)
- Project: Next.js 14 App Router, TypeScript, Tailwind 3, Vitest + Testing Library, Playwright, pnpm

## Stack (closed decision — do not substitute)

| Concern | Choice |
| --- | --- |
| Scroll animations | GSAP 3 + ScrollTrigger (free, includes former club plugins) |
| Smooth scrolling | Lenis (integrate with ScrollTrigger via `lenis.on('scroll', ScrollTrigger.update)`) |
| Map | Leaflet via react-leaflet, dynamic import with `ssr: false` |
| Icons | lucide-react (already installed) |
| Fonts | `next/font/local`, self-hosted (extract from the mockup) |

Do NOT add Framer Motion or any second animation system.

## Mockup structure (sections to componentize)

1. `nav.navbar` — logo + nav links
2. `header.hero` — left copy column + pixel-art animation panel (`.hero-anim`)
3. `.stats` — stats bar (contains placeholder values +12 / +80)
4. `section.valores`
5. `section.lema` — no background figure illustrations here (explicit client/user preference)
6. `section.galeria`
7. `section.horarios` — placeholder schedule data
8. `section.ubicacion` — Leaflet map + `.contacto` block (placeholder contact data)
9. Footer (`.footer-top` etc.)

Fonts used: **Barlow**, **Graduate**, **Playfair Display**.

### Pixel-art hero animation (preserve behavior)

Frame 1 is the always-on base layer; frames 2–4 overlay with `step-end` keyframes and a long frame-1 rest window. This keeps renders/screenshots deterministic. Reproduce the same technique (CSS keyframes are fine; GSAP not required for this loop).

## Tasks (in order)

### 1. Install dependencies

```
pnpm add gsap lenis leaflet react-leaflet
pnpm add -D @types/leaflet
```

### 2. Extract assets from the mockup

- Decode every data-URI image in `design/cata-club-landing-mockup-v4.html` to real files under `public/landing/` (descriptive kebab-case names: `hero-frame-1.png`, etc.).
- Decode the @font-face fonts to `public/fonts/` (or colocate for `next/font/local`) and register Barlow, Graduate, and Playfair Display with `next/font/local` in the landing layout.
- No data-URIs in production code. Never modify anything inside `design/`.

### 3. Centralized placeholder config

Create ONE typed config module (e.g. `src/app/(landing)/landing-config.ts` or `src/lib/landing-config.ts`) holding ALL client-pending data, each marked `// TODO(client):`

- WhatsApp, Instagram, email (currently fake)
- Stats `+12` / `+80` (currently fake)
- Schedule/horarios (currently fake)

No component may hardcode these values — they must import from this module.

### 4. Componentize the landing

- One presentational component per mockup section, container-presentational + atomic design, under `src/app/` following the existing project structure (see `src/components/` conventions and `src/app/README.md`).
- Replace `src/app/page.tsx` with the new landing composition.
- `ENTRAR` button navigates to `/login`.
- Semantic HTML, `alt` text on images, keyboard-focusable interactive elements.

### 5. Motion layer (GSAP + ScrollTrigger + Lenis)

- Lenis smooth scroll wired to ScrollTrigger in a client component.
- Scroll-triggered reveals with stagger per section; animated counters on the stats when they enter the viewport; subtle hero parallax.
- Motion character: fast, energetic, snappy — sports club, not a spa.
- **Full `prefers-reduced-motion` fallback**: use `gsap.matchMedia()`; with reduced motion, content renders in final state with no scroll animations and Lenis disabled.
- All GSAP/Lenis setup in `useGSAP`/`useEffect` with proper cleanup (`ScrollTrigger.kill()`, `lenis.destroy()`).

### 6. Map (Leaflet)

- react-leaflet loaded with `next/dynamic` and `ssr: false`.
- Center + marker at `-4.0056095, -79.2046238` (Av. Manuel Agustín Aguirre, La Tebaida, Loja — verified via Nominatim).
- Import Leaflet CSS; fix the default marker icon path issue (known Leaflet + bundler gotcha).

### 7. Verification (acceptance criteria)

- Strict TDD: write component tests first (Vitest + Testing Library). Cover at minimum: sections render, placeholder values come from the config module, ENTRAR links to `/login`, reduced-motion renders final-state content.
- `pnpm test`, `pnpm type-check`, `pnpm lint` all pass.
- Playwright fullPage screenshot at 1440px viewport of the running app; compare side by side against `design/cata-club-landing-mockup-v4.png`. Iterate until visually faithful (allow trivial anti-aliasing differences; layout, spacing, colors, and typography must match).

## Constraints

- pnpm only.
- Never edit files in `design/`.
- Conventional commits, no AI attribution.
- Existing routes (`/login`, `/dashboard`, `/student`, `/trainer`, etc.) must keep working; this task only replaces the public landing page and adds its components/assets.
