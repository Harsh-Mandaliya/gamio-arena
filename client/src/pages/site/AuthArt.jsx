// Left panel on the sign-in / sign-up pages: a scatter of numbered pool balls.

const BALLS = [
  { n: 1, color: '#ffc93c', size: 120, x: '62%', y: '8%', dx: '-14px', dy: '18px' },
  { n: 3, color: '#ff5a1f', size: 86, x: '12%', y: '14%', dx: '12px', dy: '10px' },
  { n: 8, color: '#17201b', size: 150, x: '70%', y: '42%', dx: '10px', dy: '-12px', dark: true },
  { n: 2, color: '#2f6fde', size: 70, x: '30%', y: '40%', dx: '-10px', dy: '-8px' },
  { n: 5, color: '#d6336c', size: 96, x: '8%', y: '58%', dx: '16px', dy: '-6px' },
];

export default function AuthArt({ quote, cite }) {
  return (
    <div className="auth__art">
      <div className="auth__balls" aria-hidden="true">
        {BALLS.map((b) => (
          <span
            key={b.n}
            className="auth__ball"
            style={{
              width: b.size,
              height: b.size,
              left: b.x,
              top: b.y,
              fontSize: b.size,
              background: b.color,
              '--dx': b.dx,
              '--dy': b.dy,
              animationDelay: `${b.n * -1.3}s`,
            }}
          >
            <span>{b.n}</span>
          </span>
        ))}
      </div>
      <blockquote>{quote}</blockquote>
      <cite>{cite}</cite>
    </div>
  );
}
