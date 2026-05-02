import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import resolveSocketUrl from '../../utils/socket';

const DISMISSAL_TYPES = [
  { value: 'bowled', label: 'Bowled' },
  { value: 'caught', label: 'Caught' },
  { value: 'run_out', label: 'Run Out' },
  { value: 'stumped', label: 'Stumped' },
  { value: 'lbw', label: 'LBW' },
  { value: 'hit_wicket', label: 'Hit Wicket' },
  { value: 'obstructing_field', label: 'Obstructing Field' },
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
  const [showEditMatchModal, setShowEditMatchModal] = useState(false);
  const [showUndoConfirmModal, setShowUndoConfirmModal] = useState(false);
  const [showNoBallRunsModal, setShowNoBallRunsModal] = useState(false);
  const [showOverthrowModal, setShowOverthrowModal] = useState(false);
  const [showWideRunsModal, setShowWideRunsModal] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [showChangeBowlerModal, setShowChangeBowlerModal] = useState(false);
  const [showResumeBatsmanModal, setShowResumeBatsmanModal] = useState(false);

  // Resume Batsman form
  const [resumeBatsmanId, setResumeBatsmanId] = useState('');
  const [replaceOutBatsmanId, setReplaceOutBatsmanId] = useState('');
  const [resumeFillEmptySpot, setResumeFillEmptySpot] = useState(false);

  // Wicket form
  const [wicketType, setWicketType] = useState('bowled');
  const [wicketFielder, setWicketFielder] = useState('');
  const [wicketBatsman, setWicketBatsman] = useState('');
  const [newBatsmanId, setNewBatsmanId] = useState('');
  const [wicketIsWide, setWicketIsWide] = useState(false);
  const [wicketIsNoBall, setWicketIsNoBall] = useState(false);
  const [wicketRunsScored, setWicketRunsScored] = useState(0);

  // Toss form
  const [tossWonBy, setTossWonBy] = useState('teamA');
  const [tossChose, setTossChose] = useState('bat');

  // Start innings form
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');

  // End over
  const [newBowlerId, setNewBowlerId] = useState('');

  // No ball runs
  const [noBallRuns, setNoBallRuns] = useState(0);
  const [wideRuns, setWideRuns] = useState(0);
  const [penaltyRuns, setPenaltyRuns] = useState(5);

  // Bye / Leg-bye runs modal
  const [showByeModal, setShowByeModal] = useState(false);
  const [showLegByeModal, setShowLegByeModal] = useState(false);
  const [byeRuns, setByeRuns] = useState(1);
  const [legByeRuns, setLegByeRuns] = useState(1);

  // Overthrow runs
  const [overthrowBaseRuns, setOverthrowBaseRuns] = useState(1);
  const [overthrowRuns, setOverthrowRuns] = useState(1);
  const prevTotalBallsRef = useRef(null);

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
    const socket = io(resolveSocketUrl(), { transports: ['websocket', 'polling'] });
    socket.emit('join_cricket_match', matchId);
    socket.on('cricket_ball_update', () => { loadMatch(); loadDeliveries(); });
    socket.on('cricket_wicket', () => loadMatch());
    socket.on('cricket_innings_end', () => { loadMatch(); loadDeliveries(); });
    socket.on('cricket_match_end', () => { loadMatch(); toast.success('🏆 Match completed!'); });
    socket.on('cricket_super_over', () => { loadMatch(); toast.success('⚡ SUPER OVER TRIGGERED!'); });
    socket.on('cricket_undo', () => { loadMatch(); loadDeliveries(); });
    socket.on('cricket_auto_fixtures_created', (payload) => {
      const count = Number(payload?.count || 0);
      const firstFixture = Array.isArray(payload?.createdMatches) && payload.createdMatches.length > 0
        ? `${payload.createdMatches[0].teamA} vs ${payload.createdMatches[0].teamB}`
        : null;
      if (count > 0) {
        toast.success(
          count === 1 && firstFixture
            ? `🏆 Next knockout fixture auto-created: ${firstFixture}`
            : `🏆 ${count} knockout cricket fixtures auto-created`
        );
      }
    });
    return () => {
      socket.emit('leave_cricket_match', matchId);
      socket.disconnect();
    };
  }, [matchId, loadMatch, loadDeliveries]);

  const isSO = match?.isSuperOver && (match?.currentState === 'super_over_1' || match?.currentState === 'super_over_2');
  const inningNumSO = isSO ? match?.superOverNumber : match?.currentInning;
  const inningsArray = isSO ? match?.superOverInnings : match?.innings;
  const currentInnings = inningsArray?.find(i => i.inningNumber === inningNumSO);
  const battingTeam = currentInnings ? match[currentInnings.battingTeam] : null;
  const bowlingTeam = currentInnings ? match[currentInnings.bowlingTeam] : null;

  useEffect(() => {
    if (!currentInnings) return;

    const totalBalls = currentInnings.totalBalls || 0;
    const previousTotalBalls = prevTotalBallsRef.current;

    // Initialize baseline on first render of current innings state.
    if (previousTotalBalls === null) {
      prevTotalBallsRef.current = totalBalls;
      return;
    }

    const isLiveInnings =
      match?.status === 'live'
      && String(match?.currentState || '').startsWith('innings_')
      && !currentInnings.isCompleted;

    const ballsAdvanced = totalBalls > previousTotalBalls;
    const overJustCompleted = ballsAdvanced && totalBalls > 0 && totalBalls % 6 === 0;

    if (isLiveInnings && overJustCompleted) {
      setNewBowlerId('');
      setShowEndOverModal(true);
      toast.success('✅ Over Complete! Select new bowler...');
    }

    prevTotalBallsRef.current = totalBalls;
  }, [currentInnings?.totalBalls, currentInnings?.isCompleted, match?.status, match?.currentState]);

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
  const handleWide = (runs) => {
    if (runs !== undefined) {
      recordBall({ isWide: true, runsScored: runs });
      setShowWideRunsModal(false);
      setWideRuns(0);
    } else {
      setWideRuns(0);
      setShowWideRunsModal(true);
    }
  };
  const handleNoBall = (runs = 0) => {
    if (runs > 0) {
      recordBall({ isNoBall: true, runsScored: runs });
      setShowNoBallRunsModal(false);
      setNoBallRuns(0);
    } else {
      setShowNoBallRunsModal(true);
      setNoBallRuns(0);
    }
  };
  const handleBye = (runs) => {
    if (runs !== undefined) {
      recordBall({ isBye: true, runsScored: runs });
      setShowByeModal(false);
      setByeRuns(1);
    } else {
      setByeRuns(1);
      setShowByeModal(true);
    }
  };
  const handleLegBye = (runs) => {
    if (runs !== undefined) {
      recordBall({ isLegBye: true, runsScored: runs });
      setShowLegByeModal(false);
      setLegByeRuns(1);
    } else {
      setLegByeRuns(1);
      setShowLegByeModal(true);
    }
  };
  const handleOverthrow = (baseRuns, overthrowOnlyRuns) => {
    const totalRuns = Number(baseRuns || 0) + Number(overthrowOnlyRuns || 0);
    return recordBall({
      isOverthrow: true,
      runsScored: totalRuns,
      overthrowBaseRuns: Number(baseRuns || 0),
      overthrowRuns: Number(overthrowOnlyRuns || 0)
    });
  };
  const handlePenaltyRuns = (runs) => {
    const parsedRuns = Math.max(0, Number(runs || 0));
    return recordBall({ isPenalty: true, penaltyRuns: parsedRuns });
  };

  // Allowed dismissal types change depending on wide / no-ball / free-hit context
  const getFilteredDismissalTypes = () => {
    if (wicketIsWide) {
      // Wide: only run_out, stumped, hit_wicket, obstructing_field allowed
      return DISMISSAL_TYPES.filter(d => ['run_out', 'stumped', 'hit_wicket', 'obstructing_field', 'retired_hurt', 'retired_out'].includes(d.value));
    }
    if (wicketIsNoBall || match?.isNextBallFreeHit) {
      // No-ball / Free Hit: only run_out, obstructing_field allowed
      return DISMISSAL_TYPES.filter(d => ['run_out', 'obstructing_field', 'retired_hurt', 'retired_out'].includes(d.value));
    }
    return DISMISSAL_TYPES;
  };

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
        runsScored: wicketRunsScored,
        isWicket: true,
        isWide: wicketIsWide,
        isNoBall: wicketIsNoBall,
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
      setWicketIsWide(false);
      setWicketIsNoBall(false);
      setWicketRunsScored(0);
      
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

  const handleStartSuperOver = async () => {
    if (!strikerId || !nonStrikerId || !bowlerId) return toast.error('Select all players');
    if (strikerId === nonStrikerId) return toast.error('Striker and non-striker must be different');
    try {
      await API.post(`/cricket/matches/${matchId}/super-over-innings`, {
        strikerId, nonStrikerId, bowlerId
      });
      setShowStartInningsModal(false);
      toast.success('⚡ Super Over Innings started!');
      await loadMatch();
      await loadDeliveries();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleSaveMatchEdits = async (newOvers) => {
    try {
      await API.put(`/cricket/matches/${matchId}`, { oversPerSide: Number(newOvers) });
      setShowEditMatchModal(false);
      toast.success('Overs updated');
      await loadMatch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update match');
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

  const handleChangeBowler = async () => {
    if (!newBowlerId) return toast.error('Select new bowler');
    try {
      await API.post(`/cricket/matches/${matchId}/change-bowler`, { newBowlerId });
      setShowChangeBowlerModal(false);
      setNewBowlerId('');
      toast.success('Bowler changed');
      await loadMatch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleResumeBatsman = async () => {
    if (!resumeBatsmanId) return toast.error('Select a batsman to resume');
    if (!resumeFillEmptySpot && !replaceOutBatsmanId) return toast.error('Select a spot to fill or a batsman to replace');
    try {
      await API.post(`/cricket/matches/${matchId}/resume-batsman`, { 
        batsmanId: resumeBatsmanId, 
        replaceOutBatsmanId: replaceOutBatsmanId || undefined, 
        fillEmptySpot: resumeFillEmptySpot 
      });
      setShowResumeBatsmanModal(false);
      setResumeBatsmanId('');
      setReplaceOutBatsmanId('');
      setResumeFillEmptySpot(false);
      toast.success('Batsman resumed');
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
    let label = '';
    let color = '';

    if (d.isWicket) {
      if (d.isWide) label = d.totalRuns > 1 ? `${d.totalRuns - 1}+1wd+W` : '1wd+W';
      else if (d.isNoBall) label = d.totalRuns > 1 ? `${d.totalRuns - 1}+1nb+W` : '1nb+W';
      else if (d.runsScored > 0) label = `${d.runsScored}+W`;
      else label = 'W';
      color = 'bg-red-500 text-white';
      return { label, color };
    }

    if (d.isWide) return { label: `${d.totalRuns}wd`, color: 'bg-yellow-400 text-yellow-900' };
    if (d.isNoBall) return { label: `${d.totalRuns}nb`, color: 'bg-yellow-400 text-yellow-900' };
    if (d.isPenalty) return { label: `${d.penaltyRuns || d.totalRuns}P`, color: 'bg-red-200 text-red-900' };
    if (d.isOverthrow) return { label: formatOverthrowLabel(d), color: 'bg-orange-400 text-orange-900' };
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
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setShowTossModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg">
              🪙 Record Toss
            </button>
            <button onClick={() => setShowEditMatchModal(true)} className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              ✎ Edit Overs
            </button>
          </div>

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

        {showEditMatchModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditMatchModal(false)}>
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit Match — Overs</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Overs per side</label>
                  <input type="number" defaultValue={match.oversPerSide} min="1" max="200" id="editOversInput" className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {
                    const val = Number(document.getElementById('editOversInput').value || 0);
                    if (!val || val < 1) return toast.error('Invalid overs');
                    handleSaveMatchEdits(val);
                  }} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold">Save</button>
                  <button onClick={() => setShowEditMatchModal(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (match.currentState === 'toss' || match.currentState === 'innings_break' || match.currentState === 'super_over_break') {
    let inningNum = 1;
    let battingTeamKey = 'teamA';
    let bowlingTeamKey = 'teamB';
    let isSuperOverBreak = match.currentState === 'super_over_break';
    
    if (match.currentState === 'toss') {
      inningNum = 1;
      battingTeamKey = match.toss?.wonBy === 'teamA' ? (match.toss?.chose === 'bat' ? 'teamA' : 'teamB') : (match.toss?.chose === 'bat' ? 'teamB' : 'teamA');
    } else if (match.currentState === 'innings_break') {
      inningNum = 2;
      battingTeamKey = match.innings?.[0]?.bowlingTeam || 'teamB';
    } else if (isSuperOverBreak) {
      const soInningNum = (match.superOverInnings?.length || 0) === 0 ? 1 : 2;
      inningNum = soInningNum;
      if (soInningNum === 1) {
        battingTeamKey = match.innings?.find(i => i.inningNumber === 2)?.battingTeam || 'teamB';
      } else {
        battingTeamKey = match.innings?.find(i => i.inningNumber === 1)?.battingTeam || 'teamA';
      }
    }
    
    bowlingTeamKey = battingTeamKey === 'teamA' ? 'teamB' : 'teamA';
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
        {isSuperOverBreak && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl border-2 border-yellow-400 animate-pulse">
            <h2 className="text-yellow-700 dark:text-yellow-300 font-black text-2xl uppercase tracking-widest mb-1">⚡ Super Over ⚡</h2>
            {match.superOverInnings?.length === 1 && (
              <>
                <p className="text-yellow-700 dark:text-yellow-300 font-bold text-lg">
                  SO Innings Break — {match[match.superOverInnings[0]?.battingTeam]?.name}: {match.superOverInnings[0]?.totalRuns}/{match.superOverInnings[0]?.totalWickets} ({match.superOverInnings[0]?.totalOvers} ov)
                </p>
                <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-1">Target: {(match.superOverInnings[0]?.totalRuns || 0) + 1} runs</p>
              </>
            )}
            {match.superOverInnings?.length === 0 && (
              <p className="text-yellow-700 dark:text-yellow-300 font-bold">Scores Tied! Time for a Super Over!</p>
            )}
          </div>
        )}
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => { setShowStartInningsModal(true); setStrikerId(''); setNonStrikerId(''); setBowlerId(''); }} className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg">
            ▶ Start {isSuperOverBreak ? `Super Over ${inningNum}` : `Innings ${inningNum}`}
          </button>
          <button onClick={() => setShowEditMatchModal(true)} className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            ✎ Edit Overs
          </button>
        </div>

        {showStartInningsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowStartInningsModal(false)}>
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-md w-full shadow-2xl text-left" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">▶ Start {isSuperOverBreak ? `Super Over ${inningNum}` : `Innings ${inningNum}`}</h3>
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
                <button onClick={isSuperOverBreak ? handleStartSuperOver : handleStartInnings} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors">Start ▶</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Completed state ──
  if (match.status === 'completed') {
    const inn1 = match.innings?.find(i => i.inningNumber === 1);
    const inn2 = match.innings?.find(i => i.inningNumber === 2);
    const soInn1 = match.superOverInnings?.find(i => i.inningNumber === 1);
    const soInn2 = match.superOverInnings?.find(i => i.inningNumber === 2);
    const hasMoM = match.result?.manOfTheMatch && match.result.manOfTheMatch !== 'N/A';
    return (
      <div className="max-w-2xl mx-auto py-10 px-4">
        {/* Trophy header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">🏆</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Match Completed</h1>
        </div>

        {/* Result card */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl p-6 mb-4 border border-green-200 dark:border-green-800 shadow-md">
          <p className="text-xl font-bold text-green-700 dark:text-green-300 text-center mb-4">
            {match.result?.resultText || 'Match finished'}
          </p>
          {/* Score summary */}
          <div className="space-y-2 text-sm">
            {inn1 && (
              <div className="flex justify-between px-2 py-1.5 bg-white/60 dark:bg-white/10 rounded-lg">
                <span className="font-semibold text-gray-800 dark:text-gray-200">{match[inn1.battingTeam]?.name}</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{inn1.totalRuns}/{inn1.totalWickets} ({inn1.totalOvers} ov)</span>
              </div>
            )}
            {inn2 && (
              <div className="flex justify-between px-2 py-1.5 bg-white/60 dark:bg-white/10 rounded-lg">
                <span className="font-semibold text-gray-800 dark:text-gray-200">{match[inn2.battingTeam]?.name}</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{inn2.totalRuns}/{inn2.totalWickets} ({inn2.totalOvers} ov)</span>
              </div>
            )}
            {soInn1 && (
              <div className="flex justify-between px-2 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-300">
                <span className="font-semibold text-yellow-800 dark:text-yellow-200">⚡ {match[soInn1.battingTeam]?.name} (SO)</span>
                <span className="font-mono font-bold text-yellow-900 dark:text-yellow-100">{soInn1.totalRuns}/{soInn1.totalWickets} ({soInn1.totalOvers} ov)</span>
              </div>
            )}
            {soInn2 && (
              <div className="flex justify-between px-2 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-300">
                <span className="font-semibold text-yellow-800 dark:text-yellow-200">⚡ {match[soInn2.battingTeam]?.name} (SO)</span>
                <span className="font-mono font-bold text-yellow-900 dark:text-yellow-100">{soInn2.totalRuns}/{soInn2.totalWickets} ({soInn2.totalOvers} ov)</span>
              </div>
            )}
          </div>
        </div>

        {/* Man of the Match */}
        {hasMoM ? (
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/30 rounded-2xl p-5 mb-4 border border-yellow-300 dark:border-yellow-700 shadow-md flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-yellow-400/30 border-2 border-yellow-500 flex items-center justify-center flex-shrink-0 text-3xl">🏅</div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-yellow-600 dark:text-yellow-400">Man of the Match</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{match.result.manOfTheMatch}</p>
            </div>
          </div>
        ) : (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 mb-4 border border-orange-200 dark:border-orange-800 text-sm text-orange-700 dark:text-orange-400">
            ⚠ Man of the Match was not auto-calculated. Use the <strong>Complete Match</strong> button from the scoring panel to set it.
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/admin/cricket')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
            ← All Matches
          </button>
        </div>
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
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          🏏 Live Scoring {isSO && <span className="text-yellow-500 animate-pulse ml-2 font-black">⚡ SUPER OVER</span>}
        </h1>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full text-xs font-bold animate-pulse">● LIVE</span>
          <button onClick={() => navigate('/admin/cricket')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">All Matches</button>
        </div>
      </div>

      {/* Score Banner */}
      <div className={`rounded-2xl p-5 mb-4 text-white shadow-xl ${isSO ? 'bg-gradient-to-r from-yellow-700 to-orange-800 border-2 border-yellow-400' : 'bg-gradient-to-r from-blue-900 to-indigo-900'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm opacity-80">{isSO ? `Super Over Innings ${inningNumSO}` : `Innings ${match.currentInning}`} • {battingTeam?.name} batting</div>
          <div className="text-sm opacity-80">{isSO ? '1 over' : `${match.oversPerSide} overs`}</div>
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
        {match.isNextBallFreeHit && (
          <div className="mt-3 inline-flex items-center rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-yellow-200">
            Free Hit on next ball
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
                <button onClick={() => setShowChangeBowlerModal(true)} title="Change Bowler" className="ml-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-700">🔄</button>
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
              <span
                key={i}
                className={`${ball.label.length > 3 ? 'h-9 min-w-[52px] px-2 rounded-lg text-[10px]' : 'w-9 h-9 rounded-full text-xs'} flex items-center justify-center font-bold shadow-sm ${ball.color}`}
              >
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
        <div className="grid grid-cols-7 gap-2 mb-4">
          {[0, 1, 2, 3, 4, 5, 6].map(r => (
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
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button onClick={() => handleWide()} disabled={sending} className="py-3 rounded-xl text-sm font-bold bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-800 transition-all active:scale-95 disabled:opacity-50">
            Wide
          </button>
          <button onClick={() => handleNoBall(0)} disabled={sending} className="py-3 rounded-xl text-sm font-bold bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-800 transition-all active:scale-95 disabled:opacity-50">
            No Ball
          </button>
          <button onClick={() => setShowOverthrowModal(true)} disabled={sending} className="py-3 rounded-xl text-sm font-bold bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 border border-orange-200 dark:border-orange-800 transition-all active:scale-95 disabled:opacity-50">
            Overthrow
          </button>
          <button onClick={() => handleBye()} disabled={sending} className="py-3 rounded-xl text-sm font-bold bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all active:scale-95 disabled:opacity-50">
            Bye
          </button>
          <button onClick={() => handleLegBye()} disabled={sending} className="py-3 rounded-xl text-sm font-bold bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all active:scale-95 disabled:opacity-50">
            Leg Bye
          </button>
          <button onClick={() => { setPenaltyRuns(5); setShowPenaltyModal(true); }} disabled={sending} className="py-3 rounded-xl text-sm font-bold bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 transition-all active:scale-95 disabled:opacity-50">
            Penalty
          </button>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button onClick={() => { setShowWicketModal(true); setWicketBatsman(striker?.playerName || ''); setWicketIsWide(false); setWicketIsNoBall(false); setWicketRunsScored(0); setWicketType('bowled'); }} disabled={sending}
            className="py-4 rounded-xl text-base font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200 dark:shadow-red-900/50 transition-all active:scale-95 disabled:opacity-50">
            🔴 WICKET
          </button>
          <button
            onClick={() => {
              const ballsInCurrentOver = currentInnings?.currentOverBalls ?? (currentInnings?.totalBalls % 6);
              if (ballsInCurrentOver > 0 && ballsInCurrentOver < 6) {
                if (!window.confirm(`Only ${ballsInCurrentOver} ball(s) bowled in this over. End over early?`)) return;
              }
              setShowEndOverModal(true);
              setNewBowlerId('');
            }}
            disabled={sending}
            className="py-4 rounded-xl text-base font-bold bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 transition-all active:scale-95 disabled:opacity-50">
            ⏩ END OVER
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button onClick={handleUndo} disabled={sending}
            className="py-3 rounded-xl text-sm font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95 disabled:opacity-50">
            ↩ Undo
          </button>
          <button onClick={() => setShowResumeBatsmanModal(true)} disabled={sending}
            className="py-3 rounded-xl text-sm font-bold bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-all active:scale-95">
            + Resume Batsman
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
              {/* Wide / No Ball context toggles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Delivery Type</label>
                <div className="flex gap-2">
                  <button onClick={() => { setWicketIsWide(!wicketIsWide); if (!wicketIsWide) { setWicketIsNoBall(false); setWicketType('run_out'); } else { setWicketType('bowled'); } }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${wicketIsWide ? 'bg-yellow-500 text-white ring-2 ring-yellow-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                    🌐 Wide
                  </button>
                  <button onClick={() => { setWicketIsNoBall(!wicketIsNoBall); if (!wicketIsNoBall) { setWicketIsWide(false); setWicketType('run_out'); } else { setWicketType('bowled'); } }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${wicketIsNoBall ? 'bg-yellow-500 text-white ring-2 ring-yellow-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                    ⚡ No Ball
                  </button>
                  <button onClick={() => { setWicketIsWide(false); setWicketIsNoBall(false); setWicketType('bowled'); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!wicketIsWide && !wicketIsNoBall ? 'bg-blue-500 text-white ring-2 ring-blue-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                    Normal
                  </button>
                </div>
                {(wicketIsWide || wicketIsNoBall || match?.isNextBallFreeHit) && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    {wicketIsWide && '⚠ Wide: only Stumped, Run Out, Hit Wicket, Obstructing Field allowed'}
                    {wicketIsNoBall && '⚠ No Ball: only Run Out, Obstructing Field allowed'}
                    {!wicketIsWide && !wicketIsNoBall && match?.isNextBallFreeHit && '⚠ Free Hit: only Run Out, Obstructing Field allowed'}
                  </p>
                )}
              </div>

              {/* Runs scored on this delivery (e.g. runs completed before run-out) */}
              {(wicketType === 'run_out' || wicketIsWide || wicketIsNoBall) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {wicketType === 'run_out' ? 'Runs completed before run-out' : 'Runs scored'}
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[0, 1, 2, 3, 4].map(r => (
                      <button key={r} onClick={() => setWicketRunsScored(r)}
                        className={`py-2 rounded-lg font-bold text-sm transition-all ${wicketRunsScored === r ? 'bg-green-500 text-white scale-105' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dismissal Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {getFilteredDismissalTypes().map(d => (
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
              {['caught', 'run_out', 'stumped', 'obstructing_field'].includes(wicketType) && (
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

      {/* ── BYE RUNS MODAL ── */}
      {showByeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowByeModal(false); setByeRuns(1); }}>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Bye Runs</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">How many bye runs were scored?</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[1, 2, 3, 4].map(r => (
                <button key={r} onClick={() => setByeRuns(r)}
                  className={`py-3 rounded-lg font-bold text-lg transition-all ${byeRuns === r ? 'bg-gray-600 text-white scale-105' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowByeModal(false); setByeRuns(1); }} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium">Cancel</button>
              <button onClick={() => handleBye(byeRuns)} disabled={sending} className="flex-1 py-3 bg-gray-600 text-white rounded-xl font-bold hover:bg-gray-700 disabled:opacity-50">
                Confirm ({byeRuns})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LEG BYE RUNS MODAL ── */}
      {showLegByeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowLegByeModal(false); setLegByeRuns(1); }}>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Leg Bye Runs</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">How many leg bye runs were scored?</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[1, 2, 3, 4].map(r => (
                <button key={r} onClick={() => setLegByeRuns(r)}
                  className={`py-3 rounded-lg font-bold text-lg transition-all ${legByeRuns === r ? 'bg-gray-600 text-white scale-105' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowLegByeModal(false); setLegByeRuns(1); }} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium">Cancel</button>
              <button onClick={() => handleLegBye(legByeRuns)} disabled={sending} className="flex-1 py-3 bg-gray-600 text-white rounded-xl font-bold hover:bg-gray-700 disabled:opacity-50">
                Confirm ({legByeRuns})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NO BALL RUNS MODAL ── */}
      {showNoBallRunsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowNoBallRunsModal(false); setNoBallRuns(0); }}>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-yellow-700 dark:text-yellow-300 mb-2">⚡ No Ball - Free Hit!</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">How many runs were scored off this no ball?</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[0, 1, 2, 3, 4, 5, 6].map(r => (
                <button key={r} onClick={() => setNoBallRuns(r)}
                  className={`py-3 rounded-lg font-bold text-lg transition-all ${noBallRuns === r ? 'bg-yellow-500 text-white scale-105' : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800'}`}>
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowNoBallRunsModal(false); setNoBallRuns(0); }} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium">Cancel</button>
              <button onClick={() => handleNoBall(noBallRuns)} disabled={sending} className="flex-1 py-3 bg-yellow-600 text-white rounded-xl font-bold hover:bg-yellow-700 disabled:opacity-50">
                Confirm ({noBallRuns})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WIDE RUNS MODAL ── */}
      {showWideRunsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowWideRunsModal(false); setWideRuns(0); }}>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-yellow-700 dark:text-yellow-300 mb-2">🌐 Wide Ball</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">How many runs were scored on the wide?</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[0, 1, 2, 3, 4, 5, 6].map(r => (
                <button key={r} onClick={() => setWideRuns(r)}
                  className={`py-3 rounded-lg font-bold text-lg transition-all ${wideRuns === r ? 'bg-yellow-500 text-white scale-105' : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800'}`}>
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowWideRunsModal(false); setWideRuns(0); }} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium">Cancel</button>
              <button onClick={() => handleWide(wideRuns)} disabled={sending} className="flex-1 py-3 bg-yellow-600 text-white rounded-xl font-bold hover:bg-yellow-700 disabled:opacity-50">
                Confirm ({wideRuns})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PENALTY RUNS MODAL ── */}
      {showPenaltyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowPenaltyModal(false); setPenaltyRuns(5); }}>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-red-700 dark:text-red-300 mb-2">⚠ Penalty Runs</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">How many penalty runs should be awarded?</p>
            <input
              type="number"
              min="0"
              max="100"
              value={penaltyRuns}
              onChange={e => setPenaltyRuns(Math.max(0, Number(e.target.value) || 0))}
              className="w-full px-4 py-3 border border-red-200 dark:border-red-800 rounded-xl bg-white dark:bg-gray-800 dark:text-white mb-4 focus:ring-2 focus:ring-red-500 outline-none"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowPenaltyModal(false); setPenaltyRuns(5); }} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium">Cancel</button>
              <button onClick={() => { handlePenaltyRuns(penaltyRuns); setShowPenaltyModal(false); setPenaltyRuns(5); }} disabled={sending} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50">
                Confirm ({penaltyRuns})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── OVERTHROW MODAL ── */}
      {showOverthrowModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowOverthrowModal(false); setOverthrowBaseRuns(1); setOverthrowRuns(1); }}>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-orange-700 dark:text-orange-300 mb-2">🎯 Overthrow</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Set completed runs + overthrow runs</p>
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Completed Runs</p>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map(r => (
                  <button key={`base-${r}`} onClick={() => setOverthrowBaseRuns(r)}
                    className={`py-2 rounded-lg font-bold text-sm transition-all ${overthrowBaseRuns === r ? 'bg-amber-500 text-white scale-105' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Overthrow Runs</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[1, 2, 3, 4].map(r => (
                <button key={r} onClick={() => setOverthrowRuns(r)}
                  className={`py-3 rounded-lg font-bold text-lg transition-all ${overthrowRuns === r ? 'bg-orange-500 text-white scale-105' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800'}`}>
                  {r}
                </button>
              ))}
            </div>
            </div>
            <div className="mb-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 px-3 py-2 text-sm text-orange-700 dark:text-orange-300">
              Label Preview: <span className="font-bold">{overthrowBaseRuns}+{overthrowRuns}ov</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowOverthrowModal(false); setOverthrowBaseRuns(1); setOverthrowRuns(1); }} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium">Cancel</button>
              <button onClick={() => { handleOverthrow(overthrowBaseRuns, overthrowRuns); setShowOverthrowModal(false); setOverthrowBaseRuns(1); setOverthrowRuns(1); }} disabled={sending} className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 disabled:opacity-50">
                Record ({overthrowBaseRuns + overthrowRuns})
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
      {/* ── CHANGE BOWLER MODAL ── */}
      {showChangeBowlerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowChangeBowlerModal(false)}>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">🔄 Change Bowler</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Select a new bowler to replace the current one.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Bowler</label>
              <select value={newBowlerId} onChange={e => setNewBowlerId(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white">
                <option value="">Select bowler...</option>
                {getAvailableBowlers().filter(b => b.index !== match.currentBowlerId).map((p) => (
                  <option key={p.index} value={p.index}>{ROLE_EMOJI[p.role] || ''} {p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowChangeBowlerModal(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleChangeBowler} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Change</button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESUME BATSMAN MODAL ── */}
      {showResumeBatsmanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowResumeBatsmanModal(false)}>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">+ Resume Batsman</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Select a retired hurt batsman to return to the crease.</p>
            
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Batsman to Resume</label>
                <select value={resumeBatsmanId} onChange={e => setResumeBatsmanId(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white">
                  <option value="">Select retired batsman...</option>
                  {(currentInnings?.batsmenStats || []).filter(b => b.isOut && b.dismissalType === 'retired_hurt').map((b) => (
                    <option key={b.playerId} value={b.playerId}>{b.playerName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Position at Crease</label>
                <div className="flex items-center gap-2 mb-2">
                  <input type="checkbox" id="fillEmpty" checked={resumeFillEmptySpot} onChange={e => {
                    setResumeFillEmptySpot(e.target.checked);
                    if (e.target.checked) setReplaceOutBatsmanId('');
                  }} className="rounded border-gray-300" />
                  <label htmlFor="fillEmpty" className="text-sm text-gray-700 dark:text-gray-300">Fill empty spot (if a wicket just fell)</label>
                </div>
                {!resumeFillEmptySpot && (
                  <select value={replaceOutBatsmanId} onChange={e => setReplaceOutBatsmanId(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white">
                    <option value="">Replace current batsman...</option>
                    {match.currentStrikerId && <option value={match.currentStrikerId}>Replace Striker ({striker?.playerName})</option>}
                    {match.currentNonStrikerId && <option value={match.currentNonStrikerId}>Replace Non-Striker ({nonStriker?.playerName})</option>}
                  </select>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowResumeBatsmanModal(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleResumeBatsman} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Resume</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
