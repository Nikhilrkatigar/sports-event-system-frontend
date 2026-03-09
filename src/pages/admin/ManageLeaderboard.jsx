import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { useConfirm } from '../../hooks/useConfirm';
import { TableRowSkeleton } from '../../components/Skeletons';

const empty = { eventId: '', teamOrPlayer: '', score: '', rank: '' };

export default function ManageLeaderboard() {
  const [entries, setEntries] = useState([]);
  const [events, setEvents] = useState([]);
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

  const handleSubmit = async () => {
    if (!form.teamOrPlayer || !form.score) return toast.error('Player/Team name and score required');
    try {
      if (editId) {
        await API.put(`/leaderboard/${editId}`, form);
        toast.success('Updated successfully');
      } else {
        await API.post('/leaderboard', form);
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
            <select className="input-field" value={form.eventId} onChange={e => setForm({ ...form, eventId: e.target.value })}>
              <option value="">Select Event</option>
              {events.map(ev => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Player / Team *</label>
            <input className="input-field" value={form.teamOrPlayer} onChange={e => setForm({ ...form, teamOrPlayer: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Score *</label>
            <input type="number" className="input-field" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rank</label>
            <input type="number" className="input-field" value={form.rank} onChange={e => setForm({ ...form, rank: e.target.value })} />
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
                <tr key={e._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{e.rank || '—'}</td>
                  <td className="px-4 py-3 font-medium">{e.teamOrPlayer}</td>
                  <td className="px-4 py-3 text-gray-500">{e.eventId?.title || '—'}</td>
                  <td className="px-4 py-3 font-bold text-blue-700">{e.score}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setForm({ eventId: e.eventId?._id || '', teamOrPlayer: e.teamOrPlayer, score: e.score, rank: e.rank }); setEditId(e._id); }} className="text-xs border border-gray-200 px-2 py-1 rounded hover:bg-gray-50">Edit</button>
                      <button onClick={() => handleDelete(e._id)} className="btn-danger text-xs">Del</button>
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
