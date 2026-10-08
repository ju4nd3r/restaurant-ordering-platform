/**
 * MoneyCOP: Value Object for Colombian Peso operations.
 * Guarantee: In Colombia, COP has no active cent fractions.
 * All amounts are strictly non-negative integers.
 */
export class MoneyCOP {
  private readonly amount: number;

  constructor(amount: number) {
    if (!Number.isInteger(amount)) {
      throw new Error(`MoneyCOP amount must be an integer, received: ${amount}`);
    }
    if (amount < 0) {
      throw new Error(`MoneyCOP amount cannot be negative, received: ${amount}`);
    }
    this.amount = amount;
  }

  public get value(): number {
    return this.amount;
  }

  public add(other: MoneyCOP | number): MoneyCOP {
    const val = typeof other === 'number' ? other : other.value;
    return new MoneyCOP(this.amount + val);
  }

  public subtract(other: MoneyCOP | number): MoneyCOP {
    const val = typeof other === 'number' ? other : other.value;
    if (this.amount - val < 0) {
      throw new Error(`Insufficient funds: ${this.amount} - ${val} would be negative`);
    }
    return new MoneyCOP(this.amount - val);
  }

  /**
   * Calculates tax (e.g., 8% for INC or 19% for IVA) rounded to nearest COP integer.
   */
  public calculateTax(percentage: number): MoneyCOP {
    const tax = Math.round(this.amount * (percentage / 100));
    return new MoneyCOP(tax);
  }

  /**
   * Calculates voluntary tip (e.g., 10%) rounded to nearest COP integer.
   */
  public calculateTip(percentage: number): MoneyCOP {
    const tip = Math.round(this.amount * (percentage / 100));
    return new MoneyCOP(tip);
  }

  /**
   * Formats to Colombian Peso currency string, e.g. "$ 25.000"
   */
  public format(): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(this.amount);
  }

  /**
   * Distributes a total amount into N equal parts using Largest Remainder Method (Hare-Niemeyer).
   * Guarantees: sum(parts) === total exactly, without a single lost COP.
   */
  public static splitEqual(totalAmount: number, parts: number): number[] {
    if (parts <= 0 || !Number.isInteger(parts)) {
      throw new Error(`Parts must be a positive integer, received: ${parts}`);
    }
    if (!Number.isInteger(totalAmount) || totalAmount < 0) {
      throw new Error(`Total amount must be a non-negative integer, received: ${totalAmount}`);
    }

    const baseAmount = Math.floor(totalAmount / parts);
    const remainder = totalAmount % parts;

    const result: number[] = new Array(parts).fill(baseAmount);
    // Distribute remainder 1 COP by 1 COP to the first 'remainder' people
    for (let i = 0; i < remainder; i++) {
      const current = result[i];
      if (current !== undefined) {
        result[i] = current + 1;
      }
    }

    return result;
  }

  /**
   * Prorates an accessory amount (tax or tip) across multiple item amounts.
   * Guarantees exact sum matching accessoryTotal.
   */
  public static prorate(accessoryTotal: number, itemAmounts: number[]): number[] {
    const sumAmounts = itemAmounts.reduce((acc, curr) => acc + curr, 0);
    if (sumAmounts === 0) {
      return itemAmounts.map(() => 0);
    }

    const unrounded = itemAmounts.map((amt) => (amt / sumAmounts) * accessoryTotal);
    const floored = unrounded.map((u) => Math.floor(u));
    const remainders = unrounded.map((u, i) => ({
      index: i,
      remainder: u - (floored[i] ?? 0),
    }));

    const currentSum = floored.reduce((acc, curr) => acc + curr, 0);
    let diff = accessoryTotal - currentSum;

    // Sort by largest decimal remainder descending
    remainders.sort((a, b) => b.remainder - a.remainder);

    for (let i = 0; i < diff; i++) {
      const idx = remainders[i % remainders.length]?.index;
      if (idx !== undefined && floored[idx] !== undefined) {
        floored[idx] += 1;
      }
    }

    return floored;
  }
}
