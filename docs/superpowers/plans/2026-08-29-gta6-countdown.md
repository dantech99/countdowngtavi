# GTA 6 Countdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the GTA 6 countdown landing site: full-viewport hero with a live countdown, a news section mixing self-written articles with RSS-aggregated headlines, a donations section, and an automated rebuild pipeline to keep news fresh on a static deploy.

**Architecture:** Astro static site. Pure, dependency-free logic (`countdown.js`, `rss.js`) is unit-tested with Vitest; Astro components consume that logic and are verified manually in the browser (per spec — animations and layout are not unit-tested). Content lives in two places: Astro Content Collections for self-written articles, and build-time RSS fetches for aggregated headlines. A GitHub Actions cron hits a Vercel Deploy Hook every 6h to keep aggregated news current.

**Tech Stack:** Astro `^7.2.9`, Tailwind CSS v4 (Vite plugin), GSAP + ScrollTrigger, `rss-parser`, Vitest, pnpm, Vercel hosting, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-29-gta6-countdown-design.md`

## Global Constraints

- Countdown target date is fixed: `2026-11-19T00:00:00` (local time), with a visible disclaimer that Rockstar has not confirmed an exact hour.
- News aggregation shows **only** headline + link back to the source — never full third-party content (legal/AdSense requirement from the spec).
- News fetch happens at **build time only** — no client-side fetching of RSS (feeds don't expose CORS).
- A single failed RSS feed must never fail the build (`Promise.allSettled`, warn and skip).
- Package manager is `pnpm` throughout.
- Tailwind is installed via `pnpm astro add tailwind` (Vite plugin) — never the deprecated `@astrojs/tailwind` integration.
- Content collection config lives at `src/content.config.ts` (Astro v6+ path), using the `glob()` loader from `astro/loaders` — not the old `src/content/config.ts`.
- The site stays fully static — no Vercel adapter, no SSR, no serverless functions added for the cron.
- The RSS feed list and the news merge logic live in exactly one place, `src/lib/news.js` (built in Task 8). Both `/noticias` and the homepage import from it; neither redefines them.
- Tailwind v4 registers plugins from CSS (`@plugin "...";` in `src/styles/global.css`), never from a `tailwind.config.js`.

---

### Task 1: Tooling setup — Tailwind v4 + Vitest

**Files:**
- Modify: `package.json`
- Modify: `astro.config.mjs`
- Create: `src/styles/global.css`
- Create: `src/lib/sanity-check.test.js` (deleted at the end of this task once Task 2 exists — see Step 5)

**Interfaces:**
- Produces: `src/styles/global.css` importable from any layout via `import '../styles/global.css'`.
- Produces: `pnpm test` script running Vitest in run mode.

- [ ] **Step 1: Install Tailwind v4 via the Astro CLI**

Run:
```bash
pnpm astro add tailwind --yes
```
Expected: `astro.config.mjs` now imports `@tailwindcss/vite` and adds it to `vite.plugins`; `tailwindcss` and `@tailwindcss/vite` appear in `package.json` dependencies.

- [ ] **Step 2: Create the global stylesheet**

```css
/* src/styles/global.css */
@import "tailwindcss";
```

- [ ] **Step 3: Install Vitest and wire the test script**

Run:
```bash
pnpm add -D vitest
```

Edit `package.json` scripts to add:
```json
"test": "vitest run"
```

- [ ] **Step 4: Write a throwaway sanity test and confirm Vitest runs**

```javascript
// src/lib/sanity-check.test.js
import { describe, it, expect } from 'vitest';

describe('vitest setup', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `pnpm test`
Expected: PASS, 1 test.

- [ ] **Step 5: Delete the sanity test**

```bash
rm src/lib/sanity-check.test.js
```

It served only to confirm Vitest is wired up; Task 2 provides the first real test.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml astro.config.mjs src/styles/global.css
git commit -m "chore: add Tailwind v4 and Vitest"
```

---

### Task 2: Countdown logic (`lib/countdown.js`)

**Files:**
- Create: `src/lib/countdown.js`
- Test: `src/lib/countdown.test.js`

**Interfaces:**
- Produces: `getTimeRemaining(targetDate: Date | string, now?: Date): { days: number, hours: number, minutes: number, seconds: number }` — pure function, no DOM access. `now` defaults to `new Date()` but accepts an override for deterministic tests.

- [ ] **Step 1: Write the failing tests**

```javascript
// src/lib/countdown.test.js
import { describe, it, expect } from 'vitest';
import { getTimeRemaining } from './countdown.js';

describe('getTimeRemaining', () => {
  it('computes days/hours/minutes/seconds for a future date', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const target = new Date('2026-01-03T01:02:03Z');
    expect(getTimeRemaining(target, now)).toEqual({
      days: 2,
      hours: 1,
      minutes: 2,
      seconds: 3,
    });
  });

  it('returns all zeros once the target date has passed', () => {
    const now = new Date('2026-12-01T00:00:00Z');
    const target = new Date('2026-11-19T00:00:00Z');
    expect(getTimeRemaining(target, now)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it('returns all zeros exactly at the target date', () => {
    const now = new Date('2026-11-19T00:00:00Z');
    const target = new Date('2026-11-19T00:00:00Z');
    expect(getTimeRemaining(target, now)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it('accepts a date string for targetDate', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    expect(getTimeRemaining('2026-01-02T00:00:00Z', now)).toEqual({
      days: 1,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- countdown`
Expected: FAIL — `Cannot find module './countdown.js'` (or similar).

- [ ] **Step 3: Implement `countdown.js`**

```javascript
// src/lib/countdown.js
export function getTimeRemaining(targetDate, now = new Date()) {
  const target = targetDate instanceof Date ? targetDate : new Date(targetDate);
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- countdown`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/countdown.js src/lib/countdown.test.js
git commit -m "feat: add pure countdown calculation logic"
```

---

### Task 3: RSS aggregation logic (`lib/rss.js`)

**Files:**
- Create: `src/lib/rss.js`
- Test: `src/lib/rss.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `normalizeFeedItem(item: { title?: string, link?: string, pubDate?: string }, source: string): { title: string, link: string, pubDate: Date | null, source: string }`
  - `fetchFeed(url: string, source: string, parseFn: (url: string) => Promise<{ items: object[] }>): Promise<Array<ReturnType<typeof normalizeFeedItem>>>`
  - `fetchAllFeeds(feeds: Array<{ url: string, source: string }>, parseFn: (url: string) => Promise<{ items: object[] }>): Promise<Array<ReturnType<typeof normalizeFeedItem>>>` — never rejects; a failed feed is warned about and skipped.
- These are consumed by Task 8 (`pages/noticias/index.astro`), which will import `fetchAllFeeds` and pass it a real `rss-parser` instance's `parseURL` method as `parseFn`.

- [ ] **Step 1: Install `rss-parser`**

Run:
```bash
pnpm add rss-parser
```

- [ ] **Step 2: Write the failing tests**

```javascript
// src/lib/rss.test.js
import { describe, it, expect, vi } from 'vitest';
import { normalizeFeedItem, fetchFeed, fetchAllFeeds } from './rss.js';

describe('normalizeFeedItem', () => {
  it('normalizes a well-formed item', () => {
    const item = { title: 'GTA 6 delayed again', link: 'https://example.com/a', pubDate: '2026-08-01T12:00:00Z' };
    expect(normalizeFeedItem(item, 'IGN')).toEqual({
      title: 'GTA 6 delayed again',
      link: 'https://example.com/a',
      pubDate: new Date('2026-08-01T12:00:00Z'),
      source: 'IGN',
    });
  });

  it('falls back to empty strings and null date for missing fields', () => {
    expect(normalizeFeedItem({}, 'IGN')).toEqual({
      title: '',
      link: '',
      pubDate: null,
      source: 'IGN',
    });
  });
});

describe('fetchFeed', () => {
  it('parses a feed and normalizes each item', async () => {
    const parseFn = vi.fn().mockResolvedValue({
      items: [{ title: 'A', link: 'https://a', pubDate: '2026-08-01T00:00:00Z' }],
    });

    const result = await fetchFeed('https://feed.example.com/rss', 'Rockstar Newswire', parseFn);

    expect(parseFn).toHaveBeenCalledWith('https://feed.example.com/rss');
    expect(result).toEqual([
      { title: 'A', link: 'https://a', pubDate: new Date('2026-08-01T00:00:00Z'), source: 'Rockstar Newswire' },
    ]);
  });
});

describe('fetchAllFeeds', () => {
  it('merges items from every feed that succeeds', async () => {
    const parseFn = vi.fn(async (url) => {
      if (url === 'https://good.example.com') {
        return { items: [{ title: 'Good item', link: 'https://good', pubDate: '2026-08-01T00:00:00Z' }] };
      }
      throw new Error('network error');
    });

    const result = await fetchAllFeeds(
      [
        { url: 'https://good.example.com', source: 'Good Source' },
        { url: 'https://bad.example.com', source: 'Bad Source' },
      ],
      parseFn
    );

    expect(result).toEqual([
      { title: 'Good item', link: 'https://good', pubDate: new Date('2026-08-01T00:00:00Z'), source: 'Good Source' },
    ]);
  });

  it('never rejects even if every feed fails', async () => {
    const parseFn = vi.fn().mockRejectedValue(new Error('down'));
    const result = await fetchAllFeeds([{ url: 'https://x.example.com', source: 'X' }], parseFn);
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test -- rss`
Expected: FAIL — `Cannot find module './rss.js'`.

- [ ] **Step 4: Implement `rss.js`**

```javascript
// src/lib/rss.js
export function normalizeFeedItem(item, source) {
  return {
    title: item.title ?? '',
    link: item.link ?? '',
    pubDate: item.pubDate ? new Date(item.pubDate) : null,
    source,
  };
}

export async function fetchFeed(url, source, parseFn) {
  const feed = await parseFn(url);
  return feed.items.map((item) => normalizeFeedItem(item, source));
}

export async function fetchAllFeeds(feeds, parseFn) {
  const results = await Promise.allSettled(
    feeds.map(({ url, source }) => fetchFeed(url, source, parseFn))
  );

  const items = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      items.push(...result.value);
    } else {
      const { url } = feeds[index];
      console.warn(`[rss] skipping feed "${url}": ${result.reason?.message ?? result.reason}`);
    }
  });
  return items;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test -- rss`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/rss.js src/lib/rss.test.js
git commit -m "feat: add RSS fetch and normalization logic"
```

---

### Task 4: Content collection for self-written articles

**Files:**
- Create: `src/content.config.ts`
- Create: `src/content/articulos/bienvenida.md`

**Interfaces:**
- Produces: collection `articulos`, entries typed as `{ id: string, data: { title: string, description: string, pubDate: Date, author: string, cover: ImageFunction, coverAlt: string }, body: string, ... }` via `getCollection('articulos')` — consumed by Task 8 (`pages/noticias/index.astro`) and Task 9 (`pages/noticias/[slug].astro`).

- [ ] **Step 1: Define the collection with the glob loader**

Import `z` from `astro/zod`, not from `astro:content`. The `astro:content` re-export is deprecated and makes `astro check` emit a `ts(6385): 'z' is deprecated` warning for every schema field that uses it.

```typescript
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const articulos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articulos' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      author: z.string(),
      cover: image(),
      coverAlt: z.string(),
    }),
});

export const collections = { articulos };
```

- [ ] **Step 2: Add a real sample article with a cover image reference**

Note: the cover image this frontmatter points at already exists at `src/content/articulos/portada.jpg` (1200x616 JPEG, committed during setup in `c5204e3` — downscaled from the hero background art as a stand-in until the team supplies final art). Do not create, replace, or regenerate it; just reference it as `./portada.jpg`, which resolves relative to this article's own directory.

```markdown
---
title: "Bienvenidos al countdown de GTA 6"
description: "Por qué armamos este sitio y qué van a encontrar acá."
pubDate: 2026-08-29
author: "El equipo"
cover: "./portada.jpg"
coverAlt: "Arte de portada de GTA VI"
---

Arrancamos este sitio para tener un lugar propio donde seguir la cuenta regresiva
a GTA VI, compartir noticias y escribir sobre lo que nos genera el juego.
En las próximas semanas vamos a ir sumando artículos de análisis y opinión.
```

- [ ] **Step 3: Verify the collection type-checks and resolves**

Run:
```bash
pnpm astro sync && pnpm astro check
```
Expected: no errors related to `articulos`. (Unrelated pre-existing errors from files not yet touched by this plan, e.g. the stock `Welcome.astro` reference removed in Task 11, are not this task's concern — but confirm the `articulos` collection itself resolves cleanly.)

- [ ] **Step 4: Commit**

```bash
git add src/content.config.ts src/content/articulos/
git commit -m "feat: add articulos content collection with sample article"
```

---

### Task 5: Base layout (`Layout.astro`)

**Files:**
- Modify: `src/layouts/Layout.astro`

**Interfaces:**
- Consumes: `src/styles/global.css` (Task 1).
- Produces: `Layout` component with props `{ title: string, description: string }`, wraps a `<slot />`. Consumed by every page in Tasks 8, 9, 11.

- [ ] **Step 1: Rewrite the layout with SEO meta and the global stylesheet**

```astro
---
// src/layouts/Layout.astro
import '../styles/global.css';

interface Props {
  title: string;
  description: string;
}

const { title, description } = Astro.props;
---

<!doctype html>
<html lang="es">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
		<link rel="icon" href="/favicon.ico" />
		<meta name="generator" content={Astro.generator} />
		<meta name="description" content={description} />
		<title>{title}</title>
	</head>
	<body class="bg-black text-white">
		<slot />
	</body>
</html>
```

- [ ] **Step 2: Verify the dev server serves it without errors**

Run: `astro dev --background`, then `astro dev logs`
Expected: no build errors reported for `Layout.astro`. Stop the server afterward with `astro dev stop`.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat: rewrite base layout with SEO meta and global styles"
```

---

### Task 6: Hero component — countdown, background, scroll effects

**Files:**
- Create: `src/components/Hero.astro`

**Interfaces:**
- Consumes: `getTimeRemaining` from `src/lib/countdown.js` (Task 2); `src/assets/background-gta6.png` (already present in the repo).
- Produces: `Hero` component with no required props, rendering a full-viewport section with `id="hero"`. Consumed by Task 11 (`pages/index.astro`).

- [ ] **Step 1: Build the markup — background image, countdown blocks, disclaimer, scroll indicator**

Note on the overlay: it starts at `opacity-40` and the ScrollTrigger animates it to `0.85`, so the hero visibly darkens as you scroll — that progressive darkening is a spec requirement. Keep both values as written; animating opacity toward a value above 1 would be clamped by CSS and produce no visible effect.

```astro
---
// src/components/Hero.astro
import { Image } from 'astro:assets';
import heroBg from '../assets/background-gta6.png';
---

<section id="hero" class="relative h-screen w-full overflow-hidden flex items-center justify-center text-center">
	<Image
		src={heroBg}
		alt="Arte de fondo de GTA VI"
		class="absolute inset-0 h-full w-full object-cover"
		loading="eager"
		fetchpriority="high"
		widths={[640, 1280, 1920, 3840]}
		sizes="100vw"
	/>
	<div id="hero-overlay" class="absolute inset-0 bg-black opacity-40"></div>

	<div class="relative z-10 flex flex-col items-center gap-6 px-4">
		<h1 class="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-wide">
			Cuenta regresiva a GTA VI
		</h1>

		<div class="flex gap-4 sm:gap-8" data-countdown data-target="2026-11-19T00:00:00">
			<div class="flex flex-col items-center">
				<span class="text-4xl sm:text-6xl font-bold tabular-nums" data-unit="days">--</span>
				<span class="text-xs sm:text-sm uppercase tracking-widest text-white/70">Días</span>
			</div>
			<div class="flex flex-col items-center">
				<span class="text-4xl sm:text-6xl font-bold tabular-nums" data-unit="hours">--</span>
				<span class="text-xs sm:text-sm uppercase tracking-widest text-white/70">Horas</span>
			</div>
			<div class="flex flex-col items-center">
				<span class="text-4xl sm:text-6xl font-bold tabular-nums" data-unit="minutes">--</span>
				<span class="text-xs sm:text-sm uppercase tracking-widest text-white/70">Minutos</span>
			</div>
			<div class="flex flex-col items-center">
				<span class="text-4xl sm:text-6xl font-bold tabular-nums" data-unit="seconds">--</span>
				<span class="text-xs sm:text-sm uppercase tracking-widest text-white/70">Segundos</span>
			</div>
		</div>

		<p class="max-w-md text-xs sm:text-sm text-white/60">
			Rockstar solo confirmó la fecha de lanzamiento, no la hora exacta de desbloqueo.
			El contador asume medianoche hora local.
		</p>
	</div>

	<div id="scroll-indicator" class="absolute bottom-8 z-10 text-white/80">
		<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</div>
</section>

<script>
	import { gsap } from 'gsap';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';
	import { getTimeRemaining } from '../lib/countdown.js';

	gsap.registerPlugin(ScrollTrigger);

	const hero = document.getElementById('hero');
	const countdownEl = hero.querySelector('[data-countdown]');
	const targetDate = countdownEl.dataset.target;
	const unitEls = {
		days: hero.querySelector('[data-unit="days"]'),
		hours: hero.querySelector('[data-unit="hours"]'),
		minutes: hero.querySelector('[data-unit="minutes"]'),
		seconds: hero.querySelector('[data-unit="seconds"]'),
	};

	function pad(value) {
		return String(value).padStart(2, '0');
	}

	function render() {
		const remaining = getTimeRemaining(targetDate);
		for (const [unit, el] of Object.entries(unitEls)) {
			const nextValue = pad(remaining[unit]);
			if (el.textContent !== nextValue) {
				el.textContent = nextValue;
				gsap.fromTo(el, { scale: 1.3, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.out' });
			}
		}
	}

	render();
	setInterval(render, 1000);

	gsap.to('#hero-overlay', {
		opacity: 0.85,
		ease: 'none',
		scrollTrigger: {
			trigger: hero,
			start: 'top top',
			end: 'bottom top',
			scrub: true,
		},
	});

	gsap.to('#scroll-indicator', {
		y: 10,
		repeat: -1,
		yoyo: true,
		duration: 0.8,
		ease: 'sine.inOut',
	});

	gsap.to('#scroll-indicator', {
		opacity: 0,
		ease: 'none',
		scrollTrigger: {
			trigger: hero,
			start: 'top top',
			end: '150px top',
			scrub: true,
		},
	});
</script>
```

- [ ] **Step 2: Install GSAP**

Run:
```bash
pnpm add gsap
```

- [ ] **Step 3: Manual verification in the browser**

Run: `astro dev --background`, open `http://localhost:4321` (temporarily rendering `<Hero />` alone in `src/pages/index.astro` if the homepage hasn't been assembled yet — Task 11 does the real assembly).
Checklist:
- Countdown blocks show real, changing numbers, updating every second.
- Each digit pulses briefly when it changes.
- Background image fills the viewport, no layout shift.
- Overlay visibly darkens as you scroll down through the hero.
- Scroll indicator bounces and fades out after ~150px of scroll.
Then: `astro dev stop`.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/components/Hero.astro
git commit -m "feat: add Hero component with live countdown and scroll effects"
```

---

### Task 7: News card component (`NewsCard.astro`)

**Files:**
- Create: `src/components/NewsCard.astro`

**Interfaces:**
- Produces: `NewsCard` component with props:
  - `variant: 'propio' | 'agregado'`
  - for `variant="propio"`: `title: string`, `description: string`, `href: string`, `coverSrc: ImageMetadata`, `coverAlt: string`, `pubDate: Date`
  - for `variant="agregado"`: `title: string`, `href: string`, `source: string`, `pubDate: Date | null`
  Consumed by Task 8 (`pages/noticias/index.astro`) and Task 11 (homepage preview).

- [ ] **Step 1: Build the dual-variant card**

```astro
---
// src/components/NewsCard.astro
import { Image } from 'astro:assets';

interface PropioProps {
	variant: 'propio';
	title: string;
	description: string;
	href: string;
	coverSrc: ImageMetadata;
	coverAlt: string;
	pubDate: Date;
}

interface AgregadoProps {
	variant: 'agregado';
	title: string;
	href: string;
	source: string;
	pubDate: Date | null;
}

type Props = PropioProps | AgregadoProps;

const props = Astro.props;

function formatDate(date: Date | null) {
	if (!date) return '';
	return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}
---

{
	props.variant === 'propio' ? (
		<a href={props.href} class="block rounded-lg bg-white/5 overflow-hidden hover:bg-white/10 transition-colors">
			<Image src={props.coverSrc} alt={props.coverAlt} class="h-40 w-full object-cover" widths={[400, 800]} sizes="(min-width: 768px) 400px, 100vw" />
			<div class="p-4">
				<p class="text-xs uppercase tracking-wide text-white/50">{formatDate(props.pubDate)}</p>
				<h3 class="mt-1 text-lg font-bold">{props.title}</h3>
				<p class="mt-2 text-sm text-white/70">{props.description}</p>
			</div>
		</a>
	) : (
		<a href={props.href} target="_blank" rel="noopener noreferrer" class="block rounded-lg border border-white/10 p-4 hover:bg-white/5 transition-colors">
			<p class="text-xs uppercase tracking-wide text-white/50">{props.source} · {formatDate(props.pubDate)}</p>
			<h3 class="mt-1 text-base font-semibold">{props.title}</h3>
		</a>
	)
}
```

- [ ] **Step 2: Manual verification**

Temporarily drop two `<NewsCard>` instances (one per variant, with fixture data) into `src/pages/index.astro`, run `astro dev --background`, confirm both render with distinct styling and correct links, then remove the temporary markup (Task 11 wires it up for real). `astro dev stop` when done.

- [ ] **Step 3: Commit**

```bash
git add src/components/NewsCard.astro
git commit -m "feat: add NewsCard component for own and aggregated news"
```

---

### Task 8: News listing page (`pages/noticias/index.astro`)

**Files:**
- Create: `src/lib/news.js`
- Test: `src/lib/news.test.js`
- Create: `src/pages/noticias/index.astro`

**Interfaces:**
- Consumes: `fetchAllFeeds` from `src/lib/rss.js` (Task 3); `getCollection('articulos')` (Task 4); `NewsCard` (Task 7); `Layout` (Task 5).
- Produces:
  - `FEEDS: Array<{ url: string, source: string }>` — the feed list.
  - `isGtaNews(item: { title?: string }): boolean` — pure keyword test used to keep only GTA-related headlines.
  - `fetchAggregated(feeds = FEEDS): Promise<Array<{title, link, pubDate, source}>>` — builds an `rss-parser` instance, delegates to `fetchAllFeeds`, and returns only items passing `isGtaNews`.
  - `mergeNews(articulos, aggregated): Array<{ kind: 'propio', date: Date, entry } | { kind: 'agregado', date: Date, item }>` — pure, sorted newest-first, drops aggregated items with a null `pubDate`.
  - route `/noticias` listing both sources merged by date, with a "Ver más noticias" reveal button.
- Task 11 imports `fetchAggregated` and `mergeNews` from this same module — do not duplicate the feed list or the merge logic in the page.

- [ ] **Step 1: Write the failing tests for the shared news module**

```javascript
// src/lib/news.test.js
import { describe, it, expect } from 'vitest';
import { mergeNews, isGtaNews, FEEDS } from './news.js';

const articulo = (title, pubDate) => ({ id: title, data: { title, pubDate: new Date(pubDate) } });
const agregado = (title, pubDate) => ({ title, link: `https://x/${title}`, pubDate: pubDate ? new Date(pubDate) : null, source: 'GameSpot' });

describe('FEEDS', () => {
  it('lists feeds as url/source pairs', () => {
    expect(FEEDS.length).toBeGreaterThan(0);
    for (const feed of FEEDS) {
      expect(typeof feed.url).toBe('string');
      expect(typeof feed.source).toBe('string');
    }
  });
});

describe('isGtaNews', () => {
  it('keeps titles mentioning GTA or Grand Theft Auto, in any casing', () => {
    expect(isGtaNews({ title: 'GTA 6 delayed again' })).toBe(true);
    expect(isGtaNews({ title: 'Everything we know about Grand Theft Auto 6' })).toBe(true);
    expect(isGtaNews({ title: 'rockstar confirms gta release window' })).toBe(true);
  });

  it('rejects unrelated gaming news', () => {
    expect(isGtaNews({ title: 'Fable delayed to 2027' })).toBe(false);
    expect(isGtaNews({ title: 'The best Steam Deck games' })).toBe(false);
  });

  it('rejects an item with no title instead of throwing', () => {
    expect(isGtaNews({})).toBe(false);
  });
});

describe('mergeNews', () => {
  it('merges both sources sorted newest first, tagging each entry', () => {
    const result = mergeNews(
      [articulo('propio-viejo', '2026-01-01'), articulo('propio-nuevo', '2026-03-01')],
      [agregado('agregado-medio', '2026-02-01')]
    );

    expect(result.map((r) => r.kind)).toEqual(['propio', 'agregado', 'propio']);
    expect(result[0].entry.data.title).toBe('propio-nuevo');
    expect(result[1].item.title).toBe('agregado-medio');
    expect(result[2].entry.data.title).toBe('propio-viejo');
  });

  it('drops aggregated items that have no date', () => {
    const result = mergeNews([], [agregado('sin-fecha', null), agregado('con-fecha', '2026-02-01')]);
    expect(result).toHaveLength(1);
    expect(result[0].item.title).toBe('con-fecha');
  });

  it('returns an empty array when there is nothing to show', () => {
    expect(mergeNews([], [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- news`
Expected: FAIL — `Cannot find module './news.js'`.

- [ ] **Step 3: Implement the shared news module**

Note on the feed URLs: these three were verified reachable by the controller on 2026-08-29 (all HTTP 200, valid RSS). The two URLs originally drafted in the spec were dead — Rockstar's `newswire.rss` returns 404 and IGN's tag feed returns 403 — so they were replaced. Do not silently swap these for others.

Note on the filter: these are general gaming feeds, not GTA-specific ones, so `fetchAggregated` filters by keyword. Without it a GTA 6 countdown site would list unrelated game news. At verification time GameSpot carried 19 GTA items out of 30 and Eurogamer 23 out of 100, so the filter has real material to work with.

```javascript
// src/lib/news.js
import Parser from 'rss-parser';
import { fetchAllFeeds } from './rss.js';

export const FEEDS = [
  { url: 'https://www.gamespot.com/feeds/news', source: 'GameSpot' },
  { url: 'https://www.eurogamer.net/feed', source: 'Eurogamer' },
  { url: 'https://www.vg247.com/feed', source: 'VG247' },
];

const GTA_PATTERN = /\b(gta|grand\s+theft\s+auto)\b/i;

export function isGtaNews(item) {
  return GTA_PATTERN.test(item.title ?? '');
}

export async function fetchAggregated(feeds = FEEDS) {
  const parser = new Parser();
  const items = await fetchAllFeeds(feeds, parser.parseURL.bind(parser));
  return items.filter(isGtaNews);
}

export function mergeNews(articulos, aggregated) {
  return [
    ...articulos.map((entry) => ({ kind: 'propio', date: entry.data.pubDate, entry })),
    ...aggregated
      .filter((item) => item.pubDate !== null)
      .map((item) => ({ kind: 'agregado', date: item.pubDate, item })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- news`
Expected: PASS, 7 tests (1 for `FEEDS`, 3 for `isGtaNews`, 3 for `mergeNews`).

- [ ] **Step 5: Build the listing page on top of the shared module**

```astro
---
// src/pages/noticias/index.astro
import { getCollection } from 'astro:content';
import Layout from '../../layouts/Layout.astro';
import NewsCard from '../../components/NewsCard.astro';
import { fetchAggregated, mergeNews } from '../../lib/news.js';

const aggregated = await fetchAggregated();
const articulos = await getCollection('articulos');
const merged = mergeNews(articulos, aggregated);

const INITIAL_COUNT = 9;
const visible = merged.slice(0, INITIAL_COUNT);
const rest = merged.slice(INITIAL_COUNT);
---

<Layout title="Noticias — GTA 6 Countdown" description="Artículos propios y últimas noticias sobre GTA VI.">
	<main class="mx-auto max-w-5xl px-4 py-16">
		<h1 class="text-3xl font-black uppercase mb-8">Noticias</h1>

		<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" id="news-grid">
			{visible.map((entry) =>
				entry.kind === 'propio' ? (
					<NewsCard
						variant="propio"
						title={entry.entry.data.title}
						description={entry.entry.data.description}
						href={`/noticias/${entry.entry.id}`}
						coverSrc={entry.entry.data.cover}
						coverAlt={entry.entry.data.coverAlt}
						pubDate={entry.entry.data.pubDate}
					/>
				) : (
					<NewsCard
						variant="agregado"
						title={entry.item.title}
						href={entry.item.link}
						source={entry.item.source}
						pubDate={entry.item.pubDate}
					/>
				)
			)}
		</div>

		{rest.length > 0 && (
			<>
				<div class="hidden grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4" id="news-grid-rest">
					{rest.map((entry) =>
						entry.kind === 'propio' ? (
							<NewsCard
								variant="propio"
								title={entry.entry.data.title}
								description={entry.entry.data.description}
								href={`/noticias/${entry.entry.id}`}
								coverSrc={entry.entry.data.cover}
								coverAlt={entry.entry.data.coverAlt}
								pubDate={entry.entry.data.pubDate}
							/>
						) : (
							<NewsCard
								variant="agregado"
								title={entry.item.title}
								href={entry.item.link}
								source={entry.item.source}
								pubDate={entry.item.pubDate}
							/>
						)
					)}
				</div>
				<button id="load-more" class="mt-8 mx-auto block rounded-full border border-white/20 px-6 py-2 text-sm uppercase tracking-wide hover:bg-white/10">
					Ver más noticias
				</button>
			</>
		)}
	</main>
</Layout>

<script>
	const button = document.getElementById('load-more');
	const rest = document.getElementById('news-grid-rest');
	button?.addEventListener('click', () => {
		rest?.classList.remove('hidden');
		rest?.classList.add('grid');
		button.remove();
	});
</script>
```

- [ ] **Step 6: Verify the build succeeds and the page renders**

Run:
```bash
pnpm build
```
Expected: build succeeds. A network failure fetching either feed must not fail the build (confirmed by Task 3's tests already covering `fetchAllFeeds`'s failure handling — this step confirms it end-to-end).

Then: `astro dev --background`, visit `http://localhost:4321/noticias`.
Checklist:
- The sample article from Task 4 appears as a "propio" card linking to `/noticias/bienvenida`.
- Aggregated items (if the feeds are reachable) appear as "agregado" cards linking out to the source, `target="_blank"`.
- If there are more than 9 items total, "Ver más noticias" reveals the rest and then disappears.
`astro dev stop` when done.

- [ ] **Step 7: Commit**

```bash
git add src/lib/news.js src/lib/news.test.js src/pages/noticias/index.astro
git commit -m "feat: add merged news listing page"
```

---

### Task 9: Article detail page (`pages/noticias/[slug].astro`)

**Files:**
- Create: `src/pages/noticias/[slug].astro`
- Modify: `package.json` (add `@tailwindcss/typography`)
- Modify: `src/styles/global.css` (register the typography plugin)

**Interfaces:**
- Consumes: `getCollection('articulos')`, `render()` from `astro:content` (Task 4); `Layout` (Task 5).
- Produces: route `/noticias/[slug]` for each entry in the `articulos` collection.

- [ ] **Step 1: Install and register the typography plugin**

The article body below uses `prose prose-invert`, which come from `@tailwindcss/typography`. Without the plugin those classes are inert and the article body renders unstyled.

Run:
```bash
pnpm add -D @tailwindcss/typography
```

Then add this line to `src/styles/global.css`, directly below the existing `@import "tailwindcss";` (Tailwind v4 registers plugins from CSS, not from a JS config file):

```css
@plugin "@tailwindcss/typography";
```

- [ ] **Step 2: Build the page with `getStaticPaths`**

```astro
---
// src/pages/noticias/[slug].astro
import { getCollection, render } from 'astro:content';
import { Image } from 'astro:assets';
import Layout from '../../layouts/Layout.astro';

export async function getStaticPaths() {
	const articulos = await getCollection('articulos');
	return articulos.map((entry) => ({
		params: { slug: entry.id },
		props: { entry },
	}));
}

const { entry } = Astro.props;
const { Content } = await render(entry);
---

<Layout title={`${entry.data.title} — GTA 6 Countdown`} description={entry.data.description}>
	<article class="mx-auto max-w-3xl px-4 py-16">
		<p class="text-xs uppercase tracking-wide text-white/50">
			{entry.data.author} · {entry.data.pubDate.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
		</p>
		<h1 class="mt-2 text-3xl font-black">{entry.data.title}</h1>
		<Image src={entry.data.cover} alt={entry.data.coverAlt} class="mt-6 w-full rounded-lg object-cover" widths={[600, 1200]} sizes="(min-width: 768px) 768px, 100vw" />
		<div class="prose prose-invert mt-8 max-w-none">
			<Content />
		</div>
	</article>
</Layout>
```

- [ ] **Step 3: Verify the build generates the static page**

Run: `pnpm build`
Expected: `dist/noticias/bienvenida/index.html` exists.

Run: `astro dev --background`, visit `http://localhost:4321/noticias/bienvenida`.
Checklist: title, author, date, cover image, and body content render correctly, and the body paragraphs pick up typography styling (readable line length and spacing, light text on the dark background) rather than browser defaults.
`astro dev stop` when done.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/styles/global.css src/pages/noticias/\[slug\].astro
git commit -m "feat: add article detail page"
```

---

### Task 10: Donations and Footer components

**Files:**
- Create: `src/components/Donations.astro`
- Create: `src/components/Footer.astro`

**Interfaces:**
- Produces: `Donations` component (no props) and `Footer` component (no props), both consumed by Task 11 (`pages/index.astro`).

- [ ] **Step 1: Build the Donations section with a Ko-fi link**

Note: replace `tu-usuario-kofi` with the team's real Ko-fi handle once created — this is a placeholder link, not placeholder logic, and is explicitly called out here rather than left implicit.

```astro
---
// src/components/Donations.astro
---

<section id="donaciones" class="mx-auto max-w-2xl px-4 py-20 text-center">
	<h2 class="text-2xl font-black uppercase">Ayudanos a llegar</h2>
	<p class="mt-4 text-white/70">
		Este sitio lo armamos para juntar plata y comprar una consola para jugar GTA VI
		apenas salga. Si te copa el proyecto, cualquier aporte suma.
	</p>
	<a
		href="https://ko-fi.com/tu-usuario-kofi"
		target="_blank"
		rel="noopener noreferrer"
		class="mt-6 inline-block rounded-full bg-red-600 px-8 py-3 font-bold uppercase tracking-wide hover:bg-red-500 transition-colors"
	>
		Donar en Ko-fi
	</a>
</section>
```

- [ ] **Step 2: Build the Footer**

```astro
---
// src/components/Footer.astro
const year = new Date().getFullYear();
---

<footer class="border-t border-white/10 px-4 py-8 text-center text-sm text-white/50">
	<p>© {year} GTA 6 Countdown. No afiliado con Rockstar Games o Take-Two Interactive.</p>
	<p class="mt-2">
		<a href="/noticias" class="underline hover:text-white">Noticias</a>
		<span class="mx-2">·</span>
		<a href="#donaciones" class="underline hover:text-white">Donaciones</a>
	</p>
</footer>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Donations.astro src/components/Footer.astro
git commit -m "feat: add Donations and Footer components"
```

---

### Task 11: Homepage assembly (`pages/index.astro`)

**Files:**
- Modify: `src/pages/index.astro` — it currently holds a standalone placeholder page (committed during setup so the build stayed green while `Layout.astro` gained required props). Replace its entire contents with the assembly below.

**Interfaces:**
- Consumes: `Layout` (Task 5), `Hero` (Task 6), `NewsCard` (Task 7), `Donations` and `Footer` (Task 10), and `fetchAggregated`/`mergeNews` from `src/lib/news.js` (Task 8) plus `getCollection('articulos')` (Task 4).

- [ ] **Step 1: Replace the stock homepage with the real assembly**

Note: the feed list and the merge logic live in `src/lib/news.js` (built in Task 8). Import them — do not redefine `FEEDS` or re-derive the merge here. The homepage differs from `/noticias` only in slicing the merged list down to a 3-item preview.

```astro
---
// src/pages/index.astro
import { getCollection } from 'astro:content';
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
import NewsCard from '../components/NewsCard.astro';
import Donations from '../components/Donations.astro';
import Footer from '../components/Footer.astro';
import { fetchAggregated, mergeNews } from '../lib/news.js';

const aggregated = await fetchAggregated();
const articulos = await getCollection('articulos');
const preview = mergeNews(articulos, aggregated).slice(0, 3);
---

<Layout title="GTA 6 Countdown" description="Cuenta regresiva al lanzamiento de GTA VI, noticias y comunidad.">
	<Hero />

	<section id="news-preview" class="mx-auto max-w-5xl px-4 py-20 opacity-0 translate-y-8">
		<h2 class="text-2xl font-black uppercase mb-8">Últimas noticias</h2>
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			{preview.map((entry) =>
				entry.kind === 'propio' ? (
					<NewsCard
						variant="propio"
						title={entry.entry.data.title}
						description={entry.entry.data.description}
						href={`/noticias/${entry.entry.id}`}
						coverSrc={entry.entry.data.cover}
						coverAlt={entry.entry.data.coverAlt}
						pubDate={entry.entry.data.pubDate}
					/>
				) : (
					<NewsCard
						variant="agregado"
						title={entry.item.title}
						href={entry.item.link}
						source={entry.item.source}
						pubDate={entry.item.pubDate}
					/>
				)
			)}
		</div>
		<a href="/noticias" class="mt-8 mx-auto block w-fit rounded-full border border-white/20 px-6 py-2 text-sm uppercase tracking-wide hover:bg-white/10">
			Ver más noticias
		</a>
	</section>

	<Donations />
	<Footer />
</Layout>

<script>
	import { gsap } from 'gsap';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';

	gsap.registerPlugin(ScrollTrigger);

	gsap.to('#news-preview', {
		opacity: 1,
		y: 0,
		duration: 0.8,
		ease: 'power2.out',
		scrollTrigger: {
			trigger: '#news-preview',
			start: 'top 80%',
		},
	});
</script>
```

- [ ] **Step 2: Confirm no placeholder scaffolding survives**

Run:
```bash
grep -rn "Welcome" src/ || echo "no Welcome references left"
grep -n "Placeholder homepage" src/pages/index.astro || echo "placeholder header gone"
```
Expected: both report absence. `src/components/Welcome.astro` was deleted during setup (commit `dee2163`); this step guards against the stock component or the setup placeholder comment surviving into the final homepage.

- [ ] **Step 3: Manual verification of the full homepage**

Run: `astro dev --background`, visit `http://localhost:4321/`.
Checklist (golden path):
- Hero renders full-screen with working countdown and scroll effects (re-verify per Task 6, now in the real page context).
- Scrolling past the hero fades the news preview section in.
- The 3 preview cards show a correct mix of propio/agregado styling.
- "Ver más noticias" link navigates to `/noticias`.
- Donations section renders with a working Ko-fi link (opens in a new tab).
- Footer renders with working anchor/internal links.

Edge cases:
- Temporarily empty the `articulos` collection (rename `bienvenida.md` aside) and reload — page must not crash with zero self-written articles, it should just show aggregated items. Restore the file afterward.
- Throttle network to simulate an unreachable RSS feed (or temporarily point `FEEDS` at an invalid URL) and rebuild — the page must still render using only `articulos`, per Task 3's failure handling. Revert the temporary change afterward.

`astro dev stop` when done.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: assemble homepage with hero, news preview, donations, footer"
```

---

### Task 12: Automated rebuild — GitHub Actions cron → Vercel Deploy Hook

**Files:**
- Create: `.github/workflows/rebuild-news.yml`

**Interfaces:**
- None (infrastructure only) — depends on a Vercel Deploy Hook URL that must be created manually in the Vercel project dashboard (Settings → Git → Deploy Hooks) and stored as a GitHub Actions secret named `VERCEL_DEPLOY_HOOK_URL`. This manual setup step cannot be scripted here since it requires an authenticated Vercel dashboard action — call it out to the user explicitly when this task comes up for execution.

- [ ] **Step 1: Write the workflow**

```yaml
# .github/workflows/rebuild-news.yml
name: Rebuild news every 6 hours

on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch: {}

jobs:
  trigger-rebuild:
    runs-on: ubuntu-latest
    steps:
      - name: Call Vercel Deploy Hook
        run: |
          curl -fsS -X POST "${{ secrets.VERCEL_DEPLOY_HOOK_URL }}"
```

- [ ] **Step 2: Document the manual secret setup**

This step is a note for whoever runs this task, not something to script:
1. In the Vercel dashboard, go to the project → Settings → Git → Deploy Hooks, create a hook (any name, `main` branch).
2. Copy the generated URL.
3. In the GitHub repo, go to Settings → Secrets and variables → Actions, add a secret named `VERCEL_DEPLOY_HOOK_URL` with that URL.

- [ ] **Step 3: Verify the workflow is valid YAML and the manual trigger works**

Run:
```bash
git add .github/workflows/rebuild-news.yml
git commit -m "chore: add scheduled news rebuild via GitHub Actions"
git push
```
Then, once the secret from Step 2 is set, trigger it manually from the GitHub Actions tab ("Run workflow" on `workflow_dispatch`) and confirm a new Vercel deployment starts.

---

### Task 13: Final verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: all `countdown.test.js` and `rss.test.js` tests pass.

- [ ] **Step 2: Run a full production build**

Run: `pnpm build`
Expected: build succeeds with no errors; `dist/` contains `index.html`, `noticias/index.html`, and `noticias/bienvenida/index.html`.

- [ ] **Step 3: Run `astro check`**

Run: `pnpm astro check`
Expected: no type errors.

- [ ] **Step 4: Full manual browser pass**

Run: `pnpm preview` (serves the `dist/` build), walk through:
- `/` — hero, countdown, scroll effects, news preview, donations, footer (golden path from Task 11, re-verified against the production build).
- `/noticias` — full listing, "Ver más noticias" reveal.
- `/noticias/bienvenida` — article detail renders correctly.
- Resize to a mobile viewport width and re-check the hero and news grid don't overflow or break.

Stop the preview server when done.

- [ ] **Step 5: Commit any fixes found during verification**

If Steps 1-4 surfaced any issue, fix it, re-run the relevant check, and commit with a message describing the fix — do not batch unrelated fixes into one commit.

