import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Gamio Arena` : 'Gamio Arena';
  }, [title]);
}
