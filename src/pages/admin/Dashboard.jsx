import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { TextSkeleton, ListItemSkeleton } from '../../components/Skeletons';

const StatCard = ({ icon, label, value, color, loading }) => (
  <div className="stat-card flex items-center gap-4">
    <div className={`text-3xl p-3 rounded-xl ${color}`}>{icon}</div>
    <div className="flex-1">
      {loading ? (
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-12 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>
      ) : (
        <>
          <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
          <div className="text-sm text-gray-500">{label}</div>
        </>
      )}
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [recentRegs, setRecentRegs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/registrations/stats/overview'),
      API.get('/registrations')
    ])
      .then(([statsRes, regsRes]) => {
        setStats(statsRes.data);
        setRecentRegs(regsRes.data.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="🏅" label="Total Events" value={stats.totalEvents} color="bg-blue-50" loading={loading} />
        <StatCard icon="📝" label="Registrations" value={stats.totalRegistrations} color="bg-green-50" loading={loading} />
        <StatCard icon="👥" label="Teams" value={stats.totalTeams} color="bg-purple-50" loading={loading} />
        <StatCard icon="✅" label="Checked In" value={stats.checkedIn} color="bg-orange-50" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick links */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: '/admin/events', label: 'Add Event', icon: '➕', color: 'bg-blue-50 hover:bg-blue-100 text-blue-800' },
              { to: '/admin/registrations', label: 'View Registrations', icon: '📋', color: 'bg-green-50 hover:bg-green-100 text-green-800' },
              { to: '/admin/scanner', label: 'QR Scanner', icon: '📷', color: 'bg-purple-50 hover:bg-purple-100 text-purple-800' },
              { to: '/admin/leaderboard', label: 'Update Scores', icon: '🏆', color: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-800' },
            ].map(item => (
              <Link key={item.to} to={item.to} className={`${item.color} p-4 rounded-xl flex flex-col items-center gap-2 transition-colors`}>
                <span className="text-2xl">{item.icon}</span>
                <span className="text-sm font-medium text-center">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent registrations */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Recent Registrations</h2>
            <Link to="/admin/registrations" className="text-sm text-blue-600 hover:underline">View all</Link>
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
            <div className="space-y-3">
              {recentRegs.map(reg => (
                <div key={reg._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-sm text-gray-800">{reg.eventId?.title || 'Unknown Event'}</p>
                    <p className="text-xs text-gray-400">{reg.teamId || reg.players[0]?.name} • {new Date(reg.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{reg.players.length} players</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
