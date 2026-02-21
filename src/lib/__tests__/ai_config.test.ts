import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('AI Configuration', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_GEMINI_API_KEY', 'test-api-key');
    vi.stubEnv('NEXT_PUBLIC_GEMINI_MODEL', 'gemini-3-flash-preview');
  });

  it('should read Gemini API key from environment variables', () => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    expect(apiKey).toBe('test-api-key');
  });

  it('should read Gemini model from environment variables', () => {
    const model = process.env.NEXT_PUBLIC_GEMINI_MODEL;
    expect(model).toBe('gemini-3-flash-preview');
  });

  it('should fallback to a default model if not provided', () => {
    vi.stubEnv('NEXT_PUBLIC_GEMINI_MODEL', '');
    const model = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-3-flash-preview';
    expect(model).toBe('gemini-3-flash-preview');
  });
});
