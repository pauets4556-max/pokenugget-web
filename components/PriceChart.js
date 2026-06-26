"use client";

export default function PriceChart({ history }) {
  if (!history || history.length === 0) return null;

  const width = 260;
  const height = 70;
  const prices = history.map((h) => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = history
    .map((h, i) => {
      const x = (i / (history.length - 1)) * width;
      const y = height - ((h.price - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="#4A8FB8" strokeWidth="2" />
    </svg>
  );
}
