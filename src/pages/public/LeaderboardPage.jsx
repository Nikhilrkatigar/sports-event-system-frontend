import { useEffect, useState } from 'react';
import Navbar from '../../components/public/Navbar';
import API from '../../utils/api';
import { TableRowSkeleton } from '../../components/Skeletons';

export default function LeaderboardPage() {
  const [data, setData] = useState([]);
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const load = async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const r = await API.get('/leaderboard');
        setData(r.data);
        setLastUpdated(new Date());
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };
    load();
    API.get('/events').then(r => setEvents(r.data));
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter ? data.filter(d => d.eventId?._id === filter) : data;
  const topThree = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-900 animate-slide-down">🏆 Live Leaderboard</h1>
          <p className="text-gray-500 mt-4 animate-slide-up">Updates every 30 seconds</p>
          <div className="text-xs text-gray-400 mt-1 animate-pulse">
            {refreshing ? '🔄 Refreshing now...' : lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : 'Loading updates...'}
          </div>
        </div>

        <div className="mb-6 overflow-x-auto animate-slide-down">
          <div className="inline-flex items-center gap-2 bg-white border border-gray-100 shadow-sm rounded-full px-2 py-2">
            <button
              className={`px-4 py-1.5 text-sm rounded-full transition-all transform hover:scale-110 ${
                filter === '' ? 'bg-gradient-to-r from-blue-700 to-blue-800 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setFilter('')}
            >
              All Events
            </button>
            {events.map(ev => (
              <button
                key={ev._id}
                className={`px-4 py-1.5 text-sm rounded-full transition-all transform hover:scale-110 ${
                  filter === ev._id ? 'bg-gradient-to-r from-blue-700 to-blue-800 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setFilter(ev._id)}
              >
                {ev.title}
              </button>
            ))}
          </div>
        </div>

        {loading && data.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 animate-fade-in">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-900 to-blue-700 text-white">
                <tr>
                  <th className="px-6 py-4 text-left">Rank</th>
                  <th className="px-6 py-4 text-left">Player / Team</th>
                  <th className="px-6 py-4 text-left">Event</th>
                  <th className="px-6 py-4 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                <TableRowSkeleton columns={4} />
                <TableRowSkeleton columns={4} />
                <TableRowSkeleton columns={4} />
                <TableRowSkeleton columns={4} />
                <TableRowSkeleton columns={4} />
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 animate-fade-in">
            <div className="text-5xl mb-4 animate-bounce">🏅</div>
            <p>No results yet. Check back soon!</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {topThree.map((entry, i) => (
                <div
                  key={entry._id}
                  className={`rounded-2xl border shadow-md hover:shadow-xl transition-all transform hover:scale-110 px-4 py-5 text-center animate-stagger-${i + 1} ${
                    i === 0 ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 ring-2 ring-yellow-300' : i === 1 ? 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 ring-2 ring-gray-300' : 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200 ring-2 ring-orange-300'
                  }`}
                >
                  <div className={`text-4xl mb-2 inline-block animate-bounce ${i === 0 ? 'animate-float' : ''}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                  </div>
                  <div className="text-lg font-bold text-gray-900">{entry.teamOrPlayer}</div>
                  <div className="text-xs text-gray-500 mt-1 font-medium">{entry.eventId?.title || '—'}</div>
                  <div className="mt-3 text-3xl font-black bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">{entry.score}</div>
                  <div className="text-xs text-gray-400 mt-1">#{entry.rank}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow animate-slide-up">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-blue-900 to-blue-700 text-white">
                  <tr className="animate-slide-down">
                    <th className="px-6 py-4 text-left">Rank</th>
                    <th className="px-6 py-4 text-left">Player / Team</th>
                    <th className="px-6 py-4 text-left">Event</th>
                    <th className="px-6 py-4 text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-6 text-center text-gray-400">Only top 3 available</td>
                    </tr>
                  ) : (
                    rest.map((entry, idx) => (
                      <tr key={entry._id} className={`border-t border-gray-100 hover:bg-blue-50 transition-all animate-stagger-${(idx % 6) + 1}`}>
                        <td className="px-6 py-4 font-bold text-orange-600">#{entry.rank}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{entry.teamOrPlayer}</td>
                        <td className="px-6 py-4 text-gray-500">{entry.eventId?.title || '—'}</td>
                        <td className="px-6 py-4 text-right font-bold text-lg text-blue-700">{entry.score}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
