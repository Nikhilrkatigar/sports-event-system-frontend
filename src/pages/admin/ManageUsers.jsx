import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { ROLE_DEFINITIONS } from '../../utils/roles';
import { TableRowSkeleton } from '../../components/Skeletons';
import PasswordInput from '../../components/PasswordInput';

const emptyForm = { name: '', email: '', password: '', role: 'Coordinator' };

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const loadUsers = async () => {
    setPageLoading(true);
    try {
      const res = await API.get('/users');
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.role) {
      return toast.error('Please fill all fields');
    }

    setLoading(true);
    try {
      await API.post('/users', form);
      toast.success('User added successfully');
      setForm(emptyForm);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">Create CMS users with role-based login access.</p>
      </div>

      <div className="card max-w-2xl">
        <h2 className="font-semibold text-gray-800 mb-4">Add User</h2>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter full name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLE_DEFINITIONS.map((role) => <option key={role.key} value={role.label}>{role.label}</option>)}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              {ROLE_DEFINITIONS.find((role) => role.label === form.role)?.description}
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              className="input-field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@college.edu"
            />
          </div>
          <div className="sm:col-span-2">
            <PasswordInput
              label="Password"
              className="input-field text-xs"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Set initial password"
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Existing Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Name</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Email</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Role</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {pageLoading ? (
                <>
                  <TableRowSkeleton columns={4} />
                  <TableRowSkeleton columns={4} />
                  <TableRowSkeleton columns={4} />
                  <TableRowSkeleton columns={4} />
                  <TableRowSkeleton columns={4} />
                </>
              ) : users.length === 0 ? (
                <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-400">No users found</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3 text-gray-700">{user.role}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
