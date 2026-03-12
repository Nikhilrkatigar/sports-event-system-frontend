import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import Navbar from '../../components/public/Navbar';
import API from '../../utils/api';

const DEFAULT_DEPARTMENTS = ['BCA', 'MCA', 'BBA', 'MBA', 'B.Com', 'B.Sc', 'B.Tech', 'M.Tech', 'BA', 'MA', 'B.Ed', 'Other'];
const MAX_QR_TEXT_LENGTH = 1000;

const emptyPlayer = () => ({ name: '', uucms: '', phone: '', department: '', gender: '', isSubstitute: false, isTeamLeader: false });
const isImageDataUrl = (value) => typeof value === 'string' && value.startsWith('data:image/');
const getSafeFileName = (value) => (value || 'qr-code').replace(/[^a-z0-9-_]/gi, '_').toLowerCase();

const getRegistrationQrSource = (registration) => {
  if (typeof registration?.qrCode === 'string' && registration.qrCode) return registration.qrCode;
  if (typeof registration?.players?.[0]?.qrCode === 'string' && registration.players[0].qrCode) return registration.players[0].qrCode;
  const firstPlayer = registration?.players?.[0];
  return JSON.stringify({
    type: registration?.teamId ? 'team' : 'single',
    teamId: registration?.teamId || '',
    uucms: firstPlayer?.uucms || '',
    name: firstPlayer?.name || ''
  });
};

const getSafeRegistrationQrValue = (registration) => {
  const source = getRegistrationQrSource(registration);
  if (typeof source === 'string' && !isImageDataUrl(source) && source.length <= MAX_QR_TEXT_LENGTH) return source;
  const leader = registration?.players?.find(p => p.isTeamLeader);
  return JSON.stringify({
    type: registration?.teamId ? 'team' : 'single',
    teamId: registration?.teamId || '',
    leaderUucms: leader?.uucms || '',
    uucms: registration?.players?.[0]?.uucms || ''
  });
};

export default function RegisterPage() {
  const { eventId } = useParams();
  const [events, setEvents] = useState([]);
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [players, setPlayers] = useState([emptyPlayer()]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    Promise.all([API.get('/events'), API.get('/settings')])
      .then(([eventsRes, settingsRes]) => {
        setEvents(eventsRes.data);
        const cmsDepartments = settingsRes.data?.departments;
        if (Array.isArray(cmsDepartments) && cmsDepartments.length) setDepartments(cmsDepartments);

        if (eventId) {
          const ev = eventsRes.data.find(e => e._id === eventId);
          if (ev) selectEvent(ev);
        }
      })
      .catch(() => {
        setDepartments(DEFAULT_DEPARTMENTS);
      });
  }, [eventId]);

  const selectEvent = (ev) => {
    setSelectedEvent(ev);
    if (ev.type === 'team') {
      const nextPlayers = Array.from({ length: ev.teamSize }, (_, i) => ({ ...emptyPlayer(), isTeamLeader: i === 0 }));
      setPlayers(nextPlayers);
    } else {
      setPlayers([{ ...emptyPlayer(), isTeamLeader: true }]);
    }
  };

  const updatePlayer = (idx, field, value) => {
    setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const setTeamLeader = (idx) => {
    setPlayers(prev => prev.map((p, i) => {
      if (p.isSubstitute) return { ...p, isTeamLeader: false };
      return { ...p, isTeamLeader: i === idx };
    }));
  };

  const addSubstitute = () => {
    setPlayers(prev => [...prev, { ...emptyPlayer(), isSubstitute: true, isTeamLeader: false }]);
  };

  const removePlayer = (idx) => {
    setPlayers(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (selectedEvent?.type === 'team') {
        const hasLeader = next.some(p => !p.isSubstitute && p.isTeamLeader);
        if (!hasLeader) {
          const firstMainIndex = next.findIndex(p => !p.isSubstitute);
          if (firstMainIndex !== -1) next[firstMainIndex] = { ...next[firstMainIndex], isTeamLeader: true };
        }
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedEvent) return toast.error('Please select an event');

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (!p.name || !p.uucms || !p.phone || !p.department || !p.gender) {
        return toast.error(`Please fill all fields for Player ${i + 1}`);
      }
    }

    if (selectedEvent.type === 'team') {
      const mainPlayers = players.filter(p => !p.isSubstitute);
      const leaderCount = mainPlayers.filter(p => p.isTeamLeader).length;
      if (leaderCount !== 1) return toast.error('Please choose exactly one team leader');
    }

    setLoading(true);
    try {
      const res = await API.post('/registrations', { eventId: selectedEvent._id, players });
      setSuccess(res.data);
      toast.success('Registered successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const triggerDownload = (url, fileName, revoke = false) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (revoke) setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const downloadRegistrationQr = () => {
    if (!success) return;
    const source = getRegistrationQrSource(success);
    const baseName = success.teamId ? `team_${getSafeFileName(success.teamId)}_qr` : `player_${getSafeFileName(success.players?.[0]?.uucms)}_qr`;

    if (isImageDataUrl(source)) {
      const extMatch = /^data:image\/([a-zA-Z0-9+.-]+);/.exec(source);
      const ext = extMatch?.[1]?.toLowerCase() === 'jpeg' ? 'jpg' : (extMatch?.[1] || 'png');
      triggerDownload(source, `${baseName}.${ext}`);
      return;
    }

    const qrContainer = document.getElementById('registration-qr');
    const svg = qrContainer?.querySelector('svg');
    if (!svg) {
      toast.error('QR not ready to download');
      return;
    }
    const serializer = new XMLSerializer();
    let svgData = serializer.serializeToString(svg);
    if (!svgData.includes('xmlns="http://www.w3.org/2000/svg"')) {
      svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${baseName}.svg`, true);
  };

  const mainPlayers = useMemo(
    () => players.filter(p => !p.isSubstitute),
    [players]
  );

  if (success) {
    const source = getRegistrationQrSource(success);
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful</h2>
            {success.teamId && <p className="text-blue-700 font-semibold mb-4">Team ID: {success.teamId}</p>}

            <div className="max-w-xs mx-auto border border-gray-200 rounded-xl p-4 mb-8">
              <p className="text-sm font-semibold text-gray-700 mb-3">{success.teamId ? 'Team QR Code' : 'Participant QR Code'}</p>
              <div id="registration-qr" className="flex justify-center bg-white p-3 rounded-lg border border-gray-200">
                {isImageDataUrl(source) ? (
                  <img src={source} alt="Registration QR code" className="h-[220px] w-[220px]" />
                ) : (
                  <QRCode value={getSafeRegistrationQrValue(success)} size={220} />
                )}
              </div>
              <button
                type="button"
                onClick={downloadRegistrationQr}
                className="mt-4 w-full border border-blue-200 text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Download QR
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {success.players.map((player, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 text-left">
                  <p className="font-semibold text-gray-900 mb-1">
                    {player.name}
                    {player.isTeamLeader && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Leader</span>}
                    {player.isSubstitute && <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Substitute</span>}
                  </p>
                  <p className="text-sm text-gray-500">{player.uucms}</p>
                  <p className="text-sm text-gray-500">{player.department}</p>
                  <p className="text-sm text-gray-500">Gender: {player.gender ? player.gender.charAt(0).toUpperCase() + player.gender.slice(1) : 'Unspecified'}</p>
                </div>
              ))}
            </div>

            <button onClick={() => { setSuccess(null); setPlayers([emptyPlayer()]); setSelectedEvent(null); }} className="btn-primary mt-8 px-8">
              Register Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  const openEvents = events.filter(ev => ev.registrationOpen !== false);
  const isEventClosed = selectedEvent && selectedEvent.registrationOpen === false;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Event Registration</h1>
        <p className="text-gray-500 mb-6 text-sm sm:text-base">Fill in player details to register</p>

        <div className="card mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Step 1: Select Event</h2>
          <select
            className="input-field w-full text-base"
            value={selectedEvent?._id || ''}
            onChange={e => {
              const ev = events.find(ev => ev._id === e.target.value);
              if (ev) selectEvent(ev);
            }}
          >
            <option value="">-- Choose an Event --</option>
            {openEvents.map(ev => (
              <option key={ev._id} value={ev._id}>
                {ev.title} ({ev.type === 'team' ? `Team - ${ev.teamSize} players` : 'Individual'})
              </option>
            ))}
          </select>
        </div>

        {isEventClosed && (
          <div className="card mb-6 text-center">
            <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl text-sm font-semibold">
              🚫 Registration is closed for this event
            </div>
          </div>
        )}

        {selectedEvent && !isEventClosed && (
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-4 text-sm sm:text-base">
              Step 2: Player Details — <span className="text-blue-600">{selectedEvent.title}</span>
            </h2>

            <div className="space-y-4">
              {players.map((player, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 ${player.isSubstitute ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      {player.isSubstitute
                        ? `Substitute ${idx - (selectedEvent.teamSize || 1) + 1}`
                        : `Player ${idx + 1}`}
                    </span>
                    <div className="flex items-center gap-3">
                      {selectedEvent.type === 'team' && !player.isSubstitute && (
                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="teamLeader"
                            checked={Boolean(player.isTeamLeader)}
                            onChange={() => setTeamLeader(idx)}
                            className="accent-blue-600"
                          />
                          Leader
                        </label>
                      )}
                      {selectedEvent.type === 'team' && player.isSubstitute && (
                        <button
                          onClick={() => removePlayer(idx)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inputs — stacked on mobile, 2-col on sm+ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Full Name *</label>
                      <input
                        className="input-field w-full text-base"
                        placeholder="Full name"
                        value={player.name}
                        onChange={e => updatePlayer(idx, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">UUCMS No. *</label>
                      <input
                        className="input-field w-full text-base"
                        placeholder="U02CG23S0001"
                        value={player.uucms}
                        onChange={e => updatePlayer(idx, 'uucms', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Phone *</label>
                      <input
                        className="input-field w-full text-base"
                        type="tel"
                        placeholder="Phone number"
                        value={player.phone}
                        onChange={e => updatePlayer(idx, 'phone', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Department *</label>
                      <select
                        className="input-field w-full text-base"
                        value={player.department}
                        onChange={e => updatePlayer(idx, 'department', e.target.value)}
                      >
                        <option value="">Select department</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Gender *</label>
                      <select
                        className="input-field w-full text-base"
                        value={player.gender}
                        onChange={e => updatePlayer(idx, 'gender', e.target.value)}
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedEvent.type === 'team' && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs text-gray-500">Main players: {mainPlayers.length} (choose exactly one leader)</p>
                <button
                  onClick={addSubstitute}
                  className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-4 py-2 rounded-lg transition-colors"
                >
                  + Add Substitute
                </button>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary mt-6 w-full py-3 text-base font-semibold rounded-xl"
            >
              {loading ? 'Registering...' : 'Submit Registration'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
