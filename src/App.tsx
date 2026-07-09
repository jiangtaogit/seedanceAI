import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from '@/components/Layout';
import { AlertModalProvider } from '@/components/AlertModal';
import { useStore } from '@/store/useStore';
import Home from '@/pages/Home';
import Create from '@/pages/Create';
import Tasks from '@/pages/Tasks';
import History from '@/pages/History';
import Settings from '@/pages/Settings';
import Login from '@/pages/Login';

/**
 * Protected Route — requires authentication
 * Redirects to /login if no user is logged in
 */
function ProtectedRoute() {
  const user = useStore((s) => s.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

/**
 * Admin Route — requires admin role
 * Redirects to /login if not authenticated, to / if not admin
 */
function AdminRoute() {
  const user = useStore((s) => s.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <AlertModalProvider>
      <Router>
        <Routes>
          {/* Login page — accessible without auth */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes — require auth */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<Create />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/history" element={<History />} />
              {/* Settings — admin only */}
              <Route element={<AdminRoute />}>
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all → redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AlertModalProvider>
  );
}
