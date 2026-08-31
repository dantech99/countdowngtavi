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
// itself, instead of Astro turning an unsupported method into a 404.
export const ALL = (({ request }) => handleWaitlistRequest(request, store)) satisfies APIRoute;
