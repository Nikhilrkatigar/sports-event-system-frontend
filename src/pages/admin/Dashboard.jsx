import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/roles';
import { 
  CalendarDays, 
  Users, 
  DoorOpen, 
  Ban, 
  Trophy, 
  CheckCircle, 
  Clock, 
  Activity,
  PlusCircle,
  ScanLine,
  Award,
  Swords,
  ChevronRight,
  Download,
  Loader2
} from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, gradient, loading }) => (
  <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-gray-100 dark:border-slate-800/50 backdrop-blur-xl transition-all duration-300 hover:shadow-lg dark:hover:shadow-blue-900/20 hover:-translate-y-1">
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 dark:opacity-20 blur-2xl ${gradient.replace('text-', 'bg-')}`}></div>
    <div className="flex items-start justify-between">
      <div>
        <div className="text-sm font-medium tracking-wide text-gray-500 dark:text-slate-400 uppercase mb-2">
          {label}
        </div>
        {loading ? (
          <div className="space-y-2 mt-2">
            <div className="h-8 bg-gray-100 dark:bg-slate-800 rounded-lg w-16 animate-pulse"></div>
          </div>
        ) : (
          <div className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {value ?? '-'}
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-inner`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

const QuickActionCard = ({ to, label, short, icon: Icon, gradient }) => (
  <Link 
    to={to} 
    className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/40 border border-gray-100 dark:border-slate-700/50 p-5 flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-900/10"
  >
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br ${gradient} transition-opacity duration-300`}></div>
    <div className={`p-4 rounded-full bg-gray-50 dark:bg-slate-800 group-hover:bg-gradient-to-br ${gradient} transition-colors duration-300`}>
      <Icon className="w-6 h-6 text-gray-600 dark:text-slate-300 group-hover:text-white transition-colors duration-300" />
    </div>
    <div className="text-center">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 tracking-tight">{short}</h3>
      <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{label}</p>
    </div>
  </Link>
);

export default function Dashboard() {
  const { admin } = useAuth();
  const [stats, setStats] = useState({});
  const [recentRegs, setRecentRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      API.get('/registrations/stats/overview').catch(() => ({ data: {} })),
      API.get('/registrations').catch(() => ({ data: [] }))
    ])
      .then(([statsRes, regsRes]) => {
        setStats(statsRes.data || {});
        setRecentRegs((regsRes.data || []).slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const response = await API.get('/registrations/export/dashboard-pdf', {
        responseType: 'blob'
      });
      
      // response.data is already a Blob, don't wrap it
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Dashboard_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to export PDF. Please try again.';
      toast.error(errorMessage);
    } finally {
      setExporting(false);
    }
  };

  const quickActions = useMemo(() => ([
    { to: '/admin/events', label: 'Create New Event', short: 'Add Event', icon: PlusCircle, permission: 'manage_events', gradient: 'from-blue-500 to-indigo-600' },
    { to: '/admin/registrations', label: 'Monitor Entries', short: 'Registrations', icon: Users, permission: 'view_registrations', gradient: 'from-emerald-500 to-teal-600' },
    { to: '/admin/scanner', label: 'Verify Tickets', short: 'QR Scanner', icon: ScanLine, permission: 'check_in', gradient: 'from-purple-500 to-fuchsia-600' },
    { to: '/admin/leaderboard', label: 'Manage Results', short: 'Update Scores', icon: Award, permission: 'manage_leaderboard', gradient: 'from-amber-500 to-orange-600' },
    { to: '/admin/tournaments', label: 'Draw Matches', short: 'Brackets', icon: Swords, permission: 'manage_tournaments', gradient: 'from-rose-500 to-red-600' }
  ].filter((action) => hasPermission(admin?.role, action.permission))), [admin?.role]);

  return (
    <div className="bg-transparent font-sans">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-slate-400 tracking-tight">
            Command Center
          </h1>
          <p className="text-gray-500 dark:text-slate-400 mt-2 font-medium">
            Welcome back, {admin?.name || 'Admin'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasPermission(admin?.role, 'view_dashboard') && (
            <button
              onClick={handleExportPDF}
              disabled={exporting || loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export PDF</span>
                </>
              )}
            </button>
          )}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 rounded-full shadow-sm backdrop-blur-md">
            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Live System Status</span>
          </div>
        </div>
      </div>

      {/* Top Stats Array */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
        <StatCard icon={CalendarDays} label="Total Events" value={stats.totalEvents} gradient="from-blue-500 to-indigo-600" loading={loading} />
        <StatCard icon={Users} label="Registrations" value={stats.totalRegistrations} gradient="from-emerald-500 to-emerald-700" loading={loading} />
        <StatCard icon={DoorOpen} label="Open Events" value={stats.openEvents} gradient="from-cyan-400 to-blue-500" loading={loading} />
        <StatCard icon={Ban} label="Full Events" value={stats.fullEvents} gradient="from-rose-400 to-rose-600" loading={loading} />
        
        <StatCard icon={Trophy} label="Teams" value={stats.totalTeams} gradient="from-purple-500 to-purple-700" loading={loading} />
        <StatCard icon={CheckCircle} label="Checked In" value={stats.checkedIn} gradient="from-teal-400 to-emerald-500" loading={loading} />
        <StatCard icon={Clock} label="Pending Check-In" value={stats.pendingCheckIn} gradient="from-amber-400 to-orange-500" loading={loading} />
        <StatCard icon={Activity} label="Recent Activity" value={recentRegs.length} gradient="from-slate-600 to-slate-800" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 mb-8">
        
        {/* Quick Actions Grid */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight flex items-center gap-2">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 h-full">
            {quickActions.map((item) => (
              <QuickActionCard key={item.to} {...item} />
            ))}
          </div>
        </div>

        {/* Live Registrations Feed */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-white dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800/50 rounded-2xl p-6 h-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-xl flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                Live Feed
              </h2>
              {hasPermission(admin?.role, 'view_registrations') && (
                <Link to="/admin/registrations" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center transition-colors">
                  View all <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              )}
            </div>

            <div className="flex-1 overflow-hidden">
              {loading ? (
                <div className="space-y-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-3/4 animate-pulse"></div>
                        <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-1/2 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentRegs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-500 py-12">
                  <Activity className="w-12 h-12 mb-4 opacity-30" />
                  <p className="font-medium text-sm">No recent activity detected.</p>
                </div>
              ) : (
                <div className="space-y-4 pr-1">
                  {recentRegs.map((reg) => (
                    <div key={reg._id} className="group flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/40 border border-transparent dark:hover:border-slate-700/50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-slate-800/80 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm shadow-sm">
                          {(reg.teamId || reg.players[0]?.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {reg.eventId?.title || 'Unknown Event'}
                          </p>
                          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mt-0.5 max-w-[120px] truncate">
                            {reg.teamId || reg.players[0]?.name}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">
                            {new Date(reg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50">
                          {reg.players.length} {reg.players.length === 1 ? 'plyr' : 'plyrs'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
