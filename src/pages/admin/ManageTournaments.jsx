import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Printer } from 'lucide-react';
import API from '../../utils/api';
import { useConfirm } from '../../hooks/useConfirm';
import RoundRobinTable from '../../components/public/RoundRobinTable';
import { formatCricketScore, formatLabel, getAvailableFormats, getGenerateActionLabel, getParticipantUnitLabel, isCricketEvent } from '../../utils/tournaments';

const buildScoreState = (matches = []) => Object.fromEntries(matches.flatMap((m) => [
  ...(m.score1 != null ? [[`${m._id}_1`, m.score1]] : []),
  ...(m.score2 != null ? [[`${m._id}_2`, m.score2]] : [])
]));
const buildScheduleState = (matches = []) => Object.fromEntries(matches.map((m) => [m._id, m.scheduledTime ? m.scheduledTime.substring(0, 16) : '']));
const buildLaneState = (matches = []) => Object.fromEntries(matches.map((m) => [m._id, Object.fromEntries((m.lanes || []).map((lane) => [lane.lane, { finishPosition: lane.finishPosition ?? '', finishTime: lane.finishTime || '', isQualified: Boolean(lane.isQualified) }]))]));
const normalizeCricketInput = (score = {}) => ({ runs: score?.runs ?? '', wickets: score?.wickets ?? '', overs: score?.overs || '' });
const buildCricketState = (matches = []) => Object.fromEntries(matches.map((match) => [match._id, {
  score1: normalizeCricketInput(match.cricketScore1),
  score2: normalizeCricketInput(match.cricketScore2),
  winnerSlot: match.winner === match.participant1 ? '1' : match.winner === match.participant2 ? '2' : '',
  resultText: match.cricketResultText || ''
}]));
const fieldKey = (entry) => String(entry.applicationId || `order-${entry.order}`);
const buildFieldState = (matches = []) => Object.fromEntries(matches.map((m) => [m._id, Object.fromEntries((m.fieldEntries || []).map((entry) => [fieldKey(entry), {
  attempts: Array.isArray(entry.attempts) && entry.attempts.length > 0 ? entry.attempts.map((attempt) => attempt ?? '') : ['', '', ''],
  bestScore: entry.bestScore ?? entry.performance ?? ''
}]))]));
const sortFieldEntries = (entries = []) => [...entries].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.order - b.order);
const getBestFieldScore = (attempts = [], scoreOrder = 'desc') => {
  const values = attempts.map((attempt) => attempt === '' || attempt == null ? null : Number(attempt)).filter((attempt) => Number.isFinite(attempt));
  if (values.length === 0) return null;
  return scoreOrder === 'asc' ? Math.min(...values) : Math.max(...values);
};

const GENDER_LABELS = { all: 'All', male: 'Male (Boys)', female: 'Female (Girls)' };
const PRINT_GENDER_LABELS = { all: 'All', male: 'Male', female: 'Female' };
const MANUAL_BYE_VALUE = '__BYE__';

function SummaryCard({ label, value }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-4"><div className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</div><div className="mt-2 text-2xl font-bold text-gray-900">{value}</div></div>;
}

function StatusBadge({ status }) {
  const map = { pending: 'bg-yellow-100 text-yellow-700', in_progress: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

// Participant selector component with dropdown for TBD
function ParticipantSelector({ match, participantSlot, participant, uucms, winner, availableParticipants, onUpdate, isUpdating, allowBye = false, scoreLabel = null }) {
  const isTBD = !participant || participant === 'TBD';
  const isBye = participant === 'BYE';
  const isWinner = winner === participant;

  if (isBye) {
    return (
      <div className={`flex items-center justify-between py-2 px-3 rounded-lg mb-1 bg-gray-50`}>
        <span className="font-medium text-sm text-gray-400 italic">BYE</span>
      </div>
    );
  }

  if (!isTBD) {
    return (
      <div className={`flex items-center justify-between py-2 px-3 rounded-lg mb-1 ${isWinner ? 'bg-green-100 border border-green-300' : 'bg-gray-50'}`}>
        <span className={`font-medium text-sm ${isWinner ? 'text-green-800' : 'text-gray-800'}`}>
          <span className="block">{participant}</span>
          {uucms && <span className="block text-[11px] font-normal text-gray-500">{uucms}</span>}
        </span>
        {scoreLabel ? <span className="font-bold text-sm text-right">{scoreLabel}</span> : null}
      </div>
    );
  }

  // TBD - Show dropdown
  return (
    <div className="mb-1">
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) {
            onUpdate(match._id, participantSlot, e.target.value);
          }
        }}
        disabled={isUpdating}
        className="w-full py-2 px-3 rounded-lg border border-yellow-300 bg-yellow-50 text-sm font-medium text-gray-700 cursor-pointer hover:bg-yellow-100 disabled:opacity-50"
      >
        <option value="">Select team or BYE...</option>
        {allowBye && <option value={MANUAL_BYE_VALUE}>BYE</option>}
        {availableParticipants.map((team) => (
          <option key={team.id} value={team.id}>
            {team.label}
          </option>
        ))}
      </select>
      {isUpdating && <div className="text-xs text-center text-yellow-600 mt-1">Updating...</div>}
    </div>
  );
}

function CricketTeamScoreEditor({ title, participant, score, onChange }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{title}</div>
      <div className="text-sm font-semibold text-gray-900 mb-3">{participant || 'TBD'}</div>
      <div className="grid grid-cols-3 gap-2">
        <input type="number" min="0" className="input-field text-sm" placeholder="Runs" value={score?.runs ?? ''} onChange={(e) => onChange('runs', e.target.value)} />
        <input type="number" min="0" max="10" className="input-field text-sm" placeholder="Wkts" value={score?.wickets ?? ''} onChange={(e) => onChange('wickets', e.target.value)} />
        <input type="text" className="input-field text-sm" placeholder="Overs" value={score?.overs ?? ''} onChange={(e) => onChange('overs', e.target.value)} />
      </div>
      {(score?.runs !== '' && score?.runs != null) && (
        <div className="text-xs text-gray-500 mt-2">Preview: {formatCricketScore(score)}</div>
      )}
    </div>
  );
}

function CricketMatchCard({
  match,
  availableParticipants,
  onUpdateParticipant,
  updatingParticipant,
  onCricketInputChange,
  cricketValue,
  onSaveCricket,
  savingMatch,
  scheduleValue,
  onScheduleChange,
  onSaveSchedule,
  savingSchedule,
  tournamentFormat
}) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${match.status === 'completed' ? 'border-green-200 bg-green-50/30' : match.status === 'in_progress' ? 'border-blue-200 bg-blue-50/20' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 font-mono">Match #{match.matchNumber}</span>
        <StatusBadge status={match.status} />
      </div>

      <ParticipantSelector
        match={match}
        participantSlot={1}
        participant={match.participant1}
        uucms={match.participant1Uucms}
        winner={match.winner}
        availableParticipants={availableParticipants}
        onUpdate={onUpdateParticipant}
        isUpdating={updatingParticipant === `${match._id}-1`}
        allowBye={tournamentFormat === 'single_elimination'}
        scoreLabel={match.cricketScore1?.runs != null ? formatCricketScore(match.cricketScore1) : null}
      />
      <div className="text-center text-xs text-gray-400 font-bold my-0.5">VS</div>
      <ParticipantSelector
        match={match}
        participantSlot={2}
        participant={match.participant2}
        uucms={match.participant2Uucms}
        winner={match.winner}
        availableParticipants={availableParticipants}
        onUpdate={onUpdateParticipant}
        isUpdating={updatingParticipant === `${match._id}-2`}
        allowBye={tournamentFormat === 'single_elimination'}
        scoreLabel={match.cricketScore2?.runs != null ? formatCricketScore(match.cricketScore2) : null}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <CricketTeamScoreEditor
          title="Team A Score"
          participant={match.participant1}
          score={cricketValue?.score1}
          onChange={(field, value) => onCricketInputChange(match._id, 'score1', field, value)}
        />
        <CricketTeamScoreEditor
          title="Team B Score"
          participant={match.participant2}
          score={cricketValue?.score2}
          onChange={(field, value) => onCricketInputChange(match._id, 'score2', field, value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Winner</label>
          <select className="input-field text-sm" value={cricketValue?.winnerSlot || ''} onChange={(e) => onCricketInputChange(match._id, 'winnerSlot', null, e.target.value)}>
            <option value="">Auto / none</option>
            {match.participant1 && match.participant1 !== 'BYE' && <option value="1">{match.participant1}</option>}
            {match.participant2 && match.participant2 !== 'BYE' && <option value="2">{match.participant2}</option>}
          </select>
          <p className="text-[11px] text-gray-500 mt-1">Use this only if the match is tied or you need to override the winner.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Result Note</label>
          <input className="input-field text-sm" placeholder="Optional result text" value={cricketValue?.resultText || ''} onChange={(e) => onCricketInputChange(match._id, 'resultText', null, e.target.value)} />
        </div>
      </div>

      <div className="space-y-2 mt-3">
        <label className="block text-xs font-medium text-gray-500">Scheduled Time</label>
        <div className="flex gap-2">
          <input type="datetime-local" className="input-field text-sm" value={scheduleValue || ''} onChange={(e) => onScheduleChange(match._id, e.target.value)} />
          <button onClick={() => onSaveSchedule(match._id)} disabled={savingSchedule === match._id} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            {savingSchedule === match._id ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {match.cricketResultText && <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">{match.cricketResultText}</div>}

      {match.participant1 && match.participant2 && match.participant1 !== 'BYE' && match.participant2 !== 'BYE' && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button onClick={() => onSaveCricket(match._id, 'in_progress')} disabled={savingMatch === match._id} className="py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {savingMatch === match._id ? 'Saving...' : 'Save Live Score'}
          </button>
          <button onClick={() => onSaveCricket(match._id, 'completed')} disabled={savingMatch === match._id} className="py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
            {savingMatch === match._id ? 'Saving...' : 'Complete Match'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ManageTournaments() {
  const [events, setEvents] = useState([]), [selectedEventId, setSelectedEventId] = useState(''), [format, setFormat] = useState('single_elimination');
  const [genderFilter, setGenderFilter] = useState('all');
  // Support multiple tournaments per event
  const [allTournaments, setAllTournaments] = useState([]); // [{tournament, matches}]
  const [activeGenderTab, setActiveGenderTab] = useState(null); // which gender tab is active
  const [loading, setLoading] = useState(false), [generating, setGenerating] = useState(false);
  const [scores, setScores] = useState({}), [laneInputs, setLaneInputs] = useState({}), [fieldInputs, setFieldInputs] = useState({}), [scheduleInputs, setScheduleInputs] = useState({}), [cricketInputs, setCricketInputs] = useState({});
  const [savingMatch, setSavingMatch] = useState(null), [savingSchedule, setSavingSchedule] = useState(null);
  const [updatingParticipant, setUpdatingParticipant] = useState(null);
  const { confirm } = useConfirm();
  const selectedEvent = useMemo(() => events.find((e) => e._id === selectedEventId) || null, [events, selectedEventId]);
  const availableFormats = useMemo(() => getAvailableFormats(selectedEvent), [selectedEvent]);

  // Derive active tournament and matches from allTournaments + activeGenderTab
  const activeTournamentEntry = useMemo(() => {
    if (allTournaments.length === 0) return null;
    if (activeGenderTab) {
      return allTournaments.find((t) => t.tournament.genderFilter === activeGenderTab) || allTournaments[0];
    }
    return allTournaments[0];
  }, [allTournaments, activeGenderTab]);

  const tournament = activeTournamentEntry?.tournament || null;
  const matches = activeTournamentEntry?.matches || [];
  const isCricketTournament = isCricketEvent(selectedEvent || tournament?.eventId);
  const groupedByRound = useMemo(() => matches.reduce((acc, m) => ((acc[m.round] ||= []).push(m), acc), {}), [matches]);
  const bracketFormats = new Set(['single_elimination', 'round_robin']);
  const availableParticipants = useMemo(() => {
    const uniqueParticipants = new Map();

    (tournament?.participants || []).forEach((entry) => {
      if (!entry?.applicationId || entry.isBye) return;

      const id = String(entry.applicationId);
      if (!uniqueParticipants.has(id)) {
        uniqueParticipants.set(id, {
          id,
          label: entry.label || `Team ${id.slice(-4)}`
        });
      }
    });

    return Array.from(uniqueParticipants.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [tournament]);

  const resetState = () => { setAllTournaments([]); setActiveGenderTab(null); setScores({}); setLaneInputs({}); setFieldInputs({}); setScheduleInputs({}); setCricketInputs({}); };
  const syncState = (nextMatches, nextTournament = tournament) => {
    // Update within allTournaments
    setAllTournaments((prev) => {
      const idx = prev.findIndex((t) => t.tournament._id === nextTournament._id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { tournament: nextTournament, matches: nextMatches };
        return updated;
      }
      return [...prev, { tournament: nextTournament, matches: nextMatches }];
    });
    setScores(buildScoreState(nextMatches));
    setLaneInputs(buildLaneState(nextMatches));
    setFieldInputs(buildFieldState(nextMatches));
    setScheduleInputs(buildScheduleState(nextMatches));
    setCricketInputs(buildCricketState(nextMatches));
  };
  const loadTournament = async (eventId) => {
    setLoading(true);
    try {
      const r = await API.get(`/tournaments/event/${eventId}`);
      if (r.data.allTournaments) {
        // Multiple tournaments returned
        setAllTournaments(r.data.allTournaments);
        const firstEntry = r.data.allTournaments[0];
        setActiveGenderTab(firstEntry?.tournament?.genderFilter || null);
        setScores(buildScoreState(firstEntry?.matches || []));
        setLaneInputs(buildLaneState(firstEntry?.matches || []));
        setFieldInputs(buildFieldState(firstEntry?.matches || []));
        setScheduleInputs(buildScheduleState(firstEntry?.matches || []));
        setCricketInputs(buildCricketState(firstEntry?.matches || []));
      } else {
        // Single tournament
        setAllTournaments([{ tournament: r.data.tournament, matches: r.data.matches }]);
        setActiveGenderTab(r.data.tournament?.genderFilter || null);
        setScores(buildScoreState(r.data.matches));
        setLaneInputs(buildLaneState(r.data.matches));
        setFieldInputs(buildFieldState(r.data.matches));
        setScheduleInputs(buildScheduleState(r.data.matches));
        setCricketInputs(buildCricketState(r.data.matches));
      }
    } catch { resetState(); } finally { setLoading(false); }
  };

  useEffect(() => { API.get('/events').then((r) => setEvents(r.data)); }, []);
  useEffect(() => { if (!selectedEventId) resetState(); else loadTournament(selectedEventId); }, [selectedEventId]);

  const handleUpdateParticipant = async (matchId, participantSlot, applicationId) => {
    setUpdatingParticipant(`${matchId}-${participantSlot}`);
    try {
      const res = await API.patch(`/tournaments/match/${matchId}/participant`, { participantSlot: Number(participantSlot), applicationId });
      syncState(res.data.allMatches);
      toast.success(`Participant ${participantSlot} updated`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update participant');
    } finally {
      setUpdatingParticipant(null);
    }
  };

  const handleEventChange = (eventId) => { 
    setSelectedEventId(eventId); 
    const event = events.find((e) => e._id === eventId); 
    if (event) {
      setFormat(getAvailableFormats(event)[0]);
    }
  };
  const handleGenerate = async () => {
    if (!selectedEventId) return toast.error('Select an event first');
    setGenerating(true);
    try {
      const r = await API.post('/tournaments/generate', { eventId: selectedEventId, format, genderFilter: genderFilter === 'all' ? null : genderFilter });
      // Reload all tournaments for this event to get the full picture
      await loadTournament(selectedEventId);
      // Switch to the newly generated gender tab
      setActiveGenderTab(r.data.tournament?.genderFilter || 'all');
      const genderLabel = genderFilter === 'all' ? '' : ` (${GENDER_LABELS[genderFilter] || genderFilter})`;
      toast.success(`${formatLabel(format)}${genderLabel} generated`);
    }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to generate'); }
    finally { setGenerating(false); }
  };
  const handleSaveSchedule = async (matchId) => {
    setSavingSchedule(matchId);
    try { const r = await API.patch(`/tournaments/match/${matchId}/schedule`, { scheduledTime: scheduleInputs[matchId] || null }); syncState(r.data.allMatches); toast.success('Schedule updated'); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to update schedule'); }
    finally { setSavingSchedule(null); }
  };
  const handleSaveScore = async (matchId) => {
    const score1 = scores[`${matchId}_1`], score2 = scores[`${matchId}_2`];
    if (score1 === '' || score2 === '' || score1 == null || score2 == null) return toast.error('Enter both scores');
    setSavingMatch(matchId);
    try { const r = await API.put(`/tournaments/match/${matchId}`, { score1: Number(score1), score2: Number(score2) }); syncState(r.data.allMatches); toast.success('Score saved'); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to save score'); }
    finally { setSavingMatch(null); }
  };
  const handleCricketInputChange = (matchId, group, field, value) => {
    setCricketInputs((previous) => {
      const current = previous[matchId] || {
        score1: normalizeCricketInput(),
        score2: normalizeCricketInput(),
        winnerSlot: '',
        resultText: ''
      };

      if (group === 'winnerSlot' || group === 'resultText') {
        return {
          ...previous,
          [matchId]: {
            ...current,
            [group]: value
          }
        };
      }

      return {
        ...previous,
        [matchId]: {
          ...current,
          [group]: {
            ...(current[group] || normalizeCricketInput()),
            [field]: value
          }
        }
      };
    });
  };
  const handleSaveCricket = async (matchId, status) => {
    const payload = cricketInputs[matchId] || {
      score1: normalizeCricketInput(),
      score2: normalizeCricketInput(),
      winnerSlot: '',
      resultText: ''
    };
    setSavingMatch(matchId);
    try {
      const r = await API.put(`/tournaments/match/${matchId}`, {
        status,
        cricketScore1: payload.score1,
        cricketScore2: payload.score2,
        winnerSlot: payload.winnerSlot || undefined,
        cricketResultText: payload.resultText || undefined
      });
      syncState(r.data.allMatches);
      toast.success(status === 'completed' ? 'Cricket match completed' : 'Live cricket score saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save cricket score');
    } finally {
      setSavingMatch(null);
    }
  };
  const handleSaveHeat = async (matchId) => {
    const match = matches.find((m) => m._id === matchId); if (!match) return;
    const lanes = (match.lanes || []).map((lane) => ({ lane: lane.lane, finishPosition: laneInputs[matchId]?.[lane.lane]?.finishPosition ?? '', finishTime: laneInputs[matchId]?.[lane.lane]?.finishTime ?? '', isQualified: Boolean(laneInputs[matchId]?.[lane.lane]?.isQualified) }));
    setSavingMatch(matchId);
    try { const r = await API.put(`/tournaments/match/${matchId}`, { lanes }); syncState(r.data.allMatches); toast.success(r.data.message || 'Heat results saved'); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to save heat results'); }
    finally { setSavingMatch(null); }
  };
  const handleSaveField = async (matchId) => {
    const match = matches.find((m) => m._id === matchId); if (!match) return;
    const fieldEntries = (match.fieldEntries || []).map((entry) => ({
      applicationId: entry.applicationId || null,
      order: entry.order,
      attempts: (fieldInputs[matchId]?.[fieldKey(entry)]?.attempts || entry.attempts || ['', '', '']).slice(0, Array.isArray(entry.attempts) && entry.attempts.length > 0 ? entry.attempts.length : 3)
    }));
    setSavingMatch(matchId);
    try { const r = await API.put(`/tournaments/match/${matchId}`, { fieldEntries }); syncState(r.data.allMatches); toast.success('Field results saved'); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to save field results'); }
    finally { setSavingMatch(null); }
  };
  const handleDelete = async () => {
    if (!tournament) return;
    const genderLabel = tournament.genderFilter && tournament.genderFilter !== 'all' ? ` (${GENDER_LABELS[tournament.genderFilter]})` : '';
    const ok = await confirm({ title: 'Delete Tournament', message: `This will delete the${genderLabel} bracket, heats, or field flight. Are you sure?`, confirmText: 'Delete', isDangerous: true });
    if (!ok) return;
    try {
      await API.delete(`/tournaments/${tournament._id}`);
      // Remove this tournament from allTournaments
      const remaining = allTournaments.filter((t) => t.tournament._id !== tournament._id);
      if (remaining.length > 0) {
        setAllTournaments(remaining);
        setActiveGenderTab(remaining[0].tournament.genderFilter);
        setScores(buildScoreState(remaining[0].matches));
        setLaneInputs(buildLaneState(remaining[0].matches));
        setFieldInputs(buildFieldState(remaining[0].matches));
        setScheduleInputs(buildScheduleState(remaining[0].matches));
        setCricketInputs(buildCricketState(remaining[0].matches));
      } else {
        resetState();
      }
      toast.success(`Tournament${genderLabel} deleted`);
    }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  const [syncingLeaderboard, setSyncingLeaderboard] = useState(false);
  const handleSyncLeaderboard = async () => {
    if (!tournament || !selectedEventId) return toast.error('No tournament selected');
    setSyncingLeaderboard(true);
    try {
      const res = await API.post(`/leaderboard/sync-tournament/${selectedEventId}`, {
        tournamentId: tournament._id,
        genderFilter: tournament.genderFilter || 'all'
      });
      toast.success(res.data.message || `Auto-synced ${res.data.synced} winners to leaderboard`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to sync leaderboard');
    } finally {
      setSyncingLeaderboard(false);
    }
  };

  const [generatingCricket, setGeneratingCricket] = useState(false);
  const handleGenerateCricketMatches = async () => {
    if (!tournament) return toast.error('No tournament selected');
    
    const ok = await confirm({
      title: 'Generate Cricket Matches',
      message: `This will create cricket matches for all pending fixtures (already completed and already-generated matches are skipped). You can then start scoring from the Cricket page.`,
      confirmText: 'Generate',
      cancelText: 'Cancel'
    });
    if (!ok) return;

    setGeneratingCricket(true);
    try {
      const res = await API.post('/cricket/from-tournament', { tournamentId: tournament._id });
      toast.success(res.data.message || `${res.data.createdMatches.length} cricket match${res.data.createdMatches.length !== 1 ? 'es' : ''} created!`);
      console.log('Created cricket matches:', res.data.createdMatches);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to generate cricket matches');
    } finally {
      setGeneratingCricket(false);
    }
  };

  const handlePrintTournament = useCallback(async () => {
    if (!tournament || !selectedEvent || matches.length === 0) return toast.error('No tournament data to print');
    
    try {
      // Fetch enriched data with player details for single elimination
      let enrichedMatches = matches;
      if ((tournament.format === 'single_elimination' || tournament.format === 'round_robin') && selectedEventId) {
        try {
          const res = await API.get(`/tournaments/event/${selectedEventId}/print`, {
            params: { genderFilter: tournament.genderFilter || 'all' }
          });
          enrichedMatches = res.data.matches || matches;
        } catch (err) {
          // If enriched endpoint fails, use regular matches
          console.warn('Could not fetch enriched matches for print:', err.message);
        }
      }
      
      const groupedByRound = {};
      enrichedMatches.forEach((match) => {
        if (!groupedByRound[match.round]) groupedByRound[match.round] = [];
        groupedByRound[match.round].push(match);
      });
      const printGenderLabel = PRINT_GENDER_LABELS[tournament.genderFilter || 'all'] || 'All';

      let htmlContent = `<!doctype html>
<html>
<head>
  <title>${selectedEvent.title} - ${formatLabel(tournament.format)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #333; background: #fff; padding: 10px; line-height: 1.4; }
    h1 { font-size: 20px; font-weight: bold; margin: 15px 0 8px 0; }
    h2 { font-size: 14px; font-weight: bold; margin: 20px 0 12px 0; page-break-after: avoid; }
    
    .header { border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 15px; }
    .gender-label {
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #111;
    }
    .format-label { font-size: 11px; color: #666; }
    
    .match-container { 
      margin-bottom: 25px; 
      border: 2px solid #333; 
      padding: 12px; 
      page-break-inside: avoid;
      background: #fff;
    }
    
    .match-header {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 12px;
      padding: 8px;
      background: #f0f0f0;
      border: 1px solid #999;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .match-title {
      flex: 1;
    }
    
    .winner-blank {
      border-bottom: 2px solid #000;
      min-width: 120px;
      text-align: center;
      padding: 0 8px;
      font-size: 11px;
      color: #999;
    }
    
    .teams-container {
      display: flex;
      gap: 15px;
      margin-top: 10px;
    }
    
    .team-table {
      flex: 1;
    }
    
    .team-name {
      font-weight: bold;
      font-size: 12px;
      margin-bottom: 6px;
      padding: 6px;
      background: #e3f2fd;
      border-left: 4px solid #1976d2;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 15px;
    }
    
    th {
      background: #333;
      color: white;
      padding: 5px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #999;
    }
    
    td {
      border: 1px solid #ddd;
      padding: 5px;
    }
    
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    
    .bye-text {
      text-align: center;
      padding: 20px;
      color: #999;
      font-style: italic;
      font-size: 12px;
    }
    
    .round-header {
      margin-top: 25px;
      margin-bottom: 12px;
      text-align: center;
      padding: 8px;
      background: #e9ecef;
      border: 2px solid #999;
      page-break-after: avoid;
      font-size: 13px;
      font-weight: bold;
    }
    
    @media print {
      body { margin: 10px; }
      .match-container { page-break-inside: avoid; }
      .teams-container { page-break-inside: avoid; }
      .round-header { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <p class="gender-label">${printGenderLabel}</p>
    <h1>${selectedEvent.title}</h1>
    <p class="format-label">${formatLabel(tournament.format)}</p>
  </div>`;

      if (tournament.format === 'single_elimination' || tournament.format === 'round_robin') {
        Object.keys(groupedByRound).sort((a, b) => Number(a) - Number(b)).forEach((round) => {
          const roundMatches = groupedByRound[round];
          const totalRounds = Math.max(...Object.keys(groupedByRound).map(Number));
          let roundLabel = `Round ${round}`;
          if (tournament.format === 'single_elimination') {
            if (Number(round) === totalRounds) roundLabel = 'FINAL';
            else if (Number(round) === totalRounds - 1) roundLabel = 'SEMIFINALS';
            else if (Number(round) === totalRounds - 2) roundLabel = 'QUARTERFINALS';
          }
          
          htmlContent += `<div class="round-header">${roundLabel}</div>`;
          
          roundMatches.sort((a, b) => a.matchNumber - b.matchNumber).forEach((match) => {
            const isByeMatch = match.participant1 === 'BYE' || match.participant2 === 'BYE';
            
            htmlContent += `<div class="match-container">
              <div class="match-header">
                <div class="match-title">Match ${match.matchNumber}: ${match.participant1 === 'BYE' ? 'BYE' : (match.participant1 || 'TBD')} vs ${match.participant2 === 'BYE' ? 'BYE' : (match.participant2 || 'TBD')}</div>
                <div class="winner-blank">${match.winner ? match.winner : ''}</div>
              </div>`;
            
            if (isByeMatch) {
              htmlContent += `<div class="bye-text">BYE MATCH</div>`;
            } else if (match.participant1TeamDetails || match.participant2TeamDetails) {
              // Team format with player lists
              htmlContent += `<div class="teams-container">`;
              
              // Team 1
              htmlContent += `<div class="team-table">
                <div class="team-name">${match.participant1 || 'TBD'}</div>
                <table>
                  <thead>
                    <tr>
                      <th>Reg #</th>
                      <th>UUCMS</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>`;
              
              if (match.participant1TeamDetails && match.participant1TeamDetails.players) {
                match.participant1TeamDetails.players.forEach((player) => {
                  const role = player.isTeamLeader ? 'CAPTAIN' : player.isSubstitute ? 'SUBSTITUTE' : 'PLAYER';
                  htmlContent += `<tr>
                    <td>${match.participant1RegistrationNumber || '-'}</td>
                    <td>${player.uucms || '-'}</td>
                    <td>${player.name || '-'}</td>
                    <td>${player.department || '-'}</td>
                    <td>${role}</td>
                  </tr>`;
                });
              }
              
              htmlContent += `</tbody></table></div>`;
              
              // Team 2
              htmlContent += `<div class="team-table">
                <div class="team-name">${match.participant2 || 'TBD'}</div>
                <table>
                  <thead>
                    <tr>
                      <th>Reg #</th>
                      <th>UUCMS</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>`;
              
              if (match.participant2TeamDetails && match.participant2TeamDetails.players) {
                match.participant2TeamDetails.players.forEach((player) => {
                  const role = player.isTeamLeader ? 'CAPTAIN' : player.isSubstitute ? 'SUBSTITUTE' : 'PLAYER';
                  htmlContent += `<tr>
                    <td>${match.participant2RegistrationNumber || '-'}</td>
                    <td>${player.uucms || '-'}</td>
                    <td>${player.name || '-'}</td>
                    <td>${player.department || '-'}</td>
                    <td>${role}</td>
                  </tr>`;
                });
              }
              
              htmlContent += `</tbody></table></div>`;
              
              htmlContent += `</div>`;
            } else {
              // No team details - simple comparison
              htmlContent += `<div class="teams-container">
                <div class="team-table">
                  <div class="team-name">${match.participant1 || 'TBD'}</div>
                  <table>
                    <thead>
                      <tr>
                        <th>Reg #</th>
                        <th>UUCMS</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>${match.participant1RegistrationNumber || '-'}</td>
                        <td>${match.participant1Uucms || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="team-table">
                  <div class="team-name">${match.participant2 || 'TBD'}</div>
                  <table>
                    <thead>
                      <tr>
                        <th>Reg #</th>
                        <th>UUCMS</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>${match.participant2RegistrationNumber || '-'}</td>
                        <td>${match.participant2Uucms || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>`;
            }
            
            htmlContent += `</div>`;
          });
        });
      } else if (tournament.format === 'track_heats') {
        Object.keys(groupedByRound).sort((a, b) => Number(a) - Number(b)).forEach((round) => {
          const roundMatches = groupedByRound[round];
          const roundLabel = Number(round) > 1 ? `Round ${round}` : 'Heats';
          htmlContent += `<div class="round-header"><h2>${roundLabel}</h2></div>`;
          
          roundMatches.forEach((match) => {
            htmlContent += `<div class="match-container">
              <h3>${match.heatName || `Heat ${match.matchNumber}`}</h3>
              <table style="width:100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                  <tr style="background: #f0f0f0; border-bottom: 2px solid #333;">
                    <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Lane</th>
                    <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Reg #</th>
                    <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Participant</th>
                    <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">UUCMS</th>
                    <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Position</th>
                    <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Time</th>
                  </tr>
                </thead>
                <tbody>
                  ${(match.lanes || []).sort((a, b) => a.lane - b.lane).map((lane) => `
                    <tr>
                      <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${lane.lane}</td>
                      <td style="border: 1px solid #ddd; padding: 6px;">${lane.registrationNumber || '-'}</td>
                      <td style="border: 1px solid #ddd; padding: 6px;">${lane.label}</td>
                      <td style="border: 1px solid #ddd; padding: 6px;">${lane.uucms || '-'}</td>
                      <td style="border: 1px solid #ddd; padding: 6px; text-align: center; padding-bottom: 12px;">${lane.finishPosition ? `P${lane.finishPosition}` : '______'}</td>
                      <td style="border: 1px solid #ddd; padding: 6px; text-align: center; padding-bottom: 12px;">${lane.finishTime || '______'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>`;
          });
        });
      } else if (tournament.format === 'field_flight') {
        Object.keys(groupedByRound).sort((a, b) => Number(a) - Number(b)).forEach((round) => {
          const roundMatches = groupedByRound[round];
          roundMatches.forEach((match) => {
            htmlContent += `<div class="match-container">
              <h3>${match.heatName || 'Field Flight'}</h3>
              <table style="width:100%; border-collapse: collapse; font-size: 10px;">
                <thead>
                  <tr style="background: #f0f0f0; border-bottom: 2px solid #333;">
                    <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Order</th>
                    <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Participant</th>
                    <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Reg #</th>
                    <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">UUCMS</th>
                    ${Array.from({ length: tournament?.eventId?.fieldAttempts || selectedEvent?.fieldAttempts || 3 }, (_, i) => `<th style="border: 1px solid #ddd; padding: 6px; text-align: center;">A${i + 1}</th>`).join('')}
                    <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Best</th>
                  </tr>
                </thead>
                <tbody>
                  ${sortFieldEntries(match.fieldEntries || []).map((entry) => `
                    <tr>
                      <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${entry.order}</td>
                      <td style="border: 1px solid #ddd; padding: 6px;">${entry.label}</td>
                      <td style="border: 1px solid #ddd; padding: 6px;">${entry.registrationNumber || '-'}</td>
                      <td style="border: 1px solid #ddd; padding: 6px;">${entry.uucms || '-'}</td>
                      ${(entry.attempts || Array.from({ length: tournament?.eventId?.fieldAttempts || selectedEvent?.fieldAttempts || 3 }, () => null)).map((attempt) => `<td style="border: 1px solid #ddd; padding: 6px; text-align: center; padding-bottom: 12px;">${attempt ?? '__'}</td>`).join('')}
                      <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${entry.bestScore ?? entry.performance ?? '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>`;
          });
        });
      }

      htmlContent += `</body></html>`;
      
      const w = window.open('', '_blank'); 
      if (!w) return toast.error('Please allow pop-ups to print');
      w.document.write(htmlContent); 
      w.document.close(); 
      w.print();
    } catch (err) {
      console.error('Error printing tournament:', err);
      toast.error('Error preparing print document');
    }
  }, [matches, selectedEvent, tournament, selectedEventId]);

  const generateActionLabel = getGenerateActionLabel(format);
  const participantUnit = getParticipantUnitLabel(selectedEvent, tournament?.format || format);
  const laneCapacity = selectedEvent?.lanesPerHeat || tournament?.eventId?.lanesPerHeat || 8;
  const totalTrackRounds = useMemo(() => matches.length > 0 ? Math.max(...matches.map((match) => Number(match.round) || 1)) : 1, [matches]);
  const supportsQualificationForRound = (round) => totalTrackRounds === 1 || Number(round) < totalTrackRounds;
  const trackStandings = useMemo(() => {
    if (tournament?.format !== 'track_heats' || matches.length === 0) return [];

    const sourceMatches = totalTrackRounds > 1
      ? matches.filter((match) => (Number(match.round) || 1) === totalTrackRounds)
      : matches;

    return sourceMatches
      .flatMap((match) => (match.lanes || []).map((lane) => ({
        ...lane,
        heatName: match.heatName || `Heat ${match.matchNumber}`
      })))
      .filter((lane) => lane.finishPosition != null || String(lane.finishTime || '').trim())
      .sort((a, b) => {
        const hasTimeA = Boolean(String(a.finishTime || '').trim());
        const hasTimeB = Boolean(String(b.finishTime || '').trim());
        if (hasTimeA && hasTimeB) {
          return (parseFloat(a.finishTime) || Infinity) - (parseFloat(b.finishTime) || Infinity)
            || (a.finishPosition ?? 999) - (b.finishPosition ?? 999)
            || a.lane - b.lane;
        }
        if (a.finishPosition != null && b.finishPosition != null) return a.finishPosition - b.finishPosition || a.lane - b.lane;
        if (a.finishPosition != null) return -1;
        if (b.finishPosition != null) return 1;
        return (parseFloat(a.finishTime) || Infinity) - (parseFloat(b.finishTime) || Infinity);
      })
      .slice(0, 3);
  }, [matches, totalTrackRounds, tournament?.format]);

   return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Tournaments</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Event</label>
            <select className="input-field w-full" value={selectedEventId} onChange={(e) => handleEventChange(e.target.value)}>
              <option value="">Choose an event</option>
              {events.map((event) => <option key={event._id} value={event._id}>{event.title} ({event.type})</option>)}
            </select>
          </div>
          {selectedEventId && <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <div className="space-y-2">{availableFormats.map((entry) => <label key={entry} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="format" value={entry} checked={format === entry} onChange={(e) => setFormat(e.target.value)} className="accent-blue-600" /><span className="text-sm">{formatLabel(entry)}{entry === 'track_heats' ? ` (${laneCapacity} lanes per heat)` : ''}</span></label>)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Participant Filter</label>
              <select className="input-field w-full" value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
                <option value="all">All (Males & Females)</option><option value="male">Males Only</option><option value="female">Females Only</option>
              </select>
            </div>
            <div><button onClick={handleGenerate} disabled={!selectedEventId || generating} className="btn-primary w-full py-2.5 disabled:opacity-50">{generating ? 'Generating...' : generateActionLabel}</button></div>
          </>}
        </div>
      </div>

      {/* Gender tabs when multiple tournaments exist */}
      {allTournaments.length > 1 && (
        <div className="flex gap-2 mb-4">
          {allTournaments.map((entry) => {
            const gf = entry.tournament.genderFilter || 'all';
            const isActive = activeGenderTab === gf;
            return (
              <button
                key={gf}
                onClick={() => {
                  setActiveGenderTab(gf);
                  setScores(buildScoreState(entry.matches));
                  setLaneInputs(buildLaneState(entry.matches));
                  setFieldInputs(buildFieldState(entry.matches));
                  setScheduleInputs(buildScheduleState(entry.matches));
                  setCricketInputs(buildCricketState(entry.matches));
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${
                  isActive
                    ? gf === 'male' ? 'bg-blue-600 text-white border-blue-600' : gf === 'female' ? 'bg-pink-600 text-white border-pink-600' : 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {GENDER_LABELS[gf] || gf} ({entry.tournament.participantCount || 0})
              </button>
            );
          })}
        </div>
      )}

      {/* Tournament info bar */}
      {tournament && <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex-1 text-sm text-gray-500">
            Format: <strong className="text-gray-800">{formatLabel(tournament.format)}</strong>
            {tournament.genderFilter && tournament.genderFilter !== 'all' && <> | <span className={`font-semibold ${tournament.genderFilter === 'male' ? 'text-blue-600' : 'text-pink-600'}`}>{GENDER_LABELS[tournament.genderFilter]}</span></>}
             | {tournament.participantCount || 0} participants
            {isCricketTournament && <> | <span className="font-semibold text-emerald-700">Cricket</span> | {tournament.eventId?.cricketOvers || selectedEvent?.cricketOvers || 20} overs</>}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handlePrintTournament} className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-2"><Printer size={16} />Print / PDF</button>
            {isCricketTournament && <button onClick={handleGenerateCricketMatches} disabled={generatingCricket} className="px-4 py-2 text-sm bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50">🏏 {generatingCricket ? 'Generating...' : 'Generate Cricket Matches'}</button>}
            <button onClick={handleSyncLeaderboard} disabled={syncingLeaderboard} className="px-4 py-2 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 border border-green-200 transition-colors disabled:opacity-50">{syncingLeaderboard ? 'Syncing...' : '📊 Sync to Leaderboard'}</button>
            <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200 transition-colors">Delete{tournament.genderFilter && tournament.genderFilter !== 'all' ? ` ${GENDER_LABELS[tournament.genderFilter]}` : ''} Tournament</button>
          </div>
        </div>
      </div>}

      {selectedEventId && !tournament && <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800"><strong>Format note:</strong> {isCricketEvent(selectedEvent) ? `Cricket uses the normal tournament bracket. Registered teams will be matched automatically, and each generated match can be scored from this page.` : format === 'track_heats' ? `Track heats support both individual races and relay teams, with up to ${laneCapacity} ${participantUnit} per heat.` : format === 'field_flight' ? `Field flight keeps all participants in one ranked list. ${selectedEvent?.scoreOrder === 'asc' ? 'Lower marks rank first.' : 'Higher marks rank first.'}` : 'Bracket generation uses the event filters and selected gender filter. You can generate separate brackets for males and females.'}</div>}
      {loading && <div className="text-center py-12 text-gray-400"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>Loading tournament...</div>}
      {!loading && selectedEventId && !tournament && <div className="text-center py-16 text-gray-400"><p className="text-lg">No tournament exists for this event yet.</p><p className="text-sm mt-1">Select a format and gender filter, then click "{generateActionLabel}" to create one.</p><p className="text-sm mt-1 text-blue-500">Tip: You can generate separate brackets for Males and Females without deleting either.</p></div>}

      {!loading && tournament?.format === 'track_heats' && matches.length > 0 && <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><SummaryCard label="Heats" value={matches.length} /><SummaryCard label="Lane Capacity" value={`${laneCapacity} ${participantUnit}`} /><SummaryCard label="Marked Qualified" value={matches.reduce((sum, m) => sum + (m.lanes || []).filter((lane) => lane.isQualified).length, 0)} /></div>
        {!matches.some((m) => m.round > 1) && <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800"><strong>How it works:</strong> Enter positions and save to finish the event in the current heat. Only mark athletes as <strong>Qualified</strong> if you want the system to automatically create the next round after all current heats are saved.</div>}
        {trackStandings.length > 0 && <div className="bg-white rounded-xl border border-gray-200 p-5"><div className="flex items-center justify-between mb-4"><div><h3 className="text-lg font-bold text-gray-900">{totalTrackRounds > 1 ? 'Final Standings' : 'Current Standings'}</h3><p className="text-sm text-gray-500">Saved positions are shown here immediately.</p></div></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{trackStandings.map((lane, index) => <div key={`${lane.applicationId || lane.label}-${lane.lane}-${index}`} className={`rounded-xl border p-4 ${index === 0 ? 'border-yellow-300 bg-yellow-50' : index === 1 ? 'border-gray-300 bg-gray-50' : 'border-orange-300 bg-orange-50'}`}><div className="text-xs font-semibold uppercase tracking-wider text-gray-500">{index === 0 ? '1st Place' : index === 1 ? '2nd Place' : '3rd Place'}</div><div className="mt-2 text-lg font-bold text-gray-900">{lane.label}</div>{lane.uucms && <div className="text-xs text-gray-500 mt-1">{lane.uucms}</div>}<div className="text-sm text-gray-600 mt-1">{lane.department || 'Unassigned'}</div><div className="mt-3 flex items-center justify-between text-xs text-gray-500"><span>{lane.heatName}</span><span>{lane.finishTime ? lane.finishTime : `P${lane.finishPosition}`}</span></div></div>)}</div></div>}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">{Object.entries(groupedByRound).sort(([a], [b]) => Number(a) - Number(b)).map(([round, roundMatches]) => <div key={round} className="space-y-4">{Number(round) > 1 && <h3 className="text-xl font-bold text-gray-900">Round {round}</h3>}{roundMatches.slice().sort((a, b) => a.matchNumber - b.matchNumber).map((match) => <div key={match._id} className={`bg-white rounded-2xl border p-5 ${match.status === 'completed' ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}><div className="flex items-center justify-between mb-4"><div><h2 className="text-lg font-semibold text-gray-900">{match.heatName || `Heat ${match.matchNumber}`}</h2><p className="text-xs text-gray-500">{(match.lanes || []).length} {participantUnit} assigned</p></div><StatusBadge status={match.status} /></div><div className="space-y-3">{(match.lanes || []).slice().sort((a, b) => a.lane - b.lane).map((lane) => <div key={`${match._id}-${lane.lane}`} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"><div className="flex items-start justify-between gap-3 mb-3"><div><div className="text-sm font-semibold text-gray-900">Lane {lane.lane}: {lane.label}</div>{lane.uucms && <div className="text-xs text-gray-500">{lane.uucms}</div>}<div className="text-xs text-gray-500">{lane.department || 'Unassigned'}</div></div>{supportsQualificationForRound(match.round) && lane.isQualified && <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Qualified</span>}</div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className="block text-xs font-medium text-gray-500 mb-1">Position</label><input type="number" min="1" className="input-field text-sm" value={laneInputs[match._id]?.[lane.lane]?.finishPosition ?? ''} onChange={(e) => setLaneInputs((p) => ({ ...p, [match._id]: { ...(p[match._id] || {}), [lane.lane]: { finishPosition: e.target.value, finishTime: p[match._id]?.[lane.lane]?.finishTime ?? '', isQualified: p[match._id]?.[lane.lane]?.isQualified ?? false } } }))} /></div><div><label className="block text-xs font-medium text-gray-500 mb-1">Time</label><input type="text" className="input-field text-sm" value={laneInputs[match._id]?.[lane.lane]?.finishTime ?? ''} onChange={(e) => setLaneInputs((p) => ({ ...p, [match._id]: { ...(p[match._id] || {}), [lane.lane]: { finishPosition: p[match._id]?.[lane.lane]?.finishPosition ?? '', finishTime: e.target.value, isQualified: p[match._id]?.[lane.lane]?.isQualified ?? false } } }))} /></div>{supportsQualificationForRound(match.round) && <div className="flex items-end"><label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer h-10"><input type="checkbox" checked={Boolean(laneInputs[match._id]?.[lane.lane]?.isQualified)} onChange={(e) => setLaneInputs((p) => ({ ...p, [match._id]: { ...(p[match._id] || {}), [lane.lane]: { finishPosition: p[match._id]?.[lane.lane]?.finishPosition ?? '', finishTime: p[match._id]?.[lane.lane]?.finishTime ?? '', isQualified: e.target.checked } } }))} className="accent-emerald-600" />Mark Qualified</label></div>}</div></div>)}</div><div className="space-y-2 mt-4"><label className="block text-xs font-medium text-gray-500">Scheduled Time</label><div className="flex gap-2"><input type="datetime-local" className="input-field text-sm" value={scheduleInputs[match._id] || ''} onChange={(e) => setScheduleInputs((p) => ({ ...p, [match._id]: e.target.value }))} /><button onClick={() => handleSaveSchedule(match._id)} disabled={savingSchedule === match._id} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">{savingSchedule === match._id ? 'Saving...' : 'Save'}</button></div></div><button onClick={() => handleSaveHeat(match._id)} disabled={savingMatch === match._id} className="w-full mt-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors">{savingMatch === match._id ? 'Saving...' : 'Save Heat Results'}</button></div>)}</div>)}</div>
      </div>}

      {!loading && tournament?.format === 'field_flight' && matches.length > 0 && <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><SummaryCard label="Flights" value={matches.length} /><SummaryCard label="Participants" value={matches.flatMap((m) => m.fieldEntries || []).length} /><SummaryCard label="Leader" value={(() => { const preview = matches.flatMap((match) => (match.fieldEntries || []).map((entry) => { const attempts = (fieldInputs[match._id]?.[fieldKey(entry)]?.attempts || entry.attempts || ['', '', '']).slice(0, Array.isArray(entry.attempts) && entry.attempts.length > 0 ? entry.attempts.length : 3); return { ...entry, bestScore: getBestFieldScore(attempts, selectedEvent?.scoreOrder || 'desc') }; })).filter((entry) => entry.bestScore != null).sort((a, b) => (selectedEvent?.scoreOrder || 'desc') === 'asc' ? a.bestScore - b.bestScore || a.order - b.order : b.bestScore - a.bestScore || a.order - b.order); return preview[0]?.label || 'Pending'; })()} /></div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800"><strong>Ranking rule:</strong> {selectedEvent?.scoreOrder === 'asc' ? 'Lower best score ranks first.' : 'Higher best score ranks first.'}</div>
        {matches.map((match) => { const previewEntries = (match.fieldEntries || []).map((entry) => { const attemptCount = Array.isArray(entry.attempts) && entry.attempts.length > 0 ? entry.attempts.length : 3; const attempts = (fieldInputs[match._id]?.[fieldKey(entry)]?.attempts || entry.attempts || ['', '', '']).slice(0, attemptCount); return { ...entry, attempts, bestScore: getBestFieldScore(attempts, selectedEvent?.scoreOrder || 'desc') }; }).sort((a, b) => { if (a.bestScore == null && b.bestScore == null) return a.order - b.order; if (a.bestScore == null) return 1; if (b.bestScore == null) return -1; return (selectedEvent?.scoreOrder || 'desc') === 'asc' ? a.bestScore - b.bestScore || a.order - b.order : b.bestScore - a.bestScore || a.order - b.order; }).map((entry, index) => ({ ...entry, liveRank: entry.bestScore != null ? index + 1 : null })); return <div key={match._id} className={`bg-white rounded-2xl border p-5 ${match.status === 'completed' ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}><div className="flex items-center justify-between mb-4"><div><h2 className="text-lg font-semibold text-gray-900">{match.heatName || `Flight ${match.matchNumber}`}</h2><p className="text-xs text-gray-500">{previewEntries.length} participants assigned</p></div><StatusBadge status={match.status} /></div><div className="overflow-x-auto"><table className="min-w-full"><thead><tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500"><th className="px-3 py-2">Order</th><th className="px-3 py-2">Participant</th><th className="px-3 py-2">Reg. Number</th><th className="px-3 py-2">UUCMS</th><th className="px-3 py-2">Department</th>{Array.from({ length: previewEntries[0]?.attempts?.length || selectedEvent?.fieldAttempts || 3 }, (_, index) => <th key={`${match._id}-header-attempt-${index}`} className="px-3 py-2 text-right">{`Attempt ${index + 1}`}</th>)}<th className="px-3 py-2 text-right">Best Score</th><th className="px-3 py-2 text-right">Rank</th></tr></thead><tbody>{previewEntries.map((entry) => <tr key={`${match._id}-${fieldKey(entry)}`} className="border-t border-gray-100"><td className="px-3 py-3 text-sm text-gray-600">{entry.order}</td><td className="px-3 py-3 text-sm font-medium text-gray-900">{entry.label}</td><td className="px-3 py-3 text-sm text-gray-500">{entry.registrationNumber || '-'}</td><td className="px-3 py-3 text-sm text-gray-500">{entry.uucms || '-'}</td><td className="px-3 py-3 text-sm text-gray-500">{entry.department || 'Unassigned'}</td>{entry.attempts.map((attempt, attemptIndex) => <td key={`${match._id}-${fieldKey(entry)}-attempt-${attemptIndex}`} className="px-3 py-3 text-right"><input type="number" step="0.01" min="0" className="w-24 text-right border rounded px-2 py-1 text-sm" value={attempt ?? ''} onChange={(e) => setFieldInputs((p) => { const current = p[match._id]?.[fieldKey(entry)]?.attempts || entry.attempts || Array.from({ length: entry.attempts?.length || selectedEvent?.fieldAttempts || 3 }, () => ''); const nextAttempts = current.slice(0, entry.attempts?.length || selectedEvent?.fieldAttempts || 3); nextAttempts[attemptIndex] = e.target.value; while (nextAttempts.length < (entry.attempts?.length || selectedEvent?.fieldAttempts || 3)) nextAttempts.push(''); return { ...p, [match._id]: { ...(p[match._id] || {}), [fieldKey(entry)]: { attempts: nextAttempts, bestScore: getBestFieldScore(nextAttempts, selectedEvent?.scoreOrder || 'desc') ?? '' } } }; })} /></td>)}<td className="px-3 py-3 text-right text-sm font-semibold text-gray-900">{entry.bestScore ?? '--'}</td><td className="px-3 py-3 text-right text-sm font-semibold text-gray-700">{entry.liveRank != null ? `#${entry.liveRank}` : '--'}</td></tr>)}</tbody></table></div><div className="space-y-2 mt-4"><label className="block text-xs font-medium text-gray-500">Scheduled Time</label><div className="flex gap-2"><input type="datetime-local" className="input-field text-sm" value={scheduleInputs[match._id] || ''} onChange={(e) => setScheduleInputs((p) => ({ ...p, [match._id]: e.target.value }))} /><button onClick={() => handleSaveSchedule(match._id)} disabled={savingSchedule === match._id} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">{savingSchedule === match._id ? 'Saving...' : 'Save'}</button></div></div><button onClick={() => handleSaveField(match._id)} disabled={savingMatch === match._id} className="w-full mt-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors">{savingMatch === match._id ? 'Saving...' : 'Save Field Results'}</button>{previewEntries[0]?.bestScore != null && <div className="text-sm text-green-700 font-medium mt-3 text-center">Current leader: {previewEntries[0].label} ({previewEntries[0].bestScore})</div>}</div>; })}
      </div>}

      {!loading && tournament && bracketFormats.has(tournament.format) && matches.length > 0 && (
        <div className="space-y-6">
          {tournament.format === 'round_robin' && <RoundRobinTable matches={matches} participants={tournament.participants || []} />}
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
                  {roundMatches.map((match) => (
                    isCricketTournament ? (
                      <CricketMatchCard
                        key={match._id}
                        match={match}
                        availableParticipants={availableParticipants}
                        onUpdateParticipant={handleUpdateParticipant}
                        updatingParticipant={updatingParticipant}
                        onCricketInputChange={handleCricketInputChange}
                        cricketValue={cricketInputs[match._id]}
                        onSaveCricket={handleSaveCricket}
                        savingMatch={savingMatch}
                        scheduleValue={scheduleInputs[match._id] || ''}
                        onScheduleChange={(matchId, value) => setScheduleInputs((p) => ({ ...p, [matchId]: value }))}
                        onSaveSchedule={handleSaveSchedule}
                        savingSchedule={savingSchedule}
                        tournamentFormat={tournament.format}
                      />
                    ) : (
                      <div key={match._id} className={`bg-white rounded-xl border p-4 ${match.status === 'completed' ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-gray-400 font-mono">Match #{match.matchNumber}</span>
                          <StatusBadge status={match.status} />
                        </div>
                        <ParticipantSelector match={match} participantSlot={1} participant={match.participant1} uucms={match.participant1Uucms} winner={match.winner} availableParticipants={availableParticipants} onUpdate={handleUpdateParticipant} isUpdating={updatingParticipant === `${match._id}-1`} allowBye={tournament.format === 'single_elimination'} />
                        {match.status === 'completed' && match.participant1 && match.participant1 !== 'BYE' ? <div className="text-center py-2 px-3 text-sm font-bold text-gray-700">{match.score1}</div> : match.participant1 && match.participant2 && match.participant1 !== 'BYE' && match.participant2 !== 'BYE' && match.status !== 'completed' ? <input type="number" min="0" className="w-full text-center border rounded px-1 py-1 text-sm mb-1" placeholder="Score" value={scores[`${match._id}_1`] ?? ''} onChange={(e) => setScores((p) => ({ ...p, [`${match._id}_1`]: e.target.value }))} /> : null}
                        <div className="text-center text-xs text-gray-400 font-bold my-0.5">VS</div>
                        <ParticipantSelector match={match} participantSlot={2} participant={match.participant2} uucms={match.participant2Uucms} winner={match.winner} availableParticipants={availableParticipants} onUpdate={handleUpdateParticipant} isUpdating={updatingParticipant === `${match._id}-2`} allowBye={tournament.format === 'single_elimination'} />
                        {match.status === 'completed' && match.participant2 && match.participant2 !== 'BYE' ? <div className="text-center py-2 px-3 text-sm font-bold text-gray-700">{match.score2}</div> : match.participant1 && match.participant2 && match.participant1 !== 'BYE' && match.participant2 !== 'BYE' && match.status !== 'completed' ? <input type="number" min="0" className="w-full text-center border rounded px-1 py-1 text-sm mb-3" placeholder="Score" value={scores[`${match._id}_2`] ?? ''} onChange={(e) => setScores((p) => ({ ...p, [`${match._id}_2`]: e.target.value }))} /> : null}
                        <div className="space-y-2 mb-3">
                          <label className="block text-xs font-medium text-gray-500">Scheduled Time</label>
                          <div className="flex gap-2">
                            <input type="datetime-local" className="input-field text-sm" value={scheduleInputs[match._id] || ''} onChange={(e) => setScheduleInputs((p) => ({ ...p, [match._id]: e.target.value }))} />
                            <button onClick={() => handleSaveSchedule(match._id)} disabled={savingSchedule === match._id} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">{savingSchedule === match._id ? 'Saving...' : 'Save'}</button>
                          </div>
                        </div>
                        {match.status !== 'completed' && match.participant1 && match.participant2 && match.participant1 !== 'BYE' && match.participant2 !== 'BYE' && <button onClick={() => handleSaveScore(match._id)} disabled={savingMatch === match._id} className="w-full py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">{savingMatch === match._id ? 'Saving...' : 'Save Score'}</button>}
                      </div>
                    )
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
