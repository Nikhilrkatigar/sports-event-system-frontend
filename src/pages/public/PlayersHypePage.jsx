import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import HypeAnimation from '../../components/HypeAnimation';

export default function PlayersHypePage() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [players, setPlayers] = useState([]);
  const [genderFilter, setGenderFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [hypeAnimation, setHypeAnimation] = useState(false);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const res = await API.get('/events');
        // Filter only closed events (registration closed)
        const closedEvents = res.data.filter(e => !e.registrationOpen);
        setEvents(closedEvents);
      } catch (err) {
        console.error('Error loading events:', err);
      }
    };
    loadEvents();
  }, []);

  const loadPlayers = async (eventId) => {
    if (!eventId) {
      setPlayers([]);
      return;
    }
    
    setLoading(true);
    try {
      // Get leaderboard for this event
      const leaderboardRes = await API.get('/leaderboard');
      const eventLeaderboard = leaderboardRes.data.filter(
        lb => lb.eventId && (lb.eventId._id === eventId || lb.eventId === eventId)
      );

      // Get registrations for this event to get all players
      const regRes = await API.get(`/registrations?eventId=${eventId}`);
      const registrations = regRes.data;

      // Extract all players
      let allPlayers = [];
      registrations.forEach((app) => {
        (app.players || []).forEach((player) => {
          if (!player.isSubstitute) {
            const playerName = player.uucms ? `${player.name} (${player.uucms})` : player.name;
            const leaderboardEntry = eventLeaderboard.find(
              lb => lb.teamOrPlayer === playerName
            );
            allPlayers.push({
              _id: leaderboardEntry?._id,
              name: playerName,
              gender: player.gender || 'unspecified',
              hype: leaderboardEntry?.hype || 0,
              score: leaderboardEntry?.score || 0,
              rank: leaderboardEntry?.rank || null
            });
          }
        });
      });

      // Remove duplicates
      allPlayers = allPlayers.filter((player, index, self) =>
        index === self.findIndex(p => p.name === player.name)
      );

      // Sort by hype (descending), then alphabetically
      allPlayers.sort((a, b) => {
        if (b.hype !== a.hype) return b.hype - a.hype;
        return a.name.localeCompare(b.name);
      });

      setPlayers(allPlayers);
    } catch (err) {
      console.error('Error loading players:', err);
      toast.error('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const handleHypeClick = async (player) => {
    if (!player._id) {
      toast.error('Player not in leaderboard yet');
      return;
    }

    try {
      setHypeAnimation(true);
      await API.patch(`/leaderboard/${player._id}/hype`);
      
      // Update local state
      setPlayers(prev => {
        const updatedPlayers = prev.map(p =>
          p._id === player._id ? { ...p, hype: p.hype + 1 } : p
        );
        // Re-sort by hype
        return updatedPlayers.sort((a, b) => {
          if (b.hype !== a.hype) return b.hype - a.hype;
          return a.name.localeCompare(b.name);
        });
      });

      setTimeout(() => setHypeAnimation(false), 3000);
    } catch (err) {
      toast.error('Failed to increment hype');
      setHypeAnimation(false);
    }
  };

  const filteredPlayers =
    genderFilter === 'all'
      ? players
      : players.filter(p => p.gender === genderFilter);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">⭐ Athletes Hype</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Give hype to registered athletes! More hype = Higher Rank</p>

        {/* Select Sport */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 sm:flex-none">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Select Sport (Closed Registration)
            </label>
            <select
              value={selectedEvent || ''}
              onChange={(e) => {
                setSelectedEvent(e.target.value);
                loadPlayers(e.target.value);
              }}
              className="w-full sm:w-80 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a sport...</option>
              {events.map((ev) => (
                <option key={ev._id} value={ev._id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>

          {selectedEvent && (
            <div className="flex-1 sm:flex-none">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Filter by Gender
              </label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="w-full sm:w-48 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">👥 All</option>
                <option value="male">👨 Male</option>
                <option value="female">👩 Female</option>
              </select>
            </div>
          )}
        </div>

        {/* Players List */}
        {selectedEvent && (
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-dark-border">
            {loading ? (
              <div className="p-12 text-center text-gray-400">Loading athletes...</div>
            ) : filteredPlayers.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p className="text-lg">No athletes registered yet</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-900 to-blue-700 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left">Rank</th>
                    <th className="px-6 py-4 text-left">Name</th>
                    <th className="px-6 py-4 text-left">Gender</th>
                    <th className="px-6 py-4 text-center">⭐ Hype</th>
                    <th className="px-6 py-4 text-center">Score</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player, idx) => (
                    <tr
                      key={player.name}
                      className="border-t border-gray-100 dark:border-dark-border hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                      <td className="px-6 py-4 font-bold text-orange-600 dark:text-orange-500">
                        #{player.rank || idx + 1}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                        {player.name}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs px-2 py-1 rounded-full capitalize ${
                            player.gender === 'male'
                              ? 'bg-blue-100 text-blue-700'
                              : player.gender === 'female'
                              ? 'bg-pink-100 text-pink-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {player.gender}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-yellow-500">
                          {player.hype}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-blue-700 dark:text-blue-400">
                        {player.score || '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleHypeClick(player)}
                          className="inline-block text-2xl p-2 hover:scale-110 transition-transform duration-200 cursor-pointer hover:animate-bounce"
                          title="Give hype!"
                        >
                          ⭐
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Hype Animation */}
      <HypeAnimation isActive={hypeAnimation} onComplete={() => setHypeAnimation(false)} />
    </div>
  );
}
