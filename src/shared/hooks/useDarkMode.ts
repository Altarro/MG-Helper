import { useState, useEffect } from 'react';

const DARK_KEY = 'mg-helper-dark-mode';

export function useDarkMode(): [boolean, () => void] {
  const [dark, setDark] = useState<boolean>(() => {
    const stored = localStorage.getItem(DARK_KEY);
    if (stored !== null) return stored === '1';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem(DARK_KEY, dark ? '1' : '0');
  }, [dark]);

  return [dark, () => setDark((d) => !d)];
}
