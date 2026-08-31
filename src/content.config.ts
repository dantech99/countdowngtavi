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
      // Empareja un artículo con su traducción. Opcional: si se omite, el
      // emparejamiento cae al propio slug, que basta cuando el nombre del
      // archivo es igual en los dos idiomas.
      translationKey: z.string().optional(),
    }),
});

export const collections = { articulos };
