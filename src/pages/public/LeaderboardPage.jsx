import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Navbar from '../../components/public/Navbar';
import ProfileModal from '../../components/public/ProfileModal';
import API from '../../utils/api';
import { TableRowSkeleton } from '../../components/Skeletons';

const isRankedPodiumEntry = (entry) => (
  entry
  && entry.teamOrPlayer
  && entry.rank != null
  && Number(entry.rank) <= 3
  && entry.score !== null
  && entry.score !== undefined
  && Number(entry.score) !== 0
);

export default function LeaderboardPage() {
  const [data, setData] = useState([]);
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    const load = async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [leaderboardRes, eventsRes] = await Promise.all([
          API.get('/leaderboard'),
          API.get('/events')
        ]);

        setData(Array.isArray(leaderboardRes.data) ? leaderboardRes.data : []);
        setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Error loading leaderboard:', err);
        toast.error('Failed to load leaderboard');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    load();
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const sorted = useMemo(() => {
    const eventFiltered = filter
      ? data.filter((entry) => {
          if (!entry || !entry.teamOrPlayer) return false;
          const eventId = entry.eventId?._id || entry.eventId;
          return String(eventId) === String(filter);
        })
      : data.filter((entry) => entry && entry.teamOrPlayer);

    const genderScoped = genderFilter === 'all'
      ? eventFiltered
      : eventFiltered.filter((entry) => entry.gender === genderFilter);

    return genderScoped
      .filter(isRankedPodiumEntry)
      .sort((a, b) => {
        const aEvent = String(a.eventId?.title || '');
        const bEvent = String(b.eventId?.title || '');
        if (aEvent !== bEvent) return aEvent.localeCompare(bEvent);
        if (a.rank !== b.rank) return a.rank - b.rank;

        const aScore = Number(a.score);
        const bScore = Number(b.score);
        if (!Number.isNaN(aScore) && !Number.isNaN(bScore) && aScore !== bScore) {
          return bScore - aScore;
        }

        return String(a.teamOrPlayer || '').localeCompare(String(b.teamOrPlayer || ''));
      });
  }, [data, filter, genderFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white animate-slide-down">Live Leaderboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-4 animate-slide-up">Showing podium results only</p>
          <div className="text-xs text-gray-400 mt-1 animate-pulse">
            {refreshing ? 'Refreshing now...' : lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : 'Loading updates...'}
          </div>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4 animate-slide-down">
          <div className="flex-1 sm:flex-none">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Filter by Event</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
            >
              <option value="">All Events</option>
              {events.map((ev) => (
                <option key={ev._id} value={ev._id}>{ev.title}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 sm:flex-none">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Filter by Gender</label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full sm:w-48 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        {loading && data.length === 0 ? (
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-dark-border animate-fade-in">
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
        ) : sorted.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500 animate-fade-in">
            <div className="text-5xl mb-4 animate-bounce">T</div>
            <p>No podium results available yet.</p>
          </div>
        ) : (
          <div>
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-dark-border hover:shadow-xl transition-shadow animate-slide-up">
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
                  {sorted.map((entry, idx) => (
                    <tr key={entry._id} className={`border-t border-gray-100 dark:border-dark-border hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all animate-stagger-${(idx % 6) + 1}`}>
                      <td className="px-6 py-4 font-bold text-orange-600 dark:text-orange-500">#{entry.rank}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                        <button onClick={() => setSelectedProfile(entry.teamOrPlayer)} className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-left">
                          {entry.teamOrPlayer}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{entry.eventId?.title || '-'}</td>
                      <td className="px-6 py-4 text-right font-bold text-lg text-blue-700 dark:text-blue-400">{entry.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedProfile && (
              <ProfileModal name={selectedProfile} onClose={() => setSelectedProfile(null)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
