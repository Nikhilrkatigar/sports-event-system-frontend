import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const LoginRegisterModal = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const { studentLogin, studentRegister } = useAuth();

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regUucms, setRegUucms] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Login form state
  const [loginUucms, setLoginUucms] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regUsername.trim() || !regUucms.trim() || !regPassword.trim()) {
      return toast.error('All fields are required');
    }

    if (regPassword.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      await studentRegister(regUsername, regUucms, regPassword);
      toast.success('Registration successful!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginUucms.trim() || !loginPassword.trim()) {
      return toast.error('UUCMS and password are required');
    }

    setLoading(true);
    try {
      await studentLogin(loginUucms, loginPassword);
      toast.success('Login successful!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isRegister ? 'Register' : 'Login'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          {isRegister
            ? 'Create an account to comment on events'
            : 'Login with your UUCMS to comment on events'}
        </p>

        {isRegister ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UUCMS No
              </label>
              <input
                type="text"
                value={regUucms}
                onChange={(e) => setRegUucms(e.target.value.toUpperCase())}
                placeholder="U02CG23S0001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UUCMS No
              </label>
              <input
                type="text"
                value={loginUucms}
                onChange={(e) => setLoginUucms(e.target.value.toUpperCase())}
                placeholder="U02CG23S0001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Your password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setRegUsername('');
              setRegUucms('');
              setRegPassword('');
              setLoginUucms('');
              setLoginPassword('');
            }}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {isRegister
              ? 'Already have an account? Login'
              : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginRegisterModal;
