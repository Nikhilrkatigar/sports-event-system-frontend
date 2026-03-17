import { useState, useRef, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { getAdminHomeByRole, hasPermission } from './utils/roles';
import ConfirmationDialog from './components/ConfirmationDialog';
import { setConfirmDialogRef } from './hooks/useConfirm';

// Public pages
import HomePage from './pages/public/HomePage';
import EventsPage from './pages/public/EventsPage';
import EventDetailPage from './pages/public/EventDetailPage';
import RegisterPage from './pages/public/RegisterPage';
import LeaderboardPage from './pages/public/LeaderboardPage';
import TournamentPage from './pages/public/TournamentPage';
import TournamentsPage from './pages/public/TournamentsPage';
import TimelinePage from './pages/public/TimelinePage';

// Admin pages
import LoginPage from './pages/admin/LoginPage';
import SetupPage from './pages/admin/SetupPage';
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
import ManageTournaments from './pages/admin/ManageTournaments';
import ManageTimeline from './pages/admin/ManageTimeline';

const ProtectedRoute = ({ children }) => {
  const { admin, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  return admin ? children : <Navigate to="/admin/login" />;
};

const FullAccessRoute = ({ children }) => {
  const { admin, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!admin) return <Navigate to="/admin/login" />;
  return hasPermission(admin.role, 'manage_users') ? children : <Navigate to={getAdminHomeByRole(admin.role)} replace />;
};

const PermissionRoute = ({ permission, children }) => {
  const { admin, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!admin) return <Navigate to="/admin/login" />;
  return hasPermission(admin.role, permission) ? children : <Navigate to={getAdminHomeByRole(admin.role)} replace />;
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
    <ThemeProvider>
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
            <Route path="/tournaments" element={<TournamentsPage />} />
            <Route path="/tournaments/:eventId" element={<TournamentPage />} />
            <Route path="/timeline" element={<TimelinePage />} />

            {/* Admin */}
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin/setup" element={<SetupPage />} />
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<PermissionRoute permission="view_dashboard"><Dashboard /></PermissionRoute>} />
              <Route path="events" element={<PermissionRoute permission="manage_events"><ManageEvents /></PermissionRoute>} />
              <Route path="registrations" element={<PermissionRoute permission="view_registrations"><ManageRegistrations /></PermissionRoute>} />
              <Route path="leaderboard" element={<PermissionRoute permission="manage_leaderboard"><ManageLeaderboard /></PermissionRoute>} />
              <Route path="gallery" element={<PermissionRoute permission="manage_gallery"><ManageGallery /></PermissionRoute>} />
              <Route path="settings" element={<PermissionRoute permission="manage_settings"><SiteSettings /></PermissionRoute>} />
              <Route path="audit" element={<PermissionRoute permission="view_audit"><AuditLogs /></PermissionRoute>} />
              <Route path="users" element={<FullAccessRoute><ManageUsers /></FullAccessRoute>} />
              <Route path="tournaments" element={<PermissionRoute permission="manage_tournaments"><ManageTournaments /></PermissionRoute>} />
              <Route path="timeline" element={<PermissionRoute permission="manage_events"><ManageTimeline /></PermissionRoute>} />
              <Route path="scanner" element={<PermissionRoute permission="check_in"><QRScanner /></PermissionRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
