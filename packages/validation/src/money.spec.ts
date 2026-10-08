import { describe, it, expect } from 'vitest';
import { MoneyCOP } from './money.js';

describe('MoneyCOP', () => {
  it('should only accept non-negative integers', () => {
    expect(() => new MoneyCOP(15000)).not.toThrow();
    expect(() => new MoneyCOP(0)).not.toThrow();
    expect(() => new MoneyCOP(150.5)).toThrow(/must be an integer/);
    expect(() => new MoneyCOP(-100)).toThrow(/cannot be negative/);
  });

  it('should calculate INC 8% and voluntary tip 10% rounded to integer', () => {
    const dish = new MoneyCOP(45900);
    // 45900 * 0.08 = 3672
    const inc8 = dish.calculateTax(8);
    expect(inc8.value).toBe(3672);

    // 45900 * 0.10 = 4590
    const tip10 = dish.calculateTip(10);
    expect(tip10.value).toBe(4590);
  });

  it('should divide total amount equally without losing a single peso (Hare-Niemeyer)', () => {
    // Total $100.000 split across 3 people -> 33.333,33...
    // Must result in 33334, 33333, 33333 summing exactly to 100000
    const total = 100000;
    const parts = 3;
    const splits = MoneyCOP.splitEqual(total, parts);

    expect(splits.length).toBe(3);
    const sum = splits.reduce((a, b) => a + b, 0);
    expect(sum).toBe(total);
    expect(splits).toEqual([33334, 33333, 33333]);
  });

  it('should prorate accessory tip exactly across disparate item sums', () => {
    const items = [25000, 48000, 19500]; // total 92500
    const tipTotal = 9250; // 10%
    const prorated = MoneyCOP.prorate(tipTotal, items);

    const sumProrated = prorated.reduce((a, b) => a + b, 0);
    expect(sumProrated).toBe(tipTotal);
  });
});
