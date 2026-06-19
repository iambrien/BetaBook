import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppProvider } from '@/contexts/AppContext';
import IntroPage from '@/pages/IntroPage';
import AppLayout from '@/components/layout/AppLayout';
import { BookOpen } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AppContent() {
  const { user, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading && !timedOut) {
    return (
      <div className="h-full flex items-center justify-center auth-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-200">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm font-medium">Loading BetaBook...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <IntroPage />;
  return <AppLayout />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <AppContent />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#fff',
                color: '#1e293b',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              },
            }}
          />
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
