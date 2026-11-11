// src/lib/gallery.js
//
// Rockstar's Launch Gallery (rockstargames.com/VI/launch-gallery, published
// 2026-11-05). The files live in src/assets/launch-gallery and are named
// `<order>-<subject>-<rockstar number>.jpg`: the two-digit prefix preserves the
// order Rockstar shows them in, and the subject drives the alt text.

export const SUBJECTS = /** @type {const} */ ([
  'jason-and-lucia',
  'jason-duval',
  'lucia-caminos',
  'vice-city',
  'grassrivers',
  'leonida-keys',
  'port-gellhorn',
]);

/** @typedef {(typeof SUBJECTS)[number]} Subject */
/** @typedef {{ path: string, order: number, subject: Subject }} Slide */

const FILE_NAME = /(?:^|\/)(\d{2})-([a-z-]+)-\d+\.jpg$/;

/**
 * Turns the gallery's file paths into ordered slides.
 *
 * A file that doesn't follow the naming scheme throws instead of being
 * skipped: a silently missing slide is harder to notice than a broken build.
 *
 * @param {readonly string[]} paths
 * @returns {Slide[]}
 */
export function toSlides(paths) {
  return paths
    .map((path) => {
      const match = path.match(FILE_NAME);
      const subject = /** @type {Subject | undefined} */ (
        SUBJECTS.find((candidate) => candidate === match?.[2])
      );
      if (!match || !subject) {
        throw new Error(`Launch gallery: unexpected file name "${path}"`);
      }
      return { path, order: Number(match[1]), subject };
    })
    .sort((a, b) => a.order - b.order);
}
