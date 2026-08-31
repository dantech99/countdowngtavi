// src/i18n/ui.ts
export const DEFAULT_LANG = 'es';
export const LANGS = ['es', 'en'] as const;

export type Lang = (typeof LANGS)[number];

// El español se declara primero y su conjunto de claves define el contrato:
// `en` se valida contra él con `satisfies`, así que una clave que falte o
// sobre en inglés es un error de compilación, no un `undefined` en producción.
const es = {
	'site.name': 'GTA 6 Countdown',

	'home.title': 'GTA 6 Countdown',
	'home.description': 'Cuenta regresiva al lanzamiento de GTA VI, noticias y comunidad.',

	'hero.title': 'Cuenta regresiva a GTA VI',
	'hero.bgAlt': 'Arte de fondo de GTA VI',
	'hero.days': 'Días',
	'hero.hours': 'Horas',
	'hero.minutes': 'Minutos',
	'hero.seconds': 'Segundos',
	'hero.disclaimer':
		'Rockstar solo confirmó la fecha de lanzamiento, no la hora exacta de desbloqueo. El contador asume medianoche hora local.',

	'waitlist.heading': 'Súmate al lanzamiento',
	'waitlist.sub': 'Marca que vas a estar el día uno. Sin email, sin registro.',
	'waitlist.countOne': 'persona ya se sumó',
	'waitlist.countOther': 'personas ya se sumaron',
	'waitlist.cta': 'Me sumo',
	'waitlist.sending': 'Sumándote…',
	'waitlist.joined': 'Ya estás dentro ✓',
	'waitlist.error': 'No pudimos sumarte. Intenta de nuevo.',

	'trailers.heading': 'Trailers',
	'trailers.watch': 'Ver',
	'trailers.aria': 'Ver {title} en YouTube',

	'news.heading': 'Noticias',
	'news.latest': 'Últimas noticias',
	'news.more': 'Ver más noticias',
	'news.title': 'Noticias — GTA 6 Countdown',
	'news.description': 'Artículos propios y últimas noticias sobre GTA VI.',

	'donations.heading': 'Ayúdanos a llegar',
	'donations.body':
		'Hola, somos un grupo de amigos que queremos juntar dinero para comprar una consola para jugar GTA VI apenas salga. Si te gusta el proyecto, cualquier aporte suma.',
	'donations.cta': 'Donar con PayPal',

	'footer.disclaimer': 'No afiliado con Rockstar Games o Take-Two Interactive.',

	'nav.home': 'Inicio',
	'nav.news': 'Noticias',
	'nav.waitlist': 'Lista de espera',
	'nav.donations': 'Donaciones',

	'music.enable': 'Activar música ambiental',
	'music.mute': 'Silenciar música ambiental',
	'music.title': 'Música ambiental',
	'music.on': 'Música encendida',
	'music.off': 'Música apagada',

	'lang.switch': 'Cambiar idioma',
} as const;

export type UIKey = keyof typeof es;

const en = {
	'site.name': 'GTA 6 Countdown',

	'home.title': 'GTA 6 Countdown',
	'home.description': 'Countdown to the GTA VI release, news and community.',

	'hero.title': 'GTA VI Countdown',
	'hero.bgAlt': 'GTA VI background art',
	'hero.days': 'Days',
	'hero.hours': 'Hours',
	'hero.minutes': 'Minutes',
	'hero.seconds': 'Seconds',
	'hero.disclaimer':
		'Rockstar only confirmed the release date, not the exact unlock time. The counter assumes midnight local time.',

	'waitlist.heading': 'Join the launch',
	'waitlist.sub': "Mark that you'll be there on day one. No email, no signup.",
	'waitlist.countOne': 'person has joined',
	'waitlist.countOther': 'people have joined',
	'waitlist.cta': "I'm in",
	'waitlist.sending': 'Joining…',
	'waitlist.joined': "You're in ✓",
	'waitlist.error': "We couldn't add you. Try again.",

	'trailers.heading': 'Trailers',
	'trailers.watch': 'Watch',
	'trailers.aria': 'Watch {title} on YouTube',

	'news.heading': 'News',
	'news.latest': 'Latest news',
	'news.more': 'See more news',
	'news.title': 'News — GTA 6 Countdown',
	'news.description': 'Our own articles and the latest GTA VI news.',

	'donations.heading': 'Help us get there',
	'donations.body':
		"Hi, we're a group of friends trying to raise money for a console so we can play GTA VI the day it drops. If you like the project, anything helps.",
	'donations.cta': 'Donate with PayPal',

	'footer.disclaimer': 'Not affiliated with Rockstar Games or Take-Two Interactive.',

	'nav.home': 'Home',
	'nav.news': 'News',
	'nav.waitlist': 'Waitlist',
	'nav.donations': 'Donations',

	'music.enable': 'Turn on ambient music',
	'music.mute': 'Mute ambient music',
	'music.title': 'Ambient music',
	'music.on': 'Music on',
	'music.off': 'Music off',

	'lang.switch': 'Change language',
} satisfies Record<UIKey, string>;

export const ui = { es, en } as const;
