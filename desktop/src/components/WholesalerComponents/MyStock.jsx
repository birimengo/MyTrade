// components/WholesalerComponents/MyStock.jsx
import React, { Component } from 'react';
import ManualStock from './ManualStock';
import SystemStock from './SystemStock';
import { FaBox, FaDatabase, FaSync, FaDownload, FaPrint } from 'react-icons/fa';

class MyStock extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'manual', // 'manual' or 'system'
      lastSync: null,
      syncStatus: 'idle' // 'idle', 'syncing', 'success', 'error'
    };
  }

  // Safe Electron API access
  safeElectronAPI = {
    showNotification: (title, message) => {
      if (this.props.isElectron && typeof window.electronAPI?.showNotification === 'function') {
        window.electronAPI.showNotification(title, message);
      } else {
        console.log(`Notification: ${title} - ${message}`);
      }
    },
    
    storage: {
      getPersistent: async (key) => {
        if (this.props.isElectron && typeof window.electronAPI?.storage?.getPersistent === 'function') {
          return await window.electronAPI.storage.getPersistent(key);
        }
        try {
          const value = localStorage.getItem(`electron_${key}`);
          return { success: true, value: value ? JSON.parse(value) : null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      
      setPersistent: async (key, value) => {
        if (this.props.isElectron && typeof window.electronAPI?.storage?.setPersistent === 'function') {
          return await window.electronAPI.storage.setPersistent(key, value);
        }
        try {
          localStorage.setItem(`electron_${key}`, JSON.stringify(value));
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    },

    saveRegistrationData: async (data, filename) => {
      if (this.props.isElectron && typeof window.electronAPI?.saveRegistrationData === 'function') {
        return await window.electronAPI.saveRegistrationData(data, filename);
      }
      // Fallback for web
      try {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  };

  handleTabChange = (tab) => {
    this.setState({ activeTab: tab });
  };

  handleManualRefresh = () => {
    if (!this.props.isOnline) {
      this.safeElectronAPI.showNotification('Offline', 'Cannot refresh without internet connection');
      return;
    }
    
    this.setState({ syncStatus: 'syncing' });
    
    // Simulate refresh process
    setTimeout(() => {
      this.setState({ 
        syncStatus: 'success',
        lastSync: new Date().toLocaleTimeString()
      });
      this.safeElectronAPI.showNotification('Stock Updated', 'Stock data refreshed successfully');
      
      // Reset status after 3 seconds
      setTimeout(() => {
        this.setState({ syncStatus: 'idle' });
      }, 3000);
    }, 1000);
  };

  handleExportData = async () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      stockType: this.state.activeTab,
      lastSync: this.state.lastSync,
      desktopInfo: {
        isElectron: this.props.isElectron,
        isOnline: this.props.isOnline,
        platform: navigator.platform
      }
    };

    const result = await this.safeElectronAPI.saveRegistrationData(
      exportData,
      `stock-data-${this.state.activeTab}-${new Date().getTime()}.json`
    );

    if (result.success) {
      this.safeElectronAPI.showNotification(
        'Export Successful',
        `${this.state.activeTab === 'manual' ? 'Manual' : 'System'} stock data exported successfully`
      );
    } else {
      this.safeElectronAPI.showNotification('Export Failed', 'Could not export stock data');
    }
  };

  render() {
    const { activeTab, lastSync, syncStatus } = this.state;
    const { isElectron, isOnline } = this.props;

    return (
      <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
        {/* Sticky Outer Header */}
        <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Stock Management
                    </h1>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {activeTab === 'manual'
                        ? 'Manage inventory manually'
                        : 'AI-powered stock predictions'}
                      {isElectron && ' • Desktop Mode'}
                    </p>
                    {lastSync && (
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                        Last synced: {lastSync}
                      </p>
                    )}
                  </div>
                  
                  {/* Sync Status Indicator */}
                  {syncStatus === 'syncing' && (
                    <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                      <FaSync className="text-blue-600 dark:text-blue-400 text-xs animate-spin" />
                      <span className="text-blue-700 dark:text-blue-300 text-xs">Syncing...</span>
                    </div>
                  )}
                  {syncStatus === 'success' && (
                    <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
                      <span className="text-green-700 dark:text-green-300 text-xs">Synced</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Desktop Controls */}
              {isElectron && (
                <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                  <button
                    onClick={this.handleManualRefresh}
                    disabled={!isOnline || syncStatus === 'syncing'}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isOnline && syncStatus !== 'syncing'
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <FaSync className={`h-3 w-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>

                  <button
                    onClick={this.handleExportData}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                    title="Export stock data to JSON file"
                  >
                    <FaDownload className="w-4 h-4 mr-2" />
                    Export
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                    title="Print stock summary"
                  >
                    <FaPrint className="w-4 h-4 mr-2" />
                    Print
                  </button>
                </div>
              )}
            </div>

            {/* Desktop Features Banner */}
            {isElectron && (
              <div className="mb-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 transition-colors duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaBox className="text-blue-600 dark:text-blue-400 text-sm" />
                    <div>
                      <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                        Desktop Stock Management
                      </h4>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        {isOnline ? 'Real-time stock updates enabled' : 'Working with cached stock data'}
                      </p>
                    </div>
                  </div>
                  {!isOnline && (
                    <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded">
                      Offline Mode
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-4">
                <button
                  onClick={() => this.handleTabChange('manual')}
                  className={`py-2 px-1 border-b-2 text-xs font-medium flex items-center transition-colors duration-200 ${
                    activeTab === 'manual'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <FaBox className="mr-1 text-sm" />
                  Manual Stock
                </button>
                <button
                  onClick={() => this.handleTabChange('system')}
                  className={`py-2 px-1 border-b-2 text-xs font-medium flex items-center transition-colors duration-200 ${
                    activeTab === 'system'
                      ? 'border-green-500 text-green-600 dark:text-green-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <FaDatabase className="mr-1 text-sm" />
                  System Stock
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Content Area - Fixed height with scrolling */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'manual' ? (
            <ManualStock 
              isElectron={isElectron}
              isOnline={isOnline}
              onSync={this.handleManualRefresh}
              syncStatus={syncStatus}
            />
          ) : (
            <SystemStock 
              isElectron={isElectron}
              isOnline={isOnline}
              onSync={this.handleManualRefresh}
              syncStatus={syncStatus}
            />
          )}
        </div>
      </div>
    );
  }
}

export default MyStock;