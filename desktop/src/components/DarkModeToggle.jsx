import React from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { FaSun, FaMoon, FaDesktop } from 'react-icons/fa';

const DarkModeToggle = () => {
  const { isDarkMode, toggleDarkMode, resetToSystem, isInitialized, isElectron } = useDarkMode();

  if (!isInitialized) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-gray-500">
        <div className="w-4 h-4 bg-gray-300 rounded-full animate-pulse"></div>
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={resetToSystem}
        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Use system theme"
      >
        <FaDesktop className="w-4 h-4" />
      </button>
      <button
        onClick={toggleDarkMode}
        className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg transition-colors hover:bg-gray-300 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
        title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      >
        {isDarkMode ? (
          <>
            <FaSun className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white hidden sm:inline">
              Light
            </span>
          </>
        ) : (
          <>
            <FaMoon className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white hidden sm:inline">
              Dark
            </span>
          </>
        )}
      </button>
      {isElectron && (
        <div className="text-xs text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded hidden lg:block">
          Desktop
        </div>
      )}
    </div>
  );
};

export default DarkModeToggle;