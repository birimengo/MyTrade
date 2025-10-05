// src/pages/dashboards/AdminDashboard.jsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  FaUsers, 
  FaChartBar, 
  FaCog, 
  FaShieldAlt,
  FaDatabase,
  FaFileAlt
} from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const roleSpecificItems = {
    title: 'Admin Portal',
    items: [
      { id: 'users', label: 'User Management', icon: <FaUsers /> },
      { id: 'analytics', label: 'Analytics', icon: <FaChartBar /> },
      { id: 'reports', label: 'Reports', icon: <FaFileAlt /> },
      { id: 'database', label: 'Database', icon: <FaDatabase /> },
      { id: 'security', label: 'Security', icon: <FaShieldAlt /> },
    ]
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <FaUsers className="text-blue-600 dark:text-blue-300 text-xl" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-gray-500 dark:text-gray-400 text-sm">Total Users</h2>
                    <p className="text-2xl font-bold dark:text-white">1,234</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <FaChartBar className="text-green-600 dark:text-green-300 text-xl" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-gray-500 dark:text-gray-400 text-sm">Active Today</h2>
                    <p className="text-2xl font-bold dark:text-white">567</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <FaDatabase className="text-yellow-600 dark:text-yellow-300 text-xl" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-gray-500 dark:text-gray-400 text-sm">Storage Used</h2>
                    <p className="text-2xl font-bold dark:text-white">2.5GB</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <FaShieldAlt className="text-purple-600 dark:text-purple-300 text-xl" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-gray-500 dark:text-gray-400 text-sm">Security Level</h2>
                    <p className="text-2xl font-bold dark:text-white">High</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">System Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Recent Activity</h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• 5 new users registered</li>
                    <li>• 23 new messages sent</li>
                    <li>• System backup completed</li>
                    <li>• Security scan passed</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">System Status</h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Database: <span className="text-green-600">Online</span></li>
                    <li>• API Server: <span className="text-green-600">Online</span></li>
                    <li>• Socket Server: <span className="text-green-600">Online</span></li>
                    <li>• Storage: <span className="text-green-600">Normal</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        );
      case 'chat':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Admin Chat</h2>
            <p className="text-gray-600 dark:text-gray-300">Admin chat interface will be implemented here.</p>
          </div>
        );
      case 'settings':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Admin Settings</h2>
            <p className="text-gray-600 dark:text-gray-300">Admin settings will be implemented here.</p>
          </div>
        );
      default:
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
            <p className="text-gray-600 dark:text-gray-300">Content for {activeTab} will be implemented here.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        roleSpecificItems={roleSpecificItems}
      />
      
      <div className="ml-64 flex-1 overflow-auto">
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700 dark:text-gray-300">Welcome, {user?.firstName}</span>
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white">
                  {user?.firstName?.charAt(0)}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;