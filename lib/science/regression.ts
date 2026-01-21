export type SeriesPoint = { year: number; value: number };

export function linearRegression(points: SeriesPoint[]): {
  slope: number;
  intercept: number;
  r2: number;
} {
  if (points.length < 2) {
    return { slope: 0, intercept: points[0]?.value ?? 0, r2: 0 };
  }

  const xs = points.map((p) => p.year);
  const ys = points.map((p) => p.value);

  const xMean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const yMean = ys.reduce((a, b) => a + b, 0) / ys.length;

  let num = 0;
  let den = 0;
  for (let i = 0; i < points.length; i++) {
    const dx = xs[i] - xMean;
    num += dx * (ys[i] - yMean);
    den += dx * dx;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  // R^2
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < points.length; i++) {
    const yHat = slope * xs[i] + intercept;
    ssRes += (ys[i] - yHat) ** 2;
    ssTot += (ys[i] - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

export function forecastLinear(points: SeriesPoint[], yearsAhead: number): SeriesPoint[] {
  const { slope, intercept } = linearRegression(points);
  const lastYear = Math.max(...points.map((p) => p.year));
  const out: SeriesPoint[] = [];
  for (let i = 1; i <= yearsAhead; i++) {
    const year = lastYear + i;
    out.push({ year, value: slope * year + intercept });
  }
  return out;
}

