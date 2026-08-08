import { slugify, isReservedSlug } from '../utils/slugify';

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Ardy Hosts')).toBe('ardy-hosts');
  });

  it('collapses runs of unsafe characters into a single dash', () => {
    expect(slugify('Ardy!!  Hosts__2')).toBe('ardy-hosts-2');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('--Ardy--')).toBe('ardy');
  });

  it('returns an empty string when nothing usable remains', () => {
    expect(slugify('!!!')).toBe('');
    expect(slugify('')).toBe('');
  });
});

describe('isReservedSlug', () => {
  it('flags reserved words', () => {
    expect(isReservedSlug('api')).toBe(true);
    expect(isReservedSlug('healthz')).toBe(true);
  });

  it('does not flag ordinary slugs', () => {
    expect(isReservedSlug('ardy-hosts')).toBe(false);
  });
});
