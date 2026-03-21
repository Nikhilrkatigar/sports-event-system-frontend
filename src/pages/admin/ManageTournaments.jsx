import { useEffect, useState } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { useConfirm } from '../../hooks/useConfirm';

export default function ManageTournaments() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [format, setFormat] = useState('single_elimination');
  const [genderFilter, setGenderFilter] = useState('all');
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [scores, setScores] = useState({});
  const [scheduleInputs, setScheduleInputs] = useState({});
  const [savingMatch, setSavingMatch] = useState(null);
  const [savingSchedule, setSavingSchedule] = useState(null);
  const { confirm } = useConfirm();

  useEffect(() => {
    API.get('/events').then(r => setEvents(r.data));
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setTournament(null);
      setMatches([]);
      return;
    }
    loadTournament(selectedEventId);
  }, [selectedEventId]);

  const loadTournament = async (eventId) => {
    setLoading(true);
    try {
      const r = await API.get(`/tournaments/event/${eventId}`);
      setTournament(r.data.tournament);
      setMatches(r.data.matches);
      const existingScores = {};
      const existingSchedules = {};
      r.data.matches.forEach((match) => {
        if (match.score1 != null) existingScores[`${match._id}_1`] = match.score1;
        if (match.score2 != null) existingScores[`${match._id}_2`] = match.score2;
        existingSchedules[match._id] = match.scheduledTime ? match.scheduledTime.substring(0, 16) : '';
      });
      setScores(existingScores);
      setScheduleInputs(existingSchedules);
    } catch {
      setTournament(null);
      setMatches([]);
      setScores({});
      setScheduleInputs({});
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedEventId) return toast.error('Select an event first');
    setGenerating(true);
    try {
      const r = await API.post('/tournaments/generate', { 
        eventId: selectedEventId, 
        format,
        genderFilter: genderFilter === 'all' ? null : genderFilter
      });
      setTournament(r.data.tournament);
      setMatches(r.data.matches);
      toast.success('Bracket generated');
      await loadTournament(selectedEventId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveScore = async (matchId) => {
    const s1 = scores[`${matchId}_1`];
    const s2 = scores[`${matchId}_2`];
    if (s1 == null || s2 == null || s1 === '' || s2 === '') return toast.error('Enter both scores');
    
    const previousMatches = matches;
    setMatches(prev => prev.map(m =>
      m._id === matchId ? { ...m, score1: Number(s1), score2: Number(s2) } : m
    ));
    setSavingMatch(matchId);
    
    try {
      const r = await API.put(`/tournaments/match/${matchId}`, { score1: Number(s1), score2: Number(s2) });
      setMatches(r.data.allMatches);
      toast.success('Score saved');
    } catch (err) {
      setMatches(previousMatches);
      toast.error(err.response?.data?.message || 'Failed to save score');
    } finally {
      setSavingMatch(null);
    }
  };

  const handleSaveSchedule = async (matchId) => {
    const previousMatches = matches;
    const scheduledTime = scheduleInputs[matchId];
    setMatches(prev => prev.map(m =>
      m._id === matchId ? { ...m, scheduledTime: scheduledTime || null } : m
    ));
    setSavingSchedule(matchId);
    
    try {
      const r = await API.patch(`/tournaments/match/${matchId}/schedule`, {
        scheduledTime: scheduledTime || null
      });
      setMatches(r.data.allMatches);
      toast.success('Match schedule updated');
    } catch (err) {
      setMatches(previousMatches);
      toast.error(err.response?.data?.message || 'Failed to update schedule');
    } finally {
      setSavingSchedule(null);
    }
  };

  const handleDelete = async () => {
    if (!tournament) return;
    const ok = await confirm({
      title: 'Delete Tournament',
      message: 'This will delete the entire bracket and all match data. Are you sure?',
      confirmText: 'Delete',
      isDangerous: true
    });
    if (!ok) return;
    
    const previousTournament = tournament;
    const previousMatches = matches;
    setTournament(null);
    setMatches([]);
    
    try {
      await API.delete(`/tournaments/${tournament._id}`);
      setScores({});
      setScheduleInputs({});
      toast.success('Tournament deleted');
    } catch (err) {
      setTournament(previousTournament);
      setMatches(previousMatches);
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const groupedByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {});

  const statusBadge = (status) => {
    const map = {
      pending: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700'
    };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Tournaments</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Event</label>
            <select
              className="input-field w-full"
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
            >
              <option value="">Choose an event</option>
              {events.map(event => {
                let genderLabel = '';
                if (event.allowedGenders && event.allowedGenders.length === 1) {
                  genderLabel = event.allowedGenders[0] === 'female' ? ' [♀ Females Only]' : ' [♂ Males Only]';
                }
                return (
                  <option key={event._id} value={event._id}>{event.title} ({event.type}){genderLabel}</option>
                );
              })}
            </select>
          </div>

          {!tournament && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="format" value="single_elimination" checked={format === 'single_elimination'} onChange={e => setFormat(e.target.value)} className="accent-blue-600" />
                    <span className="text-sm">Single Elimination</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="format" value="round_robin" checked={format === 'round_robin'} onChange={e => setFormat(e.target.value)} className="accent-blue-600" />
                    <span className="text-sm">Round Robin</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Participant Filter</label>
                <select 
                  className="input-field w-full" 
                  value={genderFilter} 
                  onChange={e => setGenderFilter(e.target.value)}
                >
                  <option value="all">All (Males & Females)</option>
                  <option value="male">Males Only</option>
                  <option value="female">Females Only</option>
                </select>
              </div>

              <div>
                <button
                  onClick={handleGenerate}
                  disabled={!selectedEventId || generating}
                  className="btn-primary w-full py-2.5 disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Generate Bracket'}
                </button>
              </div>
            </>
          )}

          {tournament && (
            <div className="md:col-span-2 flex items-end gap-3">
              <div className="flex-1">
                <div className="text-sm text-gray-500">
                  Format: <strong className="text-gray-800">{tournament.format === 'single_elimination' ? 'Single Elimination' : 'Round Robin'}</strong>
                  <span className="mx-2">·</span>
                  Status: {statusBadge(tournament.status)}
                  <span className="mx-2">·</span>
                  {tournament.participantCount || 0} participants
                </div>
              </div>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200 transition-colors">
                Delete Tournament
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedEventId && !tournament && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Gender Filtering:</strong> The bracket will automatically include only registrations that match the event's gender requirements. 
            {events.find(e => e._id === selectedEventId)?.allowedGenders?.length === 1 ? (
              <span> This event is restricted to {events.find(e => e._id === selectedEventId)?.allowedGenders[0]}s only.</span>
            ) : (
              <span> This event is open to all genders.</span>
            )}
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          Loading tournament...
        </div>
      )}

      {!loading && selectedEventId && !tournament && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No tournament exists for this event yet.</p>
          <p className="text-sm mt-1">Select a format and click "Generate Bracket" to create one.</p>
        </div>
      )}

      {!loading && tournament && matches.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedByRound).sort(([a], [b]) => Number(a) - Number(b)).map(([round, roundMatches]) => {
            const totalRounds = Math.max(...Object.keys(groupedByRound).map(Number));
            const roundLabel = tournament.format === 'round_robin'
              ? 'All Matches'
              : Number(round) === totalRounds
                ? 'Final'
                : Number(round) === totalRounds - 1
                  ? 'Semifinals'
                  : Number(round) === totalRounds - 2 && totalRounds >= 3
                    ? 'Quarterfinals'
                    : `Round ${round}`;

            return (
              <div key={round}>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">{roundLabel}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {roundMatches.map(match => (
                    <div key={match._id} className={`bg-white rounded-xl border p-4 ${match.status === 'completed' ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-400 font-mono">Match #{match.matchNumber}</span>
                        {statusBadge(match.status)}
                      </div>

                      <div className={`flex items-center justify-between py-2 px-3 rounded-lg mb-1 ${match.winner === match.participant1 ? 'bg-green-100 border border-green-300' : 'bg-gray-50'}`}>
                        <span className={`font-medium text-sm ${match.participant1 === 'BYE' ? 'text-gray-400 italic' : match.winner === match.participant1 ? 'text-green-800' : 'text-gray-800'}`}>
                          {match.participant1 || 'TBD'}
                        </span>
                        {match.status === 'completed' ? (
                          <span className="font-bold text-sm">{match.score1}</span>
                        ) : match.participant1 && match.participant2 && match.participant1 !== 'BYE' && match.participant2 !== 'BYE' ? (
                          <input
                            type="number"
                            min="0"
                            className="w-14 text-center border rounded px-1 py-0.5 text-sm"
                            value={scores[`${match._id}_1`] ?? ''}
                            onChange={e => setScores(s => ({ ...s, [`${match._id}_1`]: e.target.value }))}
                          />
                        ) : null}
                      </div>

                      <div className="text-center text-xs text-gray-400 font-bold my-0.5">VS</div>

                      <div className={`flex items-center justify-between py-2 px-3 rounded-lg mb-3 ${match.winner === match.participant2 ? 'bg-green-100 border border-green-300' : 'bg-gray-50'}`}>
                        <span className={`font-medium text-sm ${match.participant2 === 'BYE' ? 'text-gray-400 italic' : match.winner === match.participant2 ? 'text-green-800' : 'text-gray-800'}`}>
                          {match.participant2 || 'TBD'}
                        </span>
                        {match.status === 'completed' ? (
                          <span className="font-bold text-sm">{match.score2}</span>
                        ) : match.participant1 && match.participant2 && match.participant1 !== 'BYE' && match.participant2 !== 'BYE' ? (
                          <input
                            type="number"
                            min="0"
                            className="w-14 text-center border rounded px-1 py-0.5 text-sm"
                            value={scores[`${match._id}_2`] ?? ''}
                            onChange={e => setScores(s => ({ ...s, [`${match._id}_2`]: e.target.value }))}
                          />
                        ) : null}
                      </div>

                      <div className="space-y-2 mb-3">
                        <label className="block text-xs font-medium text-gray-500">Scheduled Time</label>
                        <div className="flex gap-2">
                          <input
                            type="datetime-local"
                            className="input-field text-sm"
                            value={scheduleInputs[match._id] || ''}
                            onChange={e => setScheduleInputs(prev => ({ ...prev, [match._id]: e.target.value }))}
                          />
                          <button
                            onClick={() => handleSaveSchedule(match._id)}
                            disabled={savingSchedule === match._id}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                          >
                            {savingSchedule === match._id ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>

                      {match.status !== 'completed' && match.participant1 && match.participant2 && match.participant1 !== 'BYE' && match.participant2 !== 'BYE' && (
                        <button
                          onClick={() => handleSaveScore(match._id)}
                          disabled={savingMatch === match._id}
                          className="w-full py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {savingMatch === match._id ? 'Saving...' : 'Save Score'}
                        </button>
                      )}

                      {match.scheduledTime && (
                        <div className="text-xs text-gray-400 mt-2 text-center">
                          {new Date(match.scheduledTime).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
