// src/components/UserDataGuard.jsx
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const UserDataGuard = ({ children }) => {
  const { user, isAuthenticated, clearUserData } = useAuth();

  useEffect(() => {
    // Clear any data if user logs out
    if (!isAuthenticated && user) {
      clearUserData();
    }
  }, [isAuthenticated, user, clearUserData]);

  // Validate current user context on app start
  useEffect(() => {
    const validateUserContext = () => {
      if (!user?.id) return;

      // Check for any data that doesn't belong to current user
      const userPrefix = `user_${user.id}_`;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        // If we find user data that doesn't belong to current user, remove it
        if (key && key.startsWith('user_') && !key.startsWith(userPrefix)) {
          console.warn(`Removing foreign user data: ${key}`);
          localStorage.removeItem(key);
        }
      }
    };

    validateUserContext();
  }, [user?.id]);

  return children;
};

export default UserDataGuard;