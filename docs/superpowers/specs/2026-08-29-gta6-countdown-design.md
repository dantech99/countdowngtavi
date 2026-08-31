---

---
# GTA 6 Countdown — Diseño

## Contexto y objetivo

Landing page estática con contador regresivo al lanzamiento de GTA VI, sección de noticias (artículos propios + agregación de terceros) y sección de donaciones. Proyecto desarrollado por el usuario junto con amigos.

**Objetivo del proyecto:** generar ingresos (ads + donaciones) para comprar una consola y jugar el juego al lanzamiento.

**Fecha objetivo del contador:** 2026-11-19T00:00:00, en la zona horaria local del usuario. Rockstar solo confirmó la fecha, no la hora exacta de desbloqueo — el sitio debe mostrar esta aclaración de forma visible cerca del contador.

**Diferenciación competitiva:** ya existen countdown sites genéricos de GTA 6. Este proyecto se diferencia por diseño cuidado estilo Rockstar con animaciones de scroll, y contenido original (artículos propios) en vez de solo agregación — lo cual además es la base legal/de monetización para AdSense (ver sección de noticias).

## Stack técnico

- **Astro** (`^7.2.9`) — sitio estático.
- **Tailwind CSS v4**, instalado vía `npx astro add tailwind` (usa el plugin oficial de Vite; el integration `@astrojs/tailwind` está deprecado desde Tailwind v4).
- **GSAP + ScrollTrigger**, como dependencia npm estándar, usada dentro de `<script>` tags en componentes Astro (no en el frontmatter, que corre en build-time sin DOM).
- **Astro Content Collections** para los artículos propios, con el helper `image()` en el schema para validar y optimizar la imagen de portada.
- `**rss-parser**` (o librería equivalente) para leer feeds RSS de medios de gaming/GTA en build-time.
- **PayPal.me** como enlace directo para donaciones puntuales.
- **Vercel** como hosting, con un Cron Job (`vercel.json`) que dispara un Deploy Hook cada 6 horas para refrescar noticias.

## Estructura de carpetas

```
src/
├── content.config.ts       # collection "articulos": loader glob(), schema: title, date, author, cover: image(), coverAlt
├── content/
│   └── articulos/
│       └── *.md (o .mdx)  # artículos propios, imágenes locales junto al archivo
├── components/
│   ├── Hero.astro          # héroe full-viewport + contador
│   ├── NewsCard.astro      # tarjeta de noticia, prop `variant` (propio | agregado)
│   ├── Donations.astro
│   └── Footer.astro
├── layouts/
│   └── Layout.astro        # head, meta/SEO, estilos globales
├── pages/
│   ├── index.astro
│   └── noticias/
│       ├── index.astro     # listado combinado, paginado
│       └── [slug].astro    # getStaticPaths sobre la content collection
└── lib/
    ├── countdown.js         # cálculo puro de tiempo restante, sin DOM
    └── rss.js                # fetch + normalización de feeds RSS
```

## Diseño / UX

### Header (Hero)

- Ocupa el 100% del alto de viewport.
- Imagen de fondo (key art de GTA) con `cover` y overlay oscuro sutil. Es la única sección con imagen de fondo fija de la página.
- Tipografía grande, estilo Rockstar (condensada, mayúsculas).
- Contador centrado vertical y horizontalmente, con la aclaración de fecha/hora mencionada arriba.
- Indicador de scroll animado al final del header.

### Scroll / transiciones

- Implementado con GSAP + ScrollTrigger.
- El overlay oscuro del header se intensifica progresivamente con el scroll (`scrub`).
- La sección de noticias entra con fade + desplazamiento hacia arriba.
- Fondo oscuro semitransparente en las secciones siguientes al header.

### Contador

- `lib/countdown.js` expone una función pura `getTimeRemaining(targetDate)` → `{ days, hours, minutes, seconds }`, sin dependencias de DOM, testeable de forma aislada.
- Un `<script>` en `Hero.astro` corre `setInterval` cada 1s, actualiza el DOM y anima el cambio de cada dígito con GSAP.
- 4 bloques: días, horas, minutos, segundos.

### Orden de secciones en la página

1. Header con contador (full screen).
2. Noticias (fade-in progresivo al hacer scroll).
3. Botón "Ver más noticias".
4. Donaciones (al final).

## Noticias

### Artículos propios

- Gestionados con Astro Content Collections (`src/content.config.ts` + `src/content/articulos/`), usando el loader `glob()` de `astro/loaders` (requerido desde Astro v6 en adelante — verificado en docs oficiales).
- Schema con `image()` para la portada — Astro la valida y optimiza vía `astro:assets`.
- Imágenes dentro del cuerpo del artículo: sintaxis Markdown estándar (`![alt](./foto.png)`) con la imagen junto al archivo — Astro las optimiza automáticamente.
- Este es el contenido que sostiene la aprobación de AdSense (contenido original con opinión/análisis propio).

### Noticias agregadas de terceros

- Fuente: feeds RSS de medios de gaming/GTA (URLs concretas a definir en implementación — ej. Rockstar Newswire, IGN).
- `lib/rss.js` parsea los feeds y normaliza a `{ title, link, pubDate, source }`. **Nunca** se republica contenido completo — solo titular + link de vuelta a la fuente, para evitar el problema legal/de contenido duplicado que penaliza AdSense.
- Fetch ocurre en build-time (top-level await en `pages/noticias/index.astro` o similar), no client-side — los feeds RSS típicamente no exponen CORS para fetch desde navegador.
- Si un feed individual falla, no debe tumbar el build entero: usar `Promise.allSettled`, loguear warning, omitir ese feed en esa corrida.

### Listado combinado

- `pages/noticias/index.astro` mezcla artículos propios (via `getCollection('articulos')`) y agregados por fecha, con paginación ("Ver más noticias").

## Rebuild automático

- Sitio estático puro — sin SSR ni servidor corriendo, sin adapter de Vercel.
- **Corrección tras verificar en docs de Vercel:** los Cron Jobs de `vercel.json` solo pueden apuntar a una ruta dentro del propio proyecto (una función serverless) — no pueden golpear una URL externa como un Deploy Hook directamente. Usar Vercel Cron para esto obligaría a agregar una función serverless solo para este propósito, lo cual contradice "sitio estático puro".
- En su lugar: un workflow de **GitHub Actions** con trigger `schedule` (cron cada 6h) hace un `curl -X POST` al Vercel Deploy Hook (URL guardada como GitHub Secret, nunca en el repo). Vercel sigue siendo el hosting; el disparador del rebuild vive en GitHub Actions.

## Donaciones

- Sección `Donations.astro` con un botón que enlaza a PayPal.me (sin scripts de terceros, setup simple, sin cuenta de empresa).

## Testing

- `countdown.js`: tests unitarios (Vitest) sobre `getTimeRemaining`, casos límite incluidos (fecha ya pasada, exactamente en el límite de una unidad).
- `rss.js`: tests unitarios sobre la función de normalización de items (no sobre el fetch de red real).
- Animaciones GSAP/ScrollTrigger: verificación visual manual en navegador — no se automatiza.

## Pendiente para la fase de implementación

- URLs concretas de los feeds RSS a incluir.
- Copy y estrategia editorial de los primeros artículos propios.
- Key art / assets de fondo para el Hero (verificar licencia de uso).

