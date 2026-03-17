import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';

export default function Navbar() {
  const [settings, setSettings] = useState({});
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    API.get('/settings').then(r => setSettings(r.data)).catch(() => {});
  }, []);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/events', label: 'Events' },
    { to: '/timeline', label: '🗓️ Timeline' },
    { to: '/tournaments', label: 'Tournaments' },
    { to: '/register', label: 'Register' },
    { to: '/leaderboard', label: 'Leaderboard' },
  ];

  return (
    <header className="sticky top-0 z-50">
      {settings.announcementActive && settings.announcementText && (
        <div className="bg-red-600 text-white overflow-hidden py-1.5 shadow-md border-b border-red-700">
          <div className="w-full whitespace-nowrap animate-marquee flex items-center font-semibold text-sm">
            <span className="mx-4 text-red-200">●</span> {settings.announcementText}
            <span className="mx-4 text-red-200">●</span> {settings.announcementText}
            <span className="mx-4 text-red-200">●</span> {settings.announcementText}
            <span className="mx-4 text-red-200">●</span> {settings.announcementText}
          </div>
        </div>
      )}
      <nav className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          {settings.collegeLogo && <img src={settings.collegeLogo} alt="logo" className="h-10 w-10 rounded-full object-cover" />}
          <div>
            <div className="font-bold text-lg leading-tight">{settings.collegeName || 'Global College'}</div>
            <div className="text-blue-200 text-xs">{settings.eventName || 'Annual Sports Day'}</div>
          </div>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link key={l.to} to={l.to} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === l.to ? 'bg-white/20 text-white' : 'hover:bg-white/10 dark:hover:bg-gray-800'}`}>{l.label}</Link>
          ))}
          <button 
            onClick={toggleTheme} 
            className="ml-2 p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Mobile toggle & Dark Mode */}
        <div className="flex items-center md:hidden gap-2">
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-xl"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-white/10">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-blue-800 px-4 pb-4 space-y-1">
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block px-4 py-2 rounded-lg text-sm hover:bg-white/10">{l.label}</Link>
          ))}
        </div>
      )}
    </nav>
    </header>
  );
}
