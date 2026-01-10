import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import UserLayout from './layouts/UserLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';

// Admin Pages
import AdminDashboardPage from './pages/admin/DashboardPage';
import AdminChatPage from './pages/admin/AdminChatPage';
import UsersListPage from './pages/admin/users/UsersListPage';
import UserDetailPage from './pages/admin/users/UserDetailPage';
import GroupsListPage from './pages/admin/groups/GroupsListPage';
import KnowledgePage from './pages/admin/knowledge/KnowledgePage';
import SettingsPage from './pages/admin/settings/SettingsPage';
import AuditLogsPage from './pages/admin/audit/AuditLogsPage';

// User Pages
import UserChatPage from './pages/user/ChatPage';
import UserHistoryPage from './pages/user/HistoryPage';
import UserProfilePage from './pages/user/ProfilePage';

// Route protection components
function ProtectedRoute({ children, requireAdmin = false, redirectAdmins = false }: { children: React.ReactNode; requireAdmin?: boolean; redirectAdmins?: boolean }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !['SUPER_ADMIN', 'ADMIN'].includes(user?.role || '')) {
    return <Navigate to="/chat" replace />;
  }

  // Redirect admins to admin area when accessing user routes
  if (redirectAdmins && ['SUPER_ADMIN', 'ADMIN'].includes(user?.role || '')) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated) {
    // Redirect based on role
    if (['SUPER_ADMIN', 'ADMIN'].includes(user?.role || '')) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/chat" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="chat" element={<AdminChatPage />} />
        <Route path="users" element={<UsersListPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="groups" element={<GroupsListPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="audit" element={<AuditLogsPage />} />
      </Route>

      {/* User routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute redirectAdmins>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="chat" element={<UserChatPage />} />
        <Route path="chat/:chatId" element={<UserChatPage />} />
        <Route path="history" element={<UserHistoryPage />} />
        <Route path="profile" element={<UserProfilePage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

