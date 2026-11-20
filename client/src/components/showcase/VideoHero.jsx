import { Link } from 'react-router';
import { ArrowUpRight, Clock3, Trophy } from 'lucide-react';
import { useApi } from '../../hooks/useApi.js';

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Full-screen opener on the home page: looping court footage with the pitch on top. */
export default function VideoHero() {
  const { data } = useApi('/highlights');
  const stats = data?.stats;

  const figures = [
    { value: stats ? `${stats.resources}+` : '—', label: 'Tables, courts & lanes' },
    { value: stats ? stats.activities : '—', label: 'Games under one roof' },
    { value: stats ? stats.bookingsThisWeek.toLocaleString('en-IN') : '—', label: 'Games played this week' },
  ];

  return (
    <section className="vhero">
      <video
        className="vhero__video"
        src="/media/gamio-hero.mp4"
        autoPlay={!reducedMotion}
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-hidden="true"
      />
      <div className="vhero__shade" aria-hidden="true" />

      <div className="vhero__content">
        <p className="vhero__tagline fade-up">
          <Trophy /> Gujarat&apos;s game hall collective
        </p>

        <h1 className="vhero__title fade-up fade-up--1">
          <span>Rack.</span>
          <span>Rally.</span>
          <span>Repeat.</span>
        </h1>

        <p className="vhero__lede fade-up fade-up--2">
          Pool tables, courts and lanes across four halls. Book a slot in seconds
          <br className="hide-sm" /> and <strong>just show up.</strong>
        </p>

        <div className="vhero__cta fade-up fade-up--3">
          <Link to="/play" className="vhero__btn">
            Find a free slot <ArrowUpRight />
          </Link>
          <div className="vhero__badge">
            <Clock3 />
            <span>
              Open daily
              <br />
              till 11 pm
            </span>
          </div>
        </div>

        <dl className="vhero__stats fade-up fade-up--4">
          {figures.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
