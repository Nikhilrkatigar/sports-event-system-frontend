import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Navbar from '../../components/public/Navbar';
import ProfileModal from '../../components/public/ProfileModal';
import HypeAnimation from '../../components/HypeAnimation';
import API from '../../utils/api';
import { TableRowSkeleton } from '../../components/Skeletons';

export default function LeaderboardPage() {
  const [data, setData] = useState([]);
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [hypeAnimation, setHypeAnimation] = useState(false);

  useEffect(() => {
    const load = async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const [leaderboardRes, eventsRes] = await Promise.all([
          API.get('/leaderboard'),
          API.get('/events')
        ]);
        
        let leaderboardData = leaderboardRes.data;
        const allEvents = eventsRes.data;
        
        // For closed registration events, fetch unscored players from public endpoint
        const closedEvents = allEvents.filter(ev => !ev.registrationOpen);
        
        for (const event of closedEvents) {
          try {
            const unscoredRes = await API.get(`/leaderboard/public/unscored/${event._id}`);
            const unscoredPlayers = unscoredRes.data || [];
            
            // Add unscored players to leaderboard data
            unscoredPlayers.forEach(player => {
              if (!player || !player.teamOrPlayer) return;
              
              // Check if already in leaderboard
              const exists = leaderboardData.some(
                lb => {
                  if (!lb) return false;
                  const lbEvent = lb.eventId?._id || lb.eventId;
                  return lb.teamOrPlayer === player.teamOrPlayer && String(lbEvent) === String(event._id);
                }
              );
              
              if (!exists) {
                leaderboardData.push(player);
              }
            });
          } catch (err) {
            console.log(`Could not fetch unscored players for event ${event._id}:`, err.message);
          }
        }
        
        setData(leaderboardData);
        setEvents(allEvents);
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

  const handleHypeClick = async (entryId) => {
    try {
      setHypeAnimation(true);
      
      const entry = data.find(d => d._id === entryId);
      if (!entry) {
        toast.error('Entry not found');
        setHypeAnimation(false);
        return;
      }
      
      // If it's an unscored entry (temp ID), create it in leaderboard first
      if (entry.isUnscored) {
        try {
          const response = await API.post('/leaderboard/public/hype-create', {
            eventId: entry.eventId?._id || entry.eventId,
            teamOrPlayer: entry.teamOrPlayer,
            gender: entry.gender || 'unspecified'
          });
          
          // Extract the actual entry data from response
          const newEntry = response?.data || response;
          if (!newEntry || !newEntry._id) {
            throw new Error('Invalid response from server');
          }
          
          // Remove temp entry and add real entry
          setData(prev => {
            const filtered = prev.filter(item => item._id !== entryId);
            return filtered.concat([newEntry]);
          });
        } catch (err) {
          console.error('Failed to create leaderboard entry:', err);
          toast.error('Unable to add hype at this time');
          setHypeAnimation(false);
          return;
        }
      } else {
        // Regular hype increment on existing entry
        try {
          const response = await API.patch(`/leaderboard/${entryId}/hype`);
          const updatedEntry = response?.data || response;
          
          setData(prev => prev.map(item =>
            item._id === entryId ? { ...item, hype: updatedEntry?.hype || (item.hype || 0) + 1 } : item
          ));
        } catch (err) {
          console.error('Failed to increment hype:', err);
          toast.error('Failed to add hype');
          setHypeAnimation(false);
          return;
        }
      }
      
      setTimeout(() => setHypeAnimation(false), 3000);
    } catch (err) {
      console.error('Hype error:', err);
      toast.error('An error occurred');
      setHypeAnimation(false);
    }
  };

  const filtered = filter ? data.filter(d => {
    if (!d || !d.teamOrPlayer) return false;
    const eventId = d.eventId?._id || d.eventId;
    return String(eventId) === String(filter);
  }) : data.filter(d => d && d.teamOrPlayer);
  
  // Filter by gender
  const genderFiltered = genderFilter === 'all' 
    ? filtered 
    : filtered.filter(d => d.gender === genderFilter);
  
  // Sort: scored players first by rank, then unscored players alphabetically
  const sorted = [...genderFiltered].sort((a, b) => {
    const aScored = a.score !== null && a.score !== undefined && a.score !== 0;
    const bScored = b.score !== null && b.score !== undefined && b.score !== 0;
    
    // Scored players come first
    if (aScored && !bScored) return -1;
    if (!aScored && bScored) return 1;
    
    // Both scored: sort by rank
    if (aScored && bScored) {
      if (a.rank !== b.rank) return a.rank - b.rank;
    }
    
    // Both unscored or tied rank: sort alphabetically
    const aName = a.teamOrPlayer || '';
    const bName = b.teamOrPlayer || '';
    return aName.localeCompare(bName);
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white animate-slide-down">🏆 Live Leaderboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-4 animate-slide-up">Updates every 30 seconds</p>
          <div className="text-xs text-gray-400 mt-1 animate-pulse">
            {refreshing ? '🔄 Refreshing now...' : lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : 'Loading updates...'}
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
              {events.map(ev => (
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
              <option value="all">👥 All Genders</option>
              <option value="male">👨 Male</option>
              <option value="female">👩 Female</option>
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
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500 animate-fade-in">
            <div className="text-5xl mb-4 animate-bounce">🏅</div>
            <p>No results yet. Check back soon!</p>
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
                    <th className="px-6 py-4 text-center">⭐ Hype</th>
                    <th className="px-6 py-4 text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-6 text-center text-gray-400 dark:text-gray-500">No results available</td>
                    </tr>
                  ) : (
                    <>
                      {/* Scored athletes section */}
                      {sorted.filter(r => !r.isUnscored && r.score !== null && r.score !== undefined && r.score !== 0).length > 0 && (
                        <>
                          {sorted.filter(r => !r.isUnscored && r.score !== null && r.score !== undefined && r.score !== 0).map((entry, idx) => (
                            <tr key={entry._id} className={`border-t border-gray-100 dark:border-dark-border hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all animate-stagger-${(idx % 6) + 1}`}>
                              <td className="px-6 py-4 font-bold text-orange-600 dark:text-orange-500">#{entry.rank}</td>
                              <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                                <button onClick={() => setSelectedProfile(entry.teamOrPlayer)} className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-left">
                                  {entry.teamOrPlayer}
                                </button>
                              </td>
                              <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{entry.eventId?.title || '—'}</td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => handleHypeClick(entry._id)}
                                  className="inline-block text-2xl p-2 hover:scale-110 transition-transform duration-200 cursor-pointer hover:animate-bounce"
                                  title="Give hype!"
                                >
                                  ⭐
                                </button>
                                <div className="text-xs font-bold text-yellow-500">{entry.hype || 0}</div>
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-lg text-blue-700 dark:text-blue-400">{entry.score}</td>
                            </tr>
                          ))}
                        </>
                      )}
                      
                      {/* Unscored & Score 0 athletes section */}
                      {sorted.filter(r => r.isUnscored || (r.score === null || r.score === undefined || r.score === 0)).length > 0 && (
                        <>
                          <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                            <td colSpan="5" className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Registered Athletes (Awaiting Scores)
                            </td>
                          </tr>
                          {sorted.filter(r => r.isUnscored || (r.score === null || r.score === undefined || r.score === 0)).map((entry, idx) => (
                            <tr key={entry._id} className="border-t border-gray-100 dark:border-dark-border hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-all opacity-75">
                              <td className="px-6 py-4 text-gray-400">—</td>
                              <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                                <button onClick={() => setSelectedProfile(entry.teamOrPlayer)} className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-left">
                                  {entry.teamOrPlayer}
                                </button>
                              </td>
                              <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{entry.eventId?.title || '—'}</td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => handleHypeClick(entry._id)}
                                  className="inline-block text-2xl p-2 hover:scale-110 transition-transform duration-200 cursor-pointer hover:animate-bounce"
                                  title="Give hype!"
                                >
                                  ⭐
                                </button>
                                <div className="text-xs font-bold text-yellow-500">{entry.hype || 0}</div>
                              </td>
                              <td className="px-6 py-4 text-right text-xs text-gray-400 italic">pending</td>
                            </tr>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {selectedProfile && (
              <ProfileModal name={selectedProfile} onClose={() => setSelectedProfile(null)} />
            )}
          </div>
        )}
      </div>
      
      {/* Hype Animation */}
      <HypeAnimation isActive={hypeAnimation} onComplete={() => setHypeAnimation(false)} />
    </div>
  );
}
