import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getAdminHomeByRole } from '../../utils/roles';
import PasswordInput from '../../components/PasswordInput';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate(getAdminHomeByRole(res?.admin?.role), { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">Login</div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
          <p className="text-gray-500 text-sm mt-1">Sports Event Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required className="input-field" placeholder="admin@college.edu" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <PasswordInput
            label="Password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
          />
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 rounded-xl font-semibold">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/admin/setup" className="block text-sm text-blue-600 hover:underline mb-2">First-time setup</Link>
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">Back to Website</Link>
        </div>
      </div>
    </div>
  );
}
