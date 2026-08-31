// src/lib/articulos.js
//
// El idioma de un artículo sale del directorio en el que vive, no de un campo
// del frontmatter: un `lang: en` dentro de es/ puede mentir, la ruta no.
export const LOCALE_DIRS = ['es', 'en'];

export function articleLang(id) {
  const dir = id.split('/')[0];
  if (!LOCALE_DIRS.includes(dir)) {
    throw new Error(
      `El artículo "${id}" no está dentro de un directorio de idioma. ` +
        `Muévelo a src/content/articulos/<${LOCALE_DIRS.join('|')}>/.`
    );
  }
  return dir;
}

export function articleSlug(id) {
  articleLang(id);
  const rest = id.split('/').slice(1);
  if (rest.length !== 1) {
    throw new Error(
      `El artículo "${id}" tiene que ser un solo segmento dentro del directorio ` +
        `de idioma: la ruta es [slug].astro y no atiende subdirectorios.`
    );
  }
  return rest[0];
}

export function byLang(entries, lang) {
  return entries.filter((entry) => articleLang(entry.id) === lang);
}

// Devuelve un Map de `${lang}:${slug}` al slug de la contraparte. Solo entran
// los artículos que tienen traducción; los que no, quedan fuera a propósito,
// porque es lo que deja al hreflang no declarar traducciones inexistentes.
export function buildTranslationIndex(entries) {
  const groups = new Map();

  for (const entry of entries) {
    const lang = articleLang(entry.id);
    const slug = articleSlug(entry.id);
    // El default al propio slug hace que dos archivos con el mismo nombre se
    // emparejen sin escribir nada en el frontmatter.
    const key = entry.data.translationKey ?? slug;
    if (!groups.has(key)) groups.set(key, new Map());
    groups.get(key).set(lang, slug);
  }

  const index = new Map();
  for (const langs of groups.values()) {
    for (const [lang, slug] of langs) {
      for (const [otherLang, otherSlug] of langs) {
        if (otherLang !== lang) index.set(`${lang}:${slug}`, otherSlug);
      }
    }
  }
  return index;
}
