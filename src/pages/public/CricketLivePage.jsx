import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import Navbar from '../../components/public/Navbar';
import CricketEventPopup from '../../components/CricketEventPopup';
import API from '../../utils/api';
import resolveSocketUrl from '../../utils/socket';

const ROLE_BADGES = {
  batsman: { label: 'BAT', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' },
  bowler: { label: 'BOWL', color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' },
  all_rounder: { label: 'AR', color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400' },
  wicket_keeper: { label: 'WK', color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400' }
};

const TABS = [
  { id: 'live', label: '⚡ Live' },
  { id: 'scorecard', label: '📋 Scorecard' },
  { id: 'squads', label: '👥 Squads' },
  { id: 'info', label: 'ℹ️ Info' }
];

export default function CricketLivePage() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [activeTab, setActiveTab] = useState('live');
  const [loading, setLoading] = useState(true);
  const [selectedInning, setSelectedInning] = useState(1);
  const [eventPopup, setEventPopup] = useState(null);
  const eventQueueRef = useRef([]);
  const isShowingRef = useRef(false);

  const loadMatch = useCallback(async () => {
    try {
      const [matchRes, scorecardRes] = await Promise.all([
        API.get(`/cricket/matches/${matchId}`),
        API.get(`/cricket/matches/${matchId}/scorecard`)
      ]);
      setMatch(matchRes.data);
      setScorecard(scorecardRes.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [matchId]);

  const loadDeliveries = useCallback(async (inning) => {
    try {
      const res = await API.get(`/cricket/matches/${matchId}/deliveries?inning=${inning || match?.currentInning || 1}`);
      setDeliveries(res.data || []);
    } catch { /* silent */ }
  }, [matchId, match?.currentInning]);

  useEffect(() => { loadMatch(); }, [loadMatch]);
  useEffect(() => {
    if (match?.currentInning) {
      loadDeliveries(match.currentInning);
      setSelectedInning(match.innings?.length || 1);
    }
  }, [match?.currentInning]);

  // Real-time WebSocket
  useEffect(() => {
    if (!matchId) return;

    const socketUrl = resolveSocketUrl();
    console.log(`🎯 Connecting to Socket.IO at ${socketUrl}`);
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    const handleUpdate = async () => {
      console.log(`⚡ Live update received - refreshing data...`);
      try {
        const [matchRes, scorecardRes] = await Promise.all([
          API.get(`/cricket/matches/${matchId}`),
          API.get(`/cricket/matches/${matchId}/scorecard`)
        ]);
        const latestMatch = matchRes.data;
        setMatch(latestMatch);
        setScorecard(scorecardRes.data);

        // Load deliveries for current inning
        if (latestMatch?.currentInning) {
          const delivRes = await API.get(`/cricket/matches/${matchId}/deliveries?inning=${latestMatch.currentInning}`);
          setDeliveries(delivRes.data || []);
          console.log(`📊 Updated with ${delivRes.data?.length || 0} deliveries`);
        }
      } catch (err) {
        console.error('Update error:', err);
      }
    };

    const onConnect = () => {
      console.log(`✅ Socket.IO connected: ${socket.id}`);
      socket.emit('join_cricket_match', matchId);
      console.log(`🎫 Joining cricket room: cricket:${matchId}`);
    };

    const onMatchJoined = (data) => {
      console.log(`✅ Successfully joined cricket match:`, data);
    };

    const showNextEvent = () => {
      if (eventQueueRef.current.length === 0) {
        isShowingRef.current = false;
        return;
      }
      isShowingRef.current = true;
      const nextEvent = eventQueueRef.current.shift();
      setEventPopup(nextEvent);
    };

    const queueEvent = (evt) => {
      eventQueueRef.current.push(evt);
      if (!isShowingRef.current) {
        showNextEvent();
      }
    };

    const onBallUpdate = (data) => {
      const delivery = data?.delivery;
      const snapshot = data?.matchSnapshot;

      // Detect SIX
      if (delivery?.isSix) {
        queueEvent({
          type: 'six',
          data: {
            batsmanName: delivery.batsmanName,
            bowlerName: delivery.bowlerName,
          },
        });
      }
      // Detect FOUR
      else if (delivery?.isFour) {
        queueEvent({
          type: 'four',
          data: {
            batsmanName: delivery.batsmanName,
            bowlerName: delivery.bowlerName,
          },
        });
      }

      // Detect NO BALL
      if (delivery?.isNoBall) {
        queueEvent({
          type: 'noball',
          data: {
            bowlerName: delivery.bowlerName,
            runs: delivery.totalRuns,
          },
        });
      }

      // Detect Milestones
      if (delivery?.isCentury) {
        queueEvent({
          type: 'century',
          data: {
            batsmanName: delivery.batsmanName,
          },
        });
      } else if (delivery?.isFifty) {
        queueEvent({
          type: 'fifty',
          data: {
            batsmanName: delivery.batsmanName,
          },
        });
      }

      // Detect ALL OUT (innings completed due to 10 wickets)
      if (snapshot?.inningsCompleted && snapshot?.totalWickets >= 10) {
        queueEvent({
          type: 'allout',
          data: {
            score: `${snapshot.totalRuns}/${snapshot.totalWickets}`,
            overs: snapshot.totalOvers,
          },
        });
      }

      handleUpdate();
    };

    const onWicket = async (data) => {
      console.log(`🏏 Wicket! ${data.wicketData.batsmanName} is out!`);
      queueEvent({
        type: 'wicket',
        data: {
          batsmanName: data.wicketData.batsmanName,
          bowlerName: data.wicketData.bowlerName,
          wicketType: data.wicketData.wicketType,
          fielder: data.wicketData.fielder,
          score: data.wicketData.score,
          over: data.wicketData.over,
        },
      });
      await handleUpdate();
    };

    const onInningsEnd = () => {
      console.log(`🏁 Innings ended - refreshing...`);
      handleUpdate();
    };

    const onInningsStart = () => {
      console.log(`🚀 Innings started - refreshing...`);
      handleUpdate();
    };

    const onMatchEnd = () => {
      console.log(`🏆 Match ended!`);
      handleUpdate();
    };

    const onUndo = () => {
      console.log(`↩️ Ball undone - refreshing...`);
      handleUpdate();
    };

    const onDisconnect = () => {
      console.log(`❌ Socket.IO disconnected`);
    };

    const onError = (error) => {
      console.error(`❌ Socket.IO error:`, error);
    };

    const onConnectError = (error) => {
      console.error(`❌ Socket.IO connect_error:`, error?.message || error);
    };

    socket.on('connect', onConnect);
    socket.on('cricket_match_joined', onMatchJoined);
    socket.on('cricket_ball_update', onBallUpdate);
    socket.on('cricket_wicket', onWicket);
    socket.on('cricket_innings_end', onInningsEnd);
    socket.on('cricket_innings_start', onInningsStart);
    socket.on('cricket_match_end', onMatchEnd);
    socket.on('cricket_undo', onUndo);
    socket.on('disconnect', onDisconnect);
    socket.on('error', onError);
    socket.on('connect_error', onConnectError);

    // Fallback polling keeps UI fresh even if socket reconnect is delayed.
    const interval = setInterval(handleUpdate, 15000);

    return () => {
      console.log(`👋 Leaving cricket match room...`);
      clearInterval(interval);
      socket.off('connect', onConnect);
      socket.off('cricket_match_joined', onMatchJoined);
      socket.off('cricket_ball_update', onBallUpdate);
      socket.off('cricket_wicket', onWicket);
      socket.off('cricket_innings_end', onInningsEnd);
      socket.off('cricket_innings_start', onInningsStart);
      socket.off('cricket_match_end', onMatchEnd);
      socket.off('cricket_undo', onUndo);
      socket.off('disconnect', onDisconnect);
      socket.off('error', onError);
      socket.off('connect_error', onConnectError);
      socket.emit('leave_cricket_match', matchId);
      socket.disconnect();
    };
  }, [matchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-400">Loading match...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
        <Navbar />
        <div className="text-center py-32 text-gray-500">
          <p className="text-5xl mb-4">🏏</p>
          <p className="text-lg">Match not found</p>
          <Link to="/cricket" className="text-blue-600 hover:underline mt-4 inline-block">← All Matches</Link>
        </div>
      </div>
    );
  }

  const currentInnings = match.innings?.find(i => i.inningNumber === match.currentInning);
  const inn1 = match.innings?.find(i => i.inningNumber === 1);
  const inn2 = match.innings?.find(i => i.inningNumber === 2);
  const battingTeam = currentInnings ? match[currentInnings.battingTeam] : null;
  const bowlingTeam = currentInnings ? match[currentInnings.bowlingTeam] : null;
  const isLive = match.status === 'live';

  const striker = currentInnings?.batsmenStats?.find(b => b.playerId === match.currentStrikerId && !b.isOut);
  const nonStriker = currentInnings?.batsmenStats?.find(b => b.playerId === match.currentNonStrikerId && !b.isOut);
  const currentBowler = currentInnings?.bowlerStats?.find(b => b.playerId === match.currentBowlerId);

  const runRate = currentInnings?.totalBalls > 0
    ? ((currentInnings.totalRuns / currentInnings.totalBalls) * 6).toFixed(2) : '0.00';
  const targetScore = match.currentInning === 2 && inn1 ? inn1.totalRuns + 1 : null;
  const runsNeeded = targetScore ? targetScore - (currentInnings?.totalRuns || 0) : null;
  const ballsRemaining = match.oversPerSide * 6 - (currentInnings?.totalBalls || 0);
  const reqRate = runsNeeded > 0 && ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : null;

  const formatOverthrowLabel = (delivery) => {
    const totalRuns = Number(delivery?.totalRuns || 0);
    const baseRuns = Number(delivery?.overthrowBaseRuns || 0);
    const overthrowOnlyRuns = Number(delivery?.overthrowRuns || 0);

    if (baseRuns > 0 || overthrowOnlyRuns > 0) {
      return `${baseRuns}+${overthrowOnlyRuns}ov`;
    }

    if (totalRuns > 1) {
      return `1+${totalRuns - 1}ov`;
    }

    return `${totalRuns}ov`;
  };

  // Recent balls color coding
  const recentBalls = [...deliveries].slice(-24).map(d => {
    if (d.isWicket) {
      let label = '';
      if (d.isWide) label = d.totalRuns > 1 ? `${d.totalRuns - 1}+1wd+W` : '1wd+W';
      else if (d.isNoBall) label = d.totalRuns > 1 ? `${d.totalRuns - 1}+1nb+W` : '1nb+W';
      else if (d.runsScored > 0) label = `${d.runsScored}+W`;
      else label = 'W';
      return { label, class: 'bg-red-500 text-white' };
    }
    if (d.isWide) return { label: `${d.totalRuns}wd`, class: 'bg-yellow-400 text-yellow-900' };
    if (d.isNoBall) return { label: `${d.totalRuns}nb`, class: 'bg-yellow-400 text-yellow-900' };
    if (d.isOverthrow) return { label: formatOverthrowLabel(d), class: 'bg-orange-400 text-orange-900' };
    if (d.isSix) return { label: '6', class: 'bg-purple-500 text-white ring-2 ring-purple-300' };
    if (d.isFour) return { label: '4', class: 'bg-blue-500 text-white ring-2 ring-blue-300' };
    if (d.isBye || d.isLegBye) return { label: `${d.totalRuns}b`, class: 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200' };
    if (d.runsScored === 0 && !d.isWide && !d.isNoBall) return { label: '•', class: 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400' };
    return { label: String(d.runsScored), class: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' };
  });

  // Group deliveries by over for display
  const overGroups = [];
  let currentOver = [];
  let lastOver = -1;
  deliveries.forEach(d => {
    if (d.overNumber !== lastOver && currentOver.length > 0) {
      overGroups.push({ overNum: lastOver + 1, balls: [...currentOver] });
      currentOver = [];
    }
    currentOver.push(d);
    lastOver = d.overNumber;
  });
  if (currentOver.length > 0) overGroups.push({ overNum: lastOver + 1, balls: currentOver });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      <Navbar />

      {/* Cricket Event Popup (FOUR / SIX / WICKET / ALL OUT) */}
      <CricketEventPopup
        event={eventPopup}
        onDismiss={() => {
          setEventPopup(null);
          // Show next queued event after a brief pause
          setTimeout(() => {
            if (eventQueueRef.current.length > 0) {
              const nextEvent = eventQueueRef.current.shift();
              setEventPopup(nextEvent);
            } else {
              isShowingRef.current = false;
            }
          }, 300);
        }}
      />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link to="/cricket" className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-4 inline-block">← All Matches</Link>

        {/* ── Score Banner ── */}
        <div className={`rounded-2xl p-5 mb-4 text-white shadow-xl ${
          isLive ? 'bg-gradient-to-r from-red-700 to-red-800 dark:from-red-900 dark:to-red-950' :
          match.status === 'completed' ? 'bg-gradient-to-r from-green-700 to-green-800 dark:from-green-900 dark:to-green-950' :
          'bg-gradient-to-r from-blue-800 to-indigo-900'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-sm">
              {isLive && (
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" /></span>
                  LIVE
                </span>
              )}
              {match.status === 'completed' && <span>COMPLETED</span>}
              <span className="opacity-70">• {match.eventId?.title || 'IDCL'}</span>
            </div>
            <span className="text-sm opacity-70">{match.oversPerSide} overs</span>
          </div>

          {/* Team Scores */}
          <div className="grid grid-cols-3 items-center gap-2 my-3">
            <div className="text-right">
              <p className={`font-bold text-base ${match.result?.winner === 'teamA' ? '' : 'opacity-80'}`}>{match.teamA?.name}</p>
              {inn1?.battingTeam === 'teamA' && <p className="text-2xl font-black">{inn1.totalRuns}/{inn1.totalWickets} <span className="text-sm font-normal opacity-70">({inn1.totalOvers})</span></p>}
              {inn2?.battingTeam === 'teamA' && <p className="text-2xl font-black">{inn2.totalRuns}/{inn2.totalWickets} <span className="text-sm font-normal opacity-70">({inn2.totalOvers})</span></p>}
              {!inn1 && !inn2 && <p className="text-xl opacity-50">—</p>}
            </div>
            <div className="text-center text-2xl font-black opacity-40">vs</div>
            <div className="text-left">
              <p className={`font-bold text-base ${match.result?.winner === 'teamB' ? '' : 'opacity-80'}`}>{match.teamB?.name}</p>
              {inn1?.battingTeam === 'teamB' && <p className="text-2xl font-black">{inn1.totalRuns}/{inn1.totalWickets} <span className="text-sm font-normal opacity-70">({inn1.totalOvers})</span></p>}
              {inn2?.battingTeam === 'teamB' && <p className="text-2xl font-black">{inn2.totalRuns}/{inn2.totalWickets} <span className="text-sm font-normal opacity-70">({inn2.totalOvers})</span></p>}
              {!inn1 && !inn2 && <p className="text-xl opacity-50">—</p>}
            </div>
          </div>

          {/* Status text */}
          {match.result?.resultText && (
            <p className="text-center text-sm font-semibold bg-white/10 rounded-lg py-2 mt-2">{match.result.resultText}</p>
          )}
          {/* Man of the Match banner */}
          {match.status === 'completed' && match.result?.manOfTheMatch && match.result.manOfTheMatch !== 'N/A' && (
            <div className="mt-3 flex items-center justify-center gap-2 bg-yellow-400/20 border border-yellow-400/40 rounded-xl px-4 py-2.5">
              <span className="text-2xl">🏅</span>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-yellow-200 font-semibold">Man of the Match</p>
                <p className="text-base font-black text-yellow-300">{match.result.manOfTheMatch}</p>
              </div>
            </div>
          )}
          {isLive && runsNeeded > 0 && (
            <p className="text-center text-sm mt-2 opacity-90">
              {battingTeam?.name} need <span className="font-bold text-yellow-300">{runsNeeded}</span> runs in <span className="font-bold">{ballsRemaining}</span> balls
              {reqRate && <span> • RRR: <span className="font-bold text-yellow-300">{reqRate}</span></span>}
            </p>
          )}
          {isLive && <p className="text-center text-xs mt-1 opacity-60">CRR: {runRate}</p>}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-white dark:bg-dark-card rounded-xl p-1 border border-gray-100 dark:border-dark-border shadow-sm mb-4 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[80px] py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════ LIVE TAB ══════════════ */}
        {activeTab === 'live' && (
          <div className="space-y-4 animate-fade-in">
            {/* Stats Cards Row - Best Batsman, Best Bowler, Partnership */}
            {currentInnings && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Best Batsman */}
                {currentInnings.batsmenStats?.length > 0 && (() => {
                  const bestBat = [...currentInnings.batsmenStats]
                    .filter(b => !b.isOut || b.runs > 0)
                    .sort((a, b) => b.runs - a.runs)[0];
                  return bestBat ? (
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-3.5 border border-blue-200 dark:border-blue-800 shadow-sm">
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2">TOP BATSMAN ⭐</div>
                      <p className="font-bold text-blue-900 dark:text-blue-100 text-sm">{bestBat.playerName}</p>
                      <div className="flex gap-3 mt-2 text-sm">
                        <div><span className="text-xs text-blue-600 dark:text-blue-400">Runs</span><p className="font-bold text-blue-900 dark:text-blue-100">{bestBat.runs}</p></div>
                        <div><span className="text-xs text-blue-600 dark:text-blue-400">SR</span><p className="font-bold text-blue-900 dark:text-blue-100">{bestBat.strikeRate}</p></div>
                        <div><span className="text-xs text-blue-600 dark:text-blue-400">4s/6s</span><p className="font-bold text-blue-900 dark:text-blue-100">{bestBat.fours}/{bestBat.sixes}</p></div>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Best Bowler */}
                {currentInnings.bowlerStats?.length > 0 && (() => {
                  const bestBowl = [...currentInnings.bowlerStats]
                    .sort((a, b) => (b.wickets - a.wickets) || (a.economy - b.economy))[0];
                  return bestBowl ? (
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-3.5 border border-green-200 dark:border-green-800 shadow-sm">
                      <div className="text-xs font-bold text-green-600 dark:text-green-400 mb-2">TOP BOWLER 🎯</div>
                      <p className="font-bold text-green-900 dark:text-green-100 text-sm">{bestBowl.playerName}</p>
                      <div className="flex gap-3 mt-2 text-sm">
                        <div><span className="text-xs text-green-600 dark:text-green-400">Wickets</span><p className="font-bold text-green-900 dark:text-green-100">{bestBowl.wickets}</p></div>
                        <div><span className="text-xs text-green-600 dark:text-green-400">Economy</span><p className="font-bold text-green-900 dark:text-green-100">{bestBowl.economy}</p></div>
                        <div><span className="text-xs text-green-600 dark:text-green-400">Overs</span><p className="font-bold text-green-900 dark:text-green-100">{bestBowl.oversBowled}</p></div>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Current Partnership */}
                {currentInnings.partnerships?.length > 0 && (() => {
                  const curPart = currentInnings.partnerships[currentInnings.partnerships.length - 1];
                  return curPart ? (
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-3.5 border border-purple-200 dark:border-purple-800 shadow-sm">
                      <div className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-2">PARTNERSHIP 🤝</div>
                      <div className="space-y-1">
                        <p className="font-bold text-purple-900 dark:text-purple-100 text-xs">{curPart.batsman1Name}</p>
                        <p className="font-bold text-purple-900 dark:text-purple-100 text-xs">+ {curPart.batsman2Name}</p>
                      </div>
                      <div className="flex gap-3 mt-2 text-sm">
                        <div><span className="text-xs text-purple-600 dark:text-purple-400">Runs</span><p className="font-bold text-purple-900 dark:text-purple-100">{curPart.runs}</p></div>
                        <div><span className="text-xs text-purple-600 dark:text-purple-400">Balls</span><p className="font-bold text-purple-900 dark:text-purple-100">{curPart.balls}</p></div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Current Batsmen */}
            {isLive && striker && (
              <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm">
                <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">At the Crease</div>
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left pb-2 font-medium">Batsman</th>
                    <th className="text-center pb-2 font-medium">R</th>
                    <th className="text-center pb-2 font-medium">B</th>
                    <th className="text-center pb-2 font-medium">4s</th>
                    <th className="text-center pb-2 font-medium">6s</th>
                    <th className="text-center pb-2 font-medium">SR</th>
                  </tr></thead>
                  <tbody>
                    <tr className="border-b border-gray-50 dark:border-gray-800">
                      <td className="py-2 font-bold text-gray-900 dark:text-white"><span className="text-yellow-500 mr-1">⚡</span>{striker.playerName} <span className="text-blue-500 text-xs">*</span></td>
                      <td className="text-center font-bold text-gray-900 dark:text-white">{striker.runs}</td>
                      <td className="text-center text-gray-500">{striker.ballsFaced}</td>
                      <td className="text-center text-blue-600 dark:text-blue-400">{striker.fours}</td>
                      <td className="text-center text-purple-600 dark:text-purple-400">{striker.sixes}</td>
                      <td className="text-center font-medium text-gray-700 dark:text-gray-300">{striker.strikeRate}</td>
                    </tr>
                    {nonStriker && (
                      <tr>
                        <td className="py-2 text-gray-700 dark:text-gray-300">{nonStriker.playerName}</td>
                        <td className="text-center font-bold text-gray-900 dark:text-white">{nonStriker.runs}</td>
                        <td className="text-center text-gray-500">{nonStriker.ballsFaced}</td>
                        <td className="text-center text-blue-600 dark:text-blue-400">{nonStriker.fours}</td>
                        <td className="text-center text-purple-600 dark:text-purple-400">{nonStriker.sixes}</td>
                        <td className="text-center font-medium text-gray-700 dark:text-gray-300">{nonStriker.strikeRate}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Current Bowler */}
            {isLive && currentBowler && (
              <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm">
                <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Bowling</div>
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left pb-2 font-medium">Bowler</th>
                    <th className="text-center pb-2 font-medium">O</th>
                    <th className="text-center pb-2 font-medium">M</th>
                    <th className="text-center pb-2 font-medium">R</th>
                    <th className="text-center pb-2 font-medium">W</th>
                    <th className="text-center pb-2 font-medium">ER</th>
                  </tr></thead>
                  <tbody>
                    <tr>
                      <td className="py-2 font-bold text-gray-900 dark:text-white"><span className="text-red-500 mr-1">🎯</span>{currentBowler.playerName}</td>
                      <td className="text-center text-gray-700 dark:text-gray-300">{currentBowler.oversBowled}</td>
                      <td className="text-center text-gray-500">{currentBowler.maidens}</td>
                      <td className="text-center text-gray-700 dark:text-gray-300">{currentBowler.runsConceded}</td>
                      <td className="text-center font-bold text-green-600 dark:text-green-400">{currentBowler.wickets}</td>
                      <td className="text-center font-medium text-gray-700 dark:text-gray-300">{currentBowler.economy}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* All Batsmen in Innings */}
            {currentInnings?.batsmenStats?.length > 1 && (
              <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm">
                <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Batting Lineup</div>
                <div className="space-y-2">
                  {currentInnings.batsmenStats.map((b, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded transition">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs font-bold text-gray-400 w-5">{b.battingOrder}</span>
                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                          {b.playerName}
                          {b.isOut && (
                            <span className="text-xs text-red-500 ml-1">
                              {b.dismissalText ? `(${b.dismissalText})` : `(${b.dismissalType})`}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="w-8 text-center font-bold text-gray-900 dark:text-white">{b.runs}</span>
                        <span className="w-10 text-center text-gray-500">({b.ballsFaced})</span>
                        <span className="w-12 text-center text-gray-500 text-xs hidden sm:block">SR {b.strikeRate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Bowlers in Innings */}
            {currentInnings?.bowlerStats?.length > 1 && (
              <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm">
                <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Bowling Attack</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left pb-2 font-medium">Bowler</th>
                      <th className="text-center pb-2 font-medium">O</th>
                      <th className="text-center pb-2 font-medium">M</th>
                      <th className="text-center pb-2 font-medium">R</th>
                      <th className="text-center pb-2 font-medium">W</th>
                      <th className="text-center pb-2 font-medium">ER</th>
                    </tr></thead>
                    <tbody>
                      {currentInnings.bowlerStats.map((b, i) => (
                        <tr key={i} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-2 font-medium text-gray-900 dark:text-white">
                            <span className="text-xs font-bold text-gray-400 mr-2">{b.bowlingOrder}</span>
                            {b.playerName}
                          </td>
                          <td className="text-center text-gray-700 dark:text-gray-300">{b.oversBowled}</td>
                          <td className="text-center text-gray-500">{b.maidens}</td>
                          <td className="text-center text-gray-700 dark:text-gray-300">{b.runsConceded}</td>
                          <td className="text-center font-bold text-green-600 dark:text-green-400">{b.wickets}</td>
                          <td className="text-center font-medium text-gray-700 dark:text-gray-300">{b.economy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Balls Timeline */}
            {recentBalls.length > 0 && (
              <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm">
                <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Recent Deliveries</div>
                <div className="flex flex-wrap gap-2">
                  {recentBalls.map((ball, i) => (
                    <div
                      key={i}
                      className={`${ball.label.length > 3 ? 'h-9 min-w-[52px] px-2 rounded-lg text-[10px]' : 'w-9 h-9 rounded-full text-xs'} flex items-center justify-center font-bold shadow-sm transition-all ${ball.class}`}
                    >
                      {ball.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Over-by-Over Summary */}
            {overGroups.length > 0 && (
              <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm">
                <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Over by Over</div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {[...overGroups].reverse().slice(0, 10).map((og, i) => {
                    const overRuns = og.balls.reduce((s, b) => s + b.totalRuns, 0);
                    const hasWicket = og.balls.some(b => b.isWicket);
                    return (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="text-xs font-bold text-gray-400 w-12">Ov {og.overNum}</span>
                        <div className="flex gap-1.5 flex-1">
                          {og.balls.map((b, j) => {
                            let cls = 'bg-gray-100 dark:bg-gray-800 text-gray-500';
                            if (b.isWicket) cls = 'bg-red-500 text-white';
                            else if (b.isSix) cls = 'bg-purple-500 text-white';
                            else if (b.isFour) cls = 'bg-blue-500 text-white';
                            else if (b.isWide || b.isNoBall) cls = 'bg-yellow-300 text-yellow-900';
                            else if (b.isOverthrow) cls = 'bg-orange-400 text-orange-900';
                            else if (b.runsScored > 0) cls = 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300';
                            const label = b.isWicket
                              ? (b.isWide ? (b.totalRuns > 1 ? `${b.totalRuns - 1}+1wd+W` : '1wd+W') : b.isNoBall ? (b.totalRuns > 1 ? `${b.totalRuns - 1}+1nb+W` : '1nb+W') : b.runsScored > 0 ? `${b.runsScored}+W` : 'W')
                              : b.isWide
                                ? `${b.totalRuns}wd`
                                : b.isNoBall
                                  ? `${b.totalRuns}nb`
                                  : b.isOverthrow
                                    ? formatOverthrowLabel(b)
                                    : b.isBye
                                      ? `${b.totalRuns}b`
                                      : String(b.runsScored);
                            const shapeClass = String(label).length > 3
                              ? 'h-7 min-w-[46px] px-1.5 rounded-md'
                              : 'w-7 h-7 rounded-full';
                            return <span key={j} className={`${shapeClass} flex items-center justify-center text-[10px] font-bold ${cls}`}>{label}</span>;
                          })}
                        </div>
                        <span className={`text-xs font-bold w-10 text-right ${hasWicket ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>{overRuns} runs</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Last Wicket */}
            {currentInnings?.fallOfWickets?.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-100 dark:border-red-900/40">
                <div className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wider">Last Wicket</div>
                {(() => {
                  const lastFow = currentInnings.fallOfWickets[currentInnings.fallOfWickets.length - 1];
                  return (
                    <p className="text-sm text-red-700 dark:text-red-300">
                      <span className="font-bold">{lastFow.batsmanName}</span> — {lastFow.dismissalText} • {lastFow.score}/{lastFow.wicketNumber} ({lastFow.overNumber} ov)
                    </p>
                  );
                })()}
              </div>
            )}

            {/* Completed match MoM card */}
            {match.status === 'completed' && match.result?.manOfTheMatch && match.result.manOfTheMatch !== 'N/A' && (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-2xl p-5 border border-yellow-200 dark:border-yellow-800 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-yellow-400/20 border-2 border-yellow-400 flex items-center justify-center flex-shrink-0">
                    <span className="text-3xl">🏅</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-yellow-600 dark:text-yellow-400 mb-0.5">🏆 Man of the Match</p>
                    <p className="text-xl font-black text-gray-900 dark:text-white">{match.result.manOfTheMatch}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{match.result.resultText}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Not live message */}
            {!isLive && match.status !== 'completed' && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-4xl mb-3">🏏</p>
                <p>Match hasn't started yet. Check back later!</p>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ SCORECARD TAB ══════════════ */}
        {activeTab === 'scorecard' && scorecard && (
          <div className="space-y-4 animate-fade-in">
            {/* Innings selector */}
            {scorecard.scorecard?.length > 1 && (
              <div className="flex gap-2 mb-2">
                {scorecard.scorecard.map(sc => (
                  <button key={sc.inningNumber} onClick={() => setSelectedInning(sc.inningNumber)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      selectedInning === sc.inningNumber
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white dark:bg-dark-card text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                    }`}>
                    {sc.battingTeamName} — {sc.totalRuns}/{sc.totalWickets}
                  </button>
                ))}
              </div>
            )}

            {scorecard.scorecard?.filter(sc => sc.inningNumber === selectedInning).map(sc => (
              <div key={sc.inningNumber}>
                {/* Batting */}
                <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden mb-4">
                  <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-4 py-3 flex items-center justify-between">
                    <span className="font-bold">{sc.battingTeamName} — Batting</span>
                    <span className="text-sm opacity-80">{sc.totalRuns}/{sc.totalWickets} ({sc.totalOvers} ov) • RR: {sc.runRate}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left px-4 py-2.5 font-medium">Batsman</th>
                        <th className="text-left px-2 py-2.5 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">How Out</th>
                        <th className="text-center px-2 py-2.5 font-medium">R</th>
                        <th className="text-center px-2 py-2.5 font-medium">B</th>
                        <th className="text-center px-2 py-2.5 font-medium">4s</th>
                        <th className="text-center px-2 py-2.5 font-medium">6s</th>
                        <th className="text-center px-2 py-2.5 font-medium">SR</th>
                      </tr></thead>
                      <tbody>
                        {sc.batting?.map((b, i) => (
                          <tr key={i} className="border-b border-gray-50 dark:border-gray-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                            <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-white">{b.name}</td>
                            <td className="px-2 py-2.5 text-gray-500 dark:text-gray-400 text-xs hidden sm:table-cell">{b.howOut}</td>
                            <td className="text-center px-2 py-2.5 font-bold text-gray-900 dark:text-white">{b.runs}</td>
                            <td className="text-center px-2 py-2.5 text-gray-500">{b.balls}</td>
                            <td className="text-center px-2 py-2.5 text-blue-600 dark:text-blue-400">{b.fours}</td>
                            <td className="text-center px-2 py-2.5 text-purple-600 dark:text-purple-400">{b.sixes}</td>
                            <td className="text-center px-2 py-2.5 text-gray-700 dark:text-gray-300">{b.sr}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Extras & Total */}
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 text-sm border-t border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-1">
                      <span>Extras</span>
                      <span className="font-medium">{sc.totalExtras} (wd {sc.extras?.wides || 0}, nb {sc.extras?.noBalls || 0}, b {sc.extras?.byes || 0}, lb {sc.extras?.legByes || 0})</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 dark:text-white">
                      <span>Total</span>
                      <span>{sc.totalRuns}/{sc.totalWickets} ({sc.totalOvers} overs, RR: {sc.runRate})</span>
                    </div>
                  </div>
                </div>

                {/* Bowling */}
                <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden mb-4">
                  <div className="bg-gradient-to-r from-green-800 to-green-700 text-white px-4 py-3">
                    <span className="font-bold">{sc.bowlingTeamName} — Bowling</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left px-4 py-2.5 font-medium">Bowler</th>
                        <th className="text-center px-2 py-2.5 font-medium">O</th>
                        <th className="text-center px-2 py-2.5 font-medium">M</th>
                        <th className="text-center px-2 py-2.5 font-medium">R</th>
                        <th className="text-center px-2 py-2.5 font-medium">W</th>
                        <th className="text-center px-2 py-2.5 font-medium hidden sm:table-cell">NB</th>
                        <th className="text-center px-2 py-2.5 font-medium hidden sm:table-cell">WD</th>
                        <th className="text-center px-2 py-2.5 font-medium">ER</th>
                      </tr></thead>
                      <tbody>
                        {sc.bowling?.map((b, i) => (
                          <tr key={i} className="border-b border-gray-50 dark:border-gray-800 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors">
                            <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-white">{b.name}</td>
                            <td className="text-center px-2 py-2.5 text-gray-700 dark:text-gray-300">{b.overs}</td>
                            <td className="text-center px-2 py-2.5 text-gray-500">{b.maidens}</td>
                            <td className="text-center px-2 py-2.5 text-gray-700 dark:text-gray-300">{b.runs}</td>
                            <td className="text-center px-2 py-2.5 font-bold text-green-600 dark:text-green-400">{b.wickets}</td>
                            <td className="text-center px-2 py-2.5 text-gray-500 hidden sm:table-cell">{b.noBalls}</td>
                            <td className="text-center px-2 py-2.5 text-gray-500 hidden sm:table-cell">{b.wides}</td>
                            <td className="text-center px-2 py-2.5 font-medium text-gray-700 dark:text-gray-300">{b.economy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Fall of Wickets */}
                {sc.fallOfWickets?.length > 0 && (
                  <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm mb-4">
                    <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Fall of Wickets</div>
                    <div className="flex flex-wrap gap-3">
                      {sc.fallOfWickets.map((fw, i) => (
                        <div key={i} className="bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 text-sm">
                          <span className="font-bold text-red-700 dark:text-red-400">{fw.score}/{fw.wicketNumber}</span>
                          <span className="text-gray-500 text-xs ml-1">({fw.overNumber} ov)</span>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{fw.batsmanName}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Partnerships */}
                {sc.partnerships?.length > 0 && (
                  <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm">
                    <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Partnerships</div>
                    <div className="space-y-2">
                      {sc.partnerships.map((p, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <span className="text-xs font-bold text-gray-400 w-8">{p.wicketNumber === 0 ? '1st' : `${p.wicketNumber + 1}${['st','nd','rd'][p.wicketNumber] || 'th'}`}</span>
                          <div className="flex-1">
                            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min((p.runs / Math.max((currentInnings?.totalRuns || 1), 1)) * 100, 100)}%` }} />
                            </div>
                          </div>
                          <span className="font-bold text-gray-900 dark:text-white w-10 text-right">{p.runs}</span>
                          <span className="text-xs text-gray-400 w-12 text-right">{p.balls}b</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {(!scorecard.scorecard || scorecard.scorecard.length === 0) && (
              <div className="text-center py-12 text-gray-400"><p>Scorecard not available yet</p></div>
            )}
          </div>
        )}

        {/* ══════════════ SQUADS TAB ══════════════ */}
        {activeTab === 'squads' && (
          <div className="grid grid-cols-2 gap-3 animate-fade-in">
            {[match.teamA, match.teamB].map((team, ti) => (
              <div key={ti} className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden">
                <div className={`px-4 py-3 font-bold text-white ${ti === 0 ? 'bg-gradient-to-r from-blue-800 to-blue-700' : 'bg-gradient-to-r from-red-800 to-red-700'}`}>
                  {team?.name} — Playing XI
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {team?.players?.filter(p => p.isPlaying).map((player, pi) => {
                    const roleBadge = ROLE_BADGES[player.role] || ROLE_BADGES.batsman;
                    return (
                      <div key={pi} className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <span className="text-xs font-bold text-gray-400 w-5 text-center flex-shrink-0">{pi + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white text-xs truncate">
                            {player.name}
                            {player.isCaptain && <span className="text-yellow-600 dark:text-yellow-400 font-bold ml-1">(C)</span>}
                            {player.isViceCaptain && <span className="text-blue-600 dark:text-blue-400 font-bold ml-1">(VC)</span>}
                          </p>
                          {player.department && (
                            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{player.department}</p>
                          )}
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${roleBadge.color}`}>{roleBadge.label}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Substitutes */}
                {team?.players?.some(p => !p.isPlaying) && (
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-semibold text-gray-400 mb-2 uppercase">Substitutes</p>
                    <div className="flex flex-wrap gap-2">
                      {team.players.filter(p => !p.isPlaying).map((p, i) => (
                        <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded">{p.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ══════════════ INFO TAB ══════════════ */}
        {activeTab === 'info' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white dark:bg-dark-card rounded-xl p-5 border border-gray-100 dark:border-dark-border shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Match Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">Match</span>
                  <span className="font-medium text-gray-900 dark:text-white">{match.teamA?.name} vs {match.teamB?.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">Event</span>
                  <span className="font-medium text-gray-900 dark:text-white">{match.eventId?.title || 'IDCL'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">Format</span>
                  <span className="font-medium text-gray-900 dark:text-white">{match.oversPerSide} overs per side</span>
                </div>
                {match.venue && (
                  <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">Venue</span>
                    <span className="font-medium text-gray-900 dark:text-white">{match.venue}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">Date</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {match.matchDate ? new Date(match.matchDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD'}
                  </span>
                </div>
                {match.toss?.wonBy && (
                  <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">Toss</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {match[match.toss.wonBy]?.name} won and elected to {match.toss.chose}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">Status</span>
                  <span className={`font-bold ${match.status === 'live' ? 'text-red-600 dark:text-red-400' : match.status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {match.status?.toUpperCase()}
                  </span>
                </div>
                {match.result?.resultText && (
                  <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">Result</span>
                    <span className="font-bold text-green-600 dark:text-green-400">{match.result.resultText}</span>
                  </div>
                )}
                {match.result?.manOfTheMatch && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500 dark:text-gray-400">Man of the Match</span>
                    <span className="font-bold text-yellow-600 dark:text-yellow-400">🏅 {match.result.manOfTheMatch}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
