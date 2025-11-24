// components/CustomTitleBar.jsx
import React from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell'; // Import from separate file
import { 
  FaTimes, 
  FaSquare, 
  FaMinus, 
  FaSun, 
  FaMoon, 
  FaStore, 
  FaBoxes, 
  FaIndustry, 
  FaShippingFast, 
  FaSync
} from 'react-icons/fa';

// Main CustomTitleBar Component
const CustomTitleBar = ({ isOnline, syncStatus, pendingSyncCount, getConnectionIcon, getSyncStatusText, onManualSync }) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { user } = useAuth();
  const isElectron = window.electronAPI;

  const handleMinimize = () => {
    if (window.electronAPI?.minimizeWindow) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI?.maximizeWindow) {
      window.electronAPI.maximizeWindow();
    }
  };

  const handleClose = () => {
    if (window.electronAPI?.closeWindow) {
      window.electronAPI.closeWindow();
    }
  };

  // Get role-specific dashboard title and icon
  const getDashboardInfo = () => {
    if (!user) return { title: 'Dashboard', icon: null };
    
    const roleConfig = {
      retailer: {
        title: 'Retailer Dashboard',
        icon: <FaStore className="w-3 h-3" />,
        businessField: 'businessName'
      },
      wholesaler: {
        title: 'Wholesaler Dashboard',
        icon: <FaBoxes className="w-3 h-3" />,
        businessField: 'businessName'
      },
      supplier: {
        title: 'Supplier Dashboard',
        icon: <FaIndustry className="w-3 h-3" />,
        businessField: 'businessName'
      },
      transporter: {
        title: 'Transporter Dashboard',
        icon: <FaShippingFast className="w-3 h-3" />,
        businessField: 'companyName'
      }
    };

    const config = roleConfig[user.role] || { title: 'Dashboard', icon: null, businessField: 'businessName' };
    
    return {
      ...config,
      businessName: user[config.businessField] || `${user.firstName} ${user.lastName}`,
      userName: `${user.firstName} ${user.lastName}`
    };
  };

  const dashboardInfo = getDashboardInfo();

  const getConnectionStatusColor = () => {
    if (syncStatus === 'syncing') return 'text-yellow-400';
    if (syncStatus === 'error') return 'text-red-400';
    return isOnline ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className={`
      fixed top-0 left-0 right-0 z-50 h-12
      flex items-center justify-between
      px-4
      ${isDarkMode 
        ? 'bg-gray-900 text-gray-200 border-b border-gray-700' 
        : 'bg-white text-gray-700 border-b border-gray-200'
      }
      transition-colors duration-200
      drag-region
      select-none
    `}>
      {/* Left side - App info with business details */}
      <div className="flex items-center space-x-3 drag-region">
        <div className="flex items-center space-x-2">
          <span className="text-base font-semibold">Trade Uganda</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">|</span>
          <div className="flex items-center space-x-1">
            {dashboardInfo.icon && (
              <span className="text-gray-500 dark:text-gray-400">
                {dashboardInfo.icon}
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
              {dashboardInfo.businessName}
            </span>
          </div>
        </div>
      </div>

      {/* Center - Dynamic Window title */}
      <div className="flex-1 text-center drag-region">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {dashboardInfo.title}
          </span>
          {user && (
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
              • {user.userName}
            </span>
          )}
        </div>
      </div>

      {/* Right side - Controls */}
      <div className="flex items-center space-x-2 no-drag-region">
        {/* Online Status Indicator */}
        <div className="flex items-center space-x-2 mr-2">
          <button
            onClick={onManualSync}
            disabled={syncStatus === 'syncing' || !isOnline}
            className={`flex items-center space-x-1 p-1 rounded transition-colors duration-200 ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            } ${getConnectionStatusColor()}`}
            title={getSyncStatusText()}
          >
            {getConnectionIcon && getConnectionIcon()}
            {pendingSyncCount > 0 && (
              <span className={`text-xs px-1 rounded ${
                isDarkMode ? 'bg-yellow-600 text-white' : 'bg-yellow-500 text-white'
              }`}>
                {pendingSyncCount}
              </span>
            )}
          </button>
        </div>

        {/* Notification Bell - Only show for wholesalers */}
        {user?.role === 'wholesaler' && (
          <NotificationBell 
            isElectron={isElectron} 
            isDarkMode={isDarkMode} 
          />
        )}

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className={`
            w-8 h-8 flex items-center justify-center
            rounded transition-all duration-150
            ${isDarkMode 
              ? 'hover:bg-gray-700 text-yellow-400' 
              : 'hover:bg-gray-100 text-gray-600'
            }
            no-drag-region
          `}
          title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
        >
          {isDarkMode ? (
            <FaSun className="w-4 h-4" />
          ) : (
            <FaMoon className="w-4 h-4" />
          )}
        </button>

        {/* Window Controls */}
        <button
          onClick={handleMinimize}
          className={`
            w-8 h-8 flex items-center justify-center
            rounded transition-all duration-150
            ${isDarkMode 
              ? 'hover:bg-gray-700 text-gray-300' 
              : 'hover:bg-gray-100 text-gray-600'
            }
            no-drag-region
          `}
          title="Minimize"
        >
          <FaMinus className="w-3 h-3" />
        </button>

        <button
          onClick={handleMaximize}
          className={`
            w-8 h-8 flex items-center justify-center
            rounded transition-all duration-150
            ${isDarkMode 
              ? 'hover:bg-gray-700 text-gray-300' 
              : 'hover:bg-gray-100 text-gray-600'
            }
            no-drag-region
          `}
          title="Maximize"
        >
          <FaSquare className="w-3 h-3" />
        </button>

        <button
          onClick={handleClose}
          className={`
            w-8 h-8 flex items-center justify-center
            rounded transition-all duration-150
            ${isDarkMode 
              ? 'hover:bg-red-600 text-gray-300' 
              : 'hover:bg-red-500 text-gray-600'
            }
            no-drag-region
          `}
          title="Close"
        >
          <FaTimes className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default CustomTitleBar;