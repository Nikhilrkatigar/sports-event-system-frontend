import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';

const DEFAULT_DEPARTMENTS = ['BCA', 'MCA', 'BBA', 'MBA', 'B.Com', 'B.Sc', 'B.Tech', 'M.Tech', 'BA', 'MA', 'B.Ed', 'Other'];

export default function SiteSettings() {
  const [form, setForm] = useState({ collegeName: '', eventName: '', venue: '', description: '', eventDate: '', collegeLogo: '', departments: DEFAULT_DEPARTMENTS.join('\n') });
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
        departments: departments.join('\n')
      });
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v && k !== 'collegeLogo' && k !== 'departments') fd.append(k, v); });
      const departmentList = form.departments
        .split('\n')
        .map(d => d.trim())
        .filter(Boolean);
      fd.append('departments', JSON.stringify(departmentList.length ? departmentList : DEFAULT_DEPARTMENTS));
      if (mode === 'upload' && file) fd.append('collegeLogo', file);
      else if (mode === 'url' && form.collegeLogo) fd.append('collegeLogo', form.collegeLogo);
      await API.put('/settings', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Settings saved! Changes reflect on website.');
    } catch { toast.error('Error saving settings'); }
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
