import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { useConfirm } from '../../hooks/useConfirm';
import { CardSkeleton } from '../../components/Skeletons';

const EMOJI_OPTIONS = ['🏆','🏅','🎽','🏃','🤸','🏋️','⚽','🏀','🏈','🎯','🎪','🎉','🔥','⚡','🌟','🎵','🍽️','☕','🎤','🎭','🏁','🚩','📣','🕐'];
const COLOR_OPTIONS = [
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Yellow', value: '#eab308' },
];

const emptyForm = { time: '', title: '', description: '', icon: '🏆', color: '#3b82f6', isPublic: true, order: 0 };

export default function ManageTimeline() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const { confirm } = useConfirm();

  const load = async () => {
    setPageLoading(true);
    try {
      const r = await API.get('/timeline/all');
      setItems(r.data);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.time) return toast.error('Time is required');
    if (!form.title) return toast.error('Title is required');
    setLoading(true);
    try {
      if (editId) {
        await API.put(`/timeline/${editId}`, form);
        toast.success('Timeline item updated');
      } else {
        await API.post('/timeline', form);
        toast.success('Timeline item created');
      }
      setForm(emptyForm);
      setEditId(null);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving item');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setForm({ time: item.time, title: item.title, description: item.description || '', icon: item.icon || '🏆', color: item.color || '#3b82f6', isPublic: item.isPublic, order: item.order || 0 });
    setEditId(item._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({ title: 'Delete Item', message: 'Delete this timeline item?', confirmText: 'Delete', isDangerous: true });
    if (!confirmed) return;
    try {
      await API.delete(`/timeline/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const toggleVisibility = async (item) => {
    try {
      const r = await API.patch(`/timeline/${item._id}/toggle-visibility`);
      setItems(prev => prev.map(i => i._id === item._id ? { ...i, isPublic: r.data.isPublic } : i));
      toast.success(`"${item.title}" is now ${r.data.isPublic ? 'public' : 'hidden'}`);
    } catch (err) {
      toast.error('Failed to toggle visibility');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Timeline</h1>
          <p className="text-sm text-gray-500 mt-1">Build the event-day schedule. Toggle items hidden/public anytime.</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(!showForm); }}
          className="btn-primary"
        >
          {showForm ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">{editId ? 'Edit Timeline Item' : 'New Timeline Item'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Time *</label>
              <input className="input-field" placeholder="e.g. 10:00 AM" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
              <input className="input-field" placeholder="e.g. 100m Running Race" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea className="input-field" rows="2" placeholder="Short description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Icon (Emoji)</label>
              <div className="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-lg max-h-28 overflow-y-auto bg-white">
                {EMOJI_OPTIONS.map(emoji => (
                  <button key={emoji} type="button" onClick={() => setForm({ ...form, icon: emoji })}
                    className={`w-9 h-9 text-lg rounded-lg transition-colors ${form.icon === emoji ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100'}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Accent Color</label>
              <div className="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-lg bg-white">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.value} type="button" title={c.label} onClick={() => setForm({ ...form, color: c.value })}
                    style={{ backgroundColor: c.value }}
                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${form.color === c.value ? 'ring-2 ring-offset-2 ring-gray-600 scale-110' : ''}`} />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Display Order</label>
              <input type="number" className="input-field" value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-3">
              <label className="block text-xs font-medium text-gray-600">Visibility</label>
              <button type="button" onClick={() => setForm({ ...form, isPublic: !form.isPublic })}
                className={`relative inline-flex w-12 h-6 rounded-full transition-colors ${form.isPublic ? 'bg-green-500' : 'bg-gray-300'}`}>
                <span className={`inline-block w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${form.isPublic ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
              <span className={`text-xs font-medium ${form.isPublic ? 'text-green-600' : 'text-gray-500'}`}>{form.isPublic ? 'Public' : 'Hidden'}</span>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSubmit} disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : editId ? 'Update Item' : 'Create Item'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {pageLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🗓️</div>
          <p className="text-gray-500">No timeline items yet. Add the first event of the day!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item._id} className={`card flex items-start gap-4 transition-opacity ${item.isPublic ? '' : 'opacity-60'}`}>
              {/* Color accent + icon */}
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm" style={{ backgroundColor: item.color + '22', border: `2px solid ${item.color}` }}>
                {item.icon || '🏆'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-sm font-bold text-blue-600">{item.time}</span>
                  <span className="text-xs text-gray-400">•  Order #{item.order}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${item.isPublic ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    {item.isPublic ? '✅ Public' : '🔒 Hidden'}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                {item.description && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{item.description}</p>}
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button onClick={() => toggleVisibility(item)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${item.isPublic ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}>
                  {item.isPublic ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => handleEdit(item)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">Edit</button>
                <button onClick={() => handleDelete(item._id)} className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
