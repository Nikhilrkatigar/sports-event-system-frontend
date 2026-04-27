import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { io } from 'socket.io-client';
import resolveSocketUrl from '../../utils/socket';

export default function CricketLiveScoring() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  
  // Form states for recording a ball
  const [ballForm, setBallForm] = useState({
    runsScored: 0,
    isWide: false,
    isNoBall: false,
    isBye: false,
    isLegBye: false,
    isWicket: false,
    wicketType: 'bowled',
    wicketFielder: '',
    newBatsmanId: ''
  });

  const [currentPlayers, setCurrentPlayers] = useState({
    striker: null,
    nonStriker: null,
    bowler: null,
    battingTeam: null,
    bowlingTeam: null
  });

  // Load match data
  const loadMatch = useCallback(async () => {
    try {
      const res = await API.get(`/cricket/matches/${matchId}`);
      setMatch(res.data);

      // Extract current players
      const innings = res.data.innings?.find(i => i.inningNumber === res.data.currentInning);
      if (innings) {
        const battingTeam = res.data[innings.battingTeam];
        const bowlingTeam = res.data[innings.bowlingTeam];
        
        const striker = innings.batsmenStats?.find(b => b.playerId === res.data.currentStrikerId);
        const nonStriker = innings.batsmenStats?.find(b => b.playerId === res.data.currentNonStrikerId);
        const bowler = innings.bowlerStats?.find(b => b.playerId === res.data.currentBowlerId);

        setCurrentPlayers({
          striker: striker?.playerName || 'N/A',
          nonStriker: nonStriker?.playerName || 'N/A',
          bowler: bowler?.playerName || 'N/A',
          battingTeam: battingTeam?.name,
          bowlingTeam: bowlingTeam?.name
        });
      }
    } catch (err) {
      console.error('Error loading match:', err);
      toast.error('Failed to load match');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  // Socket setup for real-time updates
  useEffect(() => {
    if (!matchId) return;
    const s = io(resolveSocketUrl(), { transports: ['websocket', 'polling'] });
    s.emit('join_cricket_match', matchId);
    
    s.on('cricket_ball_update', () => {
      loadMatch();
    });

    s.on('cricket_wicket', () => {
      loadMatch();
    });

    s.on('cricket_over_end', () => {
      loadMatch();
    });

    setSocket(s);
    return () => {
      s.emit('leave_cricket_match', matchId);
      s.disconnect();
    };
  }, [matchId, loadMatch]);

  // Record a ball delivery
  const handleRecordBall = async () => {
    try {
      const payload = {
        ...ballForm,
        runsScored: ballForm.isWide || ballForm.isNoBall ? 0 : parseInt(ballForm.runsScored) || 0
      };

      await API.post(`/cricket/matches/${matchId}/ball`, payload);
      toast.success('Ball recorded');
      
      // Reset form
      setBallForm({
        runsScored: 0,
        isWide: false,
        isNoBall: false,
        isBye: false,
        isLegBye: false,
        isWicket: false,
        wicketType: 'bowled',
        wicketFielder: '',
        newBatsmanId: ''
      });

      loadMatch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record ball');
    }
  };

  // End current over
  const handleEndOver = async () => {
    try {
      await API.post(`/cricket/matches/${matchId}/end-over`);
      toast.success('Over ended');
      loadMatch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to end over');
    }
  };

  // Undo last ball
  const handleUndoBall = async () => {
    try {
      await API.post(`/cricket/matches/${matchId}/undo`);
      toast.success('Last ball undone');
      loadMatch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to undo');
    }
  };

  // Change striker/non-striker
  const handleSwapStrike = async () => {
    try {
      const innings = match.innings?.find(i => i.inningNumber === match.currentInning);
      if (!innings) return;
      
      const newStrikerId = match.currentNonStrikerId;
      const newNonStrikerId = match.currentStrikerId;
      
      // This would need a new endpoint or be done via ball recording
      toast.info('Rotate strike via recording a run');
    } catch (err) {
      toast.error('Failed to rotate strike');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-400">Loading match...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return <div className="py-8 text-center text-gray-500">Match not found</div>;
  }

  const currentInnings = match.innings?.find(i => i.inningNumber === match.currentInning);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🎯 Live Match Scoring</h1>

      {/* Match Info */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl p-6 mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm opacity-80">Batting</p>
            <p className="text-lg font-bold">{currentPlayers.battingTeam}</p>
          </div>
          <div>
            <p className="text-sm opacity-80">Score</p>
            <p className="text-2xl font-bold">
              {currentInnings?.totalRuns}/{currentInnings?.totalWickets} 
              <span className="text-sm opacity-80 ml-2">({currentInnings?.totalOvers})</span>
            </p>
          </div>
          <div>
            <p className="text-sm opacity-80">Bowling</p>
            <p className="text-lg font-bold">{currentPlayers.bowlingTeam}</p>
          </div>
        </div>
      </div>

      {/* Current Players Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">Striker ⚡</div>
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300 mt-2">{currentPlayers.striker}</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">Non-Striker</div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-2">{currentPlayers.nonStriker}</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">Bowler 🎯</div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300 mt-2">{currentPlayers.bowler}</div>
        </div>
      </div>

      {/* Ball Recording Form */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Record Ball</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {/* Runs Scored */}
          <div>
            <label className="block text-sm font-medium mb-2">Runs Scored</label>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4, 5, 6].map(run => (
                <button
                  key={run}
                  onClick={() => {
                    setBallForm({ ...ballForm, runsScored: run, isWide: false, isNoBall: false });
                  }}
                  className={`flex-1 py-2 rounded font-bold transition ${
                    ballForm.runsScored === run && !ballForm.isWide && !ballForm.isNoBall
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {run}
                </button>
              ))}
            </div>
          </div>

          {/* Wide */}
          <div>
            <label className="block text-sm font-medium mb-2">Wide?</label>
            <button
              onClick={() => setBallForm({ ...ballForm, isWide: !ballForm.isWide, isNoBall: false })}
              className={`w-full py-2 rounded font-bold transition ${
                ballForm.isWide
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
              }`}
            >
              {ballForm.isWide ? '✓ Wide' : 'Wide'}
            </button>
          </div>

          {/* No Ball */}
          <div>
            <label className="block text-sm font-medium mb-2">No Ball?</label>
            <button
              onClick={() => setBallForm({ ...ballForm, isNoBall: !ballForm.isNoBall, isWide: false })}
              className={`w-full py-2 rounded font-bold transition ${
                ballForm.isNoBall
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
              }`}
            >
              {ballForm.isNoBall ? '✓ NB' : 'No Ball'}
            </button>
          </div>

          {/* Wicket */}
          <div>
            <label className="block text-sm font-medium mb-2">Wicket?</label>
            <button
              onClick={() => setBallForm({ ...ballForm, isWicket: !ballForm.isWicket })}
              className={`w-full py-2 rounded font-bold transition ${
                ballForm.isWicket
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
              }`}
            >
              {ballForm.isWicket ? '🔴 OUT' : 'Wicket'}
            </button>
          </div>
        </div>

        {/* Wicket Details */}
        {ballForm.isWicket && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-4">
            <h3 className="font-bold mb-3">Wicket Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={ballForm.wicketType}
                  onChange={e => setBallForm({ ...ballForm, wicketType: e.target.value })}
                  className="w-full border rounded-lg p-2 dark:bg-gray-700"
                >
                  <option value="bowled">Bowled</option>
                  <option value="caught">Caught</option>
                  <option value="run_out">Run Out</option>
                  <option value="stumped">Stumped</option>
                  <option value="lbw">LBW</option>
                  <option value="hit_wicket">Hit Wicket</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fielder (if caught)</label>
                <input
                  type="text"
                  value={ballForm.wicketFielder}
                  onChange={e => setBallForm({ ...ballForm, wicketFielder: e.target.value })}
                  placeholder="Fielder name"
                  className="w-full border rounded-lg p-2 dark:bg-gray-700"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleRecordBall}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition"
          >
            ✓ Record Ball
          </button>
          <button
            onClick={handleEndOver}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            End Over
          </button>
          <button
            onClick={handleUndoBall}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            ↶ Undo
          </button>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <button onClick={() => setBallForm({ ...ballForm, runsScored: 0 })} className="bg-gray-200 dark:bg-gray-700 py-2 rounded font-bold hover:bg-gray-300">Dot Ball</button>
        <button onClick={() => setBallForm({ ...ballForm, runsScored: 1 })} className="bg-green-200 dark:bg-green-700 py-2 rounded font-bold hover:bg-green-300">1 Run</button>
        <button onClick={() => setBallForm({ ...ballForm, runsScored: 2 })} className="bg-green-200 dark:bg-green-700 py-2 rounded font-bold hover:bg-green-300">2 Runs</button>
        <button onClick={() => setBallForm({ ...ballForm, runsScored: 3 })} className="bg-green-200 dark:bg-green-700 py-2 rounded font-bold hover:bg-green-300">3 Runs</button>
        <button onClick={() => setBallForm({ ...ballForm, runsScored: 4 })} className="bg-blue-200 dark:bg-blue-700 py-2 rounded font-bold hover:bg-blue-300">4️⃣ FOUR</button>
        <button onClick={() => setBallForm({ ...ballForm, runsScored: 6 })} className="bg-purple-200 dark:bg-purple-700 py-2 rounded font-bold hover:bg-purple-300">6️⃣ SIX</button>
      </div>
    </div>
  );
}
