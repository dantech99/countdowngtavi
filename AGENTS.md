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

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
