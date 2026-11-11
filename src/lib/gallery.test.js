import { describe, it, expect } from 'vitest';
import { toSlides } from './gallery.js';

describe('toSlides', () => {
  it('reads the order and the subject from the file name', () => {
    expect(toSlides(['../assets/launch-gallery/08-port-gellhorn-07.jpg'])).toEqual([
      { path: '../assets/launch-gallery/08-port-gellhorn-07.jpg', order: 8, subject: 'port-gellhorn' },
    ]);
  });

  it('sorts the slides by their order prefix, not by input order', () => {
    const slides = toSlides([
      '../assets/launch-gallery/10-vice-city-18.jpg',
      '../assets/launch-gallery/02-jason-and-lucia-15.jpg',
      '../assets/launch-gallery/07-jason-duval-11.jpg',
    ]);
    expect(slides.map((slide) => slide.order)).toEqual([2, 7, 10]);
  });

  it('does not mutate the source list', () => {
    const paths = ['b/02-vice-city-13.jpg', 'a/01-vice-city-15.jpg'];
    toSlides(paths);
    expect(paths).toEqual(['b/02-vice-city-13.jpg', 'a/01-vice-city-15.jpg']);
  });

  it('throws on a subject it does not know', () => {
    expect(() => toSlides(['../assets/launch-gallery/01-liberty-city-01.jpg'])).toThrow(
      'unexpected file name',
    );
  });

  it('throws on a file without the order prefix', () => {
    expect(() => toSlides(['../assets/launch-gallery/vice-city-13.jpg'])).toThrow(
      'unexpected file name',
    );
  });
});
