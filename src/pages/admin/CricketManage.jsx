import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { useConfirm } from '../../hooks/useConfirm';

const STATUS_COLORS = {
  upcoming: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  live: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  completed: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  abandoned: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
};

export default function CricketManage() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/cricket/matches')
      .then(res => setMatches(res.data || []))
      .catch(() => toast.error('Failed to load cricket matches'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Match',
      message: 'Delete this match and all its ball-by-ball data? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDangerous: true,
    });
    if (!confirmed) return;
    try {
      await API.delete(`/cricket/matches/${id}`);
      setMatches(prev => prev.filter(m => m._id !== id));
      toast.success('Match deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🏏 Cricket Matches</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage IDCL cricket matches and live scoring</p>
        </div>
        <button
          onClick={() => navigate('/admin/cricket/new')}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg"
        >
          + New Match
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-400">Loading matches...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <div className="text-5xl mb-4">🏏</div>
          <p className="text-lg">No cricket matches yet</p>
          <p className="text-sm mt-2">Create your first match to start scoring</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map(match => {
            const inn1 = match.innings?.find(i => i.inningNumber === 1);
            const inn2 = match.innings?.find(i => i.inningNumber === 2);
            return (
              <div
                key={match._id}
                className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm hover:shadow-lg transition-all p-5 cursor-pointer group"
                onClick={() => navigate(`/admin/cricket/${match._id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[match.status] || STATUS_COLORS.upcoming}`}>
                        {match.status === 'live' && '● '}{match.status?.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400">{match.oversPerSide} overs</span>
                      {match.venue && <span className="text-xs text-gray-400">• {match.venue}</span>}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between max-w-md">
                        <span className={`font-bold text-gray-900 dark:text-white ${match.result?.winner === 'teamA' ? 'text-green-600 dark:text-green-400' : ''}`}>
                          {match.teamA?.name || 'Team A'}
                        </span>
                        {inn1 && (
                          <span className="font-mono font-bold text-gray-900 dark:text-white">
                            {inn1.battingTeam === 'teamA' ? `${inn1.totalRuns}/${inn1.totalWickets} (${inn1.totalOvers})` :
                             inn2 ? `${inn2.totalRuns}/${inn2.totalWickets} (${inn2.totalOvers})` : '—'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between max-w-md">
                        <span className={`font-bold text-gray-900 dark:text-white ${match.result?.winner === 'teamB' ? 'text-green-600 dark:text-green-400' : ''}`}>
                          {match.teamB?.name || 'Team B'}
                        </span>
                        {inn1 && (
                          <span className="font-mono font-bold text-gray-900 dark:text-white">
                            {inn1.battingTeam === 'teamB' ? `${inn1.totalRuns}/${inn1.totalWickets} (${inn1.totalOvers})` :
                             inn2 ? `${inn2.totalRuns}/${inn2.totalWickets} (${inn2.totalOvers})` : '—'}
                          </span>
                        )}
                      </div>
                    </div>
                    {match.result?.resultText && (
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-2">{match.result.resultText}</p>
                    )}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); handleDelete(match._id); }}
                      className="px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-3">
                  {match.matchDate ? new Date(match.matchDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  {match.eventId?.title ? ` • ${match.eventId.title}` : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
