import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { hasFullCmsAccess } from '../../utils/roles';

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/events', label: 'Events' },
  { to: '/admin/registrations', label: 'Registrations' },
  { to: '/admin/leaderboard', label: 'Leaderboard' },
  { to: '/admin/gallery', label: 'Gallery' },
  { to: '/admin/scanner', label: 'QR Scanner' },
  { to: '/admin/settings', label: 'Settings' },
  { to: '/admin/audit', label: 'Audit Logs' },
  { to: '/admin/users', label: 'Users' }
];

const organizerAllowed = ['/admin/scanner', '/admin/registrations', '/admin/leaderboard'];

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/admin/login');
  };

  const visibleNavItems = hasFullCmsAccess(admin?.role)
    ? navItems
    : navItems.filter((item) => organizerAllowed.includes(item.to));

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static z-40 w-64 h-full lg:h-auto bg-gradient-to-b from-blue-900 to-blue-800 text-white flex flex-col transition-transform duration-300`}>
        <div className="p-5 border-b border-white/10">
          <div className="text-lg font-bold">Sports CMS</div>
          <div className="text-blue-300 text-xs mt-0.5">Admin Panel</div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {visibleNavItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="px-4 py-2 text-sm text-blue-300 truncate">{admin?.name} ({admin?.role || 'Admin'})</div>
          <button onClick={handleLogout} className="sidebar-link w-full text-left text-red-300 hover:text-red-200">
            <span className="text-xs bg-white/20 rounded px-1.5 py-0.5">Exit</span><span>Logout</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="lg:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold">Sports CMS</span>
          <div></div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
