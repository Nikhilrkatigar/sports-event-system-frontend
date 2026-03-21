import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import API from '../../utils/api';
import { ListItemSkeleton } from '../../components/Skeletons';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/roles';

const StatCard = ({ icon, label, value, color, loading }) => (
  <div className="stat-card bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border hover:shadow-lg transition-all duration-300 transform hover:scale-105">
    <div className={`inline-flex items-center justify-center text-2xl font-bold px-4 py-3 rounded-xl ${color} mb-2`}>{icon}</div>
    <div className="flex-1">
      {loading ? (
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
        </div>
      ) : (
        <>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{value ?? '-'}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        </>
      )}
    </div>
  </div>
);

const ChartCard = ({ title, children, loading }) => (
  <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-gray-100 dark:border-dark-border shadow-sm hover:shadow-md transition-all duration-300">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
    {loading ? (
      <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
    ) : (
      children
    )}
  </div>
);

export default function DashboardWithCharts() {
  const { admin } = useAuth();
  const [stats, setStats] = useState({});
  const [events, setEvents] = useState([]);
  const [recentRegs, setRecentRegs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/registrations/stats/overview'),
      API.get('/registrations'),
      API.get('/events')
    ])
      .then(([statsRes, regsRes, eventsRes]) => {
        setStats(statsRes.data);
        setRecentRegs(regsRes.data.slice(0, 5));
        setEvents(eventsRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Chart data for event registrations
  const eventRegData = useMemo(() => {
    return events.slice(0, 6).map(event => ({
      name: event.title.substring(0, 12),
      registrations: event.teamCount || event.playerCount || 0,
      capacity: event.maxParticipants || 0
    }));
  }, [events]);

  // Chart data for payment status
  const paymentData = useMemo(() => {
    const paidCount = recentRegs.filter(r => r.paymentStatus === 'paid').length;
    const pendingCount = recentRegs.filter(r => r.paymentStatus === 'pending').length;
    const freeCount = recentRegs.filter(r => !r.eventId?.registrationFee || r.eventId.registrationFee === 0).length;
    
    return [
      { name: 'Paid', value: paidCount, color: '#10b981' },
      { name: 'Pending', value: pendingCount, color: '#f59e0b' },
      { name: 'Free', value: freeCount, color: '#3b82f6' }
    ].filter(item => item.value > 0);
  }, [recentRegs]);

  // Chart data for gender composition
  const genderData = useMemo(() => {
    let males = 0, females = 0, unspecified = 0;
    recentRegs.forEach(reg => {
      (reg.players || []).forEach(player => {
        if (player.gender === 'male') males++;
        else if (player.gender === 'female') females++;
        else unspecified++;
      });
    });
    
    return [
      { name: 'Males', value: males, color: '#3b82f6' },
      { name: 'Females', value: females, color: '#ec4899' },
      { name: 'Unspecified', value: unspecified, color: '#6b7280' }
    ].filter(item => item.value > 0);
  }, [recentRegs]);

  // Check-in progress data
  const checkinProgress = useMemo(() => {
    const total = stats.totalRegistrations || 0;
    const checkedIn = stats.checkedIn || 0;
    return [
      { name: 'Checked In', value: checkedIn, fill: '#10b981' },
      { name: 'Pending', value: total - checkedIn, fill: '#ef4444' }
    ];
  }, [stats]);

  const quickActions = useMemo(() => ([
    { to: '/admin/events', label: 'Add Event', short: '+ Event', permission: 'manage_events', color: 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-800 dark:text-blue-300' },
    { to: '/admin/registrations', label: 'View Registrations', short: 'Regs', permission: 'view_registrations', color: 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 text-green-800 dark:text-green-300' },
    { to: '/admin/scanner', label: 'QR Scanner', short: 'Scan', permission: 'check_in', color: 'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-800 dark:text-purple-300' },
    { to: '/admin/leaderboard', label: 'Update Scores', short: 'Scores', permission: 'manage_leaderboard', color: 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300' },
    { to: '/admin/tournaments', label: 'Manage Brackets', short: 'Bracket', permission: 'manage_tournaments', color: 'bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300' }
  ].filter((action) => hasPermission(admin?.role, action.permission))), [admin?.role]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Welcome back! Here's your event overview</p>

      {/* Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="📅" label="Total Events" value={stats.totalEvents} color="bg-blue-50 dark:bg-blue-900/20" loading={loading} />
        <StatCard icon="📝" label="Registrations" value={stats.totalRegistrations} color="bg-green-50 dark:bg-green-900/20" loading={loading} />
        <StatCard icon="✅" label="Checked In" value={stats.checkedIn} color="bg-emerald-50 dark:bg-emerald-900/20" loading={loading} />
        <StatCard icon="💰" label="Payments Pending" value={stats.pendingPayments} color="bg-orange-50 dark:bg-orange-900/20" loading={loading} />
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-gray-100 dark:border-dark-border mb-8 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickActions.map((item) => (
            <Link 
              key={item.to} 
              to={item.to} 
              className={`${item.color} p-4 rounded-lg flex flex-col items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95`}
            >
              <span className="text-sm font-semibold">{item.short}</span>
              <span className="text-xs font-medium text-center">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Event Registrations Bar Chart */}
        <ChartCard title="Registrations by Event" loading={loading && eventRegData.length === 0}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={eventRegData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="registrations" fill="#3b82f6" name="Registrations" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Payment Status Pie Chart */}
        <ChartCard title="Payment Status" loading={loading && paymentData.length === 0}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Gender Composition Pie Chart */}
        <ChartCard title="Gender Distribution" loading={loading && genderData.length === 0}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {genderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Check-in Progress Bar Chart */}
        <ChartCard title="Check-in Progress" loading={loading}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={checkinProgress}
              margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Bar dataKey="value" radius={8}>
                {checkinProgress.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Recent Registrations */}
      <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-gray-100 dark:border-dark-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Registrations</h2>
          {hasPermission(admin?.role, 'view_registrations') && (
            <Link to="/admin/registrations" className="text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors">View all →</Link>
          )}
        </div>
        {loading ? (
          <div className="space-y-3">
            <ListItemSkeleton />
            <ListItemSkeleton />
            <ListItemSkeleton />
          </div>
        ) : recentRegs.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No registrations yet</p>
        ) : (
          <div className="space-y-2">
            {recentRegs.map((reg) => (
              <div
                key={reg._id}
                className="p-3 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{reg.eventId?.title || '-'}</p>
                    <p className="text-xs text-gray-500">{reg.teamName || `${reg.players.length} player(s)`}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      reg.paymentStatus === 'paid' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' :
                      reg.paymentStatus === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' :
                      'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    }`}>
                      {reg.paymentStatus === 'paid' ? '✓ Paid' : reg.paymentStatus === 'pending' ? '⏳ Pending' : 'Free'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
