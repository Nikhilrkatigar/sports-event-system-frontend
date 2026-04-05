import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { useConfirm } from '../../hooks/useConfirm';
import { CardSkeleton } from '../../components/Skeletons';
import { EVENT_STATUS_OPTIONS, formatEventDeadline, getEventStatusMeta } from '../../utils/events';

const empty = {
  title: '',
  type: 'single',
  eventCategory: 'track',
  status: 'draft',
  scoreOrder: 'desc',
  teamSize: 2,
  lanesPerHeat: 8,
  fieldAttempts: 3,
  maleRequired: 0,
  femaleRequired: 0,
  allowedGenders: ['male', 'female'],
  allowedDepartments: [],
  registrationFee: 0,
  upiPaymentLink: '',
  paymentQRCode: '',
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
  const [qrCodeFile, setQrCodeFile] = useState(null);
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
        if (v !== '' && k !== 'imageUrl' && k !== 'paymentQRCode') {
          // Handle arrays by converting to JSON
          if (Array.isArray(v)) {
            fd.append(k, JSON.stringify(v));
          } else {
            fd.append(k, v);
          }
        }
      });
      if (imageMode === 'upload' && file) fd.append('image', file);
      else if (imageMode === 'url' && form.imageUrl) fd.set('image', form.imageUrl);
      
      if (qrCodeFile) fd.append('paymentQRCode', qrCodeFile);

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
      setQrCodeFile(null);
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
      eventCategory: event.eventCategory || (event.type === 'single' ? 'track' : 'general'),
      scoreOrder: 'desc',
      status: event.status || 'draft',
      lanesPerHeat: event.lanesPerHeat || 8,
      fieldAttempts: event.fieldAttempts || 3,
      allowedGenders: event.allowedGenders || ['male', 'female'],
      allowedDepartments: event.allowedDepartments || [],
      registrationFee: event.registrationFee || 0,
      upiPaymentLink: event.upiPaymentLink || '',
      paymentQRCode: event.paymentQRCode || '',
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
    
    setLoading(true);
    const previousEvents = events;
    setEvents(prev => prev.filter(e => e._id !== id));
    
    try {
      const response = await API.delete(`/events/${id}`);
      toast.success('Event deleted successfully');
      // Refresh the events list to ensure sync
      load();
    } catch (err) {
      setEvents(previousEvents);
      setLoading(false);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete event';
      console.error('Delete error:', { status: err.response?.status, message: errorMessage, err });
      toast.error(errorMessage);
    }
  };

  const toggleRegistration = async (event) => {
    const previousEvents = events;
    const newRegistrationOpen = !event.registrationOpen;
    const newStatus = newRegistrationOpen ? 'open' : 'closed';
    
    setEvents(prev => prev.map(item =>
      item._id === event._id ? { ...item, registrationOpen: newRegistrationOpen, status: newStatus } : item
    ));
    
    try {
      const r = await API.patch(`/events/${event._id}/toggle-registration`);
      setEvents(prev => prev.map(item => (item._id === event._id ? { ...item, ...r.data } : item)));
      toast.success(`Registration ${r.data.registrationOpen ? 'opened' : 'closed'} for ${event.title}`);
    } catch (err) {
      setEvents(previousEvents);
      toast.error(err.response?.data?.message || 'Failed to toggle registration');
    }
  };

  const exportEvents = async (type) => {
    try {
      const res = await API.get(`/events/export/${type}`, {
        responseType: 'blob'
      });
      const filename = type === 'csv' ? 'All_Events.csv' : 'All_Events.xlsx';
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (err) {
      toast.error('Failed to export events');
    }
  };

  const categoryLabel = (value) => {
    if (value === 'track') return 'track';
    if (value === 'field') return 'field';
    return 'general';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Manage Events</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => exportEvents('csv')} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">📥 CSV</button>
          <button onClick={() => exportEvents('excel')} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">📥 Excel</button>
          <button onClick={() => { setForm(empty); setEditId(null); setShowForm(!showForm); }} className="btn-primary">
            {showForm ? 'Cancel' : '+ Add Event'}
          </button>
        </div>
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
              <select
                className="input-field"
                value={form.type}
                onChange={(e) => {
                  const nextType = e.target.value;
                  setForm((previous) => ({
                    ...previous,
                    type: nextType,
                    teamSize: nextType === 'team' ? previous.teamSize || 2 : 1,
                    eventCategory: nextType === 'single'
                      ? (previous.eventCategory === 'general' ? 'track' : previous.eventCategory)
                      : previous.eventCategory,
                    scoreOrder: 'desc'
                  }));
                }}
              >
                <option value="single">Single Player</option>
                <option value="team">Team</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Scheduling Category</label>
              <select
                className="input-field"
                value={form.eventCategory}
                onChange={(e) => {
                  const nextCategory = e.target.value;
                  setForm((previous) => ({
                    ...previous,
                    eventCategory: nextCategory,
                    scoreOrder: 'desc'
                  }));
                }}
              >
                <option value="general">General / Head-to-Head</option>
                <option value="track">Track / Heats</option>
                <option value="field">Field / Ranked Flight</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Use track for races and relay, field for shot put/discus/long jump, and general for knockout or round-robin events.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lifecycle Status</label>
              <select className="input-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {EVENT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            {form.type === 'team' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Team Size</label>
                <input type="number" className="input-field" value={form.teamSize} onChange={e => setForm({ ...form, teamSize: e.target.value })} />
              </div>
            )}
            {form.eventCategory === 'track' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Lanes Per Heat <span className="text-gray-400 text-xs">(for track events and relay)</span></label>
                <select className="input-field" value={form.lanesPerHeat} onChange={e => setForm({ ...form, lanesPerHeat: parseInt(e.target.value) })}>
                  <option value={5}>5 Lanes</option>
                  <option value={6}>6 Lanes</option>
                  <option value={8}>8 Lanes (Standard)</option>
                  <option value={10}>10 Lanes</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Players or teams will be distributed across multiple heats if needed.</p>
              </div>
            )}
            {form.eventCategory === 'field' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Field Attempts</label>
                <select className="input-field" value={form.fieldAttempts} onChange={e => setForm({ ...form, fieldAttempts: parseInt(e.target.value) })}>
                  <option value={1}>1 Attempt</option>
                  <option value={2}>2 Attempts</option>
                  <option value={3}>3 Attempts</option>
                  <option value={4}>4 Attempts</option>
                  <option value={5}>5 Attempts</option>
                  <option value={6}>6 Attempts</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">This controls how many attempt columns appear in the field-event scoring sheet.</p>
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
              <label className="block text-xs font-medium text-gray-600 mb-2">Gender Participation <span className="text-gray-400 text-xs">(Who can participate?)</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-gray-200 rounded-lg hover:bg-blue-50">
                  <input
                    type="checkbox"
                    checked={form.allowedGenders.includes('male')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({ ...form, allowedGenders: [...form.allowedGenders, 'male'] });
                      } else {
                        setForm({ ...form, allowedGenders: form.allowedGenders.filter(g => g !== 'male') });
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 font-medium">♂ Males</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-gray-200 rounded-lg hover:bg-pink-50">
                  <input
                    type="checkbox"
                    checked={form.allowedGenders.includes('female')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({ ...form, allowedGenders: [...form.allowedGenders, 'female'] });
                      } else {
                        setForm({ ...form, allowedGenders: form.allowedGenders.filter(g => g !== 'female') });
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 font-medium">♀ Females</span>
                </label>
              </div>
              {form.allowedGenders.length === 0 && (
                <p className="text-xs text-red-600 mt-2">⚠️ At least one gender must be selected</p>
              )}
              {form.allowedGenders.length === 1 && (
                <p className="text-xs text-blue-600 mt-2">
                  🔒 {form.allowedGenders[0] === 'male' ? 'Male-only' : 'Female-only'} event
                </p>
              )}
              {form.allowedGenders.length === 2 && (
                <p className="text-xs text-green-600 mt-2">✓ Open to all genders</p>
              )}
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

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Registration Fee <span className="text-gray-400 text-xs">(optional, in ₹)</span></label>
              <input type="number" className="input-field" min="0" placeholder="Leave empty or 0 for free registration" value={form.registrationFee} onChange={e => setForm({ ...form, registrationFee: e.target.value })} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">UPI Payment Link <span className="text-gray-400 text-xs">(if fee required)</span></label>
              <input type="url" className="input-field" placeholder="e.g. upi://pay?pa=..." value={form.upiPaymentLink} onChange={e => setForm({ ...form, upiPaymentLink: e.target.value })} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment QR Code <span className="text-gray-400 text-xs">(optional, alternative to link)</span></label>
              <input type="file" accept="image/*" className="input-field" onChange={e => setQrCodeFile(e.target.files[0])} />
              {qrCodeFile && <p className="text-xs text-blue-600 mt-1">✓ File selected: {qrCodeFile.name}</p>}
              {form.paymentQRCode && !qrCodeFile && <p className="text-xs text-green-600 mt-1">✓ QR code already uploaded</p>}
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
              <div key={event._id} className="card flex flex-col hover:shadow-lg transition-all duration-300 transform hover:scale-105 group">
                {event.image && <img src={event.image} alt={event.title} className="w-full h-36 object-contain bg-gray-100 dark:bg-gray-800 p-2 rounded-lg mb-3 group-hover:scale-110 transition-transform duration-300" />}
                <div className="flex items-start justify-between mb-2 gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${event.type === 'team' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                      {event.type === 'team' ? `Team • ${event.teamSize}` : 'Individual'}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      Scheduling: {categoryLabel(event.eventCategory || (event.type === 'single' ? 'track' : 'general'))}
                    </div>
                    {(event.eventCategory || (event.type === 'single' ? 'track' : 'general')) === 'field' && (
                      <div className="text-xs text-gray-500 mt-1">
                        Attempts: {event.fieldAttempts || 3}
                      </div>
                    )}
                    {event.type === 'team' && (event.maleRequired > 0 || event.femaleRequired > 0) && (
                      <div className="text-xs text-gray-500 mt-1">
                        {event.maleRequired > 0 && <span className="mr-2">♂ {event.maleRequired}</span>}
                        {event.femaleRequired > 0 && <span>♀ {event.femaleRequired}</span>}
                      </div>
                    )}
                    {event.allowedGenders && event.allowedGenders.length > 0 && event.allowedGenders.length < 2 && (
                      <div className="text-xs font-semibold mt-1 px-2 py-0.5 rounded-full" style={{
                        backgroundColor: event.allowedGenders[0] === 'female' ? '#fce7f3' : '#dbeafe',
                        color: event.allowedGenders[0] === 'female' ? '#be185d' : '#1e40af'
                      }}>
                        {event.allowedGenders[0] === 'female' ? '♀ Females Only' : '♂ Males Only'}
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
                {event.registrationFee > 0 && (
                  <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-800 font-semibold">💳 Registration Fee: ₹{event.registrationFee}</p>
                    <div className="text-xs text-blue-700 mt-1 space-y-0.5">
                      {event.upiPaymentLink && <p>🔗 UPI Link configured</p>}
                      {event.paymentQRCode && <p>📱 QR Code uploaded</p>}
                    </div>
                  </div>
                )}
                {(event.status === 'published' || event.status === 'open' || event.status === 'full' || event.status === 'closed') && (
                  <button
                    onClick={() => toggleRegistration(event)}
                    className={`w-full mb-2 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 transform hover:scale-105 ${
                      event.registrationOpen === false
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/30'
                        : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
                    }`}
                  >
                    {event.registrationOpen === false ? 'Registration Closed - Click to Open' : 'Registration Open - Click to Close'}
                  </button>
                )}
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(event)} className="flex-1 text-center py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 transform hover:scale-105 font-medium">Edit</button>
                  <button onClick={() => handleDelete(event._id)} className="flex-1 text-center py-1.5 text-xs border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 transform hover:scale-105 font-medium">Delete</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
