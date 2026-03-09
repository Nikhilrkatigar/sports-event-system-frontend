import { useEffect, useState } from 'react';
import Navbar from '../../components/public/Navbar';
import API from '../../utils/api';
import { TableRowSkeleton } from '../../components/Skeletons';

export default function LeaderboardPage() {
  const [data, setData] = useState([]);
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await API.get('/leaderboard');
        setData(r.data);
      } finally {
        setLoading(false);
      }
    };
    load();
    API.get('/events').then(r => setEvents(r.data));
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter ? data.filter(d => d.eventId?._id === filter) : data;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">🏆 Live Leaderboard</h1>
          <p className="text-gray-500 mt-2">Updates every 30 seconds</p>
        </div>

        <div className="mb-6">
          <select className="input-field max-w-xs" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All Events</option>
            {events.map(ev => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
          </select>
        </div>

        {loading && data.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
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
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🏅</div>
            <p>No results yet. Check back soon!</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
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
                {filtered.map((entry, i) => (
                  <tr key={entry._id} className={`border-t border-gray-100 ${i === 0 ? 'bg-yellow-50' : i === 1 ? 'bg-gray-50' : ''}`}>
                    <td className="px-6 py-4 font-bold text-xl">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-gray-500 text-sm">#{entry.rank}</span>}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{entry.teamOrPlayer}</td>
                    <td className="px-6 py-4 text-gray-500">{entry.eventId?.title || '—'}</td>
                    <td className="px-6 py-4 text-right font-bold text-blue-700 text-lg">{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
