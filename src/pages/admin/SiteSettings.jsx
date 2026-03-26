import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';

const DEFAULT_DEPARTMENTS = ['BCA', 'BBA', 'B.Com'];

export default function SiteSettings() {
  const [form, setForm] = useState({ 
    collegeName: '', eventName: '', venue: '', description: '', announcement: '', eventDate: '', collegeLogo: '', 
    departments: DEFAULT_DEPARTMENTS.join('\n'),
    termsAndConditions: '',
    maxSingleEventRegistrations: 2,
    maxTeamEventRegistrations: 999,
    maxPlayersPerTeam: 5
  });
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('url');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get('/settings').then(r => {
      const d = r.data;
      const departments = Array.isArray(d.departments) && d.departments.length ? d.departments : DEFAULT_DEPARTMENTS;
      setForm({
        ...d,
        eventDate: d.eventDate ? d.eventDate.substring(0, 10) : '',
        collegeLogo: d.collegeLogo || '',
        announcement: d.announcement || '',
        termsAndConditions: d.termsAndConditions || '',
        departments: departments.join('\n')
      });
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      // Send all fields except collegeLogo and departments (handled separately)
      Object.entries(form).forEach(([k, v]) => { 
        if (k !== 'collegeLogo' && k !== 'departments' && k !== 'termsAndConditions' && v !== undefined && v !== null) {
          fd.append(k, v);
        }
      });
      // Handle departments
      const departmentList = form.departments
        .split('\n')
        .map(d => d.trim())
        .filter(Boolean);
      fd.append('departments', JSON.stringify(departmentList.length ? departmentList : DEFAULT_DEPARTMENTS));
      // Handle termsAndConditions (only once)
      fd.append('termsAndConditions', form.termsAndConditions || '');
      // Handle logo
      if (mode === 'upload' && file) fd.append('collegeLogo', file);
      else if (mode === 'url' && form.collegeLogo) fd.append('collegeLogo', form.collegeLogo);
      await API.put('/settings', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Settings saved! Changes reflect on website.');
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Error saving settings');
    }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Website Settings</h1>
      <div className="card max-w-2xl">
        <p className="text-sm text-blue-600 bg-blue-50 rounded-lg px-4 py-2 mb-6">💡 All changes reflect instantly on the public website</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">College Name</label>
            <input className="input-field" value={form.collegeName} onChange={e => setForm({ ...form, collegeName: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
            <input className="input-field" value={form.eventName} onChange={e => setForm({ ...form, eventName: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
            <input className="input-field" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
            <input type="date" className="input-field" value={form.eventDate} onChange={e => setForm({ ...form, eventDate: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input-field" rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Announcement <span className="text-gray-500 text-xs">(optional)</span></label>
            <textarea className="input-field" rows="3" placeholder="Add an announcement to display above Sports Events on the home page..." value={form.announcement} onChange={e => setForm({ ...form, announcement: e.target.value })} />
            <p className="text-xs text-gray-500 mt-1">This will be displayed prominently above the Sports Events section on the home page.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departments (one per line)</label>
            <textarea
              className="input-field font-mono text-xs"
              rows="6"
              value={form.departments}
              onChange={e => setForm({ ...form, departments: e.target.value })}
              placeholder={`BCA\nMCA\nMBA`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
            <textarea
              className="input-field"
              rows="8"
              value={form.termsAndConditions}
              onChange={e => setForm({ ...form, termsAndConditions: e.target.value })}
              placeholder="1. ELIGIBILITY&#10;All students enrolled in the college are eligible to participate.&#10;&#10;2. REGISTRATION&#10;Participants must register before the deadline. False information will lead to disqualification.&#10;&#10;3. CODE OF CONDUCT&#10;Participants must behave responsibly and follow tournament rules.&#10;&#10;4. LIABILITY&#10;The college is not responsible for personal injuries or lost items.&#10;&#10;5. FINAL DECISION&#10;Organizers have the final decision in all matters."
            />
            <p className="text-xs text-gray-500 mt-1">This will be shown as a popup when users visit the registration page.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2"><strong>Registration Limits</strong></label>
            <p className="text-xs text-gray-500 mb-3">Configure maximum player registrations for different event types</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max Single Event Registrations</label>
                <input 
                  type="number" 
                  min="1" 
                  max="10" 
                  className="input-field" 
                  value={form.maxSingleEventRegistrations} 
                  onChange={e => setForm({ ...form, maxSingleEventRegistrations: Math.max(1, parseInt(e.target.value) || 1) })}
                />
                <p className="text-xs text-gray-400 mt-1">Max single-player events per student</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max Team Event Registrations</label>
                <input 
                  type="number" 
                  min="1" 
                  className="input-field" 
                  value={form.maxTeamEventRegistrations} 
                  onChange={e => setForm({ ...form, maxTeamEventRegistrations: Math.max(1, parseInt(e.target.value) || 999) })}
                />
                <p className="text-xs text-gray-400 mt-1">Max team events per student (999 = unlimited)</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max Players Per Team</label>
                <input 
                  type="number" 
                  min="1" 
                  max="20" 
                  className="input-field" 
                  value={form.maxPlayersPerTeam} 
                  onChange={e => setForm({ ...form, maxPlayersPerTeam: Math.max(1, parseInt(e.target.value) || 5) })}
                />
                <p className="text-xs text-gray-400 mt-1">Info only (per-event team size is configured separately)</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">College Logo</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" value="url" checked={mode === 'url'} onChange={() => setMode('url')} />URL</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" value="upload" checked={mode === 'upload'} onChange={() => setMode('upload')} />Upload</label>
            </div>
            {mode === 'url' ? (
              <input className="input-field" placeholder="https://college.edu/logo.png" value={form.collegeLogo} onChange={e => setForm({ ...form, collegeLogo: e.target.value })} />
            ) : (
              <input type="file" accept="image/*" className="input-field" onChange={e => setFile(e.target.files[0])} />
            )}
            {form.collegeLogo && mode === 'url' && <img src={form.collegeLogo} alt="logo preview" className="h-16 w-16 rounded-full object-cover mt-2 border" />}
          </div>
        </div>

        <button onClick={handleSave} disabled={loading} className="btn-primary mt-6 w-full py-3 rounded-xl">
          {loading ? 'Saving...' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  );
}
