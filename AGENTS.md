## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Variables de entorno

La lista de espera (`/api/waitlist`) necesita un store de Upstash Redis:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Ambas se provisionan desde el Vercel Marketplace (`vercel integration add`), que las inyecta automáticamente en el entorno de Vercel. Para desarrollo local, cópialas a un `.env` (ya está en `.gitignore`) desde el dashboard de Upstash o con `vercel env pull`. Ver `.env.example` para los nombres exactos.

Ambas están declaradas como opcionales en el schema de `astro:env` (`astro.config.mjs`), así que un clon nuevo sin `.env` sigue compilando. En ese caso `/api/waitlist` responde `503 { "error": "unavailable" }` en cualquier método: es el comportamiento esperado, no un error, y desaparece en cuanto las dos variables están presentes.

## Idiomas

El sitio es bilingüe: español sin prefijo (`/noticias`) e inglés bajo `/en/`
(`/en/noticias`). Las tres páginas se generan desde `src/pages/[...locale]/`, donde
`locale: undefined` produce la ruta española y `locale: 'en'` la inglesa.

- **Todo el texto de UI vive en `src/i18n/ui.ts`.** El objeto `en` se valida contra las
  claves de `es` con `satisfies`, así que una clave que falte o sobre en inglés es un
  error que `astro check` detecta. No hardcodees texto en los componentes.
- **El idioma se deriva siempre de la URL** con `getLangFromUrl(Astro.url.pathname)`,
  nunca de una prop ni de `Astro.currentLocale`. Un solo camino de código, con tests en
  `src/i18n/utils.test.ts`.
- **Los `<script>` de Astro no pueden importar del frontmatter.** Los textos que necesita
  el JS del cliente se pasan por atributos `data-*` en el elemento sobre el que el script
  ya opera. Ver `Waitlist.astro` y `MusicToggle.astro`.
- **Los artículos van en `src/content/articulos/es/` o `en/`**, y las imágenes compartidas
  en `_assets/`. El idioma sale del directorio, no del frontmatter; un `.md` fuera de un
  directorio de idioma rompe el build a propósito. Para emparejar dos artículos con slugs
  distintos, usa `translationKey` en el que no coincide.
- **Detección de idioma:** un script inline en el `<head>` del Layout, solo en `/`.
  Redirige a `/en/` si el navegador pide inglés y no hay preferencia guardada. Solo el
  switch escribe `localStorage['gta6:lang']`; la detección nunca escribe.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
