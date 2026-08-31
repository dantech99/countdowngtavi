# Lista de espera — Diseño

## Contexto y objetivo

La home ya tiene contador, trailers, noticias y donaciones, pero no ofrece ninguna forma de que un visitante deje constancia de que va a estar el día del lanzamiento. La lista de espera cubre ese hueco: un botón que el visitante marca para sumarse, y un contador público de cuánta gente se sumó.

**Decisión de alcance:** no se piden emails ni ningún otro dato personal. El proyecto no tiene infraestructura de envío de correo ni política de privacidad, y montar ambas para un aviso único no se justifica. Lo que se guarda es un identificador anónimo generado en el navegador, sin valor fuera de este sitio.

**Qué gana el sitio:** prueba social visible (un número que crece) y una acción de bajo compromiso para el visitante, que es la única conversión que la home ofrece además de donar.

## Alcance

**Dentro:**

- Sección `#waitlist` en la home con botón y contador global.
- Un endpoint on-demand que guarda ids anónimos y devuelve el total.
- Deduplicación: el mismo navegador no cuenta dos veces.
- Persistencia del estado en el navegador, para que el botón aparezca ya marcado en visitas siguientes.

**Fuera, deliberadamente:**

- Captura de email, envío de notificaciones, newsletter.
- Rate limiting por IP, captcha, verificación tipo Turnstile.
- Panel de administración o exportación de la lista.
- Cualquier rediseño de las secciones existentes. Lo único que se toca fuera de la sección nueva es montarla en `index.astro` y sumar su enlace al footer.

**Consecuencia aceptada del anti-abuso ausente:** alguien con un script puede inflar el contador, y alguien en ventana de incógnito puede sumarse más de una vez. Es una decisión tomada, no un descuido. La deduplicación por navegador frena la duplicación accidental y el spam de F5, que es el caso real. El endpoint queda estructurado de forma que agregar rate limiting después no exige rehacer el flujo.

## Stack

- **`@astrojs/vercel` `^11.0.8`** como adapter. Su peer dependency es `astro: ^7.0.0`, compatible con el `astro ^7.2.9` del proyecto. Se importa por default (`import vercel from '@astrojs/vercel'`); la ruta `/serverless` ya no existe en esta versión.
- **`@upstash/redis` `^1.38.3`** como cliente. Habla HTTP/REST, no TCP, que es lo que lo hace viable dentro de una función serverless: no mantiene conexiones abiertas.
- **Upstash Redis** provisionado desde el Vercel Marketplace (`vercel integration add`), que conecta el recurso al proyecto e inyecta las variables de entorno automáticamente.

No se agrega ninguna otra dependencia. No hay servidor Redis que administrar, ni esquema, ni migraciones.

### Por qué Redis y no otra cosa

Un contador global compartido necesita escrituras atómicas. Las alternativas disponibles en la plataforma fallan en eso o cuestan más:

- **Vercel Blob** (un JSON con el número): sin incremento atómico. Dos clics simultáneos se pisan. Descartado por correctitud.
- **Edge Config**: optimizado para lectura, con escrituras por API limitadas y propagación diferida. Está pensado para feature flags.
- **Postgres vía Marketplace**: funciona, pero aporta tabla, SQL y migraciones para almacenar una lista de UUIDs.
- **Supabase desde el navegador, sin adapter**: mantiene el sitio 100% estático, pero expone la anon key en el bundle, así que cualquiera inserta filas con `curl` sin pasar por la UI, y no deja ninguna capa donde interponer defensas más adelante.

`SADD` sobre un set resuelve inserción y deduplicación en una sola operación atómica, y `SCARD` da el total. Es la estructura de datos exacta del problema.

## Arquitectura

### Archivos

| Archivo | Estado | Rol |
|---|---|---|
| `src/lib/waitlist.js` | nuevo | Lógica pura: validación de id y operaciones sobre una interfaz de store abstracta. Sin red, sin Astro, sin DOM. |
| `src/lib/waitlist.test.js` | nuevo | Vitest con un store en memoria. |
| `src/pages/api/waitlist.ts` | nuevo | Endpoint on-demand. Cablea el cliente Upstash a la lógica pura. |
| `src/components/Waitlist.astro` | nuevo | Markup y script de cliente. |
| `astro.config.mjs` | modificado | Adapter de Vercel y schema de `astro:env`. |
| `src/pages/index.astro` | modificado | Monta la sección y su animación de entrada. |
| `src/components/Footer.astro` | modificado | Enlace `#waitlist` en la navegación del pie. |

### Renderizado

El proyecto queda en `output: 'static'` (el default). El único archivo con `export const prerender = false` es el endpoint. Home, `/noticias`, los artículos y todo lo demás se siguen generando en build exactamente como hoy.

El rebuild de noticias cada 6 horas por deploy hook no se ve afectado.

### Modelo de datos

Una sola clave en Redis:

```
waitlist:members  →  Set<uuid-v4>
```

El contador **es** el cardinal del set. No existe un contador separado, así que no hay dos valores que puedan desincronizarse ni una transacción que coordinar. `SADD` devuelve `1` si el miembro es nuevo y `0` si ya estaba, lo que hace la deduplicación atómica sin lectura previa.

### Identidad del visitante

El navegador genera un UUID v4 con `crypto.randomUUID()` la primera vez que el visitante se suma, y lo guarda en `localStorage` bajo la clave `gta6:waitlist`, siguiendo la convención de `gta6:music`. El acceso a `localStorage` va envuelto en `try/catch`, como ya hace `MusicToggle.astro`: la navegación privada puede rechazar el almacenamiento, y en ese caso el botón debe seguir funcionando aunque no se recuerde el estado.

El id no se asocia a ninguna otra información. No identifica a una persona fuera de este sitio.

El estado guardado en el navegador es cosmético: sirve para pintar el botón como ya marcado al volver. La verdad está en el set de Redis, y como el `POST` es idempotente, un cliente que reintente con su mismo id nunca infla el número.

### Contrato del endpoint

**`GET /api/waitlist`**

```json
{ "count": 1247 }
```

Responde con `Cache-Control: public, s-maxage=30`, para que el edge de Vercel sirva el número cacheado y no despierte una función en cada visita. Un desfase de hasta 30 segundos no tiene consecuencia aquí, y quien acaba de sumarse ve el valor exacto porque viene en la respuesta del `POST`.

**`POST /api/waitlist`**

Cuerpo: `{ "id": "<uuid v4>" }`

```json
{ "count": 1248, "joined": true }
```

`joined` es `false` cuando ese id ya estaba en el set. No se cachea.

**Respuestas de error:**

| Situación | Código | Cuerpo |
|---|---|---|
| Método distinto de GET/POST | 405 | `{ "error": "method_not_allowed" }` |
| JSON malformado, sin `id`, o `id` que no tiene forma de UUID v4 | 400 | `{ "error": "invalid_id" }` |
| Credenciales de Upstash ausentes en el entorno | 503 | `{ "error": "unavailable" }` |
| Fallo de Upstash | 502 | `{ "error": "upstream" }` |

El endpoint solo valida la forma del id y rechaza cuerpos mayores a 1 KB. Nada más, en coherencia con el alcance.

### Variables de entorno

Se declaran en el schema de `astro:env` dentro de `astro.config.mjs`, con `context: 'server'` y `access: 'secret'`:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

**Ambas se declaran opcionales.** Si fueran requeridas, cualquier build sin ellas —un clon nuevo, un CI— fallaría antes de compilar. Siendo opcionales, el build pasa y es el endpoint el que responde 503, que es el comportamiento de error ya definido arriba.

Se accede a ellas por `astro:env/server`, no por `Redis.fromEnv()`. `fromEnv()` lee de `process.env`, y Vite no popula `process.env` con las variables sin prefijo del `.env`, así que el cliente se construye pasando url y token de forma explícita.

### Flujo

1. La home se sirve prerenderizada, con el contador en `—`. El número no puede venir del HTML porque quedaría congelado en el momento del build; es el mismo motivo por el que el countdown del hero arranca en `--`.
2. Al cargar, el script hace `GET /api/waitlist` y pinta el número.
3. Al hacer clic, el script lee el id de `localStorage` o genera uno nuevo, y hace `POST`.
4. Con la respuesta, actualiza el contador, marca el botón como "ya estás dentro" y guarda el estado local.

## Diseño / UX

### Ubicación

Sección propia inmediatamente después del hero, antes de trailers. El orden de la home queda:

```
Hero → Lista de espera → Trailers → Noticias → Donaciones → Footer
```

Es la acción principal del sitio, así que va en lo primero que aparece al scrollear. No va dentro del hero: `#hero-content` se desvanece a `opacity: 0` con el parallax al bajar, y el hero ya carga el h1, el countdown y la aclaración de la fecha.

El footer suma un enlace `#waitlist` con el rótulo "Lista de espera", junto a los de Inicio, Noticias y Donaciones que ya tiene.

### Composición

Mismo molde que `Donations.astro`: `mx-auto max-w-2xl px-4 py-20 text-center`.

```
              SÚMATE AL LANZAMIENTO
   Marca que vas a estar el día uno. Sin email, sin registro.

                    1.247
              personas ya se sumaron

              ┌──────────────────┐
              │    ME SUMO       │
              └──────────────────┘
```

- Título `h2` en `text-2xl font-black uppercase`, igual que las demás secciones.
- El número en `gta-outline text-5xl font-black tabular-nums`: el mismo tratamiento que los dígitos del countdown, incluido el slab rosa que la clase ya trae.
- La etiqueta bajo el número en `gta-outline-soft`, como los rótulos "Días / Horas / Minutos".
- El botón toma el acento existente: borde `white/20`, `hover:border-gta-pink`, y el anillo `focus-visible:outline-2 outline-offset-2 outline-white` que usa `MusicToggle.astro`.

### Estados del botón

El estado vive en un atributo del elemento, no en una variable de JavaScript, siguiendo el patrón de `aria-pressed` en `MusicToggle.astro`.

| Estado | Texto | Comportamiento |
|---|---|---|
| Inicial | `ME SUMO` | Habilitado |
| Enviando | `SUMÁNDOTE…` | `disabled` |
| Ya dentro | `YA ESTÁS DENTRO ✓` | `disabled`, borde rosa fijo |
| Error | `ME SUMO` | Vuelve a habilitado, con mensaje corto de reintento en un `role="status"` |

### Estados del contador

Arranca en `—`. Se llena con la respuesta del `GET`. Si el `GET` falla, el bloque del número se oculta y la sección queda solo con el botón: nunca se muestra un `0` falso ni un mensaje de error por algo que el visitante no puede resolver.

### Sin JavaScript

El botón se renderiza `disabled` y el script lo habilita al arrancar. Es preferible a un botón de apariencia normal que no responde al clic.

### Accesibilidad y movimiento

- El bloque del contador lleva `aria-live="polite"`, para que el cambio de número se anuncie.
- El elemento es un `<button type="button">` real.
- La animación del número al cambiar reusa el `gsap.fromTo` del countdown, envuelta en `gsap.matchMedia('(prefers-reduced-motion: no-preference)')` como ya hace `Hero.astro`.
- La entrada de la sección al scrollear copia el `gsap.from(..., { opacity: 0, y: 32, scrollTrigger })` que `index.astro` aplica a `#trailers` y `#news-preview`.

## API de `src/lib/waitlist.js`

Todo lo testeable vive acá, sin red ni dependencias de Astro. El store es una interfaz mínima de dos métodos, `{ sadd, scard }`, que en producción implementa el cliente de Upstash y en los tests un `Set`.

| Función | Contrato |
|---|---|
| `isValidMemberId(id)` | `true` si `id` tiene forma de UUID v4. |
| `joinWaitlist(store, id)` | Lanza si el id es inválido. Si no, devuelve `{ count, joined }`. |
| `getCount(store)` | Devuelve el cardinal del set. |
| `formatCount(n)` | Devuelve el texto ya listo para pintar, con separador de miles y la concordancia de número. |

`formatCount` usa `Intl.NumberFormat('es-CO')`, cuyo separador de miles es el punto: mil doscientos cuarenta y siete se escribe `1.247`, no `1,247`.

## Testing

`vitest` ya está configurado y el repo tiene el patrón establecido: lógica pura en `src/lib/*.js` con su `*.test.js` al lado.

**`src/lib/waitlist.test.js`**, contra un store falso respaldado por un `Set`:

- Un id inválido es rechazado sin tocar el store.
- Un id nuevo incrementa el conteo y devuelve `joined: true`.
- **El mismo id enviado dos veces deja el conteo igual y devuelve `joined: false`** — es el caso que sostiene todo el diseño.
- `getCount` sobre un store vacío devuelve `0`.
- `formatCount` en 0, 1, 2 y 1247; el último confirma `1.247`, y el de 1 confirma el singular.

**Endpoint:** se testea invocando su handler exportado con un `Request` real. Node 22 trae `Request` y `Response` globales, así que no hace falta levantar un servidor. Cubre método no soportado, JSON malformado, cuerpo sin `id` y ausencia de credenciales.

**Verificación manual:**

- `astro dev --background` con un `.env` local apuntando a una base Upstash de desarrollo: sumarse, recargar la página, confirmar que el botón queda en "ya estás dentro" y que reintentar no mueve el número.
- `astro build`: confirmar que `dist/` sigue conteniendo el HTML prerenderizado de la home, `/noticias` y los artículos, y que lo único on-demand es `/api/waitlist`. Es la comprobación de que agregar el adapter no convirtió el sitio entero en server-rendered.

## Despliegue

1. Provisionar Upstash Redis desde el Vercel Marketplace y conectarlo al proyecto. Las dos variables quedan inyectadas en el entorno de Vercel.
2. Replicar esas variables en un `.env` local para desarrollo. `.env` ya está en `.gitignore`.
3. El primer despliegue con adapter cambia el tipo de output del proyecto en Vercel. El deploy hook del workflow de noticias no requiere cambios.
