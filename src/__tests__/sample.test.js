import { describe, it, expect } from '@jest/globals';

describe('Sample Test', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });

  it('should perform basic math', () => {
    expect(2 + 2).toBe(4);
  });
});