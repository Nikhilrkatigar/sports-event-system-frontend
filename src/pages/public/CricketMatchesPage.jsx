import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import Navbar from '../../components/public/Navbar';
import API from '../../utils/api';
import resolveSocketUrl from '../../utils/socket';

const STATUS_BADGES = {
  upcoming: { label: 'Upcoming', class: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' },
  live: { label: '● LIVE', class: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 animate-pulse' },
  completed: { label: 'Completed', class: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' },
  abandoned: { label: 'Abandoned', class: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' }
};

export default function CricketMatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const socketRef = useRef(null);
  const joinedMatchIdsRef = useRef(new Set());
  const matchesRef = useRef([]);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await API.get('/cricket/matches');
      setMatches(res.data || []);
      return res.data || [];
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    matchesRef.current = matches;
  }, [matches]);

  useEffect(() => {
    let mounted = true;

    const safeFetch = async () => {
      if (!mounted) return [];
      return fetchMatches();
    };

    safeFetch();

    const socket = io(resolveSocketUrl(), { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    const refreshOnUpdate = () => {
      safeFetch();
    };

    const joinAllCurrentRooms = () => {
      const currentIds = (matchesRef.current || []).map((m) => m?._id).filter(Boolean);
      currentIds.forEach((id) => {
        socket.emit('join_cricket_match', id);
        joinedMatchIdsRef.current.add(id);
      });
    };

    socket.on('connect', joinAllCurrentRooms);

    socket.on('cricket_ball_update', refreshOnUpdate);
    socket.on('cricket_wicket', refreshOnUpdate);
    socket.on('cricket_innings_start', refreshOnUpdate);
    socket.on('cricket_innings_end', refreshOnUpdate);
    socket.on('cricket_match_end', refreshOnUpdate);
    socket.on('cricket_undo', refreshOnUpdate);

    // Keep polling as a fallback in case socket reconnects late.
    const interval = setInterval(safeFetch, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
      socket.off('connect', joinAllCurrentRooms);
      socket.off('cricket_ball_update', refreshOnUpdate);
      socket.off('cricket_wicket', refreshOnUpdate);
      socket.off('cricket_innings_start', refreshOnUpdate);
      socket.off('cricket_innings_end', refreshOnUpdate);
      socket.off('cricket_match_end', refreshOnUpdate);
      socket.off('cricket_undo', refreshOnUpdate);
      joinedMatchIdsRef.current.forEach((id) => socket.emit('leave_cricket_match', id));
      joinedMatchIdsRef.current.clear();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [fetchMatches]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const nextIds = new Set(matches.map((m) => m?._id).filter(Boolean));

    joinedMatchIdsRef.current.forEach((id) => {
      if (!nextIds.has(id)) {
        socket.emit('leave_cricket_match', id);
        joinedMatchIdsRef.current.delete(id);
      }
    });

    nextIds.forEach((id) => {
      if (!joinedMatchIdsRef.current.has(id)) {
        socket.emit('join_cricket_match', id);
        joinedMatchIdsRef.current.add(id);
      }
    });
  }, [matches]);

  const filtered = filter === 'all' ? matches : matches.filter(m => m.status === filter);
  const liveMatches = matches.filter(m => m.status === 'live');

  const leaderboard = useMemo(() => {
    const completedMatches = matches.filter((m) => m.status === 'completed');

    const batsmenMap = new Map();
    const bowlersMap = new Map();

    completedMatches.forEach((match) => {
      (match.innings || []).forEach((inning) => {
        (inning.batsmenStats || []).forEach((b) => {
          const name = (b.playerName || '').trim();
          if (!name) return;

          if (!batsmenMap.has(name)) {
            batsmenMap.set(name, {
              name,
              runs: 0,
              balls: 0,
              innings: 0
            });
          }

          const row = batsmenMap.get(name);
          row.runs += Number(b.runs || 0);
          row.balls += Number(b.ballsFaced || 0);
          row.innings += 1;
        });

        (inning.bowlerStats || []).forEach((bw) => {
          const name = (bw.playerName || '').trim();
          if (!name) return;

          if (!bowlersMap.has(name)) {
            bowlersMap.set(name, {
              name,
              wickets: 0,
              balls: 0,
              runs: 0,
              spells: 0
            });
          }

          const row = bowlersMap.get(name);
          row.wickets += Number(bw.wickets || 0);
          row.balls += Number(bw.ballsBowled || 0);
          row.runs += Number(bw.runsConceded || 0);
          row.spells += 1;
        });
      });
    });

    const topBatsmen = Array.from(batsmenMap.values())
      .map((b) => ({
        ...b,
        strikeRate: b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(2) : '0.00'
      }))
      .sort((a, b) => (b.runs - a.runs) || (a.balls - b.balls) || a.name.localeCompare(b.name))
      .slice(0, 5);

    const topBowlers = Array.from(bowlersMap.values())
      .map((b) => ({
        ...b,
        economy: b.balls > 0 ? (b.runs / (b.balls / 6)).toFixed(2) : '0.00'
      }))
      .sort((a, b) => (b.wickets - a.wickets) || (Number(a.economy) - Number(b.economy)) || (a.runs - b.runs) || a.name.localeCompare(b.name))
      .slice(0, 5);

    return { topBatsmen, topBowlers };
  }, [matches]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white animate-slide-down">🏏 IDCL Cricket</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-3 animate-slide-up">Inter-Department Cricket League — Live scores, scorecards & stats</p>
        </div>

        {/* Live match highlight */}
        {liveMatches.length > 0 && (
          <div className="mb-8 space-y-4 animate-fade-in">
            {liveMatches.map(match => {
              const inn = match.innings?.find(i => i.inningNumber === match.currentInning);
              const battingTeamName = inn ? match[inn.battingTeam]?.name : '';
              const crr = inn?.totalBalls > 0 ? ((inn.totalRuns / inn.totalBalls) * 6).toFixed(2) : '0.00';
              const inn1 = match.innings?.find(i => i.inningNumber === 1);
              const target = match.currentInning === 2 && inn1 ? inn1.totalRuns + 1 : null;
              const runsNeeded = target ? target - (inn?.totalRuns || 0) : null;
              const ballsLeft = match.oversPerSide * 6 - (inn?.totalBalls || 0);

              return (
                <Link key={match._id} to={`/cricket/${match._id}`}
                  className="block bg-gradient-to-r from-red-600 to-red-700 dark:from-red-800 dark:to-red-900 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span className="w-2 h-2 rounded-full bg-white absolute" />
                      <span className="ml-3">LIVE — {match.eventId?.title || 'IDCL'}</span>
                    </span>
                    <span className="text-sm opacity-80">{match.oversPerSide} overs</span>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg">{match.teamA?.name}</p>
                      {match.innings?.find(i => (i.battingTeam === 'teamA' && i.inningNumber === 1) || (i.battingTeam === 'teamA' && i.inningNumber === 2)) && (
                        <p className="text-2xl font-black mt-1">
                          {(() => {
                            const teamAInn = match.innings.find(i => i.battingTeam === 'teamA');
                            return teamAInn ? `${teamAInn.totalRuns}/${teamAInn.totalWickets}` : '';
                          })()}
                        </p>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black opacity-50">vs</div>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-lg">{match.teamB?.name}</p>
                      {match.innings?.find(i => i.battingTeam === 'teamB') && (
                        <p className="text-2xl font-black mt-1">
                          {(() => {
                            const teamBInn = match.innings.find(i => i.battingTeam === 'teamB');
                            return teamBInn ? `${teamBInn.totalRuns}/${teamBInn.totalWickets}` : '';
                          })()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 text-sm opacity-90">
                    {battingTeamName && <span>{battingTeamName}: {inn?.totalRuns}/{inn?.totalWickets} ({inn?.totalOvers} ov) • CRR: {crr}</span>}
                    {runsNeeded > 0 && <span className="block mt-1 text-yellow-200">Need {runsNeeded} runs in {ballsLeft} balls</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Filter tabs + Stats */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
          <div className="xl:col-span-2 flex items-center gap-2 flex-wrap">
            {['all', 'live', 'upcoming', 'completed'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white dark:bg-dark-card text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}>
                {f === 'all' ? 'All Matches' : f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && ` (${matches.filter(m => m.status === f).length})`}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Player Stats</h3>
              <span className="text-[11px] text-gray-400">Top 5</span>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">Best Batsmen</p>
                {loading ? (
                  <div className="space-y-1.5">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="grid grid-cols-[16px_1fr_auto] gap-2 items-center">
                        <div className="h-3 w-3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                        <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ width: `${60 + i * 10}%` }} />
                        <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : leaderboard.topBatsmen.length === 0 ? (
                  <p className="text-xs text-gray-400">No completed match data yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {leaderboard.topBatsmen.map((p, i) => (
                      <div key={p.name} className="grid grid-cols-[16px_1fr_auto] gap-2 items-center text-xs">
                        <span className="text-gray-400">{i + 1}</span>
                        <span className="truncate text-gray-800 dark:text-gray-200" title={p.name}>
                          {p.name}
                          {i === 0 && (
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 text-[10px] font-semibold align-middle">
                              🧢 Orange Cap
                            </span>
                          )}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          <span className="font-bold text-gray-900 dark:text-white">{p.runs}</span> ({p.balls}) SR {p.strikeRate}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2">Best Bowlers</p>
                {loading ? (
                  <div className="space-y-1.5">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="grid grid-cols-[16px_1fr_auto] gap-2 items-center">
                        <div className="h-3 w-3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                        <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ width: `${55 + i * 12}%` }} />
                        <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : leaderboard.topBowlers.length === 0 ? (
                  <p className="text-xs text-gray-400">No completed match data yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {leaderboard.topBowlers.map((p, i) => (
                      <div key={p.name} className="grid grid-cols-[16px_1fr_auto] gap-2 items-center text-xs">
                        <span className="text-gray-400">{i + 1}</span>
                        <span className="truncate text-gray-800 dark:text-gray-200" title={p.name}>
                          {p.name}
                          {i === 0 && (
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 text-[10px] font-semibold align-middle">
                              🧢 Purple Cap
                            </span>
                          )}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          <span className="font-bold text-green-600 dark:text-green-400">{p.wickets}W</span> {p.balls}b Eco {p.economy}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Match list */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-400">Loading matches...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            <div className="text-5xl mb-4">🏏</div>
            <p className="text-lg">No {filter !== 'all' ? filter : ''} matches found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.filter(m => m.status !== 'live' || liveMatches.length === 0).map((match, idx) => {
              const badge = STATUS_BADGES[match.status] || STATUS_BADGES.upcoming;
              const inn1 = match.innings?.find(i => i.inningNumber === 1);
              const inn2 = match.innings?.find(i => i.inningNumber === 2);
              return (
                <Link key={match._id} to={`/cricket/${match._id}`}
                  className={`block bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm hover:shadow-xl transition-all p-5 transform hover:-translate-y-0.5 animate-stagger-${(idx % 6) + 1}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.class}`}>{badge.label}</span>
                    <span className="text-xs text-gray-400">
                      {match.matchDate ? new Date(match.matchDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                      {match.venue ? ` • ${match.venue}` : ''}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">{match.oversPerSide} overs</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-gray-900 dark:text-white ${match.result?.winner === 'teamA' ? 'text-green-600 dark:text-green-400' : ''}`}>
                        {match.teamA?.name}
                      </span>
                      <span className="font-mono font-bold text-gray-900 dark:text-white text-lg">
                        {inn1?.battingTeam === 'teamA' ? `${inn1.totalRuns}/${inn1.totalWickets}` :
                         inn2?.battingTeam === 'teamA' ? `${inn2.totalRuns}/${inn2.totalWickets}` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-gray-900 dark:text-white ${match.result?.winner === 'teamB' ? 'text-green-600 dark:text-green-400' : ''}`}>
                        {match.teamB?.name}
                      </span>
                      <span className="font-mono font-bold text-gray-900 dark:text-white text-lg">
                        {inn1?.battingTeam === 'teamB' ? `${inn1.totalRuns}/${inn1.totalWickets}` :
                         inn2?.battingTeam === 'teamB' ? `${inn2.totalRuns}/${inn2.totalWickets}` : '—'}
                      </span>
                    </div>
                  </div>
                  {match.result?.resultText && (
                    <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      {match.result.resultText}
                      {match.result.manOfTheMatch && <span className="text-gray-400 ml-2">• 🏅 {match.result.manOfTheMatch}</span>}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
