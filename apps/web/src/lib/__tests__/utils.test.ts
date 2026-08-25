import { describe, expect, it } from 'vitest';

import { formatMicroCNY, formatTokens } from '../utils';

describe('formatMicroCNY', () => {
  it('整数元', () => {
    expect(formatMicroCNY('2000000')).toBe('¥2.00');
  });

  it('带角分', () => {
    expect(formatMicroCNY('1500000')).toBe('¥1.50');
    expect(formatMicroCNY(1567890)).toBe('¥1.56');
  });

  it('小于 0.01 元时截断到分', () => {
    expect(formatMicroCNY('5000')).toBe('¥0.00');
  });

  it('负数带符号', () => {
    expect(formatMicroCNY(-1500000n)).toBe('-¥1.50');
  });

  it('零', () => {
    expect(formatMicroCNY('0')).toBe('¥0.00');
  });
});

describe('formatTokens', () => {
  it('按千位分隔', () => {
    expect(formatTokens(1234567)).toBe('1,234,567');
  });
});
