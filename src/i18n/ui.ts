// src/i18n/ui.ts
export const DEFAULT_LANG = 'es';
export const LANGS = ['es', 'en'] as const;

export type Lang = (typeof LANGS)[number];

// El español se declara primero y su conjunto de claves define el contrato:
// `en` se valida contra él con `satisfies`, así que una clave que falte o
// sobre en inglés es un error de compilación, no un `undefined` en producción.
const es = {
	'site.name': 'GTA 6 Countdown',

	'home.title': 'GTA 6 Countdown: Cuenta Regresiva y Fecha de Lanzamiento',
	'home.description':
		'Cuenta regresiva en tiempo real al lanzamiento de GTA VI, el 19 de noviembre de 2026. Últimas noticias, trailers y una comunidad esperando el día uno.',

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
	'donations.secure': 'Pago seguro procesado por PayPal',

	'privacy.title': 'Privacidad — GTA 6 Countdown',
	'privacy.heading': 'Política de privacidad',
	'privacy.description': 'Qué datos recolecta GTA 6 Countdown y cómo los usamos.',
	'privacy.updated': 'Última actualización: 1 de septiembre de 2026',
	'privacy.intro':
		'Este sitio es un proyecto de fans, sin afiliación con Rockstar Games. Esta página explica qué datos recolectamos y para qué.',
	'privacy.waitlistHeading': 'Lista de espera',
	'privacy.waitlistBody':
		'Sumarte no pide email ni registro: el botón genera un identificador aleatorio en tu navegador (localStorage) que solo sirve para contar cuánta gente se sumó y evitar que un mismo visitante cuente dos veces. Ese identificador no está asociado a tu nombre, email o cualquier otro dato personal.',
	'privacy.adsHeading': 'Publicidad',
	'privacy.adsBody':
		'Mostramos anuncios de Google AdSense, que puede usar cookies para personalizar los anuncios que ves. Puedes revisar y ajustar esas preferencias en la configuración de anuncios de Google.',
	'privacy.analyticsHeading': 'Analítica',
	'privacy.analyticsBody':
		'Usamos Vercel Analytics para entender cuánta gente visita el sitio. Es una analítica sin cookies que no identifica visitantes individuales.',
	'privacy.donationsHeading': 'Donaciones',
	'privacy.donationsBody':
		'El botón de donaciones te lleva directo a PayPal: nosotros no vemos ni guardamos ningún dato de pago.',

	'footer.disclaimer': 'No afiliado con Rockstar Games o Take-Two Interactive.',

	'nav.home': 'Inicio',
	'nav.news': 'Noticias',
	'nav.waitlist': 'Lista de espera',
	'nav.donations': 'Donaciones',
	'nav.privacy': 'Privacidad',

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

	'home.title': 'GTA 6 Countdown: Release Date & Countdown Timer',
	'home.description':
		'Real-time countdown to the GTA VI release on November 19, 2026. Latest news, trailers, and a community counting down to day one.',

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
	'donations.secure': 'Secure payment processed by PayPal',

	'privacy.title': 'Privacy — GTA 6 Countdown',
	'privacy.heading': 'Privacy Policy',
	'privacy.description': 'What data GTA 6 Countdown collects and how we use it.',
	'privacy.updated': 'Last updated: September 1, 2026',
	'privacy.intro':
		'This site is a fan project, not affiliated with Rockstar Games. This page explains what data we collect and why.',
	'privacy.waitlistHeading': 'Waitlist',
	'privacy.waitlistBody':
		"Joining doesn't ask for an email or signup: the button generates a random identifier in your browser (localStorage) that's only used to count how many people joined and to stop the same visitor from counting twice. That identifier isn't tied to your name, email, or any other personal data.",
	'privacy.adsHeading': 'Advertising',
	'privacy.adsBody':
		"We show ads through Google AdSense, which may use cookies to personalize the ads you see. You can review and adjust those preferences in Google's ad settings.",
	'privacy.analyticsHeading': 'Analytics',
	'privacy.analyticsBody':
		"We use Vercel Analytics to understand how many people visit the site. It's cookie-free analytics that doesn't identify individual visitors.",
	'privacy.donationsHeading': 'Donations',
	'privacy.donationsBody':
		'The donate button takes you straight to PayPal: we never see or store any payment data.',

	'footer.disclaimer': 'Not affiliated with Rockstar Games or Take-Two Interactive.',

	'nav.home': 'Home',
	'nav.news': 'News',
	'nav.waitlist': 'Waitlist',
	'nav.donations': 'Donations',
	'nav.privacy': 'Privacy',

	'music.enable': 'Turn on ambient music',
	'music.mute': 'Mute ambient music',
	'music.title': 'Ambient music',
	'music.on': 'Music on',
	'music.off': 'Music off',

	'lang.switch': 'Change language',
} satisfies Record<UIKey, string>;

export const ui = { es, en } as const;
