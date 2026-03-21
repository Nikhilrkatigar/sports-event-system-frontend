import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MobileBottomNav() {
  const location = useLocation();
  const { isLoggedIn, admin } = useAuth();
  
  // Don't show on admin routes
  if (admin || location.pathname.startsWith('/admin')) {
    return null;
  }

  if (!isLoggedIn) {
    return null;
  }

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', icon: '🏠', label: 'Home', short: 'Home' },
    { path: '/events', icon: '📅', label: 'Events', short: 'Events' },
    { path: '/tournaments', icon: '🏆', label: 'Tournaments', short: 'Tourney' },
    { path: '/leaderboard', icon: '📊', label: 'Leaderboard', short: 'Board' },
    { path: '/profile', icon: '👤', label: 'Profile', short: 'Profile' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white dark:bg-dark-card border-t border-gray-200 dark:border-gray-700 z-40 safe-area-inset-bottom">
      <div className="flex justify-around items-stretch">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 transition-all duration-200 relative ${
              isActive(item.path)
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            <span className={`text-2xl mb-1 transform transition-transform duration-200 ${isActive(item.path) ? 'scale-110' : 'hover:scale-105'}`}>
              {item.icon}
            </span>
            <span className="text-xs font-medium">{item.short}</span>
            {isActive(item.path) && (
              <div className="absolute bottom-0 w-full h-1 bg-blue-600 dark:bg-blue-400 rounded-t-full transition-all duration-200"></div>
            )}
          </Link>
        ))}
      </div>
      {/* Padding for content that might scroll under nav */}
      <style>{`
        .safe-area-inset-bottom {
          padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </nav>
  );
}
