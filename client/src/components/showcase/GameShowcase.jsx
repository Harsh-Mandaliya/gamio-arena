import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { BowlingFigure, PaddleFigure, PoolFigure, ShuttleFigure } from './Figurines.jsx';

const SLIDES = [
  {
    key: 'pool',
    word: 'Rack em',
    title: 'Pool & Snooker',
    copy: 'Fresh cloth, straight cues and tables that roll true. Five tables across two halls, open till 11pm.',
    bg: '#1f7a5a',
    Figure: PoolFigure,
  },
  {
    key: 'table-tennis',
    word: 'Spin it',
    title: 'Table Tennis',
    copy: 'Competition tables, bats and balls on the house. Grab a slot for an hour of rallies after work.',
    bg: '#e2572b',
    Figure: PaddleFigure,
  },
  {
    key: 'bowling',
    word: 'Strike',
    title: 'Bowling Lanes',
    copy: 'Four ten-pin lanes with auto scoring at Alkapuri. Shoe hire comes with every booking.',
    bg: '#5146e0',
    Figure: BowlingFigure,
  },
  {
    key: 'badminton',
    word: 'Smash',
    title: 'Badminton Courts',
    copy: 'Wooden floors and proper lighting, open from 6am. Bring your racquet, we have the shuttles.',
    bg: '#2f6fde',
    Figure: ShuttleFigure,
  },
];

const DURATION = 650;
const COUNT = SLIDES.length;

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mobile;
}

function roleOf(index, active) {
  if (index === active) return 'center';
  if (index === (active + COUNT - 1) % COUNT) return 'left';
  if (index === (active + 1) % COUNT) return 'right';
  return 'back';
}

function placement(role, mobile) {
  switch (role) {
    case 'center':
      return {
        transform: `translateX(-50%) scale(${mobile ? 1.25 : 1.6})`,
        filter: 'blur(0)',
        opacity: 1,
        zIndex: 20,
        left: '50%',
        height: mobile ? '46%' : '52%',
        bottom: mobile ? '24%' : '12%',
      };
    case 'left':
    case 'right':
      return {
        transform: 'translateX(-50%) scale(1)',
        filter: 'blur(2px)',
        opacity: 0.85,
        zIndex: 10,
        left: role === 'left' ? (mobile ? '18%' : '28%') : mobile ? '82%' : '72%',
        height: mobile ? '16%' : '28%',
        bottom: mobile ? '32%' : '12%',
      };
    default:
      return {
        transform: 'translateX(-50%) scale(1)',
        filter: 'blur(4px)',
        opacity: 1,
        zIndex: 5,
        left: '50%',
        height: mobile ? '13%' : '22%',
        bottom: mobile ? '32%' : '12%',
      };
  }
}

export default function GameShowcase() {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);
  const mobile = useIsMobile();

  const go = useCallback(
    (dir) => {
      if (animating) return;
      setAnimating(true);
      setActive((i) => (dir === 'next' ? (i + 1) % COUNT : (i + COUNT - 1) % COUNT));
      setTimeout(() => setAnimating(false), DURATION);
    },
    [animating],
  );

  const slide = SLIDES[active];

  return (
    <section
      className="showcase"
      style={{ '--show-bg': slide.bg }}
      aria-roledescription="carousel"
      aria-label="Games at Gamio Arena"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go('next');
        if (e.key === 'ArrowLeft') go('prev');
      }}
    >
      <div className="showcase__grain" aria-hidden="true" />

      <div className="showcase__ghost" aria-hidden="true">
        {SLIDES.map((s, i) => (
          <span key={s.key} className={i === active ? 'is-on' : ''}>
            {s.word}
          </span>
        ))}
      </div>

      <span className="showcase__brand">Gamio Arena · Now playing</span>

      <div className="showcase__stage">
        {SLIDES.map(({ key, Figure }, i) => (
          <div key={key} className="showcase__item" style={placement(roleOf(i, active), mobile)} aria-hidden={i !== active}>
            <Figure />
          </div>
        ))}
      </div>

      <div className="showcase__info">
        <p className="showcase__title" aria-live="polite">
          {slide.title}
        </p>
        <p className="showcase__copy">{slide.copy}</p>
        <div className="showcase__nav">
          <button onClick={() => go('prev')} aria-label="Previous game">
            <ArrowLeft size={26} strokeWidth={2.25} />
          </button>
          <button onClick={() => go('next')} aria-label="Next game">
            <ArrowRight size={26} strokeWidth={2.25} />
          </button>
        </div>
      </div>

      <Link to={`/play?activity=${slide.key}`} className="showcase__cta">
        Book it <ArrowRight strokeWidth={2.25} />
      </Link>
    </section>
  );
}
