export const MEMBERS_KEY = 'waitlist:members';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Un formateador por idioma: el separador de miles cambia (1.234 vs 1,234).
const COUNT_FORMATS = {
  es: new Intl.NumberFormat('es-CO'),
  en: new Intl.NumberFormat('en-US'),
};

export function isValidMemberId(id) {
  return typeof id === 'string' && UUID_V4.test(id);
}

export async function getCount(store) {
  return await store.scard(MEMBERS_KEY);
}

// SADD returns how many members it actually added, so a repeated id comes back
// as 0 without a separate lookup. The count is the set's cardinality rather
// than a counter of its own: with one source of truth there is no pair of
// values that can drift apart.
export async function joinWaitlist(store, id) {
  if (!isValidMemberId(id)) {
    throw new Error('invalid_id');
  }

  const added = await store.sadd(MEMBERS_KEY, id);
  const count = await store.scard(MEMBERS_KEY);

  return { count, joined: added === 1 };
}

// Las etiquetas llegan como parámetro, no desde el diccionario: este módulo es
// una librería y no debe depender de la capa de UI. Quien lo llama las lee de
// los atributos data-* que el componente renderizó.
// Returned in two pieces because the section styles them differently: the
// number carries the GTA outline, the caption the softer variant.
export function formatCount(n, lang, labels) {
  const format = COUNT_FORMATS[lang] ?? COUNT_FORMATS.es;
  return {
    value: format.format(n),
    label: n === 1 ? labels.one : labels.other,
  };
}
