import { describe, expect, it } from 'vitest';
import { articleLang, articleSlug, byLang, buildTranslationIndex } from './articulos.js';

// Forma mínima de una entrada de colección: solo id y data. Los helpers no
// necesitan Astro, así que se testean con objetos planos.
const entry = (id, data = {}) => ({ id, data });

describe('articleLang', () => {
  it('deriva el idioma del directorio', () => {
    expect(articleLang('es/bienvenida')).toBe('es');
    expect(articleLang('en/welcome')).toBe('en');
  });

  // Un artículo mal ubicado desaparecería del sitio sin avisar, que es peor
  // fallo que un build roto. Por eso lanza en vez de devolver null.
  it('lanza si el artículo no está en un directorio de idioma', () => {
    expect(() => articleLang('bienvenida')).toThrow(/directorio de idioma/);
    expect(() => articleLang('borradores/algo')).toThrow(/directorio de idioma/);
  });
});

describe('articleSlug', () => {
  it('quita el directorio de idioma', () => {
    expect(articleSlug('es/bienvenida')).toBe('bienvenida');
    expect(articleSlug('en/welcome')).toBe('welcome');
  });

  // El slug es un solo segmento: la ruta es [slug].astro y ARTICLE_PATH en
  // i18n/utils.ts también asume un segmento. Un .md anidado más hondo
  // generaría una URL que ninguna ruta atiende.
  it('lanza si el artículo está anidado más allá del directorio de idioma', () => {
    expect(() => articleSlug('es/2026/analisis')).toThrow(/un solo segmento/);
  });
});

describe('byLang', () => {
  it('filtra las entradas del idioma pedido', () => {
    const entries = [entry('es/bienvenida'), entry('en/welcome'), entry('es/otro')];
    expect(byLang(entries, 'es').map((e) => e.id)).toEqual(['es/bienvenida', 'es/otro']);
    expect(byLang(entries, 'en').map((e) => e.id)).toEqual(['en/welcome']);
  });
});

describe('buildTranslationIndex', () => {
  it('empareja por translationKey explícito', () => {
    const index = buildTranslationIndex([
      entry('es/bienvenida'),
      entry('en/welcome', { translationKey: 'bienvenida' }),
    ]);
    expect(index.get('es:bienvenida')).toBe('welcome');
    expect(index.get('en:welcome')).toBe('bienvenida');
  });

  // El default al propio slug es lo que permite no escribir nada en el
  // frontmatter cuando el slug es igual en los dos idiomas.
  it('empareja por slug igual cuando no hay translationKey', () => {
    const index = buildTranslationIndex([entry('es/trailer-2'), entry('en/trailer-2')]);
    expect(index.get('es:trailer-2')).toBe('trailer-2');
    expect(index.get('en:trailer-2')).toBe('trailer-2');
  });

  it('no registra nada para un artículo sin contraparte', () => {
    const index = buildTranslationIndex([entry('es/solo-en-espanol')]);
    expect(index.get('es:solo-en-espanol')).toBeUndefined();
    expect(index.size).toBe(0);
  });
});
