import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { TableRowSkeleton } from '../../components/Skeletons';

export default function CricketManagePage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, live, completed, upcoming
  const navigate = useNavigate();

  const loadMatches = async () => {
    try {
      setLoading(true);
      const res = await API.get('/cricket/matches');
      setMatches(res.data || []);
    } catch (err) {
      console.error('Error loading matches:', err);
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const filteredMatches = matches.filter(m => {
    if (filter === 'all') return true;
    return m.status === filter;
  });

  const getStatusBadge = (status) => {
    const styles = {
      live: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
      upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    };
    const icons = {
      live: '🔴 LIVE',
      completed: '✅ COMPLETED',
      upcoming: '⏳ UPCOMING'
    };
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles[status]}`}>{icons[status] || status}</span>;
  };

  const getInningsDisplay = (match) => {
    const inn1 = match.innings?.find(i => i.inningNumber === 1);
    const inn2 = match.innings?.find(i => i.inningNumber === 2);
    
    return (
      <div className="space-y-1">
        {inn1 && (
          <div className="text-sm">
            <span className="font-medium">{match.teamA?.name}</span>: {inn1.totalRuns}/{inn1.totalWickets} ({inn1.totalOvers})
          </div>
        )}
        {inn2 && (
          <div className="text-sm">
            <span className="font-medium">{match.teamB?.name}</span>: {inn2.totalRuns}/{inn2.totalWickets} ({inn2.totalOvers})
          </div>
        )}
        {!inn1 && !inn2 && <div className="text-sm text-gray-400">Not started</div>}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🏏 Cricket Matches</h1>
        <button
          onClick={() => navigate('/admin/cricket/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
        >
          + New Match
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'live', 'upcoming', 'completed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition capitalize ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300'
            }`}
          >
            {f === 'all' ? 'All' : filter === 'live' ? '🔴 Live' : filter === 'upcoming' ? '⏳ Upcoming' : '✅ Completed'}
          </button>
        ))}
      </div>

      {/* Matches Table */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-dark-border">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Event</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Teams</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Score</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Venue</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <TableRowSkeleton columns={6} />
                <TableRowSkeleton columns={6} />
                <TableRowSkeleton columns={6} />
              </>
            ) : filteredMatches.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-8 text-gray-400">
                  No {filter !== 'all' ? filter : ''} matches found
                </td>
              </tr>
            ) : (
              filteredMatches.map(match => (
                <tr key={match._id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900 dark:text-white">{match.eventId?.title || 'Cricket Match'}</div>
                    <div className="text-xs text-gray-500">{new Date(match.matchDate).toLocaleDateString()}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <span className="font-medium">{match.teamA?.name}</span>
                      <span className="text-gray-400"> vs </span>
                      <span className="font-medium">{match.teamB?.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{getInningsDisplay(match)}</td>
                  <td className="px-4 py-3">{getStatusBadge(match.status)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{match.venue || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      {match.status === 'live' && (
                        <button
                          onClick={() => navigate(`/admin/cricket/live-scoring/${match._id}`)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold transition"
                        >
                          🔴 Score Now
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/admin/cricket/${match._id}`)}
                        className="border border-gray-300 dark:border-gray-600 px-3 py-1 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          if (match.status === 'upcoming') {
                            // Start match scoring
                            navigate(`/admin/cricket/live-scoring/${match._id}`);
                          }
                        }}
                        disabled={match.status !== 'upcoming'}
                        className="border border-blue-300 dark:border-blue-600 px-3 py-1 rounded text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {match.status === 'upcoming' ? 'Start' : 'Edit'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-100 dark:border-red-900/40">
          <div className="text-red-600 dark:text-red-400 font-bold text-2xl">{matches.filter(m => m.status === 'live').length}</div>
          <div className="text-red-700 dark:text-red-300 text-sm">Live Matches</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900/40">
          <div className="text-blue-600 dark:text-blue-400 font-bold text-2xl">{matches.filter(m => m.status === 'upcoming').length}</div>
          <div className="text-blue-700 dark:text-blue-300 text-sm">Upcoming Matches</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-100 dark:border-green-900/40">
          <div className="text-green-600 dark:text-green-400 font-bold text-2xl">{matches.filter(m => m.status === 'completed').length}</div>
          <div className="text-green-700 dark:text-green-300 text-sm">Completed Matches</div>
        </div>
      </div>
    </div>
  );
}
