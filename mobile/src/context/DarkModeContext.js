// src/context/DarkModeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DarkModeContext = createContext();

export const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
};

export const DarkModeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadDarkModePreference();
    
    // Listen to system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Only update if user hasn't set a manual preference
      AsyncStorage.getItem('darkMode').then(saved => {
        if (saved === null) {
          setIsDarkMode(colorScheme === 'dark');
        }
      });
    });

    return () => subscription.remove();
  }, []);

  const loadDarkModePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('darkMode');
      if (saved !== null) {
        setIsDarkMode(saved === 'true');
      } else {
        // Use system preference
        const colorScheme = Appearance.getColorScheme();
        setIsDarkMode(colorScheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading dark mode preference:', error);
    }
  };

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      await AsyncStorage.setItem('darkMode', newMode.toString());
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
    }
  };

  // Helper function for Picker styling
  const getPickerStyles = () => {
    if (Platform.OS === 'ios') {
      return {
        backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
        color: isDarkMode ? '#FFFFFF' : '#000000',
      };
    } else {
      // Android requires more explicit styling
      return {
        backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
        color: isDarkMode ? '#FFFFFF' : '#000000',
        style: {
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          color: isDarkMode ? '#FFFFFF' : '#000000',
        }
      };
    }
  };

  return (
    <DarkModeContext.Provider value={{ 
      isDarkMode, 
      toggleDarkMode,
      getPickerStyles // Export this helper
    }}>
      {children}
    </DarkModeContext.Provider>
  );
};