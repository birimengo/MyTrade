// src/components/SupplierComponents/CreateSale.jsx
import React from 'react';
import { useDarkMode } from '../../context/DarkModeContext';
import { FaReceipt, FaClock } from 'react-icons/fa';

const CreateSaleTab = ({ apiCall, onSaleCreated, isDarkMode, isElectron, isOnline, onSync, syncStatus, pendingSyncCount }) => {
  const { isDarkMode: contextDarkMode } = useDarkMode();
  const darkMode = isDarkMode !== undefined ? isDarkMode : contextDarkMode;
  
  return (
    <div className={`rounded-xl border ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } p-8`}>
      <div className="text-center py-12">
        <div className="flex justify-center mb-4">
          <div className={`p-4 rounded-full ${
            darkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <FaReceipt className={`w-12 h-12 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
          </div>
        </div>
        <h2 className={`text-2xl font-bold mb-2 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Create Sale
        </h2>
        <p className={`text-lg mb-6 ${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Coming Soon
        </p>
        <div className="flex items-center justify-center gap-2 text-sm">
          <FaClock className={`w-4 h-4 ${
            darkMode ? 'text-yellow-400' : 'text-yellow-500'
          }`} />
          <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
            Feature in development
          </span>
        </div>
      </div>
    </div>
  );
};

export default CreateSaleTab;