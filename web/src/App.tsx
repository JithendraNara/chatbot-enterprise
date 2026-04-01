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
  const location = useLocation();
  if (!initialized) return <div className="min-h-screen bg-background" />;
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function AppRouter() {
  const initialized = useAuthStore((s) => s.initialized);
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!initialized) return;

    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

    if (!token && !isAuthPage) {
      navigate('/login');
    } else if (token && isAuthPage) {
      navigate('/');
    }
  }, [initialized, token, location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
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
