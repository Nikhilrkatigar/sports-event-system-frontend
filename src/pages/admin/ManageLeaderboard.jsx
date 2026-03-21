import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { useConfirm } from '../../hooks/useConfirm';
import { TableRowSkeleton } from '../../components/Skeletons';

const empty = { eventId: '', teamOrPlayer: '', score: '', rank: '' };

const buildParticipantOptions = (applications, eventType) => {
  if (!Array.isArray(applications)) return [];
  const options = [];
  const seen = new Set();

  if (eventType === 'team') {
    applications.forEach((app, index) => {
      const label = app.teamName || app.teamId || `Team ${index + 1}`;
      if (!label || seen.has(label)) return;
      seen.add(label);
      options.push({ value: label, label });
    });
    return options;
  }

  applications.forEach((app) => {
    (app.players || []).forEach((player) => {
      if (player.isSubstitute) return;
      const label = player.uucms ? `${player.name} (${player.uucms})` : player.name;
      if (!label || seen.has(label)) return;
      seen.add(label);
      options.push({ value: label, label });
    });
  });

  return options;
};

export default function ManageLeaderboard() {
  const [entries, setEntries] = useState([]);
  const [events, setEvents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const { confirm } = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const r = await API.get('/leaderboard');
      setEntries(r.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    API.get('/events').then(r => setEvents(r.data));
  }, []);

  useEffect(() => {
    if (!form.eventId) {
      setParticipants([]);
      return;
    }

    let active = true;
    setParticipantsLoading(true);
    API.get(`/registrations?eventId=${form.eventId}`)
      .then((r) => {
        if (!active) return;
        const event = events.find(ev => ev._id === form.eventId);
        const eventType = event?.type || r.data?.[0]?.eventId?.type || 'single';
        setParticipants(buildParticipantOptions(r.data, eventType));
      })
      .catch(() => {
        if (!active) return;
        setParticipants([]);
      })
      .finally(() => {
        if (!active) return;
        setParticipantsLoading(false);
      });

    return () => { active = false; };
  }, [form.eventId, events]);

  const selectedEvent = useMemo(
    () => events.find(ev => ev._id === form.eventId) || null,
    [events, form.eventId]
  );

  const autoRank = useMemo(() => {
    if (!form.eventId || form.score === '' || form.score === null || form.score === undefined) return '';
    const score = Number(form.score);
    if (Number.isNaN(score)) return '';
    const order = selectedEvent?.scoreOrder === 'asc' ? 'asc' : 'desc';
    const currentEntries = entries.filter(e => e.eventId?._id === form.eventId && e._id !== editId);
    const scores = currentEntries
      .map(e => Number(e.score))
      .filter(s => !Number.isNaN(s));
    scores.push(score);
    scores.sort((a, b) => order === 'asc' ? a - b : b - a);
    return scores.findIndex((entryScore) => entryScore === score) + 1;
  }, [entries, editId, form.eventId, form.score, selectedEvent?.scoreOrder]);

  const participantOptions = useMemo(() => {
    if (!form.teamOrPlayer) return participants;
    const hasCurrent = participants.some(p => p.value === form.teamOrPlayer);
    if (hasCurrent) return participants;
    return [{ value: form.teamOrPlayer, label: `${form.teamOrPlayer} (current)` }, ...participants];
  }, [participants, form.teamOrPlayer]);

  const handleSubmit = async () => {
    if (!form.eventId) return toast.error('Event required');
    if (!form.teamOrPlayer || form.score === '' || form.score === null || form.score === undefined) {
      return toast.error('Player/Team and score required');
    }
    try {
      const payload = { ...form, rank: autoRank || form.rank || '' };
      if (editId) {
        await API.put(`/leaderboard/${editId}`, payload);
        toast.success('Updated successfully');
      } else {
        await API.post('/leaderboard', payload);
        toast.success('Entry added successfully');
      }
      setForm(empty); setEditId(null); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: '🗑️ Delete Entry',
      message: 'Are you sure you want to delete this leaderboard entry? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDangerous: true,
    });
    if (!confirmed) return;
    try {
      await API.delete(`/leaderboard/${id}`);
      toast.success('Entry deleted successfully');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete entry');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Leaderboard</h1>

      <div className="card mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">{editId ? 'Edit Entry' : 'Add Entry'}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Event</label>
            <select className="input-field" value={form.eventId} onChange={e => setForm({ ...form, eventId: e.target.value, teamOrPlayer: '' })}>
              <option value="">Select Event</option>
              {events.map(ev => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Player / Team *</label>
            <select
              className="input-field"
              value={form.teamOrPlayer}
              onChange={e => setForm({ ...form, teamOrPlayer: e.target.value })}
              disabled={!form.eventId || participantsLoading}
            >
              <option value="">
                {participantsLoading ? 'Loading participants...' : 'Select Player/Team'}
              </option>
              {participantOptions.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Score *</label>
            <input type="number" className="input-field" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} />
            {selectedEvent && (
              <div className="text-[11px] text-gray-400 mt-1">
                {selectedEvent.scoreOrder === 'asc' ? 'Lower score wins' : 'Higher score wins'} · Equal scores share the same rank
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rank</label>
            <input type="number" className="input-field" value={autoRank || ''} readOnly placeholder="Auto" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSubmit} className="btn-primary">{editId ? 'Update' : 'Add Entry'}</button>
          {editId && <button onClick={() => { setForm(empty); setEditId(null); }} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">Player / Team</th>
              <th className="px-4 py-3 text-left">Event</th>
              <th className="px-4 py-3 text-left">Score</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <TableRowSkeleton columns={5} />
                <TableRowSkeleton columns={5} />
                <TableRowSkeleton columns={5} />
                <TableRowSkeleton columns={5} />
                <TableRowSkeleton columns={5} />
              </>
            ) : entries.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-400">No entries yet</td></tr>
            ) : (
              entries.map(e => (
                <tr key={e._id} className="border-t hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200">
                  <td className="px-4 py-3">{e.rank || '—'}</td>
                  <td className="px-4 py-3 font-medium">{e.teamOrPlayer}</td>
                  <td className="px-4 py-3 text-gray-500">{e.eventId?.title || '—'}</td>
                  <td className="px-4 py-3 font-bold text-blue-700">{e.score}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setForm({ eventId: e.eventId?._id || '', teamOrPlayer: e.teamOrPlayer, score: e.score, rank: e.rank }); setEditId(e._id); }} className="text-xs border border-gray-200 dark:border-gray-700 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 transform hover:scale-105">Edit</button>
                      <button onClick={() => handleDelete(e._id)} className="btn-danger text-xs transform hover:scale-105 transition-transform duration-200">Del</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
