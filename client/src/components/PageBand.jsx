import { ActivityIcon } from './ActivityIcon.jsx';

/** Dark header band for inner pages, with a big faint game glyph in the corner. */
export default function PageBand({ eyebrow, title, children, icon = 'pool', color }) {
  return (
    <header className="page-band" style={color ? { '--band': color } : undefined}>
      <div className="page-band__art" aria-hidden="true">
        <ActivityIcon name={icon} />
      </div>
      <div className="wrap">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {children}
      </div>
    </header>
  );
}
