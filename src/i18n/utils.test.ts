import { describe, expect, it } from 'vitest';
import {
	alternatePath,
	getLangFromUrl,
	localizePath,
	stripLang,
	switchLangPath,
	useTranslations,
} from './utils';

// 'es:bienvenida' -> 'welcome' significa: estando en el artículo español
// "bienvenida", su contraparte en el otro idioma tiene el slug "welcome".
const TRANSLATIONS = new Map([
	['es:bienvenida', 'welcome'],
	['en:welcome', 'bienvenida'],
]);

describe('getLangFromUrl', () => {
	it('trata las rutas sin prefijo como el idioma por defecto', () => {
		expect(getLangFromUrl('/')).toBe('es');
		expect(getLangFromUrl('/noticias')).toBe('es');
		expect(getLangFromUrl('/noticias/bienvenida')).toBe('es');
	});

	it('reconoce el prefijo del idioma no-default', () => {
		expect(getLangFromUrl('/en/')).toBe('en');
		expect(getLangFromUrl('/en/noticias')).toBe('en');
	});

	// "english" empieza con "en" pero no es el prefijo: el match es por
	// segmento completo, no por prefijo de string.
	it('no confunde un segmento que solo empieza igual', () => {
		expect(getLangFromUrl('/english')).toBe('es');
		expect(getLangFromUrl('/entrevistas')).toBe('es');
	});
});

describe('stripLang', () => {
	it('quita el prefijo de idioma', () => {
		expect(stripLang('/en/')).toBe('/');
		expect(stripLang('/en/noticias')).toBe('/noticias');
	});

	it('deja intactas las rutas del idioma por defecto', () => {
		expect(stripLang('/')).toBe('/');
		expect(stripLang('/noticias')).toBe('/noticias');
	});
});

describe('localizePath', () => {
	it('no prefija el idioma por defecto', () => {
		expect(localizePath('es', '/')).toBe('/');
		expect(localizePath('es', '/noticias')).toBe('/noticias');
	});

	it('prefija el idioma no-default y conserva la barra en la raíz', () => {
		expect(localizePath('en', '/')).toBe('/en/');
		expect(localizePath('en', '/noticias')).toBe('/en/noticias');
	});
});

describe('alternatePath', () => {
	it('mapea las páginas fijas de un idioma al otro', () => {
		expect(alternatePath('/', 'en', TRANSLATIONS)).toBe('/en/');
		expect(alternatePath('/noticias', 'en', TRANSLATIONS)).toBe('/en/noticias');
		expect(alternatePath('/en/noticias', 'es', TRANSLATIONS)).toBe('/noticias');
	});

	it('mapea un artículo a su traducción', () => {
		expect(alternatePath('/noticias/bienvenida', 'en', TRANSLATIONS)).toBe('/en/noticias/welcome');
		expect(alternatePath('/en/noticias/welcome', 'es', TRANSLATIONS)).toBe('/noticias/bienvenida');
	});

	// Es la diferencia central con switchLangPath: el hreflang prefiere no
	// declarar nada antes que declarar una traducción que no existe.
	it('devuelve null para un artículo sin traducción', () => {
		expect(alternatePath('/noticias/otro', 'en', TRANSLATIONS)).toBeNull();
	});

	// La autorreferencia tiene que devolver la ruta tal cual. Sin el caso
	// especial, un artículo traducido devolvía el slug de su traducción.
	it('apuntar al idioma actual devuelve la ruta actual', () => {
		expect(alternatePath('/noticias/bienvenida', 'es', TRANSLATIONS)).toBe('/noticias/bienvenida');
		expect(alternatePath('/en/noticias/welcome', 'en', TRANSLATIONS)).toBe('/en/noticias/welcome');
		expect(alternatePath('/noticias/otro', 'es', TRANSLATIONS)).toBe('/noticias/otro');
	});
});

describe('switchLangPath', () => {
	it('coincide con alternatePath cuando la traducción existe', () => {
		expect(switchLangPath('/noticias/bienvenida', 'en', TRANSLATIONS)).toBe('/en/noticias/welcome');
		expect(switchLangPath('/', 'en', TRANSLATIONS)).toBe('/en/');
	});

	// El switch prioriza que el usuario no choque con un 404: cae al índice
	// de noticias del idioma destino en vez de devolver nada.
	it('cae al índice de noticias cuando el artículo no está traducido', () => {
		expect(switchLangPath('/noticias/otro', 'en', TRANSLATIONS)).toBe('/en/noticias');
		expect(switchLangPath('/en/noticias/other', 'es', TRANSLATIONS)).toBe('/noticias');
	});

	// El chip activo del switch usa esta misma función, así que tiene que
	// quedarse donde está en vez de saltar al slug de la traducción.
	it('apuntar al idioma actual devuelve la misma ruta', () => {
		expect(switchLangPath('/noticias', 'es', TRANSLATIONS)).toBe('/noticias');
		expect(switchLangPath('/noticias/bienvenida', 'es', TRANSLATIONS)).toBe('/noticias/bienvenida');
	});
});

describe('useTranslations', () => {
	it('devuelve el texto del idioma pedido', () => {
		expect(useTranslations('es')('nav.news')).toBe('Noticias');
		expect(useTranslations('en')('nav.news')).toBe('News');
	});

	it('interpola parámetros', () => {
		expect(useTranslations('en')('trailers.aria', { title: 'Trailer 2' })).toBe(
			'Watch Trailer 2 on YouTube',
		);
	});
});
