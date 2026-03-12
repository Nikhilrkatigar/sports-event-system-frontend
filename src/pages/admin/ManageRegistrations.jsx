import { Fragment, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { useConfirm } from '../../hooks/useConfirm';
import { TableRowSkeleton } from '../../components/Skeletons';

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

const getPlayerRole = (player) => {
  if (player.isTeamLeader) return 'Leader';
  if (player.isSubstitute) return 'Substitute';
  return 'Player';
};

export default function ManageRegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [downloadEvent, setDownloadEvent] = useState('');
  const [loading, setLoading] = useState(false);
  const { confirm } = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.append('eventId', filter);
      if (search) params.append('search', search);
      const res = await API.get(`/registrations?${params}`);
      setRegistrations(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    API.get('/events').then(r => setEvents(r.data));
  }, []);

  useEffect(() => { load(); }, [filter, search]);

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: '🗑️ Delete Registration',
      message: 'Are you sure you want to delete this registration? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDangerous: true,
    });
    if (!confirmed) return;
    try {
      await API.delete(`/registrations/${id}`);
      toast.success('Registration deleted successfully');
      load();
    } catch (err) {
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Registrations</h1>
        <div className="flex gap-2">
          <button onClick={() => exportAll('csv')} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Export CSV</button>
          <button onClick={() => exportAll('excel')} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Export Excel</button>
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
        <input className="input-field max-w-xs" placeholder="Search name or UUCMS..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field max-w-xs" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Events</option>
          {events.map(ev => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
        </select>
      </div>

      <div className="text-sm text-gray-500 mb-3">{registrations.length} registrations found</div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Event</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Team ID</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Players</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Date</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Check-in</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <TableRowSkeleton columns={6} />
                  <TableRowSkeleton columns={6} />
                  <TableRowSkeleton columns={6} />
                  <TableRowSkeleton columns={6} />
                  <TableRowSkeleton columns={6} />
                </>
              ) : registrations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No registrations found
                  </td>
                </tr>
              ) : (
                registrations.map(reg => (
                  <Fragment key={reg._id}>
                    <tr className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{reg.eventId?.title || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{reg.teamId || '-'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setExpanded(expanded === reg._id ? null : reg._id)} className="text-blue-600 hover:underline text-xs">
                          {reg.players.length} players {expanded === reg._id ? '▲' : '▼'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(reg.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs">
                          {reg.players.filter(p => p.checkInStatus).length}/{reg.players.length} checked in
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(reg._id)} className="btn-danger text-xs">Delete</button>
                      </td>
                  </tr>
                  {expanded === reg._id && (
                    <tr className="bg-blue-50">
                      <td colSpan="6" className="px-6 py-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-600">
                              <th className="text-left py-1">Name</th>
                              <th className="text-left py-1">UUCMS</th>
                              <th className="text-left py-1">Phone</th>
                              <th className="text-left py-1">Dept</th>
                              <th className="text-left py-1">Role</th>
                              <th className="text-left py-1">Check-In</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reg.players.map((p, i) => (
                              <tr key={i} className="border-t border-blue-200">
                                <td className="py-1">{p.name}</td>
                                <td className="py-1 font-mono">{p.uucms}</td>
                                <td className="py-1">{p.phone}</td>
                                <td className="py-1">{p.department}</td>
                                <td className="py-1">{getPlayerRole(p)}</td>
                                <td className="py-1">{p.checkInStatus ? <span className="text-green-600 font-semibold">Checked In</span> : <span className="text-gray-400">Pending</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
    </div>
  );
}
