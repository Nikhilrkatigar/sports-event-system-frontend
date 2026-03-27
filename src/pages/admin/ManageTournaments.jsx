import { useEffect, useMemo, useState, useCallback } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { useConfirm } from '../../hooks/useConfirm';
import { Printer } from 'lucide-react';

const formatLabel = (format) => {
  if (format === 'single_elimination') return 'Single Elimination';
  if (format === 'round_robin') return 'Round Robin';
  if (format === 'track_heats') return 'Track Heats';
  return format;
};

const buildScoreState = (matches = []) => {
  const next = {};
  matches.forEach((match) => {
    if (match.score1 != null) next[`${match._id}_1`] = match.score1;
    if (match.score2 != null) next[`${match._id}_2`] = match.score2;
  });
  return next;
};

const buildScheduleState = (matches = []) => {
  const next = {};
  matches.forEach((match) => {
    next[match._id] = match.scheduledTime ? match.scheduledTime.substring(0, 16) : '';
  });
  return next;
};

const buildLaneState = (matches = []) => {
  const next = {};
  matches.forEach((match) => {
    next[match._id] = {};
    (match.lanes || []).forEach((lane) => {
      next[match._id][lane.lane] = {
        finishPosition: lane.finishPosition ?? '',
        finishTime: lane.finishTime || '',
        isQualified: Boolean(lane.isQualified)
      };
    });
  });
  return next;
};

export default function ManageTournaments() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [format, setFormat] = useState('single_elimination');
  const [genderFilter, setGenderFilter] = useState('all');
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingQualifications, setGeneratingQualifications] = useState(false);
  const [scores, setScores] = useState({});
  const [laneInputs, setLaneInputs] = useState({});
  const [scheduleInputs, setScheduleInputs] = useState({});
  const [savingMatch, setSavingMatch] = useState(null);
  const [savingSchedule, setSavingSchedule] = useState(null);
  const { confirm } = useConfirm();

  const selectedEvent = useMemo(
    () => events.find((event) => event._id === selectedEventId) || null,
    [events, selectedEventId]
  );

  useEffect(() => {
    API.get('/events').then((response) => setEvents(response.data));
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setTournament(null);
      setMatches([]);
      setScores({});
      setLaneInputs({});
      setScheduleInputs({});
      return;
    }
    loadTournament(selectedEventId);
  }, [selectedEventId]);

  const loadTournament = async (eventId) => {
    setLoading(true);
    try {
      const response = await API.get(`/tournaments/event/${eventId}`);
      setTournament(response.data.tournament);
      setMatches(response.data.matches);
      setScores(buildScoreState(response.data.matches));
      setLaneInputs(buildLaneState(response.data.matches));
      setScheduleInputs(buildScheduleState(response.data.matches));
    } catch {
      setTournament(null);
      setMatches([]);
      setScores({});
      setLaneInputs({});
      setScheduleInputs({});
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = (eventId) => {
    setSelectedEventId(eventId);
    const event = events.find((entry) => entry._id === eventId);
    if (!event) return;

    if (event.type === 'single') {
      setFormat('track_heats');
    } else if (format === 'track_heats') {
      setFormat('single_elimination');
    }
  };

  const handleGenerate = async () => {
    if (!selectedEventId) return toast.error('Select an event first');
    setGenerating(true);
    try {
      const response = await API.post('/tournaments/generate', {
        eventId: selectedEventId,
        format,
        genderFilter: genderFilter === 'all' ? null : genderFilter
      });
      setTournament(response.data.tournament);
      setMatches(response.data.matches);
      setScores(buildScoreState(response.data.matches));
      setLaneInputs(buildLaneState(response.data.matches));
      setScheduleInputs(buildScheduleState(response.data.matches));
      toast.success(format === 'track_heats' ? 'Track heats generated' : 'Bracket generated');
      await loadTournament(selectedEventId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveScore = async (matchId) => {
    const score1 = scores[`${matchId}_1`];
    const score2 = scores[`${matchId}_2`];
    if (score1 == null || score2 == null || score1 === '' || score2 === '') {
      return toast.error('Enter both scores');
    }

    setSavingMatch(matchId);
    try {
      const response = await API.put(`/tournaments/match/${matchId}`, {
        score1: Number(score1),
        score2: Number(score2)
      });
      setMatches(response.data.allMatches);
      setScores(buildScoreState(response.data.allMatches));
      toast.success('Score saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save score');
    } finally {
      setSavingMatch(null);
    }
  };

  const handleLaneChange = (matchId, lane, field, value) => {
    setLaneInputs((previous) => ({
      ...previous,
      [matchId]: {
        ...(previous[matchId] || {}),
        [lane]: {
          finishPosition: previous[matchId]?.[lane]?.finishPosition ?? '',
          finishTime: previous[matchId]?.[lane]?.finishTime ?? '',
          isQualified: previous[matchId]?.[lane]?.isQualified ?? false,
          [field]: value
        }
      }
    }));
  };

  const handleSaveHeat = async (matchId) => {
    const match = matches.find((entry) => entry._id === matchId);
    if (!match) return;

    const lanes = (match.lanes || []).map((lane) => ({
      lane: lane.lane,
      finishPosition: laneInputs[matchId]?.[lane.lane]?.finishPosition ?? '',
      finishTime: laneInputs[matchId]?.[lane.lane]?.finishTime ?? '',
      isQualified: Boolean(laneInputs[matchId]?.[lane.lane]?.isQualified)
    }));

    setSavingMatch(matchId);
    try {
      const response = await API.put(`/tournaments/match/${matchId}`, { lanes });
      setMatches(response.data.allMatches);
      setLaneInputs(buildLaneState(response.data.allMatches));
      toast.success('Heat results saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save heat results');
    } finally {
      setSavingMatch(null);
    }
  };

  const handleSaveSchedule = async (matchId) => {
    const scheduledTime = scheduleInputs[matchId];
    setSavingSchedule(matchId);

    try {
      const response = await API.patch(`/tournaments/match/${matchId}/schedule`, {
        scheduledTime: scheduledTime || null
      });
      setMatches(response.data.allMatches);
      setScheduleInputs(buildScheduleState(response.data.allMatches));
      toast.success('Schedule updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update schedule');
    } finally {
      setSavingSchedule(null);
    }
  };

  const handleDelete = async () => {
    if (!tournament) return;
    const ok = await confirm({
      title: 'Delete Tournament',
      message: 'This will delete the entire bracket or heats schedule and all match data. Are you sure?',
      confirmText: 'Delete',
      isDangerous: true
    });
    if (!ok) return;

    try {
      await API.delete(`/tournaments/${tournament._id}`);
      setTournament(null);
      setMatches([]);
      setScores({});
      setLaneInputs({});
      setScheduleInputs({});
      toast.success('Tournament deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleGenerateQualifications = async () => {
    if (!tournament) return;
    setGeneratingQualifications(true);
    try {
      const response = await API.post(`/tournaments/${tournament._id}/generate-qualifications`);
      setMatches(response.data.allMatches);
      setScores(buildScoreState(response.data.allMatches));
      setLaneInputs(buildLaneState(response.data.allMatches));
      setScheduleInputs(buildScheduleState(response.data.allMatches));
      toast.success(response.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate qualifications');
    } finally {
      setGeneratingQualifications(false);
    }
  };

  const groupedByRound = matches.reduce((accumulator, match) => {
    if (!accumulator[match.round]) accumulator[match.round] = [];
    accumulator[match.round].push(match);
    return accumulator;
  }, {});

  const handlePrintTournament = useCallback(() => {
    if (!tournament || !selectedEvent || matches.length === 0) {
      toast.error('No tournament data to print');
      return;
    }

    const isTrackHeats = tournament.format === 'track_heats';
    const totalRounds = Math.max(...matches.map(m => m.round));

    const getRoundLabel = (round) => {
      if (tournament.format === 'round_robin') return 'All Matches';
      if (Number(round) === totalRounds) return 'Final';
      if (Number(round) === totalRounds - 1) return 'Semifinals';
      if (Number(round) === totalRounds - 2 && totalRounds >= 3) return 'Quarterfinals';
      return `Round ${round}`;
    };

    // Group matches by round
    const grouped = {};
    matches.forEach(m => {
      if (!grouped[m.round]) grouped[m.round] = [];
      grouped[m.round].push(m);
    });

    let matchesHtml = '';

    if (isTrackHeats) {
      Object.entries(grouped)
        .sort(([a], [b]) => Number(a) - Number(b))
        .forEach(([round, roundMatches]) => {
          const roundLabel = roundMatches.length === 1 && roundMatches[0].heatName?.includes('Final')
            ? roundMatches[0].heatName
            : roundMatches.length === 1 && roundMatches[0].heatName?.includes('Semifinal')
              ? 'Semifinals'
              : `Round ${round}`;

          if (Number(round) > 1) {
            matchesHtml += `<h2 style="margin-top:24px;font-size:18px;border-bottom:2px solid #333;padding-bottom:4px;">🏅 ${roundLabel}</h2>`;
          }

          roundMatches
            .slice()
            .sort((a, b) => a.matchNumber - b.matchNumber)
            .forEach(match => {
              matchesHtml += `
                <div style="page-break-inside:avoid;border:1px solid #ccc;border-radius:8px;padding:12px;margin-bottom:16px;">
                  <h3 style="margin:0 0 8px;font-size:15px;">${match.heatName || 'Heat ' + match.matchNumber}
                    <span style="float:right;font-size:11px;color:#888;">${match.scheduledTime ? new Date(match.scheduledTime).toLocaleString() : ''}</span>
                  </h3>
                  <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead>
                      <tr style="background:#f5f5f5;">
                        <th style="border:1px solid #ddd;padding:6px;text-align:left;width:50px;">Lane</th>
                        <th style="border:1px solid #ddd;padding:6px;text-align:left;">Athlete</th>
                        <th style="border:1px solid #ddd;padding:6px;text-align:left;">Department</th>
                        <th style="border:1px solid #ddd;padding:6px;text-align:center;width:80px;">Position</th>
                        <th style="border:1px solid #ddd;padding:6px;text-align:center;width:80px;">Time</th>
                        <th style="border:1px solid #ddd;padding:6px;text-align:center;width:80px;">Qualified</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${(match.lanes || []).slice().sort((a, b) => a.lane - b.lane).map(lane => `
                        <tr>
                          <td style="border:1px solid #ddd;padding:6px;text-align:center;font-weight:bold;">${lane.lane}</td>
                          <td style="border:1px solid #ddd;padding:6px;">${lane.label || 'Unassigned'}</td>
                          <td style="border:1px solid #ddd;padding:6px;">${lane.department || '-'}</td>
                          <td style="border:1px solid #ddd;padding:6px;text-align:center;">${lane.finishPosition || '______'}</td>
                          <td style="border:1px solid #ddd;padding:6px;text-align:center;">${lane.finishTime || '______'}</td>
                          <td style="border:1px solid #ddd;padding:6px;text-align:center;">☐</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>`;
            });
        });
    } else {
      // Bracket format (single elimination / round robin)
      Object.entries(grouped)
        .sort(([a], [b]) => Number(a) - Number(b))
        .forEach(([round, roundMatches]) => {
          matchesHtml += `<h2 style="margin-top:24px;font-size:18px;border-bottom:2px solid #333;padding-bottom:4px;">${getRoundLabel(round)}</h2>`;
          matchesHtml += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">`;

          roundMatches.forEach(match => {
            const p1Style = match.winner === match.participant1 ? 'background:#d4edda;border:1px solid #28a745;' : 'background:#f8f9fa;';
            const p2Style = match.winner === match.participant2 ? 'background:#d4edda;border:1px solid #28a745;' : 'background:#f8f9fa;';

            matchesHtml += `
              <div style="page-break-inside:avoid;border:1px solid #ccc;border-radius:8px;padding:12px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                  <span style="font-size:11px;color:#999;">Match #${match.matchNumber}</span>
                  <span style="font-size:11px;color:#999;">${match.scheduledTime ? new Date(match.scheduledTime).toLocaleString() : ''}</span>
                </div>
                <div style="${p1Style}padding:8px 12px;border-radius:6px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-weight:500;font-size:13px;">${match.participant1 || 'TBD'}</span>
                  <span style="font-weight:bold;min-width:40px;text-align:center;border-bottom:1px dashed #999;">${match.score1 ?? ''}</span>
                </div>
                <div style="text-align:center;font-size:11px;color:#999;font-weight:bold;">VS</div>
                <div style="${p2Style}padding:8px 12px;border-radius:6px;margin-top:4px;display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-weight:500;font-size:13px;">${match.participant2 || 'TBD'}</span>
                  <span style="font-weight:bold;min-width:40px;text-align:center;border-bottom:1px dashed #999;">${match.score2 ?? ''}</span>
                </div>
                <div style="margin-top:8px;font-size:11px;color:#666;">Winner: ___________________________</div>
              </div>`;
          });

          matchesHtml += `</div>`;
        });
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${selectedEvent.title} - Tournament - Print</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #333; }
          @media print {
            body { padding: 12px; }
            button { display: none !important; }
          }
          .header { text-align: center; margin-bottom: 24px; border-bottom: 3px solid #333; padding-bottom: 16px; }
          .header h1 { margin: 0 0 4px; font-size: 22px; }
          .header .meta { font-size: 13px; color: #666; }
          .actions { text-align: center; margin-bottom: 20px; }
          .actions button { padding: 10px 24px; font-size: 14px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; margin: 0 6px; }
          .actions button:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="actions">
          <button onclick="window.print()">🖨️ Print</button>
          <button onclick="window.close()">✕ Close</button>
        </div>
        <div class="header">
          <h1>${selectedEvent.title} — Tournament</h1>
          <div class="meta">
            Format: <strong>${formatLabel(tournament.format)}</strong>
            &nbsp;·&nbsp;
            ${tournament.participantCount || 0} participants
            &nbsp;·&nbsp;
            ${matches.length} ${isTrackHeats ? 'heats' : 'matches'}
            &nbsp;·&nbsp;
            Date: ${selectedEvent.date ? new Date(selectedEvent.date).toLocaleDateString('en-IN', { dateStyle: 'long' }) : 'TBD'}
          </div>
        </div>
        ${matchesHtml}
        <div style="margin-top:32px;border-top:2px solid #333;padding-top:12px;font-size:11px;color:#999;text-align:center;">
          Printed on ${new Date().toLocaleString()} | ${selectedEvent.title} Tournament
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    } else {
      toast.error('Please allow pop-ups to print');
    }
  }, [tournament, selectedEvent, matches]);

  const availableFormats = selectedEvent?.type === 'single'
    ? ['track_heats', 'single_elimination', 'round_robin']
    : ['single_elimination', 'round_robin'];

  const statusBadge = (status) => {
    const map = {
      pending: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700'
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
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
              onChange={(event) => handleEventChange(event.target.value)}
            >
              <option value="">Choose an event</option>
              {events.map((event) => {
                let genderLabel = '';
                if (event.allowedGenders && event.allowedGenders.length === 1) {
                  genderLabel = event.allowedGenders[0] === 'female' ? ' [Females Only]' : ' [Males Only]';
                }
                return (
                  <option key={event._id} value={event._id}>
                    {event.title} ({event.type}){genderLabel}
                  </option>
                );
              })}
            </select>
          </div>

          {!tournament && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <div className="space-y-2">
                  {availableFormats.map((entry) => (
                    <label key={entry} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="format"
                        value={entry}
                        checked={format === entry}
                        onChange={(event) => setFormat(event.target.value)}
                        className="accent-blue-600"
                      />
                      <span className="text-sm">
                        {formatLabel(entry)}
                        {entry === 'track_heats' && selectedEvent && ` (${selectedEvent.lanesPerHeat || 8} lanes per heat)`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Participant Filter</label>
                <select
                  className="input-field w-full"
                  value={genderFilter}
                  onChange={(event) => setGenderFilter(event.target.value)}
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
                  {generating ? 'Generating...' : format === 'track_heats' ? 'Generate Heats' : 'Generate Bracket'}
                </button>
              </div>
            </>
          )}

          {tournament && (
            <div className="md:col-span-2 flex items-end gap-3">
              <div className="flex-1">
                <div className="text-sm text-gray-500">
                  Format: <strong className="text-gray-800">{formatLabel(tournament.format)}</strong>
                  <span className="mx-2">·</span>
                  Status: {statusBadge(tournament.status)}
                  <span className="mx-2">·</span>
                  {tournament.participantCount || 0} participants
                </div>
              </div>
              <button
                onClick={handlePrintTournament}
                className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-2"
              >
                <Printer size={16} />
                Print / PDF
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200 transition-colors"
              >
                Delete Tournament
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedEventId && !tournament && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
          <strong>Format note:</strong>{' '}
          {format === 'track_heats'
            ? `Track heats will place up to ${selectedEvent?.lanesPerHeat || 8} athletes per heat and spread departments across heats as evenly as possible.`
            : 'The bracket will include only registrations that match the event gender restrictions and the selected gender filter.'}
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
          <p className="text-sm mt-1">
            Select a format and click "{format === 'track_heats' ? 'Generate Heats' : 'Generate Bracket'}" to create one.
          </p>
        </div>
      )}

      {!loading && tournament && tournament.format === 'track_heats' && matches.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard label="Heats" value={matches.length} />
            <SummaryCard label="Lane Capacity" value={`${selectedEvent?.lanesPerHeat || 8} athletes`} />
            <SummaryCard
              label="Qualified"
              value={matches.reduce((sum, match) => sum + (match.lanes || []).filter((lane) => lane.isQualified).length, 0)}
            />
          </div>

          {/* Qualification section */}
          {matches.some(m => m.status === 'completed') && !matches.some(m => m.round > 1) && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800/50 rounded-xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-green-900 dark:text-green-300 mb-2">🏃 Ready to Generate Qualifications</h3>
                  <p className="text-sm text-green-700 dark:text-green-400 mb-3">
                    Based on completed heats, advance top performers to semifinals/finals:
                  </p>
                  <ul className="text-xs text-green-600 dark:text-green-400 space-y-1">
                    <li>• <strong>By Time:</strong> Top 3 fastest across all heats</li>
                    <li>• <strong>By Position:</strong> Top 3 from each completed heat</li>
                  </ul>
                </div>
                <button
                  onClick={handleGenerateQualifications}
                  disabled={generatingQualifications}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
                >
                  {generatingQualifications ? 'Generating...' : 'Generate Qualifications'}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {(() => {
              // Group heats by round
              const groupedByRound = {};
              matches.forEach(m => {
                if (!groupedByRound[m.round]) groupedByRound[m.round] = [];
                groupedByRound[m.round].push(m);
              });
              
              return Object.entries(groupedByRound)
                .sort(([roundA], [roundB]) => Number(roundA) - Number(roundB))
                .map(([round, roundMatches]) => {
                  const roundLabel = roundMatches.length === 1 && roundMatches[0].heatName?.includes('Final') 
                    ? roundMatches[0].heatName
                    : roundMatches.length === 1 && roundMatches[0].heatName?.includes('Semifinal')
                    ? 'Semifinals'
                    : `Round ${round}`;
                  
                  return (
                    <div key={round}>
                      {Number(round) > 1 && (
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          🏅 {roundLabel}
                          <span className="text-sm font-normal text-gray-500">({roundMatches.length} heat{roundMatches.length !== 1 ? 's' : ''})</span>
                        </h3>
                      )}
                      <div className="space-y-4">
                        {roundMatches
                          .slice()
                          .sort((a, b) => a.matchNumber - b.matchNumber)
                          .map((match) => (
                            <div
                              key={match._id}
                              className={`bg-white dark:bg-dark-card rounded-2xl border p-5 ${
                                match.status === 'completed' ? 'border-green-200 dark:border-green-900/50 bg-green-50/30 dark:bg-green-900/10' : 'border-gray-200 dark:border-dark-border'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{match.heatName || `Heat ${match.matchNumber}`}</h2>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{(match.lanes || []).length} athletes assigned</p>
                                </div>
                                {statusBadge(match.status)}
                              </div>

                              <div className="space-y-3">
                                {(match.lanes || [])
                                  .slice()
                                  .sort((a, b) => a.lane - b.lane)
                                  .map((lane) => (
                                    <div key={`${match._id}-${lane.lane}`} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
                                      <div className="flex items-start justify-between gap-3 mb-3">
                                        <div>
                                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                            Lane {lane.lane}: {lane.label}
                                          </div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400">{lane.department || 'Unassigned'}</div>
                                        </div>
                                        {lane.isQualified && (
                                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                                            ✓ Qualified
                                          </span>
                                        )}
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Position</label>
                                          <input
                                            type="number"
                                            min="1"
                                            className="input-field text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            value={laneInputs[match._id]?.[lane.lane]?.finishPosition ?? ''}
                                            onChange={(event) => handleLaneChange(match._id, lane.lane, 'finishPosition', event.target.value)}
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Time</label>
                                          <input
                                            type="text"
                                            className="input-field text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            placeholder="11.28s"
                                            value={laneInputs[match._id]?.[lane.lane]?.finishTime ?? ''}
                                            onChange={(event) => handleLaneChange(match._id, lane.lane, 'finishTime', event.target.value)}
                                          />
                                        </div>
                                        <div className="flex items-end">
                                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer h-10">
                                            <input
                                              type="checkbox"
                                              checked={Boolean(laneInputs[match._id]?.[lane.lane]?.isQualified)}
                                              onChange={(event) => handleLaneChange(match._id, lane.lane, 'isQualified', event.target.checked)}
                                              className="accent-emerald-600"
                                            />
                                            Mark Qualified
                                          </label>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>

                              <div className="space-y-2 mt-4">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Scheduled Time</label>
                                <div className="flex gap-2">
                                  <input
                                    type="datetime-local"
                                    className="input-field text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    value={scheduleInputs[match._id] || ''}
                                    onChange={(event) => setScheduleInputs((previous) => ({ ...previous, [match._id]: event.target.value }))}
                                  />
                                  <button
                                    onClick={() => handleSaveSchedule(match._id)}
                                    disabled={savingSchedule === match._id}
                                    className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 dark:text-gray-300"
                                  >
                                    {savingSchedule === match._id ? 'Saving...' : 'Save'}
                                  </button>
                                </div>
                              </div>

                              <button
                                onClick={() => handleSaveHeat(match._id)}
                                disabled={savingMatch === match._id}
                                className="w-full mt-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
                              >
                                {savingMatch === match._id ? 'Saving...' : 'Save Heat Results'}
                              </button>

                              {match.scheduledTime && (
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
                                  Scheduled: {new Date(match.scheduledTime).toLocaleString()}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })
            })()
            }
          </div>
        </div>
      )}

      {!loading && tournament && tournament.format !== 'track_heats' && matches.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedByRound)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([round, roundMatches]) => {
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
                      <div
                        key={match._id}
                        className={`bg-white rounded-xl border p-4 ${
                          match.status === 'completed' ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
                        }`}
                      >
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
                              onChange={(event) => setScores((previous) => ({ ...previous, [`${match._id}_1`]: event.target.value }))}
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
                              onChange={(event) => setScores((previous) => ({ ...previous, [`${match._id}_2`]: event.target.value }))}
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
                              onChange={(event) => setScheduleInputs((previous) => ({ ...previous, [match._id]: event.target.value }))}
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

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
