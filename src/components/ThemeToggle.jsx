import React from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ theme, setTheme, toggleTheme }) {
  const isDark = theme === 'dark';

  const handleSetLight = (e) => {
    e.stopPropagation();
    if (setTheme) setTheme('light');
    else if (toggleTheme && isDark) toggleTheme();
  };

  const handleSetDark = (e) => {
    e.stopPropagation();
    if (setTheme) setTheme('dark');
    else if (toggleTheme && !isDark) toggleTheme();
  };

  return (
    <div 
      className="inline-flex items-center p-1 rounded-full bg-slate-200/90 dark:bg-[#090e1a] border border-slate-300/80 dark:border-slate-700/60 shadow-inner select-none transition-colors"
      role="group"
      aria-label="Theme selector"
    >
      {/* Light option */}
      <button
        type="button"
        onClick={handleSetLight}
        className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
          !isDark
            ? 'bg-white text-amber-600 shadow-md shadow-slate-300/50 scale-100'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 scale-95'
        }`}
        title="Chuyển sang Chế độ Sáng"
      >
        <Sun className={`w-3.5 h-3.5 ${!isDark ? 'text-amber-500 animate-spin-slow' : ''}`} />
        <span className="hidden sm:inline">Sáng</span>
      </button>

      {/* Dark option */}
      <button
        type="button"
        onClick={handleSetDark}
        className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
          isDark
            ? 'bg-gradient-to-r from-[#00dfa2] to-[#00b4d8] text-slate-950 shadow-md shadow-emerald-500/20 scale-100'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 scale-95'
        }`}
        title="Chuyển sang Chế độ Tối"
      >
        <Moon className={`w-3.5 h-3.5 ${isDark ? 'text-slate-950' : ''}`} />
        <span className="hidden sm:inline">Tối</span>
      </button>
    </div>
  );
}
