import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/Login';
import Register from './pages/Register';
import ChatPage from './pages/ChatPage';
import ChatListPage from './pages/ChatListPage';
import AdminPage from './pages/Admin';
import { AuthProvider, useAuthStore } from './stores/authStore';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized);
  const token = useAuthStore((s) => s.token);
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (!initialized) return <div className="min-h-screen bg-background" />;
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  if (status === 'pending' || status === 'suspended') {
    return <Navigate to="/pending-approval" replace />;
  }
  return <>{children}</>;
}

function PendingApprovalPage() {
  const status = useAuthStore((s) => s.status);
  const profileError = useAuthStore((s) => s.profileError);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-card border border-border-color rounded-2xl p-8 text-center">
        <h1 className="text-3xl font-bold mb-3">
          {status === 'suspended' ? 'Account Suspended' : 'Waiting For Approval'}
        </h1>
        <p className="text-text-secondary mb-6">
          {profileError
            ? `We could not verify your access yet: ${profileError}`
            : status === 'suspended'
            ? 'Your account has been suspended. Contact an administrator if you think this is a mistake.'
            : 'Your account exists, but an administrator still needs to approve access before you can use MiniChat.'}
        </p>
        <button
          onClick={() => void logout()}
          className="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function AppRouter() {
  const initialized = useAuthStore((s) => s.initialized);
  const token = useAuthStore((s) => s.token);
  const status = useAuthStore((s) => s.status);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!initialized) return;

    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
    const isPendingPage = location.pathname === '/pending-approval';

    if (!token && !isAuthPage) {
      navigate('/login');
    } else if (token && (status === 'pending' || status === 'suspended') && !isPendingPage) {
      navigate('/pending-approval');
    } else if (token && status === 'active' && (isAuthPage || isPendingPage)) {
      navigate('/');
    }
  }, [initialized, token, status, location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pending-approval" element={<PendingApprovalPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ChatListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:id"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
