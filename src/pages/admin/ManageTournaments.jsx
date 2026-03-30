import { useEffect, useMemo, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Printer } from 'lucide-react';
import API from '../../utils/api';
import { useConfirm } from '../../hooks/useConfirm';
import RoundRobinTable from '../../components/public/RoundRobinTable';
import { formatLabel, getAvailableFormats, getGenerateActionLabel, getParticipantUnitLabel } from '../../utils/tournaments';

const buildScoreState = (matches = []) => Object.fromEntries(matches.flatMap((m) => [
  ...(m.score1 != null ? [[`${m._id}_1`, m.score1]] : []),
  ...(m.score2 != null ? [[`${m._id}_2`, m.score2]] : [])
]));
const buildScheduleState = (matches = []) => Object.fromEntries(matches.map((m) => [m._id, m.scheduledTime ? m.scheduledTime.substring(0, 16) : '']));
const buildLaneState = (matches = []) => Object.fromEntries(matches.map((m) => [m._id, Object.fromEntries((m.lanes || []).map((lane) => [lane.lane, { finishPosition: lane.finishPosition ?? '', finishTime: lane.finishTime || '', isQualified: Boolean(lane.isQualified) }]))]));
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

function SummaryCard({ label, value }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-4"><div className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</div><div className="mt-2 text-2xl font-bold text-gray-900">{value}</div></div>;
}

function StatusBadge({ status }) {
  const map = { pending: 'bg-yellow-100 text-yellow-700', in_progress: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

export default function ManageTournaments() {
  const [events, setEvents] = useState([]), [selectedEventId, setSelectedEventId] = useState(''), [format, setFormat] = useState('single_elimination');
  const [genderFilter, setGenderFilter] = useState('all'), [tournament, setTournament] = useState(null), [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false), [generating, setGenerating] = useState(false), [generatingQualifications, setGeneratingQualifications] = useState(false);
  const [scores, setScores] = useState({}), [laneInputs, setLaneInputs] = useState({}), [fieldInputs, setFieldInputs] = useState({}), [scheduleInputs, setScheduleInputs] = useState({});
  const [savingMatch, setSavingMatch] = useState(null), [savingSchedule, setSavingSchedule] = useState(null);
  const { confirm } = useConfirm();
  const selectedEvent = useMemo(() => events.find((e) => e._id === selectedEventId) || null, [events, selectedEventId]);
  const availableFormats = useMemo(() => getAvailableFormats(selectedEvent), [selectedEvent]);
  const groupedByRound = useMemo(() => matches.reduce((acc, m) => ((acc[m.round] ||= []).push(m), acc), {}), [matches]);
  const bracketFormats = new Set(['single_elimination', 'round_robin']);

  const resetState = () => { setTournament(null); setMatches([]); setScores({}); setLaneInputs({}); setFieldInputs({}); setScheduleInputs({}); };
  const syncState = (nextMatches, nextTournament = tournament) => { setTournament(nextTournament); setMatches(nextMatches); setScores(buildScoreState(nextMatches)); setLaneInputs(buildLaneState(nextMatches)); setFieldInputs(buildFieldState(nextMatches)); setScheduleInputs(buildScheduleState(nextMatches)); };
  const loadTournament = async (eventId) => { setLoading(true); try { const r = await API.get(`/tournaments/event/${eventId}`); syncState(r.data.matches, r.data.tournament); } catch { resetState(); } finally { setLoading(false); } };

  useEffect(() => { API.get('/events').then((r) => setEvents(r.data)); }, []);
  useEffect(() => { if (!selectedEventId) resetState(); else loadTournament(selectedEventId); }, [selectedEventId]);

  const handleEventChange = (eventId) => { setSelectedEventId(eventId); const event = events.find((e) => e._id === eventId); if (event) setFormat(getAvailableFormats(event)[0]); };
  const handleGenerate = async () => {
    if (!selectedEventId) return toast.error('Select an event first');
    setGenerating(true);
    try { const r = await API.post('/tournaments/generate', { eventId: selectedEventId, format, genderFilter: genderFilter === 'all' ? null : genderFilter }); syncState(r.data.matches, r.data.tournament); toast.success(`${formatLabel(format)} generated`); }
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
  const handleSaveHeat = async (matchId) => {
    const match = matches.find((m) => m._id === matchId); if (!match) return;
    const lanes = (match.lanes || []).map((lane) => ({ lane: lane.lane, finishPosition: laneInputs[matchId]?.[lane.lane]?.finishPosition ?? '', finishTime: laneInputs[matchId]?.[lane.lane]?.finishTime ?? '', isQualified: Boolean(laneInputs[matchId]?.[lane.lane]?.isQualified) }));
    setSavingMatch(matchId);
    try { const r = await API.put(`/tournaments/match/${matchId}`, { lanes }); syncState(r.data.allMatches); toast.success('Heat results saved'); }
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
  const handleGenerateQualifications = async () => {
    if (!tournament) return;
    setGeneratingQualifications(true);
    try { const r = await API.post(`/tournaments/${tournament._id}/generate-qualifications`); syncState(r.data.allMatches); toast.success(r.data.message); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to generate qualifications'); }
    finally { setGeneratingQualifications(false); }
  };
  const handleDelete = async () => {
    if (!tournament) return;
    const ok = await confirm({ title: 'Delete Tournament', message: 'This will delete the current bracket, heats, or field flight. Are you sure?', confirmText: 'Delete', isDangerous: true });
    if (!ok) return;
    try { await API.delete(`/tournaments/${tournament._id}`); resetState(); toast.success('Tournament deleted'); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  const [syncingLeaderboard, setSyncingLeaderboard] = useState(false);
  const handleSyncLeaderboard = async () => {
    if (!tournament || !selectedEventId) return toast.error('No tournament selected');
    setSyncingLeaderboard(true);
    try {
      const res = await API.post(`/leaderboard/sync-tournament/${selectedEventId}`);
      toast.success(res.data.message || `Auto-synced ${res.data.synced} winners to leaderboard`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to sync leaderboard');
    } finally {
      setSyncingLeaderboard(false);
    }
  };

  const handlePrintTournament = useCallback(async () => {
    if (!tournament || !selectedEvent || matches.length === 0) return toast.error('No tournament data to print');
    
    try {
      // Fetch enriched data with player details for single elimination
      let enrichedMatches = matches;
      if ((tournament.format === 'single_elimination' || tournament.format === 'round_robin') && selectedEventId) {
        try {
          const res = await API.get(`/tournaments/event/${selectedEventId}/print`);
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
          {!tournament && <>
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
          {tournament && <div className="md:col-span-2 flex items-end gap-3"><div className="flex-1 text-sm text-gray-500">Format: <strong className="text-gray-800">{formatLabel(tournament.format)}</strong> | {tournament.participantCount || 0} participants</div><button onClick={handlePrintTournament} className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-2"><Printer size={16} />Print / PDF</button><button onClick={handleSyncLeaderboard} disabled={syncingLeaderboard} className="px-4 py-2 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 border border-green-200 transition-colors disabled:opacity-50">{syncingLeaderboard ? 'Syncing...' : '📊 Sync to Leaderboard'}</button><button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200 transition-colors">Delete Tournament</button></div>}
        </div>
      </div>

      {selectedEventId && !tournament && <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800"><strong>Format note:</strong> {format === 'track_heats' ? `Track heats support both individual races and relay teams, with up to ${laneCapacity} ${participantUnit} per heat.` : format === 'field_flight' ? `Field flight keeps all participants in one ranked list. ${selectedEvent?.scoreOrder === 'asc' ? 'Lower marks rank first.' : 'Higher marks rank first.'}` : 'Bracket generation uses the event filters and selected gender filter.'}</div>}
      {loading && <div className="text-center py-12 text-gray-400"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>Loading tournament...</div>}
      {!loading && selectedEventId && !tournament && <div className="text-center py-16 text-gray-400"><p className="text-lg">No tournament exists for this event yet.</p><p className="text-sm mt-1">Select a format and click "{generateActionLabel}" to create one.</p></div>}

      {!loading && tournament?.format === 'track_heats' && matches.length > 0 && <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><SummaryCard label="Heats" value={matches.length} /><SummaryCard label="Lane Capacity" value={`${laneCapacity} ${participantUnit}`} /><SummaryCard label="Qualified" value={matches.reduce((sum, m) => sum + (m.lanes || []).filter((lane) => lane.isQualified).length, 0)} /></div>
        {matches.some((m) => m.status === 'completed') && !matches.some((m) => m.round > 1) && <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-start justify-between gap-4"><div><h3 className="text-lg font-bold text-green-900 mb-2">Ready to Generate Qualifications</h3><p className="text-sm text-green-700">Advance top performers by time or position.</p></div><button onClick={handleGenerateQualifications} disabled={generatingQualifications} className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors">{generatingQualifications ? 'Generating...' : 'Generate Qualifications'}</button></div>}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">{Object.entries(groupedByRound).sort(([a], [b]) => Number(a) - Number(b)).map(([round, roundMatches]) => <div key={round} className="space-y-4">{Number(round) > 1 && <h3 className="text-xl font-bold text-gray-900">Round {round}</h3>}{roundMatches.slice().sort((a, b) => a.matchNumber - b.matchNumber).map((match) => <div key={match._id} className={`bg-white rounded-2xl border p-5 ${match.status === 'completed' ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}><div className="flex items-center justify-between mb-4"><div><h2 className="text-lg font-semibold text-gray-900">{match.heatName || `Heat ${match.matchNumber}`}</h2><p className="text-xs text-gray-500">{(match.lanes || []).length} {participantUnit} assigned</p></div><StatusBadge status={match.status} /></div><div className="space-y-3">{(match.lanes || []).slice().sort((a, b) => a.lane - b.lane).map((lane) => <div key={`${match._id}-${lane.lane}`} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"><div className="flex items-start justify-between gap-3 mb-3"><div><div className="text-sm font-semibold text-gray-900">Lane {lane.lane}: {lane.label}</div>{lane.uucms && <div className="text-xs text-gray-500">{lane.uucms}</div>}<div className="text-xs text-gray-500">{lane.department || 'Unassigned'}</div></div>{lane.isQualified && <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Qualified</span>}</div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className="block text-xs font-medium text-gray-500 mb-1">Position</label><input type="number" min="1" className="input-field text-sm" value={laneInputs[match._id]?.[lane.lane]?.finishPosition ?? ''} onChange={(e) => setLaneInputs((p) => ({ ...p, [match._id]: { ...(p[match._id] || {}), [lane.lane]: { finishPosition: e.target.value, finishTime: p[match._id]?.[lane.lane]?.finishTime ?? '', isQualified: p[match._id]?.[lane.lane]?.isQualified ?? false } } }))} /></div><div><label className="block text-xs font-medium text-gray-500 mb-1">Time</label><input type="text" className="input-field text-sm" value={laneInputs[match._id]?.[lane.lane]?.finishTime ?? ''} onChange={(e) => setLaneInputs((p) => ({ ...p, [match._id]: { ...(p[match._id] || {}), [lane.lane]: { finishPosition: p[match._id]?.[lane.lane]?.finishPosition ?? '', finishTime: e.target.value, isQualified: p[match._id]?.[lane.lane]?.isQualified ?? false } } }))} /></div><div className="flex items-end"><label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer h-10"><input type="checkbox" checked={Boolean(laneInputs[match._id]?.[lane.lane]?.isQualified)} onChange={(e) => setLaneInputs((p) => ({ ...p, [match._id]: { ...(p[match._id] || {}), [lane.lane]: { finishPosition: p[match._id]?.[lane.lane]?.finishPosition ?? '', finishTime: p[match._id]?.[lane.lane]?.finishTime ?? '', isQualified: e.target.checked } } }))} className="accent-emerald-600" />Mark Qualified</label></div></div></div>)}</div><div className="space-y-2 mt-4"><label className="block text-xs font-medium text-gray-500">Scheduled Time</label><div className="flex gap-2"><input type="datetime-local" className="input-field text-sm" value={scheduleInputs[match._id] || ''} onChange={(e) => setScheduleInputs((p) => ({ ...p, [match._id]: e.target.value }))} /><button onClick={() => handleSaveSchedule(match._id)} disabled={savingSchedule === match._id} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">{savingSchedule === match._id ? 'Saving...' : 'Save'}</button></div></div><button onClick={() => handleSaveHeat(match._id)} disabled={savingMatch === match._id} className="w-full mt-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors">{savingMatch === match._id ? 'Saving...' : 'Save Heat Results'}</button></div>)}</div>)}</div>
      </div>}

      {!loading && tournament?.format === 'field_flight' && matches.length > 0 && <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><SummaryCard label="Flights" value={matches.length} /><SummaryCard label="Participants" value={matches.flatMap((m) => m.fieldEntries || []).length} /><SummaryCard label="Leader" value={(() => { const preview = matches.flatMap((match) => (match.fieldEntries || []).map((entry) => { const attempts = (fieldInputs[match._id]?.[fieldKey(entry)]?.attempts || entry.attempts || ['', '', '']).slice(0, Array.isArray(entry.attempts) && entry.attempts.length > 0 ? entry.attempts.length : 3); return { ...entry, bestScore: getBestFieldScore(attempts, selectedEvent?.scoreOrder || 'desc') }; })).filter((entry) => entry.bestScore != null).sort((a, b) => (selectedEvent?.scoreOrder || 'desc') === 'asc' ? a.bestScore - b.bestScore || a.order - b.order : b.bestScore - a.bestScore || a.order - b.order); return preview[0]?.label || 'Pending'; })()} /></div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800"><strong>Ranking rule:</strong> {selectedEvent?.scoreOrder === 'asc' ? 'Lower best score ranks first.' : 'Higher best score ranks first.'}</div>
        {matches.map((match) => { const previewEntries = (match.fieldEntries || []).map((entry) => { const attemptCount = Array.isArray(entry.attempts) && entry.attempts.length > 0 ? entry.attempts.length : 3; const attempts = (fieldInputs[match._id]?.[fieldKey(entry)]?.attempts || entry.attempts || ['', '', '']).slice(0, attemptCount); return { ...entry, attempts, bestScore: getBestFieldScore(attempts, selectedEvent?.scoreOrder || 'desc') }; }).sort((a, b) => { if (a.bestScore == null && b.bestScore == null) return a.order - b.order; if (a.bestScore == null) return 1; if (b.bestScore == null) return -1; return (selectedEvent?.scoreOrder || 'desc') === 'asc' ? a.bestScore - b.bestScore || a.order - b.order : b.bestScore - a.bestScore || a.order - b.order; }).map((entry, index) => ({ ...entry, liveRank: entry.bestScore != null ? index + 1 : null })); return <div key={match._id} className={`bg-white rounded-2xl border p-5 ${match.status === 'completed' ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}><div className="flex items-center justify-between mb-4"><div><h2 className="text-lg font-semibold text-gray-900">{match.heatName || `Flight ${match.matchNumber}`}</h2><p className="text-xs text-gray-500">{previewEntries.length} participants assigned</p></div><StatusBadge status={match.status} /></div><div className="overflow-x-auto"><table className="min-w-full"><thead><tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500"><th className="px-3 py-2">Order</th><th className="px-3 py-2">Participant</th><th className="px-3 py-2">Reg. Number</th><th className="px-3 py-2">UUCMS</th><th className="px-3 py-2">Department</th>{Array.from({ length: previewEntries[0]?.attempts?.length || selectedEvent?.fieldAttempts || 3 }, (_, index) => <th key={`${match._id}-header-attempt-${index}`} className="px-3 py-2 text-right">{`Attempt ${index + 1}`}</th>)}<th className="px-3 py-2 text-right">Best Score</th><th className="px-3 py-2 text-right">Rank</th></tr></thead><tbody>{previewEntries.map((entry) => <tr key={`${match._id}-${fieldKey(entry)}`} className="border-t border-gray-100"><td className="px-3 py-3 text-sm text-gray-600">{entry.order}</td><td className="px-3 py-3 text-sm font-medium text-gray-900">{entry.label}</td><td className="px-3 py-3 text-sm text-gray-500">{entry.registrationNumber || '-'}</td><td className="px-3 py-3 text-sm text-gray-500">{entry.uucms || '-'}</td><td className="px-3 py-3 text-sm text-gray-500">{entry.department || 'Unassigned'}</td>{entry.attempts.map((attempt, attemptIndex) => <td key={`${match._id}-${fieldKey(entry)}-attempt-${attemptIndex}`} className="px-3 py-3 text-right"><input type="number" step="0.01" min="0" className="w-24 text-right border rounded px-2 py-1 text-sm" value={attempt ?? ''} onChange={(e) => setFieldInputs((p) => { const current = p[match._id]?.[fieldKey(entry)]?.attempts || entry.attempts || Array.from({ length: entry.attempts?.length || selectedEvent?.fieldAttempts || 3 }, () => ''); const nextAttempts = current.slice(0, entry.attempts?.length || selectedEvent?.fieldAttempts || 3); nextAttempts[attemptIndex] = e.target.value; while (nextAttempts.length < (entry.attempts?.length || selectedEvent?.fieldAttempts || 3)) nextAttempts.push(''); return { ...p, [match._id]: { ...(p[match._id] || {}), [fieldKey(entry)]: { attempts: nextAttempts, bestScore: getBestFieldScore(nextAttempts, selectedEvent?.scoreOrder || 'desc') ?? '' } } }; })} /></td>)}<td className="px-3 py-3 text-right text-sm font-semibold text-gray-900">{entry.bestScore ?? '--'}</td><td className="px-3 py-3 text-right text-sm font-semibold text-gray-700">{entry.liveRank != null ? `#${entry.liveRank}` : '--'}</td></tr>)}</tbody></table></div><div className="space-y-2 mt-4"><label className="block text-xs font-medium text-gray-500">Scheduled Time</label><div className="flex gap-2"><input type="datetime-local" className="input-field text-sm" value={scheduleInputs[match._id] || ''} onChange={(e) => setScheduleInputs((p) => ({ ...p, [match._id]: e.target.value }))} /><button onClick={() => handleSaveSchedule(match._id)} disabled={savingSchedule === match._id} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">{savingSchedule === match._id ? 'Saving...' : 'Save'}</button></div></div><button onClick={() => handleSaveField(match._id)} disabled={savingMatch === match._id} className="w-full mt-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors">{savingMatch === match._id ? 'Saving...' : 'Save Field Results'}</button>{previewEntries[0]?.bestScore != null && <div className="text-sm text-green-700 font-medium mt-3 text-center">Current leader: {previewEntries[0].label} ({previewEntries[0].bestScore})</div>}</div>; })}
      </div>}

      {!loading && tournament && bracketFormats.has(tournament.format) && matches.length > 0 && <div className="space-y-6">{tournament.format === 'round_robin' && <RoundRobinTable matches={matches} participants={tournament.participants || []} />}{Object.entries(groupedByRound).sort(([a], [b]) => Number(a) - Number(b)).map(([round, roundMatches]) => { const totalRounds = Math.max(...Object.keys(groupedByRound).map(Number)); const roundLabel = tournament.format === 'round_robin' ? 'All Matches' : Number(round) === totalRounds ? 'Final' : Number(round) === totalRounds - 1 ? 'Semifinals' : Number(round) === totalRounds - 2 && totalRounds >= 3 ? 'Quarterfinals' : `Round ${round}`; return <div key={round}><h2 className="text-lg font-semibold text-gray-800 mb-3">{roundLabel}</h2><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{roundMatches.map((match) => <div key={match._id} className={`bg-white rounded-xl border p-4 ${match.status === 'completed' ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}><div className="flex items-center justify-between mb-3"><span className="text-xs text-gray-400 font-mono">Match #{match.matchNumber}</span><StatusBadge status={match.status} /></div><div className={`flex items-center justify-between py-2 px-3 rounded-lg mb-1 ${match.winner === match.participant1 ? 'bg-green-100 border border-green-300' : 'bg-gray-50'}`}><span className={`font-medium text-sm ${match.participant1 === 'BYE' ? 'text-gray-400 italic' : match.winner === match.participant1 ? 'text-green-800' : 'text-gray-800'}`}><span className="block">{match.participant1 || 'TBD'}</span>{match.participant1Uucms && <span className="block text-[11px] font-normal text-gray-500">{match.participant1Uucms}</span>}</span>{match.status === 'completed' ? <span className="font-bold text-sm">{match.score1}</span> : match.participant1 && match.participant2 && match.participant1 !== 'BYE' && match.participant2 !== 'BYE' ? <input type="number" min="0" className="w-14 text-center border rounded px-1 py-0.5 text-sm" value={scores[`${match._id}_1`] ?? ''} onChange={(e) => setScores((p) => ({ ...p, [`${match._id}_1`]: e.target.value }))} /> : null}</div><div className="text-center text-xs text-gray-400 font-bold my-0.5">VS</div><div className={`flex items-center justify-between py-2 px-3 rounded-lg mb-3 ${match.winner === match.participant2 ? 'bg-green-100 border border-green-300' : 'bg-gray-50'}`}><span className={`font-medium text-sm ${match.participant2 === 'BYE' ? 'text-gray-400 italic' : match.winner === match.participant2 ? 'text-green-800' : 'text-gray-800'}`}><span className="block">{match.participant2 || 'TBD'}</span>{match.participant2Uucms && <span className="block text-[11px] font-normal text-gray-500">{match.participant2Uucms}</span>}</span>{match.status === 'completed' ? <span className="font-bold text-sm">{match.score2}</span> : match.participant1 && match.participant2 && match.participant1 !== 'BYE' && match.participant2 !== 'BYE' ? <input type="number" min="0" className="w-14 text-center border rounded px-1 py-0.5 text-sm" value={scores[`${match._id}_2`] ?? ''} onChange={(e) => setScores((p) => ({ ...p, [`${match._id}_2`]: e.target.value }))} /> : null}</div><div className="space-y-2 mb-3"><label className="block text-xs font-medium text-gray-500">Scheduled Time</label><div className="flex gap-2"><input type="datetime-local" className="input-field text-sm" value={scheduleInputs[match._id] || ''} onChange={(e) => setScheduleInputs((p) => ({ ...p, [match._id]: e.target.value }))} /><button onClick={() => handleSaveSchedule(match._id)} disabled={savingSchedule === match._id} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">{savingSchedule === match._id ? 'Saving...' : 'Save'}</button></div></div>{match.status !== 'completed' && match.participant1 && match.participant2 && match.participant1 !== 'BYE' && match.participant2 !== 'BYE' && <button onClick={() => handleSaveScore(match._id)} disabled={savingMatch === match._id} className="w-full py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">{savingMatch === match._id ? 'Saving...' : 'Save Score'}</button>}</div>)}</div></div>; })}</div>}
    </div>
  );
}
