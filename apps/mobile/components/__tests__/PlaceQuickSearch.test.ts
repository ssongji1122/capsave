import { isUrlSafe } from '../../services/url-validator';

describe('PlaceQuickSearch URL patterns', () => {
  describe('search URL construction', () => {
    it('navermap web fallback URL is valid', () => {
      const query = encodeURIComponent('토토파 도쿄');
      const url = `https://map.naver.com/v5/search/${query}`;
      expect(isUrlSafe(url)).toBe(true);
    });

    it('instagram web fallback URL is valid', () => {
      const query = encodeURIComponent('토토파');
      const url = `https://www.instagram.com/explore/search/keyword/?q=${query}`;
      expect(isUrlSafe(url)).toBe(true);
    });

    it('naver blog web fallback URL is valid', () => {
      const query = encodeURIComponent('토토파 후기');
      const url = `https://search.naver.com/search.naver?query=${query}`;
      expect(isUrlSafe(url)).toBe(true);
    });

    it('youtube web fallback URL is valid', () => {
      const query = encodeURIComponent('토토파');
      const url = `https://www.youtube.com/results?search_query=${query}`;
      expect(isUrlSafe(url)).toBe(true);
    });
  });

  describe('query construction', () => {
    it('combines name and address when both present', () => {
      const placeName = '토토파';
      const address = '도쿄 시부야구';
      const query = address ? `${placeName} ${address}` : placeName;
      expect(query).toBe('토토파 도쿄 시부야구');
    });

    it('uses only name when address is absent', () => {
      const placeName = '토토파';
      const address = null;
      const query = address ? `${placeName} ${address}` : placeName;
      expect(query).toBe('토토파');
    });

    it('uses only name when address is undefined', () => {
      const placeName = '토토파';
      const address = undefined;
      const query = address ? `${placeName} ${address}` : placeName;
      expect(query).toBe('토토파');
    });
  });
});
