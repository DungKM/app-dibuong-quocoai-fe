const FRACTION_TOLERANCE = 0.000001;
const SUPPORTED_DENOMINATORS = [2, 3, 4, 5, 6, 8, 10, 12];

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y) {
    const temp = y;
    y = x % y;
    x = temp;
  }

  return x || 1;
};

export const formatFractionValue = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) < FRACTION_TOLERANCE) return "0";

  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const whole = Math.floor(absolute);
  const fraction = absolute - whole;

  if (fraction < FRACTION_TOLERANCE) {
    return `${sign}${whole}`;
  }

  let best: { numerator: number; denominator: number; error: number } | null = null;

  for (const denominator of SUPPORTED_DENOMINATORS) {
    const numerator = Math.round(fraction * denominator);
    if (numerator <= 0 || numerator >= denominator) continue;

    const error = Math.abs(fraction - numerator / denominator);
    if (!best || error < best.error) {
      best = { numerator, denominator, error };
    }
  }

  if (!best || best.error > 0.02) {
    return `${sign}${absolute}`;
  }

  const divisor = gcd(best.numerator, best.denominator);
  const numerator = best.numerator / divisor;
  const denominator = best.denominator / divisor;

  if (whole === 0) {
    return `${sign}${numerator}/${denominator}`;
  }

  return `${sign}${whole} ${numerator}/${denominator}`;
};

export const parseFractionValue = (raw: string) => {
  const normalized = raw.trim().replace(",", ".").replace(/\s+/g, " ");
  if (!normalized) return 0;

  const mixedMatch = normalized.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const [, wholeRaw, numeratorRaw, denominatorRaw] = mixedMatch;
    const whole = Number(wholeRaw);
    const numerator = Number(numeratorRaw);
    const denominator = Number(denominatorRaw);
    if (!Number.isFinite(whole) || !Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return null;
    }

    const sign = whole < 0 ? -1 : 1;
    return Math.max(0, sign * (Math.abs(whole) + numerator / denominator));
  }

  const fractionMatch = normalized.match(/^(-?\d+)\/(\d+)$/);
  if (fractionMatch) {
    const [, numeratorRaw, denominatorRaw] = fractionMatch;
    const numerator = Number(numeratorRaw);
    const denominator = Number(denominatorRaw);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return null;
    }

    return Math.max(0, numerator / denominator);
  }

  const value = Number(normalized.replace(/\s+/g, ""));
  return Number.isFinite(value) && value >= 0 ? value : null;
};
