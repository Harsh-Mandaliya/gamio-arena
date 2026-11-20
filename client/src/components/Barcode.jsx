/** Decorative barcode derived from the booking code, so each ticket looks unique. */
export default function Barcode({ value, height = 56 }) {
  const bars = [];
  let x = 0;
  for (const ch of `*${value}*`) {
    let n = ch.charCodeAt(0) * 2654435761;
    for (let i = 0; i < 5; i++) {
      const w = 1 + ((n >>> (i * 3)) & 3);
      if (i % 2 === 0) bars.push(<rect key={`${x}`} x={x} y="0" width={w} height={height} />);
      x += w + 1;
    }
    x += 2;
    n >>>= 1;
  }
  return (
    <svg viewBox={`0 0 ${x} ${height}`} preserveAspectRatio="none" className="barcode" aria-hidden="true">
      <g fill="currentColor">{bars}</g>
    </svg>
  );
}
