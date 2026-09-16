'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('codedrop_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('codedrop_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('codedrop_theme', 'light');
    }
  };

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle Light and Dark Mode"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className="group relative flex items-center justify-center w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high dark:bg-slate-800 dark:hover:bg-slate-700 text-on-surface-variant dark:text-slate-200 transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm overflow-hidden"
    >
      <span
        className={`material-symbols-outlined text-[20px] transition-transform duration-500 ease-spring ${
          isDark ? 'rotate-180 scale-100 text-amber-400' : 'rotate-0 scale-100 text-primary'
        }`}
      >
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
}
