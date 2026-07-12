/** Number formatting shared by math engine and UI. */

export function fmtMoney(x: number): string {
  const sign = x < 0 ? '-' : '';
  const ax = Math.abs(x);
  if (ax >= 1_000_000) return `${sign}$${trim(ax / 1_000_000)}M`;
  if (ax >= 10_000) return `${sign}$${Math.round(ax).toLocaleString('en-US')}`;
  return `${sign}$${trim(ax)}`;
}

export function fmtNum(x: number): string {
  if (Math.abs(x) >= 10_000) return Math.round(x).toLocaleString('en-US');
  return trim(x);
}

function trim(x: number): string {
  // tiny coefficients (0.00256 psf/mph², CTE values) need significant
  // digits, not fixed decimals — otherwise they render as 0
  if (x !== 0 && Math.abs(x) < 0.1) {
    return Number(x.toPrecision(3)).toString();
  }
  const r = Math.round(x * 100) / 100;
  return r.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** "$/cy" + 25 -> "$25/cy"; "%" + 12 -> "12%"; "weeks" + 6 -> "6 weeks" */
export function fmtWithUnit(value: number, unit: string): string {
  if (unit.startsWith('$/')) return `$${fmtNum(value)}/${unit.slice(2)}`;
  if (unit === '$') return fmtMoney(value);
  if (unit === '$M') return `$${fmtNum(value)}M`;
  if (unit === '%') return `${fmtNum(value)}%`;
  return `${fmtNum(value)} ${unit}`;
}
