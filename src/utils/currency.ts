/**
 * UGOPAWAVERIFY Official Currency & Units Utility
 * 
 * Transition all customer-facing displays to "UNITS":
 * Default conversion rule: 1 UNIT = ₦200
 * e.g.:
 *  ₦200 = 1 UNIT
 *  ₦400 = 2 UNITS
 *  ₦500 = 2.5 UNITS
 *  ₦600 = 3 UNITS
 *  ₦1,000 = 5 UNITS
 *  ₦1,200 = 6 UNITS
 *  ₦1,500 = 7.5 UNITS
 *  ₦2,000 = 10 UNITS
 *  ₦5,000 = 25 UNITS
 *  ₦10,000 = 50 UNITS
 *  ₦20,000 = 100 UNITS
 *  ₦30,000 = 150 UNITS
 */

export const DEFAULT_UNIT_RATE = 200; // 1 UNIT = ₦200
export const NAIRA_SYMBOL = '₦';

/**
 * Convert NGN amount to UNITS
 */
export function ngnToUnits(ngnAmount: number | string | null | undefined, rate: number = DEFAULT_UNIT_RATE): number {
  const num = typeof ngnAmount === 'string' ? parseFloat(ngnAmount) : (ngnAmount ?? 0);
  if (isNaN(num) || num === 0) return 0;
  const validRate = rate > 0 ? rate : DEFAULT_UNIT_RATE;
  // Round to up to 4 decimal places to prevent floating point imprecision
  return Math.round((num / validRate) * 10000) / 10000;
}

/**
 * Convert UNITS to NGN amount
 */
export function unitsToNgn(units: number | string | null | undefined, rate: number = DEFAULT_UNIT_RATE): number {
  const num = typeof units === 'string' ? parseFloat(units) : (units ?? 0);
  if (isNaN(num) || num === 0) return 0;
  const validRate = rate > 0 ? rate : DEFAULT_UNIT_RATE;
  return Math.round(num * validRate * 100) / 100;
}

export interface UnitFormatOptions {
  decimals?: number;
  showSuffix?: boolean; // Default true ("Credits" or "Credit")
  suffix?: string;
  prefix?: string;
}

/**
 * Primary Currency Formatter: Renders customer-facing Credits
 * Examples:
 *   formatUnits(5) => "5 Credits"
 *   formatUnits(1) => "1 Credit"
 *   formatUnits(2.5) => "2.5 Credits"
 *   formatUnits(0) => "0 Credits"
 */
export function formatUnits(
  units: number | string | null | undefined,
  options?: number | UnitFormatOptions
): string {
  const num = typeof units === 'string' ? parseFloat(units) : (units ?? 0);
  if (isNaN(num)) return '0 Credits';

  let showSuffix = true;
  let customSuffix: string | undefined;
  let prefix = '';
  let decimals: number | undefined;

  if (typeof options === 'number') {
    decimals = options;
  } else if (typeof options === 'object' && options !== null) {
    if (options.decimals !== undefined) decimals = options.decimals;
    if (options.showSuffix !== undefined) showSuffix = options.showSuffix;
    if (options.suffix !== undefined) customSuffix = options.suffix;
    if (options.prefix !== undefined) prefix = options.prefix;
  }

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  let formattedNum: string;
  if (decimals !== undefined) {
    formattedNum = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(absNum);
  } else {
    // Clean representation: integers without trailing zeroes, decimals up to 2 places
    const hasDecimal = absNum % 1 !== 0;
    formattedNum = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: hasDecimal ? (absNum * 10 % 1 === 0 ? 1 : 2) : 0,
      maximumFractionDigits: 2
    }).format(absNum);
  }

  let suffix = '';
  if (customSuffix !== undefined) {
    suffix = ` ${customSuffix}`;
  } else if (showSuffix) {
    suffix = absNum === 1 ? ' Credit' : ' Credits';
  }

  const sign = isNegative ? '-' : prefix;
  return `${sign}${formattedNum}${suffix}`;
}

/**
 * Standard formatCurrency: takes raw stored NGN amount and converts it to customer-facing UNITS
 * (Uses rate = 200 by default, or accepts options/rate)
 * This guarantees drop-in backwards compatibility with existing UI components!
 */
export function formatCurrency(
  ngnAmount: number | string | null | undefined,
  decimalsOrOptions?: number | (UnitFormatOptions & { rate?: number })
): string {
  const num = typeof ngnAmount === 'string' ? parseFloat(ngnAmount) : (ngnAmount ?? 0);
  let rate = DEFAULT_UNIT_RATE;
  if (typeof decimalsOrOptions === 'object' && decimalsOrOptions?.rate) {
    rate = decimalsOrOptions.rate;
  }
  const units = ngnToUnits(num, rate);
  return formatUnits(units, decimalsOrOptions);
}

/**
 * Admin-facing or internal Naira Formatter (used when Admin explicitly views NGN equivalent)
 */
export function formatNaira(
  amount: number | string | null | undefined,
  withDecimals: boolean = true
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return `${NAIRA_SYMBOL}0.00`;
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formatted = new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0
  }).format(absNum);
  return `${isNegative ? '-' : ''}${NAIRA_SYMBOL}${formatted}`;
}
