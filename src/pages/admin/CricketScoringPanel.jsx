import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import API from '../../utils/api';
import toast from 'react-hot-toast';

const DISMISSAL_TYPES = [
  { value: 'bowled', label: 'Bowled' },
  { value: 'caught', label: 'Caught' },
  { value: 'run_out', label: 'Run Out' },
  { value: 'stumped', label: 'Stumped' },
  { value: 'lbw', label: 'LBW' },
  { value: 'hit_wicket', label: 'Hit Wicket' },
  { value: 'retired_hurt', label: 'Retired Hurt' },
  { value: 'retired_out', label: 'Retired Out' }
];

const ROLE_EMOJI = { batsman: '🏏', bowler: '🎯', all_rounder: '⭐', wicket_keeper: '🧤' };

export default function CricketScoringPanel() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Modals
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showEndOverModal, setShowEndOverModal] = useState(false);
  const [showTossModal, setShowTossModal] = useState(false);
  const [showStartInningsModal, setShowStartInningsModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showUndoConfirmModal, setShowUndoConfirmModal] = useState(false);

  // Wicket form
  const [wicketType, setWicketType] = useState('bowled');
  const [wicketFielder, setWicketFielder] = useState('');
  const [wicketBatsman, setWicketBatsman] = useState('');
  const [newBatsmanId, setNewBatsmanId] = useState('');

  // Toss form
  const [tossWonBy, setTossWonBy] = useState('teamA');
  const [tossChose, setTossChose] = useState('bat');

  // Start innings form
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');

  // End over
  const [newBowlerId, setNewBowlerId] = useState('');

  const loadMatch = useCallback(async () => {
    try {
      const res = await API.get(`/cricket/matches/${matchId}`);
      setMatch(res.data);
    } catch (err) {
      toast.error('Failed to load match');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  const loadDeliveries = useCallback(async () => {
    if (!match?.currentInning) return;
    try {
      const res = await API.get(`/cricket/matches/${matchId}/deliveries?inning=${match.currentInning}`);
      setDeliveries(res.data || []);
    } catch { /* silent */ }
  }, [matchId, match?.currentInning]);

  useEffect(() => { loadMatch(); }, [loadMatch]);
  useEffect(() => { if (match) loadDeliveries(); }, [match?.currentInning]);

  // Real-time socket connection
  useEffect(() => {
    if (!matchId) return;
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.emit('join_cricket_match', matchId);
    socket.on('cricket_ball_update', () => { loadMatch(); loadDeliveries(); });
    socket.on('cricket_wicket', () => loadMatch());
    socket.on('cricket_undo', () => { loadMatch(); loadDeliveries(); });
    return () => {
      socket.emit('leave_cricket_match', matchId);
      socket.disconnect();
    };
  }, [matchId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!match) {
    return <div className="text-center py-20 text-gray-500">Match not found</div>;
  }

  const currentInnings = match.innings?.find(i => i.inningNumber === match.currentInning);
  const battingTeam = currentInnings ? match[currentInnings.battingTeam] : null;
  const bowlingTeam = currentInnings ? match[currentInnings.bowlingTeam] : null;

  const striker = currentInnings?.batsmenStats?.find(b => b.playerId === match.currentStrikerId && !b.isOut);
  const nonStriker = currentInnings?.batsmenStats?.find(b => b.playerId === match.currentNonStrikerId && !b.isOut);
  const currentBowler = currentInnings?.bowlerStats?.find(b => b.playerId === match.currentBowlerId);

  const targetScore = match.currentInning === 2 ? (match.innings?.find(i => i.inningNumber === 1)?.totalRuns || 0) + 1 : null;
  const runsNeeded = targetScore ? targetScore - (currentInnings?.totalRuns || 0) : null;
  const ballsRemaining = match.oversPerSide * 6 - (currentInnings?.totalBalls || 0);

  // Helper: get available batsmen (not out, not already batting)
  const getAvailableBatsmen = () => {
    if (!battingTeam || !currentInnings) return [];
    const usedNames = (currentInnings.batsmenStats || []).map(b => b.playerName);
    return battingTeam.players
      .map((p, i) => ({ ...p, index: String(i) }))
      .filter(p => p.isPlaying && !usedNames.includes(p.name));
  };

  // Helper: get available bowlers (not current bowler ideally)
  const getAvailableBowlers = () => {
    if (!bowlingTeam) return [];
    return bowlingTeam.players
      .map((p, i) => ({ ...p, index: String(i) }))
      .filter(p => p.isPlaying);
  };

  // ── Record a ball ──
  const recordBall = async (payload) => {
    if (sending) return;
    setSending(true);
    try {
      await API.post(`/cricket/matches/${matchId}/ball`, payload);
      await loadMatch();
      await loadDeliveries();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record ball');
    } finally {
      setSending(false);
    }
  };

  const handleRun = (runs) => recordBall({ runsScored: runs });
  const handleWide = () => recordBall({ isWide: true, runsScored: 0 });
  const handleNoBall = (runs = 0) => recordBall({ isNoBall: true, runsScored: runs });
  const handleBye = (runs = 1) => recordBall({ isBye: true, runsScored: runs });
  const handleLegBye = (runs = 1) => recordBall({ isLegBye: true, runsScored: runs });

  const handleWicket = async () => {
    if (!wicketType) return toast.error('Select dismissal type');
    
    // Check if this is an all-out situation (no available batsmen)
    const availableBatsmen = getAvailableBatsmen();
    const isAllOut = availableBatsmen.length === 0;
    
    if (availableBatsmen.length > 0 && !newBatsmanId && (currentInnings?.totalWickets || 0) < 9) {
      return toast.error('Select new batsman');
    }
    
    setSending(true);
    try {
      await API.post(`/cricket/matches/${matchId}/ball`, {
        runsScored: 0,
        isWicket: true,
        wicketType,
        wicketBatsman: wicketBatsman || striker?.playerName || '',
        wicketFielder,
        newBatsmanId
      });
      setShowWicketModal(false);
      setWicketType('bowled');
      setWicketFielder('');
      setWicketBatsman('');
      setNewBatsmanId('');
      
      // Auto-end innings if all out
      if (isAllOut) {
        toast.success('🚨 All Out! Ending innings automatically...');
        setTimeout(async () => {
          try {
            await API.post(`/cricket/matches/${matchId}/end-innings`);
            toast.success('✅ Innings ended - All Out!');
            await loadMatch();
          } catch (err) {
            toast.error('Failed to end innings');
          }
        }, 500);
      } else {
        await loadMatch();
        await loadDeliveries();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record wicket');
    } finally {
      setSending(false);
    }
  };

  const handleToss = async () => {
    try {
      await API.post(`/cricket/matches/${matchId}/toss`, { wonBy: tossWonBy, chose: tossChose });
      setShowTossModal(false);
      toast.success('Toss recorded!');
      await loadMatch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleStartInnings = async () => {
    if (!strikerId || !nonStrikerId || !bowlerId) return toast.error('Select all players');
    if (strikerId === nonStrikerId) return toast.error('Striker and non-striker must be different');
    try {
      const inningNumber = match.currentState === 'not_started' || match.currentState === 'toss' ? 1 :
        match.currentState === 'innings_break' ? 2 : 1;
      await API.post(`/cricket/matches/${matchId}/start-innings`, {
        inningNumber, strikerId, nonStrikerId, bowlerId
      });
      setShowStartInningsModal(false);
      toast.success(`Innings ${inningNumber} started!`);
      await loadMatch();
      await loadDeliveries();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleEndOver = async () => {
    if (!newBowlerId) return toast.error('Select new bowler');
    try {
      await API.post(`/cricket/matches/${matchId}/end-over`, { newBowlerId });
      setShowEndOverModal(false);
      setNewBowlerId('');
      toast.success('New over started');
      await loadMatch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleUndo = () => {
    setShowUndoConfirmModal(true);
  };

  const confirmUndo = async () => {
    setShowUndoConfirmModal(false);
    try {
      await API.post(`/cricket/matches/${matchId}/undo`);
      toast.success('Last ball undone');
      await loadMatch();
      await loadDeliveries();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Nothing to undo');
    }
  };

  const handleEndInnings = async () => {
    if (!window.confirm('End the current innings?')) return;
    try {
      await API.post(`/cricket/matches/${matchId}/end-innings`);
      toast.success('Innings ended');
      await loadMatch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleCompleteMatch = async () => {
    try {
      await API.post(`/cricket/matches/${matchId}/complete`, {});
      setShowCompleteModal(false);
      toast.success('Match completed! Man of Match auto-selected.');
      await loadMatch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  // Recent balls from deliveries
  const recentBalls = [...deliveries].slice(-18).map(d => {
    if (d.isWicket) return { label: 'W', color: 'bg-red-500 text-white' };
    if (d.isWide) return { label: `${d.totalRuns}wd`, color: 'bg-yellow-400 text-yellow-900' };
    if (d.isNoBall) return { label: `${d.totalRuns}nb`, color: 'bg-yellow-400 text-yellow-900' };
    if (d.isSix) return { label: '6', color: 'bg-purple-500 text-white' };
    if (d.isFour) return { label: '4', color: 'bg-blue-500 text-white' };
    if (d.isBye || d.isLegBye) return { label: `${d.totalRuns}b`, color: 'bg-gray-400 text-white' };
    if (d.runsScored === 0) return { label: '0', color: 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400' };
    return { label: String(d.runsScored), color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' };
  });

  // ── Pre-match states ──
  if (match.currentState === 'not_started') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">🏏 {match.teamA?.name} vs {match.teamB?.name}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">{match.oversPerSide} overs per side • {match.venue || 'Venue TBD'}</p>
        <button onClick={() => setShowTossModal(true)} className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg">
          🪙 Record Toss
        </button>

        {showTossModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTossModal(false)}>
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">🪙 Toss Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Toss won by</label>
                  <select value={tossWonBy} onChange={e => setTossWonBy(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white">
                    <option value="teamA">{match.teamA?.name}</option>
                    <option value="teamB">{match.teamB?.name}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Elected to</label>
                  <div className="flex gap-3">
                    <button onClick={() => setTossChose('bat')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${tossChose === 'bat' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>🏏 Bat</button>
                    <button onClick={() => setTossChose('bowl')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${tossChose === 'bowl' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>🎯 Bowl</button>
                  </div>
                </div>
                <button onClick={handleToss} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors">Confirm Toss</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (match.currentState === 'toss' || match.currentState === 'innings_break') {
    const inningNum = match.currentState === 'toss' ? 1 : 2;
    const battingTeamKey = inningNum === 1
      ? (match.toss?.wonBy === 'teamA' ? (match.toss?.chose === 'bat' ? 'teamA' : 'teamB') : (match.toss?.chose === 'bat' ? 'teamB' : 'teamA'))
      : (match.innings?.[0]?.bowlingTeam || 'teamB');
    const bowlingTeamKey = battingTeamKey === 'teamA' ? 'teamB' : 'teamA';
    const battingPlayers = match[battingTeamKey]?.players?.filter(p => p.isPlaying) || [];
    const bowlingPlayers = match[bowlingTeamKey]?.players?.filter(p => p.isPlaying) || [];

    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">🏏 {match.teamA?.name} vs {match.teamB?.name}</h1>
        {match.currentState === 'toss' && (
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            {match[match.toss?.wonBy]?.name} won the toss and elected to {match.toss?.chose}
          </p>
        )}
        {match.currentState === 'innings_break' && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
            <p className="text-blue-700 dark:text-blue-300 font-bold text-lg">
              Innings Break — {match[match.innings[0]?.battingTeam]?.name}: {match.innings[0]?.totalRuns}/{match.innings[0]?.totalWickets} ({match.innings[0]?.totalOvers} ov)
            </p>
            <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">Target: {(match.innings[0]?.totalRuns || 0) + 1} runs</p>
          </div>
        )}
        <button onClick={() => { setShowStartInningsModal(true); setStrikerId(''); setNonStrikerId(''); setBowlerId(''); }} className="px-8 py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg">
          ▶ Start Innings {inningNum}
        </button>

        {showStartInningsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowStartInningsModal(false)}>
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-md w-full shadow-2xl text-left" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">▶ Start Innings {inningNum}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">⚡ Striker ({match[battingTeamKey]?.name})</label>
                  <select value={strikerId} onChange={e => setStrikerId(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white">
                    <option value="">Select striker...</option>
                    {battingPlayers.map((p, i) => <option key={i} value={String(i)}>{ROLE_EMOJI[p.role] || ''} {p.name}{p.isCaptain ? ' (C)' : ''}{p.isViceCaptain ? ' (VC)' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Non-Striker ({match[battingTeamKey]?.name})</label>
                  <select value={nonStrikerId} onChange={e => setNonStrikerId(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white">
                    <option value="">Select non-striker...</option>
                    {battingPlayers.map((p, i) => <option key={i} value={String(i)} disabled={String(i) === strikerId}>{ROLE_EMOJI[p.role] || ''} {p.name}{p.isCaptain ? ' (C)' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🎯 Bowler ({match[bowlingTeamKey]?.name})</label>
                  <select value={bowlerId} onChange={e => setBowlerId(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white">
                    <option value="">Select bowler...</option>
                    {bowlingPlayers.map((p, i) => <option key={i} value={String(i)}>{ROLE_EMOJI[p.role] || ''} {p.name}{p.isCaptain ? ' (C)' : ''}</option>)}
                  </select>
                </div>
                <button onClick={handleStartInnings} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors">Start ▶</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Completed state ──
  if (match.status === 'completed') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">🏏 Match Completed</h1>
        <div className="bg-green-50 dark:bg-green-900/30 rounded-2xl p-6 mb-6">
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{match.result?.resultText || 'Match finished'}</p>
          {match.result?.manOfTheMatch && <p className="text-green-600 dark:text-green-400 mt-2">🏅 MoM: {match.result.manOfTheMatch}</p>}
        </div>
        <button onClick={() => navigate('/admin/cricket')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
          ← All Matches
        </button>
      </div>
    );
  }

  // ── LIVE SCORING PANEL ──
  const runRate = currentInnings?.totalBalls > 0
    ? ((currentInnings.totalRuns / currentInnings.totalBalls) * 6).toFixed(2) : '0.00';
  const reqRate = runsNeeded && ballsRemaining > 0
    ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">🏏 Live Scoring</h1>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full text-xs font-bold animate-pulse">● LIVE</span>
          <button onClick={() => navigate('/admin/cricket')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">All Matches</button>
        </div>
      </div>

      {/* Score Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-5 mb-4 text-white shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm opacity-80">Innings {match.currentInning} • {battingTeam?.name} batting</div>
          <div className="text-sm opacity-80">{match.oversPerSide} overs</div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-5xl font-black">{currentInnings?.totalRuns || 0}</span>
            <span className="text-3xl font-bold opacity-80">/{currentInnings?.totalWickets || 0}</span>
            <span className="text-xl ml-3 opacity-70">({currentInnings?.totalOvers || '0.0'} ov)</span>
          </div>
          <div className="text-right">
            <div className="text-sm">CRR: <span className="font-bold">{runRate}</span></div>
            {reqRate && <div className="text-sm">RRR: <span className="font-bold text-yellow-300">{reqRate}</span></div>}
          </div>
        </div>
        {runsNeeded != null && runsNeeded > 0 && (
          <div className="mt-2 text-sm text-blue-200">
            {battingTeam?.name} need <span className="font-bold text-yellow-300">{runsNeeded}</span> runs in <span className="font-bold">{ballsRemaining}</span> balls
          </div>
        )}
      </div>

      {/* Current Players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* Batsmen */}
        <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm">
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">Batting</div>
          {striker ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">⚡</span>
                  <span className="font-bold text-gray-900 dark:text-white">{striker?.playerName || 'Unknown'}</span>
                  <span className="text-xs text-blue-600 dark:text-blue-400">*</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-lg text-gray-900 dark:text-white">{striker?.runs || 0}</span>
                  <span className="text-gray-400 text-sm">({striker?.ballsFaced || 0})</span>
                  <span className="text-xs text-gray-500 ml-2">{striker?.fours || 0}×4 {striker?.sixes || 0}×6</span>
                </div>
              </div>
              {nonStriker && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700 dark:text-gray-300 ml-6">{nonStriker?.playerName || 'Unknown'}</span>
                  <div className="text-right">
                    <span className="font-bold text-gray-900 dark:text-white">{nonStriker?.runs || 0}</span>
                    <span className="text-gray-400 text-sm">({nonStriker?.ballsFaced || 0})</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm font-bold text-red-700 dark:text-red-300">🚨 ALL OUT!</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">All batsmen have been dismissed.</p>
            </div>
          )}
        </div>

        {/* Bowler */}
        <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm">
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">Bowling</div>
          {currentBowler ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-red-500">🎯</span>
                <span className="font-bold text-gray-900 dark:text-white">{currentBowler?.playerName || 'Unknown'}</span>
              </div>
              <div className="text-right text-sm">
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {currentBowler?.oversBowled || 0}-{currentBowler?.maidens || 0}-{currentBowler?.runsConceded || 0}-{currentBowler?.wickets || 0}
                </span>
                <span className="text-gray-400 ml-2">ER: {currentBowler?.economy || 0}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">No active bowler - Check if innings has ended</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Balls */}
      {recentBalls.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm mb-4">
          <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Recent Balls</div>
          <div className="flex flex-wrap gap-2">
            {recentBalls.map((ball, i) => (
              <span key={i} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${ball.color}`}>
                {ball.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── SCORING BUTTONS ── */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-5 border border-gray-100 dark:border-dark-border shadow-lg mb-4">
        {/* Runs */}
        <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Runs</div>
        <div className="grid grid-cols-6 gap-2 mb-4">
          {[0, 1, 2, 3, 4, 6].map(r => (
            <button
              key={r}
              onClick={() => handleRun(r)}
              disabled={sending}
              className={`py-4 rounded-xl text-xl font-black transition-all transform active:scale-95 disabled:opacity-50 ${
                r === 4 ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-200 dark:shadow-blue-900/50 shadow-lg' :
                r === 6 ? 'bg-purple-500 text-white hover:bg-purple-600 shadow-purple-200 dark:shadow-purple-900/50 shadow-lg' :
                r === 0 ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700' :
                'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Extras */}
        <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Extras</div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          <button onClick={handleWide} disabled={sending} className="py-3 rounded-xl text-sm font-bold bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-800 transition-all active:scale-95 disabled:opacity-50">
            Wide
          </button>
          <button onClick={() => handleNoBall(0)} disabled={sending} className="py-3 rounded-xl text-sm font-bold bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-800 transition-all active:scale-95 disabled:opacity-50">
            No Ball
          </button>
          <button onClick={() => handleBye(1)} disabled={sending} className="py-3 rounded-xl text-sm font-bold bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all active:scale-95 disabled:opacity-50">
            Bye
          </button>
          <button onClick={() => handleLegBye(1)} disabled={sending} className="py-3 rounded-xl text-sm font-bold bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all active:scale-95 disabled:opacity-50">
            Leg Bye
          </button>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button onClick={() => { setShowWicketModal(true); setWicketBatsman(striker?.playerName || ''); }} disabled={sending}
            className="py-4 rounded-xl text-base font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200 dark:shadow-red-900/50 transition-all active:scale-95 disabled:opacity-50">
            🔴 WICKET
          </button>
          <button onClick={() => { setShowEndOverModal(true); setNewBowlerId(''); }} disabled={sending}
            className="py-4 rounded-xl text-base font-bold bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 transition-all active:scale-95 disabled:opacity-50">
            ⏩ END OVER
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleUndo} disabled={sending}
            className="py-3 rounded-xl text-sm font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95 disabled:opacity-50">
            ↩ Undo
          </button>
          <button onClick={handleEndInnings}
            className="py-3 rounded-xl text-sm font-bold bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/40 transition-all active:scale-95">
            End Innings
          </button>
        </div>
      </div>

      {match.currentState === 'innings_break' || match.status === 'completed' ? null : (
        <button onClick={() => setShowCompleteModal(true)} className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mb-8">
          Complete Match & Set MoM
        </button>
      )}

      {/* ── WICKET MODAL ── */}
      {showWicketModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowWicketModal(false)}>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">🔴 Wicket</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dismissal Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {DISMISSAL_TYPES.map(d => (
                    <button key={d.value} onClick={() => setWicketType(d.value)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${wicketType === d.value ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              {(wicketType === 'run_out') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Who got out?</label>
                  <select value={wicketBatsman} onChange={e => setWicketBatsman(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white">
                    {striker?.playerName && <option value={striker.playerName}>{striker.playerName} (Striker)</option>}
                    {nonStriker?.playerName && <option value={nonStriker.playerName}>{nonStriker.playerName} (Non-striker)</option>}
                  </select>
                </div>
              )}
              {['caught', 'run_out', 'stumped'].includes(wicketType) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fielder</label>
                  <select value={wicketFielder} onChange={e => setWicketFielder(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white">
                    <option value="">Select fielder...</option>
                    {bowlingTeam?.players?.filter(p => p.isPlaying).map((p, i) => (
                      <option key={i} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {getAvailableBatsmen().length > 0 && (currentInnings?.totalWickets || 0) < 9 ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Batsman</label>
                  <select value={newBatsmanId} onChange={e => setNewBatsmanId(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white">
                    <option value="">Select new batsman...</option>
                    {getAvailableBatsmen().map(p => (
                      <option key={p.index} value={p.index}>{ROLE_EMOJI[p.role] || ''} {p.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-xl border-2 border-red-300 dark:border-red-700">
                  <p className="text-lg font-bold text-red-700 dark:text-red-300 text-center mb-2">🚨 ALL OUT!</p>
                  <p className="text-sm text-red-600 dark:text-red-400 text-center">No batsmen remaining. Innings will end automatically.</p>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowWicketModal(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium">Cancel</button>
                <button onClick={handleWicket} disabled={sending} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50">Confirm Wicket</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── END OVER MODAL ── */}
      {showEndOverModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEndOverModal(false)}>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">⏩ Select New Bowler</h3>
            <div className="space-y-3">
              {getAvailableBowlers().map(p => (
                <button key={p.index} onClick={() => setNewBowlerId(p.index)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all ${newBowlerId === p.index ? 'bg-indigo-500 text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                  {ROLE_EMOJI[p.role] || ''} {p.name}{p.isCaptain ? ' (C)' : ''}
                  {p.index === match.currentBowlerId && ' — (current)'}
                </button>
              ))}
              <button onClick={handleEndOver} disabled={!newBowlerId} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                Start New Over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── COMPLETE MATCH MODAL ── */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCompleteModal(false)}>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">🏆 Complete Match?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Man of the Match will be automatically selected based on best performance.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCompleteModal(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleCompleteMatch} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors">Complete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── UNDO CONFIRMATION MODAL ── */}
      {showUndoConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUndoConfirmModal(false)}>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-2xl mb-4">⚠️</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Undo the last ball?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">This action will remove the last ball recorded. Are you sure?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowUndoConfirmModal(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={confirmUndo} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">Undo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
