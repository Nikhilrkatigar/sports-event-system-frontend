import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import Navbar from '../../components/public/Navbar';
import API from '../../utils/api';
import { FormSkeleton } from '../../components/Skeletons';
import {
  canRegisterForEvent,
  formatEventDeadline,
  getEventStatusMeta,
  PUBLIC_EVENT_STATUSES
} from '../../utils/events';

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
  const [teamName, setTeamName] = useState('');
  const [players, setPlayers] = useState([emptyPlayer()]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [success, setSuccess] = useState(null);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  useEffect(() => {
    Promise.all([API.get('/events'), API.get('/settings')])
      .then(([eventsRes, settingsRes]) => {
        const visibleEvents = (eventsRes.data || []).filter((event) => PUBLIC_EVENT_STATUSES.includes(event.status));
        setEvents(visibleEvents);
        const cmsDepartments = settingsRes.data?.departments;
        if (Array.isArray(cmsDepartments) && cmsDepartments.length) setDepartments(cmsDepartments);

        if (eventId) {
          const event = visibleEvents.find((item) => item._id === eventId);
          if (event) selectEvent(event);
        }
      })
      .catch(() => {
        setDepartments(DEFAULT_DEPARTMENTS);
      })
      .finally(() => setPageLoading(false));
  }, [eventId]);

  const selectEvent = (event) => {
    setSelectedEvent(event);
    setTeamName('');
    if (event.type === 'team') {
      const nextPlayers = Array.from({ length: event.teamSize }, (_, index) => ({ ...emptyPlayer(), isTeamLeader: index === 0 }));
      setPlayers(nextPlayers);
    } else {
      setPlayers([{ ...emptyPlayer(), isTeamLeader: true }]);
    }
  };

  const updatePlayer = (idx, field, value) => {
    setPlayers(prev => prev.map((player, index) => index === idx ? { ...player, [field]: value } : player));
  };

  const setTeamLeader = (idx) => {
    setPlayers(prev => prev.map((player, index) => {
      if (player.isSubstitute) return { ...player, isTeamLeader: false };
      return { ...player, isTeamLeader: index === idx };
    }));
  };

  const addSubstitute = () => {
    setPlayers(prev => [...prev, { ...emptyPlayer(), isSubstitute: true, isTeamLeader: false }]);
  };

  const removePlayer = (idx) => {
    setPlayers(prev => {
      const next = prev.filter((_, index) => index !== idx);
      if (selectedEvent?.type === 'team') {
        const hasLeader = next.some(player => !player.isSubstitute && player.isTeamLeader);
        if (!hasLeader) {
          const firstMainIndex = next.findIndex(player => !player.isSubstitute);
          if (firstMainIndex !== -1) next[firstMainIndex] = { ...next[firstMainIndex], isTeamLeader: true };
        }
      }
      return next;
    });
  };

  const genderComposition = useMemo(() => {
    const mainPlayers = players.filter(player => !player.isSubstitute);
    const maleCount = mainPlayers.filter(p => p.gender === 'male').length;
    const femaleCount = mainPlayers.filter(p => p.gender === 'female').length;
    return { maleCount, femaleCount };
  }, [players]);

  const availableDepartments = useMemo(() => {
    if (!selectedEvent || !Array.isArray(selectedEvent.allowedDepartments) || selectedEvent.allowedDepartments.length === 0) {
      return departments;
    }
    return departments.filter(dept => selectedEvent.allowedDepartments.includes(dept));
  }, [selectedEvent, departments]);

  const handleSubmit = async () => {
    if (!selectedEvent) return toast.error('Please select an event');
    if (!canRegisterForEvent(selectedEvent)) return toast.error('Registration is not open for this event');

    if (selectedEvent.type === 'team' && !teamName.trim()) {
      return toast.error('Please enter a team name');
    }

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (!player.name || !player.uucms || !player.phone || !player.department || !player.gender) {
        return toast.error(`Please fill all fields for Player ${i + 1}`);
      }
    }

    const mainPlayers = players.filter(player => !player.isSubstitute);
    if (selectedEvent.type === 'team') {
      if (mainPlayers.length !== Number(selectedEvent.teamSize || 1)) {
        return toast.error(`Exactly ${selectedEvent.teamSize} main players are required`);
      }
      const leaderCount = mainPlayers.filter(player => player.isTeamLeader).length;
      if (leaderCount !== 1) return toast.error('Please choose exactly one team leader');
    } else if (mainPlayers.length !== 1) {
      return toast.error('Single events accept only one participant');
    }

    setLoading(true);
    try {
      const res = await API.post('/registrations', {
        eventId: selectedEvent._id,
        players,
        teamName: selectedEvent.type === 'team' ? teamName : null
      });
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

  const uploadPaymentScreenshot = async () => {
    if (!success || !screenshotFile) {
      toast.error('Please select a screenshot file');
      return;
    }

    if (!screenshotFile.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploadingScreenshot(true);
    try {
      const fd = new FormData();
      fd.append('screenshot', screenshotFile);
      const res = await API.patch(`/registrations/${success._id}/upload-payment-screenshot`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess(res.data.data);
      setScreenshotFile(null);
      toast.success('Payment screenshot uploaded successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload screenshot');
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const mainPlayers = useMemo(
    () => players.filter(player => !player.isSubstitute),
    [players]
  );

  if (success) {
    const source = getRegistrationQrSource(success);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white dark:bg-dark-card rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-dark-border text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Registration Successful</h2>
            {success.teamId && <p className="text-blue-700 dark:text-blue-400 font-semibold mb-4">Team ID: {success.teamId}</p>}

            {success.paymentStatus === 'pending' && (
              <div className="mb-6 space-y-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-xl">
                  <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">⏳ Payment Pending</p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-4">Your registration is complete. Please complete the payment to finalize your participation.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {success.eventId?.paymentQRCode && (
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-yellow-900 dark:text-yellow-300 mb-2">📱 Scan QR Code</p>
                        <img src={success.eventId.paymentQRCode} alt="Payment QR Code" className="w-full h-32 object-contain" />
                      </div>
                    )}
                    {success.eventId?.upiPaymentLink && (
                      <div className="flex flex-col justify-center">
                        <a
                          href={success.eventId.upiPaymentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block w-full bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
                        >
                          💳 Pay ₹{success.eventId.registrationFee} via UPI
                        </a>
                      </div>
                    )}
                  </div>

                  {!success.eventId?.paymentQRCode && !success.eventId?.upiPaymentLink && (
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">Fee: ₹{success.eventId?.registrationFee || 'N/A'}</p>
                  )}
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">📸 Upload Payment Proof</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">Upload a screenshot of your payment confirmation</p>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="input-field w-full text-sm"
                      onChange={e => setScreenshotFile(e.target.files[0])}
                      disabled={uploadingScreenshot}
                    />
                    {screenshotFile && <p className="text-xs text-blue-600 dark:text-blue-400">✓ File selected: {screenshotFile.name}</p>}
                    {success.paymentScreenshot && !screenshotFile && <p className="text-xs text-green-600 dark:text-green-400">✓ Screenshot already uploaded</p>}
                    <button
                      onClick={uploadPaymentScreenshot}
                      disabled={uploadingScreenshot || !screenshotFile}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                      {uploadingScreenshot ? 'Uploading...' : 'Upload Screenshot'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {success.paymentStatus === 'paid' && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl">
                <p className="text-sm font-semibold text-green-900 dark:text-green-300">✓ Payment Verified</p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">Your payment has been verified successfully.</p>
              </div>
            )}

            {success.paymentStatus === 'free' && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">✓ No Payment Required</p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">This is a free event.</p>
              </div>
            )}

            <div className="max-w-xs mx-auto border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-8">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{success.teamId ? 'Team QR Code' : 'Participant QR Code'}</p>
              <div id="registration-qr" className="flex justify-center bg-white p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                {isImageDataUrl(source) ? (
                  <img src={source} alt="Registration QR code" className="h-[220px] w-[220px]" />
                ) : (
                  <QRCode value={getSafeRegistrationQrValue(success)} size={220} />
                )}
              </div>
              <button
                type="button"
                onClick={downloadRegistrationQr}
                className="mt-4 w-full border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Download QR
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {success.players.map((player, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left">
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">
                    {player.name}
                    {player.isTeamLeader && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Leader</span>}
                    {player.isSubstitute && <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full">Substitute</span>}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{player.uucms}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{player.department}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Gender: {player.gender ? player.gender.charAt(0).toUpperCase() + player.gender.slice(1) : 'Unspecified'}</p>
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

  const statusMeta = selectedEvent ? getEventStatusMeta(selectedEvent) : null;
  const isEventRegisterable = selectedEvent ? canRegisterForEvent(selectedEvent) : false;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">Event Registration</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm sm:text-base">Fill in player details to register</p>

        {pageLoading ? (
          <div className="space-y-6">
            <div className="card dark:bg-dark-card dark:border-dark-border">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Step 1: Select Event</h2>
              <FormSkeleton />
            </div>
          </div>
        ) : (
          <>
            <div className="card dark:bg-dark-card dark:border-dark-border mb-6">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Step 1: Select Event</h2>
              <select
                className="input-field w-full text-base"
                value={selectedEvent?._id || ''}
                onChange={e => {
                  const event = events.find(item => item._id === e.target.value);
                  if (event) selectEvent(event);
                }}
              >
                <option value="">-- Choose an Event --</option>
                {events.map(event => (
                  <option key={event._id} value={event._id}>
                    {event.title} ({getEventStatusMeta(event).label})
                  </option>
                ))}
              </select>
            </div>

            {selectedEvent && (
              <div className="card dark:bg-dark-card dark:border-dark-border mb-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">{selectedEvent.title}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedEvent.type === 'team' ? `${selectedEvent.teamSize} main players required` : 'Single participant event'}</p>
                  </div>
                  <span className={`text-xs border px-2 py-1 rounded-full ${statusMeta?.className}`}>
                    {statusMeta?.label}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <div>Remaining slots: <span className="dark:text-gray-300">{selectedEvent.remainingSlots == null ? 'Unlimited' : selectedEvent.remainingSlots}</span></div>
                  <div>Registered: <span className="dark:text-gray-300">{selectedEvent.type === 'team' ? `${selectedEvent.teamCount || 0} teams` : `${selectedEvent.playerCount || 0} players`}</span></div>
                  {selectedEvent.registrationDeadline && <div>Deadline: <span className="dark:text-gray-300">{formatEventDeadline(selectedEvent.registrationDeadline)}</span></div>}
                  {selectedEvent.date && <div>Event date: <span className="dark:text-gray-300">{new Date(selectedEvent.date).toLocaleDateString()}</span></div>}
                </div>
                {selectedEvent.type === 'team' && (selectedEvent.maleRequired > 0 || selectedEvent.femaleRequired > 0) && (
                  <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 rounded-lg">
                    <p className="text-sm font-medium text-purple-900 dark:text-purple-300 mb-2">Gender Composition Required:</p>
                    <div className="flex gap-4 text-sm text-purple-700 dark:text-purple-400">
                      {selectedEvent.maleRequired > 0 && (
                        <div className="flex items-center gap-2">
                          <span>♂ Males: {genderComposition.maleCount}/{selectedEvent.maleRequired}</span>
                          {genderComposition.maleCount >= selectedEvent.maleRequired && <span className="text-green-600 dark:text-green-400 font-semibold">✓</span>}
                        </div>
                      )}
                      {selectedEvent.femaleRequired > 0 && (
                        <div className="flex items-center gap-2">
                          <span>♀ Females: {genderComposition.femaleCount}/{selectedEvent.femaleRequired}</span>
                          {genderComposition.femaleCount >= selectedEvent.femaleRequired && <span className="text-green-600 dark:text-green-400 font-semibold">✓</span>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {selectedEvent.allowedGenders && selectedEvent.allowedGenders.length > 0 && selectedEvent.allowedGenders.length < 2 && (
                  <div className="mt-3 p-3 rounded-lg border" style={{
                    backgroundColor: selectedEvent.allowedGenders[0] === 'female' ? '#fce7f3' : '#dbeafe',
                    borderColor: selectedEvent.allowedGenders[0] === 'female' ? '#fbcfe8' : '#bfdbfe'
                  }}>
                    <p className="text-sm font-semibold" style={{
                      color: selectedEvent.allowedGenders[0] === 'female' ? '#831843' : '#1e40af'
                    }}>
                      🔒 {selectedEvent.allowedGenders[0] === 'female' ? '♀ Females Only' : '♂ Males Only'}
                    </p>
                    <p className="text-xs mt-1" style={{
                      color: selectedEvent.allowedGenders[0] === 'female' ? '#be185d' : '#1e40af'
                    }}>
                      This event is restricted to {selectedEvent.allowedGenders[0]}s only
                    </p>
                  </div>
                )}
                {selectedEvent.registrationFee > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                      💳 Registration Fee: ₹{isEventRegisterable ? selectedEvent.registrationFee : 'XXX'}
                    </p>
                    {selectedEvent.upiPaymentLink && (
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">Payment link available after registration</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedEvent && !isEventRegisterable && (
              <div className="card dark:bg-dark-card dark:border-dark-border mb-6 text-center">
                <div className="inline-flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 px-5 py-3 rounded-xl text-sm font-semibold">
                  Registration is not open for this event right now
                </div>
              </div>
            )}

            {selectedEvent && isEventRegisterable && (
              <div className="card dark:bg-dark-card dark:border-dark-border">
                <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 text-sm sm:text-base">
                  Step 2: Player Details - <span className="text-blue-600 dark:text-blue-400">{selectedEvent.title}</span>
                </h2>

                {selectedEvent.type === 'team' && (
                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl">
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">Team Name *</label>
                    <input
                      className="input-field w-full text-base dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      placeholder="Enter your team name"
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">This name will appear in the tournament bracket and reports.</p>
                  </div>
                )}

                <div className="space-y-4">
                  {players.map((player, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl border p-4 ${player.isSubstitute ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/50' : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border'}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {player.isSubstitute
                            ? `Substitute ${idx - (selectedEvent.teamSize || 1) + 1}`
                            : `Player ${idx + 1}`}
                        </span>
                        <div className="flex items-center gap-3">
                          {selectedEvent.type === 'team' && !player.isSubstitute && (
                            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer select-none">
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
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Full Name *</label>
                          <input
                            className="input-field w-full text-base dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            placeholder="Full name"
                            value={player.name}
                            onChange={e => updatePlayer(idx, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">UUCMS No. *</label>
                          <input
                            className="input-field w-full text-base dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            placeholder="U02CG23S0001"
                            value={player.uucms}
                            onChange={e => updatePlayer(idx, 'uucms', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phone *</label>
                          <input
                            className="input-field w-full text-base dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            type="tel"
                            placeholder="Phone number"
                            value={player.phone}
                            onChange={e => updatePlayer(idx, 'phone', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Department *</label>
                          <select
                            className="input-field w-full text-base dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            value={player.department}
                            onChange={e => updatePlayer(idx, 'department', e.target.value)}
                          >
                            <option value="">Select department</option>
                            {availableDepartments.map(department => <option key={department} value={department}>{department}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Gender *</label>
                          <select
                            className="input-field w-full text-base dark:bg-gray-800 dark:border-gray-700 dark:text-white"
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">Main players: {mainPlayers.length}/{selectedEvent.teamSize} (choose exactly one leader)</p>
                    <button
                      onClick={addSubstitute}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800/50 hover:border-blue-400 dark:hover:border-blue-500 px-4 py-2 rounded-lg transition-colors"
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
          </>
        )}
      </div>
    </div>
  );
}
