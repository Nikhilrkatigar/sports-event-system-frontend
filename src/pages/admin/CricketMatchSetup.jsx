import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'batsman', label: '🏏 Batsman' },
  { value: 'bowler', label: '🎯 Bowler' },
  { value: 'all_rounder', label: '⭐ All-rounder' },
  { value: 'wicket_keeper', label: '🧤 Wicket-keeper' }
];

const emptyPlayer = () => ({
  name: '', uucms: '', department: '', role: 'batsman',
  isCaptain: false, isViceCaptain: false, isPlaying: true
});

export default function CricketMatchSetup() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [registeredTeams, setRegisteredTeams] = useState([]);
  const [oversPerSide, setOversPerSide] = useState(20);
  const [venue, setVenue] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Team setup
  const [teamA, setTeamA] = useState({ name: '', applicationId: '', players: Array.from({ length: 11 }, emptyPlayer) });
  const [teamB, setTeamB] = useState({ name: '', applicationId: '', players: Array.from({ length: 11 }, emptyPlayer) });

  useEffect(() => {
    API.get('/events').then(res => {
      const teamEvents = (res.data || []).filter(e => e.type === 'team');
      setEvents(teamEvents);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    API.get(`/registrations?eventId=${selectedEvent}`).then(res => {
      setRegisteredTeams(res.data || []);
    }).catch(() => {});
  }, [selectedEvent]);

  const fillFromRegistration = (teamSetter, registration) => {
    teamSetter(prev => ({
      ...prev,
      name: registration.teamName || 'Unknown Team',
      applicationId: registration._id,
      players: (registration.players || []).map(p => ({
        name: p.name || '',
        uucms: p.uucms || '',
        department: p.department || '',
        role: p.role || 'batsman',
        isCaptain: p.isTeamLeader || false,
        isViceCaptain: false,
        isPlaying: !p.isSubstitute
      }))
    }));
  };

  const updatePlayer = (teamSetter, index, field, value) => {
    teamSetter(prev => {
      const updated = [...prev.players];
      updated[index] = { ...updated[index], [field]: value };
      // Ensure only one captain and one vice-captain
      if (field === 'isCaptain' && value) {
        updated.forEach((p, i) => { if (i !== index) p.isCaptain = false; });
      }
      if (field === 'isViceCaptain' && value) {
        updated.forEach((p, i) => { if (i !== index) p.isViceCaptain = false; });
      }
      return { ...prev, players: updated };
    });
  };

  const addPlayer = (teamSetter) => {
    teamSetter(prev => ({ ...prev, players: [...prev.players, emptyPlayer()] }));
  };

  const removePlayer = (teamSetter, index) => {
    teamSetter(prev => ({
      ...prev,
      players: prev.players.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!selectedEvent) return toast.error('Select an event');
    if (!teamA.name || !teamB.name) return toast.error('Both team names are required');
    const teamAPlayers = teamA.players.filter(p => p.name.trim());
    const teamBPlayers = teamB.players.filter(p => p.name.trim());
    if (teamAPlayers.length < 2) return toast.error('Team A needs at least 2 players');
    if (teamBPlayers.length < 2) return toast.error('Team B needs at least 2 players');

    setSubmitting(true);
    try {
      const res = await API.post('/cricket/matches', {
        eventId: selectedEvent,
        teamA: { ...teamA, players: teamAPlayers },
        teamB: { ...teamB, players: teamBPlayers },
        oversPerSide,
        venue,
        matchDate: matchDate || new Date().toISOString()
      });
      toast.success('Cricket match created!');
      navigate(`/admin/cricket/${res.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create match');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPlayerRow = (player, index, teamSetter) => (
    <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-2 animate-fade-in">
      <div className="col-span-12 sm:col-span-1 text-center font-bold text-gray-400 text-sm">#{index + 1}</div>
      <div className="col-span-12 sm:col-span-3">
        <input
          type="text" placeholder="Player name" value={player.name}
          onChange={e => updatePlayer(teamSetter, index, 'name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div className="col-span-6 sm:col-span-2">
        <input
          type="text" placeholder="UUCMS" value={player.uucms}
          onChange={e => updatePlayer(teamSetter, index, 'uucms', e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div className="col-span-6 sm:col-span-2">
        <input
          type="text" placeholder="Dept" value={player.department}
          onChange={e => updatePlayer(teamSetter, index, 'department', e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div className="col-span-6 sm:col-span-2">
        <select
          value={player.role}
          onChange={e => updatePlayer(teamSetter, index, 'role', e.target.value)}
          className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div className="col-span-4 sm:col-span-1 flex gap-1 justify-center">
        <button
          title="Captain"
          onClick={() => updatePlayer(teamSetter, index, 'isCaptain', !player.isCaptain)}
          className={`px-2 py-1 rounded text-xs font-bold transition-colors ${player.isCaptain ? 'bg-yellow-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
        >C</button>
        <button
          title="Vice Captain"
          onClick={() => updatePlayer(teamSetter, index, 'isViceCaptain', !player.isViceCaptain)}
          className={`px-2 py-1 rounded text-xs font-bold transition-colors ${player.isViceCaptain ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
        >VC</button>
      </div>
      <div className="col-span-2 sm:col-span-1 flex justify-center">
        <button
          onClick={() => removePlayer(teamSetter, index)}
          className="text-red-400 hover:text-red-600 text-lg transition-colors"
          title="Remove player"
        >✕</button>
      </div>
    </div>
  );

  const renderTeamSection = (label, team, teamSetter, colorClass) => (
    <div className="mb-8">
      <div className={`flex items-center gap-3 mb-4 pb-3 border-b-2 ${colorClass}`}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{label}</h3>
        <input
          type="text" placeholder="Team name" value={team.name}
          onChange={e => teamSetter(prev => ({ ...prev, name: e.target.value }))}
          className="flex-1 max-w-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card text-sm dark:text-white font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
        />
        {registeredTeams.length > 0 && (
          <select
            onChange={e => {
              const reg = registeredTeams.find(r => r._id === e.target.value);
              if (reg) fillFromRegistration(teamSetter, reg);
            }}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card text-xs dark:text-white"
            defaultValue=""
          >
            <option value="" disabled>Fill from registration...</option>
            {registeredTeams.map(r => <option key={r._id} value={r._id}>{r.teamName || r.registrationNumber}</option>)}
          </select>
        )}
      </div>

      {/* Header row */}
      <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-3">
        <div className="col-span-1 text-center">#</div>
        <div className="col-span-3">Name</div>
        <div className="col-span-2">UUCMS</div>
        <div className="col-span-2">Dept</div>
        <div className="col-span-2">Role</div>
        <div className="col-span-1 text-center">C/VC</div>
        <div className="col-span-1 text-center">Del</div>
      </div>

      {team.players.map((player, i) => renderPlayerRow(player, i, teamSetter))}

      <button
        onClick={() => addPlayer(teamSetter)}
        className="mt-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >+ Add Player</button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🏏 New Cricket Match</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Set up teams, squads, and match details</p>
        </div>
        <button onClick={() => navigate('/admin/cricket')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← All Cricket Matches
        </button>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <button key={s} onClick={() => setStep(s)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            step === s ? 'bg-blue-600 text-white shadow-lg' : step > s ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
          }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === s ? 'bg-white/20' : step > s ? 'bg-green-500 text-white' : 'bg-gray-300 dark:bg-gray-700'
            }`}>{step > s ? '✓' : s}</span>
            {s === 1 ? 'Match Details' : s === 2 ? 'Team A Squad' : 'Team B Squad'}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-gray-100 dark:border-dark-border p-6">
        {/* Step 1: Match Details */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event *</label>
                <select
                  value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select an event...</option>
                  {events.map(e => <option key={e._id} value={e._id}>{e.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Overs per Side</label>
                <input 
                  type="number" 
                  value={oversPerSide} 
                  onChange={e => setOversPerSide(Math.max(1, Number(e.target.value)))}
                  min="1"
                  max="100"
                  placeholder="Enter number of overs"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Venue</label>
                <input
                  type="text" value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g. College Cricket Ground"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Match Date</label>
                <input
                  type="datetime-local" value={matchDate} onChange={e => setMatchDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setStep(2)} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg">
                Next: Team A Squad →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Team A */}
        {step === 2 && (
          <div className="animate-fade-in">
            {renderTeamSection('Team A', teamA, setTeamA, 'border-blue-500')}
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                ← Back
              </button>
              <button onClick={() => setStep(3)} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg">
                Next: Team B Squad →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Team B */}
        {step === 3 && (
          <div className="animate-fade-in">
            {renderTeamSection('Team B', teamB, setTeamB, 'border-red-500')}
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                ← Back
              </button>
              <button
                onClick={handleSubmit} disabled={submitting}
                className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg disabled:opacity-50"
              >
                {submitting ? 'Creating...' : '🏏 Create Match'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
