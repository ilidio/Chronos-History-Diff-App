import { describe, it, expect } from 'vitest';
import { getLanguageFromPath } from '@/app/page';

describe('getLanguageFromPath', () => {
  it('identifies common programming languages', () => {
    expect(getLanguageFromPath('test.ts')).toBe('typescript');
    expect(getLanguageFromPath('test.tsx')).toBe('typescript');
    expect(getLanguageFromPath('test.js')).toBe('javascript');
    expect(getLanguageFromPath('test.py')).toBe('python');
    expect(getLanguageFromPath('test.cpp')).toBe('cpp');
    expect(getLanguageFromPath('test.cs')).toBe('csharp');
  });

  it('identifies markup and config languages', () => {
    expect(getLanguageFromPath('test.html')).toBe('html');
    expect(getLanguageFromPath('test.css')).toBe('css');
    expect(getLanguageFromPath('test.json')).toBe('json');
    expect(getLanguageFromPath('test.md')).toBe('markdown');
    expect(getLanguageFromPath('test.yml')).toBe('yaml');
  });

  it('returns plaintext for unknown extensions', () => {
    expect(getLanguageFromPath('test.unknown')).toBe('plaintext');
    expect(getLanguageFromPath('test')).toBe('plaintext');
    expect(getLanguageFromPath(null)).toBe('plaintext');
  });
});
