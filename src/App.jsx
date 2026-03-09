import { useState, useRef, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { hasFullCmsAccess } from './utils/roles';
import ConfirmationDialog from './components/ConfirmationDialog';
import { setConfirmDialogRef } from './hooks/useConfirm';

// Public pages
import HomePage from './pages/public/HomePage';
import EventsPage from './pages/public/EventsPage';
import EventDetailPage from './pages/public/EventDetailPage';
import RegisterPage from './pages/public/RegisterPage';
import LeaderboardPage from './pages/public/LeaderboardPage';

// Admin pages
import LoginPage from './pages/admin/LoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import ManageEvents from './pages/admin/ManageEvents';
import ManageRegistrations from './pages/admin/ManageRegistrations';
import ManageLeaderboard from './pages/admin/ManageLeaderboard';
import ManageGallery from './pages/admin/ManageGallery';
import SiteSettings from './pages/admin/SiteSettings';
import AuditLogs from './pages/admin/AuditLogs';
import QRScanner from './pages/admin/QRScanner';
import ManageUsers from './pages/admin/ManageUsers';

const ProtectedRoute = ({ children }) => {
  const { admin, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  return admin ? children : <Navigate to="/admin/login" />;
};

const FullAccessRoute = ({ children }) => {
  const { admin, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!admin) return <Navigate to="/admin/login" />;
  return hasFullCmsAccess(admin.role) ? children : <Navigate to="/admin/scanner" replace />;
};

export default function App() {
  const onConfirmRef = useRef(null);
  const onCancelRef = useRef(null);
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDangerous: false,
    isLoading: false,
  });

  const showConfirmDialog = useCallback((options) => {
    onConfirmRef.current = options?.onConfirm || null;
    onCancelRef.current = options?.onCancel || null;
    setDialogState(prev => ({
      ...prev,
      ...options,
      isOpen: true,
      isLoading: false,
    }));
  }, []);

  useEffect(() => {
    setConfirmDialogRef({ show: showConfirmDialog });
    return () => setConfirmDialogRef(null);
  }, [showConfirmDialog]);

  const handleDialogConfirm = useCallback(() => {
    onConfirmRef.current?.();
    onConfirmRef.current = null;
    onCancelRef.current = null;
    setDialogState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleDialogCancel = useCallback(() => {
    onCancelRef.current?.();
    onConfirmRef.current = null;
    onCancelRef.current = null;
    setDialogState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <ConfirmationDialog
          isOpen={dialogState.isOpen}
          title={dialogState.title}
          message={dialogState.message}
          confirmText={dialogState.confirmText}
          cancelText={dialogState.cancelText}
          isDangerous={dialogState.isDangerous}
          isLoading={dialogState.isLoading}
          onConfirm={handleDialogConfirm}
          onCancel={handleDialogCancel}
        />
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/:eventId" element={<RegisterPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />

          {/* Admin */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<FullAccessRoute><Dashboard /></FullAccessRoute>} />
            <Route path="events" element={<FullAccessRoute><ManageEvents /></FullAccessRoute>} />
            <Route path="registrations" element={<ManageRegistrations />} />
            <Route path="leaderboard" element={<ManageLeaderboard />} />
            <Route path="gallery" element={<FullAccessRoute><ManageGallery /></FullAccessRoute>} />
            <Route path="settings" element={<FullAccessRoute><SiteSettings /></FullAccessRoute>} />
            <Route path="audit" element={<FullAccessRoute><AuditLogs /></FullAccessRoute>} />
            <Route path="users" element={<FullAccessRoute><ManageUsers /></FullAccessRoute>} />
            <Route path="scanner" element={<QRScanner />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
