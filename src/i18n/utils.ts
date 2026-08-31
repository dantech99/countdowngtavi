// src/i18n/utils.ts
import { DEFAULT_LANG, LANGS, ui, type Lang, type UIKey } from './ui';

// Solo los idiomas distintos del default llevan prefijo en la URL.
const PREFIXED: readonly string[] = LANGS.filter((lang) => lang !== DEFAULT_LANG);

// Un artículo es exactamente /noticias/<slug>, un solo segmento. La barra
// final es opcional porque el build estático puede servir ambas formas.
const ARTICLE_PATH = /^\/noticias\/([^/]+)\/?$/;

// El idioma sale del primer segmento completo de la ruta. Comparar segmentos
// y no prefijos de string evita que "/english" se lea como inglés.
export function getLangFromUrl(pathname: string): Lang {
	const segment = pathname.split('/')[1];
	return PREFIXED.includes(segment) ? (segment as Lang) : DEFAULT_LANG;
}

export function stripLang(pathname: string): string {
	const lang = getLangFromUrl(pathname);
	if (lang === DEFAULT_LANG) return pathname;
	const rest = pathname.slice(lang.length + 1);
	return rest === '' ? '/' : rest;
}

export function localizePath(lang: Lang, path: string): string {
	const clean = path.startsWith('/') ? path : `/${path}`;
	if (lang === DEFAULT_LANG) return clean;
	// La raíz conserva la barra final: /en/ y no /en, que Vercel redirigiría.
	return clean === '/' ? `/${lang}/` : `/${lang}${clean}`;
}

// La contraparte real de esta ruta en el otro idioma, o null si no existe.
// Es lo que consume el hreflang, que no puede declarar traducciones falsas.
export function alternatePath(
	pathname: string,
	targetLang: Lang,
	translations: Map<string, string>,
): string | null {
	const currentLang = getLangFromUrl(pathname);
	const bare = stripLang(pathname);

	// Apuntar al idioma actual es la autorreferencia: el hreflang la necesita y
	// el switch la usa para el chip activo. Sin esta salida temprana, un
	// artículo traducido devolvería el slug de SU TRADUCCIÓN como si fuera el
	// propio (/noticias/welcome estando en /noticias/bienvenida), que es un 404.
	if (targetLang === currentLang) return localizePath(currentLang, bare);

	const article = bare.match(ARTICLE_PATH);

	if (article) {
		const counterpart = translations.get(`${currentLang}:${article[1]}`);
		return counterpart ? localizePath(targetLang, `/noticias/${counterpart}`) : null;
	}

	return localizePath(targetLang, bare);
}

// Lo que consume el switch. A diferencia del hreflang, siempre tiene que dar
// un destino navegable: un artículo sin traducir manda al índice de noticias
// del otro idioma en vez de a un 404.
export function switchLangPath(
	pathname: string,
	targetLang: Lang,
	translations: Map<string, string>,
): string {
	return alternatePath(pathname, targetLang, translations) ?? localizePath(targetLang, '/noticias');
}

export function useTranslations(lang: Lang) {
	return function t(key: UIKey, params?: Record<string, string | number>): string {
		let value: string = ui[lang][key];
		if (params) {
			for (const [name, replacement] of Object.entries(params)) {
				value = value.replaceAll(`{${name}}`, String(replacement));
			}
		}
		return value;
	};
}
