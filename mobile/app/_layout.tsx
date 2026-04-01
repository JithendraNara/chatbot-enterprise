import React from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import { SessionProvider } from '../contexts/SessionContext';
import { useAuth } from '../contexts/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { token, status, isLoading } = useAuth();

  React.useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inPendingScreen = segments[0] === 'pending-approval';

    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && (status === 'pending' || status === 'suspended') && !inPendingScreen) {
      router.replace('/pending-approval');
    } else if (token && status === 'active' && (inAuthGroup || inPendingScreen)) {
      router.replace('/(tabs)');
    }
  }, [token, status, isLoading, segments, router]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SessionProvider>
            <AuthGate />
          </SessionProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
