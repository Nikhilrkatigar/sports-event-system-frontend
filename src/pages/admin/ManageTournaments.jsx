import { useEffect, useState } from 'react';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { useConfirm } from '../../hooks/useConfirm';

export default function ManageTournaments() {
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [format, setFormat] = useState('single_elimination');
    const [tournament, setTournament] = useState(null);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [scores, setScores] = useState({});
    const [savingMatch, setSavingMatch] = useState(null);
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
            // Pre-fill existing scores
            const existing = {};
            r.data.matches.forEach(m => {
                if (m.score1 != null) existing[`${m._id}_1`] = m.score1;
                if (m.score2 != null) existing[`${m._id}_2`] = m.score2;
            });
            setScores(existing);
        } catch {
            setTournament(null);
            setMatches([]);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedEventId) return toast.error('Select an event first');
        setGenerating(true);
        try {
            const r = await API.post('/tournaments/generate', { eventId: selectedEventId, format });
            setTournament(r.data.tournament);
            setMatches(r.data.matches);
            toast.success('Bracket generated!');
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
        setSavingMatch(matchId);
        try {
            const r = await API.put(`/tournaments/match/${matchId}`, { score1: Number(s1), score2: Number(s2) });
            setMatches(r.data.allMatches);
            // Refresh tournament status
            await loadTournament(selectedEventId);
            toast.success('Score saved!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save score');
        } finally {
            setSavingMatch(null);
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
        try {
            await API.delete(`/tournaments/${tournament._id}`);
            setTournament(null);
            setMatches([]);
            setScores({});
            toast.success('Tournament deleted');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete');
        }
    };

    const groupedByRound = matches.reduce((acc, m) => {
        if (!acc[m.round]) acc[m.round] = [];
        acc[m.round].push(m);
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
            <h1 className="text-2xl font-bold text-gray-900 mb-6">🏆 Manage Tournaments</h1>

            {/* Controls */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Event</label>
                        <select
                            className="input-field w-full"
                            value={selectedEventId}
                            onChange={e => setSelectedEventId(e.target.value)}
                        >
                            <option value="">— Choose an event —</option>
                            {events.map(ev => (
                                <option key={ev._id} value={ev._id}>{ev.title} ({ev.type})</option>
                            ))}
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
                                <button
                                    onClick={handleGenerate}
                                    disabled={!selectedEventId || generating}
                                    className="btn-primary w-full py-2.5 disabled:opacity-50"
                                >
                                    {generating ? 'Generating...' : '⚡ Generate Bracket'}
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
                                    {tournament.participants.filter(p => p !== 'BYE').length} participants
                                </div>
                            </div>
                            <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200 transition-colors">
                                🗑 Delete Tournament
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="text-center py-12 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    Loading tournament...
                </div>
            )}

            {/* No tournament message */}
            {!loading && selectedEventId && !tournament && (
                <div className="text-center py-16 text-gray-400">
                    <div className="text-5xl mb-4">🏟️</div>
                    <p className="text-lg">No tournament exists for this event yet.</p>
                    <p className="text-sm mt-1">Select a format and click "Generate Bracket" to create one.</p>
                </div>
            )}

            {/* Matches by Round */}
            {!loading && tournament && matches.length > 0 && (
                <div className="space-y-6">
                    {Object.entries(groupedByRound).sort(([a], [b]) => a - b).map(([round, roundMatches]) => {
                        const totalRounds = Math.max(...Object.keys(groupedByRound).map(Number));
                        const roundLabel = tournament.format === 'round_robin'
                            ? 'All Matches'
                            : Number(round) === totalRounds
                                ? '🏆 Final'
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

                                            {/* Participant 1 */}
                                            <div className={`flex items-center justify-between py-2 px-3 rounded-lg mb-1 ${match.winner === match.participant1 ? 'bg-green-100 border border-green-300' : 'bg-gray-50'}`}>
                                                <span className={`font-medium text-sm ${match.participant1 === 'BYE' ? 'text-gray-400 italic' : match.winner === match.participant1 ? 'text-green-800' : 'text-gray-800'}`}>
                                                    {match.participant1 || 'TBD'}
                                                    {match.winner === match.participant1 && ' 🏆'}
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

                                            {/* VS label */}
                                            <div className="text-center text-xs text-gray-400 font-bold my-0.5">VS</div>

                                            {/* Participant 2 */}
                                            <div className={`flex items-center justify-between py-2 px-3 rounded-lg mb-3 ${match.winner === match.participant2 ? 'bg-green-100 border border-green-300' : 'bg-gray-50'}`}>
                                                <span className={`font-medium text-sm ${match.participant2 === 'BYE' ? 'text-gray-400 italic' : match.winner === match.participant2 ? 'text-green-800' : 'text-gray-800'}`}>
                                                    {match.participant2 || 'TBD'}
                                                    {match.winner === match.participant2 && ' 🏆'}
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

                                            {/* Save button */}
                                            {match.status !== 'completed' && match.participant1 && match.participant2 && match.participant1 !== 'BYE' && match.participant2 !== 'BYE' && (
                                                <button
                                                    onClick={() => handleSaveScore(match._id)}
                                                    disabled={savingMatch === match._id}
                                                    className="w-full py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {savingMatch === match._id ? 'Saving...' : '💾 Save Score'}
                                                </button>
                                            )}

                                            {/* Scheduled time */}
                                            {match.scheduledTime && (
                                                <div className="text-xs text-gray-400 mt-2 text-center">
                                                    📅 {new Date(match.scheduledTime).toLocaleString()}
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
