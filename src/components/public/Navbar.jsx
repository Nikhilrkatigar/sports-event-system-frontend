import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../hooks/useTranslation';
import LanguageSelector from './LanguageSelector';
import ThemeToggle from '../ThemeToggle';

export default function Navbar() {
  const [settings, setSettings] = useState({});
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    API.get('/settings').then(r => setSettings(r.data)).catch(() => {});
  }, []);

  const links = [
    { to: '/', label: t('home') },
    { to: '/events', label: t('events') },
    { to: '/timeline', label: t('timeline') },
    { to: '/tournaments', label: t('tournaments') },
    { to: '/register', label: t('register') },
    { to: '/leaderboard', label: t('leaderboard') },
  ];

  return (
    <header className="sticky top-0 z-50">
      <nav className="backdrop-blur-md bg-white/70 dark:bg-gray-900/30 text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity min-w-0 flex-shrink">
          {settings.collegeLogo && <img src={settings.collegeLogo} alt="logo" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover shadow-sm flex-shrink-0" />}
          <div className="min-w-0">
            <div className="font-bold text-sm sm:text-lg leading-tight truncate max-w-[140px] sm:max-w-[220px] md:max-w-none">{settings.collegeName || 'Global College'}</div>
            <div className="text-gray-600 dark:text-white/70 text-[10px] sm:text-xs hidden sm:block truncate">{settings.eventName || 'Annual Sports Day'}</div>
          </div>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link key={l.to} to={l.to} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all backdrop-blur-sm ${pathname === l.to ? 'bg-gray-900/10 dark:bg-white/30 text-gray-900 dark:text-white shadow-md' : 'hover:bg-gray-900/5 dark:hover:bg-white/10 text-gray-700 dark:text-white/90'}`}>{l.label}</Link>
          ))}
          <LanguageSelector />
          <div className="ml-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile toggle & Dark Mode */}
        <div className="flex items-center md:hidden gap-2">
          <LanguageSelector />
          <ThemeToggle />
          <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-gray-900/10 dark:hover:bg-white/20 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden backdrop-blur-md bg-white/70 dark:bg-gray-900/30 border-t border-gray-200 dark:border-white/20 px-4 pb-4 space-y-1">
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block px-4 py-2 rounded-lg text-sm text-gray-700 dark:text-white hover:bg-gray-900/10 dark:hover:bg-white/20 transition-colors">{l.label}</Link>
          ))}
        </div>
      )}
    </nav>
    </header>
  );
}
