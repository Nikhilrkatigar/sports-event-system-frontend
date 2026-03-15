import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import PasswordInput from '../../components/PasswordInput';

export default function SetupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', setupKey: '' });
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [status, setStatus] = useState({ setupRequired: false, setupEnabled: false });
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/auth/setup-status')
      .then((res) => setStatus(res.data))
      .catch(() => setStatus({ setupRequired: false, setupEnabled: false }))
      .finally(() => setCheckingStatus(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/auth/setup', form);
      toast.success('Super Admin account created. Please login.');
      navigate('/admin/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center px-4 text-white">
        Checking setup status...
      </div>
    );
  }

  if (!status.setupRequired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Setup Already Completed</h1>
          <p className="text-gray-500 text-sm mt-2">A Super Admin account already exists for this system.</p>
          <Link to="/admin/login" className="btn-primary mt-6 inline-block px-6 py-3 rounded-xl">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">Setup</div>
          <h1 className="text-2xl font-bold text-gray-900">First Time Setup</h1>
          <p className="text-gray-500 text-sm mt-1">Create the first Super Admin account</p>
        </div>

        {!status.setupEnabled && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Setup is blocked because `INITIAL_SETUP_KEY` is not configured on the server.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input required className="input-field" placeholder="Admin Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required className="input-field" placeholder="admin@college.edu" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <PasswordInput
            label="Password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
            placeholder="Minimum 8 characters"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Setup Key</label>
            <input type="password" required className="input-field" placeholder="Enter INITIAL_SETUP_KEY" value={form.setupKey} onChange={e => setForm({ ...form, setupKey: e.target.value })} />
          </div>
          <button type="submit" disabled={loading || !status.setupEnabled} className="btn-primary w-full py-3 rounded-xl font-semibold disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Admin Account'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/admin/login" className="text-sm text-blue-600 hover:underline">Already have account? Login</Link>
        </div>
      </div>
    </div>
  );
}
