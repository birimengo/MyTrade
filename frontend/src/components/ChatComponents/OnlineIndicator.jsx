import React from 'react';
import { FaCircle } from 'react-icons/fa';

const OnlineIndicator = ({ isOnline, size = 'xs', className = '', showOffline = false }) => {
  if (!isOnline && !showOffline) return null;
  
  return (
    <div className={`absolute -top-1 -right-1 ${className}`}>
      <FaCircle 
        className={`
          ${size === 'sm' ? 'text-sm' : 'text-xs'} 
          ${isOnline ? 'text-green-500' : 'text-gray-400'} 
          bg-white dark:bg-gray-800 rounded-full
        `} 
      />
    </div>
  );
};

export default OnlineIndicator;