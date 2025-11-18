// src/components/DashboardRedirect.jsx
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function DashboardRedirect() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    console.log('🔄 DashboardRedirect - Waiting for dashboard to load...');
    
    // This component just acts as a bridge
    // The actual dashboard rendering happens in App.jsx
  }, [isAuthenticated, user]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <div className="text-lg font-medium text-gray-900 dark:text-white">
        Loading your dashboard...
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
        Welcome back, {user?.firstName}!
      </div>
    </div>
  );
}

export default DashboardRedirect;