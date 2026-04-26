import { getFallbackResponse, FALLBACK_RESPONSE } from '../../src/models/llmModels';

describe('getFallbackResponse()', () => {
  it('should return Turkish content when language is tr', () => {
    const result = getFallbackResponse('tr');

    expect(result.title).toBe('Tutarlı kal');
    expect(result.body).toBe('Bugün tutarlı olmayı unutma.');
    expect(result.tone).toBe('neutral');
  });

  it('should return English fallback when language is en', () => {
    const result = getFallbackResponse('en');

    expect(result).toEqual(FALLBACK_RESPONSE);
  });

  it('should return English fallback when language is null', () => {
    const result = getFallbackResponse(null);

    expect(result).toEqual(FALLBACK_RESPONSE);
  });

  it('should return English fallback when language is undefined', () => {
    const result = getFallbackResponse(undefined);

    expect(result).toEqual(FALLBACK_RESPONSE);
  });

  it('should return English fallback for an unknown language string', () => {
    const result = getFallbackResponse('fr');

    expect(result).toEqual(FALLBACK_RESPONSE);
  });

  it('Turkish fallback should pass llmResponseSchema constraints', () => {
    const result = getFallbackResponse('tr');

    expect(result.title.length).toBeGreaterThan(0);
    expect(result.title.length).toBeLessThanOrEqual(60);
    expect(result.body.length).toBeGreaterThan(0);
    expect(result.body.length).toBeLessThanOrEqual(300);
    expect(['neutral', 'positive', 'encouraging', 'emotional']).toContain(result.tone);
  });
});
