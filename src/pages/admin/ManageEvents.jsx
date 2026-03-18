import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { useConfirm } from '../../hooks/useConfirm';
import { CardSkeleton } from '../../components/Skeletons';
import { EVENT_STATUS_OPTIONS, formatEventDeadline, getEventStatusMeta } from '../../utils/events';

const empty = {
  title: '',
  type: 'single',
  status: 'draft',
  scoreOrder: 'desc',
  teamSize: 2,
  maleRequired: 0,
  femaleRequired: 0,
  allowedDepartments: [],
  description: '',
  rules: '',
  maxParticipants: '',
  date: '',
  startTime: '',
  registrationDeadline: '',
  image: '',
  imageUrl: ''
};

export default function ManageEvents() {
  const [events, setEvents] = useState([]);
  const [departments, setDepartments] = useState([]);
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
      const [eventsRes, settingsRes] = await Promise.all([
        API.get('/events'),
        API.get('/settings')
      ]);
      setEvents(eventsRes.data);
      setDepartments(settingsRes.data?.departments || []);
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
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && k !== 'imageUrl') fd.append(k, v);
      });
      if (imageMode === 'upload' && file) fd.append('image', file);
      else if (imageMode === 'url' && form.imageUrl) fd.set('image', form.imageUrl);

      if (editId) {
        await API.put(`/events/${editId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Event updated');
      } else {
        await API.post('/events', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Event created');
      }
      setForm(empty);
      setEditId(null);
      setFile(null);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving event');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event) => {
    setForm({
      ...event,
      scoreOrder: event.scoreOrder || 'desc',
      status: event.status || 'draft',
      allowedDepartments: event.allowedDepartments || [],
      imageUrl: event.image || '',
      date: event.date ? event.date.substring(0, 10) : '',
      startTime: event.startTime || '',
      registrationDeadline: event.registrationDeadline ? event.registrationDeadline.substring(0, 16) : ''
    });
    setEditId(event._id);
    setShowForm(true);
    setImageMode('url');
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Event',
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

  const toggleRegistration = async (event) => {
    try {
      const r = await API.patch(`/events/${event._id}/toggle-registration`);
      setEvents((prev) => prev.map((item) => (item._id === event._id ? { ...item, ...r.data } : item)));
      toast.success(`Registration ${r.data.registrationOpen ? 'opened' : 'closed'} for ${event.title}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle registration');
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
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lifecycle Status</label>
              <select className="input-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {EVENT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Scoring</label>
              <select className="input-field" value={form.scoreOrder} onChange={e => setForm({ ...form, scoreOrder: e.target.value })}>
                <option value="desc">Higher Score Wins</option>
                <option value="asc">Lower Score Wins</option>
              </select>
            </div>
            {form.type === 'team' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Team Size</label>
                <input type="number" className="input-field" value={form.teamSize} onChange={e => setForm({ ...form, teamSize: e.target.value })} />
              </div>
            )}
            {form.type === 'team' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Males Required <span className="text-gray-400 text-xs">(optional)</span></label>
                <input type="number" className="input-field" min="0" value={form.maleRequired} onChange={e => setForm({ ...form, maleRequired: e.target.value })} />
              </div>
            )}
            {form.type === 'team' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Females Required <span className="text-gray-400 text-xs">(optional)</span></label>
                <input type="number" className="input-field" min="0" value={form.femaleRequired} onChange={e => setForm({ ...form, femaleRequired: e.target.value })} />
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
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Time <span className="text-gray-400 text-xs">(optional)</span></label>
              <input type="time" className="input-field" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Registration Deadline</label>
              <input type="datetime-local" className="input-field" value={form.registrationDeadline} onChange={e => setForm({ ...form, registrationDeadline: e.target.value })} />
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
              <label className="block text-xs font-medium text-gray-600 mb-2">Allowed Departments <span className="text-gray-400 text-xs">(Leave empty to allow all departments)</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {departments.map((dept) => (
                  <label key={dept} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.allowedDepartments.includes(dept)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({ ...form, allowedDepartments: [...form.allowedDepartments, dept] });
                        } else {
                          setForm({ ...form, allowedDepartments: form.allowedDepartments.filter(d => d !== dept) });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-xs text-gray-600">{dept}</span>
                  </label>
                ))}
              </div>
              {form.allowedDepartments.length > 0 && (
                <p className="text-xs text-blue-600 mt-2">🔒 Restricted to: {form.allowedDepartments.join(', ')}</p>
              )}
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
          events.map((event) => {
            const statusMeta = getEventStatusMeta(event);
            return (
              <div key={event._id} className="card flex flex-col">
                {event.image && <img src={event.image} alt={event.title} className="w-full h-36 object-contain bg-gray-100 p-2 rounded-lg mb-3" />}
                <div className="flex items-start justify-between mb-2 gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${event.type === 'team' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                      {event.type === 'team' ? `Team • ${event.teamSize}` : 'Individual'}
                    </span>
                    {event.type === 'team' && (event.maleRequired > 0 || event.femaleRequired > 0) && (
                      <div className="text-xs text-gray-500 mt-1">
                        {event.maleRequired > 0 && <span className="mr-2">♂ {event.maleRequired}</span>}
                        {event.femaleRequired > 0 && <span>♀ {event.femaleRequired}</span>}
                      </div>
                    )}
                    {event.allowedDepartments && event.allowedDepartments.length > 0 && (
                      <div className="text-xs text-blue-600 mt-1">
                        🔒 {event.allowedDepartments.join(', ')}
                      </div>
                    )}
                  </div>
                  <span className={`text-[11px] px-2 py-1 rounded-full border whitespace-nowrap ${statusMeta.className}`}>
                    {statusMeta.label}
                  </span>
                </div>
                {event.date && <p className="text-xs text-gray-400 mb-1">Event date: {new Date(event.date).toLocaleDateString()}</p>}
                {event.registrationDeadline && <p className="text-xs text-gray-400 mb-1">Deadline: {formatEventDeadline(event.registrationDeadline)}</p>}
                <p className="text-xs text-gray-500 flex-1 line-clamp-2 mb-3">{event.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span>{event.type === 'team' ? `${event.teamCount || 0} teams` : `${event.playerCount || 0} players`} registered</span>
                  {event.maxParticipants ? <span>Max: {event.maxParticipants}</span> : <span>Unlimited</span>}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                  <span>{event.remainingSlots == null ? 'Unlimited slots' : `${event.remainingSlots} slots left`}</span>
                  {event.type === 'team' && event.availableTeams != null && <span>{event.availableTeams} teams left</span>}
                </div>
                {(event.status === 'published' || event.status === 'open' || event.status === 'full') && (
                  <button
                    onClick={() => toggleRegistration(event)}
                    className={`w-full mb-2 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      event.registrationOpen === false
                        ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                    }`}
                  >
                    {event.registrationOpen === false ? 'Registration Closed - Click to Open' : 'Registration Open - Click to Close'}
                  </button>
                )}
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(event)} className="flex-1 text-center py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Edit</button>
                  <button onClick={() => handleDelete(event._id)} className="flex-1 text-center py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Delete</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
