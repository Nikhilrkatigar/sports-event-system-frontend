import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/roles';
import {
  CalendarDays, Users, CheckCircle2, CreditCard,
  Plus, Eye, ScanLine, Trophy, LayoutDashboard,
  ArrowRight, TrendingUp
} from 'lucide-react';

/* ─── Custom Tooltip ─── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-semibold text-gray-800 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-gray-600">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color || p.fill }} />
          {p.name}: <span className="font-semibold text-gray-900">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

/* ─── Stat Card ─── */
const StatCard = ({ icon: Icon, label, value, accent, loading }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 transition-shadow hover:shadow-md">
    <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${accent}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      {loading ? (
        <>
          <div className="h-7 w-12 bg-gray-100 rounded animate-pulse mb-1" />
          <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
        </>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900 leading-none">{value ?? '–'}</p>
          <p className="text-xs text-gray-500 mt-1">{label}</p>
        </>
      )}
    </div>
  </div>
);

/* ─── Main Component ─── */
export default function DashboardWithCharts() {
  const { admin } = useAuth();
  const [stats, setStats] = useState({});
  const [events, setEvents] = useState([]);
  const [recentRegs, setRecentRegs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/registrations/stats/overview').catch(() => ({ data: {} })),
      API.get('/registrations').catch(() => ({ data: [] })),
      API.get('/events').catch(() => ({ data: [] }))
    ])
      .then(([s, r, e]) => {
        setStats(s.data || {});
        setRecentRegs((r.data || []).slice(0, 6));
        setEvents(e.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const barData = useMemo(() =>
    events.slice(0, 6).map(e => ({
      name: e.title.length > 14 ? e.title.slice(0, 14) + '…' : e.title,
      regs: e.teamCount || e.playerCount || 0,
    })), [events]);

  const pieData = useMemo(() => [
    { name: 'Paid', value: recentRegs.filter(r => r.paymentStatus === 'paid').length, color: '#10b981' },
    { name: 'Pending', value: recentRegs.filter(r => r.paymentStatus === 'pending').length, color: '#f59e0b' },
    { name: 'Free', value: recentRegs.filter(r => !r.eventId?.registrationFee || r.eventId.registrationFee === 0).length, color: '#3b82f6' },
  ].filter(d => d.value > 0), [recentRegs]);

  const quickActions = useMemo(() => [
    { to: '/admin/events', label: 'New Event', icon: Plus, permission: 'manage_events' },
    { to: '/admin/registrations', label: 'Registrations', icon: Eye, permission: 'view_registrations' },
    { to: '/admin/scanner', label: 'QR Scanner', icon: ScanLine, permission: 'check_in' },
    { to: '/admin/leaderboard', label: 'Leaderboard', icon: Trophy, permission: 'manage_leaderboard' },
    { to: '/admin/tournaments', label: 'Brackets', icon: LayoutDashboard, permission: 'manage_tournaments' },
  ].filter(a => hasPermission(admin?.role, a.permission)), [admin?.role]);

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Welcome back, <span className="font-medium text-gray-700">{admin?.name || 'Admin'}</span>
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={CalendarDays} label="Total Events" value={stats.totalEvents} accent="bg-blue-600" loading={loading} />
        <StatCard icon={Users} label="Registrations" value={stats.totalRegistrations} accent="bg-emerald-600" loading={loading} />
        <StatCard icon={CheckCircle2} label="Checked In" value={stats.checkedIn} accent="bg-violet-600" loading={loading} />
        <StatCard icon={CreditCard} label="Pending Pay" value={stats.pendingPayments} accent="bg-amber-500" loading={loading} />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map(a => {
          const Icon = a.icon;
          return (
            <Link
              key={a.to}
              to={a.to}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              <Icon size={15} />
              {a.label}
            </Link>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Bar chart */}
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-800">Registrations by Event</h2>
          </div>
          {loading ? (
            <div className="h-64 rounded-lg bg-gray-50 animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 0, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#3b82f6', opacity: 0.06 }} />
                <Bar dataKey="regs" name="Registrations" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut chart */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-5">Payment Status</h2>
          {loading ? (
            <div className="h-64 rounded-lg bg-gray-50 animate-pulse" />
          ) : pieData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-20">No payment data yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData} cx="50%" cy="50%"
                    innerRadius={60} outerRadius={85}
                    paddingAngle={3} dataKey="value" stroke="none"
                  >
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-5 mt-3">
                {pieData.map(d => (
                  <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Registrations */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Recent Registrations</h2>
          {hasPermission(admin?.role, 'view_registrations') && (
            <Link to="/admin/registrations" className="text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-1">
              View all <ArrowRight size={13} />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />)}
          </div>
        ) : recentRegs.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-12">No registrations yet</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentRegs.map(reg => (
              <div key={reg._id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                  {(reg.teamName || reg.players?.[0]?.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {reg.teamName || reg.players?.[0]?.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {reg.eventId?.title || '–'} · {reg.players?.length || 0} player(s)
                  </p>
                </div>
                <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  reg.paymentStatus === 'paid'
                    ? 'bg-emerald-50 text-emerald-700'
                    : reg.paymentStatus === 'pending'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-blue-50 text-blue-700'
                }`}>
                  {reg.paymentStatus === 'paid' ? 'Paid' : reg.paymentStatus === 'pending' ? 'Pending' : 'Free'}
                </span>
                <span className="hidden sm:block text-xs text-gray-400 shrink-0">
                  {new Date(reg.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
