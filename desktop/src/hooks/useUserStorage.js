// src/hooks/useUserStorage.js
import { useAuth } from '../context/AuthContext';

export const useUserStorage = () => {
  const { 
    user, 
    getUserStoredItem, 
    setUserStoredItem, 
    validateUserOwnership,
    getUserStorageKey 
  } = useAuth();

  // Safe user data getter
  const getUserData = (key, defaultValue = null) => {
    if (!user?.id) {
      console.warn('No user logged in for getUserData');
      return defaultValue;
    }
    
    const data = getUserStoredItem(key);
    if (data && validateUserOwnership(data)) {
      return data;
    }
    
    return defaultValue;
  };

  // Safe user data setter
  const setUserData = (key, value) => {
    if (!user?.id) {
      console.error('Cannot set data: No user logged in');
      return false;
    }
    
    return setUserStoredItem(key, {
      ...value,
      userId: user.id, // Always include user ID for validation
      updatedAt: new Date().toISOString()
    });
  };

  // Get all user data keys
  const getUserDataKeys = () => {
    if (!user?.id) return [];
    
    const userPrefix = `user_${user.id}_`;
    const userKeys = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(userPrefix)) {
        userKeys.push(key.replace(userPrefix, ''));
      }
    }
    
    return userKeys;
  };

  // Clear specific user data
  const clearUserData = (key) => {
    if (!user?.id) return false;
    
    try {
      const userKey = getUserStorageKey(key);
      localStorage.removeItem(userKey);
      return true;
    } catch (error) {
      console.error(`Error clearing user data for key ${key}:`, error);
      return false;
    }
  };

  return {
    getUserData,
    setUserData,
    getUserDataKeys,
    clearUserData,
    userHasData: !!user?.id,
    userId: user?.id
  };
};