import React from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Game from '@/pages/Game';
import Stats from '@/pages/Stats';
import Review from '@/pages/Review';
import Tutorial from '@/pages/Tutorial';
import Framework from '@/pages/Framework';
import Diagnostics from '@/pages/Diagnostics';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Game />} />
      <Route path="/stats" element={<Stats />} />
      <Route path="/tutorial" element={<Tutorial />} />
      <Route path="/framework" element={<Framework />} />
      <Route path="/diagnostics" element={<Diagnostics />} />
      <Route path="/review/:sessionId" element={<Review />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  React.useEffect(() => {
    document.title = 'GOATED Relational n Back';
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App