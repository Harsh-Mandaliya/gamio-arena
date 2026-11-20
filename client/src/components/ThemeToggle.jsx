import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const KEY = 'gamio.theme';

function currentTheme() {
  const set = document.documentElement.dataset.theme;
  if (set) return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeToggle({ className = 'icon-btn' }) {
  const [theme, setTheme] = useState(currentTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const flip = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // fine, it just won't be remembered
    }
  };

  return (
    <button className={className} onClick={flip} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </button>
  );
}
