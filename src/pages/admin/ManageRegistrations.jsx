import { Fragment, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { useConfirm } from '../../hooks/useConfirm';
import { TableRowSkeleton } from '../../components/Skeletons';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/roles';
import EditPlayerModal from '../../components/EditPlayerModal';

const getFilenameFromContentDisposition = (headerValue, fallbackName) => {
  if (!headerValue) return fallbackName;
  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const asciiMatch = headerValue.match(/filename="?([^"]+)"?/i);
  if (asciiMatch?.[1]) return asciiMatch[1];
  return fallbackName;
};

const normalizeBlob = (data, typeHint) => {
  if (data instanceof Blob) return data;
  if (data instanceof ArrayBuffer) return new Blob([data], typeHint ? { type: typeHint } : undefined);
  if (ArrayBuffer.isView(data)) return new Blob([data.buffer], typeHint ? { type: typeHint } : undefined);
  return new Blob([data ?? ''], typeHint ? { type: typeHint } : undefined);
};

const extractErrorMessage = (text, fallback) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return fallback;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed?.message || fallback;
  } catch {
    return trimmed.slice(0, 200);
  }
};

const ensureExcelBlob = async (blob, typeHint, fallbackError) => {
  const normalized = normalizeBlob(blob, typeHint);
  const buffer = await normalized.arrayBuffer();
  const header = new Uint8Array(buffer.slice(0, 4));
  const isZip = header[0] === 0x50 && header[1] === 0x4b;
  if (!isZip) {
    const text = new TextDecoder().decode(buffer.slice(0, 200));
    throw new Error(extractErrorMessage(text, fallbackError));
  }
  return new Blob([buffer], { type: typeHint || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

const ensureCsvBlob = async (blob, typeHint, fallbackError) => {
  const normalized = normalizeBlob(blob, typeHint);
  const text = await normalized.text();
  const firstChar = text.trim().charAt(0);
  if (firstChar === '{' || firstChar === '<') {
    throw new Error(extractErrorMessage(text, fallbackError));
  }
  return new Blob([text], { type: typeHint || 'text/csv' });
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const getDownloadErrorMessage = async (error, fallback) => {
  if (!error) return fallback;
  const response = error.response;
  if (response?.data instanceof Blob) {
    try {
      const text = await response.data.text();
      if (!text) return fallback;
      try {
        const parsed = JSON.parse(text);
        return parsed?.message || fallback;
      } catch {
        return text;
      }
    } catch {
      return fallback;
    }
  }
  const candidate = response?.data?.message || error.message || fallback;
  if (typeof candidate === 'string') return candidate;
  try {
    return JSON.stringify(candidate);
  } catch {
    return String(candidate);
  }
};

const formatGender = (gender) => {
  if (gender === 'male') return 'Male';
  if (gender === 'female') return 'Female';
  return 'Unspecified';
};

const getPlayerRole = (player) => {
  if (player.isSubstitute) {
    return <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">Substitute</span>;
  }
  if (player.isTeamLeader) {
    return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Leader</span>;
  }
  return <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">Player</span>;
};

export default function ManageRegistrations() {
  const { admin } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [attendance, setAttendance] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [editingTeamName, setEditingTeamName] = useState('');
  const [downloadEvent, setDownloadEvent] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(null);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editingRegistrationId, setEditingRegistrationId] = useState(null);
  const [addingPlayerForRegistration, setAddingPlayerForRegistration] = useState(null);
  const { confirm } = useConfirm();

  const canEditRegistration = hasPermission(admin?.role, 'manage_registrations');
  const canCheckIn = hasPermission(admin?.role, 'check_in');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.append('eventId', filter);
      if (search) params.append('search', search);
      if (attendance) params.append('attendance', attendance);
      if (deptFilter) params.append('dept', deptFilter);
      if (genderFilter) params.append('gender', genderFilter);
      const res = await API.get(`/registrations?${params.toString()}`);
      setRegistrations(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    API.get('/events').then(r => setEvents(r.data));
  }, []);

  useEffect(() => { load(); }, [filter, search, attendance, deptFilter, genderFilter]);

  const summary = useMemo(() => {
    const totalPlayers = registrations.reduce((sum, reg) => sum + reg.players.length, 0);
    const checkedInPlayers = registrations.reduce((sum, reg) => sum + reg.players.filter((player) => player.checkInStatus).length, 0);
    const paidRegistrations = registrations.filter(reg => reg.paymentStatus === 'paid' && reg.eventId?.registrationFee > 0).length;
    const pendingPayments = registrations.filter(reg => reg.paymentStatus === 'pending' && reg.eventId?.registrationFee > 0).length;
    return {
      registrations: registrations.length,
      players: totalPlayers,
      checkedIn: checkedInPlayers,
      pending: Math.max(totalPlayers - checkedInPlayers, 0),
      paid: paidRegistrations,
      pendingPayment: pendingPayments
    };
  }, [registrations]);

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Registration',
      message: 'Are you sure you want to delete this registration? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDangerous: true,
    });
    if (!confirmed) return;
    
    const previousRegistrations = registrations;
    setRegistrations(prev => prev.filter(reg => reg._id !== id));
    
    try {
      await API.delete(`/registrations/${id}`);
      toast.success('Registration deleted successfully');
    } catch (err) {
      setRegistrations(previousRegistrations);
      toast.error(err.response?.data?.message || 'Failed to delete registration');
    }
  };

  const exportAll = async (type) => {
    try {
      const res = await API.get(`/registrations/export/${type}`, {
        params: filter ? { eventId: filter } : {},
        responseType: 'blob'
      });
      const fallback = type === 'csv' ? 'registrations.csv' : 'Participants.xlsx';
      const filename = getFilenameFromContentDisposition(res.headers['content-disposition'], fallback);
      const typeHint = type === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = type === 'csv'
        ? await ensureCsvBlob(res.data, typeHint, 'Export failed')
        : await ensureExcelBlob(res.data, typeHint, 'Export failed');
      downloadBlob(blob, filename);
      toast.success('Download started');
    } catch (err) {
      const message = await getDownloadErrorMessage(err, 'Export failed');
      toast.error(message);
    }
  };

  const downloadEventParticipants = async () => {
    if (!downloadEvent) return toast.error('Please select an event');
    try {
      const res = await API.get(`/registrations/export/event/${downloadEvent}`, {
        responseType: 'blob'
      });
      const filename = getFilenameFromContentDisposition(res.headers['content-disposition'], 'participants.xlsx');
      const blob = await ensureExcelBlob(
        res.data,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Download failed'
      );
      downloadBlob(blob, filename);
      toast.success('Download started');
    } catch (err) {
      const message = await getDownloadErrorMessage(err, 'Download failed');
      toast.error(message);
    }
  };

  const updatePlayerGender = async (registrationId, playerId, gender) => {
    const previousRegistrations = registrations;
    setRegistrations(prev => prev.map(reg => {
      if (reg._id !== registrationId) return reg;
      return {
        ...reg,
        players: reg.players.map(player => player._id === playerId ? { ...player, gender } : player)
      };
    }));
    
    try {
      const res = await API.patch(`/registrations/${registrationId}/players/${playerId}`, { gender });
      const updated = res.data?.player;
      setRegistrations(prev => prev.map(reg => {
        if (reg._id !== registrationId) return reg;
        return {
          ...reg,
          players: reg.players.map(player => player._id === playerId ? { ...player, gender: updated?.gender || gender } : player)
        };
      }));
      toast.success('Gender updated');
    } catch (err) {
      setRegistrations(previousRegistrations);
      toast.error(err.response?.data?.message || 'Failed to update gender');
    }
  };

  const updateCheckInStatus = async (registrationId, playerId, checkInStatus) => {
    const previousRegistrations = registrations;
    setRegistrations(prev => prev.map(reg => {
      if (reg._id !== registrationId) return reg;
      return {
        ...reg,
        players: reg.players.map(player => player._id === playerId ? { ...player, checkInStatus } : player)
      };
    }));
    
    try {
      const res = await API.patch(`/registrations/${registrationId}/players/${playerId}/checkin`, { checkInStatus });
      const updated = res.data?.player;
      setRegistrations(prev => prev.map(reg => {
        if (reg._id !== registrationId) return reg;
        return {
          ...reg,
          players: reg.players.map(player => player._id === playerId ? { ...player, checkInStatus: updated?.checkInStatus ?? checkInStatus } : player)
        };
      }));
      toast.success(checkInStatus ? 'Player checked in' : 'Check-in reverted');
    } catch (err) {
      setRegistrations(previousRegistrations);
      toast.error(err.response?.data?.message || 'Failed to update check-in status');
    }
  };

  const updateTeamName = async (registrationId, newTeamName) => {
    if (!registrationId || !newTeamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }
    
    const previousRegistrations = registrations;
    const trimmedName = newTeamName.trim();
    setRegistrations(prev => prev.map(reg =>
      reg._id === registrationId ? { ...reg, teamName: trimmedName } : reg
    ));
    setEditingTeam(null);
    
    try {
      const res = await API.patch(`/registrations/${registrationId}`, { teamName: trimmedName });
      setRegistrations(prev => prev.map(reg =>
        reg._id === registrationId ? { ...reg, teamName: res.data.teamName } : reg
      ));
      toast.success('Team name updated');
    } catch (err) {
      setRegistrations(previousRegistrations);
      setEditingTeam(registrationId);
      setEditingTeamName(trimmedName);
      toast.error(err.response?.data?.message || 'Failed to update team name');
    }
  };

  const verifyPayment = async (registrationId, isVerifiying) => {
    const endpoint = isVerifiying ? `verify-payment` : `unverify-payment`;
    const action = isVerifiying ? 'mark as paid' : 'reset payment status';
    const successMessage = isVerifiying ? 'Payment verified successfully' : 'Payment status reset';
    const confirmed = await confirm({
      title: isVerifiying ? 'Verify Payment' : 'Reset Payment Status',
      message: `Are you sure you want to ${action} for this registration?`,
      confirmText: isVerifiying ? 'Verify' : 'Reset',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;
    
    const previousRegistrations = registrations;
    const newStatus = isVerifiying ? 'paid' : 'pending';
    setRegistrations(prev => prev.map(reg =>
      reg._id === registrationId ? { ...reg, paymentStatus: newStatus } : reg
    ));
    setVerifyingPayment(registrationId);
    
    try {
      const res = await API.patch(`/registrations/${registrationId}/${endpoint}`);
      setRegistrations(prev => prev.map(reg =>
        reg._id === registrationId ? res.data.data : reg
      ));
      toast.success(successMessage);
    } catch (err) {
      setRegistrations(previousRegistrations);
      toast.error(err.response?.data?.message || `Failed to ${action}`);
    } finally {
      setVerifyingPayment(null);
    }
  };

  const updatePlayerDetails = async (formData) => {
    if (!editingPlayer || !editingRegistrationId) return;

    const previousRegistrations = registrations;
    
    // Update UI optimistically
    setRegistrations(prev => prev.map(reg => {
      if (reg._id !== editingRegistrationId) return reg;
      return {
        ...reg,
        players: reg.players.map(player =>
          player._id === editingPlayer._id
            ? { ...player, ...formData }
            : player
        )
      };
    }));

    try {
      const res = await API.patch(
        `/registrations/${editingRegistrationId}/players/${editingPlayer._id}`,
        formData
      );
      const updatedPlayer = res.data?.player;
      
      // Update with server response
      setRegistrations(prev => prev.map(reg => {
        if (reg._id !== editingRegistrationId) return reg;
        return {
          ...reg,
          players: reg.players.map(player =>
            player._id === editingPlayer._id ? { ...player, ...updatedPlayer } : player
          )
        };
      }));
      
      // Close modal only after successful API call
      setEditingPlayer(null);
      setEditingRegistrationId(null);
      toast.success('Player details updated');
    } catch (err) {
      // Restore previous state on error
      setRegistrations(previousRegistrations);
      toast.error(err.response?.data?.message || 'Failed to update player');
      // Keep modal open so user can retry
    }
  };

  const createNewPlayer = async (registrationId, formData) => {
    const previousRegistrations = registrations;
    
    // Add player optimistically
    setRegistrations(prev => prev.map(reg => {
      if (reg._id !== registrationId) return reg;
      const newPlayer = {
        _id: Date.now().toString(), // Temporary ID
        ...formData,
        checkInStatus: false
      };
      return {
        ...reg,
        players: [...reg.players, newPlayer]
      };
    }));

    try {
      const res = await API.post(`/registrations/${registrationId}/players`, formData);
      const updatedRegistration = res.data?.data;
      
      // Update with server response
      setRegistrations(prev => prev.map(reg =>
        reg._id === registrationId ? updatedRegistration : reg
      ));
      
      setAddingPlayerForRegistration(null);
      toast.success('Player added successfully');
    } catch (err) {
      setRegistrations(previousRegistrations);
      toast.error(err.response?.data?.message || 'Failed to add player');
    }
  };

  const deletePlayer = async (registrationId, playerId) => {
    const confirmed = await confirm({
      title: 'Remove Player',
      message: 'Are you sure you want to remove this player from the registration?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      isDangerous: true
    });
    if (!confirmed) return;

    const previousRegistrations = registrations;
    
    // Remove player optimistically
    setRegistrations(prev => prev.map(reg => {
      if (reg._id !== registrationId) return reg;
      return {
        ...reg,
        players: reg.players.filter(p => p._id !== playerId)
      };
    }));

    try {
      const res = await API.delete(`/registrations/${registrationId}/players/${playerId}`);
      const updatedRegistration = res.data?.data;
      
      // Update with server response
      setRegistrations(prev => prev.map(reg =>
        reg._id === registrationId ? updatedRegistration : reg
      ));
      
      toast.success('Player removed successfully');
    } catch (err) {
      setRegistrations(previousRegistrations);
      toast.error(err.response?.data?.message || 'Failed to remove player');
    }
  };

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">✓ Paid</span>;
      case 'pending':
        return <span className="text-xs bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-medium">↻ Pending</span>;
      case 'free':
        return <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">Free</span>;
      default:
        return <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">–</span>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Registrations</h1>
        <div className="flex gap-2">
          <button onClick={() => exportAll('csv')} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Export CSV</button>
          <button onClick={() => exportAll('excel')} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Export Excel</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="text-sm text-gray-500">Registrations</div>
          <div className="text-2xl font-bold text-gray-900">{summary.registrations}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Players</div>
          <div className="text-2xl font-bold text-gray-900">{summary.players}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Checked In</div>
          <div className="text-2xl font-bold text-green-700">{summary.checkedIn}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Pending Check-in</div>
          <div className="text-2xl font-bold text-orange-700">{summary.pending}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Paid</div>
          <div className="text-2xl font-bold text-green-700">{summary.paid}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Pending Payment</div>
          <div className="text-2xl font-bold text-yellow-700">{summary.pendingPayment}</div>
        </div>
      </div>

      <div className="card mb-6 bg-blue-50 border-blue-200">
        <h2 className="font-semibold text-blue-900 mb-3">Event-wise Participant Download</h2>
        <div className="flex gap-3 flex-wrap">
          <select className="input-field max-w-xs bg-white" value={downloadEvent} onChange={e => setDownloadEvent(e.target.value)}>
            <option value="">-- Select Event --</option>
            {events.map(ev => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
          </select>
          <button onClick={downloadEventParticipants} className="btn-primary">
            Download Participants
          </button>
        </div>
        <p className="text-xs text-blue-700 mt-2">Downloads as Excel: <code>EventName_Participants.xlsx</code></p>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input className="input-field max-w-xs" placeholder="Search name, UUCMS, team..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field max-w-xs" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Events</option>
          {events.map(ev => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
        </select>
        <select className="input-field max-w-xs" value={attendance} onChange={e => setAttendance(e.target.value)}>
          <option value="">All Attendance</option>
          <option value="pending">Pending Check-in</option>
          <option value="checked_in">Checked In</option>
        </select>
        <select className="input-field max-w-xs" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {[...new Set(registrations.flatMap(reg => reg.players.map(p => p.department).filter(Boolean)))].sort().map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        <select className="input-field max-w-xs" value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
          <option value="">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="unspecified">Unspecified</option>
        </select>
      </div>

      <div className="text-sm text-gray-500 mb-3">{registrations.length} registrations found</div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Event</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Reg. Number</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Team ID</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Team Name</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Players</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Date</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Payment</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Check-in</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <TableRowSkeleton columns={8} />
                  <TableRowSkeleton columns={8} />
                  <TableRowSkeleton columns={8} />
                  <TableRowSkeleton columns={8} />
                  <TableRowSkeleton columns={8} />
                </>
              ) : registrations.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    No registrations found
                  </td>
                </tr>
              ) : (
                registrations.map(reg => (
                  <Fragment key={reg._id}>
                    <tr className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{reg.eventId?.title || '-'}</td>
                      <td className="px-4 py-3 text-gray-700 font-mono font-semibold text-sm">{reg.registrationNumber || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{reg.teamId || '-'}</td>
                      <td className="px-4 py-3">
                        {editingTeam === reg._id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editingTeamName}
                              onChange={e => setEditingTeamName(e.target.value)}
                              className="input-field text-sm py-1 px-2"
                              placeholder="Team name"
                              autoFocus
                            />
                            <button
                              onClick={() => updateTeamName(reg._id, editingTeamName)}
                              className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTeam(null)}
                              className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{reg.teamName || '-'}</span>
                            {reg.teamId && canEditRegistration && (
                              <button
                                onClick={() => {
                                  setEditingTeam(reg._id);
                                  setEditingTeamName(reg.teamName || '');
                                }}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setExpanded(expanded === reg._id ? null : reg._id)} className="text-blue-600 hover:underline text-xs">
                          {reg.players.length} players {expanded === reg._id ? '▲' : '▼'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(reg.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {(reg.eventId?.registrationFee > 0) && getPaymentStatusBadge(reg.paymentStatus)}
                          {(reg.eventId?.registrationFee > 0) && reg.paymentScreenshot && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">
                              📸 Screenshot
                            </span>
                          )}
                          {(reg.eventId?.registrationFee > 0) && reg.paymentStatus === 'pending' && canEditRegistration && (
                            <button
                              onClick={() => verifyPayment(reg._id, true)}
                              disabled={verifyingPayment === reg._id}
                              className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 disabled:opacity-50"
                            >
                              Mark Paid
                            </button>
                          )}
                          {(reg.eventId?.registrationFee > 0) && reg.paymentStatus === 'paid' && canEditRegistration && (
                            <button
                              onClick={() => verifyPayment(reg._id, false)}
                              disabled={verifyingPayment === reg._id}
                              className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 disabled:opacity-50"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">
                          {reg.players.filter(player => player.checkInStatus).length}/{reg.players.length} checked in
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canEditRegistration ? (
                          <button onClick={() => handleDelete(reg._id)} className="btn-danger text-xs">Delete</button>
                        ) : (
                          <span className="text-xs text-gray-400">Read only</span>
                        )}
                      </td>
                    </tr>
                    {expanded === reg._id && (
                      <tr className="bg-blue-50">
                        <td colSpan="9" className="px-6 py-4">
                          <div className="space-y-3">
                            {/* Add Player Button (Team events only) */}
                            {reg.eventId?.type === 'team' && canEditRegistration && (
                              <button
                                onClick={() => setAddingPlayerForRegistration(reg._id)}
                                className="mb-3 text-xs bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 font-medium"
                              >
                                + Add Player
                              </button>
                            )}

                            {/* Players List */}
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-600">
                                  <th className="text-left py-1">Name</th>
                                  <th className="text-left py-1">UUCMS</th>
                                  <th className="text-left py-1">Phone</th>
                                  <th className="text-left py-1">Dept</th>
                                  <th className="text-left py-1">Gender</th>
                                  <th className="text-left py-1">Role</th>
                                  <th className="text-left py-1">Check-In</th>
                                  <th className="text-left py-1">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {reg.players.map((player) => (
                                  <tr key={player._id} className="border-t border-blue-200">
                                    <td className="py-2">{player.name}</td>
                                    <td className="py-2 font-mono">{player.uucms}</td>
                                    <td className="py-2">{player.phone}</td>
                                    <td className="py-2">{player.department}</td>
                                    <td className="py-2">
                                      {canEditRegistration ? (
                                        <select
                                          className="input-field text-xs bg-white"
                                          value={player.gender || 'unspecified'}
                                          onChange={e => updatePlayerGender(reg._id, player._id, e.target.value)}
                                        >
                                          <option value="male">Male</option>
                                          <option value="female">Female</option>
                                          <option value="unspecified">Unspecified</option>
                                        </select>
                                      ) : (
                                        <span>{formatGender(player.gender)}</span>
                                      )}
                                    </td>
                                    <td className="py-2">{getPlayerRole(player)}</td>
                                    <td className="py-2">
                                      <div className="flex items-center gap-2">
                                        {player.checkInStatus ? (
                                          <span className="text-green-600 font-semibold">Checked In</span>
                                        ) : (
                                          <span className="text-gray-400">Pending</span>
                                        )}
                                        {canCheckIn && (
                                          <button
                                            onClick={() => updateCheckInStatus(reg._id, player._id, !player.checkInStatus)}
                                            className="text-[11px] border border-gray-200 bg-white px-2 py-1 rounded hover:bg-gray-50"
                                          >
                                            {player.checkInStatus ? 'Undo' : 'Check In'}
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                    {canEditRegistration && (
                                      <td className="py-2">
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => {
                                              setEditingPlayer(player);
                                              setEditingRegistrationId(reg._id);
                                            }}
                                            className="text-[11px] text-blue-600 border border-blue-200 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 font-medium"
                                          >
                                            ✏️ Edit
                                          </button>
                                          {reg.eventId?.type === 'team' && (
                                            <button
                                              onClick={() => deletePlayer(reg._id, player._id)}
                                              className="text-[11px] text-red-600 border border-red-200 bg-red-50 px-2 py-1 rounded hover:bg-red-100 font-medium"
                                            >
                                              × Remove
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingPlayer && editingRegistrationId && (
        <EditPlayerModal
          player={editingPlayer}
          departments={[...new Set(registrations.flatMap(reg => reg.players.map(p => p.department).filter(Boolean)))].sort()}
          mode="edit"
          onSave={updatePlayerDetails}
          onDelete={(playerId) => deletePlayer(editingRegistrationId, playerId)}
          onClose={() => {
            setEditingPlayer(null);
            setEditingRegistrationId(null);
          }}
        />
      )}

      {addingPlayerForRegistration && (
        <EditPlayerModal
          departments={[...new Set(registrations.flatMap(reg => reg.players.map(p => p.department).filter(Boolean)))].sort()}
          mode="add"
          onSave={(formData) => createNewPlayer(addingPlayerForRegistration, formData)}
          onClose={() => setAddingPlayerForRegistration(null)}
        />
      )}
    </div>
  );
}
