import type { APIRoute } from 'astro';
import { Redis } from '@upstash/redis';
import { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } from 'astro:env/server';
import { handleWaitlistRequest } from '../../lib/waitlist-http.js';

// The only route in the project that is not prerendered.
export const prerender = false;

// Built once per function instance rather than per request: the Upstash client
// speaks HTTP, so there is no connection to open, keep alive, or tear down.
// Missing credentials leave it null, which the handler turns into a 503.
const store =
  UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN })
    : null;

// ALL rather than separate GET/POST exports: it lets the handler answer 405
// itself, instead of Astro turning an unsupported method into a 404. That is
// only true for methods that reach the route at all: Astro's
// security.checkOrigin middleware runs first and rejects a cross-site
// non-GET/HEAD/OPTIONS request whose Content-Type is missing or form-like
// (for example a DELETE with no Content-Type) with its own 403 "Cross-site
// DELETE form submissions are forbidden". OPTIONS is exempt from that check
// but is NOT auto-answered by Astro in the deployed function — it falls
// through to this same ALL export and gets whatever handleWaitlistRequest
// gives an unrecognized method (503 while unconfigured, 405 once credentials
// are set). The 204 an `astro dev` OPTIONS request sees comes from Vite's
// own dev-server CORS middleware and does not exist in production.
export const ALL = (({ request }) => handleWaitlistRequest(request, store)) satisfies APIRoute;
