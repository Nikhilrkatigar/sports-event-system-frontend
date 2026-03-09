import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { useConfirm } from '../../hooks/useConfirm';
import { CardSkeleton } from '../../components/Skeletons';

const empty = { title: '', type: 'single', teamSize: 2, description: '', rules: '', maxParticipants: '', date: '', image: '', imageUrl: '' };

export default function ManageEvents() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [imageMode, setImageMode] = useState('url');
  const { confirm } = useConfirm();

  const load = async () => {
    setPageLoading(true);
    try {
      const r = await API.get('/events');
      setEvents(r.data);
    } finally {
      setPageLoading(false);
    }
  };
  
  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.title) return toast.error('Event title required');
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && k !== 'imageUrl') fd.append(k, v); });
      if (imageMode === 'upload' && file) fd.append('image', file);
      else if (imageMode === 'url' && form.imageUrl) fd.set('image', form.imageUrl);

      if (editId) {
        await API.put(`/events/${editId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Event updated');
      } else {
        await API.post('/events', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Event created');
      }
      setForm(empty); setEditId(null); setFile(null); setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving event');
    } finally { setLoading(false); }
  };

  const handleEdit = (ev) => {
    setForm({ ...ev, imageUrl: ev.image || '', date: ev.date ? ev.date.substring(0, 10) : '' });
    setEditId(ev._id);
    setShowForm(true);
    setImageMode('url');
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: '🗑️ Delete Event',
      message: 'Are you sure you want to delete this event? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDangerous: true,
    });
    if (!confirmed) return;
    try {
      await API.delete(`/events/${id}`);
      toast.success('Event deleted successfully');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete event');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Events</h1>
        <button onClick={() => { setForm(empty); setEditId(null); setShowForm(!showForm); }} className="btn-primary">
          {showForm ? 'Cancel' : '+ Add Event'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">{editId ? 'Edit Event' : 'New Event'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Event Title *</label>
              <input className="input-field" placeholder="e.g. 100m Race" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Event Type</label>
              <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="single">Single Player</option>
                <option value="team">Team</option>
              </select>
            </div>
            {form.type === 'team' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Team Size</label>
                <input type="number" className="input-field" value={form.teamSize} onChange={e => setForm({ ...form, teamSize: e.target.value })} />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Participants</label>
              <input type="number" className="input-field" placeholder="Leave empty for unlimited" value={form.maxParticipants} onChange={e => setForm({ ...form, maxParticipants: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Event Date</label>
              <input type="date" className="input-field" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea className="input-field" rows="2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Rules</label>
              <textarea className="input-field" rows="3" value={form.rules} onChange={e => setForm({ ...form, rules: e.target.value })} />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-2">Event Image</label>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" value="url" checked={imageMode === 'url'} onChange={() => setImageMode('url')} />URL
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" value="upload" checked={imageMode === 'upload'} onChange={() => setImageMode('upload')} />Upload
                </label>
              </div>
              {imageMode === 'url' ? (
                <input className="input-field" placeholder="https://example.com/image.jpg" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} />
              ) : (
                <input type="file" accept="image/*" className="input-field" onChange={e => setFile(e.target.files[0])} />
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={handleSubmit} disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : editId ? 'Update Event' : 'Create Event'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(empty); }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pageLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : events.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No events created yet</p>
          </div>
        ) : (
          events.map(ev => (
            <div key={ev._id} className="card flex flex-col">
              {ev.image && <img src={ev.image} alt={ev.title} className="w-full h-36 object-contain bg-gray-100 p-2 rounded-lg mb-3" />}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{ev.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ev.type === 'team' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                    {ev.type === 'team' ? `Team • ${ev.teamSize}` : 'Individual'}
                  </span>
                </div>
              </div>
              {ev.date && <p className="text-xs text-gray-400 mb-1">📅 {new Date(ev.date).toLocaleDateString()}</p>}
              <p className="text-xs text-gray-500 flex-1 line-clamp-2 mb-3">{ev.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                <span>{ev.teamCount || ev.playerCount || 0} registered</span>
                {ev.maxParticipants && <span>Max: {ev.maxParticipants}</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(ev)} className="flex-1 text-center py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">✏️ Edit</button>
                <button onClick={() => handleDelete(ev._id)} className="flex-1 text-center py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50">🗑️ Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
